import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { formatDateString } from "~/lib/dates";
import { useTracker, useTrackerEntries } from "~/lib/hooks";
import {
  TrackerHeader,
  EntryInput,
  TrackerHistory,
} from "~/components/tracker";
import type { HistoryEntry } from "~/components/tracker";

export function meta({ params }: { params: { trackerId: string } }) {
  return [
    { title: "Log Entry - AnythingTracker" },
    {
      name: "description",
      content: "Log new entries and view history for your tracker",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function LogEntryPage() {
  const { trackerId } = useParams();
  const [currentValue, setCurrentValue] = useState(0);
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

  return (
    <div>
      <TrackerHeader
        trackerTitle={tracker.title}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <EntryInput
        tracker={tracker}
        currentValue={currentValue}
        selectedDate={selectedDate}
        onQuickAdd={handleQuickAdd}
        onCheckboxChange={handleCheckboxChange}
        entryLoading={entryLoading}
      />

      <TrackerHistory
        history={history}
        tracker={tracker}
        onDeleteEntry={handleDeleteEntry}
        deletingEntryId={deletingEntryId}
        entryLoading={entryLoading}
      />
    </div>
  );
}
