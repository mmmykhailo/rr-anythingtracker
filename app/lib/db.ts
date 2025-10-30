import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Tracker } from "./trackers";
import { extractHashtagsWithOriginalCasing } from "./tags";

// Database schema definition
interface AnythingTrackerDB extends DBSchema {
  trackers: {
    key: string;
    value: Tracker;
    indexes: { "by-title": string };
  };
  entries: {
    key: string;
    value: {
      id: string;
      trackerId: string;
      date: string;
      value: number;
      comment?: string;
      createdAt: Date;
    };
    indexes: {
      "by-tracker": string;
      "by-date": string;
      "by-tracker-date": [string, string];
    };
  };
  entry_tags: {
    key: string;
    value: {
      id: string;
      entryId: string;
      trackerId: string;
      tagName: string;
      tagNameWithOriginalCasing: string;
    };
    indexes: {
      "by-entry": string;
      "by-tracker": string;
      "by-tracker-tag": [string, string];
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

const DB_NAME = "AnythingTrackerDB";
const DB_VERSION = 6;

let dbInstance: IDBPDatabase<AnythingTrackerDB> | null = null;

// Initialize database
export async function initDB(): Promise<IDBPDatabase<AnythingTrackerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AnythingTrackerDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      // Create trackers store
      if (!db.objectStoreNames.contains("trackers")) {
        const trackersStore = db.createObjectStore("trackers", {
          keyPath: "id",
        });
        trackersStore.createIndex("by-title", "title");
      }

      // Create entries store
      if (!db.objectStoreNames.contains("entries")) {
        const entriesStore = db.createObjectStore("entries", {
          keyPath: "id",
        });
        entriesStore.createIndex("by-tracker", "trackerId");
        entriesStore.createIndex("by-date", "date");
        entriesStore.createIndex("by-tracker-date", ["trackerId", "date"]);
      }

      // Create metadata store
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", {
          keyPath: "key",
        });
      }

      // Create entry_tags store
      if (!db.objectStoreNames.contains("entry_tags")) {
        const entryTagsStore = db.createObjectStore("entry_tags", {
          keyPath: "id",
        });
        entryTagsStore.createIndex("by-entry", "entryId");
        entryTagsStore.createIndex("by-tracker", "trackerId");
        entryTagsStore.createIndex("by-tracker-tag", ["trackerId", "tagName"]);
      }

      // Migration: Update "none" type tracker values to use new conversion factor (v6)
      if (oldVersion < 6) {
        console.log('Starting migration for "none" type trackers to v6...');

        const trackersStore = transaction.objectStore("trackers");
        const entriesStore = transaction.objectStore("entries");

        // Get all trackers
        const trackers = await trackersStore.getAll();

        // Filter for "none" type trackers
        const noneTrackers = trackers.filter((t) => t.type === "none");

        if (noneTrackers.length > 0) {
          console.log(
            `Migrating ${noneTrackers.length} "none" type tracker(s)...`
          );

          // For each "none" tracker, update entries and goals
          for (const tracker of noneTrackers) {
            // Update entries
            const entries = await entriesStore
              .index("by-tracker")
              .getAll(tracker.id);

            console.log(
              `Migrating ${entries.length} entries for tracker "${tracker.title}"`
            );

            // Multiply each entry value by 1000
            for (const entry of entries) {
              const updatedEntry = {
                ...entry,
                value: entry.value * 1000,
              };
              await entriesStore.put(updatedEntry);
            }

            // Update tracker goal if it exists
            if (tracker.goal !== undefined && tracker.goal > 0) {
              const updatedTracker = {
                ...tracker,
                goal: tracker.goal * 1000,
              };
              await trackersStore.put(updatedTracker);
              console.log(
                `Updated goal for tracker "${tracker.title}": ${tracker.goal} -> ${updatedTracker.goal}`
              );
            }
          }

          console.log('Migration complete for "none" type trackers');
        } else {
          console.log('No "none" type trackers found, skipping migration');
        }
      }
    },
    blocked(currentVersion, blockedVersion, event) {
      // Handle version conflicts if needed
      console.warn("Database upgrade blocked", {
        currentVersion,
        blockedVersion,
      });
    },
    blocking(currentVersion, blockedVersion, event) {
      // Close database if it's blocking an upgrade
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    },
  });

  return dbInstance;
}

// Get database instance
export async function getDB(): Promise<IDBPDatabase<AnythingTrackerDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Metadata operations
export async function getLastChangeDate(): Promise<Date | null> {
  const db = await getDB();
  const metadata = await db.get("metadata", "lastChangeDate");
  return metadata ? new Date(metadata.value) : null;
}

