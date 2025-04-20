"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import PoweredByAave from "./PoweredByAave";
import MetricsCard from "./SupplyBorrowMetrics";

const BorrowLend: React.FC = () => {
  const metricsData = [
    {
      label: "networth",
      value: "0.21",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "net APY",
      value: "2.07",
      suffix: "%",
      color: "text-white",
    },
    {
      label: "health factor",
      value: "1.54",
      color: "text-yellow-500",
    },
  ];
  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <MetricsCard metrics={metricsData} />
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>your positions</AccordionTrigger>
            <AccordionContent>discover your positions</AccordionContent>
          </AccordionItem>
        </Accordion>
        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLend;
