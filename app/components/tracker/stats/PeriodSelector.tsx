import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { formatDateString } from "~/lib/dates";
import {
  calculateDateFromPeriod,
  statsPeriods,
  type StatsPeriodOption,
} from "~/lib/stats";

interface PeriodSelectorProps {
  selectedValue: StatsPeriodOption | "custom";
  showCustom: boolean;
  onDateRangeChange: (from: string, to: string) => void;
}

export function PeriodSelector({
  selectedValue,
  showCustom,
  onDateRangeChange,
}: PeriodSelectorProps) {
  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = formatDateString(today);

    const from = calculateDateFromPeriod(value as StatsPeriodOption, today);
    const fromStr = formatDateString(from);

    onDateRangeChange(fromStr, to);
  };

  return (
    <Select value={selectedValue} onValueChange={handleDateRangeChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {statsPeriods.map((period) => (
          <SelectItem key={period} value={period}>
            {period}
          </SelectItem>
        ))}
        {showCustom && <SelectItem value="custom">Custom</SelectItem>}
      </SelectContent>
    </Select>
  );
}
