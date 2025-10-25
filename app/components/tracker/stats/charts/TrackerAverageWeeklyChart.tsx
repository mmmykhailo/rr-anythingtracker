"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../../ui/chart";
import type { Tracker } from "../../../../lib/trackers";
import {
  toDisplayValue,
  displayUnits,
} from "../../../../lib/number-conversions";
import { format, startOfWeek, eachDayOfInterval } from "date-fns";

interface Entry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
}

interface TrackerAverageWeeklyChartProps {
  tracker: Tracker;
  entries: Entry[];
  fromDate: Date;
  toDate: Date;
}

export function TrackerAverageWeeklyChart({
  tracker,
  entries,
  fromDate,
  toDate,
}: TrackerAverageWeeklyChartProps) {
  // Aggregate entries by date first
  const dateValues = new Map<string, number>();
  entries.forEach((entry) => {
    const dateKey = entry.date;
    const currentValue = dateValues.get(dateKey) || 0;
    dateValues.set(dateKey, currentValue + entry.value);
  });

  // Aggregate by week with day count
  const weeklyData = new Map<string, { total: number; days: number }>();

  // Get all days in the range to count days properly
  const allDays = eachDayOfInterval({ start: fromDate, end: toDate });
  allDays.forEach((day) => {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const existing = weeklyData.get(weekKey) || { total: 0, days: 0 };

    const dateKey = format(day, "yyyy-MM-dd");
    const value = dateValues.get(dateKey) || 0;

    weeklyData.set(weekKey, {
      total: existing.total + value,
      days: existing.days + 1,
    });
  });

  // Build weekly average data
  const chartData: { label: string; value: number; sortKey: string }[] = [];
  const currentDate = startOfWeek(new Date(fromDate), { weekStartsOn: 1 });
  const endWeek = startOfWeek(new Date(toDate), { weekStartsOn: 1 });

  while (currentDate <= endWeek) {
    const weekKey = format(currentDate, "yyyy-MM-dd");
    const weekData = weeklyData.get(weekKey);
    const averageValue = weekData ? weekData.total / weekData.days : 0;
    const displayValue = toDisplayValue(averageValue, tracker.type);

    chartData.push({
      label: format(currentDate, "MMM d"),
      value: displayValue,
      sortKey: weekKey,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  const chartConfig = {
    value: {
      label: `${tracker.title} (Weekly Avg)`,
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  // Calculate trend
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const previousValue = chartData[chartData.length - 2]?.value || 0;
  const trend =
    previousValue > 0
      ? ((lastValue - previousValue) / previousValue) * 100
      : 0;
  const isPositiveTrend = trend > 0;

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Average</CardTitle>
        <CardDescription>
          {format(fromDate, "MMM d, yyyy")} - {format(toDate, "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available for the selected period
          </div>
        )}
      </CardContent>
      {hasData && trend !== 0 && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            {isPositiveTrend ? "Trending up" : "Trending down"} by{" "}
            {Math.abs(trend).toFixed(1)}% from previous week{" "}
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
