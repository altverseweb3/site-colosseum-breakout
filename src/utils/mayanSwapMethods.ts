// utils/mayanSwapMethods.ts
import {
  fetchQuote,
  Quote,
  swapFromEvm,
  swapFromSolana,
  addresses,
  SolanaTransactionSigner,
  createSwapFromSuiMoveCalls,
} from "@mayanfinance/swap-sdk";
import { Token, Chain } from "@/types/web3";
import { ethers, Overrides, JsonRpcSigner } from "ethers";
import { useAppKitProvider } from "@reown/appkit/react";
import { getSafeProvider, getSafeSolanaProvider } from "./providerUtils";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import { SignedTransaction } from "@mysten/wallet-standard";

interface ReferrerAddresses {
  evm?: string;
  solana?: string;
  sui?: string;
}

/**
 * Enhanced hook for accessing wallet providers and signers for both EVM and Solana
 * Returns appropriate providers and signing functions based on current wallet type
 */
export function useWalletProviderAndSigner() {
  // Get providers for both EVM and Solana namespaces
  const { walletProvider: evmProvider } = useAppKitProvider("eip155");
  const { walletProvider: solanaProvider } = useAppKitProvider("solana");

  /**
   * Get EVM signer from wallet provider
   */
  const getEvmSigner = async () => {
    if (!evmProvider) {
      console.error("No EVM wallet provider available from Reown");
      throw new Error("No EVM wallet provider available");
    }

    try {
      const safeProvider = getSafeProvider(evmProvider);

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(safeProvider);
      return await ethersProvider.getSigner();
    } catch (error) {
      console.error("Error getting EVM signer from wallet provider:", error);
      throw error;
    }
  };

  /**
   * Get Solana wallet interface for signing
   * Returns an object with methods for signing Solana transactions
   */
  const getSolanaSigner = async () => {
    if (!solanaProvider) {
      console.error("No Solana wallet provider available from Reown");
      throw new Error("No Solana wallet provider available");
    }

    try {
      const safeProvider = getSafeSolanaProvider(solanaProvider);

      if (!safeProvider) {
        throw new Error("Failed to get safe Solana provider");
      }

      // If we have a public key property on the provider, use it
      // Otherwise try to call a connect method to get it
      let publicKey: string;
      if (safeProvider.publicKey) {
        // Get public key from provider
        publicKey =
          typeof safeProvider.publicKey.toString === "function"
            ? safeProvider.publicKey.toString()
            : (safeProvider.publicKey as string);
      } else if (typeof safeProvider.connect === "function") {
        // Try to connect and get public key
        const connectResult = await safeProvider.connect();
        publicKey = connectResult.publicKey.toString();
      } else {
        throw new Error("Could not get Solana public key from provider");
      }

      return {
        publicKey,
        signTransaction: async (transaction: Transaction) => {
          // Use provider's signTransaction method to sign
          if (typeof safeProvider.signTransaction !== "function") {
            throw new Error("Solana provider does not support signTransaction");
          }

          return safeProvider.signTransaction(
            transaction,
          ) as Promise<Transaction>;
        },
        signAllTransactions: async (transactions: Transaction[]) => {
          // Use provider's signAllTransactions method to sign multiple
          if (typeof safeProvider.signAllTransactions !== "function") {
            throw new Error(
              "Solana provider does not support signAllTransactions",
            );
          }

          return safeProvider.signAllTransactions(transactions) as Promise<
            Transaction[]
          >;
        },
        signMessage: async (message: Uint8Array) => {
          // Use provider's signMessage method
          if (typeof safeProvider.signMessage !== "function") {
            throw new Error("Solana provider does not support signMessage");
          }

          return safeProvider.signMessage(message, "utf8");
        },
      };
    } catch (error) {
      console.error("Error getting Solana signer from wallet provider:", error);
      throw error;
    }
  };

  /**
   * Get appropriate signer based on active wallet type
   * This is the main function to use for getting a signer for transactions
   */

  return {
    evmProvider,
    solanaProvider,
    getEvmSigner, // Direct access to EVM signer if needed
    getSolanaSigner, // Direct access to Solana signer if needed
  };
}

