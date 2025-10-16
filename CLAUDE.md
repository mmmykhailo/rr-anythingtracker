# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anything Tracker** is a React Router 7 single-page application (SPA) for tracking any measurable activity - water intake, steps, habits, etc. All data is stored locally in IndexedDB with optional GitHub Gist sync for backup/restore across devices.

## Development Commands

```bash
# Install dependencies
bun install
# or
npm install

# Start development server (http://localhost:5173)
bun run dev

# Type checking
bun run typecheck

# Build for production
bun run build

# Start production server
bun run start
```

## Core Architecture

### Data Layer

**IndexedDB with idb wrapper** (`app/lib/db.ts`):
- Three object stores: `trackers`, `entries`, `metadata`
- Each tracker can have a `parentId` for hierarchical relationships (e.g., Beer → Alcohol)
- Values are stored as integers in base units (milliliters for liters, steps for steps)
- Entries track individual data points with `trackerId`, `date`, `value`, `comment`, `createdAt`
- Parent-child tracker relationships: when a child tracker is updated, the parent automatically aggregates the value

**Critical data flow**:
1. User actions trigger mutations via hooks (`app/lib/hooks.ts`)
2. Database operations execute and update IndexedDB
3. Data change events are dispatched (`app/lib/data-change-events.ts`)
4. UI components listen to events and revalidate/refresh data
5. Optional GitHub Gist sync happens after 2-second debounce

### React Hooks Pattern

The app uses custom hooks for all database operations:
- `useDatabase()` - Initialize DB connection
- `useTrackerMutations()` - Create/delete trackers
- `useTrackerEntries(trackerId)` - CRUD operations for tracker entries
- `useFormState<T>()` - Form state management with validation

Never call database functions directly from components; always use these hooks.

### Event System

**Typed events** (`app/lib/typed-events.ts`, `app/lib/data-change-events.ts`):
- Immediate events: `anythingtracker:datachange` - fired instantly on data mutations
- Debounced events: `anythingtracker:datachange:debounced` - fired after 2s for sync operations
- Event types: `tracker_created`, `tracker_updated`, `tracker_deleted`, `entry_added`, `entry_updated`, `entry_deleted`, `data_imported`

Components use `debouncedDataChange.dispatch()` to trigger events that may need syncing.

### GitHub Gist Sync

**Optional feature** (`app/lib/github-gist-sync/index.ts`):
- Credentials stored in localStorage: `github_token`, `gist_id`, `encryption_enabled`
- Encryption uses Web Crypto API with AES-GCM (256-bit key derived from GitHub token)
- Check `isSyncConfigured()` before attempting sync operations
- Sync happens automatically on debounced data changes if configured
- Encrypted data has envelope format with `encrypted: true` flag

### Data Storage Format

**Numbers are stored as integers**:
- Liters: stored as milliliters (1L = 1000)
- Steps: stored as-is
- Checkbox: 1 = checked, 0 = unchecked
- Use `formatStoredValue(value, type)` to display to users (`app/lib/number-conversions.ts`)
- Use conversion functions when accepting user input

### Parent-Child Tracker Relationships

**How it works**:
- Only numeric trackers can be parents (no checkbox trackers)
- Parent and child must have the same measurement type
- When an entry is added to a child tracker, it's automatically added to the parent
- When an entry is updated in a child, the parent's value is adjusted by the difference
- Use `ignoreParent: true` parameter in database functions to prevent parent updates (e.g., during data import)

## File Structure

