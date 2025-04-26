// components/ui/PersistentAmountDisplay.tsx
import { ChangeEvent, useEffect, useState } from "react";
import { NumberTicker } from "@/components/ui/NumberTicker";

interface PersistentAmountDisplayProps {
  isLoading: boolean;
  amount: number | string;
  variant: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  shouldApplyDisabledStyle?: boolean;
  readOnly?: boolean;
}

const PersistentAmountDisplay: React.FC<PersistentAmountDisplayProps> = ({
  isLoading,
  amount,
  variant,
  onChange,
  placeholder,
  shouldApplyDisabledStyle,
  readOnly,
}) => {
  // Track last displayed value for smooth ticker animations
  const [lastDisplayedAmount, setLastDisplayedAmount] = useState(0);

  useEffect(() => {
    if (!isLoading && amount !== undefined && amount !== null) {
      setLastDisplayedAmount(parseFloat(Number(amount).toFixed(3)));
    }
  }, [amount, isLoading]);

  // --------------------------------------------------------------------------
  // sanitize incoming value: allow only digits and one “.”
  const handleSanitizedChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // strip out anything that is not 0–9 or "."
    v = v.replace(/[^0-9.]/g, "");
    // if more than one ".", keep the first and remove the rest
    const parts = v.split(".");
    if (parts.length > 2) {
      v = parts[0] + "." + parts.slice(1).join("");
    }
    // write it back so React sees the real value
    e.target.value = v;
    onChange(e);
  };
  // --------------------------------------------------------------------------

  const commonClass = `
    w-full 
    bg-transparent 
    text-3xl 
    focus:outline-none 
    text-right 
    numeric-input 
    [appearance:textfield] 
    [&::-webkit-outer-spin-button]:appearance-none 
    [&::-webkit-inner-spin-button]:appearance-none
    ${shouldApplyDisabledStyle ? "opacity-70" : ""}
  `;

  // Destination (read-only ticker with pulse on loading)
  if (variant === "destination") {
    return (
      <div className={isLoading ? "animate-pulse" : ""}>
        <NumberTicker
          value={Number(amount)}
          startValue={lastDisplayedAmount}
          decimalPlaces={3}
          stiffness={500}
          damping={90}
          className={commonClass}
        />
      </div>
    );
  }
  // Source (editable input)
  else if (variant !== "destination") {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={String(amount)}
        onChange={handleSanitizedChange}
        placeholder={placeholder}
        className={commonClass}
        readOnly={readOnly}
        disabled={readOnly}
      />
    );
  }

  // fallback (shouldn't ever hit)
  return null;
};

export default PersistentAmountDisplay;
