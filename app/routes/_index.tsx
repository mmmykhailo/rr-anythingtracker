import { addDays } from "date-fns";
import {
	BarChart3,
	ChevronLeft,
	ChevronRight,
	Edit,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { Separator } from "~/components/ui/separator";
import {
	formatDateForDisplay,
	formatDateString,
	getCurrentWeekStart,
	getDaysArray,
	getNextWeekStart,
	getPreviousWeekStart,
	isDateToday,
} from "~/lib/dates";
import { useDatabase, useTrackers } from "~/lib/hooks";
import type { Tracker } from "~/lib/trackers";
import { cn } from "~/lib/utils";

export function meta() {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

export default function Home() {
	const { isInitialized, error: dbError } = useDatabase();
	const { trackers, loading, error, removeTracker } = useTrackers();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [currentWeekStart, setCurrentWeekStart] = useState(() =>
		getCurrentWeekStart(),
	);

	// Generate array of 7 days from currentWeekStart
	const dates = getDaysArray(currentWeekStart, 7);

	const goToPreviousWeek = () => {
		setCurrentWeekStart((prev) => getPreviousWeekStart(prev));
	};

	const goToNextWeek = () => {
		setCurrentWeekStart((prev) => getNextWeekStart(prev));
	};

	const goToCurrentWeek = () => {
		setCurrentWeekStart(getCurrentWeekStart());
	};

	const handleDeleteTracker = async (
		e: React.MouseEvent,
		trackerId: string,
		trackerTitle: string,
	) => {
		e.preventDefault();
		e.stopPropagation();

		if (
			!confirm(
				`Are you sure you want to delete "${trackerTitle}"? This will remove all data for this tracker.`,
			)
		) {
			return;
		}

		try {
			setDeletingId(trackerId);
			await removeTracker(trackerId);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div>Loading trackers...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-red-600">Error: {error}</div>
			</div>
		);
	}

	return (
		<div>
			<div className="w-full h-16 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button size="sm" variant="ghost" onClick={goToPreviousWeek}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button size="sm" variant="ghost" onClick={goToCurrentWeek}>
						This Week
					</Button>
					<Button size="sm" variant="ghost" onClick={goToNextWeek}>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
				<Button>
					<Plus />
					New entry
				</Button>
			</div>
			<div className="flex flex-col py-6">
				<div className="px-2 w-full flex justify-end pb-2">
					<div className="w-2/3 grid grid-cols-7 gap-1 text-xs font-medium text-center">
						{dates.map((dateString) => {
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
													→ {trackers.find(t => t.id === tracker.parentId)?.title}
												</div>
											)}
										</div>
										<div className="w-2/3 grid grid-cols-7 gap-1 shrink-0">
											{dates.map((dateString) => {
												const value = tracker.values[dateString] || 0;
												const isTodayDate = isDateToday(dateString);

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
																"bg-blue-100 dark:bg-blue-900": isTodayDate,
															},
														)}
														key={dateString}
													>
														<span className="font-semibold text-xs">
															{value}
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
