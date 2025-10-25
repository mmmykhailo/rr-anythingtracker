import { formatDateString } from "~/lib/dates";
import type { Stats } from "./types";

// TODO: optimize this to avoid unnecessary loops
export function calculateStats(
  entries: Array<{ date: string; value: number }>,
  fromDate: Date,
  toDate: Date,
  goalValue?: number
): Stats {
  const dateValues = new Map<string, number>();
  entries.forEach((entry) => {
    const current = dateValues.get(entry.date) || 0;
    dateValues.set(entry.date, current + entry.value);
  });

  const dateRange: string[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    dateRange.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }

  let totalTracked = 0;
  dateRange.forEach((dateStr) => {
    const value = dateValues.get(dateStr) || 0;
    totalTracked += value;
  });

  const totalDays = dateRange.length;
  const averagePerDay = totalDays > 0 ? totalTracked / totalDays : 0;

  let currentGoalStreak = 0;
  let longestGoalStreak = 0;
  let missedGoalDays = 0;
  let consistencyScore = 0;

  if (goalValue && goalValue > 0) {
    // Find the first date with any tracked entry
    const firstTrackedIndex = dateRange.findIndex((dateStr) =>
      dateValues.has(dateStr)
    );

    // Only calculate goal metrics from the first tracked day onwards
    const goalDateRange =
      firstTrackedIndex >= 0 ? dateRange.slice(firstTrackedIndex) : [];

    let currentStreak = 0;
    let maxStreak = 0;
    let goalMetDays = 0;
    let totalDaysWithGoal = goalDateRange.length;

    goalDateRange.forEach((dateStr, i) => {
      const value = dateValues.get(dateStr) || 0;

      if (value >= goalValue) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        goalMetDays++;
      } else {
        if (i === goalDateRange.length - 1) {
          return;
        }
        currentStreak = 0;
        missedGoalDays++;
      }
    });

    currentGoalStreak = currentStreak;
    longestGoalStreak = maxStreak;
    consistencyScore =
      totalDaysWithGoal > 0
        ? Math.round((goalMetDays / totalDaysWithGoal) * 100)
        : 0;
  }

  return {
    totalTracked,
    averagePerDay,
    currentGoalStreak,
    longestGoalStreak,
    missedGoalDays,
    consistencyScore,
  };
}
