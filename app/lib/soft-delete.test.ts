import { describe, test, expect, beforeEach } from "bun:test";
import {
  clearAllData,
  getAllTrackers,
  getTrackerById,
  deleteTracker,
  saveTrackerWithId,
  createEntryWithId,
  getEntryHistory,
  deleteEntry,
  deleteEntryById,
  getEntry,
  getDB,
} from "./db";
import { exportData, importData, type ExportData } from "./data";

// Mock IndexedDB for testing
import "fake-indexeddb/auto";

describe("Soft delete functionality", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  describe("Tracker soft delete", () => {
    test("deleteTracker should set deletedAt instead of removing", async () => {
      // Create a tracker
      const trackerId = "tracker-1";
      await saveTrackerWithId(
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Delete the tracker
      await deleteTracker(trackerId);

      // Verify tracker is not returned by getTrackerById
      const tracker = await getTrackerById(trackerId);
      expect(tracker).toBeNull();

      // Verify tracker is not in getAllTrackers
      const allTrackers = await getAllTrackers();
      expect(allTrackers.length).toBe(0);

      // Verify tracker still exists in DB with deletedAt
      const db = await getDB();
      const rawTracker = await db.get("trackers", trackerId);
      expect(rawTracker).not.toBeUndefined();
      expect(rawTracker?.deletedAt).toBeInstanceOf(Date);
    });

    test("deleteTracker should soft delete all entries", async () => {
      const trackerId = "tracker-1";
      await saveTrackerWithId(
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Add entries
      await createEntryWithId(
        "entry-1",
        trackerId,
        "2024-01-01",
        100,
        new Date(),
        true
      );
      await createEntryWithId(
        "entry-2",
        trackerId,
        "2024-01-02",
        200,
        new Date(),
        true
      );

      // Delete the tracker
      await deleteTracker(trackerId);

      // Verify entries are not returned
      const history = await getEntryHistory(trackerId);
      expect(history.length).toBe(0);

      // Verify entries still exist in DB with deletedAt
      const db = await getDB();
      const rawEntry1 = await db.get("entries", "entry-1");
      const rawEntry2 = await db.get("entries", "entry-2");
      expect(rawEntry1?.deletedAt).toBeInstanceOf(Date);
      expect(rawEntry2?.deletedAt).toBeInstanceOf(Date);
    });

    test("deleted tracker should not appear in getAllTrackers", async () => {
      // Create two trackers
      await saveTrackerWithId(
        {
          id: "tracker-1",
          title: "Tracker 1",
          type: "liters",
          isNumber: true,
        },
        true
      );
      await saveTrackerWithId(
        {
          id: "tracker-2",
          title: "Tracker 2",
          type: "steps",
          isNumber: true,
        },
        true
      );

      // Delete one tracker
      await deleteTracker("tracker-1");

      // Verify only one tracker is returned
      const trackers = await getAllTrackers();
      expect(trackers.length).toBe(1);
      expect(trackers[0].id).toBe("tracker-2");
    });
  });

  describe("Entry soft delete", () => {
    test("deleteEntry should set deletedAt on entries", async () => {
      const trackerId = "tracker-1";
      await saveTrackerWithId(
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Add entry
      await createEntryWithId(
        "entry-1",
        trackerId,
        "2024-01-01",
        100,
        new Date(),
        true
      );

      // Delete the entry
      await deleteEntry(trackerId, "2024-01-01");

      // Verify entry is not returned
      const value = await getEntry(trackerId, "2024-01-01");
      expect(value).toBe(0);

      // Verify entry still exists in DB with deletedAt
      const db = await getDB();
      const rawEntry = await db.get("entries", "entry-1");
      expect(rawEntry?.deletedAt).toBeInstanceOf(Date);
    });

    test("deleteEntryById should set deletedAt", async () => {
      const trackerId = "tracker-1";
      const entryId = "entry-1";

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

      // Delete by ID
      await deleteEntryById(entryId);

      // Verify entry is not in history
      const history = await getEntryHistory(trackerId);
      expect(history.length).toBe(0);

      // Verify entry still exists with deletedAt
      const db = await getDB();
      const rawEntry = await db.get("entries", entryId);
      expect(rawEntry?.deletedAt).toBeInstanceOf(Date);
    });

    test("deleted entries should not contribute to tracker values", async () => {
      const trackerId = "tracker-1";

      await saveTrackerWithId(
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Add entries
      await createEntryWithId(
        "entry-1",
        trackerId,
        "2024-01-01",
        100,
        new Date(),
        true
      );
      await createEntryWithId(
        "entry-2",
        trackerId,
        "2024-01-01",
        50,
        new Date(),
        true
      );

      // Verify total is 150
      const totalBefore = await getEntry(trackerId, "2024-01-01");
      expect(totalBefore).toBe(150);

      // Delete one entry
      await deleteEntryById("entry-1");

      // Verify total is now 50
      const totalAfter = await getEntry(trackerId, "2024-01-01");
      expect(totalAfter).toBe(50);
    });
  });

  describe("Export with deleted items", () => {
    test("exportData should include deleted trackers", async () => {
      const trackerId = "tracker-1";
      await saveTrackerWithId(
        {
          id: trackerId,
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Delete the tracker
      await deleteTracker(trackerId);

      // Export data
      const exported = await exportData();

      // Verify deleted tracker is in export
      expect(exported.trackers.length).toBe(1);
      expect(exported.trackers[0].id).toBe(trackerId);
      expect(exported.trackers[0].deletedAt).toBeDefined();
    });

    test("exportData should include deleted entries", async () => {
      const trackerId = "tracker-1";
      const entryId = "entry-1";

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

      // Delete the entry
      await deleteEntryById(entryId);

      // Export data
      const exported = await exportData();

      // Verify deleted entry is in export
      const exportedTracker = exported.trackers.find((t) => t.id === trackerId);
      expect(exportedTracker?.entries.length).toBe(1);
      expect(exportedTracker?.entries[0].deletedAt).toBeDefined();
    });
  });

  describe("Import with deleted items", () => {
    test("importData with clearExisting should respect deletedAt", async () => {
      const importData_: ExportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        trackers: [
          {
            id: "tracker-1",
            title: "Deleted Tracker",
            type: "liters",
            isNumber: true,
            deletedAt: new Date().toISOString(),
            entries: [],
          },
        ],
        tags: [],
      };

      await importData(importData_, true);

      // Verify tracker is not returned by queries
      const tracker = await getTrackerById("tracker-1");
      expect(tracker).toBeNull();

      // Verify tracker exists in DB with deletedAt
      const db = await getDB();
      const rawTracker = await db.get("trackers", "tracker-1");
      expect(rawTracker?.deletedAt).toBeInstanceOf(Date);
    });

    test("merge import should apply remote deletedAt", async () => {
      // Create local tracker
      await saveTrackerWithId(
        {
          id: "tracker-1",
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );

      // Import with deletedAt
      const importData_: ExportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        trackers: [
          {
            id: "tracker-1",
            title: "Test Tracker",
            type: "liters",
            isNumber: true,
            deletedAt: new Date().toISOString(),
            entries: [],
          },
        ],
        tags: [],
      };

      await importData(importData_, false);

      // Verify tracker is now deleted
      const tracker = await getTrackerById("tracker-1");
      expect(tracker).toBeNull();

      // Verify deletedAt was set
      const db = await getDB();
      const rawTracker = await db.get("trackers", "tracker-1");
      expect(rawTracker?.deletedAt).toBeInstanceOf(Date);
    });

    test("merge import should apply remote entry deletedAt", async () => {
      const trackerId = "tracker-1";
      const entryId = "entry-1";

      // Create local tracker and entry
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

      // Import with entry deletedAt
      const importData_: ExportData = {
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
                value: 100,
                createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
                deletedAt: new Date().toISOString(),
              },
            ],
          },
        ],
        tags: [],
      };

      await importData(importData_, false);

      // Verify entry is now deleted
      const history = await getEntryHistory(trackerId);
      expect(history.length).toBe(0);

      // Verify deletedAt was set
      const db = await getDB();
      const rawEntry = await db.get("entries", entryId);
      expect(rawEntry?.deletedAt).toBeInstanceOf(Date);
    });

    test("deleted tracker should not be resurrected during sync", async () => {
      // Device A: Create and delete tracker
      await saveTrackerWithId(
        {
          id: "tracker-1",
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );
      await deleteTracker("tracker-1");

      // Export from Device A
      const exportedFromA = await exportData();

      // Clear data to simulate Device B
      await clearAllData();

      // Device B: Import old data without the tracker (simulates data from before creation)
      const oldData: ExportData = {
        version: "1.0.0",
        exportDate: new Date(Date.now() - 10000).toISOString(),
        lastChangeDate: new Date(Date.now() - 10000).toISOString(),
        trackers: [],
        tags: [],
      };
      await importData(oldData, true);

      // Now import the data from Device A (with deleted tracker)
      await importData(exportedFromA, false);

      // Verify tracker is not visible
      const tracker = await getTrackerById("tracker-1");
      expect(tracker).toBeNull();

      // Verify tracker exists with deletedAt
      const db = await getDB();
      const rawTracker = await db.get("trackers", "tracker-1");
      expect(rawTracker).not.toBeUndefined();
      expect(rawTracker?.deletedAt).toBeInstanceOf(Date);
    });

    test("merge import should not resurrect deleted tracker", async () => {
      // Create and delete tracker locally
      await saveTrackerWithId(
        {
          id: "tracker-1",
          title: "Test Tracker",
          type: "liters",
          isNumber: true,
        },
        true
      );
      await deleteTracker("tracker-1");

      // Import data without deletedAt (e.g., from older version)
      const importData_: ExportData = {
        version: "1.0.0",
        exportDate: new Date(Date.now() - 10000).toISOString(),
        trackers: [
          {
            id: "tracker-1",
            title: "Test Tracker",
            type: "liters",
            isNumber: true,
            entries: [],
          },
        ],
        tags: [],
      };

      await importData(importData_, false);

      // Verify tracker is still deleted (local deletedAt preserved)
      const tracker = await getTrackerById("tracker-1");
      expect(tracker).toBeNull();

      const db = await getDB();
      const rawTracker = await db.get("trackers", "tracker-1");
      expect(rawTracker?.deletedAt).toBeInstanceOf(Date);
    });
  });
});
