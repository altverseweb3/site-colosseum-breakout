import { Eip1193Provider } from "@/types/web3";

// Define possible wallet provider structures
interface DirectProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  [key: string]: unknown;
}

interface NestedProviderContainer {
  provider: DirectProvider;
  [key: string]: unknown;
}

interface EthereumContainer {
  ethereum: DirectProvider;
  [key: string]: unknown;
}

// Union type for all possible provider structures
type PossibleWalletProvider =
  | DirectProvider
  | NestedProviderContainer
  | EthereumContainer
  | unknown;

// Function to safely check and use Reown wallet provider
export function getSafeProvider(
  walletProvider: PossibleWalletProvider,
): Eip1193Provider {
  // Try different possible locations for the actual provider
  let validProvider: Eip1193Provider | null = null;

  // Direct check
  if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "request" in walletProvider &&
    typeof (walletProvider as DirectProvider).request === "function"
  ) {
    validProvider = walletProvider as unknown as Eip1193Provider;
  }
  // Nested in .provider
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "provider" in walletProvider &&
    typeof walletProvider.provider === "object" &&
    walletProvider.provider !== null &&
    "request" in walletProvider.provider &&
    typeof (walletProvider as NestedProviderContainer).provider.request ===
      "function"
  ) {
    validProvider = (walletProvider as NestedProviderContainer)
      .provider as unknown as Eip1193Provider;
  }
  // Nested in .ethereum
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "ethereum" in walletProvider &&
    typeof walletProvider.ethereum === "object" &&
    walletProvider.ethereum !== null &&
    "request" in walletProvider.ethereum &&
    typeof (walletProvider as EthereumContainer).ethereum.request === "function"
  ) {
    validProvider = (walletProvider as EthereumContainer)
      .ethereum as unknown as Eip1193Provider;
  }
  // Fallback to window.ethereum
  else if (
    window.ethereum &&
    window.ethereum.request &&
    typeof window.ethereum.request === "function"
  ) {
    validProvider = window.ethereum as unknown as Eip1193Provider;
  }

  if (!validProvider) {
    throw new Error("No valid Ethereum provider found");
  }

  return validProvider;
}
