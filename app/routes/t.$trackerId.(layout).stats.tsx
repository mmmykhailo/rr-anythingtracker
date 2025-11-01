import { useEffect } from "react";
import { useLoaderData, useRevalidator, useNavigate } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { getTrackerById, getEntryHistory } from "~/lib/db";
import { TrackerTotalDailyChart } from "~/components/tracker/stats/charts/TrackerTotalDailyChart";
import { TrackerTotalWeeklyChart } from "~/components/tracker/stats/charts/TrackerTotalWeeklyChart";
import { TrackerAverageWeeklyChart } from "~/components/tracker/stats/charts/TrackerAverageWeeklyChart";
import { TrackerCumulativeChart } from "~/components/tracker/stats/charts/TrackerCumulativeChart";
import { TrackerContributionGraph } from "~/components/tracker/stats/charts/TrackerContributionGraph";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PeriodSelector } from "~/components/tracker/stats/PeriodSelector";
import { getSelectedPeriod, calculateStats } from "~/lib/stats";
import { toDisplayValue } from "~/lib/number-conversions";
import { startOfToday, differenceInDays } from "date-fns";

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
      return entryDate >= fromDate && entryDate <= toDate;
    });

    const stats = calculateStats(entries, fromDate, toDate, tracker.goal);

    return {
      tracker,
      entries,
      stats,
      selectedValue,
      showCustom,
      fromDate,
      toDate,
    };
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
  const {
    tracker,
    entries,
    stats,
    selectedValue,
    showCustom,
    fromDate,
    toDate,
  } = useLoaderData<typeof clientLoader>();
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

  // Determine if we should show daily or weekly charts
  const showDailyCharts =
    selectedValue === "1M" ||
    (selectedValue === "custom" &&
      differenceInDays(new Date(toDate), new Date(fromDate)) <= 45);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <PeriodSelector
          selectedValue={selectedValue}
          showCustom={showCustom}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      {showDailyCharts ? (
        <TrackerTotalDailyChart
          tracker={tracker}
          entries={entries}
          fromDate={new Date(fromDate)}
          toDate={new Date(toDate)}
        />
      ) : (
        <>
          <TrackerTotalWeeklyChart
            tracker={tracker}
            entries={entries}
            fromDate={new Date(fromDate)}
            toDate={new Date(toDate)}
          />
          <TrackerAverageWeeklyChart
            tracker={tracker}
            entries={entries}
            fromDate={new Date(fromDate)}
            toDate={new Date(toDate)}
          />
        </>
      )}

      <TrackerCumulativeChart
        tracker={tracker}
        entries={entries}
        fromDate={new Date(fromDate)}
        toDate={new Date(toDate)}
      />

      {hasGoal && (
        <div className="grid grid-cols-2 gap-4">
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

      {selectedValue === "YTD" && (
        <TrackerContributionGraph
          className="min-w-0 max-w-full"
          tracker={tracker}
          entries={entries}
        />
      )}
    </div>
  );
}
