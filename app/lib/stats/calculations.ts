import { formatDateString } from "~/lib/dates";
import { isAfter, isSameDay, startOfDay } from "date-fns";

export interface StatsConfig {
  // Basic stats
  includeTotal?: boolean;
  includeAverage?: boolean;
  includeDaysTracked?: boolean;
  includeDaysMissed?: boolean;
  includePercentageDaysTracked?: boolean;

  // Best day
  includeBestDay?: boolean;

  // General streaks (consecutive days with any entry)
  includeStreaks?: boolean;

  // Goal-specific stats
  includeGoalStreaks?: boolean;
  includeConsistencyScore?: boolean;
  includeMissedGoalDays?: boolean;

  // Today stats
  includeTodayGoalMet?: boolean;
}

export interface StatsResult {
  // Basic stats
  total?: number;
  average?: number;
  daysTracked?: number;
  daysMissed?: number;
  percentageDaysTracked?: number;

  // Best day
  bestDay?: { date: string; value: number } | null;

  // General streaks (consecutive days with any entry)
  longestStreak?: number;
  currentStreak?: number;

  // Goal-specific stats
  currentGoalStreak?: number;
  longestGoalStreak?: number;
  missedGoalDays?: number;
  consistencyScore?: number;

  // Today stats
  isTodayGoalMet?: boolean;
}

/**
 * Unified stats calculation function optimized for single-pass processing.
 *
 * NOTE: Streaks are calculated across the FULL entry history, not just the selected period.
 * All other stats (total, average, etc.) are calculated only for the selected period.
 *
 * @param entries - Array of ALL entries (not filtered by date range)
 * @param dates - Object containing fromDate and toDate for the selected period
 * @param goalValue - Optional goal value for goal-based calculations
 * @param config - Configuration object specifying which stats to calculate
 * @returns Stats object with only the requested calculations
 */
