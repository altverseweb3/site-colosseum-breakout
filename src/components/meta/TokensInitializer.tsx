// src/components/TokenInitializer.tsx
"use client";

import { useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import { getPricesAndBalancesForActiveWallet } from "@/utils/tokenApiMethods";

/**
 * Component that initializes token data on dApp startup.
 */
const TokenInitializer: React.FC = () => {
  // Use separate selectors to avoid object reference changes
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const activeWallet = useWeb3Store((state) => state.activeWallet);

  useEffect(() => {
    // Fetch prices and balances for the active wallet
    if (sourceChain && destinationChain && tokenCount && activeWallet) {
      // Initial fetch when dependencies change
      getPricesAndBalancesForActiveWallet();

      // Set up interval to run every 10 seconds
      const intervalId = setInterval(() => {
        getPricesAndBalancesForActiveWallet();
      }, 10000); // 10 seconds in milliseconds

      // Clean up interval when component unmounts or dependencies change
      return () => clearInterval(intervalId);
    }
  }, [sourceChain, destinationChain, tokenCount, activeWallet]);

  return null;
};

export default TokenInitializer;
