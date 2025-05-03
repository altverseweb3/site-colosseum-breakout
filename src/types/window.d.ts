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

// Define a more specific provider interface
interface PartialProvider {
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

// Extend the Window interface
declare global {
  interface Window {
    ethereum?: PartialProvider;
  }
}

// Need to include an export for TypeScript to treat this as a module
export {};
