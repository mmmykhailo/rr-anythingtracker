# Anything Tracker

A React Router 7 application for tracking anything you want - water intake, steps, habits, or any measurable activity. All data is stored locally in your browser using IndexedDB.

## Features

- 📊 **Track Anything**: Create custom trackers for any metric (liquids, steps, habits, etc.)
- 📅 **Flexible Date View**: View your progress across the last 4 days with easy navigation to past and future periods
- 🎯 **Goals**: Set daily goals and visualize your progress with color-coded indicators
- ✅ **Multiple Types**: Support for numeric values (liters, steps, custom) and simple checkboxes
- 🔗 **Parent-Child Trackers**: Create hierarchical relationships where child trackers automatically aggregate into parents
- 💾 **Local Storage**: All data stored locally in IndexedDB - no server required, completely private
- 📱 **PWA Support**: Install as a Progressive Web App on mobile and desktop
- 🔄 **GitHub Sync**: Optional cloud backup via GitHub Gist with end-to-end encryption
- 📤 **Export/Import**: Backup and restore your data as JSON files
- 📜 **Entry History**: View detailed history of all entries with timestamps and comments
- ⚡ **Fast**: Lightweight and performant with event-driven architecture

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) (v18+)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rr-anythingtracker
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Start the development server:
```bash
bun run dev
# or
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Creating a Tracker

1. Click the "New tracker" button on the home page
2. Enter a tracker name
3. Select a measurement unit (type)
4. Optionally set a daily goal
5. Optionally select a parent tracker for automatic aggregation
6. Click "Save" to create your tracker

### Parent Trackers

The parent tracker feature allows you to create hierarchical relationships between trackers. When you track something in a child tracker, it automatically gets added to the parent tracker.

**Example Use Cases:**
- Track "Beer" and "Wine" separately, but have both contribute to an "Alcohol" parent tracker
- Track different coffee types (Espresso, Latte, etc.) that all contribute to a "Coffee" parent tracker
- Track various exercise activities that all contribute to a "Workout" parent tracker

**How it works:**
- When you add +0.5L to "Beer", it automatically adds +0.5L to "Alcohol"
- The parent tracker shows the total from all its children plus any direct entries
- Child trackers display "→ Parent Name" to show the relationship
- Only numeric trackers can be parents (no checkbox trackers)
- Parent and child must have the same measurement type

### Logging Entries

1. Click on any tracker from the home page
2. Choose the date you want to log for (defaults to today)
3. For numeric trackers:
   - Use quick-add buttons for common values (0.25L, 0.5L, 1L, etc.)
   - Or enter a custom value and click "Add"
4. For checkbox trackers:
   - Simply check/uncheck the box
5. Your data is automatically saved

### Viewing Progress

- The home page shows the last 4 days of all your trackers
- Green values indicate you've met your daily goal
- Gray values indicate you haven't met your goal
- Use the navigation arrows to view previous/future periods
- Parent trackers can be expanded/collapsed to show/hide their children

## Data Management

### Local Storage

All your data is stored locally in your browser using IndexedDB. This means:
- ✅ Your data is private and never leaves your device (unless you enable GitHub Sync)
- ✅ Works offline
- ✅ Complete ownership of your data
- ⚠️ Data is tied to your browser - clearing browser data will delete your trackers

### Export & Import

Access via Settings (gear icon):
- **Export**: Download your data as a JSON file for backup
- **Import**: Restore data from a JSON file (replaces existing data)

### GitHub Sync (Optional)

Automatically backup and sync your data across devices via GitHub Gist:
1. Go to Settings → Configure GitHub Sync
2. Create a GitHub Personal Access Token with `gist` scope
3. Enter your token and Gist ID (or create a new gist)
4. Enable encryption (recommended) for end-to-end encrypted backups
5. Data automatically syncs after changes (2-second debounce)

**Security**: With encryption enabled, your data is encrypted client-side using AES-GCM before upload. Your GitHub token derives the encryption key.

### Development Mode

In development mode, a "Dev Utils" panel appears in the bottom-right corner with options to:
- **Sync Now**: Manually trigger GitHub sync
- **Export**: Download data as JSON
- **Import**: Restore from JSON file
- **Clear Data**: Delete all trackers and entries
- **Seed Data**: Add sample data for testing

## Tracker Types

### Numeric Trackers

- **Liters**: For tracking liquid intake (water, coffee, etc.)
- **Steps**: For tracking daily steps or activity
- **None**: For any other numeric value

Quick-add buttons are provided for common values:
- Liters: 0.25L, 0.5L, 1L
- Steps: 100, 500, 1000
- None: 1, 5

### Checkbox Trackers

Simple on/off tracking for habits or activities where you just need to mark completion.

## Technical Details

### Architecture

- **Frontend**: React 19 with React Router 7
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: IndexedDB via the `idb` library
- **Build Tool**: Vite
- **Runtime**: Supports both Node.js and Bun

### Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── tracker/        # Tracker-specific components
│   ├── dev-utils.tsx   # Development utilities panel
│   ├── SyncButton.tsx  # GitHub sync button
│   └── SyncProvider.tsx # Sync state context
├── lib/                # Core utilities and logic
│   ├── db.ts          # IndexedDB operations
│   ├── hooks.ts       # React hooks for data management
│   ├── dates.ts       # Date utilities
│   ├── data-export.ts # Export/import functionality
│   ├── data-operations.ts # High-level data operations
│   ├── data-change-events.ts # Event system for data changes
│   ├── github-gist-sync/ # GitHub Gist sync
│   ├── crypto.ts      # Encryption/decryption
│   └── trackers.ts    # Tracker type definitions
└── routes/            # React Router pages
    ├── _index.tsx     # Home page (tracker list with expand/collapse)
    ├── new-tracker.tsx # Create new tracker form
    ├── t.$trackerId.log-entry.tsx # Log entries with history
    ├── settings.tsx   # App settings and data management
    ├── github-sync-settings.tsx # GitHub sync configuration
    └── onboarding.tsx # Initial onboarding flow
```

### Database Schema

The app uses IndexedDB with three main stores:

1. **trackers**: Stores tracker metadata (name, type, goals, parentId)
2. **entries**: Stores individual data points (value, date, tracker ID, comment, createdAt)
3. **metadata**: Stores app-level metadata (lastChangeDate, onboardingCompleted)

Values are stored as integers in base units (e.g., milliliters for liters) for precision.

## Development

### Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run typecheck` - Run TypeScript type checking

### Adding New Tracker Types

1. Add the new type to `trackerTypes` in `app/lib/trackers.ts`
2. Add a label in `trackerTypesLabels`
3. Add quick-add values in `app/lib/entry-quick-add-values.ts`
4. Update the UI logic in the log entry page if needed

## Browser Compatibility

- Modern browsers with IndexedDB and Web Crypto API support
- Chrome 60+
- Firefox 57+
- Safari 11+
- Edge 79+

**Note**: Encryption requires Web Crypto API. Browsers without support can still use the app but without encryption.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Roadmap

- [x] Data synchronization across devices (via GitHub Gist)
- [x] End-to-end encryption for sync
- [x] PWA support for mobile installation
- [x] Entry history with comments
- [ ] More tracker types
- [ ] Charts and analytics
- [ ] Reminders and notifications
- [ ] Themes and customization
- [ ] Export to CSV
- [ ] Weekly/monthly summaries
