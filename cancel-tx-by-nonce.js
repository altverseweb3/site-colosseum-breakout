// cancel-tx-by-nonce.js - Script to cancel a transaction by directly using its nonce
// Run with: node cancel-tx-by-nonce.js

const { ethers } = require("ethers");

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);

    stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function main() {
  try {
    console.log("=== Transaction Cancellation Tool (By Nonce) ===");

    // Get wallet details
    const WALLET_ADDRESS = await prompt("Enter your wallet address: ");
    const PRIVATE_KEY = await prompt("Enter your private key: ");

    // Get the nonce to be used for cancellation
    const txNonce = parseInt(
      await prompt("Enter the nonce of the transaction to cancel: "),
      10,
    );
    if (isNaN(txNonce)) {
      console.error("Error: Invalid nonce. Please enter a number.");
      return;
    }

    // Set up provider with Infura endpoint
    console.log("\nConnecting to Ethereum network via Infura...");
    const provider = new ethers.JsonRpcProvider(
      "https://mainnet.infura.io/v3/049bdd15053e47b29fa15e2cc4c6abe2",
    );

    // Create a wallet instance
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Verify wallet address
    const connectedAddress = await wallet.getAddress();
    if (connectedAddress.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
      console.error(
        `Error: The private key provided does not match the wallet address.`,
      );
      return;
    }

    console.log(`Connected successfully with wallet: ${connectedAddress}`);

    // Get current pending nonce
    const currentNonce = await provider.getTransactionCount(
      connectedAddress,
      "pending",
    );
    console.log(`Current pending nonce: ${currentNonce}`);

    if (txNonce >= currentNonce) {
      console.log(
        `Warning: The nonce ${txNonce} is not in the past. Current pending nonce is ${currentNonce}.`,
      );
      console.log(
        "This suggests the transaction may not exist or has already been processed.",
      );

      const proceed = await prompt("Do you still want to proceed? (y/n): ");
      if (proceed.toLowerCase() !== "y" && proceed.toLowerCase() !== "yes") {
        console.log("Cancellation aborted by user.");
        return;
      }
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei");

    // Calculate cancellation gas price (use a much higher price to ensure it gets mined)
    const cancelGasPrice = (currentGasPrice * BigInt(200)) / BigInt(100); // 2x current price

    console.log("\nCancellation Transaction Parameters:");
    console.log(` - Nonce: ${txNonce}`);
    console.log(
      ` - Current Gas Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`,
    );
    console.log(
      ` - Cancellation Gas Price: ${ethers.formatUnits(cancelGasPrice, "gwei")} gwei`,
    );

    // Confirm before sending
    const confirm = await prompt("\nSend cancellation transaction? (y/n): ");
    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      console.log("Cancellation aborted by user.");
      return;
    }

    // Send 0 ETH to self with the same nonce but higher gas price
    console.log("\nSending cancellation transaction...");
    const cancelTx = await wallet.sendTransaction({
      to: connectedAddress, // self-transfer
      value: 0, // 0 ETH
      nonce: txNonce, // use the specified nonce
      gasPrice: cancelGasPrice,
      gasLimit: 21000, // minimum required for a simple transfer
    });

    console.log(`\nCancellation transaction sent!`);
    console.log(`Transaction Hash: ${cancelTx.hash}`);
    console.log(
      `Track it on Etherscan: https://etherscan.io/tx/${cancelTx.hash}`,
    );

    // Wait for the transaction to be mined
    console.log("\nWaiting for transaction to be mined...");
    const receipt = await cancelTx.wait();

    console.log(`\nTransaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Status: ${receipt.status === 1 ? "Success" : "Failed"}`);

    if (receipt.status === 1) {
      console.log(
        "\nThe stuck transaction has been successfully cancelled! 🎉",
      );
    } else {
      console.log(
        "\nCancellation transaction was mined but failed. This is unexpected for a simple transfer.",
      );
    }
  } catch (error) {
    console.error("\nError:", error.message);

    if (
      error.message &&
      error.message.includes("nonce has already been used")
    ) {
      console.log("\nGood news! The nonce has already been used, which means:");
      console.log("1. The original transaction was already processed");
      console.log("2. Another cancellation transaction was already successful");
      console.log("3. The nonce was used by a different transaction");
    }

    if (
      error.message &&
      error.message.includes("replacement transaction underpriced")
    ) {
      console.log(
        "\nError: The cancellation gas price is too low compared to the original transaction.",
      );
      console.log(
        "Try again with an even higher gas price multiplier (e.g., 3x or 4x).",
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
