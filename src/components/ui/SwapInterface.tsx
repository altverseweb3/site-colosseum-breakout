import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";

// Use a string literal type for the icon names
type AvailableIconName = "Coins" | "Cable";

interface SwapInterfaceProps {
  children: ReactNode;
  actionButton: {
    text: string;
    iconName: AvailableIconName;
    onClick?: () => void;
    disabled?: boolean;
  };
  className?: string;
  // Transaction details props
  exchangeRate?: string;
  exchangeValue?: string;
  gasFee?: string;
  estimatedTime?: string;
  transactionDetails?: {
    slippage: string;
    fee: { percentage: string; value: string };
    relayerFees: string;
    sending: string;
    receiving: string;
  };
}

export function SwapInterface({
  children,
  actionButton,
  className = "",
  exchangeRate,
  exchangeValue,
  gasFee,
  estimatedTime,
  transactionDetails,
}: SwapInterfaceProps) {
  return (
    <Card
      className={`w-full bg-zinc-950 border-none rounded-[6px] ${className}`}
    >
      <CardContent className="p-2">
        <div className="space-y-[3px]">{children}</div>
        <div className="mt-[10px]">
          <BrandedButton
            buttonText={actionButton.text}
            iconName={actionButton.iconName}
            onClick={actionButton.onClick}
            disabled={actionButton.disabled}
            className="h-[40px] w-full"
          />
        </div>

        <TransactionDetails
          exchangeRate={exchangeRate}
          exchangeValue={exchangeValue}
          gasFee={gasFee}
          estimatedTime={estimatedTime}
          transactionDetails={transactionDetails}
        />
      </CardContent>
    </Card>
  );
}

export default SwapInterface;
