import { Calendar, ChevronLeft, Plus, Trash2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import { useTracker, useTrackerEntries } from "~/lib/hooks";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "New React Router App" }];
}

interface HistoryEntry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  createdAt: Date;
}

export default function LogEntryPage() {
  const { trackerId } = useParams();
  const [currentValue, setCurrentValue] = useState(0);
  const [customInputValue, setCustomInputValue] = useState("");
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateString(new Date())
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const {
    tracker,
    loading: trackerLoading,
    error: trackerError,
  } = useTracker(trackerId || "");
  const {
    addToCurrentEntry,
    getCurrentEntry,
    setEntry,
    getHistory,
    removeEntryById,
    loading: entryLoading,
  } = useTrackerEntries(trackerId || "");

  const loadHistory = async () => {
    if (trackerId) {
      const entries = await getHistory(20); // Limit to last 20 entries
      setHistory(entries);
    }
  };

  useEffect(() => {
    if (tracker && trackerId) {
      const loadCurrentValue = async () => {
        const value = await getCurrentEntry(selectedDate);
        setCurrentValue(value);
        setIsCheckboxChecked(value > 0);
      };
      loadCurrentValue();
      loadHistory();
    }
  }, [tracker, getCurrentEntry, selectedDate, trackerId]);

  const handleQuickAdd = async (valueToAdd: number) => {
    try {
      const newValue = await addToCurrentEntry(valueToAdd, selectedDate);
      setCurrentValue(newValue);
      await loadHistory(); // Refresh history after adding
    } catch (error) {
      console.error("Failed to add value:", error);
    }
  };

  const handleCustomAdd = async () => {
    const value = parseFloat(customInputValue);
    if (Number.isNaN(value) || value <= 0) return;

    try {
      const newValue = await addToCurrentEntry(value, selectedDate);
      setCurrentValue(newValue);
      setCustomInputValue("");
      await loadHistory(); // Refresh history after adding
    } catch (error) {
      console.error("Failed to add custom value:", error);
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      setIsCheckboxChecked(checked);
      await setEntry(checked ? 1 : 0, selectedDate);
      setCurrentValue(checked ? 1 : 0);
      await loadHistory(); // Refresh history after updating
    } catch (error) {
      console.error("Failed to update checkbox:", error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      setDeletingEntryId(entryId);
      await removeEntryById(entryId);
      await loadHistory(); // Refresh history after deletion
      // Also refresh current value after deletion
      const value = await getCurrentEntry(selectedDate);
      setCurrentValue(value);
      setIsCheckboxChecked(value > 0);
    } catch (error) {
      console.error("Failed to delete entry:", error);
    } finally {
      setDeletingEntryId(null);
    }
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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

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

  if (trackerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading tracker...</div>
      </div>
    );
  }

  if (trackerError || !tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">
          {trackerError || "Tracker not found"}
        </div>
      </div>
    );
  }

  const quickAddValues = quickAddValuesMap[tracker.type];
  const isToday = selectedDate === formatDateString(new Date());

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">{tracker.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col py-6 gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isToday
            ? "Today"
            : `${new Date(selectedDate).toLocaleDateString("en", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
        </div>
        {tracker.type === "checkbox" ? (
          <div className="flex items-center gap-3">
            <Checkbox
              id="isTrackedToday"
              checked={isCheckboxChecked}
              onCheckedChange={handleCheckboxChange}
              disabled={entryLoading}
            />
            <Label htmlFor="isTrackedToday">Tracked today</Label>
          </div>
        ) : (
          <>
            <div>
              Current:{" "}
              <span
                className={cn("text-xl font-semibold", {
                  "text-green-600":
                    tracker.goal && currentValue >= tracker.goal,
                })}
              >
                {currentValue}
                {!!tracker.goal && ` / ${tracker.goal}`}
              </span>
            </div>

            {!!quickAddValues && (
              <div className="flex gap-4">
                {quickAddValues.map(({ label, value }) => (
                  <Button
                    key={value}
                    onClick={() => handleQuickAdd(value)}
                    disabled={entryLoading}
                  >
                    <Plus /> {label}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-4 items-center mt-2">
              Custom
              <Input
                className="w-40 shrink"
                placeholder="17492"
                type="number"
                value={customInputValue}
                onChange={(e) => setCustomInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomAdd();
                  }
                }}
              />
              <Button
                onClick={handleCustomAdd}
                disabled={
                  entryLoading ||
                  !customInputValue ||
                  Number.isNaN(parseFloat(customInputValue))
                }
              >
                <Plus /> Add
              </Button>
            </div>
          </>
        )}

        {/* History Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold">Recent History</h2>
            <span className="text-sm text-gray-500">
              ({history.length} entries)
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No entries yet. Start tracking to see your history here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {groupEntriesByDate(history).map(({ date, entries }) => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 pb-1 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {date === formatDateString(new Date())
                          ? "Today"
                          : formatDate(date)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({entries.length}{" "}
                        {entries.length === 1 ? "entry" : "entries"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Total:</span>
                      <span
                        className={cn("font-semibold", {
                          "text-green-600":
                            tracker.goal &&
                            entries.reduce((sum, e) => sum + e.value, 0) >=
                              tracker.goal,
                        })}
                      >
                        {tracker.type === "checkbox"
                          ? entries.some((e) => e.value > 0)
                            ? "✓"
                            : "✗"
                          : entries.reduce((sum, e) => sum + e.value, 0)}
                        {tracker.type !== "checkbox" &&
                          tracker.goal &&
                          ` / ${tracker.goal}`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 pl-5">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn("font-medium", {
                                "text-green-600":
                                  tracker.goal && entry.value >= tracker.goal,
                              })}
                            >
                              {tracker.type === "checkbox"
                                ? entry.value > 0
                                  ? "✓ Tracked"
                                  : "✗ Not tracked"
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
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={
                            deletingEntryId === entry.id || entryLoading
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
