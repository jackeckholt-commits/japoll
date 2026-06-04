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


function textToLines(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|td|th|h1|h2|h3|h4|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0025/g, "%")
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getTopAverageLines(text, titleHints = []) {
  const lines = textToLines(text);
  const lowerHints = titleHints.map(hint => hint.toLowerCase());

  let startIndex = lines.findIndex(line => {
    const lower = line.toLowerCase();
    return lowerHints.some(hint => lower.includes(hint));
  });

  if (startIndex < 0) {
    startIndex = lines.findIndex(line => line.toLowerCase().includes("populations in this average"));
  }

  if (startIndex < 0) {
    startIndex = 0;
  }

  let endIndex = lines.findIndex((line, index) => {
    return index > startIndex && line.toLowerCase().includes("show confidence interval");
  });

  if (endIndex < 0) {
    endIndex = Math.min(lines.length, startIndex + 80);
  }

  return lines.slice(startIndex, endIndex);
}

function isExactLabel(line, labels) {
  const normalized = String(line || "").replace(/:$/, "").trim().toLowerCase();

  return labels.some(label => normalized === label.toLowerCase());
}

function parsePercentFromLine(line) {
  const match = String(line || "").match(/(-?\d{1,2}(?:\.\d+)?)\s*%/);
  if (!match) return null;

  const value = parseNumber(match[1]);
  return value !== null && value >= 20 && value <= 80 ? value : null;
}

function findPercentAfterExactLabel(lines, labels) {
  for (let i = 0; i < lines.length; i += 1) {
    if (!isExactLabel(lines[i], labels)) {
      continue;
    }

    // Sometimes label and value can be on the same line.
    const sameLine = parsePercentFromLine(lines[i]);
    if (sameLine !== null) {
      return sameLine;
    }

    // DDHQ's public static pages put the value on the next line.
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j += 1) {
      const value = parsePercentFromLine(lines[j]);

      if (value !== null) {
        return value;
      }

      // Stop if another candidate label starts before a value appears.
      if (isExactLabel(lines[j], ["Democrat", "Democrats", "Democratic", "Republican", "Republicans", "Approve", "Disapprove"])) {
        break;
      }
    }
  }

  return null;
}

function extractGenericFromStaticTopBlock(text) {
  const lines = getTopAverageLines(text, ["Generic Congressional Ballot"]);

  return {
    democrats: findPercentAfterExactLabel(lines, ["Democrat", "Democrats", "Democratic"]),
    republicans: findPercentAfterExactLabel(lines, ["Republican", "Republicans"])
  };
}

function extractApprovalFromStaticTopBlock(text) {
  const lines = getTopAverageLines(text, ["Donald Trump Approval Rating"]);

  return {
    approve: findPercentAfterExactLabel(lines, ["Approve"]),
    disapprove: findPercentAfterExactLabel(lines, ["Disapprove"])
  };
}


function stripTags(value) {
  return String(value || "")
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

function parsePercentValue(value) {
  const match = String(value || "").match(/(-?\d{1,2}(?:\.\d+)?)\s*%?/);
  if (!match) return null;

  const number = Number(match[1]);
  return Number.isFinite(number) && number >= 20 && number <= 80 ? number : null;
}

function extractRowsFromHtml(text) {
  const raw = String(text || "");
  const rows = [];

  const trPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = trPattern.exec(raw)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      const html = cellMatch[1];
      cells.push({
        html,
        text: stripTags(html)
      });
    }

    if (cells.length) {
      rows.push({
        html: rowHtml,
        text: cells.map(cell => cell.text).join(" | "),
        cells
      });
    }
  }

  return rows;
}

function getValueFromRow(row, labels) {
  const normalizedLabels = labels.map(label => String(label).toLowerCase());
  const rowText = String(row.text || "").toLowerCase();

  if (!normalizedLabels.some(label => rowText.includes(label))) {
    return null;
  }

  // Prefer explicit percentage text in the row.
  for (const cell of row.cells) {
    const value = parsePercentValue(cell.text);
    if (value !== null && !normalizedLabels.includes(cell.text.toLowerCase().replace(/:$/, ""))) {
      return value;
    }
  }

  // Some DDHQ cells have the number in a div/span without a percent sign.
  for (let i = 0; i < row.cells.length; i += 1) {
    const cell = row.cells[i];
    const cellText = cell.text.toLowerCase().replace(/:$/, "");

    if (normalizedLabels.includes(cellText)) {
      for (let j = i + 1; j < Math.min(row.cells.length, i + 6); j += 1) {
        const value = parsePercentValue(row.cells[j].text);
        if (value !== null) {
          return value;
        }
      }
    }
  }

  return null;
}

function extractGenericFromHtmlRows(text) {
  const rows = extractRowsFromHtml(text);

  return {
    democrats: rows.reduce((value, row) => value ?? getValueFromRow(row, ["Democrat", "Democratic", "Democrats"]), null),
    republicans: rows.reduce((value, row) => value ?? getValueFromRow(row, ["Republican", "Republicans"]), null)
  };
}

