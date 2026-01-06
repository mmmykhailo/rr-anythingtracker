import { addDays, startOfYear, subMonths, subYears, endOfYear } from "date-fns";
import { formatDateString } from "~/lib/dates";
import type { StatsPeriod } from "./types";
import { statsPeriods } from "./types";

export function calculateDateFromPeriod(
  period: StatsPeriod,
  today: Date
): Date {
  if (period === "YTD") {
    return startOfYear(today);
  } else if (period === "1M") {
    return addDays(subMonths(today, 1), 1);
  } else if (period === "3M") {
    return addDays(subMonths(today, 3), 1);
  }
  return today;
}

export function calculateEndDateFromPeriod(
  period: StatsPeriod,
  today: Date
): Date {
  return today;
}

export function getPeriodLabel(period: StatsPeriod): string {
  if (period === "custom") {
    return "Custom";
  }

  return period;
}

export function getSelectedPeriod(
  fromParam: string | null,
  toParam: string | null,
  today: Date
): {
  selectedValue: StatsPeriod;
  fromDate: Date;
  toDate: Date;
} {
  if (!fromParam || !toParam) {
    const from = calculateDateFromPeriod("1M", today);
    const to = today;
    return {
      selectedValue: "1M",
      fromDate: from,
      toDate: to,
    };
  }

  const from = new Date(fromParam);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toParam);
  to.setHours(0, 0, 0, 0);

  for (const period of statsPeriods) {
    const expectedFrom = calculateDateFromPeriod(period, today);
    const expectedTo = calculateEndDateFromPeriod(period, today);
    if (
      formatDateString(expectedFrom) === fromParam &&
      formatDateString(expectedTo) === toParam
    ) {
      return {
        selectedValue: period,
        fromDate: from,
        toDate: to,
      };
    }
  }

  return {
    selectedValue: "custom",
    fromDate: from,
    toDate: to,
  };
}
