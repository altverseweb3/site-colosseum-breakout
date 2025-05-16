// approveTokenForVault.js
// Approves tokens for vault deposits

import * as ethers from "ethers";
import {
  ERC20_ABI,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
} from "./vaultDepositHelper";
import { VAULT_ID_TO_ADDRESS } from "./mapping";
import {
  getOptimizedGasSettings,
  getResetAllowanceGasSettings,
  TransactionType,
  TransactionUrgency,
} from "./gasStrategy";

/**
 * Approves a token for deposit in a vault's teller contract.
 * Works for any asset selected in the vault's dropdown.
 *
 * @param {ethers.BrowserProvider} provider - The Ethereum provider
 * @param {string} tokenId - The token ID (e.g., "weth", "usdc", "eigen", etc.)
 * @param {number} vaultId - The vault ID
 * @param {string} amount - The amount to approve as a string (e.g., "0.1")
 * @returns {Promise<{success: boolean, message: string, hash?: string}>}
 */
export async function approveTokenForVault(provider, tokenId, vaultId, amount) {
  try {
    console.log(
      `Approving ${tokenId.toUpperCase()} for vault #${vaultId} with amount ${amount}`,
    );

    // Get signer and addresses
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    const tokenAddress = TOKEN_ADDRESSES[tokenId];
    const vaultAddress = VAULT_ID_TO_ADDRESS[vaultId]; // Use vault address for approval, not teller

    if (!tokenAddress) {
      return { success: false, message: `Token ${tokenId} not supported` };
    }

    if (!vaultAddress) {
      return { success: false, message: `Vault ID ${vaultId} not found` };
    }

    console.log(
      `Using vault address for approval: ${vaultAddress} (Vault #${vaultId})`,
    ); // Log for clarity

    // Get token decimals and parse amount
    const decimals = TOKEN_DECIMALS[tokenId] || 18;
    const approveAmount = ethers.parseUnits(amount, decimals);

    // Create token contract instance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    // Check user's balance
    const balance = await tokenContract.balanceOf(signerAddress);
    console.log(
      `Current balance: ${ethers.formatUnits(balance, decimals)} ${tokenId}`,
    );

    if (balance < approveAmount) {
      return {
        success: false,
        message: `Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${tokenId.toUpperCase()}`,
      };
    }

    // Check current allowance
    const currentAllowance = await tokenContract.allowance(
      signerAddress,
      vaultAddress,
    );
    console.log(
      `Current allowance: ${ethers.formatUnits(currentAllowance, decimals)} ${tokenId.toUpperCase()}`,
    );

    // If already approved for at least this amount, return success
    if (currentAllowance >= approveAmount) {
      return {
        success: true,
        message: `${tokenId.toUpperCase()} already approved for vault`,
      };
    }

    // Reset allowance to zero first to avoid potential issues with some tokens
    if (currentAllowance > BigInt(0)) {
      console.log(
        `Resetting existing allowance of ${ethers.formatUnits(currentAllowance, decimals)} to zero first`,
      );

      // Get optimized gas settings for allowance reset (medium urgency is fine for resets)
      const resetGasSettings = await getResetAllowanceGasSettings(
        provider,
        TransactionUrgency.MEDIUM,
      );

      const resetTx = await tokenContract.approve(
        vaultAddress,
        BigInt(0),
        resetGasSettings,
      );

      console.log(`Reset approval transaction sent with hash: ${resetTx.hash}`);

      // Wait for reset approval to confirm
      const resetReceipt = await resetTx.wait();
      console.log(
        `Reset approval confirmed in block ${resetReceipt.blockNumber}`,
      );

      // Add a small delay after resetting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Approve the exact amount (not unlimited)
    console.log(`Approving exact amount: ${amount} ${tokenId.toUpperCase()}`);

    // Get optimized gas settings for token approval (medium-high urgency)
    const approvalGasSettings = await getOptimizedGasSettings(
      provider,
      TransactionType.APPROVAL,
      TransactionUrgency.MEDIUM,
    );

    const approveTx = await tokenContract.approve(
      vaultAddress,
      approveAmount,
      approvalGasSettings,
    );

    console.log(`Approval transaction sent with hash: ${approveTx.hash}`);

    // Wait for approval to confirm
    const approveReceipt = await approveTx.wait();
    console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);

    // Verify new allowance
    const newAllowance = await tokenContract.allowance(
      signerAddress,
      vaultAddress,
    );
    console.log(
      `New allowance: ${ethers.formatUnits(newAllowance, decimals)} ${tokenId.toUpperCase()}`,
    );

    return {
      success: true,
      message: `${tokenId.toUpperCase()} approved for vault`,
      hash: approveTx.hash,
    };
  } catch (error) {
    console.error("Token approval error:", error);

    // Provide a user-friendly error message
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: `Approval failed: ${errorMessage}`,
    };
  }
}
