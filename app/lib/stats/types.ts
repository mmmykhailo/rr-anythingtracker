export const statsPeriods = ["1M", "3M", "YTD", "custom"] as const;

export type StatsPeriod = (typeof statsPeriods)[number];

export interface Stats {
  totalTracked: number;
  averagePerDay: number;
  currentGoalStreak: number;
  longestGoalStreak: number;
  missedGoalDays: number;
  consistencyScore: number;
}
