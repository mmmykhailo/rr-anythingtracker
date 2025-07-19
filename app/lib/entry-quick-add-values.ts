import type { TrackerType } from "./trackers";

export const quickAddValuesMap: Record<
  TrackerType,
  Array<{
    label: string;
    value: number;
  }> | null
> = {
  liters: [
    { label: "0.25L", value: 0.25 },
    { label: "0.5L", value: 0.5 },
    { label: "1L", value: 1 },
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
