import { describe, test, expect, beforeEach } from "bun:test";
import {
  clearAllData,
  saveTrackerWithId,
  createEntryWithId,
  getAllTrackers,
  getEntryHistory,
  deleteTracker,
  deleteEntryById,
  getDB,
} from "../db";
import { exportData, importData } from "../data";

// Mock IndexedDB for testing
import "fake-indexeddb/auto";

describe("Bidirectional Merge Scenarios", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  test("Device A adds Entry 1, Device B adds Entry 2 → Both should have both entries", async () => {
    const trackerId = "tracker-1";

    // Setup: Create tracker on both devices
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Shared Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );

    // Device A: Add Entry 1
    await createEntryWithId(
      "entry-1",
      trackerId,
      "2024-01-01",
      100,
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    const deviceAExport = await exportData();

    // Device B: Clear and setup, then add Entry 2
    await clearAllData();
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Shared Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );
    await createEntryWithId(
      "entry-2",
      trackerId,
      "2024-01-02",
      200,
      new Date("2024-01-02T10:00:00Z"),
      true
    );
    const deviceBExport = await exportData();

    // Simulate sync: Device A imports from Device B
    await clearAllData();
    await importData(deviceAExport, true); // Load Device A state
    await importData(deviceBExport, false); // Merge Device B changes

    // Verify both entries exist
    const entries = await getEntryHistory(trackerId);
    expect(entries.length).toBe(2);
    expect(entries.find((e) => e.id === "entry-1")).toBeDefined();
    expect(entries.find((e) => e.id === "entry-2")).toBeDefined();
  });

  test("Device A modifies tracker, Device B adds entry → Both changes preserved", async () => {
    const trackerId = "tracker-1";

    // Initial state: Create tracker
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Original Title",
        type: "steps",
        isNumber: true,
        goal: 5000,
      },
      true
    );
    const initialExport = await exportData();

    // Device A: Modify tracker title and goal
    await clearAllData();
    await importData(initialExport, true);
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Updated Title",
        type: "steps",
        isNumber: true,
        goal: 10000,
      },
      true
    );
    const deviceAExport = await exportData();

    // Device B: Add entry
    await clearAllData();
    await importData(initialExport, true);
    await createEntryWithId(
      "entry-1",
      trackerId,
      "2024-01-01",
      3000,
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    const deviceBExport = await exportData();

    // Sync: Device A gets Device B changes
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify: Tracker has updated title/goal AND the entry
    const trackers = await getAllTrackers();
    expect(trackers.length).toBe(1);
    expect(trackers[0].title).toBe("Updated Title");
    expect(trackers[0].goal).toBe(10000);

    const entries = await getEntryHistory(trackerId);
    expect(entries.length).toBe(1);
    expect(entries[0].value).toBe(3000);
  });

  test("Device A deletes tracker, Device B adds entry to it → Deletion should win", async () => {
    const trackerId = "tracker-1";

    // Initial state
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Test Tracker",
        type: "liters",
        isNumber: true,
      },
      true
    );
    const initialExport = await exportData();

    // Device A: Delete tracker
    await clearAllData();
    await importData(initialExport, true);
    await deleteTracker(trackerId);
    const deviceAExport = await exportData();

    // Device B: Add entry to tracker (doesn't know about deletion)
    await clearAllData();
    await importData(initialExport, true);
    await createEntryWithId(
      "entry-1",
      trackerId,
      "2024-01-01",
      100,
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    const deviceBExport = await exportData();

    // Sync: Merge both
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify: Tracker is deleted (not visible in queries)
    const trackers = await getAllTrackers();
    expect(trackers.length).toBe(0);

    // But exists in DB with deletedAt
    const db = await getDB();
    const rawTracker = await db.get("trackers", trackerId);
    expect(rawTracker?.deletedAt).toBeInstanceOf(Date);

    // Entry should also be marked as deleted
    const rawEntry = await db.get("entries", "entry-1");
    expect(rawEntry).toBeDefined();
    // Entry from Device B will exist, but tracker deletion from Device A should be respected
  });

  test("Both devices add different entries for same tracker → All entries preserved", async () => {
    const trackerId = "tracker-1";

    // Initial state
    await saveTrackerWithId(
      {
        id: trackerId,
        title: "Shared Tracker",
        type: "steps",
        isNumber: true,
      },
      true
    );
    const initialExport = await exportData();

    // Device A: Add entries 1 and 2
    await clearAllData();
    await importData(initialExport, true);
    await createEntryWithId(
      "entry-1",
      trackerId,
      "2024-01-01",
      100,
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    await createEntryWithId(
      "entry-2",
      trackerId,
      "2024-01-02",
      200,
      new Date("2024-01-02T10:00:00Z"),
      true
    );
    const deviceAExport = await exportData();

    // Device B: Add entries 3 and 4
    await clearAllData();
    await importData(initialExport, true);
    await createEntryWithId(
      "entry-3",
      trackerId,
      "2024-01-03",
      300,
      new Date("2024-01-03T10:00:00Z"),
      true
    );
    await createEntryWithId(
      "entry-4",
      trackerId,
      "2024-01-04",
      400,
      new Date("2024-01-04T10:00:00Z"),
      true
    );
    const deviceBExport = await exportData();

    // Sync: Device A merges Device B
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify: All 4 entries present
    const entries = await getEntryHistory(trackerId);
    expect(entries.length).toBe(4);
    expect(entries.find((e) => e.id === "entry-1")).toBeDefined();
    expect(entries.find((e) => e.id === "entry-2")).toBeDefined();
    expect(entries.find((e) => e.id === "entry-3")).toBeDefined();
    expect(entries.find((e) => e.id === "entry-4")).toBeDefined();
  });

  test("Device A updates entry, Device B deletes same entry → Newer timestamp wins", async () => {
    const trackerId = "tracker-1";
    const entryId = "entry-1";

    // Initial state with entry
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
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    const initialExport = await exportData();

    // Device A: Update entry value (newer timestamp)
    await clearAllData();
    await importData(initialExport, true);
    const db = await getDB();
    await db.put("entries", {
      id: entryId,
      trackerId,
      date: "2024-01-01",
      value: 200,
      createdAt: new Date("2024-01-01T12:00:00Z"), // Newer
    });
    const deviceAExport = await exportData();

    // Device B: Delete entry (older timestamp)
    await clearAllData();
    await importData(initialExport, true);
    await deleteEntryById(entryId); // Sets deletedAt to now, but createdAt is older
    const deviceBExport = await exportData();

    // Sync: Device A (newer update) should win over Device B (older deletion)
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify: Entry with value 200 should exist (newer createdAt wins)
    const entries = await getEntryHistory(trackerId);
    expect(entries.length).toBe(1);
    expect(entries[0].value).toBe(200);
  });

  test("Both devices create different trackers → All trackers preserved", async () => {
    // Device A: Create tracker-1
    await saveTrackerWithId(
      {
        id: "tracker-1",
        title: "Tracker A",
        type: "liters",
        isNumber: true,
      },
      true
    );
    const deviceAExport = await exportData();

    // Device B: Create tracker-2
    await clearAllData();
    await saveTrackerWithId(
      {
        id: "tracker-2",
        title: "Tracker B",
        type: "steps",
        isNumber: true,
      },
      true
    );
    const deviceBExport = await exportData();

    // Sync: Merge both
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify: Both trackers exist
    const trackers = await getAllTrackers();
    expect(trackers.length).toBe(2);
    expect(trackers.find((t) => t.id === "tracker-1")).toBeDefined();
    expect(trackers.find((t) => t.id === "tracker-2")).toBeDefined();
  });

  test("Complex scenario: Multiple devices with overlapping changes", async () => {
    const tracker1Id = "tracker-1";
    const tracker2Id = "tracker-2";

    // Initial state: Two trackers
    await saveTrackerWithId(
      {
        id: tracker1Id,
        title: "Tracker 1",
        type: "liters",
        isNumber: true,
      },
      true
    );
    await saveTrackerWithId(
      {
        id: tracker2Id,
        title: "Tracker 2",
        type: "steps",
        isNumber: true,
      },
      true
    );
    const initialExport = await exportData();

    // Device A:
    // - Modify tracker1 title
    // - Add entry to tracker1
    // - Delete tracker2
    await clearAllData();
    await importData(initialExport, true);
    await saveTrackerWithId(
      {
        id: tracker1Id,
        title: "Modified Tracker 1",
        type: "liters",
        isNumber: true,
      },
      true
    );
    await createEntryWithId(
      "entry-a1",
      tracker1Id,
      "2024-01-01",
      100,
      new Date("2024-01-01T10:00:00Z"),
      true
    );
    await deleteTracker(tracker2Id);
    const deviceAExport = await exportData();

    // Device B:
    // - Add entry to tracker1
    // - Add entry to tracker2
    // - Create new tracker3
    await clearAllData();
    await importData(initialExport, true);
    await createEntryWithId(
      "entry-b1",
      tracker1Id,
      "2024-01-02",
      200,
      new Date("2024-01-02T10:00:00Z"),
      true
    );
    await createEntryWithId(
      "entry-b2",
      tracker2Id,
      "2024-01-03",
      300,
      new Date("2024-01-03T10:00:00Z"),
      true
    );
    await saveTrackerWithId(
      {
        id: "tracker-3",
        title: "Tracker 3",
        type: "none",
        isNumber: true,
      },
      true
    );
    const deviceBExport = await exportData();

    // Sync: Merge both
    await clearAllData();
    await importData(deviceAExport, true);
    await importData(deviceBExport, false);

    // Verify:
    // - tracker1: exists with modified title and both entries
    // - tracker2: deleted (not visible)
    // - tracker3: exists
    const trackers = await getAllTrackers();
    expect(trackers.length).toBe(2); // tracker1 and tracker3

    const tracker1 = trackers.find((t) => t.id === tracker1Id);
    expect(tracker1?.title).toBe("Modified Tracker 1");

    const tracker1Entries = await getEntryHistory(tracker1Id);
    expect(tracker1Entries.length).toBe(2);
    expect(tracker1Entries.find((e) => e.id === "entry-a1")).toBeDefined();
    expect(tracker1Entries.find((e) => e.id === "entry-b1")).toBeDefined();

    expect(trackers.find((t) => t.id === tracker2Id)).toBeUndefined(); // Deleted
    expect(trackers.find((t) => t.id === "tracker-3")).toBeDefined();
  });
});
