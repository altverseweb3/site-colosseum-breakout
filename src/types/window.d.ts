import type { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider & {
      // Trust Wallet specific property
      isTrust?: boolean;

      // MetaMask specific property
      isMetaMask?: boolean;
    };
  }
}

// Need to include an export for TypeScript to treat this as a module
export {};
