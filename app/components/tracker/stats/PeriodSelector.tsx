import { useState } from "react";
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
  calculateEndDateFromPeriod,
  getPeriodLabel,
  statsPeriods,
  type StatsPeriodOption,
} from "~/lib/stats";
import { CustomDateRangeDialog } from "./CustomDateRangeDialog";

interface PeriodSelectorProps {
  selectedValue: StatsPeriodOption | "custom";
  onDateRangeChange: (from: string, to: string) => void;
  fromDate?: string;
  toDate?: string;
}

export function PeriodSelector({
  selectedValue,
  onDateRangeChange,
  fromDate,
  toDate,
}: PeriodSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      setIsDialogOpen(true);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = calculateDateFromPeriod(value as StatsPeriodOption, today);
    const to = calculateEndDateFromPeriod(value as StatsPeriodOption, today);
    const fromStr = formatDateString(from);
    const toStr = formatDateString(to);

    onDateRangeChange(fromStr, toStr);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Select value={selectedValue} onValueChange={handleDateRangeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {statsPeriods.map((period) => (
            <SelectItem key={period} value={period}>
              {getPeriodLabel(period)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <CustomDateRangeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onApply={onDateRangeChange}
        initialFrom={fromDate}
        initialTo={toDate}
      />
    </>
  );
}
