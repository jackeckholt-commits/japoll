import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RACES_PATH = path.join(ROOT, "data", "races.json");

function ballotpediaRaceUrl(mapKey, stateName) {
  const state = String(stateName || "").trim().replaceAll(" ", "_");
  if (!state) return "";
  if (mapKey === "house") {
    return `https://ballotpedia.org/United_States_House_elections_in_${state},_2026`;
  }
  if (mapKey === "senate") {
    return `https://ballotpedia.org/United_States_Senate_election_in_${state},_2026`;
  }
  if (mapKey === "governor") {
    return `https://ballotpedia.org/${state}_gubernatorial_election,_2026`;
  }
  return "";
}

function houseWikipediaUrl(stateName, district) {
  const state = String(stateName || "").trim().replaceAll(" ", "_");
  const electionWord = district === "00" ? "election" : "elections";
  return `https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_${electionWord}_in_${state}`;
}

const data = JSON.parse(fs.readFileSync(RACES_PATH, "utf8"));
let updated = 0;

for (const [mapKey, map] of Object.entries(data.maps || {})) {
  for (const race of map.races || []) {
    if (!race.active) continue;
    const primaryResults = ballotpediaRaceUrl(mapKey, race.stateName || race.name);
    if (!primaryResults) continue;
    race.links ||= {};
    race.links.primaryResults = primaryResults;
    race.links.primaryResultsLabel = "Primary & results";
    if (mapKey === "house") {
      race.links.wikipedia = houseWikipediaUrl(race.stateName || race.name, race.district);
      race.links.candidatePage = primaryResults;
      delete race.links.primaryResults;
      delete race.links.primaryResultsLabel;
      delete race.links.candidateData;
      delete race.links.candidateDataLabel;
    }
    updated += 1;
  }
}

data.updatedAt = new Date().toISOString();
fs.writeFileSync(RACES_PATH, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated primary and results links for ${updated} active races.`);