export async function approveTokenSpending(
  tokenAddress: string,
  amount: string,
  spenderAddress: string,
  signer: ethers.JsonRpcSigner,
  tokenDecimals: number = 18,
): Promise<boolean> {
  try {
    console.log(`Checking allowance for token ${tokenAddress}`);

    const tokenInterface = new ethers.Interface([
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ]);

    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenInterface,
      signer,
    );
    const ownerAddress = await signer.getAddress();

    // Check current allowance
    const allowance = await tokenContract.allowance(
      ownerAddress,
      spenderAddress,
    );
    const amountWei = ethers.parseUnits(amount, tokenDecimals);

    if (allowance < amountWei) {
      console.log("Insufficient allowance, sending approval transaction...");

      // Try approving the max amount first (most efficient for future swaps)
      try {
        const tx = await tokenContract.approve(
          spenderAddress,
          ethers.MaxUint256,
        );
        console.log("Approval transaction sent:", tx.hash);
        await tx.wait();
        console.log("Approval successful");
        return true;
      } catch (error) {
        console.error(
          "Error with unlimited approval, trying exact amount:",
          error,
        );

        // Some tokens don't allow unlimited approvals, try the exact amount
        const tx = await tokenContract.approve(spenderAddress, amountWei);
        console.log("Exact amount approval transaction sent:", tx.hash);
        await tx.wait();
        console.log("Exact amount approval successful");
        return true;
      }
    }

    console.log("Token already approved");
    return true;
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
}

/**
 * Execute an EVM to EVM swap with traditional approval flow
 */
export async function executeEvmSwap({
  quote,
  swapperAddress,
  destinationAddress,
  sourceToken,
  amount,
  referrerAddresses = null,
  signer,
  tokenDecimals = 18,
  overrides = null,
  payload = null,
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  sourceToken: string;
  amount: string;
  referrerAddresses?: ReferrerAddresses | null;
  signer: JsonRpcSigner;
  tokenDecimals?: number;
  overrides?: Overrides | null;
  payload?: Uint8Array | Buffer | null;
}): Promise<string> {
  try {
    // Check if the quote is valid
    if (!quote) {
      throw new Error("Invalid quote");
    }

    // Native tokens (ETH, AVAX, etc.) don't need approval
    const isNativeToken =
      !sourceToken ||
      sourceToken === "0x0000000000000000000000000000000000000000";

    // For non-native tokens, check and approve allowance
    if (!isNativeToken) {
      const forwarderAddress = addresses.MAYAN_FORWARDER_CONTRACT;
      console.log("Mayan Forwarder address:", forwarderAddress);

      // Ensure token is approved for spending
      await approveTokenSpending(
        sourceToken,
        amount,
        forwarderAddress,
        signer,
        tokenDecimals,
      );
    }

    console.log("Executing EVM swap...");

    // Execute the swap with no permit
    const result = await swapFromEvm(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      signer,
      null, // No permit - using traditional approval only
      overrides,
      payload,
    );

    // Handle result based on type
    if (typeof result === "string") {
      // For gasless transactions, result is the order hash
      return result;
    } else {
      // For normal transactions, result is the TransactionResponse object
      return result.hash;
    }
  } catch (error) {
    console.error("Error executing EVM swap:", error);
    throw error;
  }
}

/**
 * Execute a Solana swap
 */
export async function executeSolanaSwap({
  quote,
  swapperAddress,
  destinationAddress,
  referrerAddresses = null,
  solanaSigner,
  connection,
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  sourceToken: string;
  amount: string;
  referrerAddresses?: ReferrerAddresses | null;
  solanaSigner: {
    publicKey: string;
    signTransaction: (
      transaction: Transaction | VersionedTransaction,
    ) => Promise<Transaction | VersionedTransaction>;
    signAllTransactions?: (
      transactions: (Transaction | VersionedTransaction)[],
    ) => Promise<(Transaction | VersionedTransaction)[]>;
    signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  };
  connection: Connection;
}): Promise<string> {
  try {
    if (!quote) throw new Error("Invalid quote");

    console.log("Executing Solana swap with address:", swapperAddress);

    // This implements the function with proper overload signatures
    const transactionSigner = function (
      transaction: VersionedTransaction | Transaction,
    ) {
      console.log(
        "About to sign transaction:",
        transaction instanceof Transaction
          ? `Regular transaction with ${transaction.instructions.length} instructions`
          : `Versioned transaction with message version ${transaction.version}`,
      );

      // Log transaction details before signing
      if (transaction instanceof Transaction) {
        console.log("Transaction feePayer:", transaction.feePayer?.toBase58());
        console.log(
          "Transaction recent blockhash:",
          transaction.recentBlockhash,
        );
      }

      // Wrap in try/catch for better error logging
      try {
        return solanaSigner.signTransaction(transaction);
      } catch (error) {
        console.error("Error during transaction signing:", error);
        throw error;
      }
    } as SolanaTransactionSigner;

    const result = await swapFromSolana(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      transactionSigner,
      connection,
    );

    console.log("Swap result:", result);

    return typeof result === "string" ? result : result.signature;
  } catch (error) {
    console.error("Error executing Solana swap:", error);

    // Enhance error logging for simulation failures
    if (
      error instanceof Error &&
      error.message.includes("Transaction simulation failed")
    ) {
      console.error("Simulation failure details:", error);

      // Extract and log any embedded error information
      const errorMatch = error.message.match(/Error: (.*?)(?:,|\n|$)/);
      if (errorMatch && errorMatch[1]) {
        console.error("Specific error:", errorMatch[1]);
      }
    }

    if (
      error instanceof AggregateError &&
      error.errors &&
      error.errors.length > 0
    ) {
      console.error("Detailed error:", JSON.stringify(error.errors[0]));
    }

    throw error;
  }
}

