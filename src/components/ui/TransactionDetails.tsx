import { useState } from "react";
import { Fuel, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface TransactionDetailsProps {
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
  className?: string;
}

export function TransactionDetails({
  exchangeRate = "1 USDC = 0.000362352 ETH",
  exchangeValue = "$1.00",
  gasFee = "<$0.01",
  estimatedTime = "20s",
  transactionDetails = {
    slippage: "3.25%",
    fee: { percentage: "0.25%", value: "$5.29" },
    relayerFees: "$1.87",
    sending: "0x000...000",
    receiving: "0x111...111",
  },
}: TransactionDetailsProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const toggleDetails = () => {
    setIsDetailsExpanded(!isDetailsExpanded);
  };
  return (
    <div className="mt-2 text-white border-zinc-900 border-[1px] rounded-[3px] px-2">
      {/* Summary Row (Always Visible) */}
      <div
        className="flex items-center justify-between cursor-pointer py-2 numeric-input text-zinc-400 sm:text-[12px] text-[9px]"
        onClick={toggleDetails}
      >
        <div className="text-left">
          {exchangeRate} ({exchangeValue})
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Fuel size={14} />
            <span>{gasFee}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{estimatedTime}</span>
          </div>
          {isDetailsExpanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {/* Expanded Details with Animation */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isDetailsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="py-2">
          <div className="grid grid-cols-2 gap-y-2 text-[12px]">
            <div className="text-left text-zinc-400">Slippage</div>
            <div className="text-right numeric-input text-zinc-200">
              {transactionDetails.slippage}
            </div>

            <div className="text-left text-zinc-400">
              Fee ({transactionDetails.fee.percentage})
            </div>
            <div className="text-right numeric-input text-zinc-200">
              {transactionDetails.fee.value}
            </div>

            <div className="text-left text-zinc-400">Relayer fees</div>
            <div className="text-right numeric-input text-zinc-200">
              {transactionDetails.relayerFees}
            </div>

            <div className="text-left text-zinc-400">Sending</div>
            <div className="text-right numeric-input text-zinc-200">
              {transactionDetails.sending}
            </div>

            <div className="text-left text-zinc-400">Receiving</div>
            <div className="text-right numeric-input text-zinc-200">
              {transactionDetails.receiving}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
