function formatPostDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function safePostId(value, index) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `post-${slug || index + 1}`;
}

function renderAnalysisPosts(posts) {
  const feed = document.querySelector("[data-analysis-posts]");
  if (!feed) return;

  const publishedPosts = (Array.isArray(posts) ? posts : [])
    .filter(post => post && post.title && post.body)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));

  feed.replaceChildren();
  if (!publishedPosts.length) {
    const empty = document.createElement("article");
    empty.className = "analysis-empty-state";
    const title = document.createElement("h2");
    title.textContent = "New analysis is coming soon.";
    const text = document.createElement("p");
    text.textContent = "Check back for new posts from Japoll.";
    empty.append(title, text);
    feed.appendChild(empty);
    return;
  }

  publishedPosts.forEach((post, index) => {
    const article = document.createElement("article");
    article.className = `analysis-post${index === 0 ? " is-featured" : ""}`;
    article.id = safePostId(post.id || post.title, index);

    const meta = document.createElement("div");
    meta.className = "analysis-post-meta";
    const category = document.createElement("span");
    category.textContent = post.category || "Analysis";
    const date = document.createElement("time");
    date.dateTime = post.publishedAt || "";
    date.textContent = formatPostDate(post.publishedAt);
    meta.append(category, date);

    const title = document.createElement("h2");
    title.textContent = post.title;
    const excerpt = document.createElement("p");
    excerpt.className = "analysis-post-excerpt";
    excerpt.textContent = post.excerpt || "";

    const body = document.createElement("div");
    body.className = "analysis-post-body";
    String(post.body)
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .forEach(paragraph => {
        const element = document.createElement("p");
        element.textContent = paragraph;
        body.appendChild(element);
      });

    article.append(meta, title);
    if (post.excerpt) article.appendChild(excerpt);
    article.appendChild(body);
    feed.appendChild(article);
  });
}

function renderHomepageAnalysis(posts) {
  const preview = document.querySelector("[data-homepage-analysis]");
  if (!preview) return;

  const latestPost = (Array.isArray(posts) ? posts : [])
    .filter(post => post && post.title && post.body)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))[0];
  if (!latestPost) return;

  const category = preview.querySelector("[data-homepage-analysis-category]");
  const date = preview.querySelector("[data-homepage-analysis-date]");
  const title = preview.querySelector("[data-homepage-analysis-title]");
  const link = preview.querySelector("[data-homepage-analysis-link]");

  if (category) category.textContent = latestPost.category || "Analysis";
  if (date) {
    date.dateTime = latestPost.publishedAt || "";
    date.textContent = formatPostDate(latestPost.publishedAt);
  }
  if (title) title.textContent = latestPost.title;
  if (link) link.href = `analysis.html#${safePostId(latestPost.id || latestPost.title, 0)}`;
}

function renderHomepagePrediction(key, prediction) {
  if (!prediction) return;
  const card = document.querySelector(`[data-editorial-prediction="${key}"]`);
  if (!card) return;

  const dem = Number(prediction.democrats);
  const rep = Number(prediction.republicans);
  const total = dem + rep;
  const demValue = card.querySelector("[data-editorial-dem]");
  const repValue = card.querySelector("[data-editorial-rep]");
  const label = card.querySelector("[data-editorial-label]");

  if (demValue && Number.isFinite(dem)) demValue.textContent = String(dem);
  if (repValue && Number.isFinite(rep)) repValue.textContent = String(rep);
  if (label && prediction.label) label.textContent = prediction.label;

  if (key === "house" && total > 0) {
    const demFill = card.querySelector(".house-mini-bar-fill-dem");
    const repFill = card.querySelector(".house-mini-bar-fill-rep");
    if (demFill) demFill.style.width = `${(dem / total) * 100}%`;
    if (repFill) repFill.style.width = `${(rep / total) * 100}%`;
  }
}

async function loadEditorialContent() {
  try {
    const [editorialResponse, racesResponse] = await Promise.all([
      fetch("data/editorial.json", { cache: "no-store" }),
      fetch("data/races.json", { cache: "no-store" })
    ]);
    if (!editorialResponse.ok) throw new Error("Could not load editorial data");
    const editorial = await editorialResponse.json();
    const raceData = racesResponse.ok ? await racesResponse.json() : null;

    ["senate", "governor"].forEach(key => {
      const totals = raceData?.maps?.[key]?.projectedTotals;
      if (!totals || !editorial.predictions?.[key]) return;
      editorial.predictions[key] = {
        ...editorial.predictions[key],
        democrats: Number(totals.dem),
        republicans: Number(totals.rep),
        label: totals.label || editorial.predictions[key].label
      };
    });

    renderAnalysisPosts(editorial.posts);
    renderHomepageAnalysis(editorial.posts);

    Object.entries(editorial.predictions || {}).forEach(([key, prediction]) => {
      renderHomepagePrediction(key, prediction);
    });

    document.dispatchEvent(new CustomEvent("japoll:editorial-loaded", { detail: editorial }));
  } catch (error) {
    console.error("Could not load Japoll editorial content:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadEditorialContent);
