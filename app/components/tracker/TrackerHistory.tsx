import { Clock } from "lucide-react";
import { useMemo } from "react";
import { HistoryDateGroup } from "./HistoryDateGroup";
import type { Tracker } from "~/lib/trackers";
import type { HistoryEntry } from "~/lib/history";
import { toDisplayValue, displayUnits } from "~/lib/number-conversions";
import { format, subDays } from "date-fns";

type TrackerHistoryProps = {
  history: HistoryEntry[];
  tracker: Tracker;
  onDeleteEntry: (entryId: string) => Promise<void>;
  deletingEntryId: string | null;
  entryLoading: boolean;
  withoutStats?: boolean;
};

export function TrackerHistory(props: TrackerHistoryProps) {
  const {
    history,
    tracker,
    onDeleteEntry,
    deletingEntryId,
    entryLoading,
    withoutStats,
  } = props;
  const groupEntriesByDate = (entries: HistoryEntry[]) => {
    const grouped: Record<string, HistoryEntry[]> = {};

    entries.forEach((entry) => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map((date) => ({
      date,
      entries: grouped[date].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
  };

  const periodTotals = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekAgoStr = format(subDays(today, 6), "yyyy-MM-dd"); // 7 days including today
    const monthAgoStr = format(subDays(today, 29), "yyyy-MM-dd"); // 30 days including today
    const yearAgoStr = format(subDays(today, 364), "yyyy-MM-dd"); // 365 days including today

    let weekTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;

    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;

    history.forEach((entry) => {
      const entryDate = entry.date;
      if (entryDate >= weekAgoStr && entryDate <= todayStr) {
        weekTotal += entry.value;
        weekCount++;
      }
      if (entryDate >= monthAgoStr && entryDate <= todayStr) {
        monthTotal += entry.value;
        monthCount++;
      }
      if (entryDate >= yearAgoStr && entryDate <= todayStr) {
        yearTotal += entry.value;
        yearCount++;
      }
    });

    return {
      week: {
        total: toDisplayValue(weekTotal, tracker.type),
        entriesCount: weekCount,
      },
      month: {
        total: toDisplayValue(monthTotal, tracker.type),
        entriesCount: monthCount,
      },
      year: {
        total: toDisplayValue(yearTotal, tracker.type),
        entriesCount: yearCount,
      },
    };
  }, [history, tracker.type]);

  const unit = displayUnits[tracker.type];

  return history.length === 0 ? (
    <div className="text-center py-8">
      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        No entries yet. Start tracking to see your history here.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
      {/* Period Totals */}
      {!withoutStats && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl border border-border/50">
          <div className="text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              7 days
            </p>
            <p className="text-lg font-bold tabular-nums">
              {periodTotals.week.total}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {unit}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {periodTotals.week.entriesCount}{" "}
              {periodTotals.week.entriesCount === 1 ? "entry" : "entries"}
            </p>
          </div>
          <div className="text-center space-y-1 border-x border-border/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              30 days
            </p>
            <p className="text-lg font-bold tabular-nums">
              {periodTotals.month.total}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {unit}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {periodTotals.month.entriesCount}{" "}
              {periodTotals.month.entriesCount === 1 ? "entry" : "entries"}
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
              365 days
            </p>
            <p className="text-lg font-bold tabular-nums">
              {periodTotals.year.total}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {unit}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {periodTotals.year.entriesCount}{" "}
              {periodTotals.year.entriesCount === 1 ? "entry" : "entries"}
            </p>
          </div>
        </div>
      )}

      {groupEntriesByDate(history).map(({ date, entries }) => (
        <HistoryDateGroup
          key={date}
          date={date}
          entries={entries}
          tracker={tracker}
          onDeleteEntry={onDeleteEntry}
          deletingEntryId={deletingEntryId}
          entryLoading={entryLoading}
        />
      ))}
    </div>
  );
}
