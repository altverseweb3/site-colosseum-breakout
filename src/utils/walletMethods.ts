// utils/walletMethods.ts

import { WalletInfo, WalletType, Token, Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  useAppKitAccount,
  useAppKit,
  useDisconnect,
  useAppKitNetwork,
  useWalletInfo,
} from "@reown/appkit/react";
import { ChainNamespace, SolanaSigner } from "@/types/web3";
import { defineChain } from "@reown/appkit/networks";
import {
  getMayanQuote,
  executeEvmSwap,
  executeSolanaSwap,
} from "@/utils/mayanSwapMethods";
import { Quote } from "@mayanfinance/swap-sdk";
import { toast } from "sonner";
import { useWalletProviderAndSigner } from "@/utils/mayanSwapMethods";
import { Connection } from "@solana/web3.js";
/**
 * Creates a properly formatted CAIP network ID with correct TypeScript typing
 * @param namespace The chain namespace (eip155, solana, etc)
 * @param chainId The chain ID
 * @returns A properly typed CAIP network ID
 */
function createCaipNetworkId(
  namespace: "eip155" | "solana" | "bip122" | "polkadot",
  chainId: number,
): `${typeof namespace}:${number}` {
  return `${namespace}:${chainId}` as `${typeof namespace}:${number}`;
}

/**
 * Custom hook for wallet connections via Reown AppKit
 * Handles both EVM (MetaMask) and Solana (Phantom) wallets through Reown
 * Supports connecting to both wallet types simultaneously
 */