export async function setLastChangeDate(date?: Date): Promise<void> {
  const db = await getDB();
  const dateToSet = date || new Date();
  await db.put("metadata", {
    key: "lastChangeDate",
    value: dateToSet.toISOString(),
  });
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const db = await getDB();
  const metadata = await db.get("metadata", "onboardingCompleted");
  return metadata ? metadata.value : false;
}

export async function setOnboardingCompleted(
  completed: boolean
): Promise<void> {
  const db = await getDB();
  await db.put("metadata", {
    key: "onboardingCompleted",
    value: completed,
  });
}

// Tracker operations
export async function saveTracker(
  tracker: Omit<Tracker, "id" | "values">
): Promise<Tracker> {
  const db = await getDB();
  const id = generateId();

  const newTracker: Tracker = {
    ...tracker,
    id,
    values: {},
  };

  await db.put("trackers", newTracker);
  await setLastChangeDate();
  return newTracker;
}

// Save tracker with specific ID (used for data import)
export async function saveTrackerWithId(
  tracker: Omit<Tracker, "values">,
  skipDateUpdate = false
): Promise<Tracker> {
  const db = await getDB();

  const newTracker: Tracker = {
    ...tracker,
    values: {},
  };

  await db.put("trackers", newTracker);
  if (!skipDateUpdate) {
    await setLastChangeDate();
  }
  return newTracker;
}

export async function updateTracker(
  tracker: Tracker,
  skipDateUpdate = false
): Promise<Tracker> {
  const db = await getDB();
  await db.put("trackers", tracker);
  if (!skipDateUpdate) {
    await setLastChangeDate();
  }
  return tracker;
}

export async function getAllTrackers(): Promise<Tracker[]> {
  const db = await getDB();
  const trackers = await db.getAll("trackers");

  // Populate values from entries
  for (const tracker of trackers) {
    const entries = await db.getAllFromIndex(
      "entries",
      "by-tracker",
      tracker.id
    );
    tracker.values = {};

    for (const entry of entries) {
      tracker.values[entry.date] =
        (tracker.values[entry.date] || 0) + entry.value;
    }
  }

  return trackers;
}

export async function getTrackerById(id: string): Promise<Tracker | null> {
  const db = await getDB();
  const tracker = await db.get("trackers", id);

  if (!tracker) {
    return null;
  }

  // Populate values from entries
  const entries = await db.getAllFromIndex("entries", "by-tracker", id);
  tracker.values = {};

  for (const entry of entries) {
    tracker.values[entry.date] =
      (tracker.values[entry.date] || 0) + entry.value;
  }

  return tracker;
}

export async function deleteTracker(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["trackers", "entries", "entry_tags"], "readwrite");

  // Delete tracker
  await tx.objectStore("trackers").delete(id);

  // Delete all entries for this tracker
  const entries = await tx
    .objectStore("entries")
    .index("by-tracker")
    .getAllKeys(id);
  for (const entryKey of entries) {
    await tx.objectStore("entries").delete(entryKey);
  }

  const tags = await tx
    .objectStore("entry_tags")
    .index("by-tracker")
    .getAllKeys(id);
  for (const tagKey of tags) {
    await tx.objectStore("entry_tags").delete(tagKey);
  }

  await tx.done;
  await setLastChangeDate();
}

// Get total value for a date by summing all entries
export async function getTotalValueForDate(
  trackerId: string,
  date: string
): Promise<number> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-tracker", trackerId);

  return entries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + entry.value, 0);
}

// Entry operations
export async function saveEntry(
  trackerId: string,
  date: string,
  value: number,
  updateParent: boolean = true,
  skipDateUpdate: boolean = false,
  comment?: string
): Promise<void> {
  const db = await getDB();

  // Get current total for this date
  const currentTotal = await getTotalValueForDate(trackerId, date);

  // Delete all existing entries for this date
  const existingEntries = await db.getAllFromIndex(
    "entries",
    "by-tracker-date",
    [trackerId, date]
  );

  for (const entry of existingEntries) {
    await db.delete("entries", entry.id);
    await deleteEntryTags(entry.id);
    if (!skipDateUpdate) {
      await setLastChangeDate();
    }
  }

  // Create new entry with the specified value (if > 0)
  if (value > 0) {
    const entryId = generateId();
    const entry = {
      id: entryId,
      trackerId,
      date,
      value,
      comment,
      createdAt: new Date(),
    };
    await db.put("entries", entry);
    await saveEntryTags(entryId, trackerId, comment);
    if (!skipDateUpdate) {
      await setLastChangeDate();
    }
  }

  if (!skipDateUpdate) {
    await setLastChangeDate();
  }

  // Update parent tracker if one exists and there's a value change
  if (updateParent) {
    const valueDifference = value - currentTotal;
    if (valueDifference !== 0) {
      const tracker = await getTrackerById(trackerId);
      if (tracker?.parentId) {
        const parentCurrentTotal = await getTotalValueForDate(
          tracker.parentId,
          date
        );
        await saveEntry(
          tracker.parentId,
          date,
          parentCurrentTotal + valueDifference,
          false,
          skipDateUpdate,
          comment
        );
      }
    }
  }
}

