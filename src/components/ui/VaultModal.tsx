// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import * as ethers from "ethers";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import useWeb3Store, { useSetReceiveAddress, useWalletByType } from "@/store/web3Store";
import SelectTokenButton from "./SelectTokenButton";
import SelectChainButton from "./SelectChainButton";
import { chainList } from "@/config/chains";
import { useChainSwitch, useTokenTransfer } from "@/utils/walletMethods";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { getSafeProvider } from "@/utils/providerUtils";
import { useAppKitProvider } from "@reown/appkit/react";
import { chains } from "@/config/chains";
// Define the type for tokens
type TokenAsset = {
  id: string;
  name: string;
  icon: string;
};

// Common tokens available on all vaults
const COMMON_TOKENS: TokenAsset[] = [
  { id: "sui", name: "SUI", icon: "🔵" },
  { id: "solana", name: "SOL", icon: "🟣" },
];

// Define the type for vault deposit options
type VaultDepositOption = {
  depositEnabled: boolean;
  tokens?: TokenAsset[];
  disabledMessage?: string;
};

// Mapping of vault names to their available deposit tokens and status
const VAULT_DEPOSIT_OPTIONS: Record<string, VaultDepositOption> = {
  "Liquid ETH Yield": {
    depositEnabled: true,
    tokens: [
      { id: "weth", name: "wETH", icon: "🔷" },
      { id: "eeth", name: "eETH", icon: "🔶" },
      { id: "weeth", name: "weETH", icon: "🔸" },
    ],
  },
  "Liquid BTC Yield": {
    depositEnabled: true,
    tokens: [
      { id: "lbtc", name: "LBTC", icon: "🟠" },
      { id: "wbtc", name: "wBTC", icon: "🟡" },
      { id: "cbbtc", name: "cbBTC", icon: "🟠" },
      { id: "ebtc", name: "eBTC", icon: "🟡" },
    ],
  },
  "The Bera BTC Vault": {
    depositEnabled: true,
    tokens: [
      { id: "wbtc", name: "wBTC", icon: "🟡" },
      { id: "lbtc", name: "LBTC", icon: "🟠" },
      { id: "cbbtc", name: "cbBTC", icon: "🟠" },
      { id: "ebtc", name: "eBTC", icon: "🟡" },
    ],
  },
  "Market-Neutral USD": {
    depositEnabled: true,
    tokens: [
      { id: "usdc", name: "USDC", icon: "💲" },
      { id: "dai", name: "DAI", icon: "💵" },
      { id: "usdt", name: "USDT", icon: "💹" },
      { id: "usde", name: "USDe", icon: "💲" },
      { id: "deusd", name: "deUSD", icon: "💵" },
      { id: "sdeusd", name: "sdeUSD", icon: "💹" },
    ],
  },
  "EIGEN Restaking": {
    depositEnabled: true,
    tokens: [{ id: "eigen", name: "EIGEN", icon: "🟣" }],
  },
  "UltraYield Stablecoin Vault": {
    depositEnabled: true,
    tokens: [
      { id: "usdc", name: "USDC", icon: "💲" },
      { id: "dai", name: "DAI", icon: "💵" },
      { id: "usdt", name: "USDT", icon: "💹" },
    ],
  },
  "Liquid Move ETH": {
    depositEnabled: false,
    disabledMessage: "Deposits are currently disabled for this vault.",
  },
  "The Bera ETH Vault": {
    depositEnabled: true,
    tokens: [
      { id: "weth", name: "wETH", icon: "🔷" },
      { id: "eth", name: "ETH", icon: "🔷" },
      { id: "weeth", name: "weETH", icon: "🔸" },
      { id: "eeth", name: "eETH", icon: "🔶" },
      { id: "steth", name: "stETH", icon: "🔵" },
      { id: "wsteth", name: "wstETH", icon: "🔵" },
    ],
  },
};

// Mapping of vault names to their respective receive tokens
const VAULT_RECEIVE_TOKENS: Record<
  string,
  { name: string; icon: string; imagePath?: string }
