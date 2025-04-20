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

  return (
    <div className={`flex p-1 w-full ${className}`}>
      <Button
        className={`${
          activeButton === "supply"
            ? "bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B]"
            : "bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A]"
        } inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-1 px-4 border-[1px] rounded-lg text-sm h-8 flex-1 lg:flex-none lg:w-36 mr-2`}
        onClick={() => handleClick("supply")}
      >
        supply
      </Button>
      <Button
        className={`${
          activeButton === "borrow"
            ? "bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B]"
            : "bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A]"
        } inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-1 px-4 border-[1px] rounded-lg text-sm h-8 flex-1 lg:flex-none lg:w-36`}
        onClick={() => handleClick("borrow")}
      >
        borrow
      </Button>
    </div>
  );
};

export default SupplyBorrowToggle;
