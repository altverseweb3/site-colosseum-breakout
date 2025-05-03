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
import { ethers } from "ethers";
import { ChainNamespace } from "@/types/web3";
import { defineChain } from "@reown/appkit/networks";
import { getMayanQuote, executeEvmSwap } from "@/utils/mayanSwapMethods";
import { Quote } from "@mayanfinance/swap-sdk";
import { toast } from "sonner";
import { useWalletProviderAndSigner } from "@/utils/mayanSwapMethods";
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
 */
export function useWalletConnection() {
  // Get the Reown AppKit modal control functions
  const { open, close } = useAppKit();

  // Get account information from Reown
  const { address, caipAddress, isConnected, status, embeddedWalletInfo } =
    useAppKitAccount();

  // Get wallet information (used to determine which wallet was used)
  const { walletInfo: reownWalletInfo } = useWalletInfo();

  // Get network/chain info from Reown
  const { caipNetwork, caipNetworkId, chainId, switchNetwork } =
    useAppKitNetwork();

  // Get the disconnect function from Reown
  const { disconnect } = useDisconnect();

  // Track connection status in local state
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine wallet type based on information from Reown
  const getWalletType = useCallback(() => {
    if (!reownWalletInfo || !reownWalletInfo.name) return WalletType.REOWN_EVM; // Default to EVM

    const walletNameLower = reownWalletInfo.name.toLowerCase();

    // Check for Solana wallets (Phantom)
    if (
      walletNameLower.includes("phantom") ||
      (caipNetworkId && caipNetworkId.startsWith("solana:"))
    ) {
      return WalletType.REOWN_SOL;
    }

    // Default to EVM (MetaMask, etc.)
    return WalletType.REOWN_EVM;
  }, [reownWalletInfo, caipNetworkId]);

  // Effect to sync Reown wallet state with our app's store
  useEffect(() => {
    if (isConnected && address) {
      // Extract chain ID from CAIP network ID if available
      // Always ensure chainId is a number
      let currentChainId: number | undefined;

      // If chainId is provided by Reown, ensure it's a number
      if (chainId !== undefined) {
        currentChainId =
          typeof chainId === "string" ? parseInt(chainId, 10) : chainId;
      }
      // Otherwise try to extract from CAIP network ID
      else if (caipNetworkId) {
        // Parse CAIP format (e.g., "eip155:1") to extract chainId
        const parts = caipNetworkId.split(":");
        if (parts.length === 2) {
          currentChainId = parseInt(parts[1], 10);
        }
      }

      // Get wallet name from Reown
      let walletName = "Reown";

      // If we have wallet info, get actual wallet name for display purposes
      if (reownWalletInfo && reownWalletInfo.name) {
        walletName = reownWalletInfo.name;
      }

      // Determine the wallet type
      const walletType = getWalletType();

      // Create wallet info object for our store
      const walletInfo: WalletInfo = {
        type: walletType, // Use the appropriate wallet type
        name: walletName,
        address,
        chainId: currentChainId || 1, // Default to Ethereum mainnet (1) if not available
      };

      // Update our app's store
      const store = useWeb3Store.getState();
      store.addWallet(walletInfo);
      store.setActiveWallet(walletType);

      console.log(
        `Wallet connected and synced with store: ${walletType}`,
        walletInfo,
      );
    } else if (!isConnected) {
      // Clear the wallets from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_EVM);
      store.removeWallet(WalletType.REOWN_SOL);
    }
  }, [
    address,
    isConnected,
    caipNetworkId,
    chainId,
    reownWalletInfo,
    getWalletType,
  ]);

  // Listen for chain/network changes and update store
  useEffect(() => {
    if (isConnected && chainId !== undefined) {
      const store = useWeb3Store.getState();
      const activeWallet = store.activeWallet;

      // Convert chainId to a number if it's a string
      const numericChainId =
        typeof chainId === "string" ? parseInt(chainId, 10) : chainId;

      if (activeWallet && activeWallet.chainId !== numericChainId) {
        store.updateWalletChainId(activeWallet.type, numericChainId);
        console.log(`Chain updated to ${numericChainId}`);
      }
    }
  }, [chainId, isConnected]);

  /**
   * Connect to a wallet via Reown AppKit
   * @param walletType Optional specific wallet to connect to
   */
  const connectWallet = useCallback(
    (walletType?: "metamask" | "phantom" | "walletConnect") => {
      setConnecting(true);
      setError(null);

      try {
        if (walletType) {
          // Open the modal with specific wallet type
          let namespace: ChainNamespace | undefined;

          if (walletType === "phantom") {
            namespace = "solana";
          } else if (walletType === "metamask") {
            namespace = "eip155";
          }

          if (walletType === "walletConnect") {
            // For WalletConnect, just open the standard view
            open({ view: "Connect" });
          } else if (namespace) {
            // For specific wallets, open with namespace
            open({ view: "Connect", namespace });
          } else {
            // Default fallback
            open({ view: "Connect" });
          }
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
   * Disconnect the current wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      // Use Reown's disconnect function
      await disconnect();

      // Clean up our app's store
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_EVM);
      store.removeWallet(WalletType.REOWN_SOL);

      console.log("Wallet disconnected");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  }, [disconnect]);

  /**
   * Checks if the connected wallet is MetaMask (based on wallet name)
   */
  const isMetaMask = useCallback(() => {
    if (!reownWalletInfo || !reownWalletInfo.name) return false;
    return reownWalletInfo.name.toLowerCase().includes("metamask");
  }, [reownWalletInfo]);

  /**
   * Checks if the connected wallet is Phantom (based on wallet name)
   */
  const isPhantom = useCallback(() => {
    if (!reownWalletInfo || !reownWalletInfo.name) return false;
    return reownWalletInfo.name.toLowerCase().includes("phantom");
  }, [reownWalletInfo]);

  /**
   * Get current wallet type (EVM or SOL)
   */
  const getCurrentWalletType = useCallback(() => {
    return getWalletType();
  }, [getWalletType]);

  /**
   * Get wallet connection details for UI display
   */
  const getWalletDisplayInfo = useCallback(() => {
    const walletName = reownWalletInfo?.name || "Wallet";
    const shortenedAddress = address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "";

    let icon = ""; // Default icon path can be added here

    // Determine icon based on wallet name
    if (isMetaMask()) {
      icon = "/icons/metamask.svg"; // Update with your actual path
    } else if (isPhantom()) {
      icon = "/icons/phantom.svg"; // Update with your actual path
    }

    return {
      name: walletName,
      address: shortenedAddress,
      fullAddress: address,
      icon,
      isMetaMask: isMetaMask(),
      isPhantom: isPhantom(),
      walletType: getWalletType(),
    };
  }, [reownWalletInfo, address, isMetaMask, isPhantom, getWalletType]);

  return {
    // Connection state
    address,
    caipAddress,
    isConnected,
    connecting,
    error,
    status,

    // Wallet info
    walletInfo: reownWalletInfo,
    embeddedWalletInfo,
    isMetaMask: isMetaMask(),
    isPhantom: isPhantom(),

    // Network/chain info
    chainId,
    caipNetwork,
    caipNetworkId,

    // Actions
    connectWallet,
    disconnectWallet,
    openModal: open,
    closeModal: close,
    switchNetwork,

    // UI helpers
    getWalletDisplayInfo,
    getCurrentWalletType,
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
 * Get an ethers provider for the connected wallet
 * This method decides which provider to use based on the wallet type
 */
export function getEthersProvider(): ethers.BrowserProvider {
  // Only works for EVM wallets
  if (typeof window === "undefined") {
    throw new Error("Browser environment required");
  }

  if (!window.ethereum) {
    throw new Error("No EVM provider found");
  }

  if (!window.ethereum) {
    throw new Error("No EVM provider found");
  }
  return new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
}

/**
 * Hook for managing chain switching functionality in the UI
 * Uses Reown AppKit's network functions
 */
export function useChainSwitch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the network switching function from Reown
  const { switchNetwork } = useAppKitNetwork();
  const { isConnected } = useAppKitAccount();

  const activeWallet = useWeb3Store((state) => state.activeWallet);

  /**
   * Switch to a specific chain using Reown AppKit
   * @param chain The chain to switch to
   */
  const switchToChain = async (chain: Chain): Promise<boolean> => {
    setError(null);

    // Check if wallet is connected
    if (!isConnected || !activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    // Check wallet type compatibility with the chain
    if (
      activeWallet.type === WalletType.REOWN_SOL &&
      !chain.mayanName.includes("solana")
    ) {
      const errorMsg = "Cannot switch a Solana wallet to an EVM chain.";
      setError(errorMsg);
      return false;
    }

    if (
      activeWallet.type === WalletType.REOWN_EVM &&
      chain.mayanName.includes("solana")
    ) {
      const errorMsg = "Cannot switch an EVM wallet to a Solana chain.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);

      // Determine the correct namespace based on chain type
      const namespace = chain.mayanName.includes("solana")
        ? "solana"
        : "eip155";

      // Create properly typed CAIP network ID
      const caipNetworkId = createCaipNetworkId(
        namespace as "eip155" | "solana" | "bip122" | "polkadot",
        chain.chainId,
      );

      // Create a proper Reown network definition using defineChain
      const reownNetwork = defineChain({
        id: chain.chainId,
        caipNetworkId: caipNetworkId,
        chainNamespace: namespace as
          | "eip155"
          | "solana"
          | "bip122"
          | "polkadot",
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

      // Switch network using Reown's function
      await switchNetwork(reownNetwork);

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

    if (!isConnected || !activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);
      const sourceChain = useWeb3Store.getState().sourceChain;

      // Check wallet type compatibility with source chain
      if (
        activeWallet.type === WalletType.REOWN_SOL &&
        !sourceChain.mayanName.includes("solana")
      ) {
        const errorMsg = "Cannot switch a Solana wallet to an EVM chain.";
        setError(errorMsg);
        return false;
      }

      if (
        activeWallet.type === WalletType.REOWN_EVM &&
        sourceChain.mayanName.includes("solana")
      ) {
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

  return {
    isLoading,
    error,
    switchToSourceChain,
    switchToChain,
  };
}

// used to display truncated wallet address
export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Ensures the user's wallet is connected to the correct chain
 * Uses Reown's network switching functionality
 *
 * @param targetChain The chain we want to ensure is selected in the wallet
 * @returns Promise resolving to true if the chain is correct, or false if there was an error
 */
export async function ensureCorrectChain(targetChain: Chain): Promise<boolean> {
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
  if (
    activeWallet.type === WalletType.REOWN_SOL &&
    !targetChain.mayanName.includes("solana")
  ) {
    console.error("Cannot switch a Solana wallet to an EVM chain");
    return false;
  }

  if (
    activeWallet.type === WalletType.REOWN_EVM &&
    targetChain.mayanName.includes("solana")
  ) {
    console.error("Cannot switch an EVM wallet to a Solana chain");
    return false;
  }

  try {
    // Create a proper Reown network definition
    const chainNamespace = targetChain.mayanName.includes("solana")
      ? "solana"
      : "eip155";
    const caipNetworkId = createCaipNetworkId(
      chainNamespace as "eip155" | "solana" | "bip122" | "polkadot",
      targetChain.chainId,
    );

    defineChain({
      id: targetChain.chainId,
      caipNetworkId: caipNetworkId,
      chainNamespace: chainNamespace as ChainNamespace,
      name: targetChain.name,
      nativeCurrency: {
        decimals: targetChain.decimals,
        name: targetChain.currency,
        symbol: targetChain.symbol,
      },
      rpcUrls: {
        default: {
          http: [targetChain.rpcUrl || ""],
        },
      },
      blockExplorers: targetChain.explorerUrl
        ? {
            default: {
              name: targetChain.name,
              url: targetChain.explorerUrl,
            },
          }
        : undefined,
    });

    // Update the store
    store.updateWalletChainId(activeWallet.type, targetChain.chainId);

    return true;
  } catch (error) {
    console.error("Error switching chain:", error);
    return false;
  }
}

/**
 * Convenience function to ensure the user's wallet is on the source chain
 * before performing a swap or bridge transaction
 *
 * @returns Promise resolving to true if the wallet is on the source chain
 */
export async function ensureSourceChain(): Promise<boolean> {
  const store = useWeb3Store.getState();
  return ensureCorrectChain(store.sourceChain);
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

  const { getSigner } = useWalletProviderAndSigner();

  const latestRequestIdRef = useRef<number>(0);

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

  const isButtonDisabled: boolean = !isValid || isProcessing;

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
          quotes = await getMayanBridgeQuote({
            amount,
            sourceToken,
            sourceChain,
            destinationChain,
            slippageBps,
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
        // Error handling code unchanged...
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
      }

      setQuoteData(quotes);

      // Get provider and signer
      let signer;
      try {
        console.log("Getting signer from Reown...");
        signer = await getSigner();
        console.log("Successfully got signer");
      } catch (signerError) {
        console.error("Failed to get signer:", signerError);
        toast.error("Failed to access wallet", {
          id: toastId,
          description: "Could not get a signer from your wallet",
        });
        return;
      }

      // Execute the swap with permit
      const result = await executeEvmSwap({
        quote: quoteData![0],
        swapperAddress: activeWallet!.address,
        destinationAddress: receiveAddress || activeWallet!.address, // Usually same as swapper
        sourceToken: sourceToken!.address,
        amount: amount,
        referrerAddresses: {
          solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
        },
        signer,
        tokenDecimals: sourceToken!.decimals || 18,
      });

      console.log("Swap initiated:", result);

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
