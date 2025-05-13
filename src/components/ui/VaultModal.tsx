"use client";

import { useState, useEffect, useMemo } from "react";
import { ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import * as ethers from "ethers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import useWeb3Store from "@/store/web3Store";

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
    depositEnabled: false,
    disabledMessage: "Deposits are currently disabled for this vault.",
  },
};

// Mapping of vault names to their respective receive tokens
const VAULT_RECEIVE_TOKENS: Record<string, { name: string; icon: string }> = {
  "Liquid ETH Yield": { name: "liquidETH", icon: "🔹" },
  "Liquid BTC Yield": { name: "liquidBTC", icon: "🟠" },
  "Market-Neutral USD": { name: "liquidUSD", icon: "💵" },
  "EIGEN Restaking": { name: "eEIGEN", icon: "🟣" },
  "UltraYield Stablecoin Vault": { name: "UltraUSD", icon: "💲" },
  "Liquid Move ETH": { name: "LiquidMoveETH", icon: "🔄" },
  "The Bera ETH Vault": { name: "BeraETH", icon: "🐻" },
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
  const [amount, setAmount] = useState<string>("");

  // Get available deposit tokens for this vault or use default tokens
  const getVaultDepositOptions = (vaultName: string) => {
    const vaultOptions = VAULT_DEPOSIT_OPTIONS[vaultName];
    if (!vaultOptions) return { depositEnabled: true, tokens: [] };
    return vaultOptions;
  };

  // Get vault options with memoization
  const vaultOptions = useMemo(
    () =>
      vault
        ? getVaultDepositOptions(vault.name)
        : { depositEnabled: true, tokens: [] },
    [vault],
  );

  // Memoize the token list to avoid recreating it on every render
  const allTokensForVault = useMemo(
    () =>
      vault && vaultOptions.depositEnabled && vaultOptions.tokens
        ? [...vaultOptions.tokens, ...COMMON_TOKENS]
        : COMMON_TOKENS,
    [vault, vaultOptions.depositEnabled, vaultOptions.tokens],
  );

  // Initialize selected asset state
  const [selectedAsset, setSelectedAsset] = useState<TokenAsset>({
    id: "",
    name: "",
    icon: "",
  });

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

  // State for loading and error messages
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Get global web3 state
  const { activeWallet } = useWeb3Store();

  // Access web3Provider when needed
  const getWeb3Provider = () => {
    if (typeof window === "undefined") return null;

    try {
      // Check if window.ethereum is available
      if (window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
      }
      return null;
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

  if (!vault) return null;

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
        amount,
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
        error instanceof Error ? error.message : "Unknown error occurred",
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
        amount,
      );

      if (result.success) {
        alert(
          `Deposit successful: ${amount} ${selectedAsset.name} deposited to ${vault?.name ?? "vault"}`,
        );
        onOpenChange(false);
      } else {
        setDepositError(result.message);
      }
    } catch (error) {
      console.error("Deposit error:", error);
      setDepositError(
        error instanceof Error ? error.message : "Unknown error occurred",
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
            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
              <span className="text-xs text-zinc-300">{vault.name[0]}</span>
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
              {/* Special case for EIGEN Restaking */}
              {vault.name === "EIGEN Restaking" ? (
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open("https://app.ether.fi/eigen", "_blank")
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View APY</span>
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
                        "_blank",
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
                        "_blank",
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
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
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
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
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
                  {/* Amount Input */}
                  <div className="text-sm text-zinc-400 mb-2">
                    Amount to Deposit
                  </div>
                  <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none"
                    />

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
                      <div className="flex items-center gap-2">
                        <div className="text-lg">{selectedAsset.icon}</div>
                        <div className="flex flex-col leading-none">
                          <span className="text-zinc-100">
                            {selectedAsset.name}
                          </span>
                          {selectedAsset.id !== "sui" &&
                            selectedAsset.id !== "solana" && (
                              <span className="text-[10px] text-zinc-400 mt-[2px]">
                                {vault.chain || "Ethereum"}
                              </span>
                            )}
                        </div>
                      </div>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 flex-shrink-0 text-zinc-400"
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.66667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <select
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        value={selectedAsset.id}
                        onChange={(e) => {
                          const newAsset = allTokensForVault.find(
                            (asset) => asset.id === e.target.value,
                          );
                          if (newAsset) setSelectedAsset(newAsset);
                        }}
                      >
                        {/* Vault-specific tokens first */}
                        {vaultOptions.tokens &&
                          vaultOptions.tokens.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.icon} {asset.name}
                            </option>
                          ))}

                        {/* Add a separator if both vault-specific and common tokens exist */}
                        {vaultOptions.tokens &&
                          vaultOptions.tokens.length > 0 &&
                          COMMON_TOKENS.length > 0 && (
                            <option disabled>──────────</option>
                          )}

                        {/* Add common tokens */}
                        {COMMON_TOKENS.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.icon} {asset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* User Receives Section */}
                  <div className="text-sm text-zinc-400 mb-2">
                    User Receives
                  </div>
                  <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14">
                    <input
                      type="number"
                      value={amount} // Just using the same amount for now
                      readOnly
                      placeholder="0.0"
                      className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none"
                    />

                    {/* Token Received - Show specific token for this vault with styling like the swap interface */}
                    <div className="h-full px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 flex items-center justify-between min-w-[140px]">
                      {VAULT_RECEIVE_TOKENS[vault.name] ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="text-lg">
                              {VAULT_RECEIVE_TOKENS[vault.name].icon}
                            </div>
                            <div className="flex flex-col leading-none">
                              <span className="text-zinc-100">
                                {VAULT_RECEIVE_TOKENS[vault.name].name}
                              </span>
                              {VAULT_RECEIVE_TOKENS[vault.name].name !==
                                "SUI" &&
                                VAULT_RECEIVE_TOKENS[vault.name].name !==
                                  "SOL" && (
                                  <span className="text-[10px] text-zinc-400 mt-[2px]">
                                    {vault.chain || "Ethereum"}
                                  </span>
                                )}
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
                    {/* Approval Button (shown if not approved yet) */}
                    {!isApproved && (
                      <Button
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
                          `Approve ${selectedAsset.name}`
                        )}
                      </Button>
                    )}

                    {/* Deposit Button */}
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
                      onClick={handleDepositConfirm}
                      disabled={
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        isDepositLoading ||
                        !isApproved ||
                        !activeWallet
                      }
                    >
                      {isDepositLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : !activeWallet ? (
                        "Connect Wallet to Deposit"
                      ) : !isApproved ? (
                        "Approve First"
                      ) : (
                        "Confirm Deposit"
                      )}
                    </Button>
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
                      "_blank",
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
