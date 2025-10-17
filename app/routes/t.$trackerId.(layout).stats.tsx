import { useEffect } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import type { ClientLoaderFunctionArgs } from "react-router";
import { getTrackerById, getEntryHistory } from "~/lib/db";
import { TrackerHalfYearChart } from "~/components/tracker/charts/TrackerHalfYearChart";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const trackerId = params.trackerId;
  if (!trackerId) {
    throw new Response("Tracker ID is required", { status: 400 });
  }

  try {
    const tracker = await getTrackerById(trackerId);
    if (!tracker) {
      throw new Response("Tracker not found", { status: 404 });
    }
    const entries = await getEntryHistory(trackerId);
    return { tracker, entries };
  } catch (error) {
    throw new Response("Failed to load tracker", { status: 500 });
  }
}

export function meta({ params }: { params: { trackerId: string } }) {
  return [
    { title: "Charts - AnythingTracker" },
    {
      name: "description",
      content: "View charts for your tracker",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function TrackerChartsPage() {
  const { tracker, entries } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    const handleDataChange = () => {
      revalidator.revalidate();
    };

    window.addEventListener("anythingtracker:datachange", handleDataChange);
    return () => {
      window.removeEventListener(
        "anythingtracker:datachange",
        handleDataChange
      );
    };
  }, [revalidator]);

  if (!tracker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Tracker not found</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Total tracked</CardDescription>
            <CardTitle className="text-2xl">50</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this year</CardDescription>
            <CardTitle className="text-2xl">50</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this month</CardDescription>
            <CardTitle className="text-2xl">50</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked this week</CardDescription>
            <CardTitle className="text-2xl">50</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Rename this chart to "TrackerTotalHalfYearChart" */}
      <TrackerHalfYearChart tracker={tracker} entries={entries} />

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Average</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Yearly average</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly average</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weekly average</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Replace this with a new "TrackerAverageHalfYearChart" */}
      <TrackerHalfYearChart tracker={tracker} entries={entries} />

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardDescription>Current goal streak</CardDescription>
            <CardTitle className="text-2xl">2 days</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Longest goal streak</CardDescription>
            <CardTitle className="text-2xl">2 days</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Missed goal days</CardDescription>
            <CardTitle className="text-2xl">2 days</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Consistency score</CardDescription>
            <CardTitle className="text-2xl">50%</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
