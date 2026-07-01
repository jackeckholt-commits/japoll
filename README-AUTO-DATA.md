# State of the Race — Poll Tracker

Version 0.7.0

A static polling tracker with automated data updates, stored history, trend charts, and GitHub Pages deployment.

## Current data flow

```text
GitHub Actions
→ npm run update-polls
→ data/polling.json
→ data/polling-history.json
→ GitHub Pages redeploy
```

## Active sources

Generic ballot:
- VoteHub
- FiftyPlusOne
- Silver Bulletin
- CNN
- Race to WH

Trump approval:
- VoteHub
- FiftyPlusOne
- Silver Bulletin
- CNN
- Race to WH
- The New York Times

Only live scraped values count in the combined averages. Fallback/reference values can be shown, but they are not counted.

## Run locally

Install dependencies:

```bash
npm install
```

Install the browser used by Playwright:

```bash
npm run install-browsers
```

Update polling data:

```bash
npm run update-polls
```

Run the site locally:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:5500
```

## Automated updates

The updater workflow is:

```text
.github/workflows/update-polls.yml
```

It:
- runs manually from the GitHub Actions tab
- runs automatically every two days
- installs dependencies
- installs Chromium for Playwright
- runs `npm run update-polls`
- commits updated data files back to the repo

The protected data files are:

```text
data/polling.json
data/polling-history.json
```

## Data protection

The protection workflow is:

```text
.github/workflows/protect-polling-data.yml
```

It prevents normal/manual commits from accidentally overwriting the growing data files. The scraper bot is still allowed to update them.

To intentionally allow a data-file change, include this in the commit message:

```text
[allow-data]
```

## History and 7-day changes

`data/polling-history.json` stores one dated point per scraper run. If the scraper runs more than once on the same day, that day's point is replaced instead of duplicated.

The 7-day change cards compare the latest stored point to the oldest usable point inside the previous seven days.

## 0.7 cleanup

This version:
- cleaned old updater startup logs
- replaced long release notes with current setup docs
- removed old DDHQ cleanup/debug references
- cleaned source labels on the public pages
- fixed the FiftyPlusOne approval source link
- added final responsive layout overrides for desktop/tablet/mobile


## Version 0.7.1

Changed files:
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Prevented homepage Generic Ballot and Trump Approval numbers from overlapping the center trend chip at medium screen widths.
- The major-card number row now stacks inside each card before the text gets cramped.
- Large screens still keep the side-by-side card design.


## Version 0.7.2

Changed files:
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Added a stronger responsive layout fix for the homepage Generic Ballot and Trump Approval cards.
- The major-card number row now stacks based on card width, not just screen width.
- Added a fallback media query for browsers without container-query support.
- Negative weekly-change values now use a real minus sign with a thin space, so it reads like `− 0.4` instead of a cramped hyphen.


## Version 0.7.3

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Removed the small blue hero eyebrow heading from every page.
- Moved the homepage trend chips outside the number rows, so the percent numbers cannot overlap them at any screen width.
- Kept the two large percent numbers side-by-side when there is enough room and stacked them when the card gets narrow.


## Version 0.7.4

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the small blue label headings everywhere.
- This includes both `.eyebrow` and `.section-label` labels.
- Added a global CSS fallback so those labels stay hidden even if one remains in future markup.


## Version 0.7.5

Changed files:
- `js/trend-charts.js`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added a dotted vertical marker to trend charts at the first live collected data point.
- The marker is labeled `Live data begins` and shows the date.
- The default hover panel text now explains that the dotted line marks when live data collection began.
- This makes the jump from estimated starter history to live scraper data understandable.


## Version 0.7.6

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Restored the homepage major-card large-screen layout so the trend chip sits between the two large numbers again.
- The cards only stack internally when the card itself gets too narrow.
- Removed the small blue headings/badges from all HTML pages again and kept a CSS fallback hiding `.eyebrow` and `.section-label`.


## Version 0.7.7

Changed files:
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Remade the homepage major cards at medium screen widths.
- At that size, the two percent values now sit cleanly side-by-side at the top of each card, with the trend chip centered below them.
- Very large screens keep the original three-column layout.
- Narrow/mobile screens still stack vertically.


## Version 0.7.8

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Redesigned the homepage metric cards closer to the mockup.
- Added a small arrow/change badge next to each main percent:
  - Democrats
  - Republicans
  - Approve
  - Disapprove
- The center trend chip remains for margin/net approval change.
- Medium widths use two percent values above and the trend chip centered below.


## Version 0.7.9

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the center trend chip from the homepage Generic Ballot and Trump Approval cards.
- Each main percent now carries its own arrow/change badge:
  - Democrats
  - Republicans
  - Approve
  - Disapprove
- This makes the cards simpler and avoids duplicated trend information.


## Version 0.7.10

Changed files:
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added a mobile overscroll background fix so pulling past the top or bottom should stay dark instead of showing white bars.
- Set the root `html` and `body` backgrounds to the site dark color.
- Added `overscroll-behavior-y: none` where supported.
- Added mobile `theme-color` meta tags.


## Version 0.7.11

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added homepage text explaining that the small plus/minus arrow badges show change since last week.
- Added hover/title text to the mini-change badges, such as “Up 0.4 points since last week.”


## Version 0.7.12

Changed files:
- `methodology.html`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Replaced the About/Methodology page text using the new reference copy.
- Cleaned spelling and grammar while keeping the same meaning.
- Added clearer sections for purpose, sources, average-of-averages, current calculations, and algorithm adjustment.


## Version 0.7.13

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- The small homepage change badges now include `1W`, so it is clear they are weekly changes.
- Increases are green and decreases are red.
- Removed hover/title dependence; the weekly-change meaning is visible directly on the page.


## Version 0.7.14

Changed files:
- `scripts/update-polls.js`
- `.github/workflows/protect-polling-data.yml`
- `package.json`
- `README-AUTO-DATA.md`

Final 0.7 cleanup:
- Updated the scraper console version from the old 0.7.0 label to 0.7.14.
- Restored/added the polling-data protection workflow so manual uploads do not overwrite `data/polling.json` or `data/polling-history.json`.
- Confirmed the scraper source list is expansion-friendly: new sources can be added by creating a new file in `scripts/sources/`, importing it in `scripts/update-polls.js`, and adding its key to `sourceOrder`.

Expansion notes for 1.0:
- Keep scraper data in `data/polling.json`.
- Keep graph/history data in `data/polling-history.json`.
- Add future race pages as separate HTML pages first, then add new source modules only when the data format is stable.
- Use `[allow-data]` in a commit message only when intentionally changing the protected data files.


## Version 0.7.15

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed arrow icons from the homepage weekly-change badges because they rendered poorly on mobile.
- Removed `1W` from each badge.
- Added one clear homepage note explaining that plus/minus badges show weekly change.
- Tightened mobile badge sizing so the cards look cleaner before moving into version 0.8.


## Version 0.7.16

Changed files:
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Blocked horizontal mobile overscroll/page sliding.
- Locked horizontal overflow on `html`, `body`, and `.page-shell`.
- Added mobile-safe max-width rules so wide elements cannot push the page sideways.


## Version 0.7.17

Changed files:
- `styles.css`
- `js/load-polling-data.js`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed arrow characters from the mini weekly-change badge text completely.
- Desktop arrows are now CSS-only.
- Mobile hides those CSS arrows, so the phone should no longer render them as emoji.
- The badges still show plus/minus values such as `+0.8` and `−0.4`.


## Version 0.7.18

Changed files:
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- On mobile, the plus/minus weekly-change badge now stacks under the percentage instead of sitting to the side.
- This keeps the badge inside the card and prevents it from getting pushed off-screen.


## Version 0.8.0

Changed files:
- `senate.html`
- `house.html`
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Major update:
- Added Senate and House race-map pages.
- Added clickable U.S. state maps using active-race placeholders.
- Senate active states are based on 2026 Senate seats up for election, including the two Class 3 special elections.
- House map treats all states as active because all U.S. House seats are up.
- Active states are gray until race data is added; non-active states are lighter.
- Added expandable `data/races.json` structure for future ratings, leaders, called races, and state pages.


## Version 0.8.1

Changed files:
- `governor.html`
- `senate.html`
- `house.html`
- `data/races.json`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Correction:
- Replaced the House race map plan with Governor races.
- Navigation now links to Senate and Governor.
- Senate map has 35 active races.
- Governor map has 36 active state races.
- The old `house.html` now redirects to `governor.html` so a stale House page does not remain linked or confusing.


## Version 0.8.2

Changed files:
- `house.html`
- `data/races.json`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `senate.html`
- `governor.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Correction:
- Kept Senate and Governor as the active race-map sections.
- Added House back as a work-in-progress page instead of redirecting it.
- Navigation now includes `House WIP`.
- `data/races.json` marks House as work in progress for later district-level expansion.


