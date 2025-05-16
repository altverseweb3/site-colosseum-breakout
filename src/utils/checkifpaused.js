// @ts-nocheck
// src/utils/checkifpaused.js
import * as ethers from "ethers";
import { VAULT_ID_TO_TELLER } from "./mapping";

// Simplify the ABI to reduce potential errors
const TELLER_PAUSED_ABI = [
  "function isPaused() view returns (bool)",
  "function paused() view returns (bool)"
];

/**
 * Checks if a specific vault is accepting deposits
 * @param {number} vaultId - The ID of the vault to check
 * @param {ethers.Provider} provider - Any ethers provider
 * @returns {Promise<boolean>} - True if the vault is accepting deposits, false otherwise
 */
export async function isVaultAcceptingDeposits(vaultId, provider) {
  try {
    // Get the teller address for this vault
    const tellerAddress = VAULT_ID_TO_TELLER[vaultId];
    if (!tellerAddress) {
      console.error(`Teller address not found for vault ID ${vaultId}`);
      return false; // Consider it not accepting deposits if we can't find the teller
    }

    // Create contract instance
    const tellerContract = new ethers.Contract(
      tellerAddress,
      TELLER_PAUSED_ABI,
      provider
    );

    // Check different paused functions since contracts might have different function names
    let isPaused = false;
    
    // Try isPaused() first
    try {
      isPaused = await tellerContract.isPaused();
      console.log(`Vault ${vaultId} isPaused() result:`, isPaused);
      // If we got here, function exists and we have a result
    } catch (error) {
      // If isPaused() fails, try paused() function
      try {
        isPaused = await tellerContract.paused();
        console.log(`Vault ${vaultId} paused() result:`, isPaused);
      } catch (error2) {
        console.log(`Note: Vault ${vaultId} has neither isPaused() nor paused() functions.`);
        // For safety, if we can't determine pause status, assume it's not paused
        isPaused = false;
      }
    }
    
    // No special case for Liquid Move ETH - use the actual on-chain status
    // Log this vault with special attention if it's Liquid Move ETH
    if (vaultId === 6) {
      console.log(`Vault ${vaultId} (Liquid Move ETH) actual paused status:`, isPaused);
    }

    // Simply assume all vaults are active if they're not paused
    const isActive = true;

    // Return the final status - accepting deposits if not paused AND active
    return !isPaused && isActive;
  } catch (error) {
    console.error(`Error checking if vault ${vaultId} is accepting deposits:`, error);
    return false; // Consider it not accepting deposits if there's an error
  }
}

/**
 * Checks the deposit status of all vaults
 * @param {ethers.Provider} provider - Any ethers provider
 * @returns {Promise<Record<number, boolean>>} - Object mapping vault IDs to whether they accept deposits
 */
export async function checkAllVaultsDepositStatus(provider) {
  try {
    const depositStatus = {};
    
    // Use Object.keys to get vault IDs as strings
    const vaultIds = Object.keys(VAULT_ID_TO_TELLER);
    
    // Check each vault in parallel
    const promises = vaultIds.map(async (id) => {
      const numericId = Number(id);
      depositStatus[numericId] = await isVaultAcceptingDeposits(numericId, provider);
    });
    
    await Promise.all(promises);
    
    return depositStatus;
  } catch (error) {
    console.error("Error checking all vaults deposit status:", error);
    return {}; // Return empty object on error
  }
}