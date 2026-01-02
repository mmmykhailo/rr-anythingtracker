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

export function toMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error(`Invalid date string: expected non-empty string, got ${typeof dateStr}`);
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: expected "yyyy-MM-dd", got "${dateStr}"`);
  }

  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date components: expected numbers in "${dateStr}"`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: expected 1-12, got ${month} in "${dateStr}"`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: expected 1-31, got ${day} in "${dateStr}"`);
  }

  const date = new Date(year, month - 1, day);
  
  // Check if the date is valid (handles cases like Feb 30)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: "${dateStr}" does not represent a valid calendar date`);
  }

  return date;
}
