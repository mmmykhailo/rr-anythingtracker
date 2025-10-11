import { addDays, format } from "date-fns";
import {
  BarChart3,
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
import { cn } from "~/lib/utils";

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
        <Button asChild variant="ghost" size="icon">
          <Link to="/github-sync-settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
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
                  className={cn("py-1", {
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
        {trackers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No trackers yet. Create your first tracker to get started!
          </div>
        ) : (
          trackers.map((tracker) => (
            <div key={tracker.title} className="relative">
              <Separator />
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="relative flex gap-2 items-center p-2 transition-colors hover:bg-accent cursor-context-menu">
                    <div className="w-1/3 font-medium">
                      {tracker.title}
                      {tracker.parentId && (
                        <div className="text-xs text-gray-500 opacity-75">
                          →{" "}
                          {
                            trackers.find((t) => t.id === tracker.parentId)
                              ?.title
                          }
                        </div>
                      )}
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
                            className={cn(
                              "text-center flex flex-col leading-none gap-1 py-1 rounded",
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
                            <span className="font-semibold text-xs">
                              {formatStoredValue(value, tracker.type)}
                            </span>
                            {tracker.type !== "checkbox" && (
                              <span className="text-xs opacity-60">
                                {tracker.type}
                              </span>
                            )}
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
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem asChild>
                    <Link to={`/${tracker.id}/log-entry`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Open Tracker
                    </Link>
                  </ContextMenuItem>
                  <ContextMenuItem asChild>
                    <Link to={`/${tracker.id}/log-entry`}>
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
          <Link to="/new-tracker">
            <Plus />
            New tracker
          </Link>
        </Button>
      </div>
    </div>
  );
}
