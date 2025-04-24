import React from "react";
import { DollarSign } from "lucide-react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

const SupplyUnOwnedCard = ({
  title = "usd coin",
  subtitle = "USDC",
  balance = "0.0049170",
  dollarAmount = "0.72",
  supplyAPY = "1.97",
  canBeCollateral = true,
  onSupply = () => {},
  onDetails = () => {},
}) => {
  return (
    <Card className=" text-white border border-[#232326] w-[271px] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0">
          <DollarSign size={18} color="white" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {subtitle}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        {/* Balance row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{balance}</div>
            <div className="text-gray-400 text-xs">${dollarAmount}</div>
          </div>
        </div>

        {/* APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply APY</div>
          <div className="text-sm">{supplyAPY}%</div>
        </div>

        {/* Collateral indicator row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">can be collateral</div>
          {canBeCollateral && <div className="text-amber-500">✓</div>}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <PrimaryButton onClick={onSupply}>supply</PrimaryButton>
        <GrayButton onClick={onDetails}>details</GrayButton>
      </CardFooter>
    </Card>
  );
};

export default SupplyUnOwnedCard;
