import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Tracker } from "./trackers";

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
			createdAt: Date;
		};
		indexes: {
			"by-tracker": string;
			"by-date": string;
			"by-tracker-date": [string, string];
		};
	};
}

const DB_NAME = "AnythingTrackerDB";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<AnythingTrackerDB> | null = null;

// Initialize database
export async function initDB(): Promise<IDBPDatabase<AnythingTrackerDB>> {
	if (dbInstance) {
		return dbInstance;
	}

	dbInstance = await openDB<AnythingTrackerDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Create trackers store
			const trackersStore = db.createObjectStore("trackers", {
				keyPath: "id",
			});
			trackersStore.createIndex("by-title", "title");

			// Create entries store
			const entriesStore = db.createObjectStore("entries", {
				keyPath: "id",
			});
			entriesStore.createIndex("by-tracker", "trackerId");
			entriesStore.createIndex("by-date", "date");
			entriesStore.createIndex("by-tracker-date", ["trackerId", "date"], {
				unique: true,
			});
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

// Tracker operations
export async function saveTracker(
	tracker: Omit<Tracker, "id" | "values">,
): Promise<Tracker> {
	const db = await getDB();
	const id = generateId();

	const newTracker: Tracker = {
		...tracker,
		id,
		values: {},
	};

	await db.put("trackers", newTracker);
	return newTracker;
}

export async function getAllTrackers(): Promise<Tracker[]> {
	const db = await getDB();
	const trackers = await db.getAll("trackers");

	// Populate values from entries
	for (const tracker of trackers) {
		const entries = await db.getAllFromIndex(
			"entries",
			"by-tracker",
			tracker.id,
		);
		tracker.values = {};

		for (const entry of entries) {
			tracker.values[entry.date] = entry.value;
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
		tracker.values[entry.date] = entry.value;
	}

	return tracker;
}

export async function deleteTracker(id: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(["trackers", "entries"], "readwrite");

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

	await tx.done;
}

// Entry operations
export async function saveEntry(
	trackerId: string,
	date: string,
	value: number,
	updateParent: boolean = true,
): Promise<void> {
	const db = await getDB();

	// Check if entry already exists for this tracker and date
	const existingEntry = await db.getFromIndex("entries", "by-tracker-date", [
		trackerId,
		date,
	]);

	const oldValue = existingEntry?.value ?? 0;
	const valueDifference = value - oldValue;

	if (existingEntry) {
		// Update existing entry
		existingEntry.value = value;
		await db.put("entries", existingEntry);
	} else {
		// Create new entry
		const entry = {
			id: generateId(),
			trackerId,
			date,
			value,
			createdAt: new Date(),
		};
		await db.put("entries", entry);
	}

	// Update parent tracker if one exists and there's a value change
	if (updateParent && valueDifference !== 0) {
		const tracker = await getTrackerById(trackerId);
		if (tracker?.parentId) {
			await addToEntry(tracker.parentId, date, valueDifference);
		}
	}
}

export async function getEntry(
	trackerId: string,
	date: string,
): Promise<number> {
	const db = await getDB();
	const entry = await db.getFromIndex("entries", "by-tracker-date", [
		trackerId,
		date,
	]);
	return entry?.value ?? 0;
}

export async function addToEntry(
	trackerId: string,
	date: string,
	valueToAdd: number,
): Promise<number> {
	const currentValue = await getEntry(trackerId, date);
	const newValue = currentValue + valueToAdd;
	await saveEntry(trackerId, date, newValue);

	// Also add to parent tracker if one exists
	const tracker = await getTrackerById(trackerId);
	if (tracker?.parentId) {
		// Use saveEntry directly with updateParent=false to prevent infinite recursion
		const parentCurrentValue = await getEntry(tracker.parentId, date);
		const parentNewValue = parentCurrentValue + valueToAdd;
		await saveEntry(tracker.parentId, date, parentNewValue, false);
	}

	return newValue;
}

export async function deleteEntry(
	trackerId: string,
	date: string,
): Promise<void> {
	const db = await getDB();
	const entry = await db.getFromIndex("entries", "by-tracker-date", [
		trackerId,
		date,
	]);

	if (entry) {
		await db.delete("entries", entry.id);
	}
}

// Utility to clear all data (useful for development/testing)
export async function clearAllData(): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(["trackers", "entries"], "readwrite");

	await tx.objectStore("trackers").clear();
	await tx.objectStore("entries").clear();

	await tx.done;
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

		// Add some sample entries
		await saveEntry(energyDrinksTracker.id, formatDate(yesterday), 1);
		await saveEntry(energyDrinksTracker.id, formatDate(today), 0.2);

		await saveEntry(stepsTracker.id, formatDate(yesterday), 14432);
		await saveEntry(stepsTracker.id, formatDate(today), 2312);

		// Add entries to child trackers (these will automatically update parent trackers)
		await saveEntry(beerTracker.id, formatDate(yesterday), 0.5, false); // false to prevent double counting during seeding
		await saveEntry(beerTracker.id, formatDate(today), 0.33, false);

		await saveEntry(wineTracker.id, formatDate(yesterday), 0.15, false);
		await saveEntry(wineTracker.id, formatDate(today), 0.1, false);

		await saveEntry(espressoTracker.id, formatDate(yesterday), 0.06, false);
		await saveEntry(espressoTracker.id, formatDate(today), 0.03, false);

		// Manually set parent tracker totals to match child totals
		await saveEntry(alcoholTracker.id, formatDate(yesterday), 0.65, false); // 0.5 + 0.15
		await saveEntry(alcoholTracker.id, formatDate(today), 0.43, false); // 0.33 + 0.1

		await saveEntry(coffeeTracker.id, formatDate(yesterday), 0.06, false); // 0.06 from espresso
		await saveEntry(coffeeTracker.id, formatDate(today), 0.03, false); // 0.03 from espresso
	}
}
