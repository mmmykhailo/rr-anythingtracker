"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../ui/chart";
import type { Tracker } from "../../../lib/trackers";
import { toDisplayValue, displayUnits } from "../../../lib/number-conversions";

export const description = "A line chart";

interface Entry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
}

interface TrackerHalfYearChartProps {
  tracker: Tracker;
  entries: Entry[];
}

export function TrackerHalfYearChart({
  tracker,
  entries,
}: TrackerHalfYearChartProps) {
  // Get the last 6 months
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Create a map of date -> total value
  const dateValues = new Map<string, number>();

  // Filter entries from last 6 months and aggregate by date
  entries.forEach((entry) => {
    const entryDate = new Date(entry.date);
    if (entryDate >= sixMonthsAgo && entryDate <= today) {
      const dateKey = entry.date;
      const currentValue = dateValues.get(dateKey) || 0;
      dateValues.set(dateKey, currentValue + entry.value);
    }
  });

  // Create array of all dates in the last 6 months
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Group by month and calculate monthly totals
  const monthlyData = new Map<string, number>();
  dateValues.forEach((value, date) => {
    const dateObj = new Date(date);
    const monthKey = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}`;
    const currentMonthValue = monthlyData.get(monthKey) || 0;
    monthlyData.set(monthKey, currentMonthValue + value);
  });

  // Generate chart data for the last 6 months
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthName = monthNames[date.getMonth()];
    const storedValue = monthlyData.get(monthKey) || 0;
    const displayValue = toDisplayValue(storedValue, tracker.type);

    chartData.push({
      month: monthName,
      value: displayValue,
    });
  }

  const chartConfig = {
    value: {
      label: tracker.title,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Calculate trend
  const lastMonthValue = chartData[5]?.value || 0;
  const previousMonthValue = chartData[4]?.value || 0;
  const trend =
    previousMonthValue > 0
      ? ((lastMonthValue - previousMonthValue) / previousMonthValue) * 100
      : 0;
  const isPositiveTrend = trend > 0;

  // Get date range for description
  const startMonth = chartData[0]?.month || "";
  const endMonth = chartData[5]?.month || "";
  const year = today.getFullYear();
  const unit = displayUnits[tracker.type];
  const hasData = chartData.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tracker.title} - Last 6 months</CardTitle>
        <CardDescription>
          {startMonth} - {endMonth} {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="value"
                type="natural"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available for the last 6 months
          </div>
        )}
      </CardContent>
      {hasData && trend !== 0 && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            {isPositiveTrend ? "Trending up" : "Trending down"} by{" "}
            {Math.abs(trend).toFixed(1)}% this month{" "}
            <TrendingUp
              className={`inline-block h-4 w-4 ${
                isPositiveTrend ? "" : "rotate-180"
              }`}
            />
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
