// depositWETH_to_new_vault.js
// Script to deposit WETH into the new vault using provided contract addresses
// Usage: node depositWETH_to_new_vault.js <amountInEth>

import "dotenv/config";
import { ethers } from "ethers";

// Contract addresses specified by user
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const TELLER_ADDRESS = "0x9AA79C84b79816ab920bBcE20f8f74557B514734";
const VAULT_ADDRESS = "0xF0Bb20865277aBd641A307eCe5Ee04E79073416C";

// Environment setup
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Error: Please set RPC_URL and PRIVATE_KEY in a .env file");
  process.exit(1);
}

// Connect to provider
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract ABIs
const TELLER_ABI = [
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

const ERC20_ABI = [
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
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  // Parse command line arguments
  const amountEth = process.argv[2] || "0.001";

  // Convert amount to wei
  const amountWei = ethers.parseEther(amountEth);

  console.log(`Using wallet address: ${wallet.address}`);

  // Create contract instances
  const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);
  const teller = new ethers.Contract(TELLER_ADDRESS, TELLER_ABI, wallet);

  // Check ETH and WETH balances
  const ethBalance = await provider.getBalance(wallet.address);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  console.log(`ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`WETH balance: ${ethers.formatEther(wethBalance)} WETH`);

  // Check if we have enough WETH
  if (wethBalance < amountWei) {
    console.error(
      `Not enough WETH. Have ${ethers.formatEther(wethBalance)} WETH, need ${amountEth} WETH`,
    );
    process.exit(1);
  }

  // Check WETH allowance
  const allowance = await wethContract.allowance(
    wallet.address,
    TELLER_ADDRESS,
  );
  console.log(
    `Current WETH allowance for teller: ${ethers.formatEther(allowance)} WETH`,
  );

  // First approve WETH spending if needed
  if (allowance < amountWei) {
    console.log("\nNeed to approve WETH spending first");

    try {
      // Use a very large approval amount to avoid future approvals
      const approvalAmount = ethers.MaxUint256;

      // Send approval transaction
      const approveTx = await wethContract.approve(
        TELLER_ADDRESS,
        approvalAmount,
        {
          gasLimit: ethers.toBigInt(100000),
        },
      );

      console.log(`Approval transaction sent! Hash: ${approveTx.hash}`);
      console.log(
        `Track it on Etherscan: https://etherscan.io/tx/${approveTx.hash}`,
      );

      console.log("\nWaiting for approval to confirm...");
      const approveReceipt = await approveTx.wait();

      console.log(`Approval confirmed in block ${approveReceipt.blockNumber}!`);
      console.log(
        `Status: ${approveReceipt.status === 1 ? "Success" : "Failed"}`,
      );

      if (approveReceipt.status !== 1) {
        console.error(
          "Approval transaction failed. Cannot proceed with deposit.",
        );
        process.exit(1);
      }

      // Verify new allowance
      const newAllowance = await wethContract.allowance(
        wallet.address,
        TELLER_ADDRESS,
      );
      console.log(
        `New WETH allowance: ${ethers.formatEther(newAllowance)} WETH`,
      );
    } catch (error) {
      console.error("Error during approval:", error.message);
      process.exit(1);
    }
  } else {
    console.log(`WETH allowance is sufficient. No need for approval.`);
  }

  // Now proceed with deposit
  console.log(
    `\nDepositing ${amountEth} WETH into vault at ${VAULT_ADDRESS}...`,
  );

  try {
    // Get fee data for gas price
    const feeData = await provider.getFeeData();

    // Setup transaction parameters
    const txParams = {
      gasLimit: ethers.toBigInt(500000), // High gas limit for safety
      type: 2, // EIP-1559
    };

    // Add fee data if available
    if (feeData.maxFeePerGas) {
      txParams.maxFeePerGas = feeData.maxFeePerGas;
      txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    }

    console.log("Transaction parameters:");
    console.log(`- Amount: ${amountEth} WETH`);
    console.log(`- Gas limit: ${txParams.gasLimit.toString()}`);

    // Execute deposit transaction
    const depositTx = await teller.deposit(
      WETH_ADDRESS,
      amountWei,
      0,
      txParams,
    );

    console.log(`\nDeposit transaction sent! Hash: ${depositTx.hash}`);
    console.log(
      `Track it on Etherscan: https://etherscan.io/tx/${depositTx.hash}`,
    );

    // Wait for confirmation
    console.log("\nWaiting for confirmation...");

    try {
      const receipt = await depositTx.wait();

      console.log(`\nTransaction confirmed in block ${receipt.blockNumber}!`);
      console.log(`Status: ${receipt.status === 1 ? "Success ✓" : "Failed ✗"}`);

      // Show gas used
      console.log(`Gas used: ${receipt.gasUsed.toString()} units`);

      if (receipt.status === 1) {
        try {
          // Check vault token balance
          const vaultToken = new ethers.Contract(
            VAULT_ADDRESS,
            ERC20_ABI,
            provider,
          );
          const symbol = await vaultToken.symbol();
          const balance = await vaultToken.balanceOf(wallet.address);
          console.log(
            `\nCurrent ${symbol} balance: ${ethers.formatEther(balance)} ${symbol}`,
          );
        } catch (error) {
          console.error("Error checking vault token balance:", error.message);
        }
      } else {
        console.log(
          "\nDeposit failed. The transaction was processed but reverted on-chain.",
        );
        console.log(
          "This likely means the contract does not accept WETH deposits, despite the approvals working.",
        );
      }
    } catch (error) {
      console.log("Error waiting for confirmation:", error.message);

      // Check if transaction still succeeded despite error
      try {
        const receipt = await provider.getTransactionReceipt(depositTx.hash);
        if (receipt) {
          console.log(`Transaction processed in block ${receipt.blockNumber}`);
          console.log(`Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
        } else {
          console.log("Transaction may still be pending. Check status with:");
          console.log(`https://etherscan.io/tx/${depositTx.hash}`);
        }
      } catch {
        console.log("Could not check transaction receipt");
      }
    }
  } catch (error) {
    console.error("\nError during deposit:", error.message);

    if (error.message.includes("TRANSFER_FROM_FAILED")) {
      console.log('\nAnalysis: The "TRANSFER_FROM_FAILED" error suggests:');
      console.log(
        "1. The teller contract is explicitly blocking WETH transfers",
      );
      console.log("2. This is likely by design in the contract");
      console.log(
        "3. The approval succeeded but the deposit itself is restricted",
      );
      console.log(
        "\nRecommendation: Use native ETH instead of WETH for this vault",
      );
    }
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
