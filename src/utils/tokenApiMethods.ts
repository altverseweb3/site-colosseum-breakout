// src/utils/tokenApiMethods.ts
import { evmTokenApi } from "@/api/evmTokenApi";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import {
  Token,
  TokenAddressInfo,
  TokenBalance,
  TokenPriceResult,
  TokenMetadata,
} from "@/types/web3";

/**
 * Formats a balance from hex or large number string to a human-readable token amount
 * @param balanceStr The balance string (possibly in hex format)
 * @param decimals The token's decimal places
 * @returns Formatted balance as a string with appropriate decimal places
 */
function formatTokenBalance(balanceStr: string, decimals: number): string {
  try {
    // Handle hex values
    let numericalBalance: bigint;
    if (balanceStr.startsWith("0x")) {
      numericalBalance = BigInt(balanceStr);
    } else {
      // Handle non-hex large numbers
      numericalBalance = BigInt(balanceStr);
    }

    // Convert to base units by dividing by 10^decimals
    const divisor = BigInt(10) ** BigInt(decimals);

    // Calculate whole part and fractional part
    const wholePart = numericalBalance / divisor;
    const fractionalPart = numericalBalance % divisor;

    // Convert to string with proper decimal formatting
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    } else {
      // Pad with leading zeros if needed
      let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

      // Trim trailing zeros
      fractionalStr = fractionalStr.replace(/0+$/, "");

      return `${wholePart}.${fractionalStr}`;
    }
  } catch (e) {
    console.error("Error formatting token balance:", e);
    return "0"; // Return 0 as fallback
  }
}

export async function getPricesAndBalancesForActiveWallet(): Promise<boolean> {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;

  if (!activeWallet) {
    console.warn("No active wallet to fetch prices and balances for");
    return false;
  }

  store.setTokensLoading(true);

  try {
    const [sourceResult, destinationResult] = await Promise.allSettled([
      getPricesAndBalancesForChain(
        store.sourceChain.chainId,
        activeWallet.address,
        "source",
      ),
      getPricesAndBalancesForChain(
        store.destinationChain.chainId,
        activeWallet.address,
        "destination",
      ),
    ]);

    console.log("Source chain fetch result:", sourceResult);
    console.log("Destination chain fetch result:", destinationResult);

    // Check if both operations succeeded
    const sourceSuccess =
      sourceResult.status === "fulfilled" && sourceResult.value;
    const destSuccess =
      destinationResult.status === "fulfilled" && destinationResult.value;

    return sourceSuccess && destSuccess;
  } catch (error) {
    console.error("Error fetching prices and balances:", error);
    return false;
  } finally {
    store.setTokensLoading(false);
  }
}

