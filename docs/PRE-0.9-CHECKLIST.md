# Pre-0.9 cleanup checklist

Version 0.8.43

## Completed in this cleanup patch

- Cleaned `README-AUTO-DATA.md` into a current-state data guide.
- Added `scripts/validate-data.js`.
- Added `npm run validate-data` and `npm run check`.
- Removed stale `cycleNote` / `nonActiveNote` fields from race data.
- Removed unused cycle-note rendering from `js/race-maps.js`.
- Removed stale CSS blocks for removed gray-state notes and duplicate candidate overrides.
- Verified JavaScript syntax checks pass.

## Before tagging 0.9

Run:

```bash
npm install
npm run validate-data
node --check js/load-polling-data.js
node --check js/trend-charts.js
node --check js/race-maps.js
node --check scripts/update-polls.js
```

Then quickly check these pages on desktop and mobile:

```text
index.html
national-averages.html
trump-approval.html
senate.html
governor.html
methodology.html
house.html
```

## Data checks to keep doing manually

- Confirm new primary/runoff winners before changing candidate lists.
- Keep Senate/Governor projected totals aligned with the map.
- Keep House marked work in progress until district-level data exists.
- Do not manually overwrite `data/polling.json` or `data/polling-history.json` unless using the intentional override workflow.
