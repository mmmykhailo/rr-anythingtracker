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
  Palette,
  List,
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
  | "black-white"
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
  const theme = url.searchParams.get("theme") ?? "default";
  const tracker = url.searchParams.get("tracker") ?? "";

  const allTrackers = await getAllTrackers();
  const showHiddenTrackers = getShowHiddenTrackers();
  const trackers = showHiddenTrackers
    ? allTrackers
    : allTrackers.filter((t) => !t.isHidden);

  const selectedTrackers =
    tracker === "all" ? trackers : trackers.filter((t) => t.id === tracker);

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

    // Calculate all stats in a single pass
    const fromDate = new Date(year, month, 1);
    const toDate = endOfMonth(fromDate);

    const calculatedStats = calculateUnifiedStats(
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
        includeStreaks: true,
        includeTodayGoalMet: true,
      }
    );

    stats.push({
      tracker,
      total: calculatedStats.total ?? 0,
      daysTracked: calculatedStats.daysTracked ?? 0,
      daysMissed: calculatedStats.daysMissed ?? 0,
      percentageDaysTracked: calculatedStats.percentageDaysTracked ?? 0,
      isTodayGoalMet: calculatedStats.isTodayGoalMet ?? false,
      isCurrentMonth,
      average: calculatedStats.average ?? 0,
      bestDay: calculatedStats.bestDay ?? null,
      longestStreak: calculatedStats.longestStreak ?? 0,
      currentStreak: calculatedStats.currentStreak ?? 0,
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
    selectedTracker: tracker,
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
    watermark: "text-white/50"
  },
  "blue-cyan": {
    name: "Blue",
    background: "bg-gradient-to-br from-blue-500 to-cyan-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50"
  },
  "green-emerald": {
    name: "Green",
    background: "bg-gradient-to-br from-green-500 to-emerald-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50"
  },
  "orange-red": {
    name: "Orange",
    background: "bg-gradient-to-br from-orange-500 to-red-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50"
  },
  "indigo-purple": {
    name: "Purple",
    background: "bg-gradient-to-br from-indigo-500 to-purple-500",
    title: "text-white",
    date: "text-white",
    values: "text-white",
    description: "text-white",
    card: "bg-black/20",
    watermark: "text-white/50"
  },
  "black-white": {
    name: "Gray",
    background: "bg-gradient-to-br from-black to-white",
    title: "text-white",
    date: "text-black",
    values: "text-black",
    description: "text-black",
    card: "bg-white/80",
    watermark: "text-white/50"
  },
  "olive-green": {
    name: "Olive",
    background: "bg-gradient-to-br from-[#453e2e] to-[#4c4734]",
    title: "text-amber-500",
    date: "text-white",
    values: "text-white",
    description: "text-amber-500",
    card: "bg-black/10",
    watermark: "text-white/50"
  },
};

