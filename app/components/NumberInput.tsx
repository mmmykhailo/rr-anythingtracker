import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect, useRef } from "react";

interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  step?: string;
  id?: string;
  showClearButton?: boolean;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  step = "any",
  id,
  showClearButton = false,
  className,
}: NumberInputProps) {
  // Keep track of the raw input string to allow typing decimals
  const [inputString, setInputString] = useState("");
  const isInternalChange = useRef(false);

  // Sync input string when external value changes (but not when we're the ones changing it)
  useEffect(() => {
    if (!isInternalChange.current) {
      if (value !== null && value !== undefined) {
        // Convert to string, remove trailing zeros if it's a decimal
        const str = value.toString();
        setInputString(str);
      } else {
        setInputString("");
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawInput = e.target.value;

    // Replace commas with dots
    rawInput = rawInput.replace(/,/g, ".");

    // Filter out any characters except numbers and dots
    rawInput = rawInput.replace(/[^0-9.]/g, "");

    // Prevent multiple dots
    const dotCount = (rawInput.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Keep only the first dot
      const firstDotIndex = rawInput.indexOf(".");
      rawInput =
        rawInput.slice(0, firstDotIndex + 1) +
        rawInput.slice(firstDotIndex + 1).replace(/\./g, "");
    }

    // Update the input string (allows intermediate states like "1." or "1.5")
    setInputString(rawInput);

    // Parse and notify parent of the value change
    isInternalChange.current = true;
    if (rawInput === "" || rawInput === ".") {
      onChange(null);
    } else {
      const parsedValue = parseFloat(rawInput);
      onChange(isNaN(parsedValue) ? null : parsedValue);
    }
  };

  const handleClear = () => {
    setInputString("");
    isInternalChange.current = true;
    onChange(null);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        pattern="[0-9.]*"
        step={step}
        value={inputString}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
      {showClearButton && inputString && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute inset-0 left-auto rounded-l-none"
          onClick={handleClear}
          type="button"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
