import { addDays, format } from "date-fns";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { Separator } from "~/components/ui/separator";
import { formatDateForDisplay, getDaysArray, isDateToday } from "~/lib/dates";
import { useDatabase, useTrackerMutations } from "~/lib/hooks";
import { getAllTrackers } from "~/lib/db";
import { formatStoredValue } from "~/lib/number-conversions";
import { SyncButton } from "~/components/SyncButton";
import { isOnboardingCompleted } from "~/lib/github-gist-sync";
import clsx from "clsx";
import type { Tracker } from "~/lib/trackers";

const DAYS_TO_SHOW = 4;

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  try {
    const trackers = await getAllTrackers();
    return { trackers };
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
  const { trackers } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();
  const { isInitialized, error: dbError } = useDatabase();
  const { removeTracker, loading: mutationLoading } = useTrackerMutations();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentLastDate, setCurrentLastDate] = useState(() => new Date());
  const [expandedTrackers, setExpandedTrackers] = useState<Set<string>>(() => {
    // Load expanded trackers from localStorage
    try {
      const stored = localStorage.getItem("expandedTrackers");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sort trackers so children appear immediately under their parents
  const sortedTrackers = (() => {
    const resultTrackers: Array<Tracker> = [];
    const includedIds = new Set();

    // Recursive function to add a tracker and all its descendants
    const addTrackerWithDescendants = (tracker: Tracker) => {
      if (includedIds.has(tracker.id)) return;

      resultTrackers.push(tracker);
      includedIds.add(tracker.id);

      // Find and add all direct children recursively
      const children = trackers.filter(
        (child) => child.parentId === tracker.id
      );
      for (const child of children) {
        addTrackerWithDescendants(child);
      }
    };

    // Start with parent trackers (those with no parentId)
    const parentTrackers = trackers.filter((t) => !t.parentId);
    for (const parent of parentTrackers) {
      addTrackerWithDescendants(parent);
    }

    // Add any orphaned children (whose parents don't exist) at the end
    const orphans = trackers.filter(
      (t) => !includedIds.has(t.id) && t.parentId
    );
    for (const orphan of orphans) {
      addTrackerWithDescendants(orphan);
    }

    return resultTrackers;
  })();

  // Check if a tracker has children
  const hasChildren = (trackerId: string) => {
    return trackers.some((t) => t.parentId === trackerId);
  };

  // Check if the top-level parent of a tracker is expanded
  const areAllAncestorsExpanded = (tracker: (typeof trackers)[0]): boolean => {
    if (!tracker.parentId) return true; // Top-level trackers are always visible

    // Find the top-level parent by traversing up the hierarchy
    let currentTracker = tracker;
    while (currentTracker.parentId) {
      const parent = trackers.find((t) => t.id === currentTracker.parentId);
      if (!parent) return false; // Orphaned child
      currentTracker = parent;
    }

    // Check if the top-level parent is expanded
    return expandedTrackers.has(currentTracker.id);
  };

  // Toggle expanded state for a parent tracker
  const toggleExpanded = (trackerId: string) => {
    setExpandedTrackers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackerId)) {
        newSet.delete(trackerId);
      } else {
        newSet.add(trackerId);
      }
      // Save to localStorage
      localStorage.setItem(
        "expandedTrackers",
        JSON.stringify(Array.from(newSet))
      );
      return newSet;
    });
  };

  // Check if onboarding is completed
  useEffect(() => {
    if (isInitialized && !isOnboardingCompleted()) {
      navigate("/onboarding", { replace: true });
    }
  }, [isInitialized, navigate]);

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

  const handleDeleteTracker = async (
    e: React.MouseEvent,
    trackerId: string,
    trackerTitle: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        `Are you sure you want to delete "${trackerTitle}"? This will remove all data for this tracker.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(trackerId);
      await removeTracker(trackerId);
      // Refresh the page to reload data after deletion
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to delete tracker:", error);
      alert("Failed to delete tracker. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Initializing database...</div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Database error: {dbError}</div>
      </div>
    );
  }

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
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="relative flex items-stretch cursor-context-menu">
                    <div className="w-1/3 flex items-stretch">
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
                        to={`/${tracker.id}/log-entry`}
                        prefetch="viewport"
                        className="flex-1 min-h-full font-medium p-2 relative transition-colors hover:bg-accent flex flex-col justify-center"
                      >
                        <span
                          className={clsx("block text-xs", {
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
                                {!!value && (
                                  <Check size={24} className="mx-auto" />
                                )}
                              </>
                            )}

                            {tracker.type !== "checkbox" &&
                              tracker.type !== "none" && (
                                <span className="text-xs opacity-60">
                                  {tracker.type}
                                </span>
                              )}
                            <Link
                              to={`/${tracker.id}/log-entry`}
                              prefetch="viewport"
                              className="absolute inset-0"
                              state={{ dateString }}
                              aria-label={`Open ${tracker.title} tracker`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem asChild>
                    <Link to={`/${tracker.id}/log-entry`} prefetch="viewport">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Open Tracker
                    </Link>
                  </ContextMenuItem>
                  <ContextMenuItem asChild>
                    <Link to={`/${tracker.id}/log-entry`} prefetch="viewport">
                      <Edit className="mr-2 h-4 w-4" />
                      Log Entry
                    </Link>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteTracker(e, tracker.id, tracker.title);
                    }}
                    disabled={deletingId === tracker.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === tracker.id
                      ? "Deleting..."
                      : "Delete Tracker"}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
