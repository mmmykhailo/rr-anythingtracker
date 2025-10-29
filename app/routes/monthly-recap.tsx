import { useState, useRef } from 'react';
import { Link, useLoaderData } from 'react-router';
import html2canvas from 'html2canvas-pro';
import { getAllTrackers, getEntryHistory } from '~/lib/db';
import type { Tracker } from '~/lib/trackers';
import { formatStoredValue } from '~/lib/number-conversions';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ChevronLeft, Download, Calendar } from 'lucide-react';

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
  average: number;
  bestDay: { date: string; value: number } | null;
  entries: Entry[];
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function calculateStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;

  // Sort entries by date descending
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  let currentDate = new Date(sortedEntries[0].date);

  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.date);
    const dayDiff = Math.floor(
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 0 || dayDiff === 1) {
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }

  return streak;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const GRADIENT_CLASSES = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-green-500',
];

export default function MonthlyRecap() {
  const { trackers } = useLoaderData<typeof clientLoader>();
  const recapRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadMonthlyData = async () => {
    setLoading(true);
    const { start, end } = getMonthDateRange(selectedYear, selectedMonth);

    const stats: MonthlyStats[] = [];

    for (const tracker of trackers) {
      // Get all entries for the tracker
      const allEntries = await getEntryHistory(tracker.id);

      // Filter entries by date range
      const entries = allEntries.filter(entry =>
        entry.date >= start && entry.date <= end
      );

      if (entries.length === 0) continue;

      const total = entries.reduce((sum, entry) => sum + entry.value, 0);
      const daysTracked = new Set(entries.map(e => e.date)).size;
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
        average,
        bestDay,
        entries,
      });
    }

    setMonthlyStats(stats);
    setLoading(false);
  };

  const handleGenerateImage = async () => {
    if (!recapRef.current) return;

    setIsGenerating(true);

    try {
      // Wait a bit for the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(recapRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        logging: false,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monthly-recap-${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}.png`;
        a.click();

        URL.revokeObjectURL(url);
        setIsGenerating(false);
      });
    } catch (error) {
      console.error('Failed to generate image:', error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pb-20">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
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
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(year => (
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
            {loading ? 'Loading...' : 'Generate Recap'}
          </Button>
        </div>

        {/* Download Button */}
        {monthlyStats.length > 0 && (
          <Button
            onClick={handleGenerateImage}
            className="w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            disabled={isGenerating}
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download as Image'}
          </Button>
        )}
      </div>

      {/* Recap Content */}
      {monthlyStats.length > 0 && (
        <div ref={recapRef} className="max-w-2xl mx-auto bg-zinc-950 p-8 rounded-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your {MONTH_NAMES[selectedMonth]} Recap
            </h2>
            <p className="text-zinc-400 text-lg">{selectedYear}</p>
          </div>

          {/* Stats Grid */}
          <div className="space-y-6">
            {monthlyStats.map((stat, index) => {
              const gradientClass = GRADIENT_CLASSES[index % GRADIENT_CLASSES.length];
              const streak = calculateStreak(stat.entries);
              const displayTotal = stat.tracker.type === 'checkbox'
                ? stat.daysTracked
                : formatStoredValue(stat.total, stat.tracker.type);
              const displayAvg = stat.tracker.type === 'checkbox'
                ? '-'
                : formatStoredValue(Math.round(stat.average), stat.tracker.type);
              const displayBest = stat.bestDay && stat.tracker.type !== 'checkbox'
                ? formatStoredValue(stat.bestDay.value, stat.tracker.type)
                : '-';

              return (
                <div
                  key={stat.tracker.id}
                  className={`bg-gradient-to-br ${gradientClass} rounded-2xl p-6 shadow-xl`}
                >
                  <h3 className="text-2xl font-bold mb-4">{stat.tracker.title}</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-xl p-4">
                      <div className="text-3xl font-bold">{displayTotal}</div>
                      <div className="text-sm opacity-90 mt-1">
                        {stat.tracker.type === 'checkbox' ? 'Days Completed' : 'Total'}
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
                      <div className="text-3xl font-bold">{streak}</div>
                      <div className="text-sm opacity-90 mt-1">Day Streak</div>
                    </div>
                  </div>

                  {stat.bestDay && stat.tracker.type !== 'checkbox' && (
                    <div className="mt-4 bg-black/20 rounded-xl p-4">
                      <div className="text-sm opacity-90">Best Day</div>
                      <div className="text-xl font-bold mt-1">
                        {displayBest} on {new Date(stat.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-zinc-500 text-sm">
            Generated with Anything Tracker
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && monthlyStats.length === 0 && trackers.length > 0 && (
        <div className="max-w-2xl mx-auto text-center text-zinc-400 mt-12">
          <p className="text-lg mb-2">Select a month to view your recap</p>
          <p className="text-sm">Choose a month and year above, then click Generate Recap</p>
        </div>
      )}

      {!loading && trackers.length === 0 && (
        <div className="max-w-2xl mx-auto text-center text-zinc-400 mt-12">
          <p className="text-lg mb-2">No trackers yet</p>
          <p className="text-sm">Create some trackers and log entries to see your recap</p>
        </div>
      )}
    </div>
  );
}
