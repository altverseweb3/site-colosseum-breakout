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

// import { useAppKitAccount } from "@reown/appkit/react";
// import { useAppKitNetwork } from "@reown/appkit/react";

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
  ],
  excludeWalletIds: [
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
  ],
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
  ],
  metadata,
  networks: [mainnet, arbitrum, avalanche, base, optimism, polygon],
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
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
  // const eip155Account = useAppKitAccount({ namespace: "eip155" });
  // const appKitNetwork = useAppKitNetwork();
  // useEffect(() => {
  //   if (eip155Account.isConnected) {
  //     console.log("Connected to AppKit");
  //     console.log("Account:", eip155Account.address);
  //     console.log("Chain ID:", eip155Account.caipAddress);
  //     console.log("Network Chain ID:", appKitNetwork.chainId);
  //   } else {
  //     console.log("Not connected to AppKit");
  //   }
  // }, [eip155Account.isConnected]);
  return <>{children}</>;
}
