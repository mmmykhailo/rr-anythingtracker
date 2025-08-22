import { Calendar } from "lucide-react";
import { formatDateString } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { HistoryEntryItem } from "./HistoryEntryItem";
import type { Tracker } from "~/lib/trackers";
import type { HistoryEntry } from "~/lib/history";

type HistoryDateGroupProps = {
  date: string;
  entries: HistoryEntry[];
  tracker: Tracker;
  onDeleteEntry: (entryId: string) => Promise<void>;
  deletingEntryId: string | null;
  entryLoading: boolean;
};

export function HistoryDateGroup({
  date,
  entries,
  tracker,
  onDeleteEntry,
  deletingEntryId,
  entryLoading,
}: HistoryDateGroupProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const totalValue = entries.reduce((sum, e) => sum + e.value, 0);
  const isToday = date === formatDateString(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>{isToday ? "Today" : formatDate(date)}</span>
          <span className="text-xs text-gray-500">
            ({entries.length} {entries.length === 1 ? "entry" : "entries"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Total:</span>
          <span
            className={cn("font-semibold", {
              "text-green-600": tracker.goal && totalValue >= tracker.goal,
            })}
          >
            {tracker.type === "checkbox"
              ? entries.some((e) => e.value > 0)
                ? "✓"
                : "✗"
              : tracker.isNumber
              ? totalValue
              : totalValue}
            {tracker.type !== "checkbox" &&
              tracker.isNumber &&
              tracker.goal &&
              ` / ${tracker.goal}`}
          </span>
        </div>
      </div>

      <div className="space-y-1 pl-5">
        {entries.map((entry) => (
          <HistoryEntryItem
            key={entry.id}
            entry={entry}
            tracker={tracker}
            onDelete={onDeleteEntry}
            isDeleting={deletingEntryId === entry.id}
            entryLoading={entryLoading}
          />
        ))}
      </div>
    </div>
  );
}
