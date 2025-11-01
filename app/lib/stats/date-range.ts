import { addDays, startOfYear, subMonths, subYears } from "date-fns";
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
  } else if (period === "1Y") {
    return addDays(subYears(today, 1), 1);
  }
  return today;
}

export function getSelectedPeriod(
  fromParam: string | null,
  toParam: string | null,
  today: Date
): {
  selectedValue: StatsPeriod | "custom";
  showCustom: boolean;
  fromDate: Date;
  toDate: Date;
} {
  if (!fromParam || !toParam) {
    const from = calculateDateFromPeriod("1M", today);
    const to = today;
    return {
      selectedValue: "1M",
      showCustom: false,
      fromDate: from,
      toDate: to,
    };
  }

  const from = new Date(fromParam);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toParam);
  to.setHours(0, 0, 0, 0);

  const todayStr = formatDateString(today);

  if (toParam !== todayStr) {
    return {
      selectedValue: "custom",
      showCustom: true,
      fromDate: from,
      toDate: to,
    };
  }

  for (const period of statsPeriods) {
    const expectedFrom = calculateDateFromPeriod(period, today);
    if (formatDateString(expectedFrom) === fromParam) {
      return {
        selectedValue: period,
        showCustom: false,
        fromDate: from,
        toDate: to,
      };
    }
  }

  return {
    selectedValue: "custom",
    showCustom: true,
    fromDate: from,
    toDate: to,
  };
}
