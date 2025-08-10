import { Calendar, ChevronLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { quickAddValuesMap } from "~/lib/entry-quick-add-values";
import { useTracker, useTrackerEntries } from "~/lib/hooks";
import { cn } from "~/lib/utils";

export function meta() {
	return [{ title: "New React Router App" }];
}

export default function LogEntryPage() {
	const { trackerId } = useParams();
	const [currentValue, setCurrentValue] = useState(0);
	const [customInputValue, setCustomInputValue] = useState("");
	const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
	const [selectedDate, setSelectedDate] = useState(() =>
		formatDateString(new Date()),
	);

	const {
		tracker,
		loading: trackerLoading,
		error: trackerError,
	} = useTracker(trackerId || "");
	const {
		addToCurrentEntry,
		getCurrentEntry,
		setEntry,
		loading: entryLoading,
	} = useTrackerEntries(trackerId || "");

	useEffect(() => {
		if (tracker && trackerId) {
			const loadCurrentValue = async () => {
				const value = await getCurrentEntry(selectedDate);
				setCurrentValue(value);
				setIsCheckboxChecked(value > 0);
			};
			loadCurrentValue();
		}
	}, [tracker, getCurrentEntry, selectedDate, trackerId]);

	const handleQuickAdd = async (valueToAdd: number) => {
		try {
			const newValue = await addToCurrentEntry(valueToAdd, selectedDate);
			setCurrentValue(newValue);
		} catch (error) {
			console.error("Failed to add value:", error);
		}
	};

	const handleCustomAdd = async () => {
		const value = parseFloat(customInputValue);
		if (Number.isNaN(value) || value <= 0) return;

		try {
			const newValue = await addToCurrentEntry(value, selectedDate);
			setCurrentValue(newValue);
			setCustomInputValue("");
		} catch (error) {
			console.error("Failed to add custom value:", error);
		}
	};

	const handleCheckboxChange = async (checked: boolean) => {
		try {
			setIsCheckboxChecked(checked);
			await setEntry(checked ? 1 : 0, selectedDate);
			setCurrentValue(checked ? 1 : 0);
		} catch (error) {
			console.error("Failed to update checkbox:", error);
		}
	};

	if (trackerLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div>Loading tracker...</div>
			</div>
		);
	}

	if (trackerError || !tracker) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-red-600">
					{trackerError || "Tracker not found"}
				</div>
			</div>
		);
	}

	const quickAddValues = quickAddValuesMap[tracker.type];
	const isToday = selectedDate === formatDateString(new Date());

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
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4" />
					<input
						type="date"
						value={selectedDate}
						onChange={(e) => setSelectedDate(e.target.value)}
						className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
					/>
				</div>
			</div>
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
					<div className="flex items-center gap-3">
						<Checkbox
							id="isTrackedToday"
							checked={isCheckboxChecked}
							onCheckedChange={handleCheckboxChange}
							disabled={entryLoading}
						/>
						<Label htmlFor="isTrackedToday">Tracked today</Label>
					</div>
				) : (
					<>
						<div>
							Current:{" "}
							<span
								className={cn("text-xl font-semibold", {
									"text-green-600":
										tracker.goal && currentValue >= tracker.goal,
								})}
							>
								{currentValue}
								{!!tracker.goal && ` / ${tracker.goal}`}
							</span>
						</div>

						{!!quickAddValues && (
							<div className="flex gap-4">
								{quickAddValues.map(({ label, value }) => (
									<Button
										key={value}
										onClick={() => handleQuickAdd(value)}
										disabled={entryLoading}
									>
										<Plus /> {label}
									</Button>
								))}
							</div>
						)}
						<div className="flex gap-4 items-center mt-2">
							Custom
							<Input
								className="w-40 shrink"
								placeholder="17492"
								type="number"
								value={customInputValue}
								onChange={(e) => setCustomInputValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleCustomAdd();
									}
								}}
							/>
							<Button
								onClick={handleCustomAdd}
								disabled={
									entryLoading ||
									!customInputValue ||
									Number.isNaN(parseFloat(customInputValue))
								}
							>
								<Plus /> Add
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