export async function getPricesAndBalancesForChain(
  chainId: number,
  userAddress: string,
  chainType: "source" | "destination" = "source",
): Promise<boolean> {
  try {
    console.log(
      `Starting balance and price fetch for ${chainType} chain (ID: ${chainId}), user: ${userAddress}`,
    );

    // 1. Get Chain Info
    const chain = getChainByChainId(chainId);
    if (!chain) {
      console.error(
        `Chain with ID ${chainId} not found for ${chainType} chain`,
      );
      return false;
    }
    const networkName = chain.alchemyNetworkName; // Use consistent network name

    // 2. Fetch Balances First
    let balanceData: TokenBalance[] | null = null;
    try {
      console.log(
        `Workspaceing balances for address ${userAddress} on ${chainType} chain (${networkName})`,
      );
      const balanceResponse = await evmTokenApi.getBalances({
        network: networkName,
        userAddress,
      });

      if (balanceResponse.error || !balanceResponse.data) {
        console.error(
          `Error fetching token balances for ${chainType} chain:`,
          balanceResponse.error,
        );
        // Update store with empty balances for this user/chain to clear old data
        useWeb3Store.getState().updateTokenBalances(chainId, userAddress, []);
        return false; // Indicate failure if balances can't be fetched
      }

      balanceData = balanceResponse.data;

      if (!balanceData || balanceData.length === 0) {
        console.log(
          `No token balances found for ${userAddress} on ${chainType} chain ${chainId}.`,
        );
        // Update store with empty balances
        useWeb3Store.getState().updateTokenBalances(chainId, userAddress, []);
        return true; // Successfully determined there are no balances
      }
      console.log(
        `Found ${balanceData.length} token balances for ${userAddress} on ${chainType} chain.`,
      );
    } catch (error) {
      console.error(`Error fetching balances for ${chainType} chain:`, error);
      // Update store with empty balances on error
      useWeb3Store.getState().updateTokenBalances(chainId, userAddress, []);
      return false;
    }

    // 3. Prepare Addresses for Price Fetching (Only those with balances)
    const addressesWithBalance = balanceData.map((balance) =>
      balance.contractAddress.toLowerCase(),
    );

    // Filter unique addresses in case the balance API returns duplicates (unlikely but safe)
    const uniqueAddresses = [...new Set(addressesWithBalance)];

    const tokenAddressesForPriceFetch: TokenAddressInfo[] = uniqueAddresses.map(
      (address) => ({
        network: networkName,
        address: address, // Ensure correct casing if API is sensitive, though usually lowercase is fine
      }),
    );

    console.log(
      `Workspaceing prices for ${tokenAddressesForPriceFetch.length} tokens with balances on ${chainType} chain`,
    );

    // 4. Fetch Prices in Batches
    const batchSize = 25;
    const batches: TokenAddressInfo[][] = [];
    for (let i = 0; i < tokenAddressesForPriceFetch.length; i += batchSize) {
      batches.push(tokenAddressesForPriceFetch.slice(i, i + batchSize));
    }

    const allFetchedPrices: TokenPriceResult[] = [];
    const batchPromises = batches.map(async (batch, i) => {
      try {
        console.log(
          `Processing price batch ${i + 1}/${batches.length} for ${chainType} chain`,
        );
        const response = await evmTokenApi.getTokenPrices({ addresses: batch });

        if (response.error || !response.data) {
          console.error(
            `Error fetching token prices batch ${i + 1} for ${chainType} chain:`,
            response.error,
          );
          return; // Skip this batch on error
        }

        // Add successfully fetched prices to the aggregate list
        allFetchedPrices.push(...response.data.data);
      } catch (error) {
        console.error(
          `Error in price batch ${i + 1} for ${chainType} chain:`,
          error,
        );
      }
    });

    // Wait for all price batches to complete
    await Promise.all(batchPromises);
    console.log(
      `All price batches processed for ${chainType} chain. Fetched ${allFetchedPrices.length} prices.`,
    );

    // 5. Update Token Prices in the Store
    if (allFetchedPrices.length > 0) {
      // Get the latest state before updating to potentially avoid race conditions
      // Although less critical now as balance processing waits for prices
      useWeb3Store.getState().updateTokenPrices(allFetchedPrices);
      console.log(
        `Updated ${allFetchedPrices.length} token prices in the store for ${chainType} chain.`,
      );
    }

    // 6. Process Balances (using fetched prices)
    // Get potentially updated token info from the store (which now includes latest prices)
    const updatedTokens = useWeb3Store.getState().getTokensForChain(chainId);
    const tokensByAddress: Record<string, Token> = {};
    updatedTokens.forEach((token) => {
      tokensByAddress[token.address.toLowerCase()] = token;
    });

    const processedBalances = balanceData.map((balance) => {
      const tokenAddress = balance.contractAddress.toLowerCase();
      const token = tokensByAddress[tokenAddress]; // Get token info (includes price)

      if (token && token.decimals !== undefined) {
        const formattedBalance = formatTokenBalance(
          balance.tokenBalance,
          token.decimals,
        );

        let balanceUsd: string | undefined = undefined;
        // Use the price fetched and stored in the token object
        if (token.priceUsd) {
          try {
            const numBalance = parseFloat(formattedBalance);
            // Ensure price is treated as a number
            const price =
              typeof token.priceUsd === "string"
                ? parseFloat(token.priceUsd)
                : token.priceUsd;
            if (!isNaN(numBalance) && !isNaN(price)) {
              balanceUsd = (numBalance * price).toFixed(2);
            } else {
              console.warn(
                `Invalid number for USD calculation: balance=${formattedBalance}, price=${token.priceUsd} for token ${token.ticker || tokenAddress}`,
              );
            }
          } catch (e) {
            console.error(
              `Error calculating USD balance for ${token.ticker || tokenAddress} on ${chainType} chain:`,
              e,
            );
          }
        } else {
          // Log if price is missing after attempting to fetch it
          console.warn(
            `Price missing for token ${token.ticker || tokenAddress} (address: ${tokenAddress}) on ${chainType} chain after fetch.`,
          );
        }

        return {
          ...balance, // Spread original balance data
          tokenBalance: formattedBalance, // Overwrite with formatted balance
          balanceUsd, // Add calculated USD value
        };
      } else {
        // Handle cases where token info might be missing in the store
        // or decimals are somehow undefined
        console.warn(
          `Token info or decimals missing for address ${tokenAddress} on chain ${chainId}. Cannot format balance or calculate USD value.`,
        );
        return {
          ...balance, // Return original balance data
          tokenBalance: balance.tokenBalance, // Keep raw balance
          balanceUsd: undefined,
        };
      }
    });

    // 7. Update Token Balances in the Store
    // Get the latest state before updating to avoid race conditions
    useWeb3Store
      .getState()
      .updateTokenBalances(chainId, userAddress, processedBalances);
    console.log(
      `Updated ${processedBalances.length} processed token balances in the store for user ${userAddress} on ${chainType} chain ${chainId}.`,
    );

    console.log(
      `Successfully completed fetch for ${chainType} chain (ID: ${chainId})`,
    );
    return true;
  } catch (error) {
    console.error(
      `Unhandled error fetching prices and balances for ${chainType} chain ${chainId}:`,
      error,
    );
    return false;
  }
}

/**
 * Fetches token metadata for a specific token address and chain
 * @param chainId The chain ID where the token contract exists
 * @param contractAddress The token contract address
 * @returns Promise resolving to the token metadata or null if an error occurs
 */
export async function getTokenMetadata(
  chainId: number,
  contractAddress: string,
): Promise<TokenMetadata | null> {
  try {
    console.log(
      `Fetching token metadata for ${contractAddress} on chain ID ${chainId}`,
    );

    // Get chain info
    const chain = getChainByChainId(chainId);
    if (!chain) {
      console.error(`Chain with ID ${chainId} not found for token metadata`);
      return null;
    }

    // Prepare and send the request
    const response = await evmTokenApi.getTokenMetadata({
      network: chain.alchemyNetworkName,
      contractAddress,
    });

    // Handle errors
    if (response.error || !response.data) {
      console.error(`Error fetching token metadata:`, response.error);
      return null;
    }

    console.log(
      `Successfully fetched metadata for ${contractAddress} on chain ${chainId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching token metadata:`, error);
    return null;
  }
}
