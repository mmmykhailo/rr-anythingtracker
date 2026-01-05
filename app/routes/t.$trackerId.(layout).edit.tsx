import { useEffect, useState } from "react";
import {
  useLoaderData,
  useRevalidator,
  redirect,
  Form,
  useNavigation,
  useActionData,
} from "react-router";
import type {
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
} from "react-router";
import { Save, Trash2 } from "lucide-react";
import {
  getTrackerById,
  getEntryHistory,
  updateTracker,
  deleteTracker,
} from "~/lib/db";
import { debouncedDataChange } from "~/lib/data-change-events";
import { useFormState } from "~/lib/hooks";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  type TrackerType,
  trackerTypes,
  trackerTypesLabels,
} from "~/lib/trackers";
import { NumberInput } from "~/components/NumberInput";
import {
  toDisplayValue,
  toStoredValue,
  getInputStep,
} from "~/lib/number-conversions";

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

    const entries = await getEntryHistory(trackerId);
    const hasEntries = entries.length > 0;

    return { tracker, hasEntries };
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

  try {
    if (intent === "delete") {
      await deleteTracker(trackerId);
      debouncedDataChange.dispatch("tracker_deleted", { trackerId });
      return redirect("/");
    }

    if (intent === "update") {
      const title = formData.get("title") as string;
      const type = formData.get("type") as TrackerType;
      const goalStr = formData.get("goal") as string;
      const isHidden = formData.get("isHidden") === "true";

      if (!title || !title.trim()) {
        return { error: { title: "Tracker name is required" } };
      }

      const tracker = await getTrackerById(trackerId);
      if (!tracker) {
        throw new Response("Tracker not found", { status: 404 });
      }

      const updatedTracker = {
        ...tracker,
        title: title.trim(),
        type,
        isNumber: type !== "checkbox",
        goal:
          goalStr && parseFloat(goalStr) > 0 ? parseFloat(goalStr) : undefined,
        isHidden,
      };

      await updateTracker(updatedTracker);
      debouncedDataChange.dispatch("tracker_updated", { trackerId });

      return redirect("/");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to perform action:", error);
    return { error: { general: "Failed to update tracker" } };
  }
}

export function meta({ params }: { params: { trackerId: string } }) {
  return [
    { title: "Edit Tracker - AnythingTracker" },
    {
      name: "description",
      content: "Edit your tracker settings",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

interface TrackerFormData {
  title: string;
  type: TrackerType;
  goal?: number;
  isHidden: boolean;
}

export default function TrackerEditPage() {
  const { tracker, hasEntries } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const actionData = useActionData<typeof clientAction>();
  const [isCheckboxTypeSelected, setIsCheckboxTypeSelected] = useState(
    tracker.type === "checkbox"
  );

  const { state, errors, updateField, setFieldError, clearErrors, setState } =
    useFormState<TrackerFormData>({
      title: tracker.title,
      type: tracker.type,
      goal: tracker.goal,
      isHidden: tracker.isHidden || false,
    });

  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update";
  const isDeleting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "delete";

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

  // Update errors from action data
  useEffect(() => {
    if (actionData && "error" in actionData && actionData.error) {
      if (actionData.error.title) {
        setFieldError("title", actionData.error.title);
      }
    }
  }, [actionData, setFieldError]);

  const handleDelete = (e: React.FormEvent) => {
    if (
      !confirm(
        `Are you sure you want to delete "${tracker.title}"? This will remove all data for this tracker.`
      )
    ) {
      e.preventDefault();
    }
  };

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
      </div>
    );
  }

  const canChangeType = !hasEntries && !tracker.parentId;

  return (
    <div>
      <div className="fixed z-50 select-none pointer-events-none top-0 left-0 right-0 h-5 bg-linear-to-b from-black/80 to-black/0" />
      <Form method="post">
        <input type="hidden" name="intent" value="update" />
        <input type="hidden" name="type" value={state.type} />
        <input
          type="hidden"
          name="isHidden"
          value={state.isHidden.toString()}
        />
        {state.goal && (
          <input type="hidden" name="goal" value={state.goal.toString()} />
        )}

        <div className="flex flex-col py-6 gap-4">
          <div className="grid items-center gap-3">
            <Label htmlFor="trackerName">Tracker name</Label>
            <Input
              required
              type="text"
              id="trackerName"
              name="title"
              placeholder="Tracker name"
              value={state.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            {errors.title && (
              <div className="text-red-600 text-sm">{errors.title}</div>
            )}
          </div>

          <div className="grid items-center gap-3">
            <Label htmlFor="trackerTypeTrigger">Measurement unit (type)</Label>
            <Select
              required
              value={state.type}
              onValueChange={(value: TrackerType) => {
                updateField("type", value);
                setIsCheckboxTypeSelected(value === "checkbox");
                // Clear goal when switching to checkbox type
                if (value === "checkbox") {
                  updateField("goal", undefined);
                }
              }}
              disabled={!canChangeType}
            >
              <SelectTrigger
                id="trackerTypeTrigger"
                className={!canChangeType ? "opacity-60" : ""}
              >
                <SelectValue placeholder="Select measurement unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {trackerTypes.map((trackerType) => (
                    <SelectItem key={trackerType} value={trackerType}>
                      {trackerTypesLabels[trackerType].long}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {!canChangeType && hasEntries && (
              <div className="text-muted-foreground text-sm">
                Cannot change type because this tracker has existing entries
              </div>
            )}
            {!canChangeType && tracker.parentId && (
              <div className="text-blue-600 text-sm">
                Cannot change type because this tracker has a parent tracker
              </div>
            )}
            {errors.type && (
              <div className="text-red-600 text-sm">{errors.type}</div>
            )}
          </div>

          {!isCheckboxTypeSelected && (
            <div className="grid items-center gap-3">
              <Label htmlFor="trackerDailyGoal">Daily goal (optional)</Label>
              <NumberInput
                id="trackerDailyGoal"
                value={
                  state.goal !== undefined
                    ? toDisplayValue(state.goal, state.type)
                    : null
                }
                onChange={(displayValue) => {
                  if (displayValue !== null) {
                    const storedValue = toStoredValue(displayValue, state.type);
                    updateField("goal", storedValue);
                  } else {
                    updateField("goal", undefined);
                  }
                }}
                step={getInputStep(state.type)}
                placeholder={state.type === "liters" ? "1" : "100"}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Checkbox
              id="isHidden"
              checked={state.isHidden}
              onCheckedChange={(checked) =>
                updateField("isHidden", checked === true)
              }
            />
            <Label
              htmlFor="isHidden"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Hide from home page
            </Label>
          </div>

          {tracker.parentId && (
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> This tracker has a parent tracker. Values
                added here will automatically be added to the parent.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving || isDeleting}>
            <Save />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Form>

      <Form method="post" onSubmit={handleDelete} className="mt-2">
        <input type="hidden" name="intent" value="delete" />
        <Button
          type="submit"
          disabled={isSaving || isDeleting}
          variant="destructive"
        >
          <Trash2 />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </Form>
    </div>
  );
}
