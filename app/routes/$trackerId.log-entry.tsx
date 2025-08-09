import { ChevronLeft, Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import type { Tracker } from "~/lib/trackers";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "New React Router App" }];
}

const tracker: Tracker = {
  id: "72hs74-sn46db",
  title: "Steps",
  type: "checkbox",
  isNumber: true,
  values: {
    "2025-07-19": 1,
  },
};

export default function LogEntryPage() {
  const quickAddValues = quickAddValuesMap[tracker.type];
  const value = tracker.values[formatDateString(new Date())];

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">{tracker.title}</span>
        </div>
        {/* <Button>
          <Save />
          Save
        </Button> */}
      </div>
      <div className="flex flex-col py-6 gap-4">
        {tracker.type === "checkbox" ? (
          <div className="flex items-center gap-3">
            <Checkbox id="isTrackedToday" />
            <Label htmlFor="isTrackedToday">Tracked today</Label>
          </div>
        ) : (
          <>
            <div>
              Current:{" "}
              <span
                className={cn("text-xl font-semibold", {
                  "text-green-600": tracker.goal && value >= tracker.goal,
                })}
              >
                {value}
                {!!tracker.goal && ` / ${tracker.goal}`}
              </span>
            </div>

            {!!quickAddValues && (
              <div className="flex gap-4">
                {quickAddValues.map(({ label, value }) => (
                  <Button key={value}>
                    <Plus /> {label}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-4 items-center mt-2">
              Custom
              <Input className="w-40 shrink" placeholder="17492" />
              <Button>
                <Plus /> Add
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
