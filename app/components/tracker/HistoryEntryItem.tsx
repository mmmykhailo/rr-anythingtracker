import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import type { Tracker } from "~/lib/trackers";
import type { HistoryEntry } from "~/lib/history";

type HistoryEntryItemProps = {
  entry: HistoryEntry;
  tracker: Tracker;
  onDelete: (entryId: string) => Promise<void>;
  isDeleting: boolean;
  entryLoading: boolean;
};

export function HistoryEntryItem({
  entry,
  tracker,
  onDelete,
  isDeleting,
  entryLoading,
}: HistoryEntryItemProps) {
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

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn("font-medium", {
              "text-green-600": tracker.goal && entry.value >= tracker.goal,
            })}
          >
            {tracker.type === "checkbox"
              ? entry.value > 0
                ? "✓ Tracked"
                : "✗ Not tracked"
              : tracker.isNumber
              ? `+${entry.value}`
              : `+${entry.value}`}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {formatDateTime(entry.createdAt)}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(entry.id)}
        disabled={isDeleting || entryLoading}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
