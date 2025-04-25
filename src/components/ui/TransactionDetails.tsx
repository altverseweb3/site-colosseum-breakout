import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Edit2,
  Check,
} from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import useWeb3Store, {
  useTransactionDetails,
  useSetSlippageValue,
  useSetReceiveAddress,
  useSetGasDrop,
  useDestinationChain,
} from "@/store/web3Store";

interface TransactionDetailsProps {
  protocolFeeUsd?: number;
  relayerFeeUsd?: number;
  totalFeeUsd?: number;
  estimatedTime?: string | number | null; // Allow number for seconds or null
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function TransactionDetails({
  totalFeeUsd = 0,
  estimatedTime = "~",
  isOpen,
  onToggle,
}: TransactionDetailsProps) {
  // ─── Zustand store hooks ─────────────────────────────────────────────────────
  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const transactionDetails = useTransactionDetails();
  const setSlippageValue = useSetSlippageValue();
  const setReceiveAddress = useSetReceiveAddress();
  const setGasDrop = useSetGasDrop();
  const destinationChain = useDestinationChain();

  // ─── Local state ─────────────────────────────────────────────────────────────
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(isOpen || false);
  const [slippageMode, setSlippageMode] = useState<"auto" | "custom">("auto");
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [slippageError, setSlippageError] = useState<string | null>(null);
  const [isEditingReceiveAddress, setIsEditingReceiveAddress] = useState(false);
  const [receiveAddressInput, setReceiveAddressInput] = useState("");

  // ─── Gas Drop ─────────────────────────────────────────────────────────────
  const [isGasDropEnabled, setIsGasDropEnabled] = useState<boolean>(false);
  const [gasDropValue, setGasDropValue] = useState<number>(50);
  // Calculate the actual gas drop amount
  const maxGasDrop = destinationChain?.gasDrop || 0;
  const actualGasDropAmount = (gasDropValue / 100) * maxGasDrop;
  // Format the gas drop display amount to 4 decimal places
  const formattedGasDropAmount = actualGasDropAmount.toFixed(4);
  // Get the destination chain symbol for display
  const gasDropSymbol = destinationChain?.symbol || "ETH";

  // Ref for click‐outside on receive address input
  const receiveAddressInputRef = useRef<HTMLInputElement>(null);

  // ─── Constants ───────────────────────────────────────────────────────────────
  const MAX_SLIPPAGE = 10;
  const DEFAULT_AUTO_SLIPPAGE = "auto";
  const DEFAULT_CUSTOM_SLIPPAGE = "3.00%";

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Format a slippage string (e.g. "3" or "3.0" or "3.00")
   * into "3.00%". If NaN, return DEFAULT_AUTO_SLIPPAGE.
   */
  const formatSlippageValue = (value: string): string => {
    const numeric = parseFloat(value.replace("%", ""));
    if (isNaN(numeric)) return DEFAULT_AUTO_SLIPPAGE;
    return `${numeric.toFixed(2)}%`;
  };

  /**
   * Save the receiveAddressInput into the store if valid,
   * otherwise revert to wallet address.
   */
  const saveReceiveAddress = useCallback(() => {
    if (/^0x[a-fA-F0-9]{40}$/.test(receiveAddressInput)) {
      setReceiveAddress(receiveAddressInput);
    } else if (!receiveAddressInput && activeWallet) {
      setReceiveAddressInput(activeWallet.address);
    }
    setIsEditingReceiveAddress(false);
  }, [receiveAddressInput, activeWallet, setReceiveAddress]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Initialize slippage + receive address on mount
  useEffect(() => {
    const storeSlippage = transactionDetails.slippage;
    if (storeSlippage === "auto" || !storeSlippage) {
      setSlippageMode("auto");
      if (storeSlippage !== "auto") {
        setSlippageValue("auto");
      }
    } else {
      setSlippageMode("custom");
      setCustomSlippage(storeSlippage.replace("%", ""));
    }

    if (transactionDetails.receiveAddress) {
      setReceiveAddressInput(transactionDetails.receiveAddress);
    } else if (activeWallet) {
      setReceiveAddressInput(activeWallet.address);
    }

    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click‐outside handler for receive address input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        receiveAddressInputRef.current &&
        !receiveAddressInputRef.current.contains(event.target as Node) &&
        isEditingReceiveAddress
      ) {
        saveReceiveAddress();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingReceiveAddress, saveReceiveAddress]);

  // Sync external isOpen prop
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsDetailsExpanded(isOpen);
    }
  }, [isOpen]);

  // Update the gas drop in the store when relevant values change
  useEffect(() => {
    // Set gas drop to 0 if switch is off
    const dropValue = isGasDropEnabled ? Number(formattedGasDropAmount) : 0;
    setGasDrop(dropValue);
  }, [isGasDropEnabled, formattedGasDropAmount, setGasDrop]);

  // ─── Event handlers ─────────────────────────────────────────────────────────

  const toggleDetails = () => {
    setIsDetailsExpanded((prev) => !prev);
    onToggle?.();
  };

  /**
   * Format estimatedTime (number in seconds or a string).
   */
  const formatEstimatedTime = (time?: string | number | null): string => {
    if (time === null || time === undefined) return "~";
    if (typeof time === "string" && isNaN(Number(time))) {
      return time;
    }
    const seconds = typeof time === "string" ? parseInt(time, 10) : time;
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      const hours = Math.round((seconds / 3600) * 10) / 10;
      return `${hours}h`;
    }
  };

  const handleSlippageModeChange = (mode: "auto" | "custom") => {
    setSlippageMode(mode);
    setSlippageError(null);

    if (mode === "auto") {
      setSlippageValue(DEFAULT_AUTO_SLIPPAGE);
    } else {
      if (customSlippage && !isNaN(parseFloat(customSlippage))) {
        const n = parseFloat(customSlippage);
        if (n > 0 && n <= MAX_SLIPPAGE) {
          setSlippageValue(formatSlippageValue(customSlippage));
        } else {
          setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
          setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
        }
      } else {
        setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
        setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
      }
    }
  };

  const handleCustomSlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) {
      setCustomSlippage(v);
      const n = parseFloat(v);
      if (v && !isNaN(n)) {
        if (n > MAX_SLIPPAGE) {
          setSlippageError(`Maximum slippage is ${MAX_SLIPPAGE}%`);
        } else if (n <= 0) {
          setSlippageError("Slippage must be greater than 0%");
        } else {
          setSlippageError(null);
        }
      } else {
        setSlippageError(null);
      }
    }
  };

  const handleCustomSlippageBlur = () => {
    if (customSlippage && !slippageError) {
      const n = parseFloat(customSlippage);
      if (!isNaN(n) && n > 0 && n <= MAX_SLIPPAGE) {
        setSlippageValue(formatSlippageValue(customSlippage));
      }
    } else if (customSlippage === "") {
      handleSlippageModeChange("auto");
    }
  };

  const startEditingReceiveAddress = useCallback(() => {
    setIsEditingReceiveAddress(true);
  }, []);

  const handleReceiveAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReceiveAddressInput(e.target.value);
  };

  // Determine what to show as the current receiving address
  const receivingAddress =
    transactionDetails.receiveAddress || activeWallet?.address || "0x000...000";

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 text-white border-zinc-900 border-[1px] rounded-[3px] px-2">
      {/* Summary Row */}
      <div
        className="flex items-center justify-between cursor-pointer py-2 numeric-input text-zinc-400 sm:text-[12px] text-[9px]"
        onClick={toggleDetails}
      >
        <div className="text-left">
          {!isDetailsExpanded ? "expand for details" : "transaction details"}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{formatEstimatedTime(estimatedTime)}</span>
          </div>
          {isDetailsExpanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isDetailsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="py-2">
          <div className="grid grid-cols-2 gap-y-2 text-[12px]">
            {/* Slippage Row */}
            <div className="text-left text-zinc-400">slippage</div>
            <div className="text-right flex items-center justify-end">
              <div className="flex space-x-1 mr-2">
                <button
                  className={`px-2 py-0.5 rounded-[3px] sm:text-xs text-[9px] border ${
                    slippageMode === "auto"
                      ? "bg-[#F59E0B25] text-[#F59E0B] border-[#61410B]"
                      : "bg-[#27272A75] text-[#FAFAFA50] border-[#27272A]"
                  }`}
                  onClick={() => handleSlippageModeChange("auto")}
                >
                  auto
                </button>
                <button
                  className={`px-2 py-0.5 rounded-[3px] sm:text-xs text-[9px] border ${
                    slippageMode === "custom"
                      ? "bg-[#F59E0B25] text-[#F59E0B] border-[#61410B]"
                      : "bg-[#27272A75] text-[#FAFAFA50] border-[#27272A]"
                  }`}
                  onClick={() => handleSlippageModeChange("custom")}
                >
                  custom %
                </button>
              </div>
              <div className="numeric-input text-zinc-200 min-w-[60px] text-right">
                {slippageMode === "auto" ? (
                  <div className="text-amber-500">auto</div>
                ) : (
                  <div className="flex items-center justify-end">
                    <input
                      type="text"
                      value={customSlippage}
                      onChange={handleCustomSlippageChange}
                      onBlur={handleCustomSlippageBlur}
                      className={`bg-transparent text-right w-10 px-0 outline-none ${
                        slippageError ? "text-red-500" : "text-zinc-200"
                      }`}
                      placeholder="0.00"
                      autoFocus
                    />
                    <span className="ml-0.5">%</span>
                    {slippageError && (
                      <div className="relative group ml-1">
                        <AlertCircle size={14} className="text-red-500" />
                        <div className="absolute top-full mt-1 right-0 bg-zinc-800 text-red-400 text-xs p-1 rounded-md w-48 hidden group-hover:block z-10">
                          {slippageError}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fee Row */}
            <div className="text-left text-zinc-400">fee</div>
            <div className="text-right numeric-input text-zinc-200">
              ${(Math.round(totalFeeUsd * 100) / 100).toFixed(2)}
            </div>
          </div>

          {/* Receiving Address Block */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-left text-amber-500 text-[12px] w-[100px]">
                receiving addr.
              </div>

              {isEditingReceiveAddress ? (
                <div className="flex items-center w-full ml-4">
                  <button
                    className="ml-7 text-amber-500 hover:text-amber-400 flex-shrink-0"
                    onClick={saveReceiveAddress}
                  >
                    <Check size={14} />
                  </button>
                  <input
                    ref={receiveAddressInputRef}
                    type="text"
                    value={receiveAddressInput}
                    onChange={handleReceiveAddressChange}
                    className="numeric-input bg-transparent text-right text-zinc-200 sm:text-xs text-[9px] w-full outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <span className="flex-grow" />
                  <button
                    className="text-amber-500 hover:text-amber-400 flex-shrink-0 mr-[5px]"
                    onClick={startEditingReceiveAddress}
                  >
                    <Edit2 size={14} />
                  </button>
                  <span className="text-zinc-200 sm:text-xs text-[9px] font-mono text-right">
                    {receivingAddress}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Gas Drop ─────────────────────────── */}
          <div className="mt-2 grid grid-cols-2 items-center text-[12px] gap-y-2">
            <div className="text-left text-zinc-400">gas drop</div>
            <div className="flex justify-end">
              <Switch
                checked={isGasDropEnabled}
                onCheckedChange={(checked) => {
                  setIsGasDropEnabled(checked);
                  if (!checked) {
                    setGasDrop(0);
                  }
                }}
                className="data-[state=checked]:bg-sky-500 data-[state=unchecked]:bg-zinc-800 focus-visible:ring-sky-400"
              />
            </div>
          </div>

          {isGasDropEnabled && (
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex-1">
                <Slider
                  value={[gasDropValue]}
                  onValueChange={(val) => setGasDropValue(val[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full 
                      [&_.bg-primary]:bg-sky-500 
                      [&_[role=slider]]:border-zinc-900 
                      [&_[role=slider]]:bg-sky-500
                      "
                />
              </div>
              <div className="text-right numeric-input text-zinc-200 sm:text-xs text-[9px] w-[80px] text-right">
                {formattedGasDropAmount} {gasDropSymbol}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
