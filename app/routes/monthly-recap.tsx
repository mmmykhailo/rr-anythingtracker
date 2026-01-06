import { useState, useEffect, useMemo } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import type { Route } from "./+types/monthly-recap";
import html2canvas from "html2canvas-pro";
import { getAllTrackers, getEntryHistory } from "~/lib/db";
import type { Tracker } from "~/lib/trackers";
import { formatStoredValue } from "~/lib/number-conversions";
import { getShowHiddenTrackers } from "~/lib/user-settings";
import { calculateUnifiedStats } from "~/lib/stats";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ChevronLeft,
  Download,
  Calendar,
  Share2,
  CalendarX,
  CopyIcon,
  ChartNoAxesColumn,
} from "lucide-react";
import clsx from "clsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "~/components/ui/empty";
import { endOfMonth, endOfToday } from "date-fns";
import { formatDateString } from "~/lib/dates";
import { cn } from "~/lib/utils";

type Entry = {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
};

interface MonthlyStats {
  tracker: Tracker;
  total: number;
  daysTracked: number;
  daysMissed: number;
  isTodayGoalMet: boolean;
  isCurrentMonth: boolean;
  average: number;
  percentageDaysTracked: number;
  bestDay: { date: string; value: number } | null;
  longestStreak: number;
  currentStreak: number;
  entries: Entry[];
}

interface RecapTheme {
  name: string;
  background: string;
  title: string;
  date: string;
  values: string;
  description: string;
  card: string;
  watermark: string;
}

type RecapThemeName =
  | "purple-pink"
  | "blue-cyan"
  | "green-emerald"
  | "orange-red"
  | "indigo-purple"
  | "olive-green";

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = endOfMonth(start);

  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const now = new Date();

  // Get year and month from query params, default to current
  const year = parseInt(
    url.searchParams.get("year") || String(now.getFullYear())
  );
  const month = parseInt(
    url.searchParams.get("month") ?? String(now.getMonth())
  );
  const theme = url.searchParams.get("theme") ?? Object.keys(THEMES)[0];
  const trackerId = url.searchParams.get("trackerId") ?? "";

  const allTrackers = await getAllTrackers();
  const showHiddenTrackers = getShowHiddenTrackers();
  const trackers = showHiddenTrackers
    ? allTrackers
    : allTrackers.filter((t) => !t.isHidden);

  const selectedTrackers = trackers.filter((t) => t.id === trackerId);

  const { start, end } = getMonthDateRange(year, month);

  // Calculate total days in the month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate days left to end of month (including today) for current month
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const daysLeftToEndOfMonth = isCurrentMonth
    ? totalDaysInMonth - now.getDate()
    : 0;
  const daysPassed = Math.max(totalDaysInMonth - daysLeftToEndOfMonth, 0);

  const stats: MonthlyStats[] = [];

  for (const tracker of selectedTrackers) {
    // Get all entries for the tracker
    const allEntries = await getEntryHistory(tracker.id);

    // Filter entries by date range
    const entries = allEntries.filter(
      (entry) => entry.date >= start && entry.date <= end
    );

    // Calculate period-specific stats
    const fromDate = new Date(year, month, 1);
    const toDate = endOfMonth(fromDate);

    const periodStats = calculateUnifiedStats(
      entries,
      { fromDate, toDate },
      tracker.goal,
      {
        includeTotal: true,
        includeAverage: true,
        includeDaysTracked: true,
        includeDaysMissed: true,
        includePercentageDaysTracked: true,
        includeBestDay: true,
        includeTodayGoalMet: true,
      }
    );

    // Calculate streaks using ALL entries for full streak history
    const firstEntryDate =
      allEntries.length > 0
        ? new Date(
            Math.min(...allEntries.map((e) => new Date(e.date).getTime()))
          )
        : fromDate;

    const hasGoal = tracker.goal && tracker.goal > 0;

    const streakStats = calculateUnifiedStats(
      allEntries,
      { fromDate: firstEntryDate, toDate: endOfToday() },
      tracker.goal,
      hasGoal ? { includeGoalStreaks: true } : { includeStreaks: true }
    );

    stats.push({
      tracker,
      total: periodStats.total ?? 0,
      daysTracked: periodStats.daysTracked ?? 0,
      daysMissed: periodStats.daysMissed ?? 0,
      percentageDaysTracked: periodStats.percentageDaysTracked ?? 0,
      isTodayGoalMet: periodStats.isTodayGoalMet ?? false,
      isCurrentMonth,
      average: periodStats.average ?? 0,
      bestDay: periodStats.bestDay ?? null,
      longestStreak: hasGoal
        ? (streakStats.longestGoalStreak ?? 0)
        : (streakStats.longestStreak ?? 0),
      currentStreak: hasGoal
        ? (streakStats.currentGoalStreak ?? 0)
        : (streakStats.currentStreak ?? 0),
      entries,
    });
  }

  return {
    monthlyStats: stats,
    allTrackers: allTrackers,
    selectedTrackers: selectedTrackers,
    selectedYear: year,
    selectedMonth: month,
    selectedTheme: theme as RecapThemeName & "default",
    selectedTrackerId: trackerId,
    hasGenerated: true,
  };
}