## Version 0.8.3

Changed files:
- `index.html`
- `house.html`
- `senate.html`
- `governor.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed House WIP from the top navigation.
- Kept Senate and Governor in the top navigation because those are the active map sections.
- Updated the homepage lower cards into real clickable buttons/links.
- Senate and Governor are no longer shown as work in progress on the homepage.
- House remains a lower-page work-in-progress item only.


## Version 0.8.5

Changed files:
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added colored top borders to the lower homepage cards.
- Replaced paragraph-heavy lower cards with compact overview values.
- Senate and Governor now show placeholder D/GOP overview numbers directly on the homepage.
- House remains a work-in-progress card.


## Version 0.8.6

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Update:
- Added current-control bars to the top of Senate and Governor map pages.
- Senate now uses current control: 47 Democratic caucus / 53 GOP.
- Governor now uses current control: 24 Democratic governors / 26 GOP governors.
- Homepage Senate/Governor overview cards now use those same current values.


## Version 0.8.7

Changed files:
- `index.html`
- `house.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Restored the About the Project paragraph on the homepage lower card.
- Made the House homepage box non-clickable.
- House now only shows a red `Work in progress` status.
- The House page itself is a simple work-in-progress page with no map or action buttons.


## Version 0.8.8

Changed files:
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Update:
- Redesigned the Senate and Governor homepage summary numbers so they look cleaner and more intentional.
- Added party-tinted mini stat panels and a centered divider for a better visual balance.


