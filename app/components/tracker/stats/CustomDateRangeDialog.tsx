import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDateString } from "~/lib/dates";
import { addDays, startOfYear, subMonths, subYears, endOfYear } from "date-fns";

interface CustomDateRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (from: string, to: string) => void;
  initialFrom?: string;
  initialTo?: string;
}

export function CustomDateRangeDialog({
  open,
  onOpenChange,
  onApply,
  initialFrom,
  initialTo,
}: CustomDateRangeDialogProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateString(today);

  const quickOptions = [
    {
      label: "6M",
      from: addDays(subMonths(today, 6), 1),
      to: today,
    },
    {
      label: "9M",
      from: addDays(subMonths(today, 9), 1),
      to: today,
    },
    {
      label: "1Y",
      from: addDays(subYears(today, 1), 1),
      to: today,
    },
    {
      label: "'" + subYears(today, 1).getFullYear().toString().substring(2, 4),
      from: startOfYear(subYears(today, 1)),
      to: endOfYear(subYears(today, 1)),
    },
    {
      label: "'" + subYears(today, 2).getFullYear().toString().substring(2, 4),
      from: startOfYear(subYears(today, 2)),
      to: endOfYear(subYears(today, 2)),
    },
  ];

  const [fromDate, setFromDate] = useState(initialFrom || todayStr);
  const [toDate, setToDate] = useState(initialTo || todayStr);

  useEffect(() => {
    console.log("DD: Dialog open state changed:", open);
  }, [open]);

  // Reset state when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setFromDate(initialFrom || todayStr);
      setToDate(initialTo || todayStr);
    }
  }, [open, initialFrom, initialTo, todayStr]);

  const applyRange = (from: string, to: string) => {
    const fromD = new Date(from);
    const toD = new Date(to);
    if (fromD > toD) {
      onApply(formatDateString(toD), formatDateString(fromD));
    } else {
      onApply(from, to);
    }
    onOpenChange(false);
  };

  const handleQuickOption = (from: Date, to: Date) => {
    const fromStr = formatDateString(from);
    const toStr = formatDateString(to);
    setFromDate(fromStr);
    setToDate(toStr);
    // applyRange(fromStr, toStr);
  };

  const handleApply = () => {
    if (fromDate && toDate) {
      applyRange(fromDate, toDate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom Date Range</DialogTitle>
          <DialogDescription>
            Select a custom date range for viewing statistics.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickOption(option.from, option.to)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="from-date">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={todayStr}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="to-date">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              max={todayStr}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
