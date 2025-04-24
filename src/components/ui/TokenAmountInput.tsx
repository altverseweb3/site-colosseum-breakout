import React from "react";
import PersistentAmountDisplay from "@/components/ui/PersistentAmountDisplay";
interface TokenAmountInputProps {
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dollarValue?: number;
  readOnly?: boolean;
  placeholder?: string;
  isLoadingQuote?: boolean;
  variant?: "source" | "destination"; // Add variant to distinguish receive amount
}

export function TokenAmountInput({
  amount,
  onChange,
  dollarValue = 0,
  readOnly = false,
  placeholder = "0",
  isLoadingQuote = false,
  variant = "source",
}: TokenAmountInputProps) {
  const isLoading = isLoadingQuote && readOnly;

  // Only apply the faded style for disabled source inputs
  // For destination/receive inputs, we want them to look normal even when readOnly
  const shouldApplyDisabledStyle = readOnly && variant === "source";

  return (
    <div className="flex-1 flex flex-col items-end">
      <PersistentAmountDisplay
        isLoading={isLoading}
        amount={amount}
        variant={variant}
        onChange={onChange || (() => {})}
        placeholder={placeholder}
        shouldApplyDisabledStyle={shouldApplyDisabledStyle}
        readOnly={readOnly}
      />
      <span className="text-zinc-400 text-sm numeric-input">
        ${(Math.round(dollarValue * 100) / 100).toFixed(2)}
      </span>
    </div>
  );
}

export default TokenAmountInput;
