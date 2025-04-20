import React from "react";
import { Card, CardContent } from "./Card";

// Define the type for a single metric
interface Metric {
  label: string;
  value: string;
  color?: string;
  prefix?: string;
  suffix?: string;
}

// Define the props interface for the MetricsCard component
interface MetricsCardProps {
  metrics: Metric[];
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  return (
    <Card className="rounded-xl border border-zinc-800 bg-black text-card-foreground shadow">
      <CardContent className="flex justify-between py-6 px-8">
        {metrics.map((metric, index) => (
          <div key={index} className="flex flex-col gap-3">
            <span className="text-2xl text-gray-400 font-light">
              {metric.label}
            </span>
            <span
              className={`text-2xl font-mono tracking-wide ${metric.color || "text-white"}`}
              style={{ letterSpacing: "0.05em" }}
            >
              {metric.prefix || ""}
              {metric.value}
              {metric.suffix || ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