/**
 * Execute a Sui swap
 */
export async function executeSuiSwap({
  quote,
  swapperAddress,
  destinationAddress,
  referrerAddresses = null,
  signTransaction, // This might need to use the wallet directly instead
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  referrerAddresses?: {
    solana?: string;
    evm?: string;
    sui?: string;
  } | null;
  signTransaction: (
    input: { transaction: SuiTransaction }, // Change parameter name from 'transactionBlock' to 'transaction'
  ) => Promise<SignedTransaction>;
}): Promise<string> {
  try {
    if (!quote) throw new Error("Invalid quote");

    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get the transaction block from Mayan SDK
    const txBlock = await createSwapFromSuiMoveCalls(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      null,
      suiClient,
    );
    if (!txBlock) {
      throw new Error(
        "createSwapFromSuiMoveCalls did not return a transaction block.",
      );
    }

    // Set the sender address
    txBlock.setSender(swapperAddress);

    // Configure gas
    const gasPrice = await suiClient.getReferenceGasPrice();
    txBlock.setGasBudget(100000000);
    txBlock.setGasPrice(gasPrice);

    // Build the transaction
    await txBlock.build({ client: suiClient });

    // Use 'transaction' instead of 'transactionBlock' to match Suiet wallet expectation
    const signedTx = await signTransaction({
      transaction: txBlock, // Changed from transactionBlock to transaction
    });

    // Execute the transaction
    const executionResponse = await suiClient.executeTransactionBlock({
      transactionBlock: signedTx.bytes,
      signature: Array.isArray(signedTx.signature)
        ? signedTx.signature
        : [signedTx.signature],
      options: {
        showEffects: true,
        showEvents: true,
      },
      requestType: "WaitForEffectsCert",
    });

    // Rest of the function remains the same
    if (executionResponse.effects?.status?.status === "failure") {
      console.error(
        "Transaction execution failed on-chain:",
        executionResponse.effects.status.error,
      );
      throw new Error(
        `Sui transaction failed: ${executionResponse.effects.status.error}`,
      );
    }

    if (!executionResponse.digest) {
      throw new Error(
        "Transaction processed, but no digest was returned. Check effects.",
      );
    }

    console.log(
      "Sui swap transaction successful. Digest:",
      executionResponse.digest,
    );
    return executionResponse.digest;
  } catch (error) {
    console.error("Error executing Sui swap:", error);
    // Error handling as before
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error));
    }
  }
}
interface GetMayanQuoteParams {
  amount: string;
  sourceToken: Token;
  destinationToken: Token;
  sourceChain: Chain;
  destinationChain: Chain;
  slippageBps?: "auto" | number;
  gasDrop?: number;
  referrer?: string;
  referrerBps?: number;
}

/**
 * Fetches a cross-chain swap quote from Mayan Finance
 * @param params Quote parameters
 * @returns A promise that resolves to an array of Quote objects
 */
export async function getMayanQuote(
  params: GetMayanQuoteParams,
): Promise<Quote[]> {
  const {
    amount,
    sourceToken,
    destinationToken,
    sourceChain,
    destinationChain,
    slippageBps = "auto", // Default to 'auto' instead of 300
    gasDrop,
    referrer,
    referrerBps,
  } = params;

  if (!amount || parseFloat(amount) <= 0) {
    throw new Error("Invalid amount");
  }

  try {
    const quoteParams = {
      amount: parseFloat(amount),
      fromToken: sourceToken.address,
      toToken: destinationToken.address,
      fromChain: sourceChain.mayanName,
      toChain: destinationChain.mayanName,
      slippageBps,
      gasDrop,
      referrer,
      referrerBps,
    };
    console.log("fetching quote with params:");
    console.log(quoteParams);

    const quotes = await fetchQuote({
      amount: parseFloat(amount),
      fromToken: sourceToken.address,
      toToken: destinationToken.address,
      fromChain: sourceChain.mayanName,
      toChain: destinationChain.mayanName,
      slippageBps,
      gasDrop,
      referrer,
      referrerBps,
    });

    console.log("Mayan quotes:", quotes);

    return quotes;
  } catch (error) {
    console.error("Error fetching Mayan quote:", error);
    throw error;
  }
}
