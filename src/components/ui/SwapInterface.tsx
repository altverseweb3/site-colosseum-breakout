import React, { ReactNode, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import {
  useChainSwitch,
  useWalletConnection,
  ensureCorrectWalletTypeForChain,
} from "@/utils/walletMethods";
import useWeb3Store from "@/store/web3Store";
import { toast } from "sonner";
import { AvailableIconName } from "@/types/ui";
import { WalletType } from "@/types/web3";

interface SwapInterfaceProps {
  children: ReactNode;
  actionButton: {
    text: string;
    iconName: AvailableIconName;
    onClick?: () => void;
    disabled?: boolean;
  };
  className?: string;
  protocolFeeUsd?: number;
  relayerFeeUsd?: number;
  totalFeeUsd?: number;
  estimatedTime?: number | null; // Allow null for estimated time
  enforceSourceChain?: boolean;
  renderActionButton?: () => ReactNode;
  detailsOpen?: boolean;
  onDetailsToggle?: () => void;
  isLoadingQuote?: boolean; // Add this prop to track quote loading
}

export function SwapInterface({
  children,
  actionButton,
  className = "",
  protocolFeeUsd,
  relayerFeeUsd,
  totalFeeUsd,
  estimatedTime,
  enforceSourceChain = true,
  renderActionButton,
  detailsOpen,
  onDetailsToggle,
}: SwapInterfaceProps) {
  const {
    isLoading: isSwitchingChain,
    error: chainSwitchError,
    switchToSourceChain,
  } = useChainSwitch();

  // Get wallet connection information for both EVM and Solana
  const { solanaAccount, evmNetwork, solanaNetwork, isEvmConnected } =
    useWalletConnection();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);

  // Determine if source chain is Solana
  const sourceRequiresSolana = sourceChain.mayanName.includes("solana");

  const checkCurrentChain = async (): Promise<boolean> => {
    if (!activeWallet) {
      return false;
    }

    try {
      let currentChainId: number | undefined;

      // Map of known Solana network IDs
      const solanaNetworkMap: Record<string, number> = {
        "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": 101, // Mainnet
        // Add other Solana networks as needed
      };

      // Check which wallet type we're using
      if (activeWallet.type === WalletType.REOWN_EVM) {
        // For EVM wallets, get chain ID from the EVM network
        if (evmNetwork.chainId !== undefined) {
          currentChainId =
            typeof evmNetwork.chainId === "string"
              ? parseInt(evmNetwork.chainId, 10)
              : evmNetwork.chainId;
        }
      } else if (activeWallet.type === WalletType.REOWN_SOL) {
        // For Solana wallets, get chain ID from the Solana network
        if (solanaNetwork.chainId !== undefined) {
          if (typeof solanaNetwork.chainId === "string") {
            // Use the mapping for Solana networks
            currentChainId = solanaNetworkMap[solanaNetwork.chainId] || 101;
            console.log(
              `Mapped Solana chainId "${solanaNetwork.chainId}" to ${currentChainId}`,
            );
          } else {
            currentChainId = solanaNetwork.chainId;
          }
        }
      }

      // If we still don't have a chainId, use the one from activeWallet
      if (currentChainId === undefined) {
        currentChainId = activeWallet.chainId;
      }

      console.log("Current chain ID:", currentChainId);
      console.log("Source chain ID:", sourceChain.chainId);

      // Update the store if the chain ID has changed
      if (
        activeWallet.chainId !== currentChainId &&
        currentChainId !== undefined
      ) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(activeWallet.type, currentChainId);
      }

      return currentChainId === sourceChain.chainId;
    } catch (error) {
      console.error("Error checking current chain:", error);
      return false;
    }
  };

  // Update store when chain ID changes for either wallet type
  useEffect(() => {
    if (
      isEvmConnected &&
      activeWallet?.type === WalletType.REOWN_EVM &&
      evmNetwork.chainId !== undefined
    ) {
      const numericChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      if (activeWallet.chainId !== numericChainId) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(WalletType.REOWN_EVM, numericChainId);
      }
    }
  }, [evmNetwork.chainId, isEvmConnected, activeWallet]);

  useEffect(() => {
    if (solanaAccount.isConnected && solanaNetwork.chainId !== undefined) {
      const store = useWeb3Store.getState();
      const activeWallet = store.activeWallet;

      if (activeWallet?.type === WalletType.REOWN_SOL) {
        // Map of known Solana network IDs
        const solanaNetworkMap: Record<string, number> = {
          "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": 101, // Mainnet
          // Add other Solana networks (testnet, devnet) as needed
        };

        // Handle Solana's string-based chain IDs properly
        let mappedChainId: number;

        if (typeof solanaNetwork.chainId === "string") {
          // Try to get from our mapping, fallback to 101 (mainnet) if unknown
          mappedChainId = solanaNetworkMap[solanaNetwork.chainId] || 101;
          console.log(
            `Mapped Solana chainId "${solanaNetwork.chainId}" to ${mappedChainId}`,
          );
        } else {
          // If it's already a number, use it directly
          mappedChainId = solanaNetwork.chainId;
        }

        // Only update if different from current chain ID
        if (activeWallet.chainId !== mappedChainId) {
          store.updateWalletChainId(WalletType.REOWN_SOL, mappedChainId);
          console.log(`Solana chain updated to ${mappedChainId}`);
        }
      }
    }
  }, [solanaNetwork.chainId, solanaAccount.isConnected]);

  useEffect(() => {
    if (chainSwitchError) {
      toast.error("Chain switch failed", {
        description: chainSwitchError,
      });
    }
  }, [chainSwitchError]);

  const handleButtonClick = async () => {
    if (renderActionButton) {
      return;
    }

    if (!enforceSourceChain) {
      if (actionButton?.onClick) {
        actionButton.onClick();
      }
      return;
    }

    try {
      // First, check if we're using the correct wallet type for the source chain
      const isWalletTypeCorrect = ensureCorrectWalletTypeForChain(sourceChain);

      if (!isWalletTypeCorrect) {
        const requiredWalletType = sourceRequiresSolana ? "Solana" : "Ethereum";
        toast.error(`${requiredWalletType} wallet required`, {
          description: `Please connect a ${requiredWalletType} wallet to continue`,
        });
        return;
      }

      // Then check if we're on the correct chain
      const isOnCorrectChain = await checkCurrentChain();

      if (activeWallet && !isOnCorrectChain) {
        const toastId = toast.loading(
          `Switching to ${sourceChain.name} network...`,
          {
            description: "Please confirm in your wallet",
          },
        );

        const switched = await switchToSourceChain();

        if (!switched) {
          toast.error("Chain switch required", {
            id: toastId,
            description: `Please switch to ${sourceChain.name} network to continue`,
          });
          return;
        }

        toast.success("Network switched", {
          id: toastId,
          description: `Successfully switched to ${sourceChain.name}`,
        });
      }

      if (actionButton?.onClick) {
        setIsProcessing(true);
        await Promise.resolve(actionButton.onClick());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error("Transaction error", {
        description: message,
      });
      console.error("Transaction error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled =
    (actionButton?.disabled ?? false) || isSwitchingChain || isProcessing;

  const getButtonText = () => {
    if (isSwitchingChain) {
      return `switching network`;
    }
    if (isProcessing) {
      return "swapping";
    }
    return actionButton?.text || "Swap";
  };

  const getButtonIcon = (): AvailableIconName => {
    if (isSwitchingChain) {
      return "ArrowLeftRight";
    }
    return actionButton?.iconName || "Coins";
  };

  return (
    <Card
      className={`w-full bg-zinc-950 border-none rounded-[6px] ${className}`}
    >
      <CardContent className="p-2">
        <div className="space-y-[3px]">{children}</div>

        <div className="mt-[10px]">
          {renderActionButton ? (
            renderActionButton()
          ) : (
            <BrandedButton
              buttonText={getButtonText()}
              iconName={getButtonIcon()}
              onClick={handleButtonClick}
              disabled={isButtonDisabled}
              className="h-[40px] w-full"
            />
          )}
        </div>

        <TransactionDetails
          protocolFeeUsd={protocolFeeUsd}
          relayerFeeUsd={relayerFeeUsd}
          totalFeeUsd={totalFeeUsd}
          estimatedTime={estimatedTime}
          isOpen={detailsOpen}
          onToggle={onDetailsToggle}
        />
      </CardContent>
    </Card>
  );
}

export default SwapInterface;
