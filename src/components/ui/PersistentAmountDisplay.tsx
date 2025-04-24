// Component wrapper that manages the persistent value
import { ChangeEvent, useEffect, useState } from "react";
import { NumberTicker } from "./NumberTicker"; // Adjust import path as needed

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
  // State to track the last displayed value for smooth transitions
  const [lastDisplayedAmount, setLastDisplayedAmount] = useState(0);

  // Update the last displayed value when amount changes and not loading
  useEffect(() => {
    if (!isLoading && amount) {
      // Round to 3 decimal places using parseFloat and toFixed
      setLastDisplayedAmount(parseFloat(Number(amount).toFixed(3)));
    }
  }, [amount, isLoading]);

  // Common class for both states
  const commonClass = `w-full bg-transparent text-3xl focus:outline-none text-right numeric-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
    shouldApplyDisabledStyle ? "opacity-70" : ""
  }`;

  if (variant === "destination") {
    // For destination variant, we keep the same NumberTicker component,
    // but conditionally add the pulse animation class to its wrapper
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
  } else if (variant !== "destination") {
    // For the input variant
    return (
      <input
        type="number"
        value={amount}
        onChange={onChange ?? (() => {})}
        placeholder={placeholder}
        className={commonClass}
        readOnly={readOnly}
        disabled={readOnly}
      />
    );
  }

  // Fallback return (shouldn't reach here)
  return null;
};

export default PersistentAmountDisplay;
