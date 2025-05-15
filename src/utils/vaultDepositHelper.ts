// src/utils/vaultDepositHelper.ts
import * as ethers from "ethers";
import { VAULT_ID_TO_TELLER, VAULT_ID_TO_ADDRESS } from "./mapping";
import {
  getOptimizedGasSettings,
  TransactionType,
  TransactionUrgency,
} from "./gasStrategy";

// Token addresses (Ethereum mainnet)
export const TOKEN_ADDRESSES: Record<string, string> = {
  // ETH tokens
  eth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // Native ETH uses same address as wETH
  weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  eeth: "0x35fa164735182de50811e8e2e824cfb9b6118ac2",
  weeth: "0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee",
  steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // Lido stETH
  wsteth: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // Lido wrapped stETH

  // BTC tokens
  lbtc: "0x8236a87084f8b84306f72007f36f2618a5634494",
  wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  cbbtc: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
  ebtc: "0xc03baf251b19280b02df5e795228eb1f10567f1a",

  // USD tokens
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
  usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  usde: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3",
  deusd: "0xd05ad4e8d518a65ab55cfc28f14ee34e0e5f7ac5",
  sdeusd: "0x5bE26527e817998A7206475596bF52cD5FE11733",

  // Other tokens
  eigen: "0x8a7dc00bbf63f01d63541a76c3c77cf23dec899d",
  sui: "0x84074EA631dEc7a4edcD5303dEc14EDcB89B1Afe",
  solana: "0xD31a59c85aE9D8edEFeC411D448f90841571b89c",
};

// Token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  eth: 18,
  weth: 18,
  eeth: 18,
  weeth: 18,
  steth: 18,
  wsteth: 18,
  lbtc: 8,
  wbtc: 8,
  cbbtc: 8,
  ebtc: 8,
  usdc: 6,
  dai: 18,
  usdt: 6,
  usde: 6,
  deusd: 6,
  sdeusd: 6,
  eigen: 18,
  sui: 18,
  solana: 18,
};

// Minimum deposit amounts by category - removed all minimum requirements
// export const MIN_DEPOSIT_AMOUNTS: Record<string, string> = {
//   eth: "0.004",
//   weth: "0.004",
//   eeth: "0.004",
//   weeth: "0.004",
//   steth: "0.004",
//   wsteth: "0.004",
//   lbtc: "0.000095",
//   wbtc: "0.000095",
//   cbbtc: "0.000095",
//   ebtc: "0.000095",
//   usdc: "10",
//   dai: "10",
//   usdt: "10",
//   usde: "10",
//   deusd: "10",
//   sdeusd: "10",
//   eigen: "1",
//   sui: "1",
//   solana: "1",
// };

// ERC20 ABI (minimal version for approvals)
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

