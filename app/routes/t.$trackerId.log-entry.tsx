import { useState, useEffect } from "react";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useNavigate,
} from "react-router";
import type {
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
} from "react-router";
import { formatDateString } from "~/lib/dates";
import {
  getTrackerById,
  getMostUsedTags,
  createEntry,
  getTotalValueForDate,
  getDB,
  deleteEntryById,
  getEntryHistory,
} from "~/lib/db";
import { debouncedDataChange } from "~/lib/data-change-events";
import {
  TrackerHeader,
  EntryInput,
  TrackerHistory,
} from "~/components/tracker";

export async function clientLoader({
  params,
  request,
}: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const selectedDate = dateParam || formatDateString(new Date());

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }

    const mostUsedTags = await getMostUsedTags(trackerId, 5);
    const currentValue = await getTotalValueForDate(trackerId, selectedDate);
    const allHistory = await getEntryHistory(trackerId);

    // Filter history to only entries for the selected date
    const history = allHistory.filter((entry) => entry.date === selectedDate);

    return { tracker, currentValue, selectedDate, mostUsedTags, history };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

export async function clientAction({
  params,
  request,
}: ClientActionFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const date = (formData.get("date") as string) || formatDateString(new Date());
  const comment = (formData.get("comment") as string) || undefined;

  try {
    if (intent === "addValue") {
      const valueToAdd = parseInt(formData.get("value") as string);
      if (!isNaN(valueToAdd)) {
        await createEntry(trackerId, date, valueToAdd, false, false, comment);
        debouncedDataChange.dispatch("entry_added", {
          trackerId,
          date,
          value: valueToAdd,
        });
      }
    } else if (intent === "setCheckbox") {
      const checked = formData.get("checked") === "true";
      const value = checked ? 1 : 0;

      // Delete all existing entries for this date
      const db = await getDB();
      const entries = await db.getAllFromIndex(
        "entries",
        "by-tracker",
        trackerId
      );
      const dateEntries = entries.filter((entry) => entry.date === date);
      for (const entry of dateEntries) {
        await deleteEntryById(entry.id);
      }

      // Create new entry if checked
      if (value > 0) {
        await createEntry(trackerId, date, value, false, false, comment);
      }

      debouncedDataChange.dispatch("entry_updated", { trackerId, date, value });
    } else if (intent === "deleteEntry") {
      const entryId = formData.get("entryId") as string;
      if (entryId) {
        await deleteEntryById(entryId);
        debouncedDataChange.dispatch("entry_deleted", { trackerId });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to perform action:", error);
    return { success: false, error: "Failed to update entry" };
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
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const {
    tracker,
    mostUsedTags,
    currentValue: loaderCurrentValue,
    selectedDate,
    history,
  } = useLoaderData<typeof clientLoader>();

  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const isLoading = navigation.state !== "idle";

  const handleDateChange = (newDate: string) => {
    navigate(`?date=${newDate}`, { replace: true });
  };

  const handleQuickAdd = async (valueToAdd: number, comment?: string) => {
    const formData = new FormData();
    formData.append("intent", "addValue");
    formData.append("value", valueToAdd.toString());
    formData.append("date", selectedDate);
    if (comment) {
      formData.append("comment", comment);
    }

    submit(formData, { method: "post" });
  };

  const handleCheckboxChange = async (checked: boolean, comment?: string) => {
    const formData = new FormData();
    formData.append("intent", "setCheckbox");
    formData.append("checked", checked.toString());
    formData.append("date", selectedDate);
    if (comment) {
      formData.append("comment", comment);
    }

    submit(formData, { method: "post" });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    setDeletingEntryId(entryId);

    const formData = new FormData();
    formData.append("intent", "deleteEntry");
    formData.append("entryId", entryId);

    submit(formData, { method: "post" });
  };

  // Clear deletingEntryId when navigation is complete
  useEffect(() => {
    if (navigation.state === "idle") {
      setDeletingEntryId(null);
    }
  }, [navigation.state]);

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="fixed z-50 select-none pointer-events-none top-0 left-0 right-0 h-5 bg-linear-to-b from-black/80 to-black/0" />

      <TrackerHeader
        trackerTitle={tracker.title}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      <EntryInput
        tracker={tracker}
        currentValue={loaderCurrentValue}
        selectedDate={selectedDate}
        onSubmit={handleQuickAdd}
        onCheckboxChange={handleCheckboxChange}
        mostUsedTags={mostUsedTags}
        entryLoading={isLoading}
      />

      {!!history.length && (
        <TrackerHistory
          history={history}
          tracker={tracker}
          onDeleteEntry={handleDeleteEntry}
          deletingEntryId={deletingEntryId}
          entryLoading={isLoading}
          withoutStats
        />
      )}
    </div>
  );
}
