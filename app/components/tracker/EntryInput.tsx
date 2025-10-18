import { Plus, PlusIcon, X, Hash } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import {
  formatStoredValue,
  parseInputToStored,
  toDisplayValue,
  getInputStep,
  formatForInput,
  displayUnits,
} from "~/lib/number-conversions";
import { cn } from "~/lib/utils";
import { getMostUsedTags } from "~/lib/db";

import type { Tracker } from "~/lib/trackers";

type EntryInputProps = {
  tracker: Tracker;
  currentValue: number; // This is the stored integer value
  selectedDate: string;
  onQuickAdd: (value: number, comment?: string) => Promise<void>;
  onCheckboxChange: (checked: boolean, comment?: string) => Promise<void>;
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
  const [inputValue, setInputValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [mostUsedTags, setMostUsedTags] = useState<string[]>([]);

  // Load most-used tags for this tracker
  useEffect(() => {
    const loadTags = async () => {
      const tags = await getMostUsedTags(tracker.id, 5);
      setMostUsedTags(tags);
    };
    loadTags();
  }, [tracker.id, currentValue]); // Reload tags when entries change

  const handleCustomAdd = async () => {
    if (inputValue === null || inputValue === 0) {
      return;
    }

    try {
      await onQuickAdd(inputValue, comment);
      setInputValue(null);
      setComment("");
    } catch (error) {
      console.error("Failed to add custom value:", error);
    }
  };

  const handleTagClick = (tagName: string) => {
    const tag = `#${tagName}`;
    // Add tag to comment with a space if comment already has content
    setComment((prev) => (prev ? `${prev} ${tag}` : tag));
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
              {displayGoal !== null &&
                ` / ${formatStoredValue(tracker.goal!, tracker.type)}`}
              {displayUnits[tracker.type]}
            </span>
          </div>

          <Input
            id="value"
            type="number"
            step={getInputStep(tracker.type)}
            value={formatForInput(inputValue, tracker.type)}
            onChange={(e) =>
              setInputValue(parseInputToStored(e.target.value, tracker.type))
            }
            placeholder="Enter value"
          />

          {!!quickAddValues && (
            <div className="flex gap-4 overflow-auto -mb-2 pb-2 -mx-4 w-[calc(100%+2rem)] px-4">
              {quickAddValues.map(({ label, value }) => (
                <Button
                  className="grow"
                  variant="outline"
                  key={value}
                  onClick={async () => {
                    setInputValue(value);
                  }}
                  disabled={entryLoading}
                >
                  {label}
                </Button>
              ))}
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

          <Button
            onClick={handleCustomAdd}
            disabled={entryLoading || !inputValue}
          >
            <PlusIcon /> Add
          </Button>
        </>
      ) : null}
    </div>
  );
}