export function meta() {
  return [
    { title: "Monthly Recap - AnythingTracker" },
    {
      name: "description",
      content:
        "View your monthly tracking statistics, achievements, and progress. Generate beautiful recap images to share your accomplishments.",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const THEMES: Record<RecapThemeName, RecapTheme> = {
  "purple-pink": {
    name: "Pink",
    background: "bg-gradient-to-br from-purple-500 to-pink-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50",
  },
  "blue-cyan": {
    name: "Blue",
    background: "bg-gradient-to-br from-blue-500 to-cyan-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50",
  },
  "green-emerald": {
    name: "Green",
    background: "bg-gradient-to-br from-green-500 to-emerald-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50",
  },
  "orange-red": {
    name: "Orange",
    background: "bg-gradient-to-br from-orange-500 to-red-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50",
  },
  "indigo-purple": {
    name: "Purple",
    background: "bg-gradient-to-br from-indigo-500 to-purple-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50",
  },
  "olive-green": {
    name: "Olive",
    background: "bg-gradient-to-br from-[#453e2e] to-[#4c4734]",
    title: "text-amber-500",
    date: "text-white",
    values: "text-white",
    description: "text-amber-500",
    card: "bg-black/10",
    watermark: "text-white/50",
  },
};

export default function MonthlyRecap() {
  const {
    monthlyStats,
    allTrackers,
    selectedYear,
    selectedMonth,
    selectedTheme,
    selectedTrackerId,
    hasGenerated,
  } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const currentTracker = allTrackers.find((t) => t.id === selectedTrackerId);

  const now = new Date();
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleMonthChange = (month: string) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${month}&theme=${selectedTheme}&trackerId=${selectedTrackerId}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleYearChange = (year: string) => {
    navigate(
      `/monthly-recap?year=${year}&month=${selectedMonth}&theme=${selectedTheme}&trackerId=${selectedTrackerId}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleThemeChange = (theme: RecapThemeName) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${selectedMonth}&theme=${theme}&trackerId=${selectedTrackerId}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleTrackerChange = (tracker: string) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${selectedMonth}&theme=${selectedTheme}&trackerId=${tracker}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const generateCardImage = async (cardId: string): Promise<Blob | null> => {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return null;

    // Wait a bit for the UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: 3,
      logging: false,
      x: 1,
      width: cardElement.offsetWidth - 1,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      });
    });
  };

  const getFileName = (trackerTitle: string) => {
    return `${trackerTitle.toLowerCase().replace(/\s+/g, "-")}-${MONTH_NAMES[
      selectedMonth
    ].toLowerCase()}-${selectedYear}.png`;
  };

  const handleDownloadCard = async () => {
    if (!currentTracker) return;

    try {
      const blob = await generateCardImage(currentTracker.id);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName(currentTracker.title);
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  const handleShareCard = async () => {
    if (!currentTracker) return;

    try {
      const blob = await generateCardImage(currentTracker.id);
      if (!blob) return;

      const fileName = getFileName(currentTracker.title);
      const file = new File([blob], fileName, { type: "image/png" });

      // Check if Web Share API is available
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${currentTracker.title} - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
            text: `Check out my ${currentTracker.title} progress for ${MONTH_NAMES[selectedMonth]}!`,
          });
        } catch (error) {
          // User cancelled or share failed
          console.log("Share cancelled or failed:", error);
        }
      } else {
        // Fallback: just download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to share image:", error);
    }
  };

  const handleCopyCard = async () => {
    if (!currentTracker) return;

    try {
      const blob = await generateCardImage(currentTracker.id);
      if (!blob) return;

      try {
        // Copy image to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
      } catch (error) {
        console.error("Failed to copy image to clipboard:", error);
        // Fallback: download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getFileName(currentTracker.title);
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    }
  };

  const themeObject = useMemo(() => {
    if (selectedTheme === "default") {
      return THEMES["purple-pink"];
    }
    return THEMES[selectedTheme] || THEMES["purple-pink"];
  }, [selectedTheme]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-4 pb-8">
      <div className="fixed z-50 select-none pointer-events-none top-0 left-0 right-0 h-5 bg-linear-to-b from-black/80 to-black/0" />
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <Link
            to="/"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <Select
            value={selectedMonth.toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(
                (year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex mb-4">
          <Select value={selectedTrackerId} onValueChange={handleTrackerChange}>
            <SelectTrigger className="flex-1 truncate span>truncate">
              <span className="block truncate">
                <SelectValue placeholder="Select Tracker" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {allTrackers.map((tracker) => (
                <SelectItem key={tracker.id} value={tracker.id}>
                  {tracker.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recap Content */}
      {monthlyStats.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6 select-none">
          {monthlyStats.map((stat, index) => {
            const displayTotal =
              stat.tracker.type === "checkbox"
                ? stat.daysTracked
                : formatStoredValue(stat.total, stat.tracker.type);
            const displayAvg =
              stat.tracker.type === "checkbox"
                ? "-"
                : formatStoredValue(
                    Math.round(stat.average),
                    stat.tracker.type
                  );
            const displayBest =
              stat.bestDay && stat.tracker.type !== "checkbox"
                ? formatStoredValue(stat.bestDay.value, stat.tracker.type)
                : "-";

            return (
              <div className="rounded-2xl overflow-hidden" key={index}>
                <div
                  key={stat.tracker.id}
                  id={`card-${stat.tracker.id}`}
                  className={clsx(
                    "bg-gradient-to-br p-6 pb-4 relative",
                    themeObject.background
                  )}
                >
                  <div className="flex items-start gap-4 justify-between">
                    <h3
                      className={cn(
                        "text-2xl font-bold mb-4 shrink hyphens-auto wrap-break-word",
                        themeObject.title
                      )}
                    >
                      {stat.tracker.title}
                    </h3>

                    {/* Month indicator */}
                    <div
                      className={cn(
                        "bg-black/30 rounded-lg px-3 py-1 text-sm font-medium shrink-0",
                        themeObject.card,
                        themeObject.date
                      )}
                    >
                      {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "bg-black/20 rounded-xl p-4",
                        themeObject.card
                      )}
                    >
                      <div
                        className={cn("text-3xl font-bold", themeObject.values)}
                      >
                        {displayTotal}
                      </div>
                      <div
                        className={cn(
                          "text-sm opacity-90 mt-1",
                          themeObject.description
                        )}
                      >
                        {stat.tracker.type === "checkbox"
                          ? "Days Completed"
                          : "Month total"}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "bg-black/20 rounded-xl p-4",
                        themeObject.card
                      )}
                    >
                      <div
                        className={cn("text-3xl font-bold", themeObject.values)}
                      >
                        {stat.daysTracked}
                      </div>
                      <div
                        className={cn(
                          "text-sm opacity-90 mt-1",
                          themeObject.description
                        )}
                      >
                        Days Tracked
                      </div>
                    </div>

                    {stat.tracker.type === "checkbox" ? (
                      <div
                        className={cn(
                          "bg-black/20 rounded-xl p-4",
                          themeObject.card
                        )}
                      >
                        <div
                          className={cn(
                            "text-3xl font-bold",
                            themeObject.values
                          )}
                        >
                          {stat.percentageDaysTracked || 0}%
                        </div>
                        <div
                          className={cn(
                            "text-sm opacity-90 mt-1",
                            themeObject.description
                          )}
                        >
                          Days Tracked (%)
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "bg-black/20 rounded-xl p-4",
                          themeObject.card
                        )}
                      >
                        <div
                          className={cn(
                            "text-3xl font-bold",
                            themeObject.values
                          )}
                        >
                          {displayAvg}
                        </div>
                        <div
                          className={cn(
                            "text-sm opacity-90 mt-1",
                            themeObject.description
                          )}
                        >
                          Daily Average
                        </div>
                      </div>
                    )}

                    <div
                      className={cn(
                        "bg-black/20 rounded-xl p-4",
                        themeObject.card
                      )}
                    >
                      <div
                        className={cn("text-3xl font-bold", themeObject.values)}
                      >
                        {stat.longestStreak}
                      </div>
                      <div
                        className={cn(
                          "text-sm opacity-90 mt-1",
                          themeObject.description
                        )}
                      >
                        Longest Streak
                      </div>
                    </div>

                    <div
                      className={cn(
                        "bg-black/20 rounded-xl p-4",
                        themeObject.card
                      )}
                    >
                      <div
                        className={cn("text-3xl font-bold", themeObject.values)}
                      >
                        {stat.currentStreak}
                      </div>
                      <div
                        className={cn(
                          "text-sm opacity-90 mt-1",
                          themeObject.description
                        )}
                      >
                        Current Streak
                      </div>
                    </div>

                    <div
                      className={cn(
                        "bg-black/20 rounded-xl p-4",
                        themeObject.card
                      )}
                    >
                      <div
                        className={cn("text-3xl font-bold", themeObject.values)}
                      >
                        {stat.daysMissed}
                        {!stat.isTodayGoalMet && stat.isCurrentMonth && (
                          <span
                            className={cn(
                              "text-base opacity-70",
                              themeObject.description
                            )}
                          >
                            {" "}
                            (+ today)
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-sm opacity-90 mt-1",
                          themeObject.description
                        )}
                      >
                        {stat.tracker.goal ? "Days Goal Missed" : "Days Missed"}
                      </div>
                    </div>

                    {stat.bestDay && stat.tracker.type !== "checkbox" && (
                      <div
                        className={cn(
                          "bg-black/20 rounded-xl p-4 col-span-2",
                          themeObject.card
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm opacity-90",
                            themeObject.description
                          )}
                        >
                          Most tracked on
                        </div>
                        <div
                          className={cn(
                            "text-xl font-bold mt-1",
                            themeObject.values
                          )}
                        >
                          {displayBest} on{" "}
                          {new Date(stat.bestDay.date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center mt-4 text-white/50 text-xs flex gap-1">
                    <ChartNoAxesColumn className="w-4 h-4 inline mr-1 mb-0.5" />
                    Generated with tracker.mykhailo.net
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTrackerId && (
        <>
          <div className="flex w-full items-center justify-evenly my-6">
            {Object.entries(THEMES).map(([key, theme]) => (
              <div
                key={key}
                className={cn(
                  "w-7 h-7 rounded-full cursor-pointer flex items-center justify-center text-sm font-semibold select-none",
                  theme.background,
                  theme.title,
                  selectedTheme === key ? "border-2 border-white" : ""
                )}
                onClick={() => handleThemeChange(key as RecapThemeName)}
              >
                {currentTracker?.title[0].toUpperCase() || "A"}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleDownloadCard}
              className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {canShare ? (
              <Button
                onClick={handleShareCard}
                className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            ) : (
              <Button
                onClick={handleCopyCard}
                className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                Copy
              </Button>
            )}
          </div>
        </>
      )}

      {/* Empty State - No data for selected month */}
      {!selectedTrackerId && hasGenerated && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle>
              No tracker selected for {MONTH_NAMES[selectedMonth]}{" "}
              {selectedYear}
            </EmptyTitle>
            <EmptyDescription>
              Please select a tracker above to view your monthly recap.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty State - No data for selected month */}
      {selectedTrackerId &&
        monthlyStats.length === 0 &&
        allTrackers.length > 0 &&
        hasGenerated && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX className="w-6 h-6" />
              </EmptyMedia>
              <EmptyTitle>
                No data for {MONTH_NAMES[selectedMonth]} {selectedYear}
              </EmptyTitle>
              <EmptyDescription>
                There are no tracked entries for the selected month. Try
                selecting a different month or start tracking to see your recap.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

      {/* Empty State - No month selected yet */}
      {monthlyStats.length === 0 && allTrackers.length > 0 && !hasGenerated && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle>Select a month to view your recap</EmptyTitle>
            <EmptyDescription>
              Choose a month and year above to see your tracking statistics.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty State - No trackers */}
      {allTrackers.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle>No trackers yet</EmptyTitle>
            <EmptyDescription>
              Create some trackers and log entries to see your monthly recap.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
