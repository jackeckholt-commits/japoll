import { chromium } from "playwright";

import { saveScrapeDebug } from "../lib/debug.js";

const TOTAL_HOUSE_SEATS = 435;
const CATEGORY_KEYS = [
  "demSafe",
  "demLikely",
  "demLean",
  "tossup",
  "repLean",
  "repLikely",
  "repSafe"
];

const sources = {
  racetowh: {
    key: "racetowh",
    name: "Race to the WH",
    shortName: "Race to WH",
    url: "https://www.racetothewh.com/house",
    embedUrl: "https://e.infogram.com/cf74856e-8d17-40f6-b10d-3d23a3ee3cff?src=embed&embed_type=responsive_iframe"
  },
  "270towin": {
    key: "270towin",
    name: "270toWin",
    shortName: "270toWin",
    url: "https://www.270towin.com/2026-house-election/",
    consensusUrl: "https://www.270towin.com/2026-house-election/consensus-2026-house-forecast",
    tableUrl: "https://www.270towin.com/2026-house-election/table/consensus-2026-house-forecast"
  },
  cook: {
    key: "cook",
    name: "Cook Political Report",
    shortName: "Cook",
    url: "https://www.cookpolitical.com/ratings/house-race-ratings",
    textProxyUrl: "https://r.jina.ai/https://www.cookpolitical.com/ratings/house-race-ratings"
  }
};

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findLabeledCount(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}\\s*\\(\\s*(\\d{1,3})\\s*\\)`, "i"));
    if (match) return Number(match[1]);
  }
  return 0;
}

function add(...values) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

export function validateHouseCategories(categories) {
  const values = CATEGORY_KEYS.map(key => categories?.[key]);
  const validValues = values.every(value => Number.isInteger(value) && value >= 0 && value <= TOTAL_HOUSE_SEATS);
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);

  if (!validValues || total !== TOTAL_HOUSE_SEATS) {
    throw new Error(`House ratings failed validation: expected ${TOTAL_HOUSE_SEATS} seats, found ${total}`);
  }

  return categories;
}

export function totalsFromCategories(categories) {
  return {
    democrats: Number(add(categories.demSafe, categories.demLikely, categories.demLean).toFixed(1)),
    tossup: Number(Number(categories.tossup).toFixed(1)),
    republicans: Number(add(categories.repLean, categories.repLikely, categories.repSafe).toFixed(1))
  };
}

export function parse270ToWinRatings(rawText) {
  const text = normalizeText(rawText);
  const summaryMatch = text.match(
    /Democrats\s+\d{1,3}\s+\d{1,3}\s+Republicans\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+United States/i
  );

  if (summaryMatch) {
    return validateHouseCategories({
      demSafe: Number(summaryMatch[1]),
      demLikely: Number(summaryMatch[2]),
      demLean: Number(summaryMatch[3]),
      tossup: Number(summaryMatch[4]),
      repLean: Number(summaryMatch[5]),
      repLikely: Number(summaryMatch[6]),
      repSafe: Number(summaryMatch[7])
    });
  }

  const categories = {
    demSafe: findLabeledCount(text, ["Safe Dem", "Solid Dem"]),
    demLikely: findLabeledCount(text, ["Likely Dem"]),
    demLean: add(
      findLabeledCount(text, ["Leans Dem", "Lean Dem"]),
      findLabeledCount(text, ["Tilt Dem"])
    ),
    tossup: findLabeledCount(text, ["Toss-up", "Toss Up", "Tossup"]),
    repLean: add(
      findLabeledCount(text, ["Leans Rep", "Lean Rep"]),
      findLabeledCount(text, ["Tilt Rep"])
    ),
    repLikely: findLabeledCount(text, ["Likely Rep"]),
    repSafe: findLabeledCount(text, ["Safe Rep", "Solid Rep"])
  };

  return validateHouseCategories(categories);
}

export function parseCookRatings(rawText) {
  const text = normalizeText(rawText);
  const categories = {
    demSafe: findLabeledCount(text, ["Solid Democrat", "Safe Democrat"]),
    demLikely: findLabeledCount(text, ["Likely Democrat"]),
    demLean: findLabeledCount(text, ["Lean Democrat"]),
    tossup: findLabeledCount(text, ["Toss Up", "Toss-up", "Tossup"]),
    repLean: findLabeledCount(text, ["Lean Republican"]),
    repLikely: findLabeledCount(text, ["Likely Republican"]),
    repSafe: findLabeledCount(text, ["Solid Republican", "Safe Republican"])
  };

  return validateHouseCategories(categories);
}

function collectRatingCounts(value, counts = new Map()) {
  if (typeof value === "string") {
    const rating = normalizeText(value).replace(/^Toss Up$/i, "Tossup");
    if (/^(Safe|Likely|Lean|Tilt) [DR]$/i.test(rating) || /^Tossup$/i.test(rating)) {
      counts.set(rating, (counts.get(rating) || 0) + 1);
    }
    return counts;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectRatingCounts(item, counts));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectRatingCounts(item, counts));
  }

  return counts;
}

export function parseRaceToWHLiveData(data) {
  const counts = collectRatingCounts(data);
  const get = label => counts.get(label) || 0;
  const categories = {
    demSafe: get("Safe D"),
    demLikely: get("Likely D"),
    demLean: add(get("Lean D"), get("Tilt D")),
    tossup: get("Tossup"),
    repLean: add(get("Lean R"), get("Tilt R")),
    repLikely: get("Likely R"),
    repSafe: get("Safe R")
  };

  return validateHouseCategories(categories);
}

function isoDateFromText(text, pattern) {
  const match = normalizeText(text).match(pattern);
  if (!match) return new Date().toISOString().slice(0, 10);

  const candidate = match[1].match(/\b\d{4}\b/) ? match[1] : `${match[1]}, ${new Date().getUTCFullYear()}`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function browserUserAgent(browser) {
  const majorVersion = browser.version().split(".")[0] || "149";
  const platform = process.platform === "win32" ? "Windows NT 10.0; Win64; x64" : "X11; Linux x86_64";
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVersion}.0.0.0 Safari/537.36`;
}

