# Anything Tracker

A React Router 7 application for tracking anything you want - water intake, steps, habits, or any measurable activity. All data is stored locally in your browser using IndexedDB.

## Features

- 📊 **Track Anything**: Create custom trackers for any metric (liquids, steps, habits, etc.)
- 📅 **Week View**: View your progress across the last 7 days with easy navigation
- 🎯 **Goals**: Set daily goals and visualize your progress
- ✅ **Multiple Types**: Support for numeric values and simple checkboxes
- 💾 **Local Storage**: All data stored locally in IndexedDB - no server required
- 📱 **Mobile-First**: Optimized for mobile devices with a clean, responsive design
- 📤 **Export/Import**: Backup and restore your data (development mode)
- ⚡ **Fast**: Lightweight and performant

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
2. Enter a name for your tracker (e.g., "Water", "Steps", "Reading")
3. Select a measurement unit:
   - **Liters**: For tracking liquids
   - **Steps**: For tracking step count
   - **Checkbox**: For simple yes/no tracking
   - **None**: For generic numeric tracking
4. Optionally set a daily goal
5. Click "Save"

### Logging Entries

1. Click on any tracker from the home page
2. Choose the date you want to log for (defaults to today)
3. For numeric trackers:
   - Use quick-add buttons for common values
   - Enter a custom value and click "Add"
4. For checkbox trackers:
   - Simply check/uncheck the box
5. Your data is automatically saved

### Viewing Progress

- The home page shows a week view of all your trackers
- Green values indicate you've met your daily goal
- Gray values indicate you haven't met your goal
- Use the navigation arrows to view previous/future weeks
- Click "This Week" to jump back to the current week

## Data Management

### Local Storage

All your data is stored locally in your browser using IndexedDB. This means:
- ✅ Your data is private and never leaves your device
- ✅ Works offline
- ❌ Data is tied to your browser - clearing browser data will delete your trackers
- ❌ Data won't sync between devices

### Backup & Restore (Development Mode)

In development mode, you'll see a "Dev Utils" panel in the bottom-right corner with options to:

- **Export**: Download your data as a JSON file
- **Import**: Restore data from a JSON file
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
│   └── dev-utils.tsx   # Development utilities
├── lib/                # Core utilities and logic
│   ├── db.ts          # IndexedDB operations
│   ├── hooks.ts       # React hooks for data management
│   ├── dates.ts       # Date utilities
│   ├── data-export.ts # Export/import functionality
│   └── trackers.ts    # Tracker type definitions
└── routes/            # React Router pages
    ├── _index.tsx     # Home page (tracker list)
    ├── new-tracker.tsx # Create new tracker
    └── $trackerId.log-entry.tsx # Log entries
```

### Database Schema

The app uses IndexedDB with two main stores:

1. **trackers**: Stores tracker metadata (name, type, goals)
2. **entries**: Stores individual data points (value, date, tracker ID)

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

- Modern browsers with IndexedDB support
- Chrome 23+
- Firefox 38+
- Safari 8+
- Edge 12+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Roadmap

- [ ] Data synchronization across devices
- [ ] More tracker types (time-based, rating scales)
- [ ] Charts and analytics
- [ ] Reminders and notifications
- [ ] Themes and customization
- [ ] Export to CSV
- [ ] Weekly/monthly summaries