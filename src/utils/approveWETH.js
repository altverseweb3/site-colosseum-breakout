// approve_weth.js
// Approves the teller contract to spend our WETH

import * as dotenv from "dotenv";
import * as ethers from "ethers";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Contract addresses
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const TELLER_ADDRESS = "0x99dE9e5a3eC2750a6983C8732E6e795A35e7B861";

  // ERC20 ABI for approve, allowance, and balanceOf
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
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  console.log(`Wallet address: ${wallet.address}`);

  // Create WETH contract instance
  const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);

  // Check current allowance
  const currentAllowance = await wethContract.allowance(
    wallet.address,
    TELLER_ADDRESS,
  );
  console.log(
    `Current allowance: ${ethers.formatEther(currentAllowance)} WETH`,
  );

  // Check WETH balance
  const wethBalance = await wethContract.balanceOf(wallet.address);
  console.log(`WETH balance: ${ethers.formatEther(wethBalance)} WETH`);

  // First set allowance to 0 to avoid any potential issues
  console.log("\nSetting allowance to 0 first...");
  const resetTx = await wethContract.approve(TELLER_ADDRESS, 0, {
    maxFeePerGas: ethers.parseUnits("10", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    gasLimit: 60000,
  });

  console.log(`Reset transaction sent: ${resetTx.hash}`);
  await resetTx.wait();
  console.log("Reset transaction confirmed");

  // Now set a new allowance (use a very high value to avoid future approvals)
  console.log("\nSetting new allowance...");

  // First try with max uint256 approval
  try {
    const approveTx = await wethContract.approve(
      TELLER_ADDRESS,
      ethers.MaxUint256,
      {
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        gasLimit: 60000,
      },
    );

    console.log(`Approval transaction sent: ${approveTx.hash}`);
    const receipt = await approveTx.wait();
    console.log(`Approval confirmed in block ${receipt.blockNumber}`);
  } catch (error) {
    console.error("Error with max approval:", error.message);

    // Try with a more modest approval instead
    try {
      const approveTx = await wethContract.approve(
        TELLER_ADDRESS,
        ethers.parseEther("1"),
        {
          maxFeePerGas: ethers.parseUnits("10", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
          gasLimit: 60000,
        },
      );

      console.log(`Approval transaction sent: ${approveTx.hash}`);
      const receipt = await approveTx.wait();
      console.log(`Approval confirmed in block ${receipt.blockNumber}`);
    } catch (secondError) {
      console.error(
        "Error with smaller approval as well:",
        secondError.message,
      );
    }
  }

  // Check new allowance
  const newAllowance = await wethContract.allowance(
    wallet.address,
    TELLER_ADDRESS,
  );
  console.log(`\nNew allowance: ${ethers.formatEther(newAllowance)} WETH`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
