import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  WalletInfo,
  Web3StoreState,
  WalletType,
  Token,
  Chain,
} from "@/types/web3";
import { defaultSourceChain, defaultDestinationChain } from "@/config/chains";
import { loadAllTokens, StructuredTokenData } from "@/utils/tokenMethods";
import { chains } from "@/config/chains";
import { TokenPrice } from "@/types/web3";

const useWeb3Store = create<Web3StoreState>()(
  persist(
    (set, get) => ({
      connectedWallets: [],
      activeWallet: null,

      // Chain selection state
      sourceChain: defaultSourceChain,
      destinationChain: defaultDestinationChain,

      // Token selection state
      sourceToken: null,
      destinationToken: null,

      // Transaction details state
      transactionDetails: {
        slippage: "3.25%", // Default slippage value
        receiveAddress: null,
      },

      // tokens
      tokensByCompositeKey: {},
      tokensByChainId: {},
      tokensByAddress: {},
      allTokensList: [],
      tokensLoading: false,
      tokensError: null,

      tokenBalancesByWallet: {},
      tokenPricesUsd: {},

      // Transaction details actions
      setSlippageValue: (value: "auto" | string) => {
        set((state) => {
          // If value is "auto", use it directly
          if (value === "auto") {
            return {
              transactionDetails: {
                ...state.transactionDetails,
                slippage: "auto",
              },
            };
          }

          // Otherwise, ensure the value has % suffix for percentage values
          const formattedValue = value.endsWith("%") ? value : `${value}%`;
          return {
            transactionDetails: {
              ...state.transactionDetails,
              slippage: formattedValue,
            },
          };
        });
      },

      setReceiveAddress: (address: string | null) => {
        set((state) => ({
          transactionDetails: {
            ...state.transactionDetails,
            receiveAddress: address,
          },
        }));
      },

      // Wallet actions
      addWallet: (wallet: WalletInfo) => {
        const walletForStorage = {
          type: wallet.type,
          name: wallet.name,
          address: wallet.address,
          chainId: wallet.chainId,
        };

        set((state) => {
          const existingWalletIndex = state.connectedWallets.findIndex(
            (w) => w.type === wallet.type,
          );
          let newWallets: Array<Omit<WalletInfo, "provider">>;

          if (existingWalletIndex >= 0) {
            newWallets = [...state.connectedWallets];
            newWallets[existingWalletIndex] = walletForStorage;
          } else {
            newWallets = [...state.connectedWallets, walletForStorage];
          }

          return {
            connectedWallets: newWallets,
            activeWallet: state.activeWallet || walletForStorage,
          };
        });
      },

      removeWallet: (walletType: WalletType) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.filter(
            (w) => w.type !== walletType,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? state.connectedWallets.find((w) => w.type !== walletType) ||
                null
              : state.activeWallet,
        }));
      },

      setActiveWallet: (walletType: WalletType) => {
        set((state) => ({
          activeWallet:
            state.connectedWallets.find((w) => w.type === walletType) ||
            state.activeWallet,
        }));
      },

      updateWalletAddress: (walletType: WalletType, address: string) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, address } : wallet,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, address }
              : state.activeWallet,
        }));
      },

      updateWalletChainId: (walletType: WalletType, chainId: number) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, chainId } : wallet,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, chainId }
              : state.activeWallet,
        }));
      },

      disconnectAll: () => {
        set({
          connectedWallets: [],
          activeWallet: null,
        });
      },

      // Chain selection actions
      setSourceChain: (chain: Chain) => {
        set((state) => ({
          sourceChain: chain,
          destinationChain: state.destinationChain,
          // Reset source token when changing chains
          sourceToken: null,
        }));
      },

      setDestinationChain: (chain: Chain) => {
        set((state) => ({
          destinationChain: chain,
          sourceChain: state.sourceChain,
          // Reset destination token when changing chains
          destinationToken: null,
        }));
      },

      swapChains: () => {
        set((state) => ({
          sourceChain: state.destinationChain,
          destinationChain: state.sourceChain,
          // Swap tokens along with chains
          sourceToken: state.destinationToken,
          destinationToken: state.sourceToken,
        }));
      },

      // Token selection actions
      setSourceToken: (token: Token | null) => {
        console.log("Setting source token:", token ? token.name : "null");
        set({ sourceToken: token });
      },

      setDestinationToken: (token: Token | null) => {
        console.log("Setting destination token:", token ? token.name : "null");
        set({ destinationToken: token });
      },

      addCustomToken: (token: Token) => {
        set((state) => {
          // Ensure lowercase address for consistency
          const address = token.address.toLowerCase();
          const chainId = token.chainId;
          const compositeKey = `${chainId}-${address}`;

          // Check if token already exists in the store
          if (state.tokensByCompositeKey[compositeKey]) {
            console.log("Token already exists in store:", compositeKey);
            return state; // No changes needed
          }

          console.log("Adding custom token to store:", token);

          // Add token to allTokensList
          const newTokensList = [...state.allTokensList, token];

          // Update derived collections
          const {
            tokensByCompositeKey: updatedByCompositeKey,
            tokensByChainId: updatedByChainId,
            tokensByAddress: updatedByAddress,
          } = updateTokenCollections(newTokensList);

          return {
            allTokensList: newTokensList,
            tokensByCompositeKey: updatedByCompositeKey,
            tokensByChainId: updatedByChainId,
            tokensByAddress: updatedByAddress,
          };
        });
      },
      swapTokens: () => {
        const state = get();
        console.log(
          "Swapping tokens:",
          state.sourceToken ? state.sourceToken.name : "null",
          "<->",
          state.destinationToken ? state.destinationToken.name : "null",
        );
        set((state) => ({
          sourceToken: state.destinationToken,
          destinationToken: state.sourceToken,
        }));
      },

      loadTokens: async () => {
        if (get().tokensLoading) return;

        try {
          set({ tokensLoading: true, tokensError: null });
          const structuredTokens: StructuredTokenData = await loadAllTokens();

          // Get current serialized tokens
          const currentSourceToken = get().sourceToken;
          const currentDestinationToken = get().destinationToken;

          // Find the full token objects from the loaded tokens if they exist
          let fullSourceToken = null;
          let fullDestinationToken = null;

          if (currentSourceToken) {
            fullSourceToken =
              structuredTokens.allTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentSourceToken.address.toLowerCase() &&
                  token.chainId === currentSourceToken.chainId,
              ) || null;
          }

          if (currentDestinationToken) {
            fullDestinationToken =
              structuredTokens.allTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentDestinationToken.address.toLowerCase() &&
                  token.chainId === currentDestinationToken.chainId,
              ) || null;
          }

          set({
            tokensByCompositeKey: structuredTokens.byCompositeKey,
            tokensByChainId: structuredTokens.byChainId,
            tokensByAddress: structuredTokens.byChainIdAndAddress,
            allTokensList: structuredTokens.allTokensList,
            // Rehydrate full token objects from the loaded token list
            sourceToken: fullSourceToken,
            destinationToken: fullDestinationToken,
            tokensLoading: false,
            tokensError: null,
          });
        } catch (error) {
          console.error("Error loading tokens:", error);
          set({
            tokensByCompositeKey: {}, // Reset on error
            tokensByChainId: {},
            tokensByAddress: {},
            allTokensList: [],
            tokensError: error instanceof Error ? error.message : String(error),
            tokensLoading: false,
          });
        }
      },

      getTokensForChain: (chainId: number): Token[] => {
        return get().tokensByChainId[chainId] || [];
      },

      updateTokenBalances: (chainId, userAddress, balances) => {
        const { tokenBalancesByWallet, allTokensList, tokensByCompositeKey } =
          get();

        // Create a wallet key for storing balances
        const walletKey = `${chainId}-${userAddress.toLowerCase()}`;

        // Get existing balances or create a new record
        const existingBalances = tokenBalancesByWallet[walletKey] || {};
        const updatedBalances = { ...existingBalances };

        // Create a map to track which tokens have been updated
        const updatedTokens: Record<string, Token> = {};

        // Process each balance
        balances.forEach((balance) => {
          const tokenAddress = balance.contractAddress.toLowerCase();

          // Store the balance (keeping it as a string)
          updatedBalances[tokenAddress] = balance.tokenBalance;

          // Find token in our collections
          const compositeKey = `${chainId}-${tokenAddress}`;
          const token = tokensByCompositeKey[compositeKey];
          if (token) {
            // Create updated token with balance info
            const tokenWithBalance: Token = {
              ...token,
              userBalance: balance.tokenBalance,
              isWalletToken: true,
            };

            // Calculate USD balance if price is available in the token
            if (token.priceUsd) {
              try {
                // Convert balance from Wei to token units based on decimals
                let numericalBalance = balance.tokenBalance;
                if (numericalBalance.startsWith("0x")) {
                  numericalBalance = BigInt(numericalBalance).toString();
                }

                // Format with 2 decimal places for currency display
                tokenWithBalance.userBalanceUsd = (
                  Number(numericalBalance) * Number(token.priceUsd)
                ).toFixed(2);
              } catch (e) {
                console.error("Error calculating USD balance:", e);
              }
            }

            updatedTokens[compositeKey] = tokenWithBalance;
          }
        });

        // Update tokens in our main list
        const newTokensList = allTokensList.map((token) => {
          const compositeKey = `${token.chainId}-${token.address.toLowerCase()}`;
          return updatedTokens[compositeKey] || token;
        });

        // Get updated derived collections
        const {
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
        } = updateTokenCollections(newTokensList);

        // Update the store
        set({
          tokenBalancesByWallet: {
            ...tokenBalancesByWallet,
            [walletKey]: updatedBalances,
          },
          allTokensList: newTokensList,
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
        });
      },

      updateTokenPrices: (priceResults) => {
        const {
          tokenPricesUsd,
          allTokensList,
          tokensByCompositeKey,
          sourceToken,
          destinationToken,
        } = get();
        // Create a copy of current prices
        const updatedPrices = { ...tokenPricesUsd };

        // Create a map to track which tokens have been updated
        const updatedTokens: Record<string, Token> = {};

        // Get source and destination tokens for special handling
        const selectedTokens = [sourceToken, destinationToken].filter(Boolean);
        const selectedTokenKeys = selectedTokens.map(
          (token) => `${token!.chainId}-${token!.address.toLowerCase()}`,
        );

        // Process each price result
        priceResults.forEach((result) => {
          if (result.error) {
            console.error(
              `Error in price data for ${result.network}/${result.address}:`,
              result.error,
            );
            return;
          }

          // Find the chain for this network
          const chain = Object.values(chains).find(
            (c) => c.alchemyNetworkName === result.network,
          );

          if (!chain) {
            console.warn(`Chain not found for network ${result.network}`);
            return;
          }

          const tokenAddress = result.address.toLowerCase();
          const compositeKey = `${chain.chainId}-${tokenAddress}`;

          // Find USD price if available
          const usdPrice = result.prices.find(
            (p: TokenPrice) => p.currency.toLowerCase() === "usd",
          );

          if (usdPrice) {
            // Store price in the prices map
            updatedPrices[compositeKey] = usdPrice.value;
            console.log(
              `Updating price for token ${tokenAddress} on chain ${chain.chainId}: ${usdPrice.value} USD`,
            );

            // Find token in our collections
            let token = tokensByCompositeKey[compositeKey];

            // Special handling for selected source/destination tokens that might not be in the collections
            if (!token && selectedTokenKeys.includes(compositeKey)) {
              // Find the token in our selected tokens
              const selectedToken = selectedTokens.find(
                (t) =>
                  t!.chainId === chain.chainId &&
                  t!.address.toLowerCase() === tokenAddress,
              );

              if (selectedToken) {
                console.log(
                  `Found selected token not in collections: ${selectedToken.name || tokenAddress}`,
                );
                token = selectedToken;
              }
            }

            if (token) {
              let userBalanceUsd: string | undefined = undefined;

              // Calculate USD balance if we have both price and balance
              if (token.userBalance) {
                try {
                  // Handle hex balance
                  let balance = token.userBalance;
                  if (balance.startsWith("0x")) {
                    balance = BigInt(balance).toString();
                  }
                  const balanceInTokenUnits = Number(balance);
                  const price = Number(usdPrice.value);

                  userBalanceUsd = (balanceInTokenUnits * price).toString();
                } catch (e) {
                  console.error("Error calculating USD balance:", e);
                }
              }

              // Update token with price info
              updatedTokens[compositeKey] = {
                ...token,
                priceUsd: usdPrice.value, // Store the price in the token object
                userBalanceUsd,
              };

              console.log(
                `Updated token ${token.name || tokenAddress} with price: ${usdPrice.value}`,
              );
            }
          }
        });

        // Update tokens in our main list
        const newTokensList = [...allTokensList];

        // Update existing tokens in the list
        for (let i = 0; i < newTokensList.length; i++) {
          const token = newTokensList[i];
          const compositeKey = `${token.chainId}-${token.address.toLowerCase()}`;
          if (updatedTokens[compositeKey]) {
            newTokensList[i] = updatedTokens[compositeKey];
            // Remove from updatedTokens so we know which ones still need to be added
            delete updatedTokens[compositeKey];
          }
        }

        // Add any tokens that weren't already in the list (selected tokens with prices)
        const tokensToAdd = Object.values(updatedTokens);
        if (tokensToAdd.length > 0) {
          console.log(
            `Adding ${tokensToAdd.length} new tokens with prices to token list`,
          );
          newTokensList.push(...tokensToAdd);
        }

        // Get updated derived collections
        const updatedCollections = updateTokenCollections(newTokensList);

        // Update the sourceToken and destinationToken with new price data if available
        let updatedSourceToken = sourceToken;
        let updatedDestinationToken = destinationToken;

        if (sourceToken) {
          const sourceKey = `${sourceToken.chainId}-${sourceToken.address.toLowerCase()}`;
          if (updatedTokens[sourceKey]) {
            updatedSourceToken = updatedTokens[sourceKey];
            console.log(
              `Updated source token ${sourceToken.name} with price: ${updatedSourceToken.priceUsd}`,
            );
          }
        }

        if (destinationToken) {
          const destKey = `${destinationToken.chainId}-${destinationToken.address.toLowerCase()}`;
          if (updatedTokens[destKey]) {
            updatedDestinationToken = updatedTokens[destKey];
            console.log(
              `Updated destination token ${destinationToken.name} with price: ${updatedDestinationToken.priceUsd}`,
            );
          }
        }

        // Update the store
        set({
          tokenPricesUsd: updatedPrices,
          allTokensList: newTokensList,
          sourceToken: updatedSourceToken,
          destinationToken: updatedDestinationToken,
          ...updatedCollections,
        });
      },

      setTokensLoading: (loading) => {
        set({ tokensLoading: loading });
      },
    }),
    {
      name: "altverse-storage-web3",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
          };
        }
        return localStorage;
      }),
      partialize: (state) => {
        const serializeToken = (token: Token | null) => {
          if (!token) return null;
          return {
            id: token.id,
            name: token.name,
            ticker: token.ticker,
            icon: token.icon,
            address: token.address,
            decimals: token.decimals,
            chainId: token.chainId,
            userBalance: token.userBalance,
            userBalanceUsd: token.userBalanceUsd,
            isWalletToken: token.isWalletToken,
          };
        };
        return {
          // Only persist what we need and ensure we don't store providers
          connectedWallets: state.connectedWallets.map((wallet) => ({
            type: wallet.type,
            name: wallet.name,
            address: wallet.address,
            chainId: wallet.chainId,
          })),
          activeWallet: state.activeWallet
            ? {
                type: state.activeWallet.type,
                name: state.activeWallet.name,
                address: state.activeWallet.address,
                chainId: state.activeWallet.chainId,
              }
            : null,
          sourceChain: state.sourceChain,
          destinationChain: state.destinationChain,
          transactionDetails: state.transactionDetails,
          sourceToken: serializeToken(state.sourceToken),
          destinationToken: serializeToken(state.destinationToken),
        };
      },
    },
  ),
);