## Version 0.8.9

Changed files:
- `senate.html`
- `governor.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the contact strip from the bottom of the Senate and Governor pages.
- Made the site footer look more finished with a glass/gradient pill style.
- Race-page footer now says the race maps are early placeholders instead of showing the contact block.


## Version 0.8.10

Changed files:
- `senate.html`
- `governor.html`
- `styles.css`
- `js/race-maps.js`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fixes:
- Reverted the race-page footer back to the normal site footer style.
- Improved the current-control bar labels so the numbers and party text read more clearly.
- Redesigned the Senate/Governor preview numbers on the homepage so the split counts look cleaner.


## Version 0.8.11

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the U.S. outline/background from non-index page headers.
- Shrunk non-index page headers so they are just a title and subtitle area.
- Kept the homepage hero separate so the index page can keep its larger design.


## Version 0.8.12

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Redesigned the Senate and Governor count blocks on the homepage into cleaner mini scoreboards.
- Added party-tinted panels, a centered divider, and cleaner label/value spacing.
- Kept the same values: Senate 47/53 and Governor 24/26.


## Version 0.8.13

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the extra top gap on the About/Methodology page.
- Added a targeted override for pages using `.about-layout` so the About page header matches the tighter style of the other non-index pages.


## Version 0.8.14

Changed files:
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the `Current Senate control` and `Current governorships` pills from the homepage cards.
- Swapped homepage card top colors: Senate is red, Governor is blue.
- Redesigned the Dem/GOP count area into cleaner stat blocks.


## Version 0.8.15

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Redesigned the Senate/Governor page control bars.
- Made the bars rounded and more polished.
- Removed the white bars on the left and right ends.
- Improved the seat-count label styling inside the bars.


## Version 0.8.16

Changed files:
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Centered the lower homepage cards.
- Removed the slash/divider between the Dem and GOP values on the Senate/Governor cards.
- Replaced `Open Senate map` and `Open Governor map` with `Based on current average`.


## Version 0.8.17

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the repeated `Senate/Governor Races Map` heading block inside the race map card.
- Softened the Senate/Governor control bars so the colors are less bright.
- Kept the main page title and current-control title.


## Version 0.8.18

Changed files:
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Added a subtle homepage guide line above the lower cards: `Click the boxes below to see more`.
- Styled it as a small centered pill so users know the boxes are interactive.


## Version 0.8.19

Changed files:
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Moved the `Click the boxes below to see more` guide above the entire homepage card grid.
- It now appears above the generic ballot and Trump approval boxes too.


## Version 0.8.20

Changed files:
- `js/trend-charts.js`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Changed the homepage trend chart visible window to start in March instead of February.
- This should spread the visible points out more and make the latest dots look less compressed.


## Version 0.8.21

Changed files:
- `js/trend-charts.js`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Made the March start date apply only to the generic ballot trend chart.
- Trump approval keeps its normal full date range.
- The chart start month is now controlled per chart config instead of globally.


## Version 0.8.22

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the subtitle line under the hero title on Senate, Governor, and About pages.
- This removes repeated wording like the sentence under `Senate Races`.


## Version 0.8.23

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Major update:
- Added a margin-colored Governor prediction map.
- Added a seven-category margin bar/legend: strong D, likely D, lean D, toss-up, lean R, likely R, strong R.
- Governor map colors now use prediction margins.
- State click panel now explains the predicted margin and candidate status.
- Candidate section says `Waiting on primary for full results` when nominee data is not available.
- Added state labels to the map.


## Version 0.8.24

Changed files:
- `data/races.json`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Major update:
- Converted the Senate map to the same margin-based prediction style as the Governor map.
- Added seven Senate margin categories: strong D, likely D, lean D, toss-up, lean R, likely R, strong R.
- Senate state click panels now use the prediction/candidate placeholder flow already used on the Governor page.
- Senate page now explains that margins are predictions based on current available data.


## Version 0.8.25

Changed files:
- `data/races.json`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Corrected the Senate and Governor margin categories to better match the reference maps.
- Senate changes include moving Maine to toss-up, Georgia to likely Democratic, and Louisiana/Nebraska/South Dakota to likely Republican.
- Governor changes include moving Nevada to toss-up, Wisconsin to lean Democratic, Minnesota to solid Democratic, and Alaska to lean Republican.
- These are still prediction placeholders based on the current map design and can be tuned as more real race data is added.


## Version 0.8.26

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the toss-up category from the Senate and Governor margin maps.
- Added `Tilt D` and `Tilt R` as very light blue/red categories.
- Updated the bottom margin bars to use eight categories instead of a gray toss-up middle.
- Close states now show as tilt Democratic or tilt Republican, not toss-up.


## Version 0.8.27

Changed files:
- `index.html`
- `methodology.html`
- `national-averages.html`
- `trump-approval.html`
- `senate.html`
- `governor.html`
- `house.html`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Added Inter Tight across the website.
- Updated map state-label lettering to be smaller, tighter, and cleaner.
- Added compact label classes for smaller states.
- Updated margin-bar numbers and labels to use the same font and fit better inside each color segment.


## Version 0.8.28

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Made the state abbreviation labels on the Senate/Governor maps slightly larger.
- Made the margin-bar numbers and category labels larger.
- Kept smaller responsive label sizes for compact states and mobile screens so text still fits.


## Version 0.8.29

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fix:
- Removed the repeated `very light blue/red means tilt, not toss-up` sentence.
- Removed the extra prediction/candidate note from state click panels.
- State click panels still show the margin and the candidate waiting message.


## Version 0.8.30

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Candidate update:
- Added post-primary candidate names and Wikipedia links for verified races currently available.
- Senate updates: Arkansas, Iowa, North Carolina, and South Dakota.
- Governor updates: Arkansas, Iowa, New Mexico, Ohio, and Texas.
- Added support for candidates marked as `Independent (Dem-aligned)` when needed in later updates.
- States without verified nominees still show `Waiting on primary for full results.`


## Version 0.8.31

Changed files:
- `data/races.json`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Candidate update:
- Added more Senate candidate names and Wikipedia links where nominees or presumptive nominees are available.
- Added more Governor candidate names and Wikipedia links where nominees are available.
- Added an Independent (Dem-aligned) label for Seth Bodnar in Montana Senate, while keeping other independents as regular independent unless clearly aligned.
- States with unresolved primaries or runoffs remain marked as waiting for final results.


## Version 0.8.32

Changed files:
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI update:
- Candidate rows now show `Click to see more`.
- Candidate boxes are colored by party: Democratic blue, Republican red, Independent/Libertarian neutral.
- Dem-aligned independents get Democratic-aligned styling.


## Version 0.8.33

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `js/trend-charts.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fixes:
- Removed repeated duplicate month labels on the trend chart x-axis.
- Candidate rows now say `Click to see Wikipedia`.
- Added current-composition notes explaining that not every Senate seat/governorship is up this year.
- Added more candidate entries for completed or presumptive races, including Louisiana Senate after the runoff.


