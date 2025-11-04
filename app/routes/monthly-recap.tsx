import { useState, useEffect } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import type { Route } from "./+types/monthly-recap";
import html2canvas from "html2canvas-pro";
import { getAllTrackers, getEntryHistory } from "~/lib/db";
import type { Tracker } from "~/lib/trackers";
import { formatStoredValue } from "~/lib/number-conversions";
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
} from "lucide-react";
import clsx from "clsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "~/components/ui/empty";
import { endOfMonth, isSameDay } from "date-fns";
import { formatDateString } from "~/lib/dates";

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
  entries: Entry[];
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = endOfMonth(start);

  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

function calculateStreaks(entries: Entry[]): {
  longestStreak: number;
  currentStreak: number;
} {
  if (entries.length === 0) return { longestStreak: 0, currentStreak: 0 };

  // Get unique dates and sort them
  const uniqueDates = [...new Set(entries.map((e) => e.date))].sort();

  let longestStreak = 0;
  let currentStreakCount = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const dayDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (from the most recent date backwards)
  if (uniqueDates.length > 0) {
    currentStreakCount = 1;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const currDate = new Date(uniqueDates[i + 1]);
      const prevDate = new Date(uniqueDates[i]);
      const dayDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreakCount++;
      } else {
        break;
      }
    }
  }

  return { longestStreak, currentStreak: currentStreakCount };
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

  const trackers = await getAllTrackers();

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

  for (const tracker of trackers) {
    // Get all entries for the tracker
    const allEntries = await getEntryHistory(tracker.id);

    // Filter entries by date range
    const entries = allEntries.filter(
      (entry) => entry.date >= start && entry.date <= end
    );

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    const daysTracked = new Set(entries.map((e) => e.date)).size;

    // Calculate daily totals
    const dailyTotals = entries.reduce((acc, entry) => {
      acc[entry.date] = (acc[entry.date] || 0) + entry.value;
      return acc;
    }, {} as Record<string, number>);

    // Calculate days missed based on whether tracker has a goal
    let daysMissed: number;
    if (tracker.goal) {
      // For trackers with goals: count days where goal wasn't met
      daysMissed = Object.values(dailyTotals).filter(
        (dailyTotal) => dailyTotal < tracker.goal!
      ).length;
    } else {
      // For trackers without goals: count days not tracked (excluding future days)
      daysMissed = Math.max(
        0,
        totalDaysInMonth - daysTracked - daysLeftToEndOfMonth
      );
    }

    const todayTotal = dailyTotals[formatDateString(new Date())];
    const isTodayGoalMet = tracker.goal
      ? todayTotal >= tracker.goal
      : !!todayTotal;
    const average = daysPassed ? total / daysPassed : total;
    const percentageDaysTracked = Math.floor(
      (daysTracked / (totalDaysInMonth - daysLeftToEndOfMonth)) * 100
    );

    const bestDay = Object.entries(dailyTotals).reduce(
      (best, [date, value]) => {
        if (!best || value > best.value) {
          return { date, value };
        }
        return best;
      },
      null as { date: string; value: number } | null
    );

    stats.push({
      tracker,
      total,
      daysTracked,
      daysMissed,
      percentageDaysTracked,
      isTodayGoalMet,
      isCurrentMonth,
      average,
      bestDay,
      entries,
    });
  }

  return {
    trackers,
    monthlyStats: stats,
    selectedYear: year,
    selectedMonth: month,
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

const GRADIENT_CLASSES = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-teal-500 to-green-500",
];