const updateTokenCollections = (
  tokens: Token[],
): {
  tokensByCompositeKey: Record<string, Token>;
  tokensByChainId: Record<number, Token[]>;
  tokensByAddress: Record<number, Record<string, Token>>;
} => {
  // Create new collections
  const byCompositeKey: Record<string, Token> = {};
  const byChainId: Record<number, Token[]> = {};
  const byChainIdAndAddress: Record<number, Record<string, Token>> = {};

  // Populate collections
  tokens.forEach((token) => {
    const chainId = token.chainId;
    const address = token.address.toLowerCase();
    const compositeKey = `${chainId}-${address}`;

    // Update byCompositeKey
    byCompositeKey[compositeKey] = token;

    // Update byChainId
    if (!byChainId[chainId]) {
      byChainId[chainId] = [];
    }
    byChainId[chainId].push(token);

    // Update byChainIdAndAddress
    if (!byChainIdAndAddress[chainId]) {
      byChainIdAndAddress[chainId] = {};
    }
    byChainIdAndAddress[chainId][address] = token;
  });

  // Update the store
  return {
    tokensByCompositeKey: byCompositeKey,
    tokensByChainId: byChainId,
    tokensByAddress: byChainIdAndAddress,
  };
};

export const useCurrentChainId = (): number | null => {
  return useWeb3Store((state) => state.activeWallet?.chainId ?? null);
};

