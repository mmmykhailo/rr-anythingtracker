import { describe, test, expect, beforeEach } from "bun:test";
import { importData, type ExportData } from ".";
import {
  clearAllData,
  getDB,
  getLastChangeDate,
  getTrackerById,
  setLastChangeDate,
  saveTrackerWithId,
  createEntryWithId,
} from "../db";

// Mock IndexedDB for testing
import "fake-indexeddb/auto";

describe("importData merge functionality", () => {
  beforeEach(async () => {
    // Clear all data before each test
    await clearAllData();
  });

  test("should merge tracker title and goal when clearExisting=false", async () => {
    // Setup: Create existing tracker
    const trackerId = "tracker-1";
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Old Title",
        type: "liters",
        isNumber: true,
        goal: 1000,
      },
      true
    );

    // Import data with same tracker ID but different title and goal
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "New Title",
          type: "liters",
          isNumber: true,
          goal: 2000,
          entries: [],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify tracker was updated with new title and goal
    const tracker = await getTrackerById(trackerId);
    expect(tracker).not.toBeNull();
    expect(tracker?.title).toBe("New Title");
    expect(tracker?.goal).toBe(2000);
    expect(tracker?.type).toBe("liters"); // Should remain unchanged
  });

  test("should keep newer entry based on createdAt", async () => {
    const trackerId = "tracker-1";
    const entryId = "entry-1";
    const olderDate = new Date("2024-01-01T10:00:00Z");
    const newerDate = new Date("2024-01-01T12:00:00Z");

    // Setup: Create tracker and entry
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    // Create existing entry with newer timestamp
    await createEntryWithId(
      entryId,
      trackerId,
      "2024-01-01",
      100,
      newerDate,
      true
    );

    // Import data with same entry ID but older timestamp
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
          entries: [
            {
              id: entryId,
              date: "2024-01-01",
              value: 200,
              createdAt: olderDate.toISOString(),
            },
          ],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify existing entry (newer) was kept
    const db = await getDB();
    const entry = await db.get("entries", entryId);
    expect(entry).not.toBeUndefined();
    expect(entry?.value).toBe(100); // Original value
    expect(entry?.createdAt.getTime()).toBe(newerDate.getTime());
  });

  test("should replace older entry with newer imported entry", async () => {
    const trackerId = "tracker-1";
    const entryId = "entry-1";
    const olderDate = new Date("2024-01-01T10:00:00Z");
    const newerDate = new Date("2024-01-01T12:00:00Z");

    // Setup: Create tracker and entry
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    // Create existing entry with older timestamp
    await createEntryWithId(
      entryId,
      trackerId,
      "2024-01-01",
      100,
      olderDate,
      true
    );

    // Import data with same entry ID but newer timestamp
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
          entries: [
            {
              id: entryId,
              date: "2024-01-01",
              value: 200,
              createdAt: newerDate.toISOString(),
              comment: "Updated comment",
            },
          ],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify entry was updated with newer imported data
    const db = await getDB();
    const entry = await db.get("entries", entryId);
    expect(entry).not.toBeUndefined();
    expect(entry?.value).toBe(200); // New value
    expect(entry?.comment).toBe("Updated comment");
    expect(entry?.createdAt.getTime()).toBe(newerDate.getTime());
  });

  test("should add new entries that don't exist", async () => {
    const trackerId = "tracker-1";

    // Setup: Create tracker
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    // Import data with new entries
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
          entries: [
            {
              id: "new-entry-1",
              date: "2024-01-01",
              value: 100,
              createdAt: new Date().toISOString(),
            },
            {
              id: "new-entry-2",
              date: "2024-01-02",
              value: 200,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify new entries were added
    const db = await getDB();
    const entry1 = await db.get("entries", "new-entry-1");
    const entry2 = await db.get("entries", "new-entry-2");
    expect(entry1).not.toBeUndefined();
    expect(entry2).not.toBeUndefined();
    expect(entry1?.value).toBe(100);
    expect(entry2?.value).toBe(200);
  });

  test("should add new trackers that don't exist", async () => {
    // Import data with new tracker
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: "new-tracker-1",
          title: "New Tracker",
          type: "steps",
          isNumber: true,
          goal: 5000,
          entries: [],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify new tracker was added
    const tracker = await getTrackerById("new-tracker-1");
    expect(tracker).not.toBeNull();
    expect(tracker?.title).toBe("New Tracker");
    expect(tracker?.type).toBe("steps");
    expect(tracker?.goal).toBe(5000);
  });

  test("should use imported lastChangeDate if newer", async () => {
    const olderDate = new Date("2024-01-01T10:00:00Z");
    const newerDate = new Date("2024-01-02T10:00:00Z");

    // Set existing lastChangeDate
    await setLastChangeDate(olderDate);

    // Import data with newer lastChangeDate
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      lastChangeDate: newerDate.toISOString(),
      trackers: [],
      tags: [],
    };

    await importData(importedData, false);

    // Verify lastChangeDate was updated
    const lastChangeDate = await getLastChangeDate();
    expect(lastChangeDate).not.toBeNull();
    expect(lastChangeDate?.getTime()).toBe(newerDate.getTime());
  });

  test("should keep existing lastChangeDate if newer", async () => {
    const olderDate = new Date("2024-01-01T10:00:00Z");
    const newerDate = new Date("2024-01-02T10:00:00Z");

    // Set existing lastChangeDate to newer date
    await setLastChangeDate(newerDate);

    // Import data with older lastChangeDate
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      lastChangeDate: olderDate.toISOString(),
      trackers: [],
      tags: [],
    };

    await importData(importedData, false);

    // Verify lastChangeDate was NOT updated
    const lastChangeDate = await getLastChangeDate();
    expect(lastChangeDate).not.toBeNull();
    expect(lastChangeDate?.getTime()).toBe(newerDate.getTime());
  });

  test("should only import tags for entries that exist", async () => {
    const trackerId = "tracker-1";
    const entryId = "entry-1";

    // Setup: Create tracker and entry
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    await createEntryWithId(
      entryId,
      trackerId,
      "2024-01-01",
      100,
      new Date(),
      true
    );

    // Import data with tags - one for existing entry, one for non-existing entry
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
          entries: [],
        },
      ],
      tags: [
        {
          id: "tag-1",
          entryId: entryId,
          trackerId: trackerId,
          tagName: "work",
          tagNameWithOriginalCasing: "Work",
        },
        {
          id: "tag-2",
          entryId: "non-existing-entry",
          trackerId: trackerId,
          tagName: "personal",
          tagNameWithOriginalCasing: "Personal",
        },
      ],
    };

    await importData(importedData, false);

    // Verify only tag for existing entry was imported
    const db = await getDB();
    const tag1 = await db.get("entry_tags", "tag-1");
    const tag2 = await db.get("entry_tags", "tag-2");
    expect(tag1).not.toBeUndefined();
    expect(tag2).toBeUndefined();
  });

  test("should not duplicate existing tags", async () => {
    const trackerId = "tracker-1";
    const entryId = "entry-1";
    const tagId = "tag-1";

    // Setup: Create tracker, entry, and tag
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    await createEntryWithId(
      entryId,
      trackerId,
      "2024-01-01",
      100,
      new Date(),
      true
    );

    const db = await getDB();
    await db.put("entry_tags", {
      id: tagId,
      entryId: entryId,
      trackerId: trackerId,
      tagName: "work",
      tagNameWithOriginalCasing: "Work",
    });

    // Import data with same tag
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
          entries: [],
        },
      ],
      tags: [
        {
          id: tagId,
          entryId: entryId,
          trackerId: trackerId,
          tagName: "work",
          tagNameWithOriginalCasing: "Work",
        },
      ],
    };

    await importData(importedData, false);

    // Verify tag was not duplicated
    const tags = await db.getAllFromIndex("entry_tags", "by-entry", entryId);
    expect(tags.length).toBe(1);
  });

  test("should clear and replace data when clearExisting=true", async () => {
    // Setup: Create existing tracker and entry
    await saveTrackerWithId(
      {
        id: "existing-tracker",
        title: "Existing Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    // Import completely different data with clearExisting=true
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: "new-tracker",
          title: "New Tracker",
          type: "steps",
          isNumber: true,
          entries: [],
        },
      ],
      tags: [],
    };

    await importData(importedData, true);

    // Verify old data was cleared and new data was imported
    const existingTracker = await getTrackerById("existing-tracker");
    const newTracker = await getTrackerById("new-tracker");
    expect(existingTracker).toBeNull();
    expect(newTracker).not.toBeNull();
  });

  test("should handle complex merge scenario", async () => {
    // Setup: Create multiple trackers and entries
    await saveTrackerWithId(
      {
        id: "tracker-1",
        title: "Old Tracker 1",
        type: "liters",
        isNumber: true,
        goal: 1000,
      },
      true
    );

    await createEntryWithId(
      "entry-1",
      "tracker-1",
      "2024-01-01",
      100,
      new Date("2024-01-01T12:00:00Z"),
      true
    );

    // Import data with:
    // - Updated tracker-1 (title and goal should change)
    // - New tracker-2
    // - Older entry-1 (should be ignored)
    // - New entry-2
    const importedData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      trackers: [
        {
          id: "tracker-1",
          title: "Updated Tracker 1",
          type: "liters",
          isNumber: true,
          goal: 2000,
          entries: [
            {
              id: "entry-1",
              date: "2024-01-01",
              value: 200,
              createdAt: new Date("2024-01-01T10:00:00Z").toISOString(), // Older
            },
            {
              id: "entry-2",
              date: "2024-01-02",
              value: 300,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        {
          id: "tracker-2",
          title: "New Tracker 2",
          type: "steps",
          isNumber: true,
          entries: [],
        },
      ],
      tags: [],
    };

    await importData(importedData, false);

    // Verify results
    const tracker1 = await getTrackerById("tracker-1");
    const tracker2 = await getTrackerById("tracker-2");
    const db = await getDB();
    const entry1 = await db.get("entries", "entry-1");
    const entry2 = await db.get("entries", "entry-2");

    // Tracker 1 should be updated
    expect(tracker1?.title).toBe("Updated Tracker 1");
    expect(tracker1?.goal).toBe(2000);

    // Tracker 2 should be new
    expect(tracker2).not.toBeNull();
    expect(tracker2?.title).toBe("New Tracker 2");

    // Entry 1 should keep original value (newer)
    expect(entry1?.value).toBe(100);

    // Entry 2 should be added
    expect(entry2).not.toBeUndefined();
    expect(entry2?.value).toBe(300);
  });
});
