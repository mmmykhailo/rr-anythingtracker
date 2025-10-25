import { formatDateString } from "~/lib/dates";
import type { StatsPeriod } from "./types";
import { statsPeriods } from "./types";

export function calculateDateFromPeriod(
  period: StatsPeriod,
  today: Date
): Date {
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);

  if (period === "YTD") {
    return new Date(today.getFullYear(), 0, 1);
  } else if (period === "1M") {
    from.setMonth(today.getMonth() - 1);
    from.setDate(today.getDate() + 1);
    if (from.getMonth() === today.getMonth()) {
      from.setDate(1);
    }
    return from;
  } else if (period === "3M") {
    from.setMonth(today.getMonth() - 3);
    from.setDate(today.getDate() + 1);
    if (from.getMonth() === today.getMonth()) {
      from.setDate(1);
    }
    return from;
  } else if (period === "1Y") {
    from.setFullYear(today.getFullYear() - 1);
    from.setDate(today.getDate() + 1);
    if (
      from.getMonth() === today.getMonth() &&
      from.getFullYear() === today.getFullYear()
    ) {
      from.setDate(1);
    }
    return from;
  }
  return from;
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