export async function getEntry(
  trackerId: string,
  date: string
): Promise<number> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-tracker-date", [
    trackerId,
    date,
  ]);
  return entries.reduce((sum, entry) => sum + entry.value, 0);
}

export async function addToEntry(
  trackerId: string,
  date: string,
  valueToAdd: number,
  comment?: string
): Promise<number> {
  const currentValue = await getEntry(trackerId, date);
  const newValue = currentValue + valueToAdd;
  await saveEntry(trackerId, date, newValue, true, false, comment);

  // Also add to parent tracker if one exists
  const tracker = await getTrackerById(trackerId);
  if (tracker?.parentId) {
    // Use saveEntry directly with updateParent=false to prevent infinite recursion
    const parentCurrentValue = await getEntry(tracker.parentId, date);
    const parentNewValue = parentCurrentValue + valueToAdd;
    await saveEntry(
      tracker.parentId,
      date,
      parentNewValue,
      false,
      false,
      comment
    );
  }

  return newValue;
}

export async function deleteEntry(
  trackerId: string,
  date: string
): Promise<void> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-tracker-date", [
    trackerId,
    date,
  ]);

  for (const entry of entries) {
    await db.delete("entries", entry.id);
    await deleteEntryTags(entry.id);
  }
}

// Get entry history for a tracker
export async function getEntryHistory(
  trackerId: string,
  limit?: number
): Promise<
  Array<{
    id: string;
    trackerId: string;
    date: string;
    value: number;
    comment?: string;
    createdAt: Date;
  }>
> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("entries", "by-tracker", trackerId);

  // Sort by createdAt descending (most recent first)
  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return limit ? entries.slice(0, limit) : entries;
}

// Create individual entry (for tracking separate additions)
export async function createEntry(
  trackerId: string,
  date: string,
  value: number,
  ignoreParent: boolean = false,
  skipDateUpdate: boolean = false,
  comment?: string
): Promise<void> {
  const db = await getDB();

  const entryId = generateId();
  const entry = {
    id: entryId,
    trackerId,
    date,
    value,
    comment,
    createdAt: new Date(),
  };

  await db.put("entries", entry);
  await saveEntryTags(entryId, trackerId, comment);
  if (!skipDateUpdate) {
    await setLastChangeDate();
  }

  // Update parent tracker if one exists
  if (!ignoreParent) {
    const tracker = await getTrackerById(trackerId);
    if (tracker?.parentId) {
      await createEntry(tracker.parentId, date, value, false, true, comment);
    }
  }
}

// Create entry with specific ID (used for data import)
export async function createEntryWithId(
  entryId: string,
  trackerId: string,
  date: string,
  value: number,
  createdAt: Date,
  skipDateUpdate: boolean = false,
  comment?: string
): Promise<void> {
  const db = await getDB();

  const entry = {
    id: entryId,
    trackerId,
    date,
    value,
    comment,
    createdAt,
  };

  await db.put("entries", entry);
  if (!skipDateUpdate) {
    await setLastChangeDate();
  }
}

// Delete entry by ID (for history management)
export async function deleteEntryById(entryId: string): Promise<void> {
  const db = await getDB();
  await db.delete("entries", entryId);
  await deleteEntryTags(entryId);
  await setLastChangeDate();
}

// Utility to clear all data (useful for development/testing)
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["trackers", "entries", "entry_tags"], "readwrite");

  await tx.objectStore("trackers").clear();
  await tx.objectStore("entries").clear();
  await tx.objectStore("entry_tags").clear();

  await tx.done;
  await setLastChangeDate();
}

