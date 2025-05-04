// src/components/meta/WalletContext.tsx

"use client";

import { createAppKit } from "@reown/appkit/react";
import { BaseWalletAdapter, SolanaAdapter } from "@reown/appkit-adapter-solana";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { AppKitNetwork } from "@reown/appkit-common";

import { solana } from "@reown/appkit/networks";
import {
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
} from "@reown/appkit/networks";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

// --- Suiet Imports ---
import { WalletProvider } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css"; // Import Suiet CSS

// --- Reown AppKit Configuration ---

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
  solana,
];

// 0. Create the Ethers adapter
export const ethersAdapter = new EthersAdapter();

// 1. Create Solana adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  // Ensure PhantomWalletAdapter conforms to BaseWalletAdapter<string>
  // The 'unknown' cast might hide type issues, ensure compatibility or use a compatible wrapper if needed.
  wallets: [new PhantomWalletAdapter() as unknown as BaseWalletAdapter<string>],
});

// 2. Get projectId from https://cloud.reown.com
const projectId = "7499f033392cb44c546b3c9de7550340";

// 3. Set up the metadata - Optional
const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "altverse",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "AppKit Example",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://altverse.finance", // origin must match your domain & subdomain
  icons: [
    process.env.NEXT_PUBLIC_APP_ICON_URL ||
      "https://avatars.githubusercontent.com/u/179229932",
  ],
};

// 4. Create the AppKit instance (This configures Reown AppKit)
// This needs to run when the module is loaded.
createAppKit({
  adapters: [ethersAdapter, solanaWeb3JsAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true,
  },
  themeVariables: {
    "--w3m-color-mix": "#000000",
    "--w3m-color-mix-strength": 30,
    "--w3m-accent": "#F59E0B",
    "--w3m-font-family": "Urbanist",
    "--w3m-border-radius-master": "8px",
  },
});

// --- Combined Provider Component ---

// This new component will wrap children with the necessary providers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CombinedWalletProvider({ children }: { children: any }) {
  // The createAppKit call above handles Reown setup.
  // We now wrap children with the Suiet WalletProvider.
  // Reown's context seems to be managed internally after createAppKit runs,
  // so we don't need an explicit Reown provider component here.
  return (
    <WalletProvider>
      {/*
        Reown AppKit's context is implicitly available to hooks like useAppKit
        because createAppKit was called in this module's scope.
      */}
      {children}
    </WalletProvider>
  );
}