## Version 0.8.34

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Candidate correction:
- Removed candidate rows that were not clearly final/current matchups.
- Corrected California Governor from Katie Porter/Chad Bianco to Xavier Becerra/Steve Hilton.
- Kept only the most clearly verified/current matchups for now:
  - Senate: AL, LA, NC, NE
  - Governor: CA, OR
- Nebraska marks Dan Osborn as `Independent (Dem-aligned)` and notes Cindy Burbank as a Democratic placeholder planning to step aside.
- All other active states show `Waiting on primary for full results.`


## Version 0.8.35

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fixes:
- Removed the bottom date labels from trend charts while keeping hover/click date details.
- Candidate rows now say `Click to see Wikipedia`.
- Added current-composition notes explaining that not every Senate seat/governorship is up this year.
- Added South Carolina Governor candidate matchup after the runoff: Alan Wilson vs. Jermaine Johnson.


## Version 0.8.36

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI update:
- Changed card accents from top-only colored strips to full-card accent rings.
- Blue/red/silver accents now wrap around the entire box and fade outward with a softer glow.
- Applies across homepage cards, race boxes, chart boxes, methodology/content cards, and detail panels.


## Version 0.8.37

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Replaced the overdone 0.8.36 glow/ring effect with a cleaner full-box outline.
- The color now wraps evenly around the whole card like a simple rounded border.
- Removed top-heavy pseudo-element glow effects.


