import { useEffect } from "react";
import { useLoaderData, useRevalidator, useNavigate } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { getTrackerById, getEntryHistory } from "~/lib/db";
import { TrackerTotalHalfYearChart } from "~/components/tracker/charts/TrackerTotalHalfYearChart";
import { TrackerAverageHalfYearChart } from "~/components/tracker/charts/TrackerAverageHalfYearChart";
import { TrackerContributionGraph } from "~/components/tracker/charts/TrackerContributionGraph";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PeriodSelector } from "~/components/tracker/stats/PeriodSelector";
import { getSelectedPeriod, calculateStats } from "~/lib/stats";
import { toDisplayValue } from "~/lib/number-conversions";
import { startOfToday } from "date-fns";

export async function clientLoader({
  params,
  request,
}: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  const url = new URL(request.url);

  const { selectedValue, showCustom, fromDate, toDate } = getSelectedPeriod(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    startOfToday()
  );

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }
    const allEntries = await getEntryHistory(trackerId);

    const entries = allEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= fromDate && entryDate <= toDate;
    });

    const stats = calculateStats(entries, fromDate, toDate, tracker.goal);

    return { tracker, entries, stats, selectedValue, showCustom };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

export function meta() {
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
  const { tracker, entries, stats, selectedValue, showCustom } =
    useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

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

  const handleDateRangeChange = (from: string, to: string) => {
    navigate(`?from=${from}&to=${to}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <PeriodSelector
          selectedValue={selectedValue}
          showCustom={showCustom}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.totalTracked)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average</CardDescription>
            <CardTitle className="text-2xl">
              {formatValue(stats.averagePerDay)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <TrackerContributionGraph
        className="min-w-0 max-w-full"
        tracker={tracker}
        entries={entries}
      />

      <TrackerTotalHalfYearChart tracker={tracker} entries={entries} />

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
