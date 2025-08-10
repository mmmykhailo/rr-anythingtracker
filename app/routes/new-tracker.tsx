import { ChevronLeft, Save } from "lucide-react";
import { useState } from "react";
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
}

export default function NewTrackerPage() {
	const navigate = useNavigate();
	const { createTracker } = useTrackers();
	const [isCheckboxTypeSelected, setIsCheckboxTypeSelected] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const { state, errors, updateField, setFieldError, clearErrors } =
		useFormState<TrackerFormData>({
			title: "",
			type: "none",
			goal: undefined,
		});

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
			</div>
		</div>
	);
}
