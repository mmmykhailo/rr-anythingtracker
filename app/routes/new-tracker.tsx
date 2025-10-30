import { ChevronLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  redirect,
  useLoaderData,
  Form,
  useNavigation,
  useActionData,
} from "react-router";
import type {
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
} from "react-router";
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
import { useFormState } from "~/lib/hooks";
import { getAllTrackers, saveTracker } from "~/lib/db";
import { debouncedDataChange } from "~/lib/data-change-events";
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

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  try {
    const trackers = await getAllTrackers();
    return { trackers };
  } catch (error) {
    throw new Response("Failed to load trackers", { status: 500 });
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();

  const title = formData.get("title") as string;
  const type = formData.get("type") as TrackerType;
  const goalStr = formData.get("goal") as string;
  const parentId = formData.get("parentId") as string;
  const isHidden = formData.get("isHidden") === "true";

  // Validation
  if (!title || !title.trim()) {
    return { error: { title: "Tracker name is required" } };
  }

  try {
    const trackerData = {
      title: title.trim(),
      type,
      isNumber: type !== "checkbox",
      ...(goalStr && parseFloat(goalStr) > 0 && { goal: parseFloat(goalStr) }),
      ...(parentId && parentId !== "none" && { parentId }),
      isHidden,
    };

    const newTracker = await saveTracker(trackerData);
    debouncedDataChange.dispatch("tracker_created", {
      trackerId: newTracker.id,
    });

    return redirect("/");
  } catch (error) {
    console.error("Failed to create tracker:", error);
    return { error: { general: "Failed to create tracker" } };
  }
}

export function meta() {
  return [
    { title: "New Tracker - AnythingTracker" },
    {
      name: "description",
      content:
        "Create a new tracker to monitor your habits, goals, and daily activities",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

interface TrackerFormData {
  title: string;
  type: TrackerType;
  goal?: number; // Stored as integer (e.g., milliliters for liters)
  parentId?: string;
  isHidden: boolean;
}

export default function NewTrackerPage() {
  const { trackers } = useLoaderData<typeof clientLoader>();
  const navigation = useNavigation();
  const actionData = useActionData<typeof clientAction>();
  const [isCheckboxTypeSelected, setIsCheckboxTypeSelected] = useState(false);
  const [isTypeDisabled, setIsTypeDisabled] = useState(false);

  const { state, errors, updateField, setFieldError, clearErrors, setState } =
    useFormState<TrackerFormData>({
      title: "",
      type: "none",
      goal: undefined,
      parentId: undefined,
      isHidden: false,
    });

  const isSaving = navigation.state === "submitting";

  // Update errors from action data
  useEffect(() => {
    if (actionData && "error" in actionData && actionData.error) {
      if (actionData.error.title) {
        setFieldError("title", actionData.error.title);
      }
    }
  }, [actionData, setFieldError]);

  // Effect to handle initial state and parent selection changes
  useEffect(() => {
    if (state.parentId) {
      const parentTracker = trackers.find((t) => t.id === state.parentId);
      if (parentTracker) {
        updateField("type", parentTracker.type);
        setIsCheckboxTypeSelected(parentTracker.type === "checkbox");
        setIsTypeDisabled(true);
      }
    } else {
      setIsTypeDisabled(false);
    }
  }, [state.parentId, trackers, updateField]);

  // Helper function to check if selecting a parent would create a circular reference
  const wouldCreateCircularReference = (
    potentialParentId: string,
    allTrackers: typeof trackers
  ): boolean => {
    // For a new tracker, we can't have circular references since it doesn't exist yet
    // This function is mainly for future edit functionality
    return false;
  };

  return (
    <div>
      <Form method="post">
        <div className="w-full h-16 flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <Button asChild variant="ghost" size="icon" type="button">
              <Link to="/" prefetch="viewport">
                <ChevronLeft />
              </Link>
            </Button>
            <span className="font-medium">New tracker</span>
          </div>
          <Button type="submit" disabled={isSaving}>
            <Save />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        <div className="flex flex-col py-6 gap-4">
          <input type="hidden" name="type" value={state.type} />
          <input
            type="hidden"
            name="parentId"
            value={state.parentId || "none"}
          />
          <input
            type="hidden"
            name="isHidden"
            value={state.isHidden.toString()}
          />
          {state.goal !== undefined && (
            <input type="hidden" name="goal" value={state.goal.toString()} />
          )}

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
              }}
              disabled={isTypeDisabled}
            >
              <SelectTrigger
                id="trackerTypeTrigger"
                className={isTypeDisabled ? "opacity-60" : ""}
              >
                <SelectValue placeholder="Select measurement unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {trackerTypes.map((trackerType) => (
                    <SelectItem key={trackerType} value={trackerType}>
                      {trackerTypesLabels[trackerType]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {isTypeDisabled && (
              <div className="text-blue-600 text-sm">
                Measurement unit automatically set to match parent tracker
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
          <div className="grid items-center gap-3">
            <Label htmlFor="parentTracker">Parent tracker (optional)</Label>
            <Select
              value={state.parentId || "none"}
              onValueChange={(value: string) => {
                if (value === "none") {
                  updateField("parentId", undefined);
                } else {
                  // Additional validation could be added here
                  updateField("parentId", value);
                }
              }}
            >
              <SelectTrigger id="parentTracker">
                <SelectValue placeholder="Select parent tracker" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">None</SelectItem>
                  {trackers
                    .filter(
                      (tracker) =>
                        tracker.isNumber && // Only numeric trackers can be parents
                        tracker.type !== "checkbox" && // Exclude checkbox trackers
                        !wouldCreateCircularReference(tracker.id, trackers) // Prevent circular references
                    )
                    .map((tracker) => (
                      <SelectItem key={tracker.id} value={tracker.id}>
                        {tracker.title}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.parentId && (
              <div className="text-red-600 text-sm">{errors.parentId}</div>
            )}
            {state.parentId && (
              <div className="text-gray-600 text-sm">
                Values added to this tracker will automatically be added to{" "}
                {trackers.find((t) => t.id === state.parentId)?.title}
              </div>
            )}
          </div>

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
        </div>
      </Form>
    </div>
  );
}
