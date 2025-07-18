import { Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export function meta() {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

const trackers = [
	{
		title: "Alcohol",
		measurement: "liters",
		isNumber: true,
		values: [1.5, 0],
	},
	{
		title: "Energy drinks",
		measurement: "liters",
		isNumber: true,
		values: [0.33, 0.5],
	},
	{
		title: "Coffee",
		measurement: "liters",
		isNumber: true,
		values: [0, 0.4],
	},
	{
		title: "Steps",
		measurement: "steps",
		isNumber: true,
		values: [12322, 5006],
		goal: 6000,
	},
];

export default function Home() {
	return (
		<div className="max-w-md mx-auto px-4">
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
						<div className="relative flex gap-2 items-center py-2">
							<div className="w-2/5 font-medium">{tracker.title}</div>
							<div className="w-3/5 grid grid-cols-2 gap-2">
								{tracker.values.map((value, valueIndex) => (
									<div
										className={cn(
											"text-center flex flex-col leading-none gap-1",
											{
												"opacity-50": value === 0,
												"text-zinc-400": tracker.goal && value < tracker.goal,
												"text-green-600": tracker.goal && value > tracker.goal,
											},
										)}
										key={`${valueIndex}-${value}`}
									>
										<span className="font-semibold">{value}</span>
										<span className="text-sm">{tracker.measurement}</span>
									</div>
								))}
							</div>
							<Link
								to={`temp-${tracker.title.replaceAll(" ", "")}`}
								className="absolute inset-0"
								aria-label={`Open ${tracker.title} tracker`}
							/>
						</div>
					</div>
				))}
			</div>
			<div className="mt-4 flex justify-center">
				<Button variant="secondary">
					<Plus />
					New tracker
				</Button>
			</div>
		</div>
	);
}
