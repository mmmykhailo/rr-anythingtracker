import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { scrollParentToChild } from "~/lib/scroll";

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
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const [touchDragMode, setTouchDragMode] = useState(false);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { weeks, yearNumberStr } = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0));
    const yearEnd = endOfYear(new Date(selectedYear, 0));

    const allDays = eachDayOfInterval(yearStart, yearEnd);

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Pad the first week with nulls to align to calendar week (Monday = 0)
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Convert to Monday-first: Monday=0, Tuesday=1, ..., Sunday=6
    const firstDayOfWeek = (allDays[0].getDay() + 6) % 7;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

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
      // Use entry.date directly since it's already in "yyyy-MM-dd" format
      // Convert to yyyyMMdd without timezone issues
      const dateKey = entry.date.replace(/-/g, "");
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

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();

    if (selectedYear === currentYear) {
      requestAnimationFrame(() => {
        if (!scrollableContentRef.current?.parentElement?.parentElement) {
          return;
        }
        const todayKey = formatDate(today, "yyyyMMdd");
        const todayElement = document.querySelector(
          `[data-date="${todayKey}"]`
        ) as HTMLElement;

        if (todayElement) {
          scrollParentToChild(
            scrollableContentRef.current.parentElement.parentElement,
            todayElement
          );
        }
      });
    }
  }, [selectedYear]);

  // Touch drag tooltip handling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];

      // Start a timer for long press detection
      touchTimerRef.current = setTimeout(() => {
        setTouchDragMode(true);
        // Vibrate if supported
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        // Show tooltip for current position
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const dayButton = element?.closest("[data-date]") as HTMLElement;
        if (dayButton) {
          const dateKey = dayButton.getAttribute("data-date");
          if (dateKey) {
            setHoveredDayKey(dateKey);
          }
        }
      }, 1000);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchDragMode) {
        // Prevent scrolling when in tooltip drag mode
        e.preventDefault();

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const dayButton = element?.closest("[data-date]") as HTMLElement;

        if (dayButton) {
          const dateKey = dayButton.getAttribute("data-date");
          if (dateKey && dateKey !== hoveredDayKey) {
            setHoveredDayKey(dateKey);
          }
        }
      } else {
        // Cancel the timer if user starts scrolling before long press completes
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      }
    };

    const handleTouchEnd = () => {
      // Clear timer if touch ends before long press
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }

      // Exit tooltip drag mode
      setTouchDragMode(false);
      setHoveredDayKey(null);
    };

    scrollArea.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scrollArea.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    scrollArea.addEventListener("touchend", handleTouchEnd);
    scrollArea.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
      scrollArea.removeEventListener("touchstart", handleTouchStart);
      scrollArea.removeEventListener("touchmove", handleTouchMove);
      scrollArea.removeEventListener("touchend", handleTouchEnd);
      scrollArea.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [touchDragMode, hoveredDayKey]);

  return (
    <Card className={cn(className, "select-none")}>
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
      <TooltipProvider delayDuration={100} skipDelayDuration={0}>
        <ScrollArea ref={scrollAreaRef} className="-mb-3 max-w-full">
          <div ref={scrollableContentRef} className="flex gap-1 p-1 pb-3 px-6">
            {weeks.map((week, weekIndex) => {
              const firstValidDay = week.find((d) => d !== null);
              const weekKey = firstValidDay
                ? firstValidDay.toString()
                : `week-${weekIndex}`;

              return (
                <div key={weekKey} className="flex flex-col gap-1">
                  {week.map((day, index) => {
                    // Handle padding days (null)
                    if (!day) {
                      return <div key={`pad-${weekIndex}-${index}`} className="h-3 w-3" />;
                    }

                    const dateKey = formatDate(day, "yyyyMMdd");
                    const dailyValue = dailyValues.get(dateKey) || 0;

                    return (
                      <Tooltip
                        key={dateKey}
                        open={
                          touchDragMode ? hoveredDayKey === dateKey : undefined
                        }
                      >
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "block h-3 w-3 rounded-xs hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              getContributionColorClassName(
                                dailyValue,
                                tracker.goal,
                                maxDailyValue
                              )
                            )}
                            data-date={dateKey}
                            aria-label={`${formatDate(day, "MMM d, yyyy")}: ${
                              dailyValue > 0
                                ? formatValue(dailyValue)
                                : "No activity"
                            }`}
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
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </TooltipProvider>

      <TooltipProvider delayDuration={100} skipDelayDuration={0}>
        <div className="px-6 flex items-center gap-2 text-muted-foreground text-sm">
          <span>Less</span>
          <div className="flex flex-row-reverse gap-1">
            {(tracker.goal && tracker.goal > 0
              ? colorClassNamesGoal
              : colorClassNamesNoGoal
            ).map((className, i) => {
              const hasGoal = tracker.goal && tracker.goal > 0;
              const labels = hasGoal
                ? [
                    "Goal met",
                    "75%+ of goal",
                    "50%+ of goal",
                    "Some progress",
                    "No activity",
                  ]
                : [
                    "High activity",
                    "Medium activity",
                    "Low activity",
                    "Minimal activity",
                    "No activity",
                  ];

              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "block h-3 w-3 rounded-xs hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        className
                      )}
                      aria-label={labels[i]}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="pointer-events-none">
                    <div className="text-sm">{labels[i]}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <span>More</span>
        </div>
      </TooltipProvider>
    </Card>
  );
}
