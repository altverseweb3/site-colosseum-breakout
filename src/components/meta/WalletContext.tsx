"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import {
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
  solana,
} from "@reown/appkit/networks";

// 1. Get projectId at https://cloud.reown.com
const projectId = "7499f033392cb44c546b3c9de7550340";

// 2. Create a metadata object
const metadata = {
  name: "altverse",
  description: "AppKit Example",
  url: "https://reown.com/appkit", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"],
};

// 3. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  includeWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
    "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393",
  ],
  excludeWalletIds: [
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
  ],
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
  ],
  metadata,
  networks: [mainnet, arbitrum, avalanche, base, optimism, polygon, solana],
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
