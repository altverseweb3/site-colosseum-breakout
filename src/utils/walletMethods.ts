import { WalletInfo, WalletType } from "@/types/web3";

import useWeb3Store from "@/store/web3Store";

export async function connectMetamask(): Promise<WalletInfo | null> {
  if (!window.ethereum) {
    throw new Error("Metamask not installed");
  }

  try {
    const accounts = await window.ethereum.request<string[]>({
      method: "eth_requestAccounts",
    });

    const chainId = await window.ethereum.request<string>({
      method: "eth_chainId",
    });

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error("No accounts found");
    }

    const address = accounts[0];

    if (!chainId) {
      throw new Error("No chainId found");
    }

    const walletInfo: WalletInfo = {
      type: WalletType.METAMASK,
      name: "MetaMask",
      address,
      chainId: parseInt(chainId, 16),
    };

    // Update the store immediately on connection
    const store = useWeb3Store.getState();
    store.addWallet(walletInfo);

    // Set up account change listener
    window.ethereum.on("accountsChanged", (accounts: unknown) => {
      const store = useWeb3Store.getState();
      const newAccounts = accounts as string[];
      if (!newAccounts || newAccounts.length === 0) {
        // MetaMask was locked or disconnected
        store.removeWallet(WalletType.METAMASK);
      } else {
        // Account was switched
        store.updateWalletAddress(WalletType.METAMASK, newAccounts[0]);
      }
    });

    // Set up chain change listener
    window.ethereum.on("chainChanged", (chainId: unknown) => {
      const store = useWeb3Store.getState();
      store.updateWalletChainId(
        WalletType.METAMASK,
        parseInt(chainId as string, 16),
      );
    });

    // Set up disconnect listener
    window.ethereum.on("disconnect", () => {
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    });

    return walletInfo;
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    return null;
  }
}

export async function disconnectMetamask(): Promise<void> {
  try {
    if (window.ethereum) {
      // Remove all event listeners
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
      window.ethereum.removeAllListeners("disconnect");

      // Update the store
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    }
  } catch (error) {
    console.error("Error disconnecting from MetaMask:", error);
    throw error;
  }
}

// used to display truncated wallet address
export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
