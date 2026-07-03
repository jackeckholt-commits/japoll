import fs from "fs/promises";

import { getHouseForecastSources, totalsFromCategories } from "./sources/house-forecasts.js";

const CATEGORY_KEYS = [
  "demSafe",
  "demLikely",
  "demLean",
  "tossup",
  "repLean",
  "repLikely",
  "repSafe"
];

function roundOne(value) {
  return Number(Number(value).toFixed(1));
}

function averageCategories(sources, fallback) {
  const liveSources = sources.filter(source => source.included === true && source.scrapeStatus === "live");
  if (liveSources.length === 0) return fallback;

  return Object.fromEntries(CATEGORY_KEYS.map(key => [
    key,
    roundOne(liveSources.reduce((sum, source) => sum + Number(source.categories[key] || 0), 0) / liveSources.length)
  ]));
}

async function main() {
  const path = "data/house-forecast.json";
  const existing = JSON.parse(await fs.readFile(path, "utf8"));
  const sources = await getHouseForecastSources(existing.sources || []);
  const categories = averageCategories(sources, existing.average?.categories || {});
  const totals = totalsFromCategories(categories);
  const liveCount = sources.filter(source => source.scrapeStatus === "live").length;

  const next = {
    ...existing,
    updatedAt: new Date().toISOString(),
    summary: {
      ...existing.summary,
      democrats: totals.democrats,
      tossup: totals.tossup,
      republicans: totals.republicans,
      nonTossupDemocrats: totals.democrats,
      nonTossupRepublicans: totals.republicans,
      averageTossup: totals.tossup
    },
    average: {
      categories,
      totals: {
        ...existing.average?.totals,
        democrats: totals.democrats,
        tossup: totals.tossup,
        republicans: totals.republicans
      }
    },
    sources,
    prediction: existing.prediction
  };

  await fs.writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Updated ${path}; ${liveCount}/${sources.length} House sources are live.`);
  console.log("Manual House prediction preserved:", next.prediction?.categories);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
