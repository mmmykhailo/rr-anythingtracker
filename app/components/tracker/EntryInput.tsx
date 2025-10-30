import { Plus, PlusIcon, X, Hash } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import {
  formatStoredValue,
  displayUnits,
  toDisplayValue,
  toStoredValue,
  getInputStep,
} from "~/lib/number-conversions";
import { cn } from "~/lib/utils";
import { NumberInput } from "~/components/NumberInput";

import type { Tracker } from "~/lib/trackers";
import { useRevalidator } from "react-router";

type EntryInputProps = {
  tracker: Tracker;
  currentValue: number;
  selectedDate: string;
  onSubmit: (value: number, comment?: string) => Promise<void>;
  onCheckboxChange: (checked: boolean, comment?: string) => Promise<void>;
  entryLoading: boolean;
  mostUsedTags: string[];
};

export function EntryInput({
  tracker,
  currentValue,
  selectedDate,
  onSubmit,
  onCheckboxChange,
  entryLoading,
  mostUsedTags,
}: EntryInputProps) {
  // Store display value (e.g., 1.5 for liters), will convert to stored value (1500ml) on submit
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const { revalidate } = useRevalidator();

  const handleSubmit = async () => {
    if (displayValue === null || displayValue === 0) {
      return;
    }

    try {
      // Convert display value to stored value (e.g., 1.5L -> 1500ml)
      const storedValue = toStoredValue(displayValue, tracker.type);
      await onSubmit(storedValue, comment);
      setDisplayValue(null);
      setComment("");
      revalidate();
    } catch (error) {
      console.error("Failed to add custom value:", error);
    }
  };

  const handleTagClick = (tagName: string) => {
    const tag = `#${tagName}`;
    setComment((prev) => {
      if (prev) {
        const trimmedPrev = prev.replace(/ (?=[^ ]*$)/, "");
        return `${trimmedPrev} ${tag}`;
      }
      return tag;
    });
  };

  const quickAddValues = quickAddValuesMap[tracker.type];
  const isToday = selectedDate === formatDateString(new Date());

  return (
    <div className="flex flex-col gap-4">
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
        <>
          {currentValue > 0 ? (
            <Button
              variant="outline"
              onClick={async () => {
                await onCheckboxChange(false, comment);
                setComment("");
              }}
              disabled={entryLoading}
              className="w-full"
            >
              <X /> Mark as Untracked
            </Button>
          ) : (
            <>
              <div className="flex gap-4 items-center">
                <Label htmlFor="checkboxComment" className="w-20">
                  Comment
                </Label>
                <Input
                  id="checkboxComment"
                  className="flex-1"
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note (optional)"
                />
              </div>
              {mostUsedTags.length > 0 && (
                <div className="flex gap-2 flex-wrap -mt-2">
                  {mostUsedTags.map((tag) => (
                    <Button
                      key={tag}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTagClick(tag)}
                      className="h-7 text-xs"
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                    </Button>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  await onCheckboxChange(true, comment);
                  setComment("");
                }}
                disabled={entryLoading}
                className="w-full"
              >
                <Plus /> Mark as Tracked
              </Button>
            </>
          )}
        </>
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
              {!!tracker.goal &&
                ` / ${formatStoredValue(tracker.goal, tracker.type)}`}
              {displayUnits[tracker.type]}
            </span>
          </div>

          <NumberInput
            id="value"
            value={displayValue}
            onChange={setDisplayValue}
            step={getInputStep(tracker.type)}
            placeholder="Enter value"
            showClearButton={true}
          />

          {!!quickAddValues && (
            <div className="flex gap-4 overflow-auto -mb-2 pb-2 -mx-4 w-[calc(100%+2rem)] px-4">
              {quickAddValues.map(({ label, value }) => {
                // Convert stored value to display value for quick-add buttons
                const displayQuickAddValue = toDisplayValue(value, tracker.type);
                return (
                  <Button
                    className="grow"
                    variant="outline"
                    key={value}
                    onClick={async () => {
                      setDisplayValue((oldValue) => (oldValue || 0) + displayQuickAddValue);
                    }}
                    disabled={entryLoading}
                  >
                    +{label}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="flex gap-4 items-center">
            <Label htmlFor="comment" className="w-20">
              Comment
            </Label>
            <Input
              id="comment"
              className="flex-1"
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note (optional)"
            />
          </div>

          {mostUsedTags.length > 0 && (
            <div className="flex gap-2 flex-wrap -mt-2">
              {mostUsedTags.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTagClick(tag)}
                  className="h-7 text-xs"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </Button>
              ))}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={entryLoading || !displayValue}>
            <PlusIcon /> Add
          </Button>
        </>
      ) : null}
    </div>
  );
}
