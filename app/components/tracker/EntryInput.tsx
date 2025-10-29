import { Plus, PlusIcon, X, Hash } from "lucide-react";
import { useState } from "react";
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
  const [inputValue, setInputValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const { revalidate } = useRevalidator();

  const handleSubmit = async () => {
    if (inputValue === null || inputValue === 0) {
      return;
    }

    try {
      await onSubmit(inputValue, comment);
      setInputValue(null);
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

          <div className="relative">
            <Input
              id="value"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              step={getInputStep(tracker.type)}
              value={formatForInput(inputValue, tracker.type)}
              onChange={(e) =>
                setInputValue(parseInputToStored(e.target.value, tracker.type))
              }
              placeholder="Enter value"
            />
            {!!inputValue && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute inset-0 left-auto rounded-l-none"
                onClick={() => setInputValue(null)}
              >
                <X />
              </Button>
            )}
          </div>

          {!!quickAddValues && (
            <div className="flex gap-4 overflow-auto -mb-2 pb-2 -mx-4 w-[calc(100%+2rem)] px-4">
              {quickAddValues.map(({ label, value }) => (
                <Button
                  className="grow"
                  variant="outline"
                  key={value}
                  onClick={async () => {
                    setInputValue((oldValue) => (oldValue || 0) + value);
                  }}
                  disabled={entryLoading}
                >
                  +{label}
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

          <Button onClick={handleSubmit} disabled={entryLoading || !inputValue}>
            <PlusIcon /> Add
          </Button>
        </>
      ) : null}
    </div>
  );
}
