import { ChevronLeft, Save } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  trackerTypes,
  trackerTypesLabels,
  type TrackerType,
} from "~/lib/trackers";

export function meta() {
  return [{ title: "New React Router App" }];
}

export default function NewTrackerPage() {
  const [isCheckboxTypeSelected, setIsCheckboxTypeSelected] = useState(false);

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ChevronLeft />
            </Link>
          </Button>
          <span className="font-medium">New tracker</span>
        </div>
        <Button>
          <Save />
          Save
        </Button>
      </div>
      <div className="flex flex-col py-6 gap-4">
        <div className="grid items-center gap-3">
          <Label htmlFor="trackerName">Tracker name</Label>
          <Input
            required
            type="trackerName"
            id="trackerName"
            placeholder="Tracker name"
          />
        </div>
        <div className="grid items-center gap-3">
          <Label htmlFor="trackerTypeTrigger">Measurement unit (type)</Label>
          <Select
            required
            defaultValue="none"
            onValueChange={(value: TrackerType) =>
              setIsCheckboxTypeSelected(value === "checkbox")
            }
          >
            <SelectTrigger id="trackerTypeTrigger">
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
        </div>
        {!isCheckboxTypeSelected && (
          <div className="grid items-center gap-3">
            <Label htmlFor="trackerDailyGoal">Daily goal (optional)</Label>
            <Input
              type="trackerDailyGoal"
              id="trackerDailyGoal"
              placeholder="0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