```
app/
├── lib/
│   ├── db.ts                     # IndexedDB operations (trackers, entries, metadata)
│   ├── hooks.ts                  # React hooks for data mutations and queries
│   ├── trackers.ts               # Tracker type definitions and constants
│   ├── dates.ts                  # Date formatting and manipulation utilities
│   ├── data-export.ts            # Export/import JSON data
│   ├── data-operations.ts        # High-level data operations (export/import with UI)
│   ├── data-change-events.ts    # Event system for data mutations
│   ├── typed-events.ts           # Typed event creation utilities
│   ├── github-gist-sync/         # GitHub Gist sync functionality
│   │   └── index.ts
│   ├── crypto.ts                 # Encryption/decryption for Gist sync
│   ├── number-conversions.ts     # Convert between storage and display formats
│   ├── entry-quick-add-values.ts # Quick-add button values per tracker type
│   └── history.ts                # Entry history management
├── components/
│   ├── ui/                       # shadcn/ui components (button, input, checkbox, etc.)
│   ├── tracker/                  # Tracker-specific components
│   │   ├── TrackerHeader.tsx     # Header for tracker detail page
│   │   ├── EntryInput.tsx        # Input component for logging entries
│   │   ├── TrackerHistory.tsx    # Entry history display
│   │   └── HistoryDateGroup.tsx  # Grouped history items by date
│   ├── dev-utils.tsx             # Dev panel (export/import/seed/clear)
│   ├── SyncButton.tsx            # GitHub sync button in header
│   ├── SyncProvider.tsx          # Context provider for sync state
│   └── EncryptionMigrationInfo.tsx # Info component for encryption migration
├── routes/
│   ├── _index.tsx                # Home page: tracker list with week view
│   ├── new-tracker.tsx           # Create new tracker form
│   ├── $trackerId.log-entry.tsx  # Log entry page for a specific tracker
│   ├── settings.tsx              # App settings
│   ├── github-sync-settings.tsx  # GitHub sync configuration
│   └── onboarding.tsx            # Initial onboarding flow
└── root.tsx                      # Root layout with SyncProvider

react-router.config.ts             # SSR disabled (ssr: false) - this is a client-only SPA
```

## Important Patterns

### Data Mutations
Always dispatch data change events after mutations:
```typescript
await saveTracker(tracker);
debouncedDataChange.dispatch('tracker_created', { trackerId: tracker.id });
```

### Number Storage and Display
```typescript
// User enters 1.5L
const storedValue = 1500; // Store as 1500ml
await saveEntry(trackerId, date, storedValue);

// Display to user
const displayValue = formatStoredValue(storedValue, 'liters'); // "1.5"
```

### Parent Tracker Updates
```typescript
// Normal entry - automatically updates parent
await createEntry(trackerId, date, value);

// Import or seeding - skip parent update
await createEntry(trackerId, date, value, true, true); // ignoreParent=true
```

### Loading Tracker Data
```typescript
// In route loaders
export async function clientLoader() {
  const trackers = await getAllTrackers(); // Automatically populates values from entries
  return { trackers };
}
```

### Expanding/Collapsing Tracker Lists
The home page supports expanding/collapsing parent trackers to show/hide their children:
- State stored in localStorage as `expandedTrackers` (Set of tracker IDs)
- Only top-level parents (no `parentId`) can be expanded/collapsed
- Children are filtered using `areAllAncestorsExpanded()` helper
- Smooth transitions with Tailwind `max-h-0` → `max-h-20` and opacity

## Tracker Types

Defined in `app/lib/trackers.ts`:
- `liters` - Liquid intake (stored as milliliters)
- `steps` - Step count (stored as-is)
- `none` - Generic numeric value
- `checkbox` - Boolean tracking (1 or 0)

Quick-add values defined in `app/lib/entry-quick-add-values.ts`:
- Liters: 0.25L, 0.5L, 1L
- Steps: 100, 500, 1000
- None: 1, 5

## PWA Support

The app includes Progressive Web App features:
- Manifest at `public/manifest.json`
- Icons in `public/icons/` (various sizes + maskable icons for adaptive icons)
- Service worker configuration in root layout

## TypeScript Configuration

- Path alias: `~/*` maps to `./app/*`
- React Router type generation: `.react-router/types/`
- Strict mode enabled
- Module resolution: bundler (Vite)

## Key Considerations

1. **Client-side only**: This is an SPA with no server-side rendering (`ssr: false`)
2. **Local-first**: All data stored in IndexedDB, GitHub sync is optional
3. **Privacy**: User data never leaves their device unless they explicitly configure GitHub sync
4. **Date format**: Dates stored as ISO strings (`YYYY-MM-DD`)
5. **ID generation**: Uses `crypto.randomUUID()` for all IDs
6. **Metadata tracking**: `lastChangeDate` tracked in IndexedDB for sync conflict resolution
7. **Onboarding**: New users redirected to `/onboarding` until they complete it
8. **Development mode**: Dev utils panel (`components/dev-utils.tsx`) only shows in dev mode

## Common Pitfalls

- Don't forget to dispatch data change events after mutations
- Always use hooks for database operations, not direct db function calls
- Remember values are stored as integers (milliliters, not liters)
- Use `ignoreParent` flag during data import/seeding to prevent double-counting
- Parent/child trackers must have matching types
- Encryption requires Web Crypto API support (check `isCryptoSupported()`)
- GitHub token needs proper scopes: `gist` (read/write)
