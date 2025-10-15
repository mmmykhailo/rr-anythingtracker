import { createTypedEvent, createBatchedEvent } from "./typed-events";

// Types for data change events
export type DataChangeType =
  | "tracker_created"
  | "tracker_updated"
  | "tracker_deleted"
  | "entry_added"
  | "entry_updated"
  | "entry_deleted"
  | "data_imported";

export interface DataChangeEvent {
  type: DataChangeType;
  timestamp: Date;
  details?: {
    trackerId?: string;
    date?: string;
    value?: number;
  };
}

export interface DebouncedChangeEvent {
  types: DataChangeType[];
  timestamp: Date;
}

// Create typed events
const dataChangeEvent = createTypedEvent<DataChangeEvent>(
  "anythingtracker:datachange"
);

const debouncedChangeEvent = createTypedEvent<DebouncedChangeEvent>(
  "anythingtracker:datachange:debounced"
);

// Create a batched event for collecting changes
const batchedChanges = createBatchedEvent<DataChangeType>(
  "anythingtracker:datachange:batch",
  2000 // 2 second debounce
);

// Track pending changes for debounced dispatch
let pendingChanges = new Set<DataChangeType>();
let debounceTimeout: NodeJS.Timeout | null = null;

// Dispatch a data change event
export function dispatchDataChange(
  type: DataChangeType,
  details?: DataChangeEvent["details"]
): void {
  const event: DataChangeEvent = {
    type,
    timestamp: new Date(),
    details,
  };

  // Dispatch immediately for UI updates
  dataChangeEvent.dispatch(event);

  // Add to pending changes for debounced sync
  pendingChanges.add(type);

  // Clear existing timeout
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  // Set new timeout for debounced event
  debounceTimeout = setTimeout(() => {
    if (pendingChanges.size > 0) {
      const debouncedEvent: DebouncedChangeEvent = {
        types: Array.from(pendingChanges),
        timestamp: new Date(),
      };
      debouncedChangeEvent.dispatch(debouncedEvent);
      pendingChanges.clear();
    }
    debounceTimeout = null;
  }, 2000);
}

// Export typed event names for direct use if needed
export const DATA_CHANGE_EVENT = dataChangeEvent.eventName;
export const DATA_CHANGE_DEBOUNCED_EVENT = debouncedChangeEvent.eventName;

// Export typed listeners
export const useDataChangeListener = dataChangeEvent.useListener;
export const useDebouncedDataChangeListener = debouncedChangeEvent.useListener;

// Interface for debounced dispatcher
export interface DebouncedDispatcher {
  dispatch: (
    type: DataChangeType,
    details?: DataChangeEvent["details"]
  ) => void;
  cleanup: () => void;
}

// Create a debounced dispatcher for backward compatibility
function createDebouncedDispatcher(debounceMs = 2000): DebouncedDispatcher {
  let timeout: NodeJS.Timeout | null = null;
  const localPendingChanges = new Set<DataChangeType>();

  const dispatch = (
    type: DataChangeType,
    details?: DataChangeEvent["details"]
  ): void => {
    // Dispatch immediate event
    const event: DataChangeEvent = {
      type,
      timestamp: new Date(),
      details,
    };
    dataChangeEvent.dispatch(event);

    // Add to pending changes
    localPendingChanges.add(type);

    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Set new timeout
    timeout = setTimeout(() => {
      if (localPendingChanges.size > 0) {
        const debouncedEvent: DebouncedChangeEvent = {
          types: Array.from(localPendingChanges),
          timestamp: new Date(),
        };
        debouncedChangeEvent.dispatch(debouncedEvent);
        localPendingChanges.clear();
      }
      timeout = null;
    }, debounceMs);
  };

  const cleanup = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    localPendingChanges.clear();
  };

  return { dispatch, cleanup };
}

// Global instance for debounced changes (2 second debounce)
export const debouncedDataChange: DebouncedDispatcher =
  createDebouncedDispatcher(2000);
