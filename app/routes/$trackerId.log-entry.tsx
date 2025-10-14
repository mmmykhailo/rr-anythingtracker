import { useEffect, useState } from "react";
import { useParams, useLoaderData, useLocation } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { formatDateString } from "~/lib/dates";
import { useTrackerEntries } from "~/lib/hooks";
import { getTrackerById } from "~/lib/db";
import {
  TrackerHeader,
  EntryInput,
  TrackerHistory,
} from "~/components/tracker";
import type { HistoryEntry } from "~/components/tracker";

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }
    return { tracker };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

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
  const location = useLocation();
  const { tracker } = useLoaderData<typeof clientLoader>();
  const [currentValue, setCurrentValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() =>
    location?.state?.dateString
      ? formatDateString(new Date(location.state.dateString))
      : formatDateString(new Date())
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

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
      };
      loadCurrentValue();
      loadHistory();
    }
  }, [tracker, getCurrentEntry, selectedDate, trackerId]);

  const handleQuickAdd = async (valueToAdd: number, comment?: string) => {
    try {
      const newValue = await addToCurrentEntry(
        valueToAdd,
        selectedDate,
        comment
      );
      setCurrentValue(newValue);
      await loadHistory(); // Refresh history after adding
    } catch (error) {
      console.error("Failed to add value:", error);
    }
  };

  const handleCheckboxChange = async (checked: boolean, comment?: string) => {
    try {
      await setEntry(checked ? 1 : 0, selectedDate, comment);
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
    } catch (error) {
      console.error("Failed to delete entry:", error);
    } finally {
      setDeletingEntryId(null);
    }
  };

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
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
