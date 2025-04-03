// src/config/chains.ts
import { Chain } from "@/types/web3";

export const chains: Record<string, Chain> = {
  ethereum: {
    id: "ethereum",
    name: "ethereum",
    symbol: "ETH",
    icon: "ETH.svg",
    backgroundColor: "#627eea",
    fontColor: "#FFFFFF",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    explorerUrl: "https://etherscan.io",
    chainId: 1,
    decimals: 18,
    l2: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "arbitrum",
    symbol: "ARB",
    icon: "ARB.svg",
    backgroundColor: "#28a0f0",
    fontColor: "#FFFFFF",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    chainId: 42161,
    decimals: 18,
    l2: true,
  },
  optimism: {
    id: "optimism",
    name: "optimism",
    symbol: "OP",
    icon: "OP.svg",
    backgroundColor: "#ff0420",
    fontColor: "#FFFFFF",
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    chainId: 10,
    decimals: 18,
    l2: true,
  },
  base: {
    id: "base",
    name: "base",
    symbol: "BASE",
    icon: "BASE.svg",
    backgroundColor: "#0D5BFF",
    fontColor: "#FFFFFF",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    chainId: 8453,
    decimals: 18,
    l2: true,
  },
  unichain: {
    id: "unichain",
    name: "unichain",
    symbol: "UNI",
    icon: "UNI.svg",
    backgroundColor: "#F50DB4",
    fontColor: "#FFFFFF",
    rpcUrl: "https://unichain-rpc.publicnode.com",
    explorerUrl: "https://uniscan.xyz",
    chainId: 130,
    decimals: 18,
    l2: true,
  },
  sui: {
    id: "sui",
    name: "sui",
    symbol: "SUI",
    icon: "SUI.svg",
    backgroundColor: "#4BA2FF",
    fontColor: "#FAFAFA",
    rpcUrl: "https://sui-mainnet-endpoint.blockvision.org",
    explorerUrl: "https://suiscan.xyz/mainnet/home",
    chainId: 999,
    decimals: 9,
    l2: false,
  },
  polygon: {
    id: "polygon",
    name: "polygon",
    symbol: "MATIC",
    icon: "MATIC.svg",
    backgroundColor: "#8247e5",
    fontColor: "#FFFFFF",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    chainId: 137,
    decimals: 18,
    l2: false,
  },
  "binance-smart-chain": {
    id: "binance-smart-chain",
    name: "bnb chain",
    symbol: "BNB",
    icon: "BNB.svg",
    backgroundColor: "#f3ba2f",
    fontColor: "#FFFFFF",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    chainId: 56,
    decimals: 18,
    l2: false,
  },
  avalanche: {
    id: "avalanche",
    name: "avalanche",
    symbol: "AVAX",
    icon: "AVAX.svg",
    backgroundColor: "#e84142",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    chainId: 43114,
    decimals: 18,
    l2: false,
  },
  solana: {
    id: "solana",
    name: "solana",
    symbol: "SOL",
    icon: "SOL.svg",
    backgroundColor: "#9945FF",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com/",
    chainId: 101,
    decimals: 9,
    l2: false,
  },
};

export const chainList: Chain[] = Object.values(chains);

export const defaultSourceChain: Chain = chains.ethereum;
export const defaultDestinationChain: Chain = chains.unichain;

export const getChainById = (id: string): Chain => {
  return chains[id] || defaultSourceChain;
};

export const getChainByChainId = (chainId: number): Chain => {
  return (
    chainList.find((chain) => chain.chainId === chainId) || defaultSourceChain
  );
};

export const getTestnetChains = (): Chain[] => {
  return chainList.filter((chain) => chain.testnet);
};

export const getMainnetChains = (): Chain[] => {
  return chainList.filter((chain) => !chain.testnet);
};

export default chains;
