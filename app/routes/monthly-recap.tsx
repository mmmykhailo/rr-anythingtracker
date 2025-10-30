import { useState, useEffect } from "react";
import { Link, useLoaderData } from "react-router";
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
import { ChevronLeft, Download, Calendar, Share2 } from "lucide-react";
import clsx from "clsx";

export async function clientLoader() {
  const trackers = await getAllTrackers();
  return { trackers };
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
  average: number;
  bestDay: { date: string; value: number } | null;
  entries: Entry[];
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
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
  const { trackers } = useLoaderData<typeof clientLoader>();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const loadMonthlyData = async () => {
    setLoading(true);
    const { start, end } = getMonthDateRange(selectedYear, selectedMonth);

    // Calculate total days in the month
    const totalDaysInMonth = new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();

    const stats: MonthlyStats[] = [];

    for (const tracker of trackers) {
      // Get all entries for the tracker
      const allEntries = await getEntryHistory(tracker.id);

      // Filter entries by date range
      const entries = allEntries.filter(
        (entry) => entry.date >= start && entry.date <= end
      );

      if (entries.length === 0) continue;

      const total = entries.reduce((sum, entry) => sum + entry.value, 0);
      const daysTracked = new Set(entries.map((e) => e.date)).size;
      const daysMissed = totalDaysInMonth - daysTracked;
      const average = total / daysTracked;

      // Find best day
      const dailyTotals = entries.reduce((acc, entry) => {
        acc[entry.date] = (acc[entry.date] || 0) + entry.value;
        return acc;
      }, {} as Record<string, number>);

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
        average,
        bestDay,
        entries,
      });
    }

    setMonthlyStats(stats);
    setLoading(false);
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
                onValueChange={(value) => setSelectedMonth(Number(value))}
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
                onValueChange={(value) => setSelectedYear(Number(value))}
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
          <Button
            onClick={loadMonthlyData}
            className="w-full mt-3 bg-white text-black hover:bg-zinc-200"
            disabled={loading}
          >
            {loading ? "Loading..." : "Generate Recap"}
          </Button>
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
                {/* Month indicator */}
                <div className="absolute top-6 right-6 bg-black/30 rounded-lg px-3 py-1 text-sm font-medium">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </div>

                <h3 className="text-2xl font-bold mb-4 pr-32">
                  {stat.tracker.title}
                </h3>

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

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="text-3xl font-bold">{displayAvg}</div>
                    <div className="text-sm opacity-90 mt-1">Daily Average</div>
                  </div>

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
                    <div className="text-3xl font-bold">{stat.daysMissed}</div>
                    <div className="text-sm opacity-90 mt-1">Days Missed</div>
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
                      className={`${
                        canShare ? "flex-1" : "w-full"
                      } bg-black/30 hover:bg-black/40 text-white border-0`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {canShare && (
                      <Button
                        onClick={() =>
                          handleShareCard(stat.tracker.id, stat.tracker.title)
                        }
                        className="flex-1 bg-black/30 hover:bg-black/40 text-white border-0"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
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

      {/* Empty State */}
      {!loading && monthlyStats.length === 0 && trackers.length > 0 && (
        <div className="max-w-2xl mx-auto text-center text-zinc-400 mt-12">
          <p className="text-lg mb-2">Select a month to view your recap</p>
          <p className="text-sm">
            Choose a month and year above, then click Generate Recap
          </p>
        </div>
      )}

      {!loading && trackers.length === 0 && (
        <div className="max-w-2xl mx-auto text-center text-zinc-400 mt-12">
          <p className="text-lg mb-2">No trackers yet</p>
          <p className="text-sm">
            Create some trackers and log entries to see your recap
          </p>
        </div>
      )}
    </div>
  );
}
