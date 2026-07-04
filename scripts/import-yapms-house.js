import fs from "node:fs/promises";

const sourcePath = process.argv[2];
const racesPath = "data/races.json";

if (!sourcePath) {
  throw new Error("Usage: node scripts/import-yapms-house.js <YapmsMap.json>");
}

const PARTY_BY_CANDIDATE = {
  "0": "dem",
  "1": "rep"
};

const STRENGTH_BY_MARGIN = ["Solid", "Likely", "Lean", "Tilt"];

function normalizeDistrictId(id) {
  if (id === "TN-") return "TN-02";

  const match = /^([A-Z]{2})-(AL|\d{1,2})$/.exec(id);
  if (!match) return null;

  const [, state, district] = match;
  return `${state}-${district === "AL" ? "00" : district.padStart(2, "0")}`;
}

function ratingFor(candidate) {
  const party = PARTY_BY_CANDIDATE[candidate.id];
  const strength = STRENGTH_BY_MARGIN[Number(candidate.margin)];
  if (!party || !strength) return null;

  return {
    party,
    marginCategory: `${party}${strength}`
  };
}

function displayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago"
  }).format(date);
}

const [yapms, raceData] = await Promise.all([
  fs.readFile(sourcePath, "utf8").then(JSON.parse),
  fs.readFile(racesPath, "utf8").then(JSON.parse)
]);

if (yapms.map?.type !== "house") {
  throw new Error(`Expected a YAPms House map, received ${yapms.map?.type || "unknown"}.`);
}

const house = raceData.maps?.house;
const activeRaces = house?.races?.filter(race => race.active === true) || [];
if (activeRaces.length !== 435) {
  throw new Error(`Japoll must contain 435 active House districts; found ${activeRaces.length}.`);
}

const assignments = new Map();
for (const region of yapms.regions || []) {
  if (region.disabled === true || region.id === "DC-AL") continue;

  const id = normalizeDistrictId(region.id);
  if (!id) throw new Error(`Could not normalize YAPms district ID ${region.id}.`);
  if (assignments.has(id)) throw new Error(`Duplicate YAPms district ${id}.`);

  const candidate = region.candidates?.find(entry => Number(entry.count) > 0);
  const rating = candidate ? ratingFor(candidate) : null;
  assignments.set(id, rating);
}

const unassigned = [...assignments.entries()]
  .filter(([, rating]) => rating === null)
  .map(([id]) => id);

if (unassigned.length !== 1 || unassigned[0] !== "MA-07") {
  throw new Error(`Expected MA-07 to be the only unassigned district; found ${unassigned.join(", ") || "none"}.`);
}

assignments.set("MA-07", { party: "dem", marginCategory: "demSolid" });

const japollIds = new Set(activeRaces.map(race => race.id));
const missing = [...japollIds].filter(id => !assignments.has(id));
const extra = [...assignments.keys()].filter(id => !japollIds.has(id));
if (missing.length || extra.length || assignments.size !== 435) {
  throw new Error(`House district mismatch. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`);
}

const now = new Date();
const lastUpdated = displayDate(now);
for (const race of activeRaces) {
  const rating = assignments.get(race.id);
  race.party = rating.party;
  race.status = "prediction";
  race.marginCategory = rating.marginCategory;
  race.marginLabel = null;
  race.predictedMargin = null;
  race.lastUpdated = lastUpdated;
}

const categoryKeys = [
  "demSolid",
  "demLikely",
  "demLean",
  "demTilt",
  "tossup",
  "no-data",
  "repTilt",
  "repLean",
  "repLikely",
  "repSolid"
];
const counts = Object.fromEntries(categoryKeys.map(key => [key, 0]));
for (const race of activeRaces) counts[race.marginCategory] += 1;

house.projection = {
  ...counts,
  noData: counts["no-data"],
  total: activeRaces.length
};
house.marginSummary.total = activeRaces.length;
house.marginSummary.segments.forEach(segment => {
  segment.count = counts[segment.key] || 0;
});
house.lastUpdated = lastUpdated;
raceData.updatedAt = now.toISOString();

await fs.writeFile(racesPath, `${JSON.stringify(raceData, null, 2)}\n`);

const dem = activeRaces.filter(race => race.party === "dem").length;
const rep = activeRaces.filter(race => race.party === "rep").length;
console.log(`Imported ${activeRaces.length} House districts: ${dem} Democratic, ${rep} Republican.`);
console.log("Assigned the sole unfilled district, MA-07, as Solid Democrat.");
console.log("YAPms TN- was normalized to TN-02; disabled DC-AL was excluded.");
console.log("Ratings:", counts);