export function useWalletConnection() {
  // Get the Reown AppKit modal control functions
  const { open, close } = useAppKit();

  // Track the wallet accounts for each namespace
  const evmAccount = useAppKitAccount({ namespace: "eip155" });
  const solanaAccount = useAppKitAccount({ namespace: "solana" });

  // Get wallet information for each namespace
  const { walletInfo: evmWalletInfo } = useWalletInfo();
  const { walletInfo: solanaWalletInfo } = useWalletInfo();

  // Get network/chain info for each namespace
  const evmNetwork = useAppKitNetwork();
  const solanaNetwork = useAppKitNetwork();

  // Track connection status in local state
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which namespaces are connected
  const [connectedNamespaces, setConnectedNamespaces] = useState<{
    evm: boolean;
    solana: boolean;
  }>({ evm: false, solana: false });

  /**
   * Helper function to sync wallet data to our store
   */
  const syncWalletToStore = useCallback(
    (
      walletType: WalletType,
      address: string,
      walletName: string,
      currentChainId?: string | number,
    ) => {
      // Map of known Solana network IDs
      const solanaNetworkMap: Record<string, number> = {
        "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": 101, // Mainnet
        // Add other Solana networks as needed
      };

      // Ensure chainId is a number
      let chainId: number;

      if (
        walletType === WalletType.REOWN_SOL &&
        typeof currentChainId === "string"
      ) {
        // Use the mapping for Solana networks
        chainId = solanaNetworkMap[currentChainId] || 101; // Default to 101 if unknown
      } else if (currentChainId !== undefined) {
        // For EVM chains, parse normally
        chainId =
          typeof currentChainId === "string"
            ? parseInt(currentChainId, 10)
            : currentChainId;
      } else {
        // Fallbacks
        chainId = walletType === WalletType.REOWN_SOL ? 101 : 1;
      }

      // Create wallet info object for our store
      const walletInfo: WalletInfo = {
        type: walletType,
        name: walletName,
        address,
        chainId,
      };

      // Update our app's store
      const store = useWeb3Store.getState();
      store.addWallet(walletInfo);

      // IMPORTANT: Always set the new wallet as active
      // This ensures most recently connected wallet becomes active
      store.setActiveWallet(walletType);

      console.log(
        `${walletType} wallet connected and synced with store:`,
        walletInfo,
      );
    },
    [],
  );

  // Update connected namespaces state when accounts change
  useEffect(() => {
    setConnectedNamespaces({
      evm: evmAccount.isConnected,
      solana: solanaAccount.isConnected,
    });
  }, [evmAccount.isConnected, solanaAccount.isConnected]);

  // Effect to sync EVM wallet state with our app's store
  useEffect(() => {
    if (evmAccount.isConnected && evmAccount.address) {
      syncWalletToStore(
        WalletType.REOWN_EVM,
        evmAccount.address,
        evmWalletInfo?.name || "EVM Wallet",
        evmNetwork.chainId,
      );
    } else if (!evmAccount.isConnected) {
      // Remove EVM wallet from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_EVM);
    }
  }, [
    evmAccount.address,
    evmAccount.isConnected,
    evmNetwork.chainId,
    evmWalletInfo,
    syncWalletToStore,
  ]);

  // Effect to sync Solana wallet state with our app's store
  useEffect(() => {
    if (solanaAccount.isConnected && solanaAccount.address) {
      syncWalletToStore(
        WalletType.REOWN_SOL,
        solanaAccount.address,
        solanaWalletInfo?.name || "Solana Wallet",
        solanaNetwork.chainId,
      );
    } else if (!solanaAccount.isConnected) {
      // Remove Solana wallet from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_SOL);
    }
  }, [
    solanaAccount.address,
    solanaAccount.isConnected,
    solanaNetwork.chainId,
    solanaWalletInfo,
    syncWalletToStore,
  ]);

  // Monitor EVM chain changes
  useEffect(() => {
    if (evmAccount.isConnected && evmNetwork.chainId !== undefined) {
      const store = useWeb3Store.getState();
      const activeWallet = store.activeWallet;

      if (activeWallet?.type === WalletType.REOWN_EVM) {
        // Convert chainId to a number if it's a string
        const numericChainId =
          typeof evmNetwork.chainId === "string"
            ? parseInt(evmNetwork.chainId, 10)
            : evmNetwork.chainId;

        if (activeWallet.chainId !== numericChainId) {
          store.updateWalletChainId(WalletType.REOWN_EVM, numericChainId);
          console.log(`EVM chain updated to ${numericChainId}`);
        }
      }
    }
  }, [evmNetwork.chainId, evmAccount.isConnected]);

  // Monitor Solana chain changes
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

  /**
   * Connect to a wallet via Reown AppKit
   * @param walletType Specific wallet type to connect to
   */
  const connectWallet = useCallback(
    (walletType?: "metamask" | "phantom" | "walletConnect") => {
      setConnecting(true);
      setError(null);

      try {
        if (walletType === "phantom") {
          // Open the Solana-specific connection modal
          open({ view: "Connect", namespace: "solana" });
        } else if (walletType === "metamask") {
          // Open the EVM-specific connection modal
          open({ view: "Connect", namespace: "eip155" });
        } else if (walletType === "walletConnect") {
          // For WalletConnect, just open the standard view
          open({ view: "Connect" });
        } else {
          // Open the general connect modal
          open({ view: "Connect" });
        }
      } catch (error) {
        console.error("Error initiating wallet connection:", error);
        setError(
          typeof error === "string" ? error : "Failed to connect wallet",
        );
      } finally {
        setConnecting(false);
      }
    },
    [open],
  );

  /**
   * Disconnect the specified wallet type
   * @param walletType The type of wallet to disconnect, defaults to both
   */
  // Use a single disconnect function with proper namespace parameter
  const { disconnect } = useDisconnect();

  /**
   * Disconnect the specified wallet type
   * @param walletType The type of wallet to disconnect, defaults to all wallets if not specified
   */
  const disconnectWallet = useCallback(
    async (walletType?: WalletType) => {
      try {
        const store = useWeb3Store.getState();

        // If no specific wallet type is provided, disconnect all wallets
        if (walletType === undefined) {
          console.log("Disconnecting ALL wallets");

          // Disconnect EVM wallet if connected
          if (evmAccount.isConnected) {
            await disconnect({ namespace: "eip155" });
            console.log("EVM wallet disconnected");
          }

          // Disconnect Solana wallet if connected
          if (solanaAccount.isConnected) {
            await disconnect({ namespace: "solana" });
            console.log("Solana wallet disconnected");
          }

          // Clear all wallets from store
          store.disconnectAll();
          return true;
        }

        // Disconnect a specific wallet type
        console.log(`Disconnecting specific wallet type: ${walletType}`);

        if (walletType === WalletType.REOWN_EVM && evmAccount.isConnected) {
          // Pass the namespace "eip155" for EVM wallets
          await disconnect({ namespace: "eip155" });
          store.removeWallet(WalletType.REOWN_EVM);
          console.log("EVM wallet disconnected");
        }

        if (walletType === WalletType.REOWN_SOL && solanaAccount.isConnected) {
          // Pass the namespace "solana" for Solana wallets
          await disconnect({ namespace: "solana" });
          store.removeWallet(WalletType.REOWN_SOL);
          console.log("Solana wallet disconnected");
        }

        // Handle SUI wallet case
        if (walletType === WalletType.SUIET_SUI) {
          // When SUI is implemented, pass the proper namespace
          // await disconnect({ namespace: "sui" });
          store.removeWallet(WalletType.SUIET_SUI);
          console.log("SUI wallet disconnected");
        }

        // Update active wallet if needed
        if (store.activeWallet?.type === walletType) {
          // Find another connected wallet to set as active
          const remainingWallets = store.connectedWallets;
          if (remainingWallets.length > 0) {
            console.log(
              `Switching active wallet to ${remainingWallets[0].type}`,
            );
            store.setActiveWallet(remainingWallets[0].type);
          }
        }

        return true;
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        throw error;
      }
    },
    [disconnect, evmAccount.isConnected, solanaAccount.isConnected],
  );

  /**
   * Switch the active wallet type
   * @param walletType The wallet type to set as active
   */
  const switchActiveWallet = useCallback((walletType: WalletType) => {
    const store = useWeb3Store.getState();

    // Check if the wallet type is connected
    const isConnected = store.connectedWallets.some(
      (w) => w.type === walletType,
    );

    if (isConnected) {
      store.setActiveWallet(walletType);
      console.log(`Switched active wallet to ${walletType}`);
      return true;
    } else {
      console.warn(`Cannot switch to ${walletType} - not connected`);
      return false;
    }
  }, []);

  /**
   * Get current wallet type (EVM or SOL)
   */
  const getCurrentWalletType = useCallback(() => {
    const store = useWeb3Store.getState();
    return store.activeWallet?.type || null;
  }, []);

  /**
   * Check if a specific wallet type is connected
   */
  const isWalletTypeConnected = useCallback(
    (walletType: WalletType) => {
      if (walletType === WalletType.REOWN_EVM) {
        return evmAccount.isConnected;
      } else if (walletType === WalletType.REOWN_SOL) {
        return solanaAccount.isConnected;
      }
      return false;
    },
    [evmAccount.isConnected, solanaAccount.isConnected],
  );

  /**
   * Checks if the connected wallet is MetaMask (based on wallet name)
   */
  const isMetaMask = useCallback(() => {
    if (!evmWalletInfo || !evmWalletInfo.name) return false;
    return evmWalletInfo.name.toLowerCase().includes("metamask");
  }, [evmWalletInfo]);

  /**
   * Checks if the connected wallet is Phantom (based on wallet name)
   */
  const isPhantom = useCallback(() => {
    if (!solanaWalletInfo || !solanaWalletInfo.name) return false;
    return solanaWalletInfo.name.toLowerCase().includes("phantom");
  }, [solanaWalletInfo]);

  /**
   * Get wallet connection details for UI display
   * @param walletType Optional wallet type to get info for, defaults to active wallet
   */
  const getWalletDisplayInfo = useCallback(
    (walletType?: WalletType) => {
      const store = useWeb3Store.getState();
      const typeToUse = walletType || store.activeWallet?.type;

      if (!typeToUse) {
        return null;
      }

      const walletInfo =
        typeToUse === WalletType.REOWN_EVM ? evmWalletInfo : solanaWalletInfo;

      const account =
        typeToUse === WalletType.REOWN_EVM ? evmAccount : solanaAccount;

      if (!account.address) {
        return null;
      }

      const walletName =
        walletInfo?.name ||
        (typeToUse === WalletType.REOWN_EVM ? "EVM Wallet" : "Solana Wallet");
      const shortenedAddress = truncateAddress(account.address);

      let icon = ""; // Default icon path can be added here

      // Determine icon based on wallet type and name
      if (typeToUse === WalletType.REOWN_EVM && isMetaMask()) {
        icon = "/icons/metamask.svg";
      } else if (typeToUse === WalletType.REOWN_SOL && isPhantom()) {
        icon = "/icons/phantom.svg";
      } else if (typeToUse === WalletType.REOWN_EVM) {
        icon = "/icons/ethereum.svg";
      } else if (typeToUse === WalletType.REOWN_SOL) {
        icon = "/icons/solana.svg";
      }

      return {
        name: walletName,
        address: shortenedAddress,
        fullAddress: account.address,
        icon,
        isMetaMask: typeToUse === WalletType.REOWN_EVM && isMetaMask(),
        isPhantom: typeToUse === WalletType.REOWN_SOL && isPhantom(),
        walletType: typeToUse,
      };
    },
    [
      evmAccount,
      evmWalletInfo,
      solanaAccount,
      solanaWalletInfo,
      isMetaMask,
      isPhantom,
    ],
  );

  /**
   * Get display info for all connected wallets
   */
  const getAllConnectedWalletInfo = useCallback(() => {
    const result = [];

    if (evmAccount.isConnected) {
      const evmInfo = getWalletDisplayInfo(WalletType.REOWN_EVM);
      if (evmInfo) result.push(evmInfo);
    }

    if (solanaAccount.isConnected) {
      const solanaInfo = getWalletDisplayInfo(WalletType.REOWN_SOL);
      if (solanaInfo) result.push(solanaInfo);
    }

    return result;
  }, [evmAccount.isConnected, getWalletDisplayInfo, solanaAccount.isConnected]);

  // used to display truncated wallet address
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    // Connection state
    evmAccount,
    solanaAccount,
    connecting,
    error,

    // Connected states
    isEvmConnected: evmAccount.isConnected,
    isSolanaConnected: solanaAccount.isConnected,
    connectedNamespaces,

    // Wallet info
    evmWalletInfo,
    solanaWalletInfo,
    isMetaMask: isMetaMask(),
    isPhantom: isPhantom(),

    // Network/chain info
    evmNetwork,
    solanaNetwork,

    // Actions
    connectWallet,
    disconnectWallet,
    switchActiveWallet,
    isWalletTypeConnected,
    openModal: open,
    closeModal: close,

    // UI helpers
    getWalletDisplayInfo,
    getAllConnectedWalletInfo,
    getCurrentWalletType,
    truncateAddress,
  };
}

