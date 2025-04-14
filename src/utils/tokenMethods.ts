import {
  evmTokenApi,
  TokenBalance,
  TokenAddressInfo,
} from "@/app/api/evmTokenApi";
import { getChainById, getChainByChainId } from "@/config/chains";
import { Token, Chain } from "@/types/web3";

interface TokenDataItem {
  extract_time: number;
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  local_image: string;
  alchemy_metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface StructuredTokenData {
  byCompositeKey: Record<string, Token>;
  byChainId: Record<number, Token[]>;
  byChainIdAndAddress: Record<number, Record<string, Token>>;
  allTokensList: Token[];
}

// Cache for token metadata to avoid reloading for each chain
const tokenMetadataCache: Record<string, TokenDataItem[]> = {};

/**
 * Converts hex string to decimal number
 */
export function hexToDecimal(hex: string): string {
  if (!hex) return "0";
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  const bigInt = BigInt(`0x${cleanHex}`);

  return bigInt.toString();
}

/**
 * Formats token balance with proper decimals
 */
export function formatTokenBalance(
  balance: string,
  decimals: number = 18,
): string {
  if (!balance) return "0";

  try {
    const balanceValue = BigInt(balance);
    if (balanceValue === BigInt(0)) return "0";

    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = balanceValue / divisor;
    const remainder = balanceValue % divisor;

    if (remainder === BigInt(0)) {
      return integerPart.toString();
    }

    // Convert remainder to string with proper padding
    let remainderStr = remainder.toString().padStart(decimals, "0");

    // Remove trailing zeros
    remainderStr = remainderStr.replace(/0+$/, "");

    if (remainderStr === "") {
      return integerPart.toString();
    }

    return `${integerPart}.${remainderStr}`;
  } catch (e) {
    console.error("Error formatting token balance:", e);
    return "0";
  }
}

/**
 * Calculates USD value of a token balance using price data
 */
export function calculateUsdValue(
  formattedBalance: string,
  price: string,
): string {
  if (!formattedBalance || !price) return "$0.00";
  try {
    const balance = parseFloat(formattedBalance);
    const priceValue = parseFloat(price);

    if (isNaN(balance) || isNaN(priceValue)) return "$0.00";

    const usdValue = balance * priceValue;

    // Format to 2 decimal places with dollar sign
    return `$${usdValue.toFixed(2)}`;
  } catch (e) {
    console.error("Error calculating USD value:", e);
    return "$0.00";
  }
}

/**
 * Gets token balances for a wallet address on a specific chain
 * Includes retry logic for better reliability
 */
export async function getWalletTokenBalances(
  walletAddress: string,
  chain: Chain,
  retries = 2,
): Promise<Map<string, TokenBalance>> {
  try {
    if (!walletAddress || !chain) {
      return new Map();
    }

    console.log(
      `Fetching token balances for ${chain.name} (${chain.alchemyNetworkName})`,
    );

    // Get all token balances for the wallet (without specifying contract addresses)
    const response = await evmTokenApi.getBalances({
      network: chain.alchemyNetworkName,
      userAddress: walletAddress,
    });

    if (response.error || !response.data) {
      console.error(
        `Error fetching balances for ${chain.name}:`,
        response.error,
      );

      // Implement retry logic
      if (retries > 0) {
        console.log(
          `Retrying balance fetch for ${chain.name}... (${retries} retries left)`,
        );
        // Wait 1 second before retrying to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return getWalletTokenBalances(walletAddress, chain, retries - 1);
      }

      return new Map();
    }

    console.log(
      `Received ${response.data.length} token balances for ${chain.name}`,
    );

    // Map token balances by contract address (lowercase for case-insensitive lookup)
    const balanceMap = new Map<string, TokenBalance>();

    for (const balance of response.data) {
      balanceMap.set(balance.contractAddress.toLowerCase(), balance);
    }

    return balanceMap;
  } catch (error) {
    console.error(`Error in getWalletTokenBalances for ${chain.name}:`, error);

    // Implement retry logic
    if (retries > 0) {
      console.log(
        `Retrying balance fetch for ${chain.name}... (${retries} retries left)`,
      );
      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getWalletTokenBalances(walletAddress, chain, retries - 1);
    }

    return new Map();
  }
}

/**
 * Gets token price data for multiple tokens
 */
export async function getTokenPrices(
  tokens: Token[],
): Promise<Map<string, string>> {
  try {
    if (!tokens.length) {
      return new Map();
    }

    // Prepare request with tokens from supported networks only
    const tokenRequests = tokens.map((token) => {
      const chain = getChainByChainId(token.chainId);
      if (!chain) return null;

      return {
        network: chain.alchemyNetworkName,
        address: token.address,
      };
    });

    // Explicitly filter and type the requests to remove nulls
    const validRequests: TokenAddressInfo[] = tokenRequests.filter(
      (request): request is TokenAddressInfo => request !== null,
    );

    if (!validRequests.length) {
      return new Map();
    }
    console.log(`Fetching prices for ${validRequests.length} tokens`);

    const response = await evmTokenApi.getTokenPrices({
      addresses: validRequests,
    });

    if (response.error || !response.data || !response.data.data) {
      console.error("Error fetching token prices:", response.error);
      return new Map();
    }

    // Map prices by network and token address
    const priceMap = new Map<string, string>();

    for (const priceData of response.data.data) {
      if (priceData.prices && priceData.prices.length > 0) {
        const key = `${priceData.network}-${priceData.address.toLowerCase()}`;
        priceMap.set(key, priceData.prices[0].value);
      }
    }

    return priceMap;
  } catch (error) {
    console.error("Error in getTokenPrices:", error);
    return new Map();
  }
}

/**
 * Load token metadata from local JSON files with caching
 */
export async function loadTokenMetadata(
  fetchChainId: string,
): Promise<TokenDataItem[]> {
  // Check cache first
  if (tokenMetadataCache[fetchChainId]) {
    return tokenMetadataCache[fetchChainId];
  }

  try {
    const metadataResponse = await fetch(`/tokens/${fetchChainId}/data.json`);
    if (!metadataResponse.ok) {
      console.warn(`No token data found for chain ${fetchChainId}`);
      return [];
    }

    const metadataList: TokenDataItem[] = await metadataResponse.json();

    // Cache the result
    tokenMetadataCache[fetchChainId] = metadataList;

    return metadataList;
  } catch (error) {
    console.error(
      `Error loading token metadata for chain ${fetchChainId}:`,
      error,
    );
    return [];
  }
}

/**
 * Updates token data with real balances from the blockchain
 */
export async function loadTokensForChainWithRealBalances(
  fetchChainId: string,
  walletAddress?: string,
): Promise<Token[]> {
  try {
    const chainConfig = getChainById(fetchChainId);
    if (!chainConfig) {
      console.warn(`Chain config not found for ${fetchChainId}`);
      return [];
    }

    console.log(
      `Loading tokens for chain ${chainConfig.name} (${fetchChainId})`,
    );

    // Load token metadata with caching
    const metadataList = await loadTokenMetadata(fetchChainId);
    if (metadataList.length === 0) {
      return [];
    }

    const numericChainId = chainConfig.chainId;

    // Create basic tokens from metadata
    const tokens: Token[] = metadataList.map((item) => ({
      id: item.id,
      name: item.name.toLowerCase(),
      ticker: item.symbol.toUpperCase(),
      icon: item.local_image,
      address: item.contract_address.toLowerCase(), // Normalize addresses to lowercase
      decimals: item.alchemy_metadata.decimals,
      chainId: numericChainId,
      userBalance: "0",
      userBalanceUsd: "$0.00",
      isWalletToken: false,
    }));

    // If no wallet address, return tokens with zero balances
    if (!walletAddress) {
      console.log(
        `No wallet address provided for ${chainConfig.name}, returning tokens with zero balances`,
      );
      return tokens;
    }

    // Fetch real balances from the API
    const balanceMap = await getWalletTokenBalances(walletAddress, chainConfig);

    // If we got some balances, fetch token prices for tokens with balances
    let priceMap = new Map<string, string>();
    if (balanceMap.size > 0) {
      // Only get prices for tokens that have balances
      const tokensWithBalances = tokens.filter((token) => {
        const balance = balanceMap.get(token.address.toLowerCase());
        return balance && hexToDecimal(balance.tokenBalance) !== "0";
      });

      if (tokensWithBalances.length > 0) {
        console.log(
          `Found ${tokensWithBalances.length} tokens with balances on ${chainConfig.name}`,
        );
        priceMap = await getTokenPrices(tokensWithBalances);
      }
    }

    // Update tokens with real balances and price data
    return tokens.map((token) => {
      const balance = balanceMap.get(token.address.toLowerCase());

      if (!balance) {
        return token; // No balance, return token with zeros
      }
      // Convert hex balance to decimal
      const decimalBalance = hexToDecimal(balance.tokenBalance);

      // If balance is zero, return token with zeros
      if (decimalBalance === "0") {
        return token;
      }

      // Format balance with proper decimals
      const formattedBalance = formatTokenBalance(
        decimalBalance,
        token.decimals,
      );

      // Get price and calculate USD value if available
      const priceKey = `${chainConfig.alchemyNetworkName}-${token.address.toLowerCase()}`;
      const price = priceMap.get(priceKey);
      const userBalanceUsd = price
        ? calculateUsdValue(formattedBalance, price)
        : "$0.00";

      console.log(`PRICE FOR ${token.name} on ${token.chainId} is ${price}`);
      return {
        ...token,
        userBalance: formattedBalance,
        userBalanceUsd,
        isWalletToken: true, // Token is in wallet if balance > 0
      };
    });
  } catch (error) {
    console.error(`Error loading tokens for chain ${fetchChainId}:`, error);
    return [];
  }
}

/**
 * Loads tokens for specific chains only
 * This is more efficient than loading all chains
 */
export async function loadTokensForSpecificChains(
  chainIds: string[],
  walletAddress?: string,
): Promise<StructuredTokenData> {
  console.log(`Loading tokens for specific chains: ${chainIds.join(", ")}`);

  const tokensByCompositeKey: Record<string, Token> = {};
  const tokensByChainId: Record<number, Token[]> = {};
  const tokensByChainIdAndAddress: Record<number, Record<string, Token>> = {};
  const allTokensList: Token[] = [];

  try {
    // Process chains sequentially to avoid overwhelming the API
    for (const fetchChainId of chainIds) {
      const chainTokens = await loadTokensForChainWithRealBalances(
        fetchChainId,
        walletAddress,
      );

      if (chainTokens.length > 0) {
        const numericChainId = chainTokens[0].chainId;

        if (!tokensByChainId[numericChainId]) {
          tokensByChainId[numericChainId] = [];
        }

        if (!tokensByChainIdAndAddress[numericChainId]) {
          tokensByChainIdAndAddress[numericChainId] = {};
        }

        chainTokens.forEach((token) => {
          const compositeKey = `${token.id}-${fetchChainId}`;
          tokensByCompositeKey[compositeKey] = token;

          tokensByChainId[numericChainId].push(token);

          tokensByChainIdAndAddress[numericChainId][
            token.address.toLowerCase()
          ] = token;

          allTokensList.push(token);
        });
      }
    }
  } catch (error) {
    console.error("Error loading tokens for specific chains:", error);
  }

  return {
    byCompositeKey: tokensByCompositeKey,
    byChainId: tokensByChainId,
    byChainIdAndAddress: tokensByChainIdAndAddress,
    allTokensList: allTokensList,
  };
}