> = {
  "Liquid ETH Yield": {
    name: "liquidETH",
    icon: "🔹",
    imagePath: "/earnImages/earnTokens/liquideth-icon.svg",
  },
  "Liquid BTC Yield": {
    name: "liquidBTC",
    icon: "🟠",
    imagePath: "/earnImages/earnTokens/liquidbtc-icon.svg",
  },
  "The Bera BTC Vault": {
    name: "BeraBTC",
    icon: "🐻",
    imagePath: "/earnImages/earnSVGs/beraeth.svg",
  },
  "Market-Neutral USD": {
    name: "liquidUSD",
    icon: "💵",
    imagePath: "/earnImages/earnTokens/usdc-icon.png",
  },
  "EIGEN Restaking": {
    name: "eEIGEN",
    icon: "🟣",
    imagePath: "/earnImages/earnTokens/eeigen-icon.svg",
  },
  "UltraYield Stablecoin Vault": {
    name: "UltraUSD",
    icon: "💲",
    imagePath: "/earnImages/earnSVGs/ultrayieldstable.png",
  },
  "Liquid Move ETH": {
    name: "LiquidMoveETH",
    icon: "🔄",
    imagePath: "/earnImages/earnSVGs/liquidmove.png",
  },
  "The Bera ETH Vault": {
    name: "BeraETH",
    icon: "🐻",
    imagePath: "/earnImages/earnSVGs/beraeth.svg",
  },
};

export type VaultDetails = {
  id: number;
  name: string;
  ecosystem: string;
  type?: string;
  chain?: string;
  token: string[];
  points: string;
  apy: string;
  tvl?: string;
  description?: string;
  contractAddress?: string;
  explorerUrl?: string;
  analyticsUrl?: string;
  hasRealAPY?: boolean;
  isAcceptingDeposits?: boolean;
};

