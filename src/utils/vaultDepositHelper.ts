// src/utils/vaultDepositHelper.ts
import * as ethers from "ethers";
import { VAULT_ID_TO_TELLER } from "./mapping";

// Token addresses (Ethereum mainnet)
export const TOKEN_ADDRESSES: Record<string, string> = {
  // ETH tokens
  weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  eeth: "0x35fa164735182de50811e8e2e824cfb9b6118ac2",
  weeth: "0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee",

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
  weth: 18,
  eeth: 18,
  weeth: 18,
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

// Minimum deposit amounts by category
export const MIN_DEPOSIT_AMOUNTS: Record<string, string> = {
  weth: "0.004",
  eeth: "0.004",
  weeth: "0.004",
  lbtc: "0.000095",
  wbtc: "0.000095",
  cbbtc: "0.000095",
  ebtc: "0.000095",
  usdc: "10",
  dai: "10",
  usdt: "10",
  usde: "10",
  deusd: "10",
  sdeusd: "10",
  eigen: "1",
  sui: "1",
  solana: "1",
};

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
    const decimals = TOKEN_DECIMALS[tokenId] || 18;
    const depositAmount = ethers.parseUnits(amount, decimals);

    console.log(
      `Using addresses - token:${tokenAddress}, teller:${tellerAddress}`,
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

    // Check allowance
    const allowance = await tokenContract.allowance(
      signerAddress,
      tellerAddress,
    );
    console.log(
      `Current allowance: ${ethers.formatUnits(allowance, decimals)} ${tokenId}`,
    );

    // If allowance is not enough, approve tokens
    if (allowance < depositAmount) {
      console.log("Resetting allowance to zero first...");
      try {
        // First set allowance to 0
        const resetTx = await tokenContract.approve(tellerAddress, 0, {
          gasLimit: 100000,
        });
        await resetTx.wait();
        console.log("Allowance reset to zero");

        // Wait briefly
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.log("Error resetting allowance, continuing anyway:", error);
      }

      // Now set unlimited approval
      console.log("Setting unlimited approval...");
      const approveTx = await tokenContract.approve(
        tellerAddress,
        ethers.MaxUint256,
        { gasLimit: 100000 },
      );
      console.log(`Approval transaction sent with hash: ${approveTx.hash}`);
      const approveReceipt = await approveTx.wait();
      console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);

      // Verify allowance after approval
      const newAllowance = await tokenContract.allowance(
        signerAddress,
        tellerAddress,
      );
      console.log(
        `New allowance after approval: ${ethers.formatUnits(newAllowance, decimals)} ${tokenId}`,
      );

      // Wait a bit to ensure the approval is fully recognized
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Try to execute deposit with maximum gas limit and very basic parameters
    console.log(
      `Executing deposit with amount: ${ethers.formatUnits(depositAmount, decimals)} ${tokenId}...`,
    );

    // Using a simple transaction with higher gas
    const tx = await tellerContract.deposit(
      tokenAddress,
      depositAmount,
      0, // min mint
      {
        gasLimit: 700000, // Very high gas limit to ensure it has enough gas
      },
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

    // Check minimum deposit amount
    const minDepositAmount = MIN_DEPOSIT_AMOUNTS[tokenId] || "1";
    if (parseFloat(amount) < parseFloat(minDepositAmount)) {
      return {
        success: false,
        message: `Minimum deposit amount for ${tokenId} is ${minDepositAmount}`,
      };
    }

    // Parse amount with correct decimals
    const depositAmount = ethers.parseUnits(amount, decimals);

    // Get signer
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

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

    // Check allowance
    const allowance = await tokenContract.allowance(
      signerAddress,
      tellerAddress,
    );

    // If allowance is not enough, approve tokens
    if (allowance < depositAmount) {
      // Get latest gas price data from the network to avoid stuck transactions
      const approvalFeeData = await signer.provider.getFeeData();

      // Use higher gas settings to ensure approval succeeds
      // Apply higher multiplier to network values to ensure transaction goes through
      const maxFeePerGas = approvalFeeData.maxFeePerGas
        ? // Convert to number, add 50%, then convert back to BigInt (using Math.floor to avoid decimals)
          ethers.toBigInt(
            Math.floor(
              Number(ethers.formatUnits(approvalFeeData.maxFeePerGas, "wei")) *
                1.5,
            ),
          )
        : ethers.parseUnits("20", "gwei"); // Higher fallback

      const maxPriorityFeePerGas = approvalFeeData.maxPriorityFeePerGas
        ? // Add 50% to priority fee for faster inclusion
          ethers.toBigInt(
            Math.floor(
              Number(
                ethers.formatUnits(approvalFeeData.maxPriorityFeePerGas, "wei"),
              ) * 1.5,
            ),
          )
        : ethers.parseUnits("2", "gwei"); // Higher fallback

      // Use higher gas limit to ensure approval success
      const approvalGasLimit = 120000; // Higher gas limit for approval

      console.log(`Approving token spend with optimized EIP-1559 parameters:`, {
        tellerAddress,
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, "gwei"),
        maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, "gwei"),
        gasLimit: approvalGasLimit,
      });

      // IMPORTANT: For some ERC20 tokens, we must set allowance to 0 first
      // to avoid the ERC20 allowance race condition
      if (allowance > BigInt(0)) {
        console.log(
          `Resetting existing allowance of ${ethers.formatUnits(allowance, decimals)} to zero first`,
        );

        try {
          const resetTx = await tokenContract.approve(
            tellerAddress,
            BigInt(0),
            {
              gasLimit: approvalGasLimit,
              maxFeePerGas: maxFeePerGas,
              maxPriorityFeePerGas: maxPriorityFeePerGas,
              type: 2,
            },
          );

          console.log(
            `Reset approval transaction sent with hash: ${resetTx.hash}`,
          );

          // Wait for reset approval to confirm
          const resetReceipt = await resetTx.wait();
          console.log(
            `Reset approval confirmed in block ${resetReceipt.blockNumber}`,
          );

          // Add a small delay after resetting
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        } catch (error) {
          console.error("Error resetting allowance:", error);
          // Continue anyway, since not all tokens require this step
        }
      }

      // Use unlimited approval like in the working script
      console.log(
        `Approving max amount (unlimited) for ${tokenId.toUpperCase()}`,
      );

      const approveTx = await tokenContract.approve(
        tellerAddress,
        ethers.MaxUint256, // Use unlimited approval like the working script
        {
          gasLimit: 150000, // Higher gas limit for approval
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          type: 2, // Explicitly set transaction type to EIP-1559
        },
      );

      console.log(`Approval transaction sent with hash: ${approveTx.hash}`);

      // Wait for approval to confirm
      const approveReceipt = await approveTx.wait();
      console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);

      // Add a small delay to ensure the approval has time to be processed
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay
    }

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

    // Get latest gas price data from the network to avoid stuck transactions
    const depositFeeData = await signer.provider.getFeeData();

    // Use higher gas settings - prioritize transaction success over cost
    // Apply higher multiplier to network values to ensure transaction goes through
    const maxFeePerGas = depositFeeData.maxFeePerGas
      ? // Convert to number, add 50%, then convert back to BigInt (using Math.floor to avoid decimals)
        ethers.toBigInt(
          Math.floor(
            Number(ethers.formatUnits(depositFeeData.maxFeePerGas, "wei")) *
              1.5,
          ),
        )
      : ethers.parseUnits("20", "gwei"); // Higher fallback

    const maxPriorityFeePerGas = depositFeeData.maxPriorityFeePerGas
      ? // Add 50% to priority fee for faster inclusion
        ethers.toBigInt(
          Math.floor(
            Number(
              ethers.formatUnits(depositFeeData.maxPriorityFeePerGas, "wei"),
            ) * 1.5,
          ),
        )
      : ethers.parseUnits("2", "gwei"); // Higher fallback

    // Use higher gas limit to ensure transaction success
    const gasLimit = 600000; // Higher gas limit to ensure transaction success

    console.log(`Using optimized EIP-1559 parameters for deposit:`, {
      maxFeePerGas: ethers.formatUnits(maxFeePerGas, "gwei"),
      maxPriorityFeePerGas: ethers.formatUnits(maxPriorityFeePerGas, "gwei"),
      gasLimit: gasLimit,
      estimatedCost: `~$${(Number(ethers.formatUnits(maxFeePerGas, "gwei")) * gasLimit * 0.000000001 * 2500).toFixed(2)}`,
    });

    // Debug log
    console.log(`Exact deposit details:`, {
      tokenAddress,
      depositAmount: depositAmount.toString(),
      vaultId,
      tokenId,
    });

    // Check allowance one more time right before deposit
    const finalAllowance = await tokenContract.allowance(
      signerAddress,
      tellerAddress,
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
        message: "Allowance issue detected. Please try again in a moment.",
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

    // Use fixed high gas parameters like in the working script
    const tx = await tellerContract.deposit(
      tokenAddress,
      depositAmount,
      0, // Min mint amount (0 = accept any amount)
      {
        gasLimit: 500000, // Fixed high value to match working script
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        type: 2, // Explicitly set transaction type to EIP-1559
      },
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
