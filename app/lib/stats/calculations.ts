import { formatDateString } from "~/lib/dates";
import type { Stats } from "./types";

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
    let currentStreak = 0;
    let maxStreak = 0;
    let goalMetDays = 0;
    let totalDaysWithGoal = 0;

    dateRange.forEach((dateStr, i) => {
      const value = dateValues.get(dateStr) || 0;

      if (value >= goalValue) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        goalMetDays++;
      } else {
        if (i === dateRange.length - 1) {
          return;
        }
        currentStreak = 0;
        missedGoalDays++;
      }
      totalDaysWithGoal++;
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
