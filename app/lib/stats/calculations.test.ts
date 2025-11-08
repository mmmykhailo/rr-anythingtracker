import { describe, test, expect } from "bun:test";
import { calculateStats, type StatsConfig } from "./calculations";
import { formatDateString } from "~/lib/dates";
import { addDays, subDays, startOfDay } from "date-fns";

describe("Stats Calculations", () => {
  const today = startOfDay(new Date());
  const todayStr = formatDateString(today);

  describe("Basic Stats", () => {
    test("calculates total correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 200 },
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-03"),
        },
        undefined,
        { includeTotal: true }
      );

      expect(result.total).toBe(450);
    });

    test("calculates average correctly for past period", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 200 },
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"), // 5 days total
        },
        undefined,
        { includeAverage: true }
      );

      expect(result.average).toBe(90); // 450 / 5 = 90
    });

    test("calculates average correctly for current period", () => {
      const yesterday = subDays(today, 1);
      const twoDaysAgo = subDays(today, 2);
      const weekFromNow = addDays(today, 7);

      const entries = [
        { date: formatDateString(twoDaysAgo), value: 100 },
        { date: formatDateString(yesterday), value: 200 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: twoDaysAgo,
          toDate: weekFromNow, // Current period (extends into future)
        },
        undefined,
        { includeAverage: true }
      );

      // Average should be calculated based on days passed, not future days
      // Days passed = 3 (two days ago, yesterday, today)
      expect(result.average).toBe(100); // 300 / 3 = 100
    });

    test("calculates days tracked correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-01", value: 50 }, // Same day, multiple entries
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        undefined,
        { includeDaysTracked: true }
      );

      expect(result.daysTracked).toBe(2); // Only 2 unique days
    });

    test("calculates days missed correctly without goal", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"), // 5 days total
        },
        undefined,
        { includeDaysMissed: true }
      );

      expect(result.daysMissed).toBe(3); // 5 days - 2 tracked = 3 missed
    });

    test("calculates percentage days tracked correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 200 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"), // 5 days total
        },
        undefined,
        { includePercentageDaysTracked: true }
      );

      expect(result.percentageDaysTracked).toBe(40); // 2/5 = 40%
    });

    test("handles empty entries", () => {
      const result = calculateStats(
        [],
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        undefined,
        {
          includeTotal: true,
          includeAverage: true,
          includeDaysTracked: true,
          includeDaysMissed: true,
          includePercentageDaysTracked: true,
        }
      );

      expect(result.total).toBe(0);
      expect(result.average).toBe(0);
      expect(result.daysTracked).toBe(0);
      expect(result.daysMissed).toBe(5);
      expect(result.percentageDaysTracked).toBe(0);
    });

    test("aggregates multiple entries on same day", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-01", value: 50 },
        { date: "2024-01-01", value: 25 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-01"),
        },
        undefined,
        { includeTotal: true }
      );

      expect(result.total).toBe(175);
    });
  });

  describe("Best Day", () => {
    test("identifies best day correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 300 },
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-03"),
        },
        undefined,
        { includeBestDay: true }
      );

      expect(result.bestDay).toEqual({ date: "2024-01-02", value: 300 });
    });

    test("aggregates multiple entries for best day", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 150 },
        { date: "2024-01-02", value: 150 }, // Total 300 for this day
        { date: "2024-01-03", value: 250 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-03"),
        },
        undefined,
        { includeBestDay: true }
      );

      expect(result.bestDay).toEqual({ date: "2024-01-02", value: 300 });
    });

    test("returns null when no entries", () => {
      const result = calculateStats(
        [],
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-03"),
        },
        undefined,
        { includeBestDay: true }
      );

      expect(result.bestDay).toBeNull();
    });
  });

  describe("General Streaks", () => {
    test("calculates longest streak correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 100 },
        { date: "2024-01-03", value: 100 },
        { date: "2024-01-05", value: 100 }, // Gap here
        { date: "2024-01-06", value: 100 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-06"),
        },
        undefined,
        { includeStreaks: true }
      );

      expect(result.longestStreak).toBe(3); // Days 1-3
    });

    test("calculates current streak when active", () => {
      const threeDaysAgo = subDays(today, 3);
      const twoDaysAgo = subDays(today, 2);
      const yesterday = subDays(today, 1);

      const entries = [
        { date: formatDateString(threeDaysAgo), value: 100 },
        // Gap
        { date: formatDateString(yesterday), value: 100 },
        { date: todayStr, value: 100 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: threeDaysAgo,
          toDate: today,
        },
        undefined,
        { includeStreaks: true }
      );

      expect(result.currentStreak).toBe(2); // Yesterday and today
    });

    test("current streak is 0 when streak is broken", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 100 },
        { date: "2024-01-03", value: 100 },
        // Gap at the end - streak broken
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        undefined,
        { includeStreaks: true }
      );

      expect(result.currentStreak).toBe(0);
    });

    test("handles single entry streak", () => {
      const entries = [{ date: "2024-01-03", value: 100 }];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        undefined,
        { includeStreaks: true }
      );

      expect(result.longestStreak).toBe(1);
      expect(result.currentStreak).toBe(0); // Streak broken after day 3
    });
  });

  describe("Goal-Based Stats", () => {
    test("calculates goal streaks correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 150 }, // Meets goal
        { date: "2024-01-02", value: 200 }, // Meets goal
        { date: "2024-01-03", value: 50 }, // Doesn't meet goal
        { date: "2024-01-04", value: 300 }, // Meets goal
        { date: "2024-01-05", value: 100 }, // Meets goal
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        100, // Goal value
        {
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeGoalStreaks: true,
        }
      );

      expect(result.longestGoalStreak).toBe(2); // Days 1-2 or 4-5
      expect(result.currentGoalStreak).toBe(2); // Days 4-5
    });

    test("counts missed goal days correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 150 }, // Meets goal
        { date: "2024-01-02", value: 50 }, // Doesn't meet goal
        { date: "2024-01-03", value: 200 }, // Meets goal
        { date: "2024-01-04", value: 75 }, // Doesn't meet goal
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-04"),
        },
        100,
        {
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeMissedGoalDays: true,
        }
      );

      expect(result.missedGoalDays).toBe(2); // Days 2 and 4
    });

    test("calculates consistency score correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 150 },
        { date: "2024-01-02", value: 200 },
        { date: "2024-01-03", value: 50 },
        { date: "2024-01-04", value: 100 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-04"),
        },
        100,
        {
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeConsistencyScore: true,
        }
      );

      // 3 out of 4 days met goal = 75%
      expect(result.consistencyScore).toBe(75);
    });

    test("goal stats only count from first tracked entry", () => {
      const entries = [
        { date: "2024-01-03", value: 50 }, // First entry on day 3
        { date: "2024-01-04", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"), // Range starts before first entry
          toDate: new Date("2024-01-04"),
        },
        100,
        {
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeMissedGoalDays: true,
          includeConsistencyScore: true,
        }
      );

      // Only days 3-4 should count (2 days total)
      expect(result.missedGoalDays).toBe(1); // Day 3 missed
      expect(result.consistencyScore).toBe(50); // 1 of 2 days = 50%
    });

    test("handles days missed correctly for tracker without goal", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-03", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        undefined, // No goal
        { includeDaysMissed: true }
      );

      // Without goal, days missed = days not tracked
      expect(result.daysMissed).toBe(3); // Days 2, 4, 5
    });

    test("doesn't count today in missed goal days if not met", () => {
      const yesterday = subDays(today, 1);

      const entries = [
        { date: formatDateString(yesterday), value: 150 },
        { date: todayStr, value: 50 }, // Today doesn't meet goal
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: yesterday,
          toDate: today, // Current period
        },
        100,
        { includeMissedGoalDays: true }
      );

      // Today shouldn't be counted as missed
      expect(result.missedGoalDays).toBe(0);
    });

    test("resets goal streak when goal not met", () => {
      const entries = [
        { date: "2024-01-01", value: 150 },
        { date: "2024-01-02", value: 200 },
        { date: "2024-01-03", value: 50 }, // Breaks streak
        { date: "2024-01-04", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-04"),
        },
        100,
        {
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeGoalStreaks: true,
        }
      );

      expect(result.currentGoalStreak).toBe(1); // Only day 4
      expect(result.longestGoalStreak).toBe(2); // Days 1-2
    });
  });

  describe("Today Stats", () => {
    test("checks if today's goal is met", () => {
      const entries = [{ date: todayStr, value: 150 }];

      const result = calculateStats(
        entries,
        {
          fromDate: today,
          toDate: today,
        },
        100,
        { includeTodayGoalMet: true }
      );

      expect(result.isTodayGoalMet).toBe(true);
    });

    test("checks if today's goal is not met", () => {
      const entries = [{ date: todayStr, value: 50 }];

      const result = calculateStats(
        entries,
        {
          fromDate: today,
          toDate: today,
        },
        100,
        { includeTodayGoalMet: true }
      );

      expect(result.isTodayGoalMet).toBe(false);
    });

    test("aggregates multiple entries for today's goal", () => {
      const entries = [
        { date: todayStr, value: 40 },
        { date: todayStr, value: 30 },
        { date: todayStr, value: 30 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: today,
          toDate: today,
        },
        100,
        { includeTodayGoalMet: true }
      );

      expect(result.isTodayGoalMet).toBe(true); // Total 100 meets goal
    });

    test("works without goal (checks if any entry exists)", () => {
      const entries = [{ date: todayStr, value: 1 }];

      const result = calculateStats(
        entries,
        {
          fromDate: today,
          toDate: today,
        },
        undefined,
        { includeTodayGoalMet: true }
      );

      expect(result.isTodayGoalMet).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles future dates correctly", () => {
      const weekFromNow = addDays(today, 7);
      const yesterday = subDays(today, 1);

      const entries = [{ date: formatDateString(yesterday), value: 100 }];

      const result = calculateStats(
        entries,
        {
          fromDate: yesterday,
          toDate: weekFromNow, // Future date
        },
        100,
        {
          includeAverage: true,
          includeDaysTracked: true, // Required to set firstTrackedIndex
          includeMissedGoalDays: true,
          includeConsistencyScore: true,
        }
      );

      // Average should only count days passed (2 days: yesterday and today)
      expect(result.average).toBe(50); // 100 / 2

      // Goal stats shouldn't count future days
      expect(result.missedGoalDays).toBe(1); // Only today is missed
    });

    test("handles single-day range", () => {
      const entries = [{ date: "2024-01-01", value: 100 }];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-01"),
        },
        undefined,
        {
          includeTotal: true,
          includeAverage: true,
          includeDaysTracked: true,
          includeStreaks: true,
        }
      );

      expect(result.total).toBe(100);
      expect(result.average).toBe(100);
      expect(result.daysTracked).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    test("returns only requested stats", () => {
      const entries = [{ date: "2024-01-01", value: 100 }];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-01"),
        },
        undefined,
        { includeTotal: true } // Only request total
      );

      expect(result.total).toBe(100);
      expect(result.average).toBeUndefined();
      expect(result.daysTracked).toBeUndefined();
      expect(result.bestDay).toBeUndefined();
    });

    test("handles zero values correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 0 },
        { date: "2024-01-02", value: 0 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-02"),
        },
        undefined,
        {
          includeTotal: true,
          includeDaysTracked: true,
          includeStreaks: true,
        }
      );

      expect(result.total).toBe(0);
      expect(result.daysTracked).toBe(2); // Days with entries, even if value is 0
      expect(result.longestStreak).toBe(2);
    });

    test("handles entries outside date range", () => {
      const entries = [
        { date: "2023-12-31", value: 100 }, // Before range
        { date: "2024-01-01", value: 200 },
        { date: "2024-01-02", value: 300 },
        { date: "2024-01-04", value: 400 }, // After range
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-03"),
        },
        undefined,
        {
          includeTotal: true,
          includeDaysTracked: true,
        }
      );

      // Should only count entries within range
      expect(result.total).toBe(500); // 200 + 300
      expect(result.daysTracked).toBe(2);
    });

    test("handles empty config (returns empty result)", () => {
      const entries = [{ date: "2024-01-01", value: 100 }];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-01"),
        },
        undefined,
        {} // No stats requested
      );

      expect(result).toEqual({});
    });
  });

  describe("Complex Scenarios", () => {
    test("calculates all stats together correctly", () => {
      const entries = [
        { date: "2024-01-01", value: 150 },
        { date: "2024-01-02", value: 200 },
        { date: "2024-01-03", value: 50 },
        { date: "2024-01-04", value: 300 },
        { date: "2024-01-05", value: 100 },
      ];

      const config: StatsConfig = {
        includeTotal: true,
        includeAverage: true,
        includeDaysTracked: true,
        includeDaysMissed: true,
        includePercentageDaysTracked: true,
        includeBestDay: true,
        includeStreaks: true,
        includeGoalStreaks: true,
        includeMissedGoalDays: true,
        includeConsistencyScore: true,
        includeTodayGoalMet: false,
      };

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-05"),
        },
        100,
        config
      );

      expect(result.total).toBe(800);
      expect(result.average).toBe(160); // 800 / 5
      expect(result.daysTracked).toBe(5);
      expect(result.daysMissed).toBe(1); // Day 3 didn't meet goal
      expect(result.percentageDaysTracked).toBe(100);
      expect(result.bestDay).toEqual({ date: "2024-01-04", value: 300 });
      expect(result.longestStreak).toBe(5);
      expect(result.currentStreak).toBe(5);
      expect(result.longestGoalStreak).toBe(2); // Days 1-2 or 4-5
      expect(result.currentGoalStreak).toBe(2); // Days 4-5
      expect(result.missedGoalDays).toBe(1); // Day 3
      expect(result.consistencyScore).toBe(80); // 4 of 5 days met goal
    });

    test("handles sparse entries with gaps", () => {
      const entries = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-05", value: 200 },
        { date: "2024-01-10", value: 150 },
      ];

      const result = calculateStats(
        entries,
        {
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-10"),
        },
        undefined,
        {
          includeDaysTracked: true,
          includeDaysMissed: true,
          includePercentageDaysTracked: true,
          includeStreaks: true,
        }
      );

      expect(result.daysTracked).toBe(3);
      expect(result.daysMissed).toBe(7); // 10 days - 3 tracked
      expect(result.percentageDaysTracked).toBe(30); // 3/10 = 30%
      expect(result.longestStreak).toBe(1);
      expect(result.currentStreak).toBe(1);
    });
  });
});
