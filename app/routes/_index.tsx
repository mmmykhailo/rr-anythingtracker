import { addDays } from "date-fns";
import { Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { formatDateString } from "~/lib/dates";
import type { Tracker } from "~/lib/trackers";
import { cn } from "~/lib/utils";

export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

const trackers: Array<Tracker> = [
  {
    id: "dsadsad-sn46db",
    title: "Alcohol",
    type: "liters",
    isNumber: true,
    values: {
      "2025-07-18": 1,
      "2025-07-19": 0.2,
    },
  },
  {
    id: "fhhjk-sn46db",
    title: "Energy drinks",
    type: "liters",
    isNumber: true,
    values: {
      "2025-07-18": 1,
      "2025-07-19": 0.2,
    },
  },
  {
    id: "4gdfd4-sn46db",
    title: "Coffee",
    type: "liters",
    isNumber: true,
    values: {
      "2025-07-18": 0.2,
      "2025-07-19": 0,
    },
  },
  {
    id: "72hs74-sn46db",
    title: "Steps",
    type: "steps",
    isNumber: true,
    values: {
      "2025-07-18": 14432,
      "2025-07-19": 2312,
    },
    goal: 6000,
  },
];

export default function Home() {
  const dates = [
    formatDateString(addDays(new Date(), -1)),
    formatDateString(new Date()),
  ];

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-end">
        <Button>
          <Plus />
          New entry
        </Button>
      </div>
      <div className="flex flex-col py-6">
        <div className="flex justify-end pb-2">
          <div className="w-3/5 grid grid-cols-2 gap-2 text-sm font-medium text-center">
            <div>Yesterday</div>
            <div>Today</div>
          </div>
        </div>
        {trackers.map((tracker) => (
          <div key={tracker.title} className="relative">
            <Separator />
            <div className="relative flex gap-2 items-center p-2 transition-colors hover:bg-accent">
              <div className="w-2/5 font-medium">{tracker.title}</div>
              <div className="w-3/5 grid grid-cols-2 gap-2">
                {dates.map((dateString) => {
                  const value = tracker.values[dateString] || 0;

                  return (
                    <div
                      className={cn(
                        "text-center flex flex-col leading-none gap-1",
                        {
                          "opacity-50": value === 0,
                          "text-zinc-400": tracker.goal && value < tracker.goal,
                          "text-green-600":
                            tracker.goal && value >= tracker.goal,
                        }
                      )}
                      key={dateString}
                    >
                      <span className="font-semibold">{value}</span>
                      <span className="text-sm">{tracker.type}</span>
                    </div>
                  );
                })}
              </div>
              <Link
                to={`/${tracker.id}/log-entry`}
                className="absolute inset-0"
                aria-label={`Open ${tracker.title} tracker`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Button asChild variant="secondary">
          <Link to="/new-tracker">
            <Plus />
            New tracker
          </Link>
        </Button>
      </div>
    </div>
  );
}