export default function MonthlyRecap() {
  const { trackers, monthlyStats, selectedYear, selectedMonth, hasGenerated } =
    useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const now = new Date();
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleMonthChange = (month: string) => {
    navigate(`/monthly-recap?year=${selectedYear}&month=${month}`);
  };

  const handleYearChange = (year: string) => {
    navigate(`/monthly-recap?year=${year}&month=${selectedMonth}`);
  };

  const handleDownloadCard = async (cardId: string, trackerTitle: string) => {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    setGeneratingCardId(cardId);

    try {
      // Wait a bit for the UI to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const fileName = `${trackerTitle
          .toLowerCase()
          .replace(/\s+/g, "-")}-${MONTH_NAMES[
          selectedMonth
        ].toLowerCase()}-${selectedYear}.png`;
        a.download = fileName;
        a.click();

        URL.revokeObjectURL(url);
        setGeneratingCardId(null);
      });
    } catch (error) {
      console.error("Failed to generate image:", error);
      setGeneratingCardId(null);
    }
  };

  const handleShareCard = async (cardId: string, trackerTitle: string) => {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    setGeneratingCardId(cardId);

    try {
      // Wait a bit for the UI to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `${trackerTitle
          .toLowerCase()
          .replace(/\s+/g, "-")}-${MONTH_NAMES[
          selectedMonth
        ].toLowerCase()}-${selectedYear}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // Check if Web Share API is available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${trackerTitle} - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
              text: `Check out my ${trackerTitle} progress for ${MONTH_NAMES[selectedMonth]}!`,
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

        setGeneratingCardId(null);
      });
    } catch (error) {
      console.error("Failed to share image:", error);
      setGeneratingCardId(null);
    }
  };

  const handleCopyCard = async (cardId: string, trackerTitle: string) => {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    setGeneratingCardId(cardId);

    try {
      // Wait a bit for the UI to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
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
          const fileName = `${trackerTitle
            .toLowerCase()
            .replace(/\s+/g, "-")}-${MONTH_NAMES[
            selectedMonth
          ].toLowerCase()}-${selectedYear}.png`;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }

        setGeneratingCardId(null);
      });
    } catch (error) {
      console.error("Failed to generate image:", error);
      setGeneratingCardId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pb-20">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Monthly Recap</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Month/Year Selector */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <div className="flex-1 flex gap-2">
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
                  {Array.from(
                    { length: 5 },
                    (_, i) => now.getFullYear() - i
                  ).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Recap Content */}
      {monthlyStats.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {monthlyStats.map((stat, index) => {
            const gradientClass =
              GRADIENT_CLASSES[index % GRADIENT_CLASSES.length];
            const { longestStreak, currentStreak } = calculateStreaks(
              stat.entries
            );
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
            const isGenerating = generatingCardId === stat.tracker.id;

            return (
              <div
                key={stat.tracker.id}
                id={`card-${stat.tracker.id}`}
                className={clsx(
                  "bg-gradient-to-br p-6 relative",
                  gradientClass,
                  {
                    "shadow-xl rounded-2xl": !isGenerating,
                  }
                )}
              >
                <div className="flex items-start gap-4 justify-between">
                  <h3 className="text-2xl font-bold mb-4 shrink">
                    {stat.tracker.title}
                  </h3>

                  {/* Month indicator */}
                  <div className="bg-black/30 rounded-lg px-3 py-1 text-sm font-medium shrink-0">
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">{displayTotal}</div>
                    <div className="text-sm opacity-90 mt-1">
                      {stat.tracker.type === "checkbox"
                        ? "Days Completed"
                        : "Month total"}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">{stat.daysTracked}</div>
                    <div className="text-sm opacity-90 mt-1">Days Tracked</div>
                  </div>

                  {stat.tracker.type === "checkbox" ? (
                    <div className="bg-black/20 rounded-xl p-4">
                      <div className="text-3xl font-bold">
                        {stat.percentageDaysTracked || 0}%
                      </div>
                      <div className="text-sm opacity-90 mt-1">
                        Days Tracked (%)
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/20 rounded-xl p-4">
                      <div className="text-3xl font-bold">{displayAvg}</div>
                      <div className="text-sm opacity-90 mt-1">
                        Daily Average
                      </div>
                    </div>
                  )}

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">{longestStreak}</div>
                    <div className="text-sm opacity-90 mt-1">
                      Longest Streak
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">{currentStreak}</div>
                    <div className="text-sm opacity-90 mt-1">
                      Current Streak
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">
                      {stat.daysMissed}
                      {!stat.isTodayGoalMet && stat.isCurrentMonth && (
                        <span className="text-base opacity-70"> (+ today)</span>
                      )}
                    </div>
                    <div className="text-sm opacity-90 mt-1">
                      {stat.tracker.goal ? "Days Goal Missed" : "Days Missed"}
                    </div>
                  </div>

                  {stat.bestDay && stat.tracker.type !== "checkbox" && (
                    <div className="bg-black/20 rounded-xl p-4 col-span-2">
                      <div className="text-sm opacity-90">Most tracked on</div>
                      <div className="text-xl font-bold mt-1">
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

                {/* Action buttons - hidden during image generation */}
                {!isGenerating && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() =>
                        handleDownloadCard(stat.tracker.id, stat.tracker.title)
                      }
                      className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {canShare ? (
                      <Button
                        onClick={() =>
                          handleShareCard(stat.tracker.id, stat.tracker.title)
                        }
                        className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          handleCopyCard(stat.tracker.id, stat.tracker.title)
                        }
                        className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
                      >
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    )}
                  </div>
                )}

                {isGenerating && (
                  <div className="text-center mt-4 text-white/50 text-xs">
                    Generated with tracker.mykhailo.net
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State - No data for selected month */}
      {monthlyStats.length === 0 && trackers.length > 0 && hasGenerated && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX className="w-6 h-6" />
            </EmptyMedia>
            <EmptyTitle>
              No data for {MONTH_NAMES[selectedMonth]} {selectedYear}
            </EmptyTitle>
            <EmptyDescription>
              There are no tracked entries for the selected month. Try selecting
              a different month or start tracking to see your recap.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Empty State - No month selected yet */}
      {monthlyStats.length === 0 && trackers.length > 0 && !hasGenerated && (
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
      {trackers.length === 0 && (
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
