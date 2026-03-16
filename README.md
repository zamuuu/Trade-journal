# Trade Journal

A personal trading journal for day traders. Import executions from your broker, reconstruct complete trades, and analyze performance through dashboards, reports, and calendars.

Runs entirely on localhost. No accounts, no cloud, no external APIs. SQLite is the single source of truth.

## Features

- **Multi-broker import** -- Sterling Trader Pro (TXT), DAS Trader Pro (CSV), Hammer Pro (XLSX)
- **Automatic trade reconstruction** -- groups executions by symbol + day, tracks net position, closes trades when position returns to zero
- **Dashboard** -- configurable widget grid with drag-and-drop layout editing. Widgets include: cumulative PnL, daily PnL, drawdown %, win rate, profit factor, P&L by setup, P&L by day of week, P&L by price range, recent trades, and more
- **Trades list** -- sortable table with filters (symbol, side, date range, rating). Click any trade for a detail view with notes, setup, tags, screenshots, and execution history
- **Journal** -- day-by-day view with daily notes, tags, and trade summaries
- **Calendar** -- 12-month year overview and expanded single-month view with weekly P&L totals
- **Reports** -- detailed stats (24 metrics including SQN, Kelly %, K-Ratio, profit factor), daily PnL chart, drawdown chart, win vs loss days comparison, long vs short comparison
- **Screenshots** -- paste from clipboard or upload. Organized by category (historical chart, intraday chart, other) with optional captions. Click to open in a lightbox with scroll-wheel zoom and drag-to-pan

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma 7 + better-sqlite3 |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Charts | Recharts |
| XLSX parsing | SheetJS (xlsx) |
| Drag & drop | @dnd-kit |

## Prerequisites

- **Node.js** >= 20
- **npm** (comes with Node.js)

No other dependencies. No Docker, no external database, no API keys.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/zamuuu/Trade-journal.git
cd Trade-journal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Create a `.env` file in the project root:

```
DATABASE_URL="file:./dev.db"
```

### 4. Generate the Prisma client and create the database

```bash
npx prisma generate
npx prisma db push
```

`prisma generate` creates the typed client in `src/generated/prisma/`.
`prisma db push` creates the SQLite database file (`dev.db`) and applies the schema.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Importing Trades

Go to the **Import** page from the sidebar. Select your broker, upload the file, preview the reconstructed trades, and confirm the import.

### Sterling Trader Pro

- **Format**: TXT file (UTF-16 encoded, no headers, comma-delimited)
- **Date**: Embedded in each row (MM/DD/YY)
- **Example row**: `03/10/26,10:13:39,INKT,1,16.56,BOT,`

### DAS Trader Pro

- **Format**: CSV file (has header row)
- **Date**: Not in the file -- you must select the trade date in the UI
- **Example row**: `17:43:25,ISPC,B,0.3671,100,...`

### Hammer Pro

- **Format**: XLSX file (detailed broker report with multiple sections per symbol)
- **Date**: Not per-row -- you must select the trade date in the UI
- The parser automatically identifies execution rows and ignores summary/fee rows

### How trade reconstruction works

1. Executions are grouped by **symbol + trading day**
2. Sorted chronologically within each group
3. Net position is tracked: BUY adds, SELL/SELL\_SHORT subtracts
4. When position returns to **zero**, a complete trade is formed
5. **Incomplete trades** (position != 0 at end of day) are discarded
6. **Breakeven trades** ($0 P&L) are saved
7. Duplicate detection prevents re-importing the same trades

## Project Structure

```
src/
  app/                          # Next.js App Router pages
    page.tsx                    # Dashboard
    trades/                     # Trades list + detail
    calendar/                   # Calendar views
    reports/                    # Reports (detailed, win/loss days, long/short)
    journal/                    # Daily journal
    import/                     # Import page
  components/
    dashboard/                  # Dashboard widgets
    trades/                     # Trades table + detail
    calendar/                   # Calendar views
    reports/                    # Report charts + stats cards
    import/                     # Import form
    layout/                     # Sidebar
    ui/                         # shadcn/ui base components
  lib/
    db.ts                       # Prisma client singleton
    csv/
      parsers/                  # Broker-specific parsers
        sterling.ts
        das.ts
        hammer.ts
      parser-registry.ts        # Parser lookup
      trade-reconstructor.ts    # Groups executions into trades
      encoding.ts               # UTF-8/UTF-16 auto-detection
    calculations/
      metrics.ts                # Dashboard metrics
      detailed-stats.ts         # 24-metric detailed report
      long-short-stats.ts       # Long vs Short comparison
      win-loss-days-stats.ts    # Win vs Loss Days comparison
    widgets/
      registry.ts               # Widget definitions + defaults
  actions/                      # Server Actions (import, trade CRUD, etc.)
  types/
    index.ts                    # Shared TypeScript interfaces
  generated/
    prisma/                     # Auto-generated Prisma client (gitignored)
prisma/
  schema.prisma                 # Database schema
dev.db                          # SQLite database (gitignored, created by prisma db push)
```

## Database

SQLite file at `dev.db` in the project root. Models:

- **Trade** -- reconstructed trades with PnL, entry/exit prices, notes, setup, tags, rating
- **Execution** -- individual fills linked to a trade
- **Tag** -- reusable tags (many-to-many with trades and day notes)
- **Screenshot** -- images with category and caption, linked to a trade
- **NoteTemplate** -- reusable note templates
- **DashboardConfig** -- widget layout configuration (single row, JSON column)
- **DayNote** -- per-day journal notes with tags

To reset the database:

```bash
rm dev.db
npx prisma db push
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npx prisma studio` | Open Prisma Studio (visual DB browser) |
| `npx prisma db push` | Push schema changes to SQLite |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
