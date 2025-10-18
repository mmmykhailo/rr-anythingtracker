import { useEffect, useState } from "react";
import { useLoaderData, useRevalidator, useSubmit, useNavigation } from "react-router";
import type { ClientLoaderFunctionArgs, ClientActionFunctionArgs } from "react-router";
import { getTrackerById, getEntryHistory, deleteEntryById } from "~/lib/db";
import { TrackerHistory } from "~/components/tracker";
import { debouncedDataChange } from "~/lib/data-change-events";

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
    const history = await getEntryHistory(trackerId);
    return { tracker, history };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

export async function clientAction({ params, request }: ClientActionFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const entryId = formData.get("entryId") as string;

  try {
    if (intent === "deleteEntry" && entryId) {
      await deleteEntryById(entryId);
      debouncedDataChange.dispatch("entry_deleted", { trackerId });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

export function meta({ params }: { params: { trackerId: string } }) {
  return [
    { title: "History - AnythingTracker" },
    {
      name: "description",
      content: "View history for your tracker",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function TrackerHistoryPage() {
  const { tracker, history } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const handleDataChange = () => {
      revalidator.revalidate();
    };

    window.addEventListener("anythingtracker:datachange", handleDataChange);
    return () => {
      window.removeEventListener(
        "anythingtracker:datachange",
        handleDataChange
      );
    };
  }, [revalidator]);

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
    <TrackerHistory
      history={history}
      tracker={tracker}
      onDeleteEntry={handleDeleteEntry}
      deletingEntryId={deletingEntryId}
      entryLoading={navigation.state !== "idle"}
    />
  );
}
