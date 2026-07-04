import fs from "node:fs";

const REQUIRED_MARGIN_KEYS = [
  "demSolid",
  "demLikely",
  "demLean",
  "demTilt",
  "repTilt",
  "repLean",
  "repLikely",
  "repSolid"
];

const ALLOWED_RATING_KEYS = [...REQUIRED_MARGIN_KEYS, "tossup", "no-data"];

const PARTY_BY_MARGIN = {
  demSolid: "dem",
  demLikely: "dem",
  demLean: "dem",
  demTilt: "dem",
  repTilt: "rep",
  repLean: "rep",
  repLikely: "rep",
  repSolid: "rep"
};

const PROJECTED_TOTAL_BY_MAP = {
  senate: 100,
  governor: 50
};

const errors = [];
const warnings = [];

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: ${error.message}`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function countPredictions(races) {
  const counts = Object.fromEntries(ALLOWED_RATING_KEYS.map(key => [key, 0]));
  let dem = 0;
  let rep = 0;

  for (const race of races || []) {
    if (!race.active) continue;

    const category = race.marginCategory;
    assert(ALLOWED_RATING_KEYS.includes(category), `${race.state}: unknown marginCategory "${category}"`);

    if (ALLOWED_RATING_KEYS.includes(category)) {
      counts[category] += 1;
      const expectedParty = PARTY_BY_MARGIN[category];
      if (expectedParty) {
        assert(
          race.party === expectedParty,
          `${race.state}: party "${race.party}" does not match marginCategory "${category}"`
        );
      }
    }

    if (race.party === "dem") dem += 1;
    if (race.party === "rep") rep += 1;
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { counts, dem, rep, total };
}

function validateRaceMap(mapKey, mapData) {
  assert(mapData, `${mapKey}: map is missing`);
  if (!mapData) return;

  assert(!mapData.cycleNote, `${mapKey}: stale cycleNote field should be removed`);
  assert(!mapData.nonActiveNote, `${mapKey}: stale nonActiveNote field should be removed`);

  const { counts, dem, rep, total } = countPredictions(mapData.races || []);
  const activeRaces = (mapData.races || []).filter(race => race.active);

  assert(mapData.projection, `${mapKey}: missing projection`);
  if (mapData.projection) {
    for (const key of ALLOWED_RATING_KEYS) {
      const projectionValue = key === "no-data"
        ? mapData.projection.noData ?? mapData.projection["no-data"] ?? 0
        : mapData.projection[key] ?? 0;
      assert(
        Number(projectionValue) === counts[key],
        `${mapKey}: projection.${key}=${projectionValue}, expected ${counts[key]}`
      );
    }
    assert(Number(mapData.projection.total || 0) === total, `${mapKey}: projection.total=${mapData.projection.total}, expected ${total}`);
  }

  const summary = mapData.marginSummary;
  assert(summary, `${mapKey}: missing marginSummary`);
  if (summary) {
    const summaryCounts = Object.fromEntries((summary.segments || []).map(segment => [segment.key, Number(segment.count || 0)]));
    for (const key of ALLOWED_RATING_KEYS) {
      assert(Number(summaryCounts[key] || 0) === counts[key], `${mapKey}: marginSummary ${key}=${summaryCounts[key] || 0}, expected ${counts[key]}`);
    }
    assert(Number(summary.total || 0) === total, `${mapKey}: marginSummary.total=${summary.total}, expected ${total}`);
  }

  const projected = mapData.projectedControl;
  if (projected) {
    const expectedTotal = PROJECTED_TOTAL_BY_MAP[mapKey];
    assert(
      Number(projected.democrats || 0) + Number(projected.republicans || 0) === expectedTotal,
      `${mapKey}: projectedControl total should be ${expectedTotal}`
    );

    const active = projected.activeRaceWins || {};
    assert(Number(active.democrats || 0) === dem, `${mapKey}: activeRaceWins.democrats=${active.democrats}, expected ${dem}`);
    assert(Number(active.republicans || 0) === rep, `${mapKey}: activeRaceWins.republicans=${active.republicans}, expected ${rep}`);
  }

  for (const race of mapData.races || []) {
    warn(race.state && race.name, `${mapKey}: race missing state/name`);
    for (const candidate of race.candidates || []) {
      warn(candidate.name, `${mapKey} ${race.state}: candidate missing name`);
      warn(candidate.party, `${mapKey} ${race.state}: ${candidate.name || "candidate"} missing party`);
      warn(
        !candidate.wikipedia || /^https:\/\/en\.wikipedia\.org\/wiki\//.test(candidate.wikipedia),
        `${mapKey} ${race.state}: ${candidate.name || "candidate"} has a non-Wikipedia or non-HTTPS link`
      );
      if (candidate.demAligned) {
        warn(
          String(candidate.party || "").toLowerCase().includes("dem-aligned"),
          `${mapKey} ${race.state}: ${candidate.name || "candidate"} has demAligned=true but party label does not mention Dem-aligned`
        );
      }
    }

    if (race.active) {
      assert(race.links?.primaryResults, `${mapKey} ${race.id || race.state}: missing primary/results link`);
      if (mapKey !== "house") {
        assert(race.links?.candidateData, `${mapKey} ${race.id || race.state}: missing candidate-data link`);
      }
      assert(race.links?.wikipedia, `${mapKey} ${race.id || race.state}: missing Wikipedia link`);
    }
  }

  assert(total === activeRaces.length, `${mapKey}: ${activeRaces.length} active races but ${total} rated/unrated entries`);
}

const packageJson = readJson("package.json");
const polling = readJson("data/polling.json");
const history = readJson("data/polling-history.json");
const races = readJson("data/races.json");
const houseGeometry = readJson("assets/house-districts-2026.geojson");
readJson("data/adjustments.json");
readJson("data/manual-overrides.json");

if (packageJson) {
  assert(packageJson.version, "package.json: version is missing");
}

if (polling) {
  assert(polling.genericBallot?.average, "polling.json: genericBallot.average is missing");
  assert(polling.trumpApproval?.average, "polling.json: trumpApproval.average is missing");
}

if (history) {
  assert(Array.isArray(history.runs), "polling-history.json: runs must be an array");
  if (Array.isArray(history.runs)) {
    const dates = new Set();
    for (const run of history.runs) {
      warn(run.date, "polling-history.json: run missing date");
      if (run.date) {
        warn(!dates.has(run.date), `polling-history.json: duplicate date ${run.date}`);
        dates.add(run.date);
      }
    }
  }
}

if (races) {
  validateRaceMap("senate", races.maps?.senate);
  validateRaceMap("governor", races.maps?.governor);
  validateRaceMap("house", races.maps?.house);
  warn(races.maps?.house?.workInProgress === false, "house map should be marked ready");

  const houseRaces = (races.maps?.house?.races || []).filter(race => race.active);
  assert(houseRaces.length === 435, `house: expected 435 active districts, found ${houseRaces.length}`);
  assert(new Set(houseRaces.map(race => race.id)).size === 435, "house: district IDs must be unique");
}

if (houseGeometry) {
  const features = houseGeometry.features || [];
  assert(features.length === 435, `house geometry: expected 435 features, found ${features.length}`);
  assert(new Set(features.map(feature => feature.properties?.id)).size === 435, "house geometry: district IDs must be unique");
  assert(new Set(features.map(feature => feature.properties?.state)).size === 50, "house geometry: expected all 50 states");
}

if (warnings.length) {
  console.warn("\nWarnings:");
  for (const message of warnings) console.warn(`- ${message}`);
}

if (errors.length) {
  console.error("\nValidation failed:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("Data validation passed.");
