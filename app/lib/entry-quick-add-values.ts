import type { TrackerType } from "./trackers";

export const quickAddValuesMap: Record<
  TrackerType,
  Array<{
    label: string;
    value: number;
  }> | null
> = {
  liters: [
    { label: "0.25L", value: 250 }, // 250 milliliters
    { label: "0.5L", value: 500 }, // 500 milliliters
    { label: "1L", value: 1000 }, // 1000 milliliters
  ],
  checkbox: null,
  steps: [
    { label: "100", value: 100 },
    { label: "500", value: 500 },
    { label: "1000", value: 1000 },
  ],
  none: [
    { label: "1", value: 1 },
    { label: "5", value: 5 },
  ],
};
