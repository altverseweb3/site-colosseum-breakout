import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface Metric {
  label: string;
  value: string;
  color?: string;
  prefix?: string;
  suffix?: string;
  showButton?: boolean;
  buttonText?: string;
}

interface MetricsCardProps {
  metrics: Metric[];
  className?: string;
  onButtonClick?: (metricLabel: string) => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  metrics,
  className,
  onButtonClick,
}) => {
  // Determine whether to use fixed width or responsive width
  const useFixedWidth =
    !className || (!className.includes("w-") && !className.includes("max-w-"));

  return (
    <Card
      className={`
                rounded-md border border-[#232326] bg-transparent text-card-foreground shadow
                ${useFixedWidth ? "w-[350px] h-auto min-h-[64px]" : ""}
                ${className || ""}
            `}
    >
      <CardContent className="flex flex-wrap h-full items-center justify-center px-5 py-4">
        {metrics.map((metric, index) => (
          <div
            key={`metric-${index}`}
            className={`flex flex-col items-center text-center mb-2 md:mb-0 ${index < metrics.length - 1 ? "mr-6 md:mr-10" : ""} ${metric.showButton ? "min-w-[90px]" : "min-w-[70px]"}`}
          >
            <div className="mb-1.5 whitespace-nowrap text-[14px] font-[400] font-['Urbanist'] leading-4 text-[#FFFFFF80]">
              {metric.label}
            </div>
            <div className="flex items-center">
              {metric.prefix && (
                <span className="numeric-input text-base font-medium text-white">
                  {metric.prefix}
                </span>
              )}

              <span
                className={`numeric-input text-base font-medium ${metric.color || "text-white"}`}
              >
                {metric.value}
              </span>

              {metric.suffix && (
                <span className="numeric-input text-base font-medium text-white">
                  {metric.suffix}
                </span>
              )}

              {metric.showButton && metric.buttonText && (
                <button
                  onClick={() => onButtonClick?.(metric.label)}
                  className="ml-2 rounded bg-[#232326] px-2 py-[2px] text-xs text-[#FFFFFF80] font-['Urbanist'] leading-none whitespace-nowrap hover:bg-[#2a2a2e]"
                >
                  {metric.buttonText}
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
