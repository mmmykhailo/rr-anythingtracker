import type { TrackerType } from "./trackers";

// Define conversion factors for each tracker type
// Values are stored as the smallest unit to avoid floating point issues
export const conversionFactors: Record<TrackerType, number> = {
  liters: 1000, // Store as milliliters (1L = 1000ml)
  steps: 1,     // Already in smallest unit
  checkbox: 1,  // Binary value (0 or 1)
  none: 1,      // Generic counter, no conversion
};

// Define decimal places for display formatting
export const displayDecimals: Record<TrackerType, number> = {
  liters: 3,    // Show up to 3 decimal places for liters (e.g., 0.001L)
  steps: 0,     // No decimals for steps
  checkbox: 0,  // No decimals for checkbox
  none: 0,      // No decimals for generic counter
};

// Define display units
export const displayUnits: Record<TrackerType, string> = {
  liters: "L",
  steps: "steps",
  checkbox: "",
  none: "",
};

/**
 * Converts a user input value to the stored integer format
 * @param value - The user input value (e.g., 0.5 for 0.5L)
 * @param type - The tracker type
 * @returns The integer value to store (e.g., 500 for 0.5L)
 */
export function toStoredValue(value: number, type: TrackerType): number {
  const factor = conversionFactors[type];
  return Math.round(value * factor);
}

/**
 * Converts a stored integer value to display format
 * @param storedValue - The stored integer value (e.g., 500 for 0.5L)
 * @param type - The tracker type
 * @returns The display value (e.g., 0.5 for 500ml)
 */
export function toDisplayValue(storedValue: number, type: TrackerType): number {
  const factor = conversionFactors[type];
  return storedValue / factor;
}

/**
 * Formats a stored value for display with appropriate decimals
 * @param storedValue - The stored integer value
 * @param type - The tracker type
 * @param includeUnit - Whether to include the unit in the formatted string
 * @returns The formatted display string
 */
export function formatStoredValue(
  storedValue: number,
  type: TrackerType,
  includeUnit: boolean = false
): string {
  const displayValue = toDisplayValue(storedValue, type);
  const decimals = displayDecimals[type];

  // Format the number with appropriate decimal places
  let formatted: string;
  if (decimals === 0) {
    formatted = Math.round(displayValue).toString();
  } else {
    // Remove trailing zeros and unnecessary decimal point
    formatted = displayValue.toFixed(decimals);
    formatted = formatted.replace(/\.?0+$/, "");
  }

  // Add unit if requested
  if (includeUnit && displayUnits[type]) {
    formatted = `${formatted}${displayUnits[type]}`;
  }

  return formatted;
}

/**
 * Parses user input string to a stored integer value
 * @param input - The user input string (e.g., "0.5" for 0.5L)
 * @param type - The tracker type
 * @returns The integer value to store, or null if invalid
 */
export function parseInputToStored(input: string, type: TrackerType): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) return null;

  return toStoredValue(parsed, type);
}

/**
 * Validates if a stored value is valid for a given tracker type
 * @param storedValue - The stored integer value
 * @param type - The tracker type
 * @returns Whether the value is valid
 */
export function isValidStoredValue(storedValue: number, type: TrackerType): boolean {
  // All values must be integers
  if (!Number.isInteger(storedValue)) return false;

  // Checkbox values must be 0 or 1
  if (type === "checkbox" && storedValue !== 0 && storedValue !== 1) {
    return false;
  }

  // Most values should be non-negative (except for adjustments)
  // But we allow negative values for correction entries

  return true;
}

/**
 * Formats a value for input field display
 * @param storedValue - The stored integer value
 * @param type - The tracker type
 * @returns The formatted string for input field
 */
export function formatForInput(storedValue: number | null, type: TrackerType): string {
  if (storedValue === null) return "";

  const displayValue = toDisplayValue(storedValue, type);
  const decimals = displayDecimals[type];

  if (decimals === 0) {
    return Math.round(displayValue).toString();
  }

  // For input fields, show the actual value without trailing zeros
  const formatted = displayValue.toString();

  // If it's a whole number, show it without decimals
  if (displayValue === Math.floor(displayValue)) {
    return Math.floor(displayValue).toString();
  }

  return formatted;
}

/**
 * Gets the appropriate step value for number inputs
 * @param type - The tracker type
 * @returns The step value for HTML number input
 */
export function getInputStep(type: TrackerType): string {
  const decimals = displayDecimals[type];
  if (decimals === 0) return "1";

  // Create a step value based on decimal places (e.g., 0.001 for 3 decimals)
  return (1 / Math.pow(10, decimals)).toString();
}

/**
 * Rounds a display value to appropriate precision for the tracker type
 * @param displayValue - The display value to round
 * @param type - The tracker type
 * @returns The rounded display value
 */
export function roundDisplayValue(displayValue: number, type: TrackerType): number {
  const decimals = displayDecimals[type];
  if (decimals === 0) return Math.round(displayValue);

  const factor = Math.pow(10, decimals);
  return Math.round(displayValue * factor) / factor;
}
