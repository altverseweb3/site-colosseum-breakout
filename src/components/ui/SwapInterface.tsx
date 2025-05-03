import React, { ReactNode, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { useChainSwitch, useWalletConnection } from "@/utils/walletMethods";
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

  const { chainId: reownChainId, isConnected } = useWalletConnection();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);

  const checkCurrentChain = async (): Promise<boolean> => {
    if (!activeWallet) {
      return false;
    }
    try {
      let currentChainId: number | undefined;

      // Check if we're using Reown wallet
      if (
        activeWallet.type === WalletType.REOWN_EVM ||
        activeWallet.type === WalletType.REOWN_SOL
      ) {
        // For Reown wallets, use the chainId from our hook
        if (reownChainId !== undefined) {
          // Convert to number if it's a string
          currentChainId =
            typeof reownChainId === "string"
              ? parseInt(reownChainId, 10)
              : reownChainId;
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

  // Update store when Reown chainId changes
  useEffect(() => {
    if (isConnected && activeWallet && reownChainId !== undefined) {
      const numericChainId =
        typeof reownChainId === "string"
          ? parseInt(reownChainId, 10)
          : reownChainId;

      if (activeWallet.chainId !== numericChainId) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(activeWallet.type, numericChainId);
      }
    }
  }, [reownChainId, isConnected, activeWallet]);

  React.useEffect(() => {
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
