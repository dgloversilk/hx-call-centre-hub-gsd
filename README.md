# HX Call Centre Hub

Internal task management tool for the Holiday Extras call centre.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project structure

```
app/
  page.js          # Entry point — routing and auth state
  layout.js        # Root HTML layout
  globals.css      # Tailwind CSS import

components/
  auth/            # Login screen
  layout/          # Navbar and sidebar
  ui/              # Reusable components (StatusBadge, StatCard, Tag)
  dashboard/       # Manager overview dashboard
  queue/           # Task queue (table, notes panel, analysis)
  archive/         # Archived tasks view
  summary/         # Daily summary
  upload/          # CSV upload wizard

lib/
  brand.js         # HX brand colours — edit here to update everywhere
  constants.js     # Status config and mock users
  seedData.js      # Placeholder data (replace with BigQuery fetch)
  csvParser.js     # Parses CSV uploads
  analysis.js      # Column breakdown logic
  useTaskData.js   # Central state hook for all task data
```

## Next steps

- Wire up Google Auth (NextAuth.js)
- Connect BigQuery as a data source
- Replace seed data in `lib/seedData.js` with real SQL queries
- Deploy to Vercel
