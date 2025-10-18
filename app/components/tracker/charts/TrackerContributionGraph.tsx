import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "~/lib/utils";
import { formatStoredValue } from "~/lib/number-conversions";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import type { Tracker } from "~/lib/trackers";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface Entry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
}

interface TrackerContributionGraphProps {
  tracker: Tracker;
  entries: Entry[];
  className?: string;
}

const colorClassNamesNoGoal = [
  "bg-emerald-500",
  "bg-emerald-400 dark:bg-emerald-500/80",
  "bg-emerald-300 dark:bg-emerald-500/50",
  "bg-emerald-200 dark:bg-emerald-700/50",
  "bg-accent",
];

const colorClassNamesGoal = [
  "bg-emerald-500/90",
  "bg-zinc-500",
  "bg-zinc-400 dark:bg-zinc-600",
  "bg-zinc-300 dark:bg-zinc-700",
  "bg-accent",
];

const getContributionColorClassName = (
  value: number,
  goalValue: number | undefined,
  maxValue: number
): string => {
  if (value <= 0) {
    return colorClassNamesNoGoal[colorClassNamesNoGoal.length - 1];
  }

  if (!goalValue || goalValue <= 0) {
    // No goal set, use percentage of max value
    if (maxValue <= 0) return colorClassNamesNoGoal[0];

    const percentage = value / maxValue;
    if (percentage >= 0.9) return colorClassNamesNoGoal[0]; // 90%+ of max
    if (percentage >= 0.6) return colorClassNamesNoGoal[1]; // 60%+ of max
    if (percentage >= 0.3) return colorClassNamesNoGoal[2]; // 30%+ of max
    if (percentage > 0) return colorClassNamesNoGoal[3]; // Some activity

    return colorClassNamesNoGoal[colorClassNamesNoGoal.length - 1];
  }

  // Color based on percentage of goal
  const percentage = value / goalValue;
  if (percentage >= 1) return colorClassNamesGoal[0]; // 100%+ of goal
  if (percentage >= 0.75) return colorClassNamesGoal[1]; // 75%+ of goal
  if (percentage >= 0.5) return colorClassNamesGoal[2]; // 50%+ of goal
  if (percentage > 0) return colorClassNamesGoal[3]; // Some progress

  return colorClassNamesGoal[colorClassNamesGoal.length - 1];
};

const eachDayOfInterval = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const startOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

const endOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 11, 31);
};

const formatDate = (date: Date, format: string): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (format === "yyyyMMdd") {
    return `${year}${month}${day}`;
  }
  if (format === "MMM d, yyyy") {
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
  }

  return date.toISOString().split("T")[0];
};

export function TrackerContributionGraph({
  tracker,
  entries,
  className,
}: TrackerContributionGraphProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { weeks, yearNumberStr } = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0));
    const yearEnd = endOfYear(new Date(selectedYear, 0));

    const allDays = eachDayOfInterval(yearStart, yearEnd);

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    for (const day of allDays) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    const yearNumberStr = selectedYear.toString();

    return { weeks, yearNumberStr };
  }, [selectedYear]);

  const { dailyValues, maxDailyValue } = useMemo(() => {
    const values = new Map<string, number>();
    let max = 0;

    entries.forEach((entry) => {
      const dateKey = formatDate(new Date(entry.date), "yyyyMMdd");
      const currentValue = values.get(dateKey) || 0;
      const newValue = currentValue + entry.value;
      values.set(dateKey, newValue);
      if (newValue > max) max = newValue;
    });

    return { dailyValues: values, maxDailyValue: max };
  }, [entries]);

  const formatValue = useCallback(
    (value: number): string => {
      if (value === 0) return "0";
      return formatStoredValue(value, tracker.type, true);
    },
    [tracker.type]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Yearly activity graph</CardTitle>
            <CardDescription>Data for the year {yearNumberStr}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear((prev) => prev - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear((prev) => prev + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardHeader>
      <TooltipProvider
        disableHoverableContent
        delayDuration={0}
        skipDelayDuration={0}
      >
        <ScrollArea className="-mb-3 max-w-full">
          <div className="flex gap-1 p-1 pb-3 px-6">
            {weeks.map((week) => (
              <div key={week[0].toString()} className="flex flex-col gap-1">
                {week.map((day) => {
                  const dateKey = formatDate(day, "yyyyMMdd");
                  const dailyValue = dailyValues.get(dateKey) || 0;

                  return (
                    <Tooltip key={dateKey}>
                      <TooltipTrigger>
                        <span
                          className={cn(
                            "block h-3 w-3 rounded-sm hover:ring-2 hover:ring-ring",
                            getContributionColorClassName(
                              dailyValue,
                              tracker.goal,
                              maxDailyValue
                            )
                          )}
                          data-date={dateKey}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="pointer-events-none">
                        <div className="text-sm">
                          <p className="font-semibold">
                            {formatDate(day, "MMM d, yyyy")}
                          </p>
                          <p>
                            {dailyValue > 0
                              ? formatValue(dailyValue)
                              : "No activity"}
                          </p>
                          {tracker.goal &&
                            tracker.goal > 0 &&
                            dailyValue > 0 && (
                              <p className="text-xs mt-1 text-muted-foreground">
                                {((dailyValue / tracker.goal) * 100).toFixed(0)}
                                % of goal
                              </p>
                            )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </TooltipProvider>

      <TooltipProvider disableHoverableContent skipDelayDuration={0}>
        <div className="px-6 flex items-center gap-2 text-muted-foreground text-sm">
          <span>Less</span>
          <div className="flex flex-row-reverse gap-1">
            {(tracker.goal && tracker.goal > 0
              ? colorClassNamesGoal
              : colorClassNamesNoGoal
            ).map((className, i) => (
              <Tooltip key={i}>
                <TooltipTrigger>
                  <span
                    className={cn(
                      "block h-3 w-3 rounded-sm hover:ring-2 hover:ring-ring",
                      className
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent className="pointer-events-none">
                  <div className="text-sm">
                    {tracker.goal && tracker.goal > 0 ? (
                      <>
                        {i === 0 && "Goal met"}
                        {i === 1 && "75%+ of goal"}
                        {i === 2 && "50%+ of goal"}
                        {i === 3 && "Some progress"}
                        {i === 4 && "No activity"}
                      </>
                    ) : (
                      <>
                        {i === 0 && "High activity"}
                        {i === 1 && "Medium activity"}
                        {i === 2 && "Low activity"}
                        {i === 3 && "Minimal activity"}
                        {i === 4 && "No activity"}
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <span>More</span>
        </div>
      </TooltipProvider>
    </Card>
  );
}
