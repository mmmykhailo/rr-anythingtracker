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

export function getDaysArray(startDate: Date, numberOfDays: number): string[] {
  return Array.from({ length: numberOfDays }, (_, i) =>
    formatDateString(addDays(startDate, i))
  );
}

export function getWeekDates(referenceDate: Date = new Date()): string[] {
  const start = subDays(referenceDate, 6); // Last 7 days ending on reference date
  return getDaysArray(start, 7);
}

export function getPreviousWeekStart(currentWeekStart: Date): Date {
  return subDays(currentWeekStart, 7);
}

export function getNextWeekStart(currentWeekStart: Date): Date {
  return addDays(currentWeekStart, 7);
}

export function getCurrentWeekStart(): Date {
  const today = new Date();
  return subDays(today, 6);
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