## Version 0.8.38

Changed files:
- `data/races.json`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Candidate update:
- Checked completed primaries/runoffs and added candidates where the matchup is now clear.
- Added Texas Senate: Ken Paxton, James Talarico, Ted Brown.
- Added Texas Governor: Greg Abbott, Gina Hinojosa, Pat Dixon, Jenn Mack Raphoon.
- Added/confirmed Senate candidates for AL, AR, IA, IL, LA, NC, NE, and TX.
- Added/confirmed Governor candidates for AL, AR, CA, IA, IL, NM, OH, OR, PA, SC, and TX.
- Left states with unclear/incomplete primaries as `Waiting on primary for full results.`


## Version 0.8.39

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Normalized card/box styling across the full website.
- All cards now use the same clean full-outline system.
- Removed old top-only accent effects and older pseudo-element glow experiments.
- Homepage cards, chart boxes, race-map boxes, race-detail boxes, content cards, source cards, and candidate cards now all use full rounded outlines.


## Version 0.8.40

Changed files:
- `house.html`
- `index.html`
- `data/house-forecast.json`
- `js/house-forecast.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

House update:
- Replaced House work-in-progress page with an active House forecast average.
- Added source projections for Race to the WH, 270toWin, and Cook Political Report.
- Added an average House seat bar with Safe/Likely/Lean/Toss-up buckets.
- Added source cards showing the seat totals from each forecaster.
- Updated the homepage House card to link to the active House page.


## Version 0.8.41

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Fixed averages pages specifically.
- Removed leftover top-only accent bars from the combined average/chart/source sections.
- Forced source cards to use rounded full-outline boxes.
- Cleaned chart/source borders so they match the rest of the website card system.


## Version 0.8.42

Changed files:
- `house.html`
- `index.html`
- `data/house-forecast.json`
- `js/house-forecast.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

House forecast update:
- Removed toss-ups from the top House prediction bar.
- Assigned the averaged toss-up seats as 17D and 2R based on current averages.
- Top House prediction now shows Democrats 224 and Republicans 211.
- Homepage House card now shows 224 / 211 and says `Based on current averages`.
- Source cards still show each source’s original toss-up bucket.
- Improved House bar/card sizing and rounded corners so the section fits better.


## Version 0.8.43

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Removed remaining top-only card accent bars.
- Forced homepage and site cards to use equal-width wraparound borders.
- Removed leftover pseudo-element top strips and fake top shadows from earlier versions.
- Cleaned small stat/value boxes so they are rounded without top-only bars.