// Teller ABI for deposits
export const TELLER_ABI = [
  {
    inputs: [
      { name: "depositAsset", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "minimumMint", type: "uint256" },
    ],
    name: "deposit",
    outputs: [{ name: "mintedAmount", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

// Create a wETH-specific deposit function that matches the working script's approach exactly
export async function depositToVaultSimple(
  provider: ethers.BrowserProvider,
  tokenId: string,
  vaultId: number,
  amount: string,
): Promise<{
  success: boolean;
  message: string;
  hash?: string;
}> {
  try {
    console.log(
      `Attempting deposit with direct ETH method for tokenId:${tokenId}, vaultId:${vaultId}`,
    );
    const signer = await provider.getSigner();
    const tokenAddress = TOKEN_ADDRESSES[tokenId];
    const tellerAddress =
      VAULT_ID_TO_TELLER[vaultId as keyof typeof VAULT_ID_TO_TELLER];
    const vaultAddress =
      VAULT_ID_TO_ADDRESS[vaultId as keyof typeof VAULT_ID_TO_ADDRESS];
    const decimals = TOKEN_DECIMALS[tokenId] || 18;
    const depositAmount = ethers.parseUnits(amount, decimals);

    console.log(
      `Using addresses - token:${tokenAddress}, teller:${tellerAddress}, vault:${vaultAddress}`,
    );

    // Create contract instances
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tellerContract = new ethers.Contract(
      tellerAddress,
      TELLER_ABI,
      signer,
    );

    // First check token balance
    const signerAddress = await signer.getAddress();
    const balance = await tokenContract.balanceOf(signerAddress);
    console.log(
      `Current balance: ${ethers.formatUnits(balance, decimals)} ${tokenId}`,
    );
    if (balance < depositAmount) {
      return {
        success: false,
        message: `Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${tokenId.toUpperCase()}`,
      };
    }

    // Check allowance (check against vault address, not teller)
    const allowance = await tokenContract.allowance(
      signerAddress,
      vaultAddress,
    );
    console.log(
      `Current allowance: ${ethers.formatUnits(allowance, decimals)} ${tokenId}`,
    );

    // If allowance is not enough, approval needs to be done separately
    // This function should not handle approvals anymore since we use a separate approval button
    if (allowance < depositAmount) {
      return {
        success: false,
        message: `Insufficient allowance. Please approve ${tokenId.toUpperCase()} first.`,
      };
    }

    console.log(`Sufficient allowance verified for the vault ${vaultId}`);

    // Try to execute deposit with maximum gas limit and very basic parameters
    console.log(
      `Executing deposit with amount: ${ethers.formatUnits(depositAmount, decimals)} ${tokenId}...`,
    );

    // Get optimized gas settings for deposit (using high urgency for more reliable deposits)
    const gasSettings = await getOptimizedGasSettings(
      provider,
      TransactionType.DEPOSIT,
      TransactionUrgency.HIGH,
    );

    // Log detailed information just before the transaction
    console.log(`DETAILED DEPOSIT INFO:`, {
      tokenId,
      vaultId,
      tokenContractAddress: tokenAddress,
      tellerContractAddress: tellerAddress,
      depositAmount: depositAmount.toString(),
      formattedAmount: ethers.formatUnits(depositAmount, decimals),
      signerAddress: signerAddress,
    });

    // Using optimized gas settings
    const tx = await tellerContract.deposit(
      tokenAddress, // This is correct - tokenAddress is the first parameter for the teller's deposit function
      depositAmount,
      0, // min mint
      gasSettings,
    );

    console.log(`Deposit transaction sent with hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log("Deposit transaction successful!");

    return {
      success: true,
      message: "Deposit successful",
      hash: receipt.hash,
    };
  } catch (error) {
    console.error("Deposit error:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
      });
    }

    // These properties might exist on ethers error objects
    const ethersError = error as { transaction?: unknown; receipt?: unknown };
    if (ethersError.transaction)
      console.error("Failed transaction:", ethersError.transaction);
    if (ethersError.receipt)
      console.error("Transaction receipt:", ethersError.receipt);

    // Provide a user-friendly error message
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("CALL_EXCEPTION")) {
        errorMessage =
          "The contract rejected the transaction. The vault may not accept this deposit at this time.";
      } else if (error.message.includes("transfer")) {
        errorMessage =
          "Token transfer failed. Make sure you have enough tokens and have approved the contract.";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: `Deposit failed: ${errorMessage}`,
    };
  }
}

// Original deposit function
export async function depositToVault(
  provider: ethers.BrowserProvider,
  tokenId: string,
  vaultId: number,
  amount: string,
): Promise<{
  success: boolean;
  message: string;
  hash?: string;
}> {
  try {
    // Check inputs
    if (!provider) {
      return { success: false, message: "No provider available" };
    }

    const tokenAddress = TOKEN_ADDRESSES[tokenId];
    if (!tokenAddress) {
      return { success: false, message: `Token ${tokenId} not supported` };
    }

    const tellerAddress =
      VAULT_ID_TO_TELLER[vaultId as keyof typeof VAULT_ID_TO_TELLER];
    if (!tellerAddress) {
      return { success: false, message: `Vault ID ${vaultId} not found` };
    }

    // Get decimals for the token (default to 18 if not found)
    const decimals = TOKEN_DECIMALS[tokenId] || 18;

    // Minimum deposit amounts have been removed
    // No minimum deposit check required

    // Parse amount with correct decimals
    const depositAmount = ethers.parseUnits(amount, decimals);

    // Get signer
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    // Get vault address for approval check
    const vaultAddress =
      VAULT_ID_TO_ADDRESS[vaultId as keyof typeof VAULT_ID_TO_ADDRESS];
    if (!vaultAddress) {
      return {
        success: false,
        message: `Vault address not found for ID ${vaultId}`,
      };
    }

    console.log(
      `Using addresses - token:${tokenAddress}, teller:${tellerAddress}, vault:${vaultAddress}`,
    );

    // Create contract instances
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tellerContract = new ethers.Contract(
      tellerAddress,
      TELLER_ABI,
      signer,
    );

    // Check user's balance
    const balance = await tokenContract.balanceOf(signerAddress);
    if (balance < depositAmount) {
      return {
        success: false,
        message: `Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${tokenId.toUpperCase()}`,
      };
    }

    // Check allowance against the vault address (not the teller)
    const allowance = await tokenContract.allowance(
      signerAddress,
      vaultAddress,
    );

    console.log(
      `Current allowance for vault: ${ethers.formatUnits(allowance, decimals)} ${tokenId.toUpperCase()}`,
    );

    // If allowance is not enough, return an error message
    if (allowance < depositAmount) {
      return {
        success: false,
        message: `Insufficient allowance. Please approve ${tokenId.toUpperCase()} for the vault first.`,
      };
    }

    console.log(`Sufficient allowance verified for vault ${vaultId}`);

    // Small delay to ensure chain state is consistent
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Log transaction details before executing
    console.log(`Deposit details:`, {
      tokenAddress,
      amount: ethers.formatUnits(depositAmount, TOKEN_DECIMALS[tokenId] || 18),
      vault: tellerAddress,
    });

    // Execute deposit with simplified parameters for debugging
    console.log(`Executing deposit at tellerAddress:`, tellerAddress);

    // Execute the deposit transaction with optimized gas parameters
    console.log(`Exact deposit parameters:`, {
      tellerAddress,
      tokenAddress,
      depositAmount: depositAmount.toString(),
      vaultId,
    });

    // Get optimized gas settings for deposit transaction
    const gasSettings = await getOptimizedGasSettings(
      provider,
      TransactionType.DEPOSIT,
      TransactionUrgency.MEDIUM, // Use medium urgency for regular deposits
    );

    // Debug log
    console.log(`Exact deposit details:`, {
      tokenAddress,
      depositAmount: depositAmount.toString(),
      vaultId,
      tokenId,
    });

    // Double-check allowance one more time right before deposit
    const finalAllowance = await tokenContract.allowance(
      signerAddress,
      vaultAddress,
    );
    console.log(
      `Final allowance check before deposit: ${ethers.formatUnits(finalAllowance, decimals)} ${tokenId.toUpperCase()}`,
    );

    if (finalAllowance < depositAmount) {
      console.error(
        `Allowance insufficient at deposit time: ${ethers.formatUnits(finalAllowance, decimals)} < ${ethers.formatUnits(depositAmount, decimals)}`,
      );
      return {
        success: false,
        message: "Allowance issue detected. Please try approving again.",
      };
    }

    // All checks passed, proceed with deposit
    console.log(`Proceeding with deposit transaction...`);

    // Log parameters for debugging
    console.log(
      `Deposit parameters exactly matching solodepositLiquidETH.js:`,
      {
        tokenAddress,
        depositAmount: depositAmount.toString(),
        tellerAddress,
      },
    );

    // Use the optimized gas settings we obtained earlier
    const tx = await tellerContract.deposit(
      tokenAddress,
      depositAmount,
      0, // Min mint amount (0 = accept any amount)
      gasSettings,
    );

    // Wait for receipt
    const receiptData = await tx.wait();

    return {
      success: true,
      message: "Deposit successful",
      hash: receiptData.hash,
    };
  } catch (error) {
    console.error("Deposit error:", error);
    // Additional detailed error logging
    const ethersError = error as {
      code?: string;
      reason?: string;
      transaction?: unknown;
      receipt?: unknown;
      data?: unknown;
    };

    if (ethersError.code) console.error("Error code:", ethersError.code);
    if (ethersError.reason) console.error("Error reason:", ethersError.reason);
    if (ethersError.transaction)
      console.error("Error transaction:", ethersError.transaction);
    if (ethersError.receipt)
      console.error("Error receipt:", ethersError.receipt);
    if (ethersError.data) console.error("Error data:", ethersError.data);

    // Handle specific errors
    if (error instanceof Error) {
      console.log("Full error message:", error.message);

      // Check for allowance-related errors
      if (
        error.message.includes("TRANSFER_FROM_FAILED") ||
        error.message.includes("insufficient allowance")
      ) {
        return {
          success: false,
          message:
            "Token transfer failed. This could be due to insufficient allowance. Please try again.",
        };
      }

      // Check for slippage/price change errors
      if (
        error.message.includes("Slippage") ||
        error.message.includes("price impact too high")
      ) {
        return {
          success: false,
          message:
            "Price movement detected. Please try again with a fresh quote.",
        };
      }

      // Check for gas-related errors
      if (error.message.includes("gas") || error.message.includes("fee")) {
        return {
          success: false,
          message: "Transaction failed due to gas settings. Please try again.",
        };
      }

      // Check for CALL_EXCEPTION - common when contract function reverts
      if (error.message.includes("CALL_EXCEPTION")) {
        return {
          success: false,
          message:
            "The contract rejected the transaction. This usually means the contract's internal checks failed. Try with exactly 0.004 ETH.",
        };
      }
    }

    // Generic error with full details for debugging
    return {
      success: false,
      message: `Transaction failed: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please try again with a smaller amount or contact support.`,
    };
  }
}
