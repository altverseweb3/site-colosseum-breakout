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
  wallets: [new PhantomWalletAdapter() as unknown as BaseWalletAdapter<string>],
});

// 2. Get projectId from https://cloud.reown.com
const projectId = "7499f033392cb44c546b3c9de7550340";

// 3. Set up the metadata - Optional
const metadata = {
  name: "altverse",
  description: "AppKit Example",
  url: "https://example.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 4. Create the AppKit instance
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

import { ReactNode } from "react";

export function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
