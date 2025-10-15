// Type-safe custom event utilities

/**
 * Creates a type-safe custom event dispatcher and listener
 * @template T - The type of the event detail
 */
export function createTypedEvent<T>(eventName: string) {
  /**
   * Dispatch a custom event with typed detail
   */
  function dispatch(detail: T): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Listen for the custom event with typed detail
   * @returns Cleanup function to remove the listener
   */
  function listen(callback: (detail: T) => void): () => void {
    const handler = (event: Event) => {
      if (event.type === eventName) {
        const customEvent = event as CustomEvent<T>;
        callback(customEvent.detail);
      }
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }

  /**
   * React hook to listen for the custom event
   * Automatically cleans up on unmount
   */
  function useListener(
    callback: (detail: T) => void,
    deps: React.DependencyList = []
  ): void {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      return listen(callback);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
  }

  return {
    dispatch,
    listen,
    useListener,
    eventName,
  };
}

/**
 * Creates a debounced event dispatcher
 * @template T - The type of the event detail
 */
export function createDebouncedEvent<T>(
  eventName: string,
  debounceMs: number = 1000
) {
  let timeout: NodeJS.Timeout | null = null;
  let pendingDetail: T | null = null;

  const baseEvent = createTypedEvent<T>(eventName);

  function dispatch(detail: T): void {
    pendingDetail = detail;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      if (pendingDetail !== null) {
        baseEvent.dispatch(pendingDetail);
        pendingDetail = null;
      }
      timeout = null;
    }, debounceMs);
  }

  function cancel(): void {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    pendingDetail = null;
  }

  return {
    dispatch,
    cancel,
    listen: baseEvent.listen,
    useListener: baseEvent.useListener,
    eventName,
  };
}

/**
 * Creates a batched event dispatcher that accumulates multiple dispatches
 * @template T - The type of individual event items
 */
export function createBatchedEvent<T>(
  eventName: string,
  batchMs: number = 100
) {
  let timeout: NodeJS.Timeout | null = null;
  const pending: T[] = [];

  const baseEvent = createTypedEvent<T[]>(eventName);

  function dispatch(item: T): void {
    pending.push(item);

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      if (pending.length > 0) {
        baseEvent.dispatch([...pending]);
        pending.length = 0;
      }
      timeout = null;
    }, batchMs);
  }

  function flush(): void {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (pending.length > 0) {
      baseEvent.dispatch([...pending]);
      pending.length = 0;
    }
  }

  function cancel(): void {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    pending.length = 0;
  }

  return {
    dispatch,
    flush,
    cancel,
    listen: baseEvent.listen,
    useListener: baseEvent.useListener,
    eventName,
  };
}

// Import React for the hooks
import * as React from "react";