## Version 0.8.44

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Made the homepage House summary card use the same two-tile mini-score layout as Senate and Governor.
- Kept the wraparound card outline style and fixed the House inner stat styling so it matches the others.
- Reduced the House score font size slightly so 3-digit seat counts fit cleanly.


## Version 0.8.45

Changed files:
- `house.html`
- `index.html`
- `data/house-forecast.json`
- `js/house-forecast.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

House update:
- Changed the top House prediction to Democrats 230 and Republicans 205.
- Removed redundant toss-up assignment text.
- The top House bar is now the site's prediction based on current averages/data, similar to Senate and Governor.
- Source cards still show each source's published buckets, including toss-ups.
- Cleaned the House page layout and reduced repeated explanatory text.


## Version 0.9.0

Changed files:
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Release marker:
- Started the 0.9 release line from the current 0.8.45 site state.
- Current working sections: national averages, Trump approval, Senate races, Governor races, and House prediction.
- House prediction currently uses this site's prediction bar plus source cards for published seat buckets.
- Keep data protection rules in place: do not overwrite `data/polling-history.json`, `data/manual-overrides.json`, or live polling data unless intentionally updating those files.


## Version 0.9.1

Changed files:
- `styles.css`
- `package.json`

Fixes:
- Homepage summary cards for Senate, Governor, House, and About now use full-wrap outline colors instead of leaving a tiny top-only accent sliver.
- Senate and House summary cards now match the red full-border treatment used by the big Generic Congressional Ballot card.
- Governor summary card now matches the blue full-border treatment used by the big Trump Approval card.


## Version 0.9.2

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Reworked the homepage House card so the 3-digit seat counts fit cleanly.
- House now uses a compact two-segment mini prediction bar instead of oversized square tiles.
- Kept blue/red sides, centered divider, rounded corners, and the same card action style.


## Version 0.9.3

Changed files:
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Removed the slash/divider from the homepage House Races card.
- House now shows the two values as separate Dem/GOP tiles with no dash/slash between them.


## Version 0.9.4

Changed files:
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fix:
- Added a final sitewide card outline reset.
- Removed old top-only bars from graph sections, chart sections, source cards, and homepage cards.
- Graph sections now use a neutral full wraparound outline instead of a blue top bar.
- The homepage About the Project card now has a blue full wraparound outline.


## Version 0.9.5

Changed files:
- `data/races.json`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Updates:
- Changed Georgia Governor to Tilt Democratic / tilt blue in the current site prediction.
- Added heading/title typography cleanup so letters have more room to breathe.
- Kept the About the Project homepage card blue on the outside.
- Added another graph/card outline cleanup so old top-only bars do not come back.


## Version 0.9.6

Changed files:
- `index.html`
- `methodology.html`
- `national-averages.html`
- `trump-approval.html`
- `senate.html`
- `governor.html`
- `house.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI fixes:
- Centered the House Races homepage card content.
- Added House to the top navigation/header across the site.
- House page nav link now marks House as the current page.


## Version 0.9.7

Changed files:
- `house.html`
- `js/house-forecast.js`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

UI cleanup:
- Removed the blue `Sources` eyebrow between House sections.
- Removed the small `Based on current averages` text under `218 to Win`.
- Removed the bottom `Updated ...` line from each House source card.


## Version 0.9.8

Changed files:
- `data/house-forecast.json`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fixes:
- Removed the weird card/bar outline from the footer.
- Corrected the Race to WH House source link to `https://www.racetothewh.com/house`.


## Version 0.9.9

Changed files:
- `js/house-forecast.js`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

House UI update:
- Redesigned the main House seat prediction bar.
- Added a cleaner blue/red split, larger seat numbers, softer gloss/shadow, and a subtle 218 majority marker.
- Compact source bars stay compact and readable.


## Version 0.9.10

Changed files:
- `data/races.json`
- `index.html`
- `styles.css`
- `package.json`
- `scripts/update-polls.js`
- `README-AUTO-DATA.md`

Fixes:
- Georgia Governor tilt-blue change now affects the governor margin summary and homepage cover total.
- Homepage Governor card is now 25 Dem / 25 GOP and labeled `Projected governorships`.
- Recalculated governor margin bucket totals so GA appears in Tilt D.
- Fixed the House prediction bar so blue and red fill the full bar with no gray dead space.
