import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import {
  formatStoredValue,
  parseInputToStored,
  toDisplayValue,
  getInputStep,
} from "~/lib/number-conversions";
import { cn } from "~/lib/utils";

import type { Tracker } from "~/lib/trackers";

type EntryInputProps = {
  tracker: Tracker;
  currentValue: number; // This is the stored integer value
  selectedDate: string;
  onQuickAdd: (value: number) => Promise<void>; // Expects stored integer value
  onCheckboxChange: (checked: boolean) => Promise<void>;
  entryLoading: boolean;
};

export function EntryInput({
  tracker,
  currentValue,
  selectedDate,
  onQuickAdd,
  onCheckboxChange,
  entryLoading,
}: EntryInputProps) {
  const [customInputValue, setCustomInputValue] = useState("");

  const handleCustomAdd = async () => {
    // Parse the input to stored integer value
    const storedValue = parseInputToStored(customInputValue, tracker.type);
    if (storedValue === null || storedValue === 0) {
      return;
    }

    try {
      await onQuickAdd(storedValue);
      setCustomInputValue("");
    } catch (error) {
      console.error("Failed to add custom value:", error);
    }
  };

  const quickAddValues = quickAddValuesMap[tracker.type];
  const isToday = selectedDate === formatDateString(new Date());

  // Convert stored value to display value for showing to user
  const displayValue = toDisplayValue(currentValue, tracker.type);
  const displayGoal = tracker.goal
    ? toDisplayValue(tracker.goal, tracker.type)
    : null;

  return (
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
            checked={currentValue > 0}
            onCheckedChange={onCheckboxChange}
            disabled={entryLoading}
          />
          <Label htmlFor="isTrackedToday">Tracked today</Label>
        </div>
      ) : tracker.isNumber ? (
        <>
          <div>
            Current:{" "}
            <span
              className={cn("text-xl font-semibold", {
                "text-green-600": tracker.goal && currentValue >= tracker.goal,
              })}
            >
              {formatStoredValue(currentValue, tracker.type)}
              {displayGoal !== null &&
                ` / ${formatStoredValue(tracker.goal!, tracker.type)}`}
            </span>
          </div>

          {!!quickAddValues && (
            <div className="flex gap-4 overflow-auto -mb-2 pb-2 -mx-4 w-[calc(100%+2rem)] px-4">
              {quickAddValues.map(({ label, value }) => (
                <Button
                  variant="outline"
                  key={value}
                  onClick={() => onQuickAdd(value)}
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
              type="number"
              step={getInputStep(tracker.type)}
              value={customInputValue}
              onChange={(e) => setCustomInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCustomAdd();
                }
              }}
              placeholder={tracker.type === "liters" ? "0.5" : "1"}
            />
            <Button
              variant="secondary"
              onClick={handleCustomAdd}
              disabled={
                entryLoading ||
                !customInputValue ||
                parseInputToStored(customInputValue, tracker.type) === null
              }
            >
              <Plus /> Add
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
