import { ChevronLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { useFormState, useTrackers } from "~/lib/hooks";
import {
	type TrackerType,
	trackerTypes,
	trackerTypesLabels,
} from "~/lib/trackers";

export function meta() {
	return [{ title: "New React Router App" }];
}

interface TrackerFormData {
	title: string;
	type: TrackerType;
	goal?: number;
	parentId?: string;
}

export default function NewTrackerPage() {
	const navigate = useNavigate();
	const { trackers, createTracker } = useTrackers();
	const [isCheckboxTypeSelected, setIsCheckboxTypeSelected] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isTypeDisabled, setIsTypeDisabled] = useState(false);

	const { state, errors, updateField, setFieldError, clearErrors } =
		useFormState<TrackerFormData>({
			title: "",
			type: "none",
			goal: undefined,
			parentId: undefined,
		});

	// Effect to handle initial state and parent selection changes
	useEffect(() => {
		if (state.parentId) {
			const parentTracker = trackers.find((t) => t.id === state.parentId);
			if (parentTracker) {
				updateField("type", parentTracker.type);
				setIsCheckboxTypeSelected(parentTracker.type === "checkbox");
				setIsTypeDisabled(true);
			}
		} else {
			setIsTypeDisabled(false);
		}
	}, [state.parentId, trackers, updateField]);

	// Helper function to check if selecting a parent would create a circular reference
	const wouldCreateCircularReference = (potentialParentId: string, allTrackers: typeof trackers): boolean => {
		// For a new tracker, we can't have circular references since it doesn't exist yet
		// This function is mainly for future edit functionality
		return false;
	};

	const handleSave = async () => {
		clearErrors();

		// Validation
		if (!state.title.trim()) {
			setFieldError("title", "Tracker name is required");
			return;
		}

		try {
			setIsSaving(true);
			const trackerData = {
				title: state.title.trim(),
				type: state.type,
				isNumber: state.type !== "checkbox",
				...(state.goal && state.goal > 0 && { goal: state.goal }),
				...(state.parentId && { parentId: state.parentId }),
			};

			await createTracker(trackerData);
			navigate("/");
		} catch (error) {
			console.error("Failed to create tracker:", error);
		} finally {
			setIsSaving(false);
		}
	};

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
				<Button onClick={handleSave} disabled={isSaving}>
					<Save />
					{isSaving ? "Saving..." : "Save"}
				</Button>
			</div>
			<div className="flex flex-col py-6 gap-4">
				<div className="grid items-center gap-3">
					<Label htmlFor="trackerName">Tracker name</Label>
					<Input
						required
						type="text"
						id="trackerName"
						placeholder="Tracker name"
						value={state.title}
						onChange={(e) => updateField("title", e.target.value)}
					/>
					{errors.title && (
						<div className="text-red-600 text-sm">{errors.title}</div>
					)}
				</div>
				<div className="grid items-center gap-3">
					<Label htmlFor="trackerTypeTrigger">Measurement unit (type)</Label>
					<Select
						required
						value={state.type}
						onValueChange={(value: TrackerType) => {
							updateField("type", value);
							setIsCheckboxTypeSelected(value === "checkbox");
						}}
						disabled={isTypeDisabled}
					>
						<SelectTrigger
							id="trackerTypeTrigger"
							className={isTypeDisabled ? "opacity-60" : ""}
						>
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
					{isTypeDisabled && (
						<div className="text-blue-600 text-sm">
							Measurement unit automatically set to match parent tracker
						</div>
					)}
					{errors.type && (
						<div className="text-red-600 text-sm">{errors.type}</div>
					)}
				</div>
				{!isCheckboxTypeSelected && (
					<div className="grid items-center gap-3">
						<Label htmlFor="trackerDailyGoal">Daily goal (optional)</Label>
						<Input
							type="number"
							id="trackerDailyGoal"
							placeholder="0"
							value={state.goal || ""}
							onChange={(e) => {
								const value = e.target.value;
								updateField("goal", value ? Number(value) : undefined);
							}}
						/>
					</div>
				)}
				<div className="grid items-center gap-3">
					<Label htmlFor="parentTracker">Parent tracker (optional)</Label>
					<Select
						value={state.parentId || "none"}
						onValueChange={(value: string) => {
							if (value === "none") {
								updateField("parentId", undefined);
							} else {
								// Additional validation could be added here
								updateField("parentId", value);
							}
						}}
					>
						<SelectTrigger id="parentTracker">
							<SelectValue placeholder="Select parent tracker" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="none">None</SelectItem>
								{trackers
									.filter(
										(tracker) =>
											tracker.isNumber && // Only numeric trackers can be parents
											tracker.type !== "checkbox" && // Exclude checkbox trackers
											!wouldCreateCircularReference(tracker.id, trackers), // Prevent circular references
									)
									.map((tracker) => (
										<SelectItem key={tracker.id} value={tracker.id}>
											{tracker.title}
										</SelectItem>
									))}
							</SelectGroup>
						</SelectContent>
					</Select>
					{errors.parentId && (
						<div className="text-red-600 text-sm">{errors.parentId}</div>
					)}
					{state.parentId && (
						<div className="text-gray-600 text-sm">
							Values added to this tracker will automatically be added to{" "}
							{trackers.find(t => t.id === state.parentId)?.title}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
