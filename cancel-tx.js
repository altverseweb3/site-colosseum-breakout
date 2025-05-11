// cancel-tx.js - Script to cancel a stuck transaction
// Run with: node cancel-tx.js

const { ethers } = require("ethers");

// The transaction hash to cancel
const STUCK_TX_HASH =
  "0xc204a69ac0b6cc861fcbfded4f599a524547d7351edfc1d2ed0caf3bc9be09c4";

// Your wallet credentials (you'll be prompted for these)
let WALLET_ADDRESS = "";
let PRIVATE_KEY = "";

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
    console.log("=== Transaction Cancellation Tool ===");
    console.log(`Transaction to cancel: ${STUCK_TX_HASH}`);

    // Get wallet details if not set
    WALLET_ADDRESS = await prompt("Enter your wallet address: ");
    PRIVATE_KEY = await prompt("Enter your private key: ");

    // Set up provider with your Infura endpoint
    console.log("\nConnecting to Ethereum network via Infura...");
    const provider = new ethers.JsonRpcProvider(
      "https://mainnet.infura.io/v3/049bdd15053e47b29fa15e2cc4c6abe2",
    );
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Check that the wallet address matches the private key
    const connectedAddress = await wallet.getAddress();
    if (connectedAddress.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
      console.error(
        `\nError: The private key does not match the provided wallet address.`,
      );
      console.error(`Private key address: ${connectedAddress}`);
      console.error(`Provided address: ${WALLET_ADDRESS}`);
      return;
    }

    console.log(`Connected with wallet: ${connectedAddress}`);

    // Get the transaction data
    console.log(`\nFetching transaction details for ${STUCK_TX_HASH}...`);
    const tx = await provider.getTransaction(STUCK_TX_HASH);

    if (!tx) {
      console.error(
        "Error: Transaction not found. Check the transaction hash.",
      );
      return;
    }

    console.log("Transaction found:");
    console.log(`- From: ${tx.from}`);
    console.log(`- To: ${tx.to}`);
    console.log(`- Nonce: ${tx.nonce}`);
    console.log(
      `- Gas Price: ${ethers.formatUnits(tx.gasPrice || "0", "gwei")} gwei`,
    );

    // Verify the transaction is from the given wallet
    if (tx.from.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
      console.error(`\nError: This transaction was not sent from your wallet.`);
      console.error(`Transaction from: ${tx.from}`);
      console.error(`Your wallet: ${WALLET_ADDRESS}`);
      return;
    }

    // Get the current gas price and increase it
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei");

    // Use 50% higher gas price than current or the original tx (whichever is higher)
    let cancelGasPrice;
    if (tx.gasPrice) {
      const originalGasPrice = tx.gasPrice;
      const increasedOriginalPrice =
        (originalGasPrice * BigInt(150)) / BigInt(100);
      const increasedCurrentPrice =
        (currentGasPrice * BigInt(150)) / BigInt(100);

      // Use the higher of the two
      cancelGasPrice =
        increasedOriginalPrice > increasedCurrentPrice
          ? increasedOriginalPrice
          : increasedCurrentPrice;
    } else {
      cancelGasPrice = (currentGasPrice * BigInt(150)) / BigInt(100);
    }

    console.log(`\nPreparing cancellation transaction:`);
    console.log(`- Nonce: ${tx.nonce}`);
    console.log(
      `- Original Gas Price: ${tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "Unknown"} gwei`,
    );
    console.log(
      `- Current Network Gas Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`,
    );
    console.log(
      `- Cancellation Gas Price: ${ethers.formatUnits(cancelGasPrice, "gwei")} gwei`,
    );

    // Ask for confirmation before proceeding
    const confirm = await prompt("\nProceed with cancellation? (y/n): ");

    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      console.log("Cancellation aborted by user.");
      return;
    }

    // Send a zero ETH transaction to yourself with the same nonce
    console.log("\nSending cancellation transaction...");

    // Create and send the cancellation transaction
    const cancelTx = await wallet.sendTransaction({
      to: WALLET_ADDRESS, // Send to yourself
      value: 0, // 0 ETH
      nonce: tx.nonce, // Same nonce as stuck tx
      gasPrice: cancelGasPrice, // Higher gas price
      gasLimit: 21000, // Minimum gas needed for a transfer
    });

    console.log(`\nCancellation transaction sent!`);
    console.log(`Transaction Hash: ${cancelTx.hash}`);
    console.log(
      `Track it on Etherscan: https://etherscan.io/tx/${cancelTx.hash}`,
    );

    console.log("\nWaiting for confirmation...");
    const receipt = await cancelTx.wait();

    console.log(`\nTransaction confirmed in block ${receipt.blockNumber}!`);
    console.log(`Status: ${receipt.status === 1 ? "Success ✓" : "Failed ✗"}`);

    if (receipt.status === 1) {
      console.log(
        "\nThe original transaction has been successfully cancelled! 🎉",
      );
    } else {
      console.log(
        "\nThe cancellation transaction failed. You may need to try again with a higher gas price.",
      );
    }
  } catch (error) {
    console.error("\nError:", error.message || error);

    if (
      error.message &&
      error.message.includes("nonce has already been used")
    ) {
      console.log(
        "\nGood news! The transaction with this nonce has already been processed.",
      );
      console.log("This means either:");
      console.log("1. The original transaction went through");
      console.log("2. You already successfully cancelled it");
      console.log("3. Another replacement transaction was successful");
    }
  } finally {
    process.exit(0);
  }
}

// Run the script
main().catch(console.error);
