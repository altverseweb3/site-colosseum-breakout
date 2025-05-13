// gasStrategy.js
// Provides optimized gas pricing strategies for different transaction types

import * as ethers from "ethers";

/**
 * Transaction urgency levels
 */
export const TransactionUrgency = {
  LOW: "low", // Slower but cheaper
  MEDIUM: "medium", // Balanced approach
  HIGH: "high", // Faster but more expensive
  VERY_HIGH: "very_high", // For critical transactions
};

/**
 * Transaction types
 */
export const TransactionType = {
  APPROVAL: "approval", // Token approvals (typically cheaper)
  DEPOSIT: "deposit", // Vault deposits
  WITHDRAWAL: "withdrawal", // Withdrawals
  SWAP: "swap", // Token swaps
};

/**
 * Default gas limits by transaction type
 */
const DEFAULT_GAS_LIMITS = {
  [TransactionType.APPROVAL]: 90000, // Reduced from 150000
  [TransactionType.DEPOSIT]: 180000, // Reduced from 200000/700000
  [TransactionType.WITHDRAWAL]: 180000,
  [TransactionType.SWAP]: 250000,
  reset: 70000, // For resetting allowances
};

/**
 * Fee multipliers based on urgency
 * Each entry contains [maxFeeMultiplier, maxPriorityFeeMultiplier]
 */
const FEE_MULTIPLIERS = {
  [TransactionUrgency.LOW]: [1.01, 1.05],
  [TransactionUrgency.MEDIUM]: [1.05, 1.2],
  [TransactionUrgency.HIGH]: [1.1, 1.5],
  [TransactionUrgency.VERY_HIGH]: [1.2, 2.0],
};

/**
 * Fallback gas prices if network data isn't available
 * Each entry contains [maxFeePerGas, maxPriorityFeePerGas] in gwei
 */
const FALLBACK_GAS_PRICES = {
  [TransactionUrgency.LOW]: [8, 0.5],
  [TransactionUrgency.MEDIUM]: [10, 1],
  [TransactionUrgency.HIGH]: [15, 1.5],
  [TransactionUrgency.VERY_HIGH]: [20, 2],
};

/**
 * Gets optimized gas settings for a transaction
 *
 * @param {ethers.Provider} provider - Ethereum provider
 * @param {string} txType - Transaction type from TransactionType
 * @param {string} urgency - Transaction urgency from TransactionUrgency
 * @param {Object} options - Additional options like custom gas limit
 * @returns {Promise<{gasLimit: bigint, maxFeePerGas: bigint, maxPriorityFeePerGas: bigint, type: number}>}
 */
export async function getOptimizedGasSettings(
  provider,
  txType = TransactionType.DEPOSIT,
  urgency = TransactionUrgency.MEDIUM,
  options = {},
) {
  try {
    // 1. Get the latest gas price data from the network
    const feeData = await provider.getFeeData();

    // 2. Get multipliers based on urgency
    const [maxFeeMultiplier, priorityFeeMultiplier] =
      FEE_MULTIPLIERS[urgency] || FEE_MULTIPLIERS[TransactionUrgency.MEDIUM];

    // 3. Get fallback values based on urgency
    const [fallbackMaxFee, fallbackPriorityFee] =
      FALLBACK_GAS_PRICES[urgency] ||
      FALLBACK_GAS_PRICES[TransactionUrgency.MEDIUM];

    // 4. Calculate max fee per gas with multiplier
    const maxFeePerGas = feeData.maxFeePerGas
      ? ethers.toBigInt(
          Math.floor(
            Number(ethers.formatUnits(feeData.maxFeePerGas, "wei")) *
              maxFeeMultiplier,
          ),
        )
      : ethers.parseUnits(fallbackMaxFee.toString(), "gwei");

    // 5. Calculate max priority fee per gas with multiplier
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
      ? ethers.toBigInt(
          Math.floor(
            Number(ethers.formatUnits(feeData.maxPriorityFeePerGas, "wei")) *
              priorityFeeMultiplier,
          ),
        )
      : ethers.parseUnits(fallbackPriorityFee.toString(), "gwei");

    // 6. Determine appropriate gas limit based on transaction type
    const gasLimit =
      options.gasLimit ||
      ethers.toBigInt(
        DEFAULT_GAS_LIMITS[txType] ||
          DEFAULT_GAS_LIMITS[TransactionType.DEPOSIT],
      );

    // 7. Log the gas settings for debugging
    console.log(`Optimized gas settings (${txType}, ${urgency}):`, {
      maxFeePerGas: ethers.formatUnits(maxFeePerGas, "gwei") + " gwei",
      maxPriorityFeePerGas:
        ethers.formatUnits(maxPriorityFeePerGas, "gwei") + " gwei",
      gasLimit: gasLimit.toString(),
      estimatedCost: `~$${(
        Number(ethers.formatUnits(maxFeePerGas, "gwei")) *
        Number(gasLimit) *
        0.000000001 *
        2500
      ).toFixed(2)}`, // Rough ETH price estimate
    });

    // 8. Return the optimized gas settings
    return {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      type: 2, // EIP-1559 transaction type
    };
  } catch (error) {
    console.error("Error calculating optimized gas settings:", error);

    // Fallback to medium urgency defaults if there's an error
    const [fallbackMaxFee, fallbackPriorityFee] =
      FALLBACK_GAS_PRICES[TransactionUrgency.MEDIUM];
    const gasLimit =
      options.gasLimit ||
      ethers.toBigInt(
        DEFAULT_GAS_LIMITS[txType] ||
          DEFAULT_GAS_LIMITS[TransactionType.DEPOSIT],
      );

    return {
      gasLimit,
      maxFeePerGas: ethers.parseUnits(fallbackMaxFee.toString(), "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits(
        fallbackPriorityFee.toString(),
        "gwei",
      ),
      type: 2,
    };
  }
}

/**
 * Get optimized gas settings specifically for allowance reset
 */
export async function getResetAllowanceGasSettings(
  provider,
  urgency = TransactionUrgency.MEDIUM,
) {
  return getOptimizedGasSettings(provider, TransactionType.APPROVAL, urgency, {
    gasLimit: ethers.toBigInt(DEFAULT_GAS_LIMITS.reset),
  });
}
