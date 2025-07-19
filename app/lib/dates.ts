import { format } from "date-fns";

export function formatDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
