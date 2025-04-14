"use client";

import { useEffect } from "react";
import useWeb3Store from "@/store/web3Store";

/**
 * Component that initializes token data on dApp startup.
 */
const TokenInitializer: React.FC = () => {
  // Use separate selectors to avoid object reference changes
  const loadTokensForActiveChains = useWeb3Store(
    (state) => state.loadTokensForActiveChains,
  );
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);

  useEffect(() => {
    // Only load tokens if we don't already have them
    if (!tokensLoading && tokenCount === 0) {
      loadTokensForActiveChains();
    }
  }, [loadTokensForActiveChains, tokensLoading, tokenCount]);

  // This component doesn't render anything visual
  return null;
};

export default TokenInitializer;