// Seed initial data for development
export async function seedInitialData(): Promise<void> {
  const trackers = await getAllTrackers();

  // Only seed if no trackers exist
  if (trackers.length === 0) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    // Create sample trackers
    const alcoholTracker = await saveTracker({
      title: "Alcohol",
      type: "liters",
      isNumber: true,
    });

    const energyDrinksTracker = await saveTracker({
      title: "Energy drinks",
      type: "liters",
      isNumber: true,
    });

    const coffeeTracker = await saveTracker({
      title: "Coffee",
      type: "liters",
      isNumber: true,
    });

    const stepsTracker = await saveTracker({
      title: "Steps",
      type: "steps",
      isNumber: true,
      goal: 6000,
    });

    // Create child trackers with parent relationships
    const beerTracker = await saveTracker({
      title: "Beer",
      type: "liters",
      isNumber: true,
      parentId: alcoholTracker.id,
    });

    const wineTracker = await saveTracker({
      title: "Wine",
      type: "liters",
      isNumber: true,
      parentId: alcoholTracker.id,
    });

    const espressoTracker = await saveTracker({
      title: "Espresso",
      type: "liters",
      isNumber: true,
      parentId: coffeeTracker.id,
    });

    // Add some sample entries (stored as integers - milliliters for liters)
    await saveEntry(energyDrinksTracker.id, formatDate(yesterday), 1000); // 1L = 1000ml
    await saveEntry(energyDrinksTracker.id, formatDate(today), 200); // 0.2L = 200ml

    await saveEntry(stepsTracker.id, formatDate(yesterday), 14432);
    await saveEntry(stepsTracker.id, formatDate(today), 2312);

    // Add entries to child trackers (these will automatically update parent trackers)
    await saveEntry(beerTracker.id, formatDate(yesterday), 500, false); // 0.5L = 500ml, false to prevent double counting during seeding
    await saveEntry(beerTracker.id, formatDate(today), 330, false); // 0.33L = 330ml

    await saveEntry(wineTracker.id, formatDate(yesterday), 150, false); // 0.15L = 150ml
    await saveEntry(wineTracker.id, formatDate(today), 100, false); // 0.1L = 100ml

    await saveEntry(espressoTracker.id, formatDate(yesterday), 60, false); // 0.06L = 60ml
    await saveEntry(espressoTracker.id, formatDate(today), 30, false); // 0.03L = 30ml

    // Manually set parent tracker totals to match child totals
    await saveEntry(alcoholTracker.id, formatDate(yesterday), 650, false); // 500ml + 150ml = 650ml
    await saveEntry(alcoholTracker.id, formatDate(today), 430, false); // 330ml + 100ml = 430ml

    await saveEntry(coffeeTracker.id, formatDate(yesterday), 60, false); // 60ml from espresso
    await saveEntry(coffeeTracker.id, formatDate(today), 30, false); // 30ml from espresso
  }
}

export async function saveEntryTags(
  entryId: string,
  trackerId: string,
  comment?: string
): Promise<void> {
  if (!comment) return;

  const db = await getDB();
  const tags = extractHashtagsWithOriginalCasing(comment);

  const existingTags = await db.getAllFromIndex(
    "entry_tags",
    "by-entry",
    entryId
  );
  for (const tag of existingTags) {
    await db.delete("entry_tags", tag.id);
  }

  const allTrackerTags = await db.getAllFromIndex(
    "entry_tags",
    "by-tracker",
    trackerId
  );

  for (const { lowercase, original } of tags) {
    const existingTag = allTrackerTags.find(
      (t) => t.tagName === lowercase
    );

    await db.put("entry_tags", {
      id: generateId(),
      entryId,
      trackerId,
      tagName: lowercase,
      tagNameWithOriginalCasing: existingTag
        ? existingTag.tagNameWithOriginalCasing
        : original,
    });
  }
}

export async function deleteEntryTags(entryId: string): Promise<void> {
  const db = await getDB();
  const tags = await db.getAllFromIndex("entry_tags", "by-entry", entryId);

  for (const tag of tags) {
    await db.delete("entry_tags", tag.id);
  }
}

export async function getMostUsedTags(
  trackerId: string,
  limit: number = 5
): Promise<string[]> {
  const db = await getDB();
  const allTags = await db.getAllFromIndex(
    "entry_tags",
    "by-tracker",
    trackerId
  );

  const tagCounts = new Map<string, { count: number; displayName: string }>();
  for (const tag of allTags) {
    const existing = tagCounts.get(tag.tagName);
    if (existing) {
      existing.count++;
    } else {
      tagCounts.set(tag.tagName, {
        count: 1,
        displayName: tag.tagNameWithOriginalCasing || tag.tagName,
      });
    }
  }

  return Array.from(tagCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => item.displayName);
}

export async function getEntryTags(entryId: string): Promise<string[]> {
  const db = await getDB();
  const tags = await db.getAllFromIndex("entry_tags", "by-entry", entryId);
  return tags.map((tag) => tag.tagName);
}
