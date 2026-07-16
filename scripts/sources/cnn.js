import { browserSnapshot, getTextFromUrl } from "../lib/fetch-page.js";
import { mergeWithFallback, valuesLookUsable } from "../lib/extract.js";
import { saveScrapeDebug } from "../lib/debug.js";

const source = {
  key: "cnn",
  name: "CNN",
  shortName: "CNN",
  urls: {
    // CNN's old Poll of Polls page is still pinned to the 2022 midterms.
    // This is CNN/SSRS's most recent 2026 generic-ballot release instead.
    generic: "https://www.cnn.com/2026/05/12/politics/cnn-poll-midterms-affordability-politics-impact",
    approval: "https://www.cnn.com/polling/approval/trump-cnn-poll-of-polls"
  }
};

function normalizeText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getSnapshotText(url, debugName) {
  try {
    const snapshot = await browserSnapshot(url, {
      waitAfterLoad: 8000,
      waitForTextTimeout: 12000,
      timeout: 32000
    });

    const combined = [
      "=== VISIBLE TEXT ===",
      snapshot.text,
      "=== HTML ===",
      snapshot.html,
      "=== SCRIPTS ===",
      snapshot.scripts,
      "=== NETWORK ===",
      snapshot.networkText
    ].join("\n");

    await saveScrapeDebug(debugName, combined);
    return combined;
  } catch (error) {
    console.warn(`[${source.shortName}] Browser scrape failed for ${url}: ${error.message}`);
    const text = await getTextFromUrl(url, { preferBrowser: false });
    await saveScrapeDebug(debugName, text);
    return text;
  }
}

function firstMatchingPair(text, patterns, reverseIndexes = new Set()) {
  const cleanText = normalizeText(text);

  for (let index = 0; index < patterns.length; index += 1) {
    const match = cleanText.match(patterns[index]);

    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);

      if (Number.isFinite(first) && Number.isFinite(second)) {
        return reverseIndexes.has(index)
          ? { first: second, second: first }
          : { first, second };
      }
    }
  }

  return { first: null, second: null };
}

function extractGeneric(text) {
  const cleanText = normalizeText(text);

  // Current-cycle CNN/SSRS release wording:
  // "45% saying they'd support a Democratic candidate for Congress,
  //  42% a Republican candidate"
  const currentCycle = cleanText.match(
    /(\d{1,2}(?:\.\d+)?)\s*%\s+saying\s+they(?:'|’)?d\s+support\s+(?:a\s+)?Democratic\s+candidate(?:\s+for\s+Congress)?[\s,;–-]+(\d{1,2}(?:\.\d+)?)\s*%\s+(?:a\s+)?Republican\s+candidate/i
  );

  if (currentCycle) {
    return {
      democrats: Number(currentCycle[1]),
      republicans: Number(currentCycle[2])
    };
  }

  // CNN card currently exposes:
  // Democrats 47% ... Republicans 49%
  const demFirst = cleanText.match(
    /Democrats?\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,600}?Republicans?\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (demFirst) {
    return {
      democrats: Number(demFirst[1]),
      republicans: Number(demFirst[2])
    };
  }

  const repFirst = cleanText.match(
    /Republicans?\s+(\d{1,2}(?:\.\d+)?)\s*%[\s\S]{0,600}?Democrats?\s+(\d{1,2}(?:\.\d+)?)\s*%/i
  );

  if (repFirst) {
    return {
      democrats: Number(repFirst[2]),
      republicans: Number(repFirst[1])
    };
  }

  return {
    democrats: null,
    republicans: null
  };
}

function extractApproval(text) {
  const patterns = [
    /Approve\s+(\d{1,2}(?:\.\d+)?)\s*%?.*?Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%?/is,
    /Disapprove\s+(\d{1,2}(?:\.\d+)?)\s*%?.*?Approve\s+(\d{1,2}(?:\.\d+)?)\s*%?/is
  ];
  const reverseIndexes = new Set([1]);
  const pair = firstMatchingPair(text, patterns, reverseIndexes);

  return {
    approve: pair.first,
    disapprove: pair.second
  };
}

async function scrapeGeneric(fallback) {
  try {
    const text = await getSnapshotText(source.urls.generic, `${source.key}-generic`);
    const values = extractGeneric(text);

    const validation = valuesLookUsable(values, ["democrats", "republicans"], {
      minValue: 30,
      maxValue: 65,
      maxGap: 35
    });

    if (validation.ok) {
      console.log(`[${source.shortName}] Generic ballot live scrape worked: D ${values.democrats} / R ${values.republicans}`);
    } else {
      console.warn(`[${source.shortName}] Generic ballot scrape rejected (${validation.reason}). Using fallback.`);
      console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-generic.txt`);
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.generic,
      democrats: validation.ok ? values.democrats : null,
      republicans: validation.ok ? values.republicans : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated 2026 CNN/SSRS generic-ballot release" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Generic ballot scrape failed. Using fallback: ${error.message}`);
    return { ...fallback, scrapeStatus: "fallback", scrapeNote: `Generic scrape failed: ${error.message}` };
  }
}

async function scrapeApproval(fallback) {
  try {
    const text = await getSnapshotText(source.urls.approval, `${source.key}-approval`);
    const values = extractApproval(text);

    const validation = valuesLookUsable(values, ["approve", "disapprove"], {
      minValue: 30,
      maxValue: 75,
      maxGap: 45,
      requireSecondHigher: true
    });

    if (validation.ok) {
      console.log(`[${source.shortName}] Trump approval live scrape worked: Approve ${values.approve} / Disapprove ${values.disapprove}`);
    } else {
      console.warn(`[${source.shortName}] Trump approval scrape rejected (${validation.reason}). Using fallback.`);
      console.warn(`[${source.shortName}] Debug saved to data/scrape-debug/${source.key}-approval.txt`);
    }

    return mergeWithFallback({
      key: source.key,
      name: source.name,
      shortName: source.shortName,
      url: source.urls.approval,
      approve: validation.ok ? values.approve : null,
      disapprove: validation.ok ? values.disapprove : null,
      included: validation.ok,
      scrapeStatus: validation.ok ? "live" : "fallback",
      scrapeNote: validation.ok ? "Validated live scrape" : `Rejected live scrape: ${validation.reason}`
    }, fallback);
  } catch (error) {
    console.warn(`[${source.shortName}] Trump approval scrape failed. Using fallback: ${error.message}`);
    return { ...fallback, scrapeStatus: "fallback", scrapeNote: `Approval scrape failed: ${error.message}` };
  }
}

export async function getCNNData(fallback = {}) {
  return {
    genericBallot: await scrapeGeneric(fallback.genericBallot),
    trumpApproval: await scrapeApproval(fallback.trumpApproval)
  };
}
