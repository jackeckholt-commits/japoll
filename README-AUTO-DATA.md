# National Poll Tracker data and release guide

Version 0.8.43

This project is a static GitHub Pages polling tracker. It combines public polling averages, stores history, and displays national polling, approval, Senate prediction, Governor prediction, and House work-in-progress pages.

## Current data flow

```text
GitHub Actions
→ npm run update-polls
→ data/polling.json
→ data/polling-history.json
→ GitHub Pages redeploy
```

## Main commands

```bash
npm install
npm run install-browsers
npm run update-polls
npm run validate-data
npm start
```

`npm run validate-data` checks the JSON files, race-map totals, projected totals, candidate links, and stale cleanup fields before release.

## Files that should not be manually overwritten

These files are updated by the scraper/history workflow and should normally be protected:

```text
data/polling.json
data/polling-history.json
```

To intentionally overwrite protected polling data, use the existing `[allow-data]` commit-message override.

## Data files

```text
data/polling.json          latest national polling/approval data
data/polling-history.json  stored trend history
data/history.json          prototype estimated history points
data/adjustments.json      generic-ballot display adjustment
data/manual-overrides.json scraper fallback/manual values
data/races.json            Senate/Governor/House map, ratings, candidates
```

## National averages

Generic ballot currently uses:

```text
VoteHub
FiftyPlusOne
Silver Bulletin
CNN
Race to WH
```

Trump approval currently uses:

```text
VoteHub
FiftyPlusOne
Silver Bulletin
CNN
Race to WH
The New York Times
```

Only included source values are used in averages. Sources without usable values should remain visible but excluded.

## Race maps

`data/races.json` is the main file for Senate and Governor map data.

Active race categories:

```text
demSolid
demLikely
demLean
demTilt
repTilt
repLean
repLikely
repSolid
```

When editing a race, keep these fields aligned:

```text
party
status
marginCategory
marginLabel
predictedMargin
```

Then update:

```text
projection
marginSummary.segments
projectedControl.activeRaceWins
projectedControl.democrats
projectedControl.republicans
```

Run:

```bash
npm run validate-data
```

before uploading a release patch.

## Candidate data

Candidates live inside each race object in `data/races.json`:

```json
{
  "name": "Candidate Name",
  "party": "Democratic",
  "wikipedia": "https://en.wikipedia.org/wiki/Candidate_Name"
}
```

For independents aligned with Democrats, use:

```json
{
  "name": "Candidate Name",
  "party": "Independent (Dem-aligned)",
  "wikipedia": "https://en.wikipedia.org/wiki/Candidate_Name",
  "demAligned": true
}
```

States without final nominees should keep:

```text
Waiting on primary for full results.
```

## Current projected totals

As of this cleanup pass:

```text
Senate projection: D 52 / R 48
Governor projection: D 25 / R 25
```

House remains work in progress.

## Pre-0.9 cleanup completed

This cleanup pass:

- replaced the long version-by-version README with current setup documentation
- added `scripts/validate-data.js`
- added `npm run validate-data` and `npm run check`
- removed stale race-cycle note data/rendering
- removed stale CSS blocks for the deleted gray-state note
- removed duplicate candidate styling overrides
- kept the public design unchanged