async function newPublisherPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: browserUserAgent(browser),
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    window.chrome = window.chrome || { runtime: {} };
  });

  return { context, page: await context.newPage() };
}

async function scrapeRaceToWH() {
  const source = sources.racetowh;
  const browser = await chromium.launch({ headless: true });
  let categories = null;

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36"
    });

    page.on("response", async response => {
      if (categories || !response.url().startsWith("https://live-data.jifo.co/")) return;
      try {
        const data = await response.json();
        categories = parseRaceToWHLiveData(data);
      } catch {
        // Infogram loads several unrelated datasets; only the validated 435-seat one is accepted.
      }
    });

    await page.goto(source.embedUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    for (let attempt = 0; attempt < 30 && !categories; attempt += 1) {
      await page.waitForTimeout(1000);
    }

    if (!categories) throw new Error("No validated 435-seat Infogram ratings dataset was received");
    const text = await page.locator("body").innerText().catch(() => "");

    return {
      ...source,
      updated: isoDateFromText(text, /Last Updated on\s+([A-Z][a-z]{2,8}\s+\d{1,2})/i),
      categories
    };
  } finally {
    await browser.close();
  }
}

async function scrape270ToWin() {
  const source = sources["270towin"];
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36"
    });
    await page.goto(source.consensusUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByText("Consensus Forecast", { exact: true }).first().waitFor({ timeout: 30000 });
    const text = await page.locator("body").innerText();

    return {
      ...source,
      updated: isoDateFromText(text, /As of\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i),
      categories: parse270ToWinRatings(text)
    };
  } finally {
    await browser.close();
  }
}

async function scrapeCook() {
  const source = sources.cook;
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage"
    ]
  });

  try {
    const { context, page } = await newPublisherPage(browser);
    let text = "";
    let html = "";
    let title = "";
    let status = null;

    const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    status = response?.status() ?? status;

    if (status !== 403) {
      for (let wait = 0; wait < 12; wait += 1) {
        await page.waitForTimeout(2500);
        text = await page.locator("body").innerText().catch(() => "");

        try {
          const categories = parseCookRatings(text);
          await context.close();
          return {
            ...source,
            updated: isoDateFromText(text, /House Race Ratings\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i),
            categories
          };
        } catch {
          // Keep waiting while Cook's browser challenge resolves.
        }
      }
    }

    const proxyResponse = await fetch(source.textProxyUrl, {
      headers: {
        "Accept": "text/plain",
        "User-Agent": "National Poll Tracker/1.0 (+https://japoll.com)"
      },
      signal: AbortSignal.timeout(45000)
    });

    if (proxyResponse.ok) {
      const proxyText = await proxyResponse.text();
      try {
        const categories = parseCookRatings(proxyText);
        await context.close();
        return {
          ...source,
          updated: isoDateFromText(proxyText, /House Race Ratings\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/i),
          categories
        };
      } catch {
        text = `${text}\n\n=== TEXT FALLBACK ===\n${proxyText}`;
      }
    }

    title = await page.title().catch(() => "");
    html = await page.content().catch(() => "");
    await saveScrapeDebug("cook-house", [
      `HTTP status: ${status}`,
      `Title: ${title}`,
      `Final URL: ${page.url()}`,
      "=== VISIBLE TEXT ===",
      text,
      "=== HTML ===",
      html
    ].join("\n"));
    await context.close();
    throw new Error(`Cook ratings did not load from the browser or text fallback (status ${status}, title ${title || "unknown"})`);
  } finally {
    await browser.close();
  }
}

function makeLiveSource(result) {
  return {
    key: result.key,
    name: result.name,
    shortName: result.shortName,
    updated: result.updated,
    url: result.url,
    categories: result.categories,
    totals: totalsFromCategories(result.categories),
    included: true,
    scrapeStatus: "live",
    note: "Validated automated House ratings scrape."
  };
}

function makeFallbackSource(source, fallback, error) {
  return {
    ...fallback,
    key: source.key,
    name: source.name,
    shortName: source.shortName,
    url: source.url,
    included: false,
    scrapeStatus: "fallback",
    scrapeNote: `Automated House scrape failed; previous values retained: ${error.message}`
  };
}

export async function getHouseForecastSources(existingSources = []) {
  const fallbackByKey = Object.fromEntries(existingSources.map(source => [source.key, source]));
  const scrapers = [
    [sources.racetowh, scrapeRaceToWH],
    [sources["270towin"], scrape270ToWin],
    [sources.cook, scrapeCook]
  ];
  const results = [];

  for (const [source, scrape] of scrapers) {
    console.log(`Starting ${source.name} House ratings...`);
    try {
      const result = makeLiveSource(await scrape());
      console.log(`Finished ${source.name}:`, result.categories);
      results.push(result);
    } catch (error) {
      console.warn(`${source.name} House scrape failed: ${error.message}`);
      const fallback = fallbackByKey[source.key];
      if (!fallback?.categories) throw error;
      results.push(makeFallbackSource(source, fallback, error));
    }
  }

  return results;
}
