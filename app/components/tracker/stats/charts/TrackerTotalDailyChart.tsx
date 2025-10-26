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
import { format } from "date-fns";

interface Entry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
}

interface TrackerTotalDailyChartProps {
  tracker: Tracker;
  entries: Entry[];
  fromDate: Date;
  toDate: Date;
}

export function TrackerTotalDailyChart({
  tracker,
  entries,
  fromDate,
  toDate,
}: TrackerTotalDailyChartProps) {
  // Aggregate entries by date
  const dateValues = new Map<string, number>();
  entries.forEach((entry) => {
    const dateKey = entry.date;
    const currentValue = dateValues.get(dateKey) || 0;
    dateValues.set(dateKey, currentValue + entry.value);
  });

  // Build daily data
  const chartData: {
    label: string;
    fullDate: string;
    value: number;
    sortKey: string;
  }[] = [];
  const currentDate = new Date(fromDate);

  while (currentDate <= toDate) {
    const dateKey = format(currentDate, "yyyy-MM-dd");
    const storedValue = dateValues.get(dateKey) || 0;
    const displayValue = toDisplayValue(storedValue, tracker.type);

    chartData.push({
      label: format(currentDate, "MMM d"),
      fullDate: format(currentDate, "MMM d, yyyy"),
      value: displayValue,
      sortKey: dateKey,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const chartConfig = {
    value: {
      label: tracker.title,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Calculate trend
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const previousValue = chartData[chartData.length - 2]?.value || 0;
  const trend =
    previousValue > 0 ? ((lastValue - previousValue) / previousValue) * 100 : 0;
  const isPositiveTrend = trend > 0;

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <Card className="select-none">
      <CardHeader>
        <CardTitle>Daily Total</CardTitle>
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
                minTickGap={30}
                interval="preserveStartEnd"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.fullDate;
                      }
                      return "";
                    }}
                  />
                }
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
            {Math.abs(trend).toFixed(1)}% from previous day{" "}
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
