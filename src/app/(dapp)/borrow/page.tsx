"use client";

import React from "react";
import { useTokenTransfer } from "@/utils/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";
import BorrowLend from "@/components/ui/BorrowLend";

const BorrowLendComponent: React.FC = () => {


  return (
    <BorrowLend />
  );
};

export default BorrowLendComponent;
