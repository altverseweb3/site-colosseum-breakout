"use client";

import React from "react";
import { useTokenTransfer } from "@/utils/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";
import useWeb3Store from "@/store/web3Store";

const SwapComponent: React.FC = () => {
  // Use the shared hook for all swap functionality
  const {
    amount,
    handleAmountChange,
    isButtonDisabled,
    handleTransfer,
    receiveAmount,
    isLoadingQuote,
    sourceToken,
    destinationToken,
    estimatedTimeSeconds,
    totalFeeUsd,
    protocolFeeUsd,
    relayerFeeUsd,
  } = useTokenTransfer({
    type: "swap",
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log(
        `Swap succeeded: ${amount} ${sourceToken.ticker} → ${destinationToken?.ticker}`,
      );
    },
  });

  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  return (
    <TokenTransfer
      amount={amount}
      onAmountChange={handleAmountChange}
      isButtonDisabled={isButtonDisabled}
      hasActiveWallet={!!requiredWallet}
      onTransfer={handleTransfer}
      transferType="swap"
      actionIcon="Coins"
      showDestinationTokenSelector={true}
      receiveAmount={receiveAmount}
      isLoadingQuote={isLoadingQuote}
      hasSourceToken={!!sourceToken}
      hasDestinationToken={!!destinationToken}
      estimatedTimeSeconds={estimatedTimeSeconds}
      protocolFeeUsd={protocolFeeUsd ?? undefined}
      relayerFeeUsd={relayerFeeUsd ?? undefined}
      totalFeeUsd={totalFeeUsd ?? undefined}
    />
  );
};

export default SwapComponent;
