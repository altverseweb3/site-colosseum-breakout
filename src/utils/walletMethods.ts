import { WalletInfo, WalletType, Token, Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getMayanQuote, executeEvmSwap } from "@/utils/mayanSwapMethods";
import { Quote } from "@mayanfinance/swap-sdk";
import { ethers } from "ethers";

function getEthersProvider(): ethers.BrowserProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function connectMetamask(): Promise<WalletInfo | null> {
  if (!window.ethereum) {
    throw new Error("Metamask not installed");
  }

  try {
    const accounts = await window.ethereum.request<string[]>({
      method: "eth_requestAccounts",
    });

    const chainId = await window.ethereum.request<string>({
      method: "eth_chainId",
    });

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error("No accounts found");
    }

    const address = accounts[0];

    if (!chainId) {
      throw new Error("No chainId found");
    }

    const walletInfo: WalletInfo = {
      type: WalletType.METAMASK,
      name: "MetaMask",
      address,
      chainId: parseInt(chainId, 16),
    };

    // Update the store immediately on connection
    const store = useWeb3Store.getState();
    store.addWallet(walletInfo);

    // Set up account change listener
    window.ethereum.on("accountsChanged", (accounts: unknown) => {
      const store = useWeb3Store.getState();
      const newAccounts = accounts as string[];
      if (!newAccounts || newAccounts.length === 0) {
        // MetaMask was locked or disconnected
        store.removeWallet(WalletType.METAMASK);
      } else {
        // Account was switched
        store.updateWalletAddress(WalletType.METAMASK, newAccounts[0]);
      }
    });

    // Set up chain change listener
    window.ethereum.on("chainChanged", (chainId: unknown) => {
      const store = useWeb3Store.getState();
      store.updateWalletChainId(
        WalletType.METAMASK,
        parseInt(chainId as string, 16),
      );
    });

    // Set up disconnect listener
    window.ethereum.on("disconnect", () => {
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    });

    return walletInfo;
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    return null;
  }
}

export async function disconnectMetamask(): Promise<void> {
  try {
    if (window.ethereum) {
      // Remove all event listeners
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
      window.ethereum.removeAllListeners("disconnect");

      // Update the store
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    }
  } catch (error) {
    console.error("Error disconnecting from MetaMask:", error);
    throw error;
  }
}

// used to display truncated wallet address
export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Ensures the user's wallet is connected to the correct chain
 * Prompts the user to switch if necessary
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

  // We need to switch chains
  console.log(
    `Switching from chain ${activeWallet.chainId} to ${targetChain.chainId}`,
  );

  // Handle different wallet types
  if (activeWallet.type === WalletType.METAMASK) {
    return switchMetamaskChain(targetChain);
  }

  // Add support for other wallet types here as needed

  // Default fallback - we don't know how to switch this wallet type
  console.error(
    `Unsupported wallet type for chain switching: ${activeWallet.type}`,
  );
  return false;
}

/**
 * Prompts the user to switch chains in MetaMask
 *
 * @param targetChain The chain to switch to
 * @returns Promise resolving to true if successful, false otherwise
 */
async function switchMetamaskChain(targetChain: Chain): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask not installed");
    return false;
  }

  try {
    const chainIdHex = `0x${targetChain.chainId.toString(16)}`;

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

    return true;
  } catch (error: unknown) {
    // Type guard to check if error is an object with a code property
    if (typeof error === "object" && error !== null && "code" in error) {
      const ethError = error as { code: number };

      // Error code 4902 means the chain isn't added to MetaMask yet
      if (ethError.code === 4902) {
        return addChainToMetamask(targetChain);
      }
    }

    console.error("Error switching chain:", error);
    return false;
  }
}

/**
 * Adds a new chain to MetaMask if it doesn't exist
 *
 * @param chain The chain to add to MetaMask
 * @returns Promise resolving to true if successful, false otherwise
 */
