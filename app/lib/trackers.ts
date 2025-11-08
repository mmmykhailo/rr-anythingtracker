export const trackerTypes = ["liters", "steps", "none", "checkbox"] as const;

export type TrackerType = (typeof trackerTypes)[number];

export const trackerTypesLabels: Record<TrackerType, string> = {
  none: "None",
  checkbox: "Checkbox",
  liters: "Liters",
  steps: "Steps",
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
