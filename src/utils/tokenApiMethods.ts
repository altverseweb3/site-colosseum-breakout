// src/utils/tokenApiUtils.ts
import { evmTokenApi } from "@/api/evmTokenApi";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import { Token, Network, TokenAddressInfo } from "@/types/web3";

/**
 * Fetches token balances for a given wallet address on a specific chain
 * and updates the web3Store
 */
export async function getTokenBalances(
  userAddress: string,
  chainId: number,
  contractAddresses?: string,
): Promise<void> {
  // Get the store
  const store = useWeb3Store.getState();

  // Set loading state
  store.setTokensLoading(true);

  try {
    debugger;
    // Find the chain
    const chain = getChainByChainId(chainId);
    if (!chain) {
      console.error(`Chain with ID ${chainId} not found`);
      return;
    }

    // Call the API
    const response = await evmTokenApi.getBalances({
      network: chain.alchemyNetworkName,
      userAddress,
      contractAddresses,
    });

    if (response.error || !response.data) {
      console.error("Error fetching token balances:", response.error);
      return;
    }

    // Update the web3Store
    store.updateTokenBalances(chainId, userAddress, response.data);
  } catch (error) {
    console.error("Error in getTokenBalances:", error);
  } finally {
    // Clear loading state
    useWeb3Store.getState().setTokensLoading(false);
  }
}

/**
 * Fetches token prices for a list of tokens and updates the web3Store
 */
export async function getTokenPrices(tokens: Token[]): Promise<void> {
  if (!tokens.length) return;

  // Get the store
  const store = useWeb3Store.getState();

  // Set loading state
  store.setTokensLoading(true);

  try {
    // Create token address info objects for the API
    const tokenAddresses: TokenAddressInfo[] = tokens
      .map((token) => {
        const chain = getChainByChainId(token.chainId);
        if (!chain) return null;

        return {
          network: chain.alchemyNetworkName,
          address: token.address,
        };
      })
      .filter(Boolean) as TokenAddressInfo[];

    // Make a single API call with all tokens
    const response = await evmTokenApi.getTokenPrices({
      addresses: tokenAddresses,
    });

    if (response.error || !response.data) {
      console.error("Error fetching token prices:", response.error);
      return;
    }

    // Update the web3Store
    store.updateTokenPrices(response.data.data);
  } catch (error) {
    console.error("Error in getTokenPrices:", error);
  } finally {
    // Clear loading state
    useWeb3Store.getState().setTokensLoading(false);
  }
}

/**
 * Fetches balances for the active wallet on current source and destination chains
 */
export async function getBalancesForActiveWallet(): Promise<void> {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;

  if (!activeWallet) {
    console.warn("No active wallet to fetch balances for");
    return;
  }

  // Fetch balances for both source and destination chains
  await Promise.all([
    getTokenBalances(activeWallet.address, store.sourceChain.chainId),
    getTokenBalances(activeWallet.address, store.destinationChain.chainId),
  ]);
}

/**
 * Fetches prices for all loaded tokens
 */
export async function getPricesForTokens(): Promise<void> {
  const { allTokensList } = useWeb3Store.getState();

  if (!allTokensList.length) {
    console.warn("No tokens loaded to fetch prices for");
    return;
  }

  await getTokenPrices(allTokensList);
}

/**
 * Fetches prices for specific tokens on a chain
 */
export async function getPricesForChain(chainId: number): Promise<void> {
  const { getTokensForChain } = useWeb3Store.getState();
  const tokens = getTokensForChain(chainId);

  if (!tokens.length) {
    console.warn(`No tokens found for chain ${chainId}`);
    return;
  }

  await getTokenPrices(tokens);
}

export async function getUsdcPrice(): Promise<void> {
  const store = useWeb3Store.getState();
  store.setTokensLoading(true);

  try {
    // USDC on Ethereum
    const tokenAddresses: TokenAddressInfo[] = [
      {
        network: Network.ETH_MAINNET, // Use the actual enum value from your Network type
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    ];

    console.log("Fetching USDC price specifically:", tokenAddresses);

    // Make the API call
    const response = await evmTokenApi.getTokenPrices({
      addresses: tokenAddresses,
    });

    console.log("USDC price response:", response);

    if (response.error || !response.data) {
      console.error("Error fetching USDC price:", response.error);
      return;
    }

    // Log the raw data
    console.log("Raw USDC price data:", response.data);

    // Process the response directly here for debugging
    if (response.data.data && response.data.data.length > 0) {
      const usdcResult = response.data.data[0];
      console.log("USDC result:", usdcResult);

      if (usdcResult.prices && usdcResult.prices.length > 0) {
        const usdPrice = usdcResult.prices.find(
          (p) => p.currency.toLowerCase() === "usd",
        );
        if (usdPrice) {
          console.log("USDC USD price:", usdPrice.value);
        }
      }
    }

    // Update the store
    store.updateTokenPrices(response.data.data);
  } catch (error) {
    console.error("Error in getUsdcPrice:", error);
  } finally {
    store.setTokensLoading(false);
  }
}