export function calculateStats(
  entries: Array<{ date: string; value: number }>,
  dates: { fromDate: Date; toDate: Date },
  goalValue?: number,
  config: StatsConfig = {}
): StatsResult {
  const result: StatsResult = {};
  const { fromDate, toDate } = dates;

  // Determine if this is the current period
  const now = startOfDay(new Date());
  const isCurrentPeriod = isAfter(toDate, now) || isSameDay(toDate, now);
  const today = formatDateString(now);

  // Step 1: Build daily totals map for ALL entries
  const allDailyTotals = new Map<string, number>();
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  for (const entry of entries) {
    const current = allDailyTotals.get(entry.date) || 0;
    allDailyTotals.set(entry.date, current + entry.value);

    const entryDate = new Date(entry.date);
    if (!earliestDate || entryDate < earliestDate) {
      earliestDate = entryDate;
    }
    if (!latestDate || entryDate > latestDate) {
      latestDate = entryDate;
    }
  }

  // Step 2: Build daily totals for entries within the selected range
  const rangeDailyTotals = new Map<string, number>();
  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    if (entryDate >= fromDate && entryDate <= toDate) {
      const current = rangeDailyTotals.get(entry.date) || 0;
      rangeDailyTotals.set(entry.date, current + entry.value);
    }
  }

  // Step 3: Build date range for selected period
  const dateRange: string[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    dateRange.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }

  const totalDays = dateRange.length;
  const todayInRange = dateRange.includes(today);

  // Calculate days left to end of period (for current period only)
  const daysLeftToEndOfPeriod = isCurrentPeriod
    ? Math.max(0, dateRange.filter((d) => d > today).length)
    : 0;
  const daysPassed = totalDays - daysLeftToEndOfPeriod;

  // Step 4: Calculate general streaks from FULL history
  let longestStreak = 0;
  let currentStreakValue = 0;

  if (config.includeStreaks && earliestDate) {
    // Build full date range from earliest entry to today
    const streakDateRange: string[] = [];
    const streakCurrent = new Date(earliestDate);
    const streakEnd = now > latestDate! ? now : latestDate!;

    while (streakCurrent <= streakEnd) {
      streakDateRange.push(formatDateString(streakCurrent));
      streakCurrent.setDate(streakCurrent.getDate() + 1);
    }

    // Calculate streaks across full history
    let tempStreak = 0;
    let lastStreakIndex = -1;

    for (let i = 0; i < streakDateRange.length; i++) {
      const dateStr = streakDateRange[i];
      const hasEntry = allDailyTotals.has(dateStr);

      if (hasEntry) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        lastStreakIndex = i;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak: only if it extends to the end of the range
    if (lastStreakIndex === streakDateRange.length - 1) {
      currentStreakValue = tempStreak;
    }
  }

  // Step 5: Calculate other stats from selected period
  let total = 0;
  let daysTracked = 0;
  let bestDayDate: string | null = null;
  let bestDayValue = 0;

  // Goal streak tracking
  let currentGoalStreak = 0;
  let longestGoalStreak = 0;
  let tempGoalStreak = 0;
  let missedGoalDays = 0;
  let goalMetDays = 0;
  let firstTrackedIndex = -1;

  // Process each day in the selected range
  for (let i = 0; i < dateRange.length; i++) {
    const dateStr = dateRange[i];
    const dailyValue = rangeDailyTotals.get(dateStr) || 0;
    const hasEntry = rangeDailyTotals.has(dateStr);

    // Basic stats calculations
    if (config.includeTotal || config.includeAverage) {
      total += dailyValue;
    }

    if (
      config.includeDaysTracked ||
      config.includePercentageDaysTracked ||
      config.includeDaysMissed
    ) {
      if (hasEntry) {
        daysTracked++;
        if (firstTrackedIndex === -1) {
          firstTrackedIndex = i;
        }
      }
    }

    // Best day tracking
    if (config.includeBestDay && dailyValue > bestDayValue) {
      bestDayValue = dailyValue;
      bestDayDate = dateStr;
    }

    // Goal-based calculations
    if (
      goalValue &&
      goalValue > 0 &&
      (config.includeGoalStreaks ||
        config.includeConsistencyScore ||
        config.includeMissedGoalDays)
    ) {
      // Only count days from first tracked entry onwards
      if (firstTrackedIndex !== -1 && i >= firstTrackedIndex) {
        const isLastDay = i === dateRange.length - 1;
        const isFutureDay = dateStr > today;

        // Skip future days
        if (!isFutureDay) {
          if (dailyValue >= goalValue) {
            tempGoalStreak++;
            longestGoalStreak = Math.max(longestGoalStreak, tempGoalStreak);
            goalMetDays++;
            currentGoalStreak = tempGoalStreak;
          } else {
            tempGoalStreak = 0;
            currentGoalStreak = 0;
            // Don't count today if goal not met and it's the last day
            if (!(isLastDay && todayInRange)) {
              missedGoalDays++;
            }
          }
        }
      }
    }
  }

  // Step 6: Populate result object with requested stats
  if (config.includeTotal) {
    result.total = total;
  }

  if (config.includeAverage) {
    result.average = daysPassed > 0 ? total / daysPassed : 0;
  }

  if (config.includeDaysTracked) {
    result.daysTracked = daysTracked;
  }

  if (config.includeDaysMissed) {
    if (goalValue && goalValue > 0) {
      // For trackers with goals: days where goal wasn't met (already calculated)
      result.daysMissed = missedGoalDays;
    } else {
      // For trackers without goals: days not tracked (excluding future days)
      result.daysMissed = Math.max(0, daysPassed - daysTracked);
    }
  }

  if (config.includePercentageDaysTracked) {
    result.percentageDaysTracked =
      daysPassed > 0 ? Math.floor((daysTracked / daysPassed) * 100) : 0;
  }

  if (config.includeBestDay) {
    result.bestDay = bestDayDate
      ? { date: bestDayDate, value: bestDayValue }
      : null;
  }

  if (config.includeStreaks) {
    result.longestStreak = longestStreak;
    result.currentStreak = currentStreakValue;
  }

  if (config.includeGoalStreaks && goalValue && goalValue > 0) {
    result.currentGoalStreak = currentGoalStreak;
    result.longestGoalStreak = longestGoalStreak;
  }

  if (config.includeMissedGoalDays && goalValue && goalValue > 0) {
    result.missedGoalDays = missedGoalDays;
  }

  if (config.includeConsistencyScore && goalValue && goalValue > 0) {
    const totalDaysWithGoal =
      firstTrackedIndex !== -1
        ? Math.max(0, daysPassed - firstTrackedIndex)
        : 0;
    result.consistencyScore =
      totalDaysWithGoal > 0
        ? Math.round((goalMetDays / totalDaysWithGoal) * 100)
        : 0;
  }

  if (config.includeTodayGoalMet) {
    const todayTotal = rangeDailyTotals.get(today) || 0;
    result.isTodayGoalMet = goalValue
      ? todayTotal >= goalValue
      : todayTotal > 0;
  }

  return result;
}
