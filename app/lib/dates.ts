import { format, addDays, subDays, isToday } from "date-fns";

export function formatDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getDateFromString(dateString: string): Date {
  return new Date(dateString);
}

export function isDateToday(dateString: string): boolean {
  return isToday(getDateFromString(dateString));
}

export function getDaysArray(lastDate: Date, numberOfDays: number): string[] {
  return Array.from({ length: numberOfDays }, (_, i) =>
    formatDateString(subDays(lastDate, numberOfDays - 1 - i))
  );
}

export function formatDateForDisplay(dateString: string): {
  weekday: string;
  day: number;
} {
  const date = getDateFromString(dateString);
  return {
    weekday: date.toLocaleDateString("en", { weekday: "short" }),
    day: date.getDate(),
  };
}
