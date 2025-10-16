import { useEffect, useState } from "react";
import { useLoaderData, useRevalidator, useNavigate } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { ChevronLeft, Save } from "lucide-react";
import { Link } from "react-router";
import { getTrackerById } from "~/lib/db";
import { useTrackerMutations, useFormState } from "~/lib/hooks";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  parseInputToStored,
  toDisplayValue,
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
    return { tracker };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
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
  goal?: number;
  isHidden: boolean;
}

export default function TrackerEditPage() {
  const { tracker } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { modifyTracker } = useTrackerMutations();
  const [isSaving, setIsSaving] = useState(false);

  const { state, errors, updateField, setFieldError, clearErrors, setState } =
    useFormState<TrackerFormData>({
      title: tracker.title,
      goal: tracker.goal,
      isHidden: tracker.isHidden || false,
    });

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

  const handleSave = async () => {
    clearErrors();

    // Validation
    if (!state.title.trim()) {
      setFieldError("title", "Tracker name is required");
      return;
    }

    try {
      setIsSaving(true);
      const updatedTracker = {
        ...tracker,
        title: state.title.trim(),
        goal: state.goal && state.goal > 0 ? state.goal : undefined,
        isHidden: state.isHidden,
      };

      await modifyTracker(updatedTracker);
      navigate("/");
    } catch (error) {
      console.error("Failed to update tracker:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
      </div>
    );
  }

  const isCheckboxType = tracker.type === "checkbox";

  return (
    <div>
      <div className="flex flex-col py-6 gap-4">
        <div className="grid items-center gap-3">
          <Label htmlFor="trackerName">Tracker name</Label>
          <Input
            required
            type="text"
            id="trackerName"
            placeholder="Tracker name"
            value={state.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
          {errors.title && (
            <div className="text-red-600 text-sm">{errors.title}</div>
          )}
        </div>

        {!isCheckboxType && (
          <div className="grid items-center gap-3">
            <Label htmlFor="trackerDailyGoal">Daily goal (optional)</Label>
            <Input
              type="number"
              id="trackerDailyGoal"
              placeholder={tracker.type === "liters" ? "1" : "100"}
              step={getInputStep(tracker.type)}
              value={state.goal ? toDisplayValue(state.goal, tracker.type) : ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  const storedValue = parseInputToStored(value, tracker.type);
                  updateField(
                    "goal",
                    storedValue !== null ? storedValue : undefined
                  );
                } else {
                  updateField("goal", undefined);
                }
              }}
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

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Type:</strong> {tracker.type}
          </p>
          {tracker.parentId && (
            <p className="mt-1">
              <strong>Note:</strong> This tracker has a parent tracker. Values
              added here will automatically be added to the parent.
            </p>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        <Save />
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
