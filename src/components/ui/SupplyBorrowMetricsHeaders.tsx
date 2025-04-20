import React from "react";
import MetricsCard from "./SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "./SupplyBorrowToggle";

const SupplyBorrowMetricsHeaders = ({
  activeTab = "borrow",
  onTabChange = () => {},
}) => {
  // First card metrics (networth, net APY, health factor)
  const metricsDataHealth = [
    {
      label: "Net Worth",
      value: "0.21",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Net APY",
      value: "2.07",
      suffix: "%",
      color: "text-white",
    },
    {
      label: "Health Factor",
      value: "100123.59",
      color: "text-amber-500",
      showButton: true,
      buttonText: "risk details",
    },
  ];

  // Second card metrics (market size, available, borrows)
  const marketMetrics = [
    {
      label: "Market Size",
      value: "23.35B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Available",
      value: "14.18B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Borrows",
      value: "8.53B",
      prefix: "$",
      color: "text-white",
    },
  ];

  const handleButtonClick = (metricLabel: string) => {
    console.log(`Button clicked for ${metricLabel}`);
    // Add your logic for showing risk details here
  };

  return (
    <div className="w-full pb-6">
      {/* Mobile and tablet views */}
      <div className="flex flex-col gap-4 xl:hidden">
        {/* Supply/Borrow Toggle at the TOP for mobile - full width container */}
        <div className="w-full">
          {/* This ensures your SupplyBorrowToggle component is used and fills the width */}
          <SupplyBorrowToggle
            activeTab={activeTab}
            onTabChange={onTabChange}
            className="w-full"
          />
        </div>

        {/* Metrics cards stacked vertically with full width */}
        <div className="w-full">
          <MetricsCard
            metrics={metricsDataHealth}
            onButtonClick={handleButtonClick}
            className="w-full"
          />
        </div>
        <div className="w-full">
          <MetricsCard metrics={marketMetrics} className="w-full" />
        </div>
      </div>

      {/* Desktop view with responsive layout - only show on xl screens */}
      <div className="hidden xl:flex xl:flex-wrap xl:items-end xl:justify-between gap-4">
        <div className="flex-shrink-0 order-1 xl:order-1 w-full xl:w-auto mb-4 xl:mb-0">
          <SupplyBorrowToggle activeTab={activeTab} onTabChange={onTabChange} />
        </div>

        {/* Metrics cards with responsive layout */}
        <div className="flex flex-wrap justify-end gap-4 order-2 xl:order-2 w-full xl:w-auto">
          <div className="w-full xl:w-auto">
            <MetricsCard
              metrics={metricsDataHealth}
              onButtonClick={handleButtonClick}
              className="w-full xl:w-auto"
            />
          </div>
          <div className="w-full xl:w-auto mt-4 xl:mt-0">
            <MetricsCard metrics={marketMetrics} className="w-full xl:w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyBorrowMetricsHeaders;
