import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
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
import { differenceInDays, format } from "date-fns";

interface Entry {
  id: string;
  trackerId: string;
  date: string;
  value: number;
  comment?: string;
  createdAt: Date;
}

interface TrackerCumulativeChartProps {
  tracker: Tracker;
  entries: Entry[];
  fromDate: Date;
  toDate: Date;
}

export function TrackerCumulativeChart({
  tracker,
  entries,
  fromDate,
  toDate,
}: TrackerCumulativeChartProps) {
  const days = differenceInDays(toDate, fromDate);

  // Aggregate entries by date
  const dateValues = new Map<string, number>();
  entries.forEach((entry) => {
    const dateKey = entry.date;
    const currentValue = dateValues.get(dateKey) || 0;
    dateValues.set(dateKey, currentValue + entry.value);
  });

  // Build cumulative data
  const chartData: { label: string; value: number; sortKey: string }[] = [];
  let cumulativeTotal = 0;

  const currentDate = new Date(fromDate);
  while (currentDate <= toDate) {
    const dateKey = format(currentDate, "yyyy-MM-dd");
    const dailyValue = dateValues.get(dateKey) || 0;
    cumulativeTotal += dailyValue;
    const displayValue = toDisplayValue(cumulativeTotal, tracker.type);

    // Adjust label density based on date range
    let label: string;
    if (days <= 45) {
      // Show every few days for short periods
      label = format(currentDate, "MMM d");
    } else if (days <= 120) {
      // Show weekly markers
      if (
        currentDate.getDay() === 1 ||
        currentDate.getTime() === fromDate.getTime()
      ) {
        label = format(currentDate, "MMM d");
      } else {
        label = "";
      }
    } else {
      // Show monthly markers
      if (
        currentDate.getDate() === 1 ||
        currentDate.getTime() === fromDate.getTime()
      ) {
        label = format(currentDate, "MMM d");
      } else {
        label = "";
      }
    }

    chartData.push({
      label,
      value: displayValue,
      sortKey: dateKey,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const chartConfig = {
    value: {
      label: `Cumulative ${tracker.title}`,
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  const hasData = chartData.some((d) => d.value > 0);
  const finalValue = chartData[chartData.length - 1]?.value || 0;

  // Calculate average daily increase
  const totalDays = days + 1;
  const avgDailyIncrease = finalValue / totalDays;

  return (
    <Card className="select-none">
      <CardHeader>
        <CardTitle>Cumulative Total</CardTitle>
        <CardDescription>
          {format(fromDate, "MMM d, yyyy")} - {format(toDate, "MMM d, yyyy")}
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
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={30}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available for the selected period
          </div>
        )}
      </CardContent>
      {hasData && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="text-muted-foreground leading-none">
            Total accumulated: {finalValue.toFixed(2)}{" "}
            {displayUnits[tracker.type]}
          </div>
          <div className="text-muted-foreground leading-none">
            Average daily: {avgDailyIncrease.toFixed(2)}{" "}
            {displayUnits[tracker.type]}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