export const VaultModal = ({
  vault,
  open,
  onOpenChange,
}: {
  vault: VaultDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [swapCompletedAmount, setSwapCompletedAmount] = useState<string>("0.0");
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [approveDepositError, setApproveDepositError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<TokenAsset>({
    id: "",
    name: "",
    icon: "",
  });
  // Get global web3 state
  const activeWallet = useWeb3Store((state) => state.getWalletBySourceChain());
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const destinationChain = useWeb3Store(
    (state) => state.destinationChain
  );

  const tokensByCompositeKey = useWeb3Store(
    (state) => state.tokensByCompositeKey
  );
  const { walletProvider: evmProvider } = useAppKitProvider("eip155");
  const {
    amount,
    handleAmountChange,
    isButtonDisabled,
    handleTransfer,
    receiveAmount,
    isLoadingQuote,
    sourceToken,
    destinationToken,
    estimatedTimeSeconds,
    totalFeeUsd,
    protocolFeeUsd,
    relayerFeeUsd,
  } = useTokenTransfer({
    type: "swap",
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log(
        `Swap succeeded: ${amount} ${sourceToken.ticker} → ${destinationToken?.ticker}`
      );
    },
  });
  const chainsToShow = chainList.filter(
    (c) => c.id === "solana" || c.id === "sui" || c.id === "ethereum"
  );
  const { switchToSourceChain } = useChainSwitch();
  const setReceiveAddress = useSetReceiveAddress();
  const receiveAddress = useWeb3Store(
    (state) => state.transactionDetails.receiveAddress
  );
  

  // Create a more specific subscription to track token balance changes
  const tokenAddress = sourceToken?.address?.toLowerCase();
  const chainId = sourceToken?.chainId;

  useEffect(() => {
    handleAmountChange(swapCompletedAmount!)
  }, [swapCompletedAmount])

  // This will re-render when the specific token balance changes
  const tokenBalance = useWeb3Store((state) => {
    if (!tokenAddress || !chainId) return null;

    // Create a wallet key that matches the one used in updateTokenBalances
    const requiredWallet = state.getWalletBySourceChain();
    if (!requiredWallet) return null;

    const walletKey = `${chainId}-${requiredWallet.address.toLowerCase()}`;
    const balances = state.tokenBalancesByWallet[walletKey];

    return balances?.[tokenAddress] || null;
  });
  const updateReceiveAddressForChain = useCallback(() => {
    if (!destinationChain?.walletType) return;

    // Try to get a wallet of the needed type
    const matchingWallet = useWalletByType(destinationChain.walletType);

    if (matchingWallet) {
      // We have a matching wallet, use its address
      setReceiveAddress(matchingWallet.address);
    } else {
      setReceiveAddress(null);
    }
  }, [
    destinationChain?.walletType,
    useWalletByType,
    setReceiveAddress,
    receiveAddress,
  ]);

  const handleSwapStep = useCallback(async () => {
    if (!amount || !sourceToken || !destinationToken) {
      setSwapError("Missing required information for swap");
      return;
    }
  
    setIsSwapping(true);
    setSwapError(null);
  
    try {
      await handleTransfer();
      setSwapCompleted(true);
      const ethereumChain = chains.ethereum;
      setSourceChain(ethereumChain);
      setSwapCompletedAmount(receiveAmount);
      setSourceToken(destinationToken);
      console.log("Swap completed successfully");
    } catch (error) {
      console.error("Swap error:", error);
      setSwapError(error instanceof Error ? error.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  }, [amount, sourceToken, destinationToken, handleTransfer]);

  useEffect(() => {
    setSwapCompleted(false);
    setSwapError(null);
    setApproveDepositError(null);
    setIsApproved(false);
  }, [vault, amount, sourceToken]);

  const handleApproveAndDeposit = useCallback(async () => {
    if (!vault || !activeWallet) {
      setApproveDepositError("Missing required information");
      return;
    }
  
    // Determine the amount to use
    let amountToUse = amount;
    let tokenToUse = selectedAsset;
  
    // If we did a swap, use the receive amount and destination token
    if (needsSwap && swapCompleted && receiveAmount && destinationToken) {
      amountToUse = receiveAmount;
      tokenToUse = {
        id: destinationToken.ticker.toLowerCase(),
        name: destinationToken.ticker,
        icon: destinationToken.ticker === 'WETH' ? '🔷' : '📊'
      };
    }
  
    if (!amountToUse || parseFloat(amountToUse) <= 0) {
      setApproveDepositError("Invalid amount");
      return;
    }
  
    setApproveDepositError(null);
    const switched = await switchToSourceChain();
    if (!switched) {
      setApproveDepositError("Failed to switch to source chain");
      return;
    }
  
    try {
      // Step 1: Approve
      setIsApproving(true);
      console.log(`Approving ${amountToUse} ${tokenToUse.name}...`);
      
      const provider = getWeb3Provider();
      if (!provider) throw new Error("Could not get provider");
      
      await switchToSourceChain();
      
      const { approveTokenForVault } = await import("@/utils/approveTokenForVault");
      const approvalResult = await approveTokenForVault(
        provider,
        tokenToUse.id,
        vault.id,
        amountToUse
      );
  
      if (!approvalResult.success) {
        throw new Error(approvalResult.message);
      }
  
      setIsApproved(true);
      setIsApproving(false);
  
      // Step 2: Deposit
      setIsDepositing(true);
      console.log(`Depositing ${amountToUse} ${tokenToUse.name}...`);
  
      const { depositToVaultSimple } = await import("@/utils/vaultDepositHelper");
      const depositResult = await depositToVaultSimple(
        provider,
        tokenToUse.id,
        vault.id,
        amountToUse
      );
  
      if (!depositResult.success) {
        throw new Error(depositResult.message);
      }
  
      // Success!
      alert(`Successfully deposited ${amountToUse} ${tokenToUse.name} to ${vault.name}`);
      onOpenChange(false);
  
    } catch (error) {
      console.error("Approve/Deposit error:", error);
      setApproveDepositError(error instanceof Error ? error.message : "Operation failed");
      setIsApproved(false);
    } finally {
      setIsApproving(false);
      setIsDepositing(false);
    }
  }, [
    vault,
    activeWallet,
    amount,
    selectedAsset,
    swapCompleted,
    receiveAmount,
    destinationToken,
    switchToSourceChain,
    onOpenChange
  ]);

  // Use the balance from the direct subscription if available, otherwise fall back to sourceToken
  const currentBalance = useMemo(() => {
    return tokenBalance || sourceToken?.userBalance || "0";
  }, [tokenBalance, sourceToken?.userBalance]);

  // Get available deposit tokens for this vault or use default tokens
  const getVaultDepositOptions = (
    vaultName: string,
    isAcceptingDeposits: boolean = true
  ) => {
    // Get the default options from the map
    const defaultOptions = VAULT_DEPOSIT_OPTIONS[vaultName];

    // If the vault is not accepting deposits (from blockchain check), override the deposit status
    if (isAcceptingDeposits === false) {
      // Explicitly check for false to handle undefined case
      return {
        depositEnabled: false,
        tokens: defaultOptions?.tokens || [],
        disabledMessage:
          "Deposits are currently disabled for this vault (paused).",
      };
    }

    // Otherwise return the default options or a fallback
    if (!defaultOptions) return { depositEnabled: true, tokens: [] };
    return defaultOptions;
  };

  // Get vault options with memoization
  const vaultOptions = useMemo(
    () =>
      vault
        ? getVaultDepositOptions(vault.name, vault.isAcceptingDeposits)
        : { depositEnabled: true, tokens: [] },
    [vault]
  );

  // Token SVG mapping with updated image paths
  const TOKEN_SVG_MAPPING: Record<string, string> = {
    // Deposit tokens
    eth: "/earnImages/earnTokens/eth-icon-2.png",
    weth: "/earnImages/earnTokens/eth-icon-2.png",
    eeth: "/earnImages/earnTokens/eeth-icon.png",
    weeth: "/earnImages/earnSVGs/weETH.png",
    steth: "/earnImages/earnSVGs/stETH.svg",
    wsteth: "/earnImages/earnSVGs/wstETH.png",
    wbtc: "/earnImages/earnTokens/wbtc.png",
    lbtc: "/earnImages/earnTokens/lbtc-icon.png",
    cbbtc: "/earnImages/earnTokens/cbbtc-icon.png",
    ebtc: "/earnImages/earnTokens/ebtc-icon.png",
    usdc: "/earnImages/earnTokens/usdc-icon.png",
    dai: "/earnImages/earnTokens/dai-icon.png",
    usdt: "/earnImages/earnTokens/usdt-icon.png",
    usde: "/earnImages/earnTokens/usde-icon.png",
    deusd: "/earnImages/earnTokens/deUSD.png",
    sdeusd: "/earnImages/earnTokens/sdeUSD.png",
    eigen: "/earnImages/earnTokens/eigenlayer-token.svg",
    sui: "/earnImages/earnTokens/sui-logo.svg",
    solana: "/earnImages/earnTokens/solana-sol-logo.svg",
    // Vault tokens
    liquidETH: "/earnImages/earnTokens/liquideth-icon.svg",
    "Liquid ETH Yield": "/earnImages/earnTokens/liquideth-icon.svg",
    liquidBTC: "/earnImages/earnTokens/liquidbtc-icon.svg",
    "Liquid BTC Yield": "/earnImages/earnTokens/liquidbtc-icon.svg",
    BeraETH: "/earnImages/earnSVGs/beraeth.svg",
    "The Bera ETH Vault": "/earnImages/earnSVGs/beraeth.svg",
    BeraBTC: "/earnImages/earnSVGs/beraeth.svg",
    "The Bera BTC Vault": "/earnImages/earnSVGs/beraeth.svg",
    "Liquid Move ETH": "/earnImages/earnSVGs/liquidmove.png",
    "UltraYield Stablecoin Vault": "/earnImages/earnSVGs/ultrayieldstable.png",
    "Market-Neutral USD": "/earnImages/earnTokens/usdc-icon.png",
    "EIGEN Restaking": "/earnImages/earnSVGs/eigenlayer-icon.svg",
    // Token names as keys
    SUI: "/earnImages/earnTokens/sui-logo.svg",
    SOL: "/earnImages/earnTokens/solana-sol-logo.svg",
    LBTC: "/earnImages/earnTokens/lbtc-icon.png",
    cbBTC: "/earnImages/earnTokens/cbbtc-icon.png",
    eBTC: "/earnImages/earnTokens/ebtc-icon.png",
    wETH: "/earnImages/earnTokens/eth-icon-2.png",
    eETH: "/earnImages/earnTokens/eeth-icon.png",
    weETH: "/earnImages/earnTokens/weeth-icon.png",
    wBTC: "/earnImages/earnTokens/wbtc.png",
    USDC: "/earnImages/earnTokens/usdc-icon.png",
    DAI: "/earnImages/earnTokens/dai-icon.png",
    USDT: "/earnImages/earnTokens/usdt-icon.png",
    USDe: "/earnImages/earnTokens/usde-icon.png",
    deUSD: "/earnImages/earnTokens/deUSD.png",
    sdeUSD: "/earnImages/earnTokens/sdeUSD.png",
    EIGEN: "/earnImages/earnTokens/eigenlayer-token.svg",
  };

  

  // Token Icon component
  const TokenIcon = ({
    tokenId,
    fallbackIcon,
    size = 24,
  }: {
    tokenId: string;
    fallbackIcon: string;
    size?: number;
  }) => {
    const svgPath = TOKEN_SVG_MAPPING[tokenId];

    if (svgPath) {
      // Fixed dimensions container with proper centering
      return (
        <div
          className="relative flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <Image
            src={svgPath}
            alt={tokenId}
            width={size - 6} // Slightly smaller to ensure consistent padding
            height={size - 6}
            className="object-contain max-w-full max-h-full"
            style={{ objectFit: "contain" }}
          />
        </div>
      );
    }

    // Fallback to emoji if no SVG is available
    return <span className="text-lg">{fallbackIcon}</span>;
  };

  // Memoize the token list to avoid recreating it on every render
  const allTokensForVault = useMemo(
    () =>
      vault && vaultOptions.depositEnabled && vaultOptions.tokens
        ? [...vaultOptions.tokens, ...COMMON_TOKENS]
        : COMMON_TOKENS,
    [vault, vaultOptions.depositEnabled, vaultOptions.tokens]
  );
  

  // Update selected asset when vault changes
  useEffect(() => {
    if (
      vault &&
      vaultOptions.depositEnabled &&
      vaultOptions.tokens &&
      vaultOptions.tokens.length > 0
    ) {
      // Set to the first vault-specific token if available
      setSelectedAsset(vaultOptions.tokens[0]);
    } else if (allTokensForVault.length > 0) {
      // Fallback to first available token
      setSelectedAsset(allTokensForVault[0]);
    }
  }, [
    vault,
    vaultOptions.depositEnabled,
    vaultOptions.tokens,
    allTokensForVault,
  ]);


  const needsSwap = useMemo(() => {
    return sourceToken && (sourceToken.chainId === 101 || sourceToken.chainId === 0);
  }, [sourceToken]);

  const getWeb3Provider = () => {
    if (typeof window === "undefined") return null;

    try {
      // Check if window.ethereum is available
      const safeProvider = getSafeProvider(evmProvider);

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(safeProvider);
      return ethersProvider;
    } catch (error) {
      console.error("Error getting web3 provider:", error);
      return null;
    }
  };

  // Effect to reset approval status when vault, token, or amount changes
  useEffect(() => {
    setIsApproved(false);
    setApprovalError(null);
  }, [vault, selectedAsset, amount]);
  
  // Modified deposit function that accepts custom amount

  const displayReceiveAmount = useMemo(() => {
    if (needsSwap && receiveAmount) {
      return receiveAmount;
    }
    if (isLoadingQuote) {
      return "quote loading.."
    }
    return amount;
  }, [needsSwap, receiveAmount, amount, isLoadingQuote]);
  
  if (!vault) return null;

  // Helper function to format token balance for display (max 6 decimals)
  const formatBalance = (balance: string): string => {
    try {
      // Handle hex strings that start with "0x"
      let numericBalance = balance;
      if (typeof balance === "string" && balance.startsWith("0x")) {
        numericBalance = BigInt(balance).toString();
      }

      // Convert balance to a number
      const numBalance = Number(numericBalance);

      // Check if we have a valid number
      if (isNaN(numBalance)) {
        return "0.000000";
      }

      // Handle abbreviations for large numbers
      if (numBalance >= 1_000_000_000_000) {
        // Trillion+
        return (numBalance / 1_000_000_000_000).toFixed(2) + "T";
      } else if (numBalance >= 1_000_000_000) {
        // Billion+
        return (numBalance / 1_000_000_000).toFixed(2) + "B";
      } else if (numBalance >= 1_000_000) {
        // Million+
        return (numBalance / 1_000_000).toFixed(2) + "M";
      } else if (numBalance >= 1_000) {
        // Thousand+
        return (numBalance / 1_000).toFixed(2) + "K";
      } else if (numBalance >= 1) {
        // Between 1 and 999
        return numBalance.toFixed(3);
      } else if (numBalance === 0) {
        // Exactly zero
        return "0.000";
      } else {
        // Small fractions - use more decimal places but cap at 6
        // For very small numbers, show up to 6 decimal places
        if (numBalance < 0.0001) {
          return numBalance.toFixed(6);
        } else if (numBalance < 0.01) {
          return numBalance.toFixed(5);
        } else {
          return numBalance.toFixed(4);
        }
      }
    } catch (e) {
      console.error("Error formatting balance:", e);
      return "0.000000";
    }
  };

  const getButtonConfig = () => {
    // Step 1: Swap (if needed and not completed)
    if (needsSwap && !swapCompleted) {
      return {
        text: isSwapping ? "swapping..." : `swap ${sourceToken?.ticker || ''} to ${destinationToken?.ticker || ''}`,
        onClick: handleSwapStep,
        disabled: !amount || parseFloat(amount) <= 0 || isSwapping || !sourceToken || !destinationToken,
        loading: isSwapping
      };
    }
  
    // Step 2: Approve & Deposit
    return {
      text: isApproving ? "approving..." : isDepositing ? "depositing..." : "approve & deposit",
      onClick: handleApproveAndDeposit,
      disabled: !amount || parseFloat(amount) <= 0 || isApproving || isDepositing || !activeWallet,
      loading: isApproving || isDepositing
    };
  };

  const buttonConfig = getButtonConfig();

  

  // Function to handle Max button click
  const handleMaxButtonClick = () => {
    if (currentBalance && parseFloat(currentBalance) > 0) {
      // Get the balance and format it properly
      let balance = currentBalance;

      // Convert from wei to token units if needed (check if it's a hex string or very large number)
      if (
        typeof balance === "string" &&
        (balance.startsWith("0x") || parseFloat(balance) > 1e15)
      ) {
        // Assume it's in wei, convert to token units
        const balanceInWei = balance.startsWith("0x")
          ? BigInt(balance)
          : BigInt(parseFloat(balance).toString());
        const decimals = sourceToken?.decimals || 18;
        balance = ethers.formatUnits(balanceInWei, decimals);
      }

      // Set amount to the user's token balance (with slight reduction to avoid gas issues)
      const maxAmount = parseFloat(balance) * 0.9999;
    }
  };

  // Define the approval handler function
  async function handleApproveToken() {
    // Skip during SSR
    if (typeof window === "undefined") return;

    // Get web3 provider
    const provider = getWeb3Provider();

    // Validation checks
    if (!provider || !activeWallet) {
      alert("Please connect your wallet first");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setApprovalError("Please enter a valid amount");
      return;
    }

    // Start approval process
    setIsApprovalLoading(true);
    setApprovalError(null);
    await switchToSourceChain();

    try {
      // Import approval function dynamically
      const { approveTokenForVault } = await import(
        "@/utils/approveTokenForVault"
      );

      // Log approval attempt
      console.log("Attempting token approval:", {
        provider: "BrowserProvider",
        walletAddress: activeWallet.address,
        token: selectedAsset.id,
        vaultId: vault?.id,
        amount: amount,
      });

      // Execute approval with selected token and vault
      const result = await approveTokenForVault(
        provider,
        selectedAsset.id,
        vault?.id ?? 0,
        amount
      );

      if (result.success) {
        setIsApproved(true);
        console.log(`Approval successful: ${result.message}`);
      } else {
        setApprovalError(result.message);
      }
    } catch (error) {
      console.error("Approval error:", error);
      setApprovalError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsApprovalLoading(false);
    }
  }

  // Define the deposit handler function
  async function handleDepositConfirm() {
    // Skip during SSR
    if (typeof window === "undefined") return;

    // Get web3 provider
    const provider = getWeb3Provider();

    // Validation checks
    if (!provider || !activeWallet) {
      alert("Please connect your wallet first");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setDepositError("Please enter a valid amount");
      return;
    }

    // Start deposit process
    setIsDepositLoading(true);
    setDepositError(null);

    try {
      // Import deposit function dynamically - use the simplified version
      const { depositToVaultSimple } = await import(
        "@/utils/vaultDepositHelper"
      );

      // Log deposit attempt
      console.log("Attempting deposit with simplified function:", {
        provider: "BrowserProvider",
        walletAddress: activeWallet.address,
        token: selectedAsset.id,
        vaultId: vault?.id,
        amount: amount,
      });

      // Execute deposit with selected token and vault using simplified function
      const result = await depositToVaultSimple(
        provider,
        selectedAsset.id,
        vault?.id ?? 0,
        amount
      );

      if (result.success) {
        alert(
          `Deposit successful: ${amount} ${selectedAsset.name} deposited to ${vault?.name ?? "vault"}`
        );
        onOpenChange(false);
      } else {
        setDepositError(result.message);
      }
    } catch (error) {
      console.error("Deposit error:", error);
      setDepositError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsDepositLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-1/2 w-2/3 rounded-lg bg-[#18181B] border-[#27272A] border [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]">
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA] flex items-center gap-3">
            <div className="w-8 h-8 min-w-[2rem] bg-zinc-100/10 rounded-full flex items-center justify-center overflow-hidden">
              {TOKEN_SVG_MAPPING[vault.name] ? (
                <div className="w-5 h-5 relative flex items-center justify-center">
                  <Image
                    src={TOKEN_SVG_MAPPING[vault.name]}
                    alt={vault.name}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
              ) : (
                <span className="text-xs text-zinc-300">{vault.name[0]}</span>
              )}
            </div>
            <span>
              {vault.name}{" "}
              <span className="text-zinc-400">- {vault.ecosystem}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="bg-zinc-800/50 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-zinc-400">TVL</div>
              <div className="text-amber-500 font-medium">
                {vault.tvl === "Loading..."
                  ? "Loading..."
                  : vault.tvl === "N/A"
                    ? "N/A"
                    : `$${vault.tvl}`}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">APY</div>
              {/* Special case for Liquid Move ETH with hardcoded 11% APY */}
              {vault.name === "Liquid Move ETH" ? (
                <div className="flex items-center gap-3">
                  <div className="text-green-500 text-sm font-medium">
                    11.00%
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open(
                        vault.analyticsUrl ||
                          `https://analytics.example.com/vaults/${vault.id}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              ) : /* Special case for EIGEN Restaking with hardcoded 3.9% APY */
              vault.name === "EIGEN Restaking" ? (
                <div className="flex items-center gap-3">
                  <div className="text-green-500 text-sm font-medium">
                    3.90%
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open("https://app.ether.fi/eigen", "_blank")
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              ) : vault.hasRealAPY && vault.apy !== "N/A" ? (
                <div className="flex items-center gap-3">
                  <div className="text-green-500 text-sm font-medium">
                    {vault.apy}
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open(
                        vault.analyticsUrl ||
                          `https://analytics.example.com/vaults/${vault.id}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-zinc-400 text-sm">N/A</div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open(
                        vault.analyticsUrl ||
                          `https://analytics.example.com/vaults/${vault.id}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2 my-2">
            <Button
              variant="ghost"
              className={cn(
                "text-sm font-medium transition-colors",
                activeTab === "deposit"
                  ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent"
              )}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "text-sm font-medium transition-colors",
                activeTab === "withdraw"
                  ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent"
              )}
              onClick={() => setActiveTab("withdraw")}
            >
              Withdraw
            </Button>
          </div>

          {activeTab === "deposit" ? (
            <div className="bg-zinc-800/50 p-4 rounded-md">
              {!vaultOptions.depositEnabled ? (
                // Show message when deposits are disabled
                <div className="py-4 text-center text-amber-500">
                  {vaultOptions.disabledMessage ||
                    "Deposits are currently disabled for this vault."}
                </div>
              ) : (
                <>
                  {/* Amount Input with balance display */}
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <div>amount to deposit</div>
                    <div className="flex items-center">
                      <span className="text-xs text-zinc-500">
                        balance: {formatBalance(currentBalance)}{" "}
                        {sourceToken?.ticker || ""}
                      </span>
                    </div>
                    <SelectChainButton
                      chainsToShow={chainsToShow}
                      storeType="source"
                    />
                  </div>
                  <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14 relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => handleAmountChange(e)}
                      placeholder="0.0"
                      className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none font-mono"
                    />
                    {/* Max button - only show if there's a balance and user is connected */}
                    {activeWallet &&
                      currentBalance &&
                      parseFloat(currentBalance) > 0 && (
                        <button
                          type="button"
                          onClick={handleMaxButtonClick}
                          className="absolute right-[145px] top-1/2 transform -translate-y-1/2 px-2 py-1 rounded text-xs font-medium text-amber-500 hover:text-amber-400 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
                        >
                          MAX
                        </button>
                      )}

                    {/* Asset Selector styled like the swap interface */}
                    <div
                      className="h-full flex items-center justify-between px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 cursor-pointer min-w-[140px] relative"
                      onClick={(e) => {
                        // Find the select element and focus/click it
                        const selectEl =
                          e.currentTarget.querySelector("select");
                        if (selectEl) selectEl.click();
                      }}
                    >
                      <SelectTokenButton variant="source" vault={true} />
                    </div>
                  </div>

                  {/* User Receives Section */}
                  <div className="text-sm text-zinc-400 mb-2">
                    user receives
                  </div>
                  <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={displayReceiveAmount} // <-- Updated line
                      readOnly
                      placeholder="0.0"
                      className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none font-mono"
                    />

                    {/* Token Received - Show specific token for this vault with styling like the swap interface */}
                    <div className="h-full px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 flex items-center justify-between min-w-[150px]">
                      {VAULT_RECEIVE_TOKENS[vault.name] ? (
                        <>
                          <div className="flex items-center gap-2">
                            {VAULT_RECEIVE_TOKENS[vault.name].imagePath ? (
                              <div className="w-5 h-5 relative flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <Image
                                  src={
                                    VAULT_RECEIVE_TOKENS[vault.name].imagePath!
                                  }
                                  alt={VAULT_RECEIVE_TOKENS[vault.name].name}
                                  width={18}
                                  height={18}
                                  className="object-contain max-w-full max-h-full"
                                  style={{ objectFit: "contain" }}
                                />
                              </div>
                            ) : (
                              <TokenIcon
                                tokenId={VAULT_RECEIVE_TOKENS[vault.name].name}
                                fallbackIcon={
                                  VAULT_RECEIVE_TOKENS[vault.name].icon
                                }
                              />
                            )}
                            <div className="flex flex-col leading-none">
                              <span className="text-zinc-100">
                                {VAULT_RECEIVE_TOKENS[vault.name].name}
                              </span>
                              <span className="text-[10px] text-zinc-400 mt-[2px]">
                                {VAULT_RECEIVE_TOKENS[vault.name].name === "SUI"
                                  ? "Sui"
                                  : VAULT_RECEIVE_TOKENS[vault.name].name ===
                                      "SOL"
                                    ? "Solana"
                                    : vault.chain || "Ethereum"}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        "Token"
                      )}
                    </div>
                  </div>

                  {/* Approval Error message */}
                  {approvalError && (
                    <div className="text-red-400 text-sm mb-4">
                      {approvalError}
                    </div>
                  )}

                  {/* Deposit Error message */}
                  {depositError && (
                    <div className="text-red-400 text-sm mb-4">
                      {depositError}
                    </div>
                  )}

                  {/* Approval Success message */}
                  {isApproved && !approvalError && (
                    <div className="flex items-center text-green-500 text-sm mb-4">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {selectedAsset.name} approved for deposit
                    </div>
                  )}

                  {/* Approval and Deposit Buttons */}
                  <div className="space-y-3">
                    {/* <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        onClick={handleApproveToken}
                        disabled={
                          !amount ||
                          parseFloat(amount) <= 0 ||
                          isApprovalLoading ||
                          !activeWallet
                        }
                      >
                        {isApprovalLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Approving...
                          </>
                        ) : !activeWallet ? (
                          "Connect Wallet to Approve"
                        ) : (
                          `Approve ${.name}`
                        )}
                      </Button> */}
                    <BrandedButton
                      iconName={needsSwap && !swapCompleted ? "ArrowLeftRight" : "Coins"}
                      buttonText={buttonConfig.text}
                      onClick={buttonConfig.onClick}
                      disabled={buttonConfig.disabled}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-zinc-800/50 p-4 rounded-md">
              <div className="flex flex-col gap-4">
                <div className="text-center text-zinc-200">
                  Withdraw your funds from {vault.name}
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={() =>
                    window.open(
                      vault.analyticsUrl ||
                        `https://analytics.example.com/vaults/${vault.id}`,
                      "_blank"
                    )
                  }
                >
                  Withdraw
                </Button>
              </div>
            </div>
          )}

          {vault.explorerUrl && (
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 mt-2 border-zinc-700 text-zinc-300 hover:text-zinc-100"
              onClick={() => window.open(vault.explorerUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              <span>View on Explorer</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VaultModal;
