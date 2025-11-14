import { conversionFactors, formatStoredValue } from "./number-conversions";
import type { TrackerType } from "./trackers";

export const quickAddValuesMap: Record<
  TrackerType,
  Array<{
    label: string;
    value: number;
  }> | null
> = {
  liters: [250, 330, 500, 1000].map((value) => ({
    label: formatStoredValue(value, "liters", true),
    value,
  })),
  kilometers: [500, 1000, 5000, 10000].map((value) => ({
    label: formatStoredValue(value, "kilometers", true),
    value,
  })),
  kilograms: [100, 500, 1000, 5000].map((value) => ({
    label: formatStoredValue(value, "kilograms", true),
    value,
  })),
  checkbox: null,
  steps: [100, 500, 1000, 5000].map((value) => ({
    label: value.toString(),
    value,
  })),
  none: [1, 5, 10, 50].map((value) => ({
    label: formatStoredValue(value * conversionFactors.none, "none", true),
    value: value * conversionFactors.none,
  })),
};
