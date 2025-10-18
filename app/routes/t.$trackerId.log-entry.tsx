import { useEffect, useState } from "react";
import { useParams, useLoaderData, useLocation } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { formatDateString } from "~/lib/dates";
import { useTrackerEntries } from "~/lib/hooks";
import { getTrackerById, getMostUsedTags } from "~/lib/db";
import { TrackerHeader, EntryInput } from "~/components/tracker";

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
    const mostUsedTags = await getMostUsedTags(trackerId, 5);
    return { tracker, mostUsedTags };
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
  const { tracker, mostUsedTags } = useLoaderData<typeof clientLoader>();
  const [currentValue, setCurrentValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() =>
    location?.state?.dateString
      ? formatDateString(new Date(location.state.dateString))
      : formatDateString(new Date())
  );

  const {
    addToCurrentEntry,
    getCurrentEntry,
    setEntry,
    loading: entryLoading,
  } = useTrackerEntries(trackerId || "");

  useEffect(() => {
    if (tracker && trackerId) {
      const loadCurrentValue = async () => {
        const value = await getCurrentEntry(selectedDate);
        setCurrentValue(value);
      };
      loadCurrentValue();
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
    } catch (error) {
      console.error("Failed to add value:", error);
    }
  };

  const handleCheckboxChange = async (checked: boolean, comment?: string) => {
    try {
      await setEntry(checked ? 1 : 0, selectedDate, comment);
      setCurrentValue(checked ? 1 : 0);
    } catch (error) {
      console.error("Failed to update checkbox:", error);
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
        onSubmit={handleQuickAdd}
        onCheckboxChange={handleCheckboxChange}
        entryLoading={entryLoading}
        mostUsedTags={mostUsedTags}
      />
    </div>
  );
}
