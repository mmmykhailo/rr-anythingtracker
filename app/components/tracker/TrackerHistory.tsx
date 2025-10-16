import { Clock } from "lucide-react";
import { HistoryDateGroup } from "./HistoryDateGroup";
import type { Tracker } from "~/lib/trackers";
import type { HistoryEntry } from "~/lib/history";

type TrackerHistoryProps = {
  history: HistoryEntry[];
  tracker: Tracker;
  onDeleteEntry: (entryId: string) => Promise<void>;
  deletingEntryId: string | null;
  entryLoading: boolean;
};

export function TrackerHistory({
  history,
  tracker,
  onDeleteEntry,
  deletingEntryId,
  entryLoading,
}: TrackerHistoryProps) {
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

  return history.length === 0 ? (
    <div className="text-center py-8">
      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        No entries yet. Start tracking to see your history here.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
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