function extractApprovalFromHtmlRows(text) {
  const rows = extractRowsFromHtml(text);

  return {
    approve: rows.reduce((value, row) => value ?? getValueFromRow(row, ["Approve"]), null),
    disapprove: rows.reduce((value, row) => value ?? getValueFromRow(row, ["Disapprove"]), null)
  };
}

function extractGenericFromEmbeddedTextRows(text) {
  const clean = normalizeText(text);

  // Handles strings like: Democratic 45.30% Republican 37.80%
  const direct = clean.match(
    /\bDemocratic?s?\b\s+(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,250}?\bRepublicans?\b\s+(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (direct) {
    return {
      democrats: Number(direct[1]),
      republicans: Number(direct[2])
    };
  }

  const genericD = clean.match(/\bDemocratic?s?\b[\s\S]{0,120}?(\d{1,2}(?:\.\d+)?)\s*%/i);
  const genericR = clean.match(/\bRepublicans?\b[\s\S]{0,120}?(\d{1,2}(?:\.\d+)?)\s*%/i);

  return {
    democrats: genericD ? Number(genericD[1]) : null,
    republicans: genericR ? Number(genericR[1]) : null
  };
}

function extractApprovalFromEmbeddedTextRows(text) {
  const clean = normalizeText(text);

  // Handles strings like: Disapprove 56.80% Approve 38.90%
  const disFirst = clean.match(
    /\bDisapprove\b\s+(\d{1,2}(?:\.\d+)?)\s*%?[\s\S]{0,250}?\bApprove\b\s+(\d{1,2}(?:\.\d+)?)\s*%?/i
  );

  if (disFirst) {
    return {
      disapprove: Number(disFirst[1]),
      approve: Number(disFirst[2])
    };
  }

  const approve = clean.match(/\bApprove\b[\s\S]{0,120}?(\d{1,2}(?:\.\d+)?)\s*%/i);
  const disapprove = clean.match(/\bDisapprove\b[\s\S]{0,120}?(\d{1,2}(?:\.\d+)?)\s*%/i);

  return {
    approve: approve ? Number(approve[1]) : null,
    disapprove: disapprove ? Number(disapprove[1]) : null
  };
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

    const patternSources = [
      // Public static page text: Democrat 44.70%
      `${labelPattern}\\s+(\\d{1,2}(?:\\.\\d+)?)\\s*%`,

      // Public/static table text sometimes has extra words between label and value.
      `${labelPattern}[^0-9]{0,120}(\\d{1,2}(?:\\.\\d+)?)\\s*%`,

      // JSON: "candidate":"Democratic"... "average":45.30
      `"${escaped}"[^{}\\[\\]]{0,1000}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`,

      // JSON: "name":"Democratic"... "average":"45.30"
      `(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"[^{}\\[\\]]{0,1000}?(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)`,

      // JSON reversed order: "average":45.30 ... "name":"Democratic"
      `(?:"average"|"value"|"pct"|"percentage"|"estimate"|"support")\\s*:\\s*"?(-?\\d{1,2}(?:\\.\\d+)?)"?[^{}\\[\\]]{0,1000}(?:"name"|"candidate"|"label"|"choice"|"party")\\s*:\\s*"${escaped}"`
    ];

    for (const source of patternSources) {
      const pattern = new RegExp(source, "gi");
      let match;

      while ((match = pattern.exec(text)) !== null) {
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
  const htmlRows = extractGenericFromHtmlRows(text);

  if (htmlRows.democrats !== null && htmlRows.republicans !== null) {
    return htmlRows;
  }

  const embeddedRows = extractGenericFromEmbeddedTextRows(text);

  if (embeddedRows.democrats !== null && embeddedRows.republicans !== null) {
    return embeddedRows;
  }

  const topBlock = extractGenericFromStaticTopBlock(text);

  if (topBlock.democrats !== null && topBlock.republicans !== null) {
    return topBlock;
  }

  const blob = normalizeText(text);

  const democrats = findCandidateValue(blob, ["Democrat", "Democratic", "Democrats"]);
  const republicans = findCandidateValue(blob, ["Republican", "Republicans"]);

  return {
    democrats,
    republicans
  };
}

function extractApprovalFromText(text) {
  const htmlRows = extractApprovalFromHtmlRows(text);

  if (htmlRows.approve !== null && htmlRows.disapprove !== null) {
    return htmlRows;
  }

  const embeddedRows = extractApprovalFromEmbeddedTextRows(text);

  if (embeddedRows.approve !== null && embeddedRows.disapprove !== null) {
    return embeddedRows;
  }

  const topBlock = extractApprovalFromStaticTopBlock(text);

  if (topBlock.approve !== null && topBlock.disapprove !== null) {
    return topBlock;
  }

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

      failures.push(`${candidate.label}: ${validation.reason}; extracted ${JSON.stringify(values)}`);
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