export default function MonthlyRecap() {
  const {
    monthlyStats,
    allTrackers,
    selectedYear,
    selectedMonth,
    selectedTheme,
    selectedTracker,
    hasGenerated,
  } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const now = new Date();
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleMonthChange = (month: string) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${month}&theme=${selectedTheme}&tracker=${selectedTracker}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleYearChange = (year: string) => {
    navigate(
      `/monthly-recap?year=${year}&month=${selectedMonth}&theme=${selectedTheme}&tracker=${selectedTracker}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleThemeChange = (theme: RecapThemeName) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${selectedMonth}&theme=${theme}&tracker=${selectedTracker}`,
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  };

  const handleTrackerChange = (tracker: string) => {
    navigate(
      `/monthly-recap?year=${selectedYear}&month=${selectedMonth}&theme=${selectedTheme}&tracker=${tracker}`,
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

  const handleDownloadCard = async (cardId: string, trackerTitle: string) => {
    setGeneratingCardId(cardId);

    try {
      const blob = await generateCardImage(cardId);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName(trackerTitle);
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleShareCard = async (cardId: string, trackerTitle: string) => {
    setGeneratingCardId(cardId);

    try {
      const blob = await generateCardImage(cardId);
      if (!blob) return;

      const fileName = getFileName(trackerTitle);
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
    } catch (error) {
      console.error("Failed to share image:", error);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleCopyCard = async (cardId: string, trackerTitle: string) => {
    setGeneratingCardId(cardId);

    try {
      const blob = await generateCardImage(cardId);
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
        a.download = getFileName(trackerTitle);
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setGeneratingCardId(null);
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

        <div className="flex flex-col gap-1 mb-8">
          {/* Month/Year Selector */}
          <div className="bg-zinc-900 rounded-xl px-4 py-3">
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

          <div className="flex gap-1">
            {/* Tracker/Theme Selector */}
            <div className="bg-zinc-900 rounded-xl px-4 py-3 grow">
              <div className="flex items-center gap-4">
                <List className="w-5 h-5 text-zinc-400" />
                <div className="flex-1 flex">
                  <Select
                    value={selectedTracker}
                    onValueChange={handleTrackerChange}
                  >
                    <SelectTrigger className="flex-1 max-w-[168px] truncate span>truncate">
                      {/* trim long titles with ellipsis */}
                      {/* <SelectValue placeholder="Select Tracker" className="" /> */}
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
            </div>

            {/* Tracker/Theme Selector */}
            <div className="bg-zinc-900 rounded-xl px-4 py-3 min-w-44">
              <div className="flex items-center gap-4">
                <Palette className="w-5 h-5 text-zinc-400" />
                <div className="flex-1 flex gap-2">
                  <Select
                    value={selectedTheme}
                    onValueChange={handleThemeChange}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {Object.entries(THEMES).map(([key, theme]) => (
                        <SelectItem key={key} value={key}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recap Content */}
      {monthlyStats.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6">
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
            const isGenerating = generatingCardId === stat.tracker.id;

            return (
              <div className="rounded-2xl overflow-hidden" key={index}>
                <div
                  key={stat.tracker.id}
                  id={`card-${stat.tracker.id}`}
                  className={clsx(
                    "bg-gradient-to-br p-6 relative",
                    themeObject.background
                  )}
                >
                  <div className="flex items-start gap-4 justify-between">
                    <h3 className={cn("text-2xl font-bold mb-4 shrink hyphens-auto wrap-break-word", themeObject.title)}>
                      {stat.tracker.title}
                    </h3>

                    {/* Month indicator */}
                    <div className={cn("bg-black/30 rounded-lg px-3 py-1 text-sm font-medium shrink-0", themeObject.card, themeObject.date)}>
                      {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                      <div className={cn("text-3xl font-bold", themeObject.values)}>{displayTotal}</div>
                      <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                        {stat.tracker.type === "checkbox"
                          ? "Days Completed"
                          : "Month total"}
                      </div>
                    </div>

                    <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                      <div className={cn("text-3xl font-bold", themeObject.values)}>
                        {stat.daysTracked}
                      </div>
                      <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                        Days Tracked
                      </div>
                    </div>

                    {stat.tracker.type === "checkbox" ? (
                      <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                        <div className={cn("text-3xl font-bold", themeObject.values)}>
                          {stat.percentageDaysTracked || 0}%
                        </div>
                        <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                          Days Tracked (%)
                        </div>
                      </div>
                    ) : (
                      <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                        <div className={cn("text-3xl font-bold", themeObject.values)}>{displayAvg}</div>
                        <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                          Daily Average
                        </div>
                      </div>
                    )}

                    <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                      <div className={cn("text-3xl font-bold", themeObject.values)}>
                        {stat.longestStreak}
                      </div>
                      <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                        Longest Streak
                      </div>
                    </div>

                    <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                      <div className={cn("text-3xl font-bold", themeObject.values)}>
                        {stat.currentStreak}
                      </div>
                      <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                        Current Streak
                      </div>
                    </div>

                    <div className={cn("bg-black/20 rounded-xl p-4", themeObject.card)}>
                      <div className={cn("text-3xl font-bold", themeObject.values)}>
                        {stat.daysMissed}
                        {!stat.isTodayGoalMet && stat.isCurrentMonth && (
                          <span className={cn("text-base opacity-70", themeObject.description)}>
                            {" "}
                            (+ today)
                          </span>
                        )}
                      </div>
                      <div className={cn("text-sm opacity-90 mt-1", themeObject.description)}>
                        {stat.tracker.goal ? "Days Goal Missed" : "Days Missed"}
                      </div>
                    </div>

                    {stat.bestDay && stat.tracker.type !== "checkbox" && (
                      <div className={cn("bg-black/20 rounded-xl p-4 col-span-2", themeObject.card)}>
                        <div className={cn("text-sm opacity-90", themeObject.description)}>
                          Most tracked on
                        </div>
                        <div className={cn("text-xl font-bold mt-1", themeObject.values)}>
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
                          handleDownloadCard(
                            stat.tracker.id,
                            stat.tracker.title
                          )
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
                    <div className="text-center mt-4 text-white/50 text-xs min-h-9 grid place-items-center">
                      Generated with tracker.mykhailo.net
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State - No data for selected month */}
      {!selectedTracker && hasGenerated && (
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
      {selectedTracker &&
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
