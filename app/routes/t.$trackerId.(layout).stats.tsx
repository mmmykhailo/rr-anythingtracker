import { useEffect } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { getTrackerById, getEntryHistory } from "~/lib/db";
import { TrackerTotalHalfYearChart } from "~/components/tracker/charts/TrackerTotalHalfYearChart";
import { TrackerAverageHalfYearChart } from "~/components/tracker/charts/TrackerAverageHalfYearChart";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { toDisplayValue } from "~/lib/number-conversions";

interface Stats {
  totalTracked: number;
  trackedThisYear: number;
  trackedThisMonth: number;
  trackedThisWeek: number;
  averageOverall: number;
  averageThisYear: number;
  averageLast30Days: number;
  averageLast7Days: number;
  currentGoalStreak: number;
  longestGoalStreak: number;
  missedGoalDays: number;
  consistencyScore: number;
  currentYear: number;
}

function calculateStats(
  entries: Array<{ date: string; value: number }>,
  goalValue?: number
): Stats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateValues = new Map<string, number>();
  entries.forEach((entry) => {
    const current = dateValues.get(entry.date) || 0;
    dateValues.set(entry.date, current + entry.value);
  });

  const sortedDates = Array.from(dateValues.keys()).sort();
  const earliestDate = sortedDates[0] ? new Date(sortedDates[0]) : today;
  earliestDate.setHours(0, 0, 0, 0);

  const dateRange: string[] = [];
  const current = new Date(earliestDate);
  while (current <= today) {
    dateRange.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  let totalTracked = 0;
  let trackedThisYear = 0;
  let trackedLast30Days = 0;
  let trackedLast7Days = 0;

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(today.getDate() - 29);
  const last7DaysStart = new Date(today);
  last7DaysStart.setDate(today.getDate() - 6);

  dateRange.forEach((dateStr) => {
    const value = dateValues.get(dateStr) || 0;
    const date = new Date(dateStr);

    totalTracked += value;

    if (date >= startOfYear) {
      trackedThisYear += value;
    }
    if (date >= last30DaysStart) {
      trackedLast30Days += value;
    }
    if (date >= last7DaysStart) {
      trackedLast7Days += value;
    }
  });

  const totalDays = dateRange.length;

  const yearDateRange: string[] = [];
  const yearCurrent = new Date(
    Math.max(earliestDate.getTime(), startOfYear.getTime())
  );
  while (yearCurrent <= today) {
    yearDateRange.push(yearCurrent.toISOString().split("T")[0]);
    yearCurrent.setDate(yearCurrent.getDate() + 1);
  }
  const daysThisYear = yearDateRange.length;

  const averageOverall = totalTracked / totalDays;
  const averageThisYear = trackedThisYear / daysThisYear;
  const averageLast30Days = trackedLast30Days / 30;
  const averageLast7Days = trackedLast7Days / 7;

  let currentGoalStreak = 0;
  let longestGoalStreak = 0;
  let missedGoalDays = 0;
  let consistencyScore = 0;

  if (goalValue && goalValue > 0) {
    let currentStreak = 0;
    let maxStreak = 0;
    let goalMetDays = 0;
    let totalDaysWithGoal = 0;

    dateRange.forEach((dateStr) => {
      const value = dateValues.get(dateStr) || 0;
      totalDaysWithGoal++;

      if (value >= goalValue) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        goalMetDays++;
      } else {
        currentStreak = 0;
        missedGoalDays++;
      }
    });

    const todayStr = today.toISOString().split("T")[0];
    const todayValue = dateValues.get(todayStr) || 0;
    currentGoalStreak = todayValue >= goalValue ? currentStreak : 0;

    longestGoalStreak = maxStreak;
    consistencyScore =
      totalDaysWithGoal > 0
        ? Math.round((goalMetDays / totalDaysWithGoal) * 100)
        : 0;
  }

  return {
    totalTracked,
    trackedThisYear,
    trackedThisMonth: trackedLast30Days,
    trackedThisWeek: trackedLast7Days,
    averageOverall,
    averageThisYear,
    averageLast30Days,
    averageLast7Days,
    currentGoalStreak,
    longestGoalStreak,
    missedGoalDays,
    consistencyScore,
    currentYear: today.getFullYear(),
  };
}

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }
    const entries = await getEntryHistory(trackerId);
    const stats = calculateStats(entries, tracker.goal);

    return { tracker, entries, stats };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

export function meta({ params }: { params: { trackerId: string } }) {
  return [
    { title: "Charts - AnythingTracker" },
    {
      name: "description",
      content: "View charts for your tracker",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function TrackerChartsPage() {
  const { tracker, entries, stats } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    const handleDataChange = () => {
      revalidator.revalidate();
    };

    window.addEventListener("anythingtracker:datachange", handleDataChange);
    return () => {
      window.removeEventListener(
        "anythingtracker:datachange",
        handleDataChange
      );
    };
  }, [revalidator]);

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
      </div>
    );
  }

  const formatValue = (value: number) => {
    const displayValue = toDisplayValue(value, tracker.type);
    return displayValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const hasGoal = tracker.goal && tracker.goal > 0;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Total tracked</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.totalTracked)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this year</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.trackedThisYear)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this month</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.trackedThisMonth)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this week</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.trackedThisWeek)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <TrackerTotalHalfYearChart tracker={tracker} entries={entries} />

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Average</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.averageOverall)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{stats.currentYear} average</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.averageThisYear)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Last 30 days average</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.averageLast30Days)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Last 7 days average</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.averageLast7Days)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <TrackerAverageHalfYearChart tracker={tracker} entries={entries} />

      {hasGoal && (
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardHeader>
              <CardDescription>Current goal streak</CardDescription>
              <CardTitle className="text-2xl">
                {stats.currentGoalStreak}{" "}
                {stats.currentGoalStreak === 1 ? "day" : "days"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Longest goal streak</CardDescription>
              <CardTitle className="text-2xl">
                {stats.longestGoalStreak}{" "}
                {stats.longestGoalStreak === 1 ? "day" : "days"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Missed goal days</CardDescription>
              <CardTitle className="text-2xl">
                {stats.missedGoalDays}{" "}
                {stats.missedGoalDays === 1 ? "day" : "days"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Consistency score</CardDescription>
              <CardTitle className="text-2xl">
                {stats.consistencyScore}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