export const useSourceChain = (): Chain => {
  return useWeb3Store((state) => state.sourceChain);
};

export const useDestinationChain = (): Chain => {
  return useWeb3Store((state) => state.destinationChain);
};

// New hooks for the selected tokens
export const useSourceToken = (): Token | null => {
  return useWeb3Store((state) => state.sourceToken);
};

export const useDestinationToken = (): Token | null => {
  return useWeb3Store((state) => state.destinationToken);
};

export const useTokensLoading = (): boolean => {
  return useWeb3Store((state) => state.tokensLoading);
};

export const useTokensError = (): string | null => {
  return useWeb3Store((state) => state.tokensError);
};

export const useAllTokensList = (): Token[] => {
  return useWeb3Store((state) => state.allTokensList);
};

export const useTokensForChain = (chainId: number): Token[] => {
  return useWeb3Store((state) => state.tokensByChainId[chainId] || []);
};

export const useSourceChainTokens = (): Token[] => {
  const sourceChainId = useWeb3Store((state) => state.sourceChain.chainId);
  return useWeb3Store((state) => state.tokensByChainId[sourceChainId] || []);
};

export const useDestinationChainTokens = (): Token[] => {
  const destinationChainId = useWeb3Store(
    (state) => state.destinationChain.chainId,
  );
  return useWeb3Store(
    (state) => state.tokensByChainId[destinationChainId] || [],
  );
};

export const useTokenByAddress = (
  address: string | undefined,
  chainId: number | undefined,
): Token | undefined => {
  const lowerAddress = address?.toLowerCase();
  return useWeb3Store((state) => {
    if (!lowerAddress || chainId === undefined) return undefined;
    const chainTokens = state.tokensByAddress[chainId];
    return chainTokens ? chainTokens[lowerAddress] : undefined;
  });
};

export const useLoadTokens = () => {
  return useWeb3Store((state) => state.loadTokens);
};

export const useTransactionDetails = () => {
  return useWeb3Store((state) => state.transactionDetails);
};

export const useSetSlippageValue = () => {
  return useWeb3Store((state) => state.setSlippageValue);
};

export const useSetReceiveAddress = () => {
  return useWeb3Store((state) => state.setReceiveAddress);
};

export default useWeb3Store;
