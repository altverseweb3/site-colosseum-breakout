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
import { loadTokensForSpecificChains } from "@/utils/tokenMethods";

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
        set((state) => {
          // Check if wallet of this type already exists
          const exists = state.connectedWallets.some(
            (w) => w.type === wallet.type,
          );

          const newWallets = exists
            ? state.connectedWallets.map((w) =>
                w.type === wallet.type ? wallet : w,
              )
            : [...state.connectedWallets, wallet];

          // Set as active wallet if no active wallet or this wallet type is already active
          const newActiveWallet =
            !state.activeWallet ||
            (state.activeWallet && state.activeWallet.type === wallet.type)
              ? wallet
              : state.activeWallet;

          // Refresh token balances with the wallet address
          if (wallet.address) {
            // Only load tokens for currently selected chains
            get().loadTokensForActiveChains();
          }

          return {
            connectedWallets: newWallets,
            activeWallet: newActiveWallet,
          };
        });
      },

      removeWallet: (walletType: WalletType) => {
        set((state) => {
          const newWallets = state.connectedWallets.filter(
            (w) => w.type !== walletType,
          );

          // If removing active wallet, set a new one if available
          let newActiveWallet = state.activeWallet;
          if (state.activeWallet?.type === walletType) {
            newActiveWallet = newWallets.length > 0 ? newWallets[0] : null;
          }

          // Refresh token balances without the removed wallet
          if (state.activeWallet?.type === walletType) {
            get().loadTokensForActiveChains();
          }

          return {
            connectedWallets: newWallets,
            activeWallet: newActiveWallet,
          };
        });
      },

      setActiveWallet: (walletType: WalletType) => {
        set((state) => {
          const wallet = state.connectedWallets.find(
            (w) => w.type === walletType,
          );
          if (!wallet) return state;

          // Refresh token balances if changing active wallet
          if (state.activeWallet?.address !== wallet.address) {
            get().loadTokensForActiveChains();
          }

          return { activeWallet: wallet };
        });
      },

      updateWalletAddress: (walletType: WalletType, address: string) => {
        set((state) => {
          const newWallets = state.connectedWallets.map((w) =>
            w.type === walletType ? { ...w, address } : w,
          );

          const newActiveWallet =
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, address }
              : state.activeWallet;

          // Refresh token balances if updating active wallet address
          if (state.activeWallet?.type === walletType) {
            get().loadTokensForActiveChains();
          }

          return {
            connectedWallets: newWallets,
            activeWallet: newActiveWallet,
          };
        });
      },

      updateWalletChainId: (walletType: WalletType, chainId: number) => {
        set((state) => {
          const newWallets = state.connectedWallets.map((w) =>
            w.type === walletType ? { ...w, chainId } : w,
          );

          const newActiveWallet =
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, chainId }
              : state.activeWallet;

          return {
            connectedWallets: newWallets,
            activeWallet: newActiveWallet,
          };
        });
      },

      disconnectAll: () => {
        set({
          connectedWallets: [],
          activeWallet: null,
        });

        // Refresh token balances without a wallet
        get().loadTokensForActiveChains();
      },

      // Chain selection actions
      setSourceChain: (chain: Chain) => {
        set((state) => {
          const newState = {
            sourceChain: chain,
            destinationChain:
              state.destinationChain.id === chain.id
                ? state.sourceChain
                : state.destinationChain,
            // Reset source token when changing chains
            sourceToken: null,
          };

          // Load tokens for the new source chain
          setTimeout(() => {
            get().loadTokensForChain(chain.id);
          }, 0);

          return newState;
        });
      },

      setDestinationChain: (chain: Chain) => {
        set((state) => {
          const newState = {
            destinationChain: chain,
            sourceChain:
              state.sourceChain.id === chain.id
                ? state.destinationChain
                : state.sourceChain,
            // Reset destination token when changing chains
            destinationToken: null,
          };

          // Load tokens for the new destination chain
          setTimeout(() => {
            get().loadTokensForChain(chain.id);
          }, 0);

          return newState;
        });
      },

      swapChains: () => {
        set((state) => {
          const sourceChain = state.destinationChain;
          const destinationChain = state.sourceChain;

          return {
            sourceChain,
            destinationChain,
            // Swap tokens along with chains
            sourceToken: state.destinationToken,
            destinationToken: state.sourceToken,
          };
        });
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

      loadTokensForChain: async (chainId: string) => {
        const { activeWallet } = get();

        set((state) => ({
          ...state,
          tokensLoading: true,
          tokensError: null,
        }));

        try {
          console.log(`Loading tokens for chain: ${chainId}`);

          const tokenData = await loadTokensForSpecificChains(
            [chainId],
            activeWallet?.address,
          );

          // Merge with existing token data
          set((state) => {
            const mergedCompositeKey = {
              ...state.tokensByCompositeKey,
              ...tokenData.byCompositeKey,
            };
            const mergedByChainId = { ...state.tokensByChainId };
            const mergedByAddress = { ...state.tokensByAddress };

            // Add new chain tokens
            for (const chainIdKey in tokenData.byChainId) {
              mergedByChainId[chainIdKey] = tokenData.byChainId[chainIdKey];
            }

            for (const chainIdKey in tokenData.byChainIdAndAddress) {
              mergedByAddress[chainIdKey] =
                tokenData.byChainIdAndAddress[chainIdKey];
            }

            const allTokensSet = new Set(
              [...state.allTokensList, ...tokenData.allTokensList].map(
                (t) => t.id,
              ),
            );
            const uniqueTokens = [...allTokensSet].map((id) => {
              // Prefer the new token data if available
              return (
                tokenData.allTokensList.find((t) => t.id === id) ||
                state.allTokensList.find((t) => t.id === id)!
              );
            });

            return {
              tokensByCompositeKey: mergedCompositeKey,
              tokensByChainId: mergedByChainId,
              tokensByAddress: mergedByAddress,
              allTokensList: uniqueTokens.filter(Boolean),
              tokensLoading: false,
            };
          });
        } catch (error) {
          console.error("Error loading tokens for chain:", error);
          set({
            tokensLoading: false,
            tokensError: `Failed to load tokens for chain ${chainId}. Please try again later.`,
          });
        }
      },

      // Load tokens for currently active chains
      loadTokensForActiveChains: async () => {
        const { sourceChain, destinationChain, activeWallet } = get();

        set({ tokensLoading: true, tokensError: null });

        try {
          const chainIds = [sourceChain.id, destinationChain.id];

          // Load tokens for just these chains
          const tokenData = await loadTokensForSpecificChains(
            chainIds,
            activeWallet?.address,
          );

          set({
            tokensByCompositeKey: tokenData.byCompositeKey,
            tokensByChainId: tokenData.byChainId,
            tokensByAddress: tokenData.byChainIdAndAddress,
            allTokensList: tokenData.allTokensList,
            tokensLoading: false,
          });
        } catch (error) {
          console.error("Error loading tokens for active chains:", error);
          set({
            tokensLoading: false,
            tokensError: "Failed to load tokens. Please try again later.",
          });
        }
      },

      // TODO: remove this if not needed
      loadTokens: async () => {
        const { activeWallet, sourceChain, destinationChain } = get();

        set({ tokensLoading: true, tokensError: null });

        try {
          const chainIds = [sourceChain.id, destinationChain.id];
          console.log(
            `loadTokens: Optimized to only load active chains: ${chainIds.join(", ")}`,
          );

          const tokenData = await loadTokensForSpecificChains(
            chainIds,
            activeWallet?.address,
          );

          set({
            tokensByCompositeKey: tokenData.byCompositeKey,
            tokensByChainId: tokenData.byChainId,
            tokensByAddress: tokenData.byChainIdAndAddress,
            allTokensList: tokenData.allTokensList,
            tokensLoading: false,
          });
        } catch (error) {
          console.error("Error loading tokens:", error);
          set({
            tokensLoading: false,
            tokensError: "Failed to load tokens. Please try again later.",
          });
        }
      },

      getWalletTokens: () => {
        const { allTokensList } = get();
        return allTokensList.filter((token) => token.isWalletToken);
      },

      getAllTokens: () => {
        return get().allTokensList;
      },

      getTokensForChain: (chainId: number) => {
        const { tokensByChainId } = get();
        return tokensByChainId[chainId] || [];
      },

      getTokenById: (compositeKey: string) => {
        const { tokensByCompositeKey } = get();
        return tokensByCompositeKey[compositeKey];
      },

      getTokenByAddress: (address: string, chainId: number) => {
        const { tokensByAddress } = get();
        if (!tokensByAddress[chainId]) return undefined;
        return tokensByAddress[chainId][address.toLowerCase()];
      },

      findTokenByAddressAnyChain: (address: string) => {
        const { tokensByAddress } = get();
        const normalizedAddress = address.toLowerCase();

        for (const chainId in tokensByAddress) {
          if (tokensByAddress[chainId][normalizedAddress]) {
            return tokensByAddress[chainId][normalizedAddress];
          }
        }

        return undefined;
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

export const useLoadTokensForActiveChains = () => {
  return useWeb3Store((state) => state.loadTokensForActiveChains);
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