async function addChainToMetamask(chain: Chain): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask not installed");
    return false;
  }

  try {
    // Format chain parameters for MetaMask
    const params = {
      chainId: `0x${chain.chainId.toString(16)}`,
      chainName: chain.chainName,
      nativeCurrency: {
        name: chain.currency,
        symbol: chain.symbol,
        decimals: chain.decimals,
      },
      rpcUrls: [chain.rpcUrl],
      blockExplorerUrls: [chain.explorerUrl],
    };

    // Request to add the chain
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [params],
    });

    return true;
  } catch (error) {
    console.error("Error adding chain to MetaMask:", error);
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

interface ChainSwitchState {
  isLoading: boolean;
  error: string | null;
  /**
   * Ensure the user's wallet is connected to the source chain
   * @returns true if the wallet is connected to the source chain after the function call
   */
  switchToSourceChain: () => Promise<boolean>;
  /**
   * Ensure the user's wallet is connected to a specific chain
   * @param chain The chain to connect to
   * @returns true if the wallet is connected to the specified chain after the function call
   */
  switchToChain: (chain: Chain) => Promise<boolean>;
}

/**
 * Hook for managing chain switching functionality in the UI
 * Uses state for tracking loading/error status and handles chain switching logic
 */
export function useChainSwitch(): ChainSwitchState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWallet = useWeb3Store((state) => state.activeWallet);

  /**
   * Switch to a specific chain
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

    try {
      setIsLoading(true);

      // Import dynamically to avoid server-side rendering issues
      const { ensureCorrectChain } = await import("@/utils/walletMethods");
      const success = await ensureCorrectChain(chain);

      if (!success) {
        const errorMsg = `Failed to switch to ${chain.name} network. Please try manually switching in your wallet.`;
        setError(errorMsg);
      }

      return success;
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

    // Get current chain ID directly from MetaMask
    if (window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request<string>({
          method: "eth_chainId",
        });
        const currentChainId = parseInt(chainIdHex as string, 16);
        const sourceChain = useWeb3Store.getState().sourceChain;

        console.log("Hook - Current MetaMask chainId:", currentChainId);
        console.log("Hook - Source chain ID:", sourceChain.chainId);

        // If already on the correct chain, no need to switch
        if (currentChainId === sourceChain.chainId) {
          return true;
        }

        // Ensure store is synced with current MetaMask state
        if (activeWallet.chainId !== currentChainId) {
          useWeb3Store
            .getState()
            .updateWalletChainId(activeWallet.type, currentChainId);
        }
      } catch (err) {
        console.error("Error checking MetaMask chain:", err);
      }
    }

    try {
      setIsLoading(true);
      const success = await ensureSourceChain();

      if (!success) {
        const sourceChain = useWeb3Store.getState().sourceChain;
        const errorMsg = `Failed to switch to ${sourceChain.name} network. Please try manually switching in your wallet.`;
        setError(errorMsg);
      }

      return success;
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

  sourceTokenPrice: number | null;
  destinationTokenPrice: number | null;

  sourceAmountUsd: number | null; // USD value of input amount
  destinationAmountUsd: number | null; // USD value of output amount

  handleTransfer: () => Promise<void>;
}

// I had to include this as it appears the Mayan SDK is outdated
interface ExtendedQuote extends Quote {
  toTokenPrice?: number;
  sourceSwapExpense?: number;
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

  const [sourceTokenPrice, setSourceTokenPrice] = useState<number | null>(null);
  const [destinationTokenPrice, setDestinationTokenPrice] = useState<
    number | null
  >(null);
  const [sourceAmountUsd, setSourceAmountUsd] = useState<number | null>(null);
  const [destinationAmountUsd, setDestinationAmountUsd] = useState<
    number | null
  >(null);

  // Get relevant state from the web3 store
  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const sourceToken = useWeb3Store((state) => state.sourceToken);
  const destinationToken = useWeb3Store((state) => state.destinationToken);
  // Get the transaction details for slippage
  const transactionDetails = useWeb3Store((state) => state.transactionDetails);

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
    setSourceTokenPrice(null);
    setDestinationTokenPrice(null);
    setSourceAmountUsd(null);
    setDestinationAmountUsd(null);
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

        if (options.type === "swap" && sourceToken && destinationToken) {
          console.log(`Fetching mayan quote qith params:
            amount: ${amount},
            sourceToken: ${sourceToken.address},
            destinationToken: ${destinationToken.address},
            sourceChain: ${sourceChain.chainId},
            destinationChain: ${destinationChain.chainId},
            slippageBps: ${slippageBps},
            `);
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain,
            destinationChain,
            slippageBps,
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

            // Calculate protocol fee in token units (not USD yet)
            const protocolFeeInTokens =
              inputAmount * (quote.protocolBps / 10000);

            // We'll store this for now, and convert to USD when we have proper price information
            // This isn't actually USD yet, but we'll fix this in the total fee calculation
            setProtocolFeeUsd(parseFloat(protocolFeeInTokens.toFixed(6)));

            console.log(
              `Protocol fee: ${quote.protocolBps} BPS (${protocolFeeInTokens.toFixed(6)} ${sourceToken?.ticker})`,
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

          // REMOVE THIS INCORRECT CALCULATION
          // const totalFee = inputAmount - outputAmount;
          // if (!isNaN(totalFee)) {
          //   setTotalFeeUsd(parseFloat(totalFee.toFixed(6)));
          //   console.log(`Total fee: ${totalFee.toFixed(6)} USD`);
          // } else {
          //   setTotalFeeUsd(null);
          // }

          if (quote.price !== undefined && quote.price !== null) {
            // The quote.price represents the exchange rate from source to destination token
            // Store it for reference
            const exchangeRate = quote.price;
            console.log(
              `Exchange rate: 1 ${sourceToken?.ticker} = ${exchangeRate} ${destinationToken?.ticker}`,
            );

            // Check if we have the toTokenPrice (destination token price in USD)
            if (quote.toTokenPrice !== undefined) {
              // Store destination token price
              setDestinationTokenPrice(quote.toTokenPrice);
              console.log(`Destination token price: $${quote.toTokenPrice}`);

              // Since we know the exchange rate and the destination token price,
              // we can calculate the source token price
              const sourcePrice = exchangeRate * quote.toTokenPrice;
              setSourceTokenPrice(sourcePrice);
              console.log(`Source token price: $${sourcePrice}`);

              // Calculate USD values
              if (!isNaN(inputAmount) && sourcePrice !== null) {
                const sourceAmountUsdValue = inputAmount * sourcePrice;
                setSourceAmountUsd(parseFloat(sourceAmountUsdValue.toFixed(2)));
                console.log(
                  `Source amount in USD: $${sourceAmountUsdValue.toFixed(2)}`,
                );
              } else {
                setSourceAmountUsd(null);
              }

              if (!isNaN(outputAmount) && quote.toTokenPrice !== null) {
                const destinationAmountUsdValue =
                  outputAmount * quote.toTokenPrice;
                setDestinationAmountUsd(
                  parseFloat(destinationAmountUsdValue.toFixed(2)),
                );
                console.log(
                  `Destination amount in USD: $${destinationAmountUsdValue.toFixed(2)}`,
                );
              } else {
                setDestinationAmountUsd(null);
              }
            }
            // Handle other cases when we have exchange rate but not USD prices
            else if (quote.fromChain === quote.toChain) {
              console.log(
                "Same-chain swap, but no destination token price available",
              );
              // We can still store the exchange rate but can't calculate USD values
              setSourceTokenPrice(exchangeRate);
              setDestinationTokenPrice(null);
              setSourceAmountUsd(null);
              setDestinationAmountUsd(null);
            } else {
              console.log(
                "Cross-chain swap with no destination token price available",
              );
              setSourceTokenPrice(exchangeRate);
              setDestinationTokenPrice(null);
              setSourceAmountUsd(null);
              setDestinationAmountUsd(null);
            }
          }
          // Key addition: handle when price is null but we still have toTokenPrice
          else if (quote.toTokenPrice !== undefined) {
            // Store destination token price
            setDestinationTokenPrice(quote.toTokenPrice);
            console.log(`Destination token price: $${quote.toTokenPrice}`);

            // Calculate destination amount in USD
            if (!isNaN(outputAmount)) {
              const destinationAmountUsdValue =
                outputAmount * quote.toTokenPrice;
              setDestinationAmountUsd(
                parseFloat(destinationAmountUsdValue.toFixed(2)),
              );
              console.log(
                `Destination amount in USD: $${destinationAmountUsdValue.toFixed(2)}`,
              );

              // Now we can calculate the implied source token price
              // (destination amount in USD / source token quantity)
              if (inputAmount > 0) {
                const impliedSourcePrice =
                  destinationAmountUsdValue / inputAmount;
                setSourceTokenPrice(impliedSourcePrice);
                console.log(
                  `Implied source token price: $${impliedSourcePrice.toFixed(2)}`,
                );

                // Calculate source amount in USD
                const sourceAmountUsdValue = inputAmount * impliedSourcePrice;
                setSourceAmountUsd(parseFloat(sourceAmountUsdValue.toFixed(2)));
                console.log(
                  `Source amount in USD: $${sourceAmountUsdValue.toFixed(2)}`,
                );
              } else {
                setSourceTokenPrice(null);
                setSourceAmountUsd(null);
              }
            } else {
              setDestinationAmountUsd(null);
              setSourceTokenPrice(null);
              setSourceAmountUsd(null);
            }
          } else {
            // No price information available
            console.log("No price information available in the quote");
            setSourceTokenPrice(null);
            setSourceAmountUsd(null);
            setDestinationTokenPrice(null);
            setDestinationAmountUsd(null);
          }

          // ADD THIS NEW TOTAL FEE CALCULATION HERE - AFTER all price calculations
          // Now we can properly calculate the total fee in USD
          if (relayerFeeUsd !== null) {
            // We have relayer fee in USD
            let totalFeeUsdValue = relayerFeeUsd;

            // Convert protocol fee to USD and add it
            if (protocolFeeBps !== null && sourceTokenPrice !== null) {
              const protocolFeeInTokens =
                inputAmount * (protocolFeeBps / 10000);
              const protocolFeeInUsd = protocolFeeInTokens * sourceTokenPrice;
              totalFeeUsdValue += protocolFeeInUsd;
            }

            // Add source swap expense if available
            if (
              quote.sourceSwapExpense !== undefined &&
              quote.sourceSwapExpense !== null
            ) {
              totalFeeUsdValue += quote.sourceSwapExpense;
            }

            setTotalFeeUsd(parseFloat(totalFeeUsdValue.toFixed(6)));
            console.log(`Total fee: ${totalFeeUsdValue.toFixed(6)} USD`);
          } else {
            // Fallback: Calculate from source and destination USD amounts if available
            if (sourceAmountUsd !== null && destinationAmountUsd !== null) {
              const totalFeeUsdValue = Math.max(
                0,
                sourceAmountUsd - destinationAmountUsd,
              );
              setTotalFeeUsd(parseFloat(totalFeeUsdValue.toFixed(6)));
              console.log(
                `Total fee (from USD difference): ${totalFeeUsdValue.toFixed(6)} USD`,
              );
            } else {
              setTotalFeeUsd(null);
              console.log(
                "Unable to calculate total fee due to missing price information",
              );
            }
          }

          // For bridging, we use the source token's decimals
          const token =
            options.type === "swap" ? destinationToken! : sourceToken!;
          const decimals = token.decimals || 6;

          const formattedAmount = parseFloat(
            expectedAmountOut.toString(),
          ).toFixed(Math.min(decimals, 6));

          setReceiveAmount(formattedAmount);

          // Update totalFee in the log to use our new calculated value
          console.log(`${options.type.toUpperCase()} Quote Updated:`, {
            requestId: currentRequestId,
            slippageBps: slippageBps,
            raw: expectedAmountOut,
            formatted: formattedAmount,
            etaSeconds: quote.etaSeconds,
            protocolBps: quote.protocolBps,
            protocolFeeUsd: protocolFeeUsd,
            relayerFee: relayerFee,
            totalFee: totalFeeUsd, // Use the newly calculated totalFeeUsd
            amount: amount,
            expectedAmountOut: expectedAmountOut,
            sourceTokenPrice: sourceTokenPrice,
            destinationTokenPrice: destinationTokenPrice,
            sourceAmountUsd: sourceAmountUsd,
            destinationAmountUsd: destinationAmountUsd,
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
    refreshTrigger,
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

      if (options.type === "swap" && sourceToken && destinationToken) {
        quotes = await getMayanQuote({
          amount,
          sourceToken,
          destinationToken,
          sourceChain,
          destinationChain,
          slippageBps,
        });
      }

      setQuoteData(quotes);

      // Get provider and signer
      const provider = getEthersProvider();
      const signer = await provider.getSigner();

      // Execute the swap with permit
      const result = await executeEvmSwap({
        quote: quoteData![0],
        swapperAddress: activeWallet!.address,
        destinationAddress: activeWallet!.address, // Usually same as swapper
        sourceToken: sourceToken!.address,
        amount: amount,
        referrerAddresses: null,
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
    sourceTokenPrice,
    destinationTokenPrice,
    sourceAmountUsd,
    destinationAmountUsd,

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
