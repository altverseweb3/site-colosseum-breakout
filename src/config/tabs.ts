import { Tab } from "@/types/ui";

interface TabConfig {
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export const TAB_CONFIG: Record<Tab, TabConfig> = {
  swap: {
    label: "swap",
  },
  bridge: {
    label: "bridge",
  },
  stake: {
    label: "stake",
    disabled: true,
    disabledMessage: "Coming soon",
  },
  borrow: {
    label: "borrow",
    disabled: true,
    disabledMessage: "Coming soon",
  },
  dashboard: {
    label: "dashboard",
    disabled: true,
    disabledMessage: "Coming soon",
  },
};
