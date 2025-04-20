"use client";

import React, { useState } from "react";
import BorrowComponent from "@/components/ui/BorrowComponent";
import PoweredByAave from "@/components/ui/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/SupplyComponent";

const BorrowLend: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <SupplyBorrowMetricsHeaders
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {activeTab === "supply" ? <SupplyComponent /> : <BorrowComponent />}

        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLend;