/**
 * Returns the active wallet from the store
 * Convenience function for components that only need the wallet info
 */
export function getActiveWallet(): WalletInfo | null {
  return useWeb3Store.getState().activeWallet;
}

/**
 * Enhanced hook for managing chain switching functionality in the UI
 * Uses Reown AppKit's network functions
 * Supports both EVM and Solana chains
 */
export function useChainSwitch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the wallet connection hook for access to both wallet types
  const { evmNetwork, solanaNetwork } = useWalletConnection();

  const activeWallet = useWeb3Store((state) => state.activeWallet);

  /**
   * Switch to a specific chain using Reown AppKit
   * @param chain The chain to switch to
   */
  const switchToChain = async (chain: Chain): Promise<boolean> => {
    setError(null);

    // Check if wallet is connected
    if (!activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    // Check wallet type compatibility with the chain
    const isSolanaChain = chain.mayanName.includes("solana");
    const isEvmChain = !isSolanaChain;

    const isSolanaWallet = activeWallet.type === WalletType.REOWN_SOL;
    const isEvmWallet = activeWallet.type === WalletType.REOWN_EVM;

    if (isSolanaWallet && isEvmChain) {
      const errorMsg = "Cannot switch a Solana wallet to an EVM chain.";
      setError(errorMsg);
      return false;
    }

    if (isEvmWallet && isSolanaChain) {
      const errorMsg = "Cannot switch an EVM wallet to a Solana chain.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);

      // Determine the correct namespace based on chain type
      const namespace = isSolanaChain ? "solana" : "eip155";

      // Create properly typed CAIP network ID
      const caipNetworkId = createCaipNetworkId(
        namespace as "eip155" | "solana" | "bip122" | "polkadot",
        chain.chainId,
      );

      // Create a proper Reown network definition using defineChain
      const reownNetwork = defineChain({
        id: chain.chainId,
        caipNetworkId: caipNetworkId,
        chainNamespace: namespace as ChainNamespace,
        name: chain.name,
        nativeCurrency: {
          decimals: chain.decimals,
          name: chain.currency,
          symbol: chain.symbol,
        },
        rpcUrls: {
          default: {
            http: [chain.rpcUrl || ""],
          },
        },
        blockExplorers: chain.explorerUrl
          ? {
              default: {
                name: chain.name,
                url: chain.explorerUrl,
              },
            }
          : undefined,
      });

      // Use the appropriate network switcher based on wallet type
      if (isSolanaChain) {
        await solanaNetwork.switchNetwork(reownNetwork);
      } else {
        await evmNetwork.switchNetwork(reownNetwork);
      }

      // Update the store
      useWeb3Store
        .getState()
        .updateWalletChainId(activeWallet.type, chain.chainId);

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      const errorMsg = `Error switching chains: ${message}`;
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch to the source chain specified in the store
   */
  const switchToSourceChain = async (): Promise<boolean> => {
    setError(null);

    if (!activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);
      const sourceChain = useWeb3Store.getState().sourceChain;

      // Check wallet type compatibility with source chain
      const isSolanaChain = sourceChain.mayanName.includes("solana");
      const isSolanaWallet = activeWallet.type === WalletType.REOWN_SOL;
      const isEvmWallet = activeWallet.type === WalletType.REOWN_EVM;

      if (isSolanaWallet && !isSolanaChain) {
        const errorMsg = "Cannot switch a Solana wallet to an EVM chain.";
        setError(errorMsg);
        return false;
      }

      if (isEvmWallet && isSolanaChain) {
        const errorMsg = "Cannot switch an EVM wallet to a Solana chain.";
        setError(errorMsg);
        return false;
      }

      return await switchToChain(sourceChain);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      const errorMsg = `Error switching to source chain: ${message}`;
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch to the destination chain specified in the store
   */
  const switchToDestinationChain = async (): Promise<boolean> => {
    setError(null);

    if (!activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);
      const destinationChain = useWeb3Store.getState().destinationChain;

      // Check wallet type compatibility with destination chain
      const isSolanaChain = destinationChain.mayanName.includes("solana");
      const isSolanaWallet = activeWallet.type === WalletType.REOWN_SOL;
      const isEvmWallet = activeWallet.type === WalletType.REOWN_EVM;

      if (isSolanaWallet && !isSolanaChain) {
        const errorMsg = "Cannot switch a Solana wallet to an EVM chain.";
        setError(errorMsg);
        return false;
      }

      if (isEvmWallet && isSolanaChain) {
        const errorMsg = "Cannot switch an EVM wallet to a Solana chain.";
        setError(errorMsg);
        return false;
      }

      return await switchToChain(destinationChain);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      const errorMsg = `Error switching to destination chain: ${message}`;
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ensures the active wallet is compatible with the given chain
   * Useful for cross-chain swaps to verify the wallet matches the chain
   */
  const ensureWalletCompatibleWithChain = (chain: Chain): boolean => {
    if (!activeWallet) return false;

    const isSolanaChain = chain.mayanName.includes("solana");
    const isSolanaWallet = activeWallet.type === WalletType.REOWN_SOL;
    const isEvmWallet = activeWallet.type === WalletType.REOWN_EVM;

    // Incompatible combinations
    if (isSolanaWallet && !isSolanaChain) return false;
    if (isEvmWallet && isSolanaChain) return false;

    return true;
  };

  return {
    isLoading,
    error,
    switchToSourceChain,
    switchToDestinationChain,
    switchToChain,
    ensureWalletCompatibleWithChain,
  };
}

/**
 * Ensures the user's wallet is connected to the correct chain
 * Uses Reown's network switching functionality
 *
 * @param targetChain The chain we want to ensure is selected in the wallet
 * @returns Promise resolving to true if the chain is correct, or false if there was an error
 */
export async function ensureCorrectChain(
  targetChain: Chain,
  switchToChainFn: (chain: Chain) => Promise<boolean>,
): Promise<boolean> {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;

  if (!activeWallet) {
    console.error("No wallet connected");
    return false;
  }

  // Check if we're already on the correct chain
  if (activeWallet.chainId === targetChain.chainId) {
    return true;
  }

  // Check wallet type compatibility with target chain
  const isSolanaChain = targetChain.mayanName.includes("solana");
  const isSolanaWallet = activeWallet.type === WalletType.REOWN_SOL;
  const isEvmWallet = activeWallet.type === WalletType.REOWN_EVM;

  if (isSolanaWallet && !isSolanaChain) {
    console.error("Cannot switch a Solana wallet to an EVM chain");
    return false;
  }

  if (isEvmWallet && isSolanaChain) {
    console.error("Cannot switch an EVM wallet to a Solana chain");
    return false;
  }

  try {
    return await switchToChainFn(targetChain);
  } catch (error) {
    console.error("Error switching chain:", error);
    return false;
  }
}

/**
 * Ensures the correct wallet type is active for the given chain
 * Automatically switches active wallet if needed and possible
 *
 * @param targetChain The chain we want to use
 * @returns True if the correct wallet type is active or was switched to, false otherwise
 */
export function ensureCorrectWalletTypeForChain(targetChain: Chain): boolean {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;
  const connectedWallets = store.connectedWallets;

  const isSolanaChain = targetChain.mayanName.includes("solana");
  const neededWalletType = isSolanaChain
    ? WalletType.REOWN_SOL
    : WalletType.REOWN_EVM;

  // If active wallet is already the correct type, return true
  if (activeWallet?.type === neededWalletType) {
    return true;
  }

  // Check if we have a connected wallet of the needed type
  const compatibleWallet = connectedWallets.find(
    (w) => w.type === neededWalletType,
  );

  if (compatibleWallet) {
    // Switch to the compatible wallet
    store.setActiveWallet(neededWalletType);
    console.log(
      `Switched active wallet to ${neededWalletType} for chain compatibility`,
    );
    return true;
  }

  // No compatible wallet connected
  console.error(
    `No connected ${neededWalletType} wallet available for ${targetChain.name}`,
  );
  return false;
}

/**
 * Convenience function to ensure the user's wallet is on the source chain
 * before performing a swap or bridge transaction
 *
 * @returns Promise resolving to true if the wallet is on the source chain
 */
export async function ensureSourceChain(
  switchToChainFn: (chain: Chain) => Promise<boolean>,
): Promise<boolean> {
  const store = useWeb3Store.getState();
  const sourceChain = store.sourceChain;

  // First ensure we have the correct wallet type active
  if (!ensureCorrectWalletTypeForChain(sourceChain)) {
    return false;
  }

  // Then ensure the wallet is on the correct chain
  return ensureCorrectChain(sourceChain, switchToChainFn);
}

// Modified to accept switchToChainFn parameter
export async function ensureDestinationChain(
  switchToChainFn: (chain: Chain) => Promise<boolean>,
): Promise<boolean> {
  const store = useWeb3Store.getState();
  const destinationChain = store.destinationChain;

  // First ensure we have the correct wallet type active
  if (!ensureCorrectWalletTypeForChain(destinationChain)) {
    return false;
  }

  // Then ensure the wallet is on the correct chain
  return ensureCorrectChain(destinationChain, switchToChainFn);
}

interface TokenTransferOptions {
  // Transfer type - affects UI text and functionality
  type: "swap" | "bridge";
  onSuccess?: (
    amount: string,
    sourceToken: Token,
    destinationToken: Token | null,
  ) => void;
  onError?: (error: Error) => void;
}

interface TokenTransferState {
  // Input state
  amount: string;
  setAmount: (amount: string) => void;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  isProcessing: boolean;

  isValid: boolean;
  isButtonDisabled: boolean;

  activeWallet: WalletInfo | null;
  isWalletCompatible: boolean;
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken: Token | null;
  destinationToken: Token | null;
  quoteData: Quote[] | null;
  receiveAmount: string;
  isLoadingQuote: boolean;

  // Add estimated time in seconds from the quote
  estimatedTimeSeconds: number | null;

  // Add fee information
  protocolFeeBps: number | null;
  protocolFeeUsd: number | null;
  relayerFeeUsd: number | null;
  totalFeeUsd: number | null;

  handleTransfer: () => Promise<void>;
}

// I had to include this as it appears the Mayan SDK is outdated
interface ExtendedQuote extends Quote {
  toTokenPrice?: number;
}

/**
 * Shared hook for token transfer functionality (swap or bridge)
 * Handles state management, validation, and transfer actions
 */
export function useTokenTransfer(
  options: TokenTransferOptions,
): TokenTransferState {
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quote[] | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>("");
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState<
    number | null
  >(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isWalletCompatible, setIsWalletCompatible] = useState<boolean>(true);

  // Add state for fee information
  const [protocolFeeBps, setProtocolFeeBps] = useState<number | null>(null);
  const [protocolFeeUsd, setProtocolFeeUsd] = useState<number | null>(null);
  const [relayerFeeUsd, setRelayerFeeUsd] = useState<number | null>(null);
  const [totalFeeUsd, setTotalFeeUsd] = useState<number | null>(null);

  // Get relevant state from the web3 store
  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const sourceToken = useWeb3Store((state) => state.sourceToken);
  const destinationToken = useWeb3Store((state) => state.destinationToken);
  // Get the transaction details for slippage
  const transactionDetails = useWeb3Store((state) => state.transactionDetails);
  const receiveAddress = useWeb3Store(
    (state) => state.transactionDetails.receiveAddress,
  );

  // Get wallet providers and signers
  const { getEvmSigner, getSolanaSigner } = useWalletProviderAndSigner();

  const latestRequestIdRef = useRef<number>(0);

  // Determine if source chain requires Solana
  const sourceRequiresSolana = sourceChain.mayanName.includes("solana");

  // Check wallet compatibility when source chain changes
  useEffect(() => {
    if (!activeWallet) {
      setIsWalletCompatible(true);
      return;
    }

    const walletCompatible = ensureCorrectWalletTypeForChain(sourceChain);
    setIsWalletCompatible(walletCompatible);
  }, [activeWallet, sourceChain]);

  const failQuote = () => {
    setQuoteData(null);
    setReceiveAmount("");
    setIsLoadingQuote(false);
    setEstimatedTimeSeconds(null);
    // Reset fee information
    setProtocolFeeBps(null);
    setProtocolFeeUsd(null);
    setRelayerFeeUsd(null);
    setTotalFeeUsd(null);
  };

  // Convert slippage from string (e.g., "3.00%") to basis points (e.g., 300) or "auto"
  const getSlippageBps = useCallback((): "auto" | number => {
    if (!transactionDetails.slippage) return "auto"; // Default to 'auto'

    if (transactionDetails.slippage === "auto") {
      return "auto";
    }

    // Remove "%" and convert to number
    const slippagePercent = parseFloat(
      transactionDetails.slippage.replace("%", ""),
    );

    // Convert percentage to basis points (1% = 100 bps)
    return Math.round(slippagePercent * 100);
  }, [transactionDetails.slippage]);

  // Convert gasDrop from store (number) or default to 0
  const getGasDrop = useCallback((): number => {
    // if it isn't set or isn't a number, fall back to 0
    if (
      transactionDetails.gasDrop === undefined ||
      typeof transactionDetails.gasDrop !== "number"
    ) {
      return 0;
    }
    return transactionDetails.gasDrop;
  }, [transactionDetails.gasDrop]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAmount(e.target.value);
  };

  const isValidForSwap = Boolean(
    sourceToken && destinationToken && amount && parseFloat(amount) > 0,
  );
  const isValidForBridge = Boolean(
    sourceToken && amount && parseFloat(amount) > 0,
  );

  const isValid: boolean =
    options.type === "swap" ? isValidForSwap : isValidForBridge;

  const isButtonDisabled: boolean =
    !isValid || isProcessing || !isWalletCompatible;

  // Update this useEffect to include fee calculation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchQuote = async () => {
      if (!isValid) {
        failQuote();
        return;
      }
      // Reset if no valid amount
      if (!amount || parseFloat(amount) <= 0) {
        failQuote();
        return;
      }

      // For swap: Check if we have both source and destination tokens
      if (options.type === "swap" && (!sourceToken || !destinationToken)) {
        failQuote();
        return;
      }

      // For bridge: Check if we have source token
      if (options.type === "bridge" && !sourceToken) {
        failQuote();
        return;
      }

      setIsLoadingQuote(true);

      // Generate a unique ID for this request
      const currentRequestId = ++latestRequestIdRef.current;

      try {
        let quotes: Quote[] = [];

        // Get current slippage in basis points
        const slippageBps = getSlippageBps();

        // Get gas drop
        const gasDrop = getGasDrop();

        // Set referrer
        const referrer = "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh";
        const referrerBps = 50;

        if (options.type === "swap" && sourceToken && destinationToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        } else if (options.type === "bridge" && sourceToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken: sourceToken, // Same token on destination chain
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        }

        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          console.log(`Ignoring stale response for amount: ${amount}`);
          return; // Ignore stale responses
        }

        setQuoteData(quotes);

        if (quotes && quotes.length > 0) {
          // Cast the quote to ExtendedQuote to access additional properties
          const quote = quotes[0] as ExtendedQuote;
          const expectedAmountOut = quote.expectedAmountOut;
          const inputAmount = parseFloat(amount);
          const outputAmount = expectedAmountOut;

          // Extract ETA seconds if available
          if (quote.etaSeconds !== undefined) {
            setEstimatedTimeSeconds(quote.etaSeconds);
            console.log(`Estimated time: ${quote.etaSeconds} seconds`);
          } else {
            setEstimatedTimeSeconds(null);
          }

          // Calculate and set fee information
          // Protocol fee in BPS
          if (quote.protocolBps !== undefined) {
            setProtocolFeeBps(quote.protocolBps);

            // Calculate protocol fee in USD
            const protocolFeeUsdValue =
              inputAmount * (quote.protocolBps / 10000);
            setProtocolFeeUsd(parseFloat(protocolFeeUsdValue.toFixed(6)));

            console.log(
              `Protocol fee: ${quote.protocolBps} BPS (${protocolFeeUsdValue.toFixed(6)} USD)`,
            );
          } else {
            setProtocolFeeBps(null);
            setProtocolFeeUsd(null);
          }

          // Relayer fee in USD
          let relayerFee = null;
          if (
            quote.clientRelayerFeeSuccess !== undefined &&
            quote.clientRelayerFeeSuccess !== null
          ) {
            relayerFee = quote.clientRelayerFeeSuccess;
          } else if (
            quote.clientRelayerFeeRefund !== undefined &&
            quote.clientRelayerFeeRefund !== null
          ) {
            relayerFee = quote.clientRelayerFeeRefund;
          }

          if (relayerFee !== null) {
            setRelayerFeeUsd(parseFloat(relayerFee.toFixed(6)));
            console.log(`Relayer fee: ${relayerFee.toFixed(6)} USD`);
          } else {
            setRelayerFeeUsd(null);
          }

          // Calculate total fee - the difference between input and output
          const totalFee = inputAmount - outputAmount;

          if (!isNaN(totalFee)) {
            setTotalFeeUsd(parseFloat(totalFee.toFixed(6)));
            console.log(`Total fee: ${totalFee.toFixed(6)} USD`);
          } else {
            setTotalFeeUsd(null);
          }

          // For bridging, we use the source token's decimals
          const token =
            options.type === "swap" ? destinationToken! : sourceToken!;
          const decimals = token.decimals || 6;

          const formattedAmount = parseFloat(
            expectedAmountOut.toString(),
          ).toFixed(Math.min(decimals, 6));

          setReceiveAmount(formattedAmount);

          console.log(`${options.type.toUpperCase()} Quote Updated:`, {
            requestId: currentRequestId,
            amount: amount,
            slippageBps: slippageBps,
            raw: expectedAmountOut,
            formatted: formattedAmount,
            etaSeconds: quote.etaSeconds,
            protocolBps: quote.protocolBps,
            relayerFee: relayerFee,
            totalFee: totalFee,
          });
        } else {
          failQuote();
        }
      } catch (error: unknown) {
        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          return; // Ignore errors from stale requests
        }

        let errorMessage = "Unknown error occurred";
        console.log("Raw error:", error);
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          errorMessage = error.message;
          console.log("Using error.message:", errorMessage);

          if ("code" in error && typeof error.code === "number") {
            console.log("Error code:", error.code);
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.log("Using Error.message:", errorMessage);
        } else if (typeof error === "string") {
          errorMessage = error;
          console.log("Using string error:", errorMessage);
        }

        toast.error(`Error: ${errorMessage}`);
        failQuote();
      } finally {
        // Only update loading state if this is the latest request
        if (currentRequestId === latestRequestIdRef.current) {
          setIsLoadingQuote(false);
        }
      }
    };

    if (amount && parseFloat(amount) > 0) {
      // Reset the loading state when starting a new request
      setIsLoadingQuote(true);

      // Add a small debounce to avoid excessive API calls
      timeoutId = setTimeout(fetchQuote, 300);
    } else {
      failQuote();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    amount,
    sourceToken,
    destinationToken,
    sourceChain,
    destinationChain,
    options.type,
    transactionDetails.slippage,
    getSlippageBps,
    getGasDrop,
    refreshTrigger,
    isValid,
  ]);

  useEffect(() => {
    // Only set up interval if everything is valid
    if (!isValid) return;

    console.log("Setting up quote refresh interval");

    const intervalId = setInterval(() => {
      // Skip if already loading or processing
      if (isLoadingQuote || isProcessing) return;

      console.log("Refreshing quote (5-second interval)");
      setRefreshTrigger((prev) => prev + 1);
    }, 5000);

    return () => {
      console.log("Cleaning up quote refresh interval");
      clearInterval(intervalId);
    };
  }, [isValid, isLoadingQuote, isProcessing]);

  const handleTransfer = async (): Promise<void> => {
    if (!isValid) {
      toast.warning(`Invalid ${options.type} parameters`, {
        description:
          options.type === "swap"
            ? "Please select tokens and enter a valid amount"
            : "Please select a token and enter a valid amount",
      });
      return;
    }

    // Check if wallet is compatible with source chain
    if (!isWalletCompatible) {
      const requiredWalletType = sourceRequiresSolana ? "Solana" : "Ethereum";
      toast.error(`${requiredWalletType} wallet required`, {
        description: `Please connect a ${requiredWalletType} wallet to continue`,
      });
      return;
    }

    // Generate a toast ID that we'll use for both success and error cases
    const toastId = toast.loading(
      `${options.type === "swap" ? "Swapping" : "Bridging"} ${amount} ${sourceToken!.ticker}...`,
      {
        description: `From ${sourceChain.name} to ${
          options.type === "swap"
            ? destinationToken?.ticker
            : destinationChain.name
        }`,
      },
    );

    try {
      setIsProcessing(true);

      let quotes: Quote[] = [];

      // Get current slippage in basis points
      const slippageBps = getSlippageBps();

      // Get gas drop
      const gasDrop = getGasDrop();

      // Set referrer
      const referrer = "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh";
      const referrerBps = 50;

      // Refresh quote if needed
      if (!quoteData || quoteData.length === 0) {
        // Fetch fresh quote
        if (options.type === "swap" && sourceToken && destinationToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        } else if (options.type === "bridge" && sourceToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken: sourceToken, // Same token on destination
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        }

        setQuoteData(quotes);
      } else {
        // Use existing quote
        quotes = quoteData;
      }

      if (!quotes || quotes.length === 0) {
        throw new Error("Could not obtain a valid quote");
      }

      let result: string;

      // Execute the appropriate swap based on wallet type
      if (sourceRequiresSolana) {
        // Get Solana signer
        const solanaSigner = await getSolanaSigner();
        // const API_KEY = process.env.ALCHEMY_API_KEY;
        const connection = new Connection(
          `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
          "confirmed",
        );
        // Execute Solana swap
        result = await executeSolanaSwap({
          quote: quotes[0],
          swapperAddress: activeWallet!.address,
          destinationAddress: receiveAddress || activeWallet!.address,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
            evm: "0x95C0029426afa8E47a71b8E6b251f5B70511e599",
            sui: "0xd1213695c009639f781a5875e0352d57168e514019ef8f6b1af127a6c703cb04",
          },
          solanaSigner: solanaSigner as SolanaSigner,
          connection: connection,
        });
      } else {
        // Get EVM signer
        const evmSigner = await getEvmSigner();

        // Execute EVM swap
        result = await executeEvmSwap({
          quote: quotes[0],
          swapperAddress: activeWallet!.address,
          destinationAddress: receiveAddress || activeWallet!.address,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
          },
          signer: evmSigner,
          tokenDecimals: sourceToken!.decimals || 18,
        });
      }

      console.log(
        `${sourceRequiresSolana ? "Solana" : "EVM"} swap initiated:`,
        result,
      );

      toast.success(
        `${options.type === "swap" ? "Swap" : "Bridge"} completed successfully`,
        {
          id: toastId, // Update the existing toast
          description: `Transferred ${amount} ${sourceToken!.ticker} to ${
            options.type === "swap"
              ? destinationToken?.ticker
              : destinationChain.name
          }`,
        },
      );

      if (options.onSuccess) {
        options.onSuccess(amount, sourceToken!, destinationToken);
      }
    } catch (error) {
      // Make sure to dismiss the loading toast
      toast.dismiss(toastId);

      // Use our new error parser to get a user-friendly message
      const friendlyError = parseSwapError(error);

      toast.error(`${options.type === "swap" ? "Swap" : "Bridge"} failed`, {
        description: friendlyError,
      });

      // Still log the full error for debugging
      console.error(`${options.type} failed:`, error);

      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // State
    amount,
    setAmount,
    handleAmountChange,
    isProcessing,
    isValid,
    isButtonDisabled,
    quoteData,
    receiveAmount,
    isLoadingQuote,

    // Store state
    activeWallet,
    sourceChain,
    destinationChain,
    sourceToken,
    destinationToken,
    estimatedTimeSeconds,

    // Fee information
    protocolFeeBps,
    protocolFeeUsd,
    relayerFeeUsd,
    totalFeeUsd,

    // Wallet compatibility
    isWalletCompatible,

    // Actions
    handleTransfer,
  };
}

export async function getMayanBridgeQuote({
  amount,
  sourceToken,
  sourceChain,
  destinationChain,
  slippageBps = "auto", // Default to 'auto' slippage
}: {
  amount: string;
  sourceToken: Token;
  sourceChain: Chain;
  destinationChain: Chain;
  slippageBps?: "auto" | number;
}): Promise<Quote[]> {
  return getMayanQuote({
    amount,
    sourceToken,
    destinationToken: sourceToken, // Same token on both chains
    sourceChain,
    destinationChain,
    slippageBps, // Pass through the slippage parameter
  });
}

/**
 * Extract a user-friendly error message from blockchain errors
 */
export function parseSwapError(error: unknown): string {
  // Default fallback message
  const friendlyMessage = "Something went wrong with your swap";

  try {
    if (!error) return friendlyMessage;

    // Convert to string for easier parsing
    const errorString = JSON.stringify(error);

    // Try to extract common error patterns
    const patterns = [
      // Balance errors
      {
        regex: /transfer amount exceeds balance/i,
        message: "Insufficient token balance for this swap",
      },
      // Slippage errors
      {
        regex:
          /slippage|price impact|price too low|min.*?received|output.*?amount/i,
        message:
          "Price moved too much during the swap. Try increasing slippage tolerance.",
      },
      // Gas errors
      {
        regex: /gas|fee|ETH balance|execution reverted/i,
        message: "Not enough ETH to cover gas fees",
      },
      // Approval errors
      {
        regex: /allowance|approve|permission|ERC20: insufficient allowance/i,
        message: "Token approval required. Please try again.",
      },
      // Timeout errors
      {
        regex: /timeout|timed? out|expired/i,
        message: "Request timed out. Please try again.",
      },
    ];

    // Check for specific error patterns
    for (const pattern of patterns) {
      if (pattern.regex.test(errorString)) {
        return pattern.message;
      }
    }

    // Extract reason if present (common in revert errors)
    const reasonMatch = /reason="([^"]+)"/.exec(errorString);
    if (reasonMatch && reasonMatch[1]) {
      return reasonMatch[1];
    }

    // Extract message if present
    const messageMatch = /"message":"([^"]+)"/.exec(errorString);
    if (messageMatch && messageMatch[1]) {
      return messageMatch[1];
    }

    // If error is actually an Error object
    if (error instanceof Error) {
      return error.message;
    }

    // If error is a string
    if (typeof error === "string") {
      return error;
    }

    return friendlyMessage;
  } catch (e) {
    console.error("Error parsing swap error:", e);
    return friendlyMessage;
  }
}

export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
