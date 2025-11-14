export const trackerTypes = [
  "liters",
  "steps",
  "kilometers",
  "kilograms",
  "none",
  "checkbox",
] as const;

export type TrackerType = (typeof trackerTypes)[number];

export const trackerTypesLabels: Record<
  TrackerType,
  {
    shortest: string;
    short: string;
    long: string;
  }
> = {
  none: {
    shortest: "",
    short: "None",
    long: "None",
  },
  checkbox: {
    shortest: "",
    short: "Checkbox",
    long: "Checkbox",
  },
  liters: {
    shortest: "L",
    short: "liters",
    long: "Liters (L)",
  },
  steps: {
    shortest: "steps",
    short: "steps",
    long: "Steps",
  },
  kilometers: {
    shortest: "km",
    short: "km",
    long: "Kilometers (km)",
  },
  kilograms: {
    shortest: "kg",
    short: "kg",
    long: "Kilograms (kg)",
  },
};

export type Tracker = {
  id: string;
  title: string;
  type: TrackerType;
  isNumber: boolean;
  values: {
    [dateString: string]: number;
  };
  goal?: number;
  parentId?: string;
  isHidden?: boolean;
  deletedAt?: Date;
  updatedAt?: Date; // Timestamp for when tracker metadata was last modified
};
