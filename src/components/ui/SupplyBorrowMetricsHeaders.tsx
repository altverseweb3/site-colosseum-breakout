import React from "react";
import MetricsCard from "./SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "./SupplyBorrowToggle";

const SupplyBorrowMetricsHeaders = ({
  activeTab = "borrow",
  onTabChange = () => {},
}) => {
  const metricsDataHealth = [
    {
      label: "networth",
      value: "0.21",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "net APY",
      value: "2.07%",
      color: "text-white",
    },
    {
      label: "health factor",
      value: "1.59",
      color: "text-amber-500",
    },
  ];

  const metricsDataMarket = [
    {
      label: "market size",
      value: "23.35B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "available",
      value: "14.18B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "borrows",
      value: "8.53B",
      prefix: "$",
      color: "text-white",
    },
  ];

  return (
    <div className="w-full pb-6">
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="w-full flex flex-col gap-4">
          <div className="w-full">
            <MetricsCard
              metrics={metricsDataHealth}
              className="w-full max-w-full"
            />
          </div>
          <div className="w-full">
            <MetricsCard
              metrics={metricsDataMarket}
              className="w-full max-w-full"
            />
          </div>
        </div>
        <div className="w-full flex justify-center">
          <div className="w-full">
            <SupplyBorrowToggle
              activeTab={activeTab}
              onTabChange={onTabChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <div className="hidden lg:flex lg:items-end lg:justify-between gap-4">
        <div className="flex-shrink-0">
          <SupplyBorrowToggle activeTab={activeTab} onTabChange={onTabChange} />
        </div>
        <div className="flex gap-4 justify-end">
          <div className="w-[254px]">
            <MetricsCard
              metrics={metricsDataHealth}
              className="max-w-[254px]"
            />
          </div>
          <div className="w-[254px]">
            <MetricsCard
              metrics={metricsDataMarket}
              className="max-w-[254px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyBorrowMetricsHeaders;
