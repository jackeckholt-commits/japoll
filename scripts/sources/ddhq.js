import fs from "fs/promises";

import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, validateScrapedPair } from "../lib/extract.js";

const source = {
  key: "ddhq",
  name: "Decision Desk HQ",
  shortName: "DDHQ",
  cookieEnv: "DDHQ_COOKIE",
  urls: {
    generic: "https://votes.decisiondeskhq.com/polls/generic-ballot/national/lv-rv-adults",
    approval: "https://votes.decisiondeskhq.com/polls/presidential-approval/donald-j-trump-5/national/lv-rv-adults"
  },
  scrapeCandidates: {
    generic: [
      {
        label: "DDHQ public static generic page",
        method: "static",
        url: "https://polls.decisiondeskhq.com/averages/generic-ballot/national/lv-rv-adults"
      },
      {
        label: "DDHQ Votes generic page",
        method: "browser",
        url: "https://votes.decisiondeskhq.com/polls/generic-ballot/national/lv-rv-adults"
      }
    ],
    approval: [
      {
        label: "DDHQ public static approval page",
        method: "static",
        url: "https://polls.decisiondeskhq.com/averages/presidential-approval/donald-j.-trump-5/national/lv-rv-adults"
      },
      {
        label: "DDHQ public static approval page alternate slug",
        method: "static",
        url: "https://polls.decisiondeskhq.com/averages/presidential-approval/donald-j-trump-5/national/lv-rv-adults"
      },
      {
        label: "DDHQ Votes approval page",
        method: "browser",
        url: "https://votes.decisiondeskhq.com/polls/presidential-approval/donald-j-trump-5/national/lv-rv-adults"
      },
      {
        label: "DDHQ legacy approval page",
        method: "static",
        url: "https://polls.decisiondeskhq.com/averages/presidential-approval/donald-trump-150479/national/lv-rv-adults"
      }
    ]
  }
};

function normalizeText(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0025/g, "%")
    .replace(/\s+/g, " ")
    .trim();
}

async function writeDebugFile(name, text) {
  try {
    await fs.mkdir("data/scrape-debug", { recursive: true });
    await fs.writeFile(`data/scrape-debug/${name}.txt`, String(text || "").slice(0, 300000), "utf8");
  } catch {
    // Debug output should never break scraping.
  }
}

function parseNumber(value) {
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCandidateValue(blob, candidateLabels) {
  const text = normalizeText(blob);
  const labels = Array.isArray(candidateLabels) ? candidateLabels : [candidateLabels];

  for (const label of labels) {
    const escaped = escapeRegex(label);
    const labelPattern = `\\b${escaped}\\b`;

    const patterns = [
      // Public static page text: Democrat 43.70%
      new RegExp(`${labelPattern}\\s+(\\d{1,2}(?:\\.\\d+)?)\\s*%`, "i"),

      // Public/static table text sometimes has extra words between label and value.
      new RegExp(`${labelPattern}[^0-9]{0,120}(\\d{1,2}(?:\\.\\d+)?)\\s*%`, "i"),

      // JSON: "candidate":"Democratic"... "average":45.30
      new RegExp(`"${escaped}"[^{}\\[\\]]{0,1000}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`, "i"),

      // JSON: "name":"Democratic"... "average":"45.30"
      new RegExp(`(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"[^{}\\[\\]]{0,1000}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`, "i"),

      // JSON reversed order: "average":45.30 ... "name":"Democratic"
      new RegExp(`(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)"?[^{}\\[\\]]{0,1000}(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"`, "i")
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match) {
        const value = parseNumber(match[1]);

        if (value !== null && value >= 20 && value <= 80) {
          return value;
        }
      }
    }
  }

  return null;
}

function extractGenericFromText(text) {
  const blob = normalizeText(text);

  const democrats = findCandidateValue(blob, ["Democrat", "Democratic", "Democrats"]);
  const republicans = findCandidateValue(blob, ["Republican", "Republicans"]);

  return {
    democrats,
    republicans
  };
}

function extractApprovalFromText(text) {
  const blob = normalizeText(text);

  const approve = findCandidateValue(blob, ["Approve"]);
  const disapprove = findCandidateValue(blob, ["Disapprove"]);

  return {
    approve,
    disapprove
  };
}

