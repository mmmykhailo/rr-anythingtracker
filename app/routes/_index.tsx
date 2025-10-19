import { addDays, format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { formatDateForDisplay, getDaysArray, isDateToday } from "~/lib/dates";
import { useDatabase } from "~/lib/hooks";
import { getAllTrackers } from "~/lib/db";
import { formatStoredValue } from "~/lib/number-conversions";
import { SyncButton } from "~/components/SyncButton";
import { isOnboardingCompleted } from "~/lib/github-gist-sync";
import { getShowHiddenTrackers } from "~/lib/user-settings";
import clsx from "clsx";
import type { Tracker } from "~/lib/trackers";

const DAYS_TO_SHOW = 4;

export async function clientLoader() {
  if (!isOnboardingCompleted()) {
    throw redirect("/onboarding");
  }

  try {
    const trackers = await getAllTrackers();
    let savedExpandedTrackers: string[] = [];
    try {
      const stored = localStorage.getItem("expandedTrackers");
      savedExpandedTrackers = stored ? JSON.parse(stored) : [];
    } catch {
      savedExpandedTrackers = [];
    }
    return { trackers, savedExpandedTrackers };
  } catch (error) {
    throw new Response("Failed to load trackers", { status: 500 });
  }
}

export function meta() {
  return [
    { title: "AnythingTracker - Track Anything, Achieve Everything" },
    {
      name: "description",
      content:
        "Your personal tracking dashboard. Monitor habits, goals, and progress across all your activities in one simple interface.",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function Home() {
  const { trackers, savedExpandedTrackers } =
    useLoaderData<typeof clientLoader>();
  const [currentLastDate, setCurrentLastDate] = useState(() => new Date());
  const [showHiddenTrackers, setShowHiddenTrackers] = useState(() =>
    getShowHiddenTrackers()
  );
  const [expandedTrackers, setExpandedTrackers] = useState<Set<string>>(
    () => new Set(savedExpandedTrackers)
  );
  useEffect(() => {
    const handleStorageChange = () => {
      setShowHiddenTrackers(getShowHiddenTrackers());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  const visibleTrackers = showHiddenTrackers
    ? trackers
    : trackers.filter((t) => !t.isHidden);

  const sortedTrackers = (() => {
    const resultTrackers: Array<Tracker> = [];
    const includedIds = new Set();

    const addTrackerWithDescendants = (tracker: Tracker) => {
      if (includedIds.has(tracker.id)) return;

      resultTrackers.push(tracker);
      includedIds.add(tracker.id);

      const children = visibleTrackers.filter(
        (child) => child.parentId === tracker.id
      );
      for (const child of children) {
        addTrackerWithDescendants(child);
      }
    };

    const parentTrackers = visibleTrackers.filter((t) => !t.parentId);
    for (const parent of parentTrackers) {
      addTrackerWithDescendants(parent);
    }

    const orphans = visibleTrackers.filter(
      (t) => !includedIds.has(t.id) && t.parentId
    );
    for (const orphan of orphans) {
      addTrackerWithDescendants(orphan);
    }

    return resultTrackers;
  })();

  const hasChildren = (trackerId: string) => {
    return visibleTrackers.some((t) => t.parentId === trackerId);
  };

  const areAllAncestorsExpanded = (
    tracker: (typeof visibleTrackers)[0]
  ): boolean => {
    if (!tracker.parentId) return true;

    let currentTracker = tracker;
    while (currentTracker.parentId) {
      const parent = visibleTrackers.find(
        (t) => t.id === currentTracker.parentId
      );
      if (!parent) return false;
      currentTracker = parent;
    }

    return expandedTrackers.has(currentTracker.id);
  };

  const toggleExpanded = (trackerId: string) => {
    setExpandedTrackers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackerId)) {
        newSet.delete(trackerId);
      } else {
        newSet.add(trackerId);
      }
      localStorage.setItem(
        "expandedTrackers",
        JSON.stringify(Array.from(newSet))
      );
      return newSet;
    });
  };

  const datesToShow = getDaysArray(currentLastDate, DAYS_TO_SHOW);
  const currentFirstDate = new Date(datesToShow[0]);

  const firstMonth = format(currentFirstDate, "MMM");
  const lastMonth = format(currentLastDate, "MMM");
  const monthDisplay =
    firstMonth === lastMonth ? firstMonth : `${firstMonth}-${lastMonth}`;

  const goToPrevious = () => {
    setCurrentLastDate((prev) => addDays(prev, -DAYS_TO_SHOW));
  };

  const goToNext = () => {
    setCurrentLastDate((prev) => addDays(prev, DAYS_TO_SHOW));
  };

  return (
    <div>
      <div className="w-full h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/settings" prefetch="viewport">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <SyncButton />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-16 text-center">
            {monthDisplay}
          </div>
          <Button size="sm" variant="ghost" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col py-6">
        <div className="px-2 w-full flex items-center pb-2">
          <div
            className="ml-auto w-2/3 grid gap-1 text-xs font-medium text-center"
            style={{
              gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(0, 1fr))`,
            }}
          >
            {datesToShow.map((dateString) => {
              const { weekday, day } = formatDateForDisplay(dateString);
              const isTodayDate = isDateToday(dateString);
              return (
                <div
                  key={dateString}
                  className={clsx("py-1", {
                    "text-blue-500 font-bold": isTodayDate,
                  })}
                >
                  <div>{weekday}</div>
                  <div>{day}</div>
                </div>
              );
            })}
          </div>
        </div>
        {sortedTrackers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No trackers yet. Create your first tracker to get started!
          </div>
        ) : (
          sortedTrackers.map((tracker) => (
            <div
              key={tracker.title}
              className={clsx(
                "relative",
                {
                  "overflow-hidden transition-all duration-300 ease-in-out":
                    tracker.parentId,
                },
                tracker.parentId && areAllAncestorsExpanded(tracker)
                  ? "max-h-20 opacity-100"
                  : tracker.parentId
                  ? "max-h-0 opacity-0"
                  : ""
              )}
            >
              <Separator />
              <div className="relative flex items-stretch">
                <div className="w-1/3 flex items-stretch min-h-[52px]">
                  {!tracker.parentId && hasChildren(tracker.id) && (
                    <div className="w-8 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpanded(tracker.id);
                        }}
                        aria-label={
                          expandedTrackers.has(tracker.id)
                            ? "Collapse"
                            : "Expand"
                        }
                        className="w-full h-full cursor-pointer transition-colors hover:bg-accent flex items-center justify-center"
                      >
                        {expandedTrackers.has(tracker.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                  <Link
                    to={`/t/${tracker.id}/history`}
                    prefetch="viewport"
                    className="flex-1 min-h-full font-medium p-2 relative transition-colors hover:bg-accent flex flex-col justify-center max-w-full"
                  >
                    <span
                      className={clsx("text-xs line-clamp-2 break-words", {
                        "ml-8": tracker.parentId,
                      })}
                    >
                      {tracker.title}
                    </span>
                  </Link>
                </div>
                <div
                  className="w-2/3 grid gap-1 shrink-0"
                  style={{
                    gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(0, 1fr))`,
                  }}
                >
                  {datesToShow.map((dateString) => {
                    const value = tracker.values[dateString] || 0;

                    return (
                      <div
                        className={clsx(
                          "text-center flex flex-col justify-center leading-none gap-1 p-2 relative transition-colors hover:bg-accent",
                          {
                            "opacity-50": value === 0,
                            "text-zinc-400":
                              tracker.goal && value < tracker.goal,
                            "text-green-600":
                              tracker.goal && value >= tracker.goal,
                          }
                        )}
                        key={dateString}
                      >
                        {tracker.type !== "checkbox" ? (
                          <span className="font-semibold text-xs">
                            {formatStoredValue(value, tracker.type)}
                          </span>
                        ) : (
                          <>
                            {!!value && <Check size={24} className="mx-auto" />}
                          </>
                        )}

                        {tracker.type !== "checkbox" &&
                          tracker.type !== "none" && (
                            <span className="text-xs opacity-60">
                              {tracker.type}
                            </span>
                          )}
                        <Link
                          to={`/t/${tracker.id}/log-entry?date=${dateString}`}
                          prefetch="viewport"
                          className="absolute inset-0"
                          aria-label={`Open ${tracker.title} tracker`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 flex justify-center">
        <Button asChild variant="secondary">
          <Link to="/new-tracker" prefetch="viewport">
            <Plus />
            New tracker
          </Link>
        </Button>
      </div>
    </div>
  );
}
