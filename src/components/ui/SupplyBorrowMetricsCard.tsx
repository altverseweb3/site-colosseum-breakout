import React from "react";
import { Card, CardContent } from "./Card";

interface Metric {
  label: string;
  value: string;
  color?: string;
  prefix?: string;
  suffix?: string;
}

interface MetricsCardProps {
  metrics: Metric[];
  className?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics, className }) => {
  const getWidthForLabel = (label: string) => {
    switch (label) {
      case "health factor":
        return "90px";
      case "market size":
        return "80px";
      case "networth":
        return "65px";
      case "net APY":
        return "65px";
      case "available":
        return "65px";
      case "borrows":
        return "65px";
      default:
        return "60px";
    }
  };

  return (
    <Card
      className={`rounded-[6px] border border-[#232326] bg-transparent text-card-foreground shadow ${className || ""}`}
    >
      <CardContent className="pt-[19px] pr-[20px] pb-[19px] pl-[20px]">
        <div className="flex justify-between">
          {metrics.map((metric, index) => (
            <div
              key={`metric-${index}`}
              className="flex flex-col"
              style={{ width: getWidthForLabel(metric.label) }}
            >
              <div className="text-[12px] text-[#FFFFFF80] font-[400] font-['Urbanist'] leading-[14px] mb-1 whitespace-nowrap">
                {metric.label}
              </div>
              <div>
                <span
                  className={`text-[12px] font-['Urbanist'] font-[400] ${metric.color || "text-white"}`}
                >
                  {metric.prefix || ""}
                  {metric.value}
                  {metric.suffix || ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
