import { Calendar, ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

type TrackerHeaderProps = {
  trackerTitle: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

export function TrackerHeader({
  trackerTitle,
  selectedDate,
  onDateChange,
}: TrackerHeaderProps) {
  return (
    <div className="w-full h-16 flex items-center justify-between">
      <div className="flex gap-4 items-center">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ChevronLeft />
          </Link>
        </Button>
        <span className="font-medium">{trackerTitle}</span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}
