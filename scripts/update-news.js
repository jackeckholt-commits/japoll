import fs from "node:fs/promises";
import { load } from "cheerio";

const OUTPUT_PATH = "data/news.json";
const MAX_ARTICLES = 10;
const FEEDS = [
  {
    name: "Election news",
    source: "Google News",
    limit: 5,
    url: "https://news.google.com/rss/search?q=%282026%20election%20OR%20midterms%20OR%20Senate%20race%20OR%20House%20race%20OR%20governor%20race%29%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },
  {
    name: "NPR Politics",
    source: "NPR",
    limit: 4,
    url: "https://feeds.npr.org/1014/rss.xml"
  },
  {
    name: "PBS NewsHour Politics",
    source: "PBS NewsHour",
    limit: 4,
    url: "https://www.pbs.org/newshour/feeds/rss/politics"
  }
];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function removeSourceSuffix(title, source) {
  const suffix = source ? ` - ${source}` : "";
  return suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function normalizeTitle(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseFeed(xml, feed) {
  const $ = load(xml, { xmlMode: true });
  const articles = [];

  $("item").each((_, item) => {
    const source = cleanText($(item).find("source").first().text()) || feed.source;
    const rawTitle = cleanText($(item).find("title").first().text());
    const title = removeSourceSuffix(rawTitle, source);
    const url = cleanText($(item).find("link").first().text());
    const publishedValue = cleanText(
      $(item).find("pubDate").first().text() || $(item).find("dc\\:date").first().text()
    );
    const publishedDate = new Date(publishedValue);

    if (!title || !/^https?:\/\//.test(url) || Number.isNaN(publishedDate.getTime())) return;

    articles.push({
      source,
      title,
      url,
      publishedAt: publishedDate.toISOString()
    });
  });

  return articles
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, feed.limit);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "Japoll news updater/1.0 (+https://japoll.com)"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return parseFeed(await response.text(), feed);
}

async function readExistingNews() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function sameArticles(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

async function main() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const collected = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`${FEEDS[index].name}: ${result.value.length} articles`);
      collected.push(...result.value);
    } else {
      console.warn(`${FEEDS[index].name}: ${result.reason?.message || "feed unavailable"}`);
    }
  });

  const seen = new Set();
  const articles = collected
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter(article => {
      const key = normalizeTitle(article.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ARTICLES);

  if (articles.length < 3) {
    throw new Error(`Only ${articles.length} valid articles were found; keeping the previous news file.`);
  }

  const existing = await readExistingNews();
  if (sameArticles(existing?.articles, articles)) {
    console.log("News is already current.");
    return;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    articles
  };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Saved ${articles.length} articles to ${OUTPUT_PATH}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
