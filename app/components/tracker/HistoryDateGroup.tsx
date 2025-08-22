import { Calendar, Trash2 } from "lucide-react";
import { formatDateString } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatEntryValue = (entry: HistoryEntry, tracker: Tracker) => {
    if (tracker.type === "checkbox") {
      return entry.value > 0 ? "✓ Tracked" : "✗ Not tracked";
    }
    return entry.value < 0 ? `${entry.value}` : `+${entry.value}`;
  };

  const totalValue = entries.reduce((sum, e) => sum + e.value, 0);
  const isToday = date === formatDateString(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 pb-1">
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

      <div className="border rounded-2xl">
        <Table>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="w-24">
                  <span className="font-medium">
                    {formatEntryValue(entry, tracker)}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteEntry(entry.id)}
                    disabled={deletingEntryId === entry.id || entryLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
