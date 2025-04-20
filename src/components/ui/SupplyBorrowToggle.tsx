import { SetStateAction, useState } from "react";
import { Button } from "./Button";

interface SupplyBorrowToggleProps {
  activeTab?: string;
  onTabChange?: (button: SetStateAction<string>) => void;
  className?: string;
}

const SupplyBorrowToggle = ({
  activeTab = "borrow",
  onTabChange = () => {},
  className = "",
}: SupplyBorrowToggleProps) => {
  const [activeButton, setActiveButton] = useState(activeTab);

  const handleClick = (button: SetStateAction<string>) => {
    setActiveButton(button);
    onTabChange(button);
  };

  // Common button classes extracted to avoid repetition
  const commonButtonClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-2 px-8 border border-solid rounded-lg text-sm h-10 w-full sm:flex-1 min-w-[150px]";

  // Active and inactive style classes
  const activeStyle =
    "bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B]";
  const inactiveStyle =
    "bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A]";

  return (
    <div className={`flex flex-col sm:flex-row p-1 w-full gap-2 ${className}`}>
      <Button
        className={`${commonButtonClasses} ${activeButton === "supply" ? activeStyle : inactiveStyle}`}
        onClick={() => handleClick("supply")}
      >
        supply
      </Button>
      <Button
        className={`${commonButtonClasses} ${activeButton === "borrow" ? activeStyle : inactiveStyle}`}
        onClick={() => handleClick("borrow")}
      >
        borrow
      </Button>
    </div>
  );
};

export default SupplyBorrowToggle;