async function readCandidate(candidate, debugName, waitForText = []) {
  if (candidate.method === "static") {
    const text = await getTextFromUrl(candidate.url, {
      cookie: process.env[source.cookieEnv],
      preferBrowser: false,
      timeout: 35000
    });

    return [
      `=== ${candidate.label} ===`,
      `URL: ${candidate.url}`,
      "=== STATIC TEXT ===",
      text
    ].join("\n");
  }

  const snapshot = await browserSnapshot(candidate.url, {
    cookie: process.env[source.cookieEnv],
    waitAfterLoad: 9000,
    waitForText,
    waitForTextTimeout: 15000,
    timeout: 35000
  });

  return [
    `=== ${candidate.label} ===`,
    `URL: ${candidate.url}`,
    "=== VISIBLE TEXT ===",
    snapshot.text,
    "=== HTML ===",
    snapshot.html,
    "=== SCRIPTS ===",
    snapshot.scripts,
    "=== NETWORK ===",
    snapshot.networkText
  ].join("\n");
}

async function scrapeWithCandidates({
  candidates,
  debugName,
  waitForText,
  extract,
  validate,
  logSuccess,
  logReject
}) {
  const debugParts = [];
  const failures = [];

  for (const candidate of candidates) {
    try {
      const text = await readCandidate(candidate, debugName, waitForText);
      debugParts.push(text);

      const values = extract(text);
      const validation = validate(values);

      if (validation.ok) {
        await writeDebugFile(debugName, debugParts.join("\n\n---DDHQ CANDIDATE BREAK---\n\n"));

        return {
          ok: true,
          values,
          candidate,
          note: `Validated DDHQ scrape from ${candidate.label}`,
          status: "live"
        };
      }

      failures.push(`${candidate.label}: ${validation.reason}`);
    } catch (error) {
      failures.push(`${candidate.label}: ${error.message}`);
      debugParts.push([
        `=== ${candidate.label} ERROR ===`,
        `URL: ${candidate.url}`,
        error.stack || error.message
      ].join("\n"));
    }
  }

  await writeDebugFile(debugName, debugParts.join("\n\n---DDHQ CANDIDATE BREAK---\n\n"));

  return {
    ok: false,
    values: {},
    candidate: null,
    note: `Rejected live scrape: ${failures.join(" | ")}`,
    status: "fallback"
  };
}

async function scrapeGeneric(fallback) {
  try {
    const result = await scrapeWithCandidates({
      candidates: source.scrapeCandidates.generic,
      debugName: "ddhq-generic",
      waitForText: ["Democrat", "Republican", "Candidate", "Average"],
      extract: extractGenericFromText,
      validate: values => validateScrapedPair(
        values,
        fallback,
        {
          firstKey: "democrats",
          secondKey: "republicans",
          minValue: 30,
          maxValue: 65,
          maxGap: 35
        }
      )
    });

    if (result.ok) {
      console.log(`[DDHQ] Generic ballot scrape worked from ${result.candidate.label}: D ${result.values.democrats} / R ${result.values.republicans}`);
    } else {
      console.warn(`[DDHQ] Generic ballot scrape rejected. Using fallback.`);
      console.warn("[DDHQ] Debug saved to data/scrape-debug/ddhq-generic.txt");
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      democrats: result.ok ? result.values.democrats : null,
      republicans: result.ok ? result.values.republicans : null,
      included: result.ok,
      scrapeStatus: result.status,
      scrapeNote: result.ok ? result.note : result.note
    }, fallback);
  } catch (error) {
    console.warn(`${source.name} generic scrape failed. Using fallback:`, error.message);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Generic scrape failed: ${error.message}`
    };
  }
}

async function scrapeApproval(fallback) {
  try {
    const result = await scrapeWithCandidates({
      candidates: source.scrapeCandidates.approval,
      debugName: "ddhq-approval",
      waitForText: ["Approve", "Disapprove", "Candidate", "Average"],
      extract: extractApprovalFromText,
      validate: values => validateScrapedPair(
        values,
        fallback,
        {
          firstKey: "approve",
          secondKey: "disapprove",
          minValue: 30,
          maxValue: 75,
          maxGap: 45,
          requireSecondHigher: true
        }
      )
    });

    if (result.ok) {
      console.log(`[DDHQ] Trump approval scrape worked from ${result.candidate.label}: Approve ${result.values.approve} / Disapprove ${result.values.disapprove}`);
    } else {
      console.warn(`[DDHQ] Trump approval scrape rejected. Using fallback.`);
      console.warn("[DDHQ] Debug saved to data/scrape-debug/ddhq-approval.txt");
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.approval,
      approve: result.ok ? result.values.approve : null,
      disapprove: result.ok ? result.values.disapprove : null,
      included: result.ok,
      scrapeStatus: result.status,
      scrapeNote: result.ok ? result.note : result.note
    }, fallback);
  } catch (error) {
    console.warn(`${source.name} approval scrape failed. Using fallback:`, error.message);
    return {
      ...fallback,
      scrapeStatus: "fallback",
      scrapeNote: `Approval scrape failed: ${error.message}`
    };
  }
}

export async function getDDHQData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
