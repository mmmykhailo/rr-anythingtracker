import { useEffect, useState } from "react";
import {
  useLoaderData,
  useLocation,
  useSubmit,
  useNavigation,
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
} from "~/lib/db";
import { debouncedDataChange } from "~/lib/data-change-events";
import { TrackerHeader, EntryInput } from "~/components/tracker";

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
  // TODO: FIX THIS, IT SHOULD REFLECT SELECTED DATE
  const selectedDate = dateParam || formatDateString(new Date());

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }

    const mostUsedTags = await getMostUsedTags(trackerId, 5);
    const currentValue = await getTotalValueForDate(trackerId, selectedDate);

    return { tracker, currentValue, selectedDate, mostUsedTags };
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
  const location = useLocation();
  const navigation = useNavigation();
  const submit = useSubmit();
  const {
    tracker,
    mostUsedTags,
    currentValue: loaderCurrentValue,
    selectedDate: loaderSelectedDate,
  } = useLoaderData<typeof clientLoader>();

  const [selectedDate, setSelectedDate] = useState(() =>
    location?.state?.dateString
      ? formatDateString(new Date(location.state.dateString))
      : loaderSelectedDate
  );

  const isLoading = navigation.state !== "idle";

  // Update URL when date changes to keep loader data in sync
  useEffect(() => {
    if (selectedDate !== loaderSelectedDate) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDate);
      window.history.replaceState({}, "", url);

      // Trigger revalidation by submitting an empty form
      submit({}, { method: "get" });
    }
  }, [selectedDate, loaderSelectedDate, submit]);

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
        currentValue={loaderCurrentValue}
        selectedDate={selectedDate}
        onSubmit={handleQuickAdd}
        onCheckboxChange={handleCheckboxChange}
        mostUsedTags={mostUsedTags}
        entryLoading={isLoading}
      />
    </div>
  );
}
