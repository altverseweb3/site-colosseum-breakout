import React from "react";

interface TokenAmountInputProps {
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dollarValue?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export function TokenAmountInput({
  amount,
  onChange,
  dollarValue = "$0.00",
  readOnly = false,
  placeholder = "0",
}: TokenAmountInputProps) {
  return (
    <div className="flex-1 flex flex-col items-end">
      <input
        type="number"
        value={amount}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-3xl focus:outline-none text-right numeric-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        readOnly={readOnly}
      />
      <span className="text-zinc-400 text-sm numeric-input">{dollarValue}</span>
    </div>
  );
}

export default TokenAmountInput;
