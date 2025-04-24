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
  metadata,
  networks: [mainnet, arbitrum, avalanche, base, optimism, polygon],
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
  themeVariables: {
    "--w3m-color-mix": "#000000",
    "--w3m-color-mix-strength": 30,
    "--w3m-accent": "#000000",
    "--w3m-font-family": "Urbanist",
    "--w3m-border-radius-master": "8px",
  },
});

import { ReactNode } from "react";

export function AppKit({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
