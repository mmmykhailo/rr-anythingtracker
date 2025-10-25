import { useEffect } from "react";
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
  useNavigate,
} from "react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toDisplayValue } from "~/lib/number-conversions";
import { formatDateString } from "~/lib/dates";

interface Stats {
  totalTracked: number;
  averagePerDay: number;
  currentGoalStreak: number;
  longestGoalStreak: number;
  missedGoalDays: number;
  consistencyScore: number;
}

type DateRangeOption = "1M" | "3M" | "YTD" | "1Y";

function calculateDateFromPeriod(period: DateRangeOption, today: Date): Date {
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);

  if (period === "YTD") {
    return new Date(today.getFullYear(), 0, 1);
  } else if (period === "1M") {
    from.setMonth(today.getMonth() - 1);
    from.setDate(today.getDate() + 1);
    if (from.getMonth() === today.getMonth()) {
      from.setDate(1);
    }
    return from;
  } else if (period === "3M") {
    from.setMonth(today.getMonth() - 3);
    from.setDate(today.getDate() + 1);
    if (from.getMonth() === today.getMonth()) {
      from.setDate(1);
    }
    return from;
  } else if (period === "1Y") {
    from.setFullYear(today.getFullYear() - 1);
    from.setDate(today.getDate() + 1);
    if (
      from.getMonth() === today.getMonth() &&
      from.getFullYear() === today.getFullYear()
    ) {
      from.setDate(1);
    }
    return from;
  }
  return from;
}

function getSelectedPeriod(
  fromParam: string | null,
  toParam: string | null,
  today: Date
): {
  selectedValue: DateRangeOption | "custom";
  showCustom: boolean;
  fromDate: Date;
  toDate: Date;
} {
  if (!fromParam || !toParam) {
    const from = calculateDateFromPeriod("1M", today);
    const to = today;
    return {
      selectedValue: "1M",
      showCustom: false,
      fromDate: from,
      toDate: to,
    };
  }

  const from = new Date(fromParam);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toParam);
  to.setHours(0, 0, 0, 0);

  const todayStr = formatDateString(today);

  if (toParam !== todayStr) {
    return {
      selectedValue: "custom",
      showCustom: true,
      fromDate: from,
      toDate: to,
    };
  }

  const periods: DateRangeOption[] = ["1M", "3M", "YTD", "1Y"];
  for (const period of periods) {
    const expectedFrom = calculateDateFromPeriod(period, today);
    if (formatDateString(expectedFrom) === fromParam) {
      return {
        selectedValue: period,
        showCustom: false,
        fromDate: from,
        toDate: to,
      };
    }
  }

  return {
    selectedValue: "custom",
    showCustom: true,
    fromDate: from,
    toDate: to,
  };
}

function calculateStats(
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

export async function clientLoader({
  params,
  request,
}: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { selectedValue, showCustom, fromDate, toDate } = getSelectedPeriod(
    fromParam,
    toParam,
    today
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

  const handleDateRangeChange = (value: string) => {
    if (value === "custom") return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = formatDateString(today);

    const from = calculateDateFromPeriod(value as DateRangeOption, today);
    const fromStr = formatDateString(from);

    navigate(`?from=${fromStr}&to=${to}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Select value={selectedValue} onValueChange={handleDateRangeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1M">1M</SelectItem>
            <SelectItem value="3M">3M</SelectItem>
            <SelectItem value="YTD">YTD</SelectItem>
            <SelectItem value="1Y">1Y</SelectItem>
            {showCustom && <SelectItem value="custom">Custom</SelectItem>}
          </SelectContent>
        </Select>
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
