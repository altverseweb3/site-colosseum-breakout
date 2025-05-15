// window.d.ts

// Define more specific types for RPC methods and parameters
type EthereumRpcMethod =
  | "eth_chainId"
  | "eth_accounts"
  | "eth_requestAccounts"
  | "eth_sendTransaction"
  | "wallet_switchEthereumChain"
  | "wallet_addEthereumChain";

// Define common return types for Ethereum RPC methods
type EthereumRpcResult =
  | string
  | string[]
  | boolean
  | Record<string, unknown>
  | null;

// Define a more specific Ethereum provider interface
interface PartialEthereumProvider {
  request?: (args: {
    method: EthereumRpcMethod;
    params?: (string | number | boolean | Record<string, unknown>)[];
  }) => Promise<EthereumRpcResult>;

  // For other possible properties that might exist on providers
  isMetaMask?: boolean;
  isConnected?: () => boolean;
  on?: (event: string, callback: (result: unknown) => void) => void;
  removeListener?: (event: string, callback: (result: unknown) => void) => void;

  // Still need an index signature but with a more specific type
  [key: string]: unknown;
}

// Define Solana provider interface for wallets like Phantom
interface PartialSolanaProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: { toString: () => string };

  connect?: (options?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
  signAllTransactions?: (transactions: unknown[]) => Promise<unknown[]>;
  signMessage?: (
    message: Uint8Array,
    encoding: string,
  ) => Promise<{ signature: Uint8Array }>;
  signAndSendTransaction?: (
    transaction: unknown,
    options?: unknown,
  ) => Promise<{ signature: string }>;

  on?: (event: string, callback: (args: unknown) => void) => void;
  removeListener?: (event: string, callback: (args: unknown) => void) => void;

  // Still need an index signature
  [key: string]: unknown;
}

// Extend the Window interface
declare global {
  interface Window {
    ethereum?: PartialEthereumProvider;
    solana?: PartialSolanaProvider;

    phantom?: PartialSolanaProvider;
  }
}

// Need to include an export for TypeScript to treat this as a module
export {};
