function formatPostDate(value) {
  if (!value) return "";
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(dateValue);
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

function getPublishedPosts(posts) {
  return (Array.isArray(posts) ? posts : [])
    .filter(post => post && post.title && post.body)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
}

function createPostMedia(post) {
  if (!post.imageUrl) return null;
  const figure = document.createElement("figure");
  figure.className = "analysis-post-media";
  const image = document.createElement("img");
  image.src = post.imageUrl;
  image.alt = post.imageAlt || "";
  image.loading = "lazy";
  image.decoding = "async";
  figure.appendChild(image);
  if (post.imageCaption) {
    const caption = document.createElement("figcaption");
    caption.textContent = post.imageCaption;
    figure.appendChild(caption);
  }
  return figure;
}

function createRelatedArticle(post) {
  if (!post.articleUrl) return null;
  const link = document.createElement("a");
  link.className = "analysis-related-link";
  link.href = post.articleUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const label = document.createElement("span");
  label.textContent = "Related article";
  const title = document.createElement("strong");
  title.textContent = post.articleTitle || post.articleUrl;
  link.append(label, title);
  return link;
}

function appendPostBody(container, value) {
  String(value)
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .forEach(paragraph => {
      const element = document.createElement("p");
      element.textContent = paragraph;
      container.appendChild(element);
    });
}

function getRecentArticles(articles, limit) {
  return (Array.isArray(articles) ? articles : [])
    .filter(article => article && article.title && article.url)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, limit);
}

function mergeNewsArticles(automated, manual) {
  const seen = new Set();
  return [...(Array.isArray(automated) ? automated : []), ...(Array.isArray(manual) ? manual : [])]
    .filter(article => {
      if (!article?.title || !article?.url) return false;
      const key = String(article.url || article.title).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function createNewsLink(article, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = article.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const meta = document.createElement("span");
  meta.textContent = [article.source, formatPostDate(article.publishedAt)].filter(Boolean).join(" \u00b7 ");
  const title = document.createElement("strong");
  title.textContent = article.title;
  link.append(meta, title);
  return link;
}

function renderRecentArticles(articles) {
  const list = document.querySelector("[data-analysis-recent]");
  if (!list) return;
  list.replaceChildren();
  const recentArticles = getRecentArticles(articles, 6);
  recentArticles.forEach(article => {
    list.appendChild(createNewsLink(article, "analysis-recent-link"));
  });
  const sidebar = list.closest(".analysis-sidebar");
  if (sidebar) sidebar.hidden = recentArticles.length === 0;
}

function renderAnalysisPosts(posts) {
  const feed = document.querySelector("[data-analysis-posts]");
  if (!feed) return;

  const publishedPosts = getPublishedPosts(posts);

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
    appendPostBody(body, post.body);

    const media = createPostMedia(post);
    const relatedArticle = createRelatedArticle(post);

    article.append(meta, title);
    if (post.excerpt) article.appendChild(excerpt);
    if (media) article.appendChild(media);
    article.appendChild(body);
    if (relatedArticle) article.appendChild(relatedArticle);
    feed.appendChild(article);
  });
}

function renderHomepageNews(articles) {
  const list = document.querySelector("[data-homepage-news]");
  if (!list) return;
  list.replaceChildren();
  const recentArticles = getRecentArticles(articles, 3);
  recentArticles.forEach(article => {
    list.appendChild(createNewsLink(article, "homepage-news-link"));
  });
  const rail = list.closest(".homepage-news-rail");
  if (rail) rail.hidden = recentArticles.length === 0;
}

function renderNewsUpdated(value) {
  const label = value ? `Auto-updated ${formatPostDate(value)}` : "Updated daily";
  document.querySelectorAll("[data-news-updated]").forEach(element => {
    element.textContent = label;
  });
}

function renderHomepageAnalysis(posts, newsArticles) {
  const preview = document.querySelector("[data-homepage-analysis]");
  if (!preview) return;

  const latestPost = getPublishedPosts(posts)[0];
  if (!latestPost) return;

  const category = preview.querySelector("[data-homepage-analysis-category]");
  const date = preview.querySelector("[data-homepage-analysis-date]");
  const title = preview.querySelector("[data-homepage-analysis-title]");
  const excerpt = preview.querySelector("[data-homepage-analysis-excerpt]");
  const link = preview.querySelector("[data-homepage-analysis-link]");

  if (category) category.textContent = latestPost.category || "Analysis";
  if (date) {
    date.dateTime = latestPost.publishedAt || "";
    date.textContent = formatPostDate(latestPost.publishedAt);
  }
  if (title) title.textContent = latestPost.title;
  if (excerpt) excerpt.textContent = latestPost.excerpt || "Read the latest original post from Japoll.";
  if (link) link.href = `analysis.html#${safePostId(latestPost.id || latestPost.title, 0)}`;
  renderHomepageNews(newsArticles);
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

  if (total > 0) {
    const demBalance = card.querySelector("[data-balance-dem]");
    const repBalance = card.querySelector("[data-balance-rep]");
    if (demBalance) demBalance.style.width = `${(dem / total) * 100}%`;
    if (repBalance) repBalance.style.width = `${(rep / total) * 100}%`;
  }

  if (key === "house" && total > 0) {
    const demFill = card.querySelector(".house-mini-bar-fill-dem");
    const repFill = card.querySelector(".house-mini-bar-fill-rep");
    if (demFill) demFill.style.width = `${(dem / total) * 100}%`;
    if (repFill) repFill.style.width = `${(rep / total) * 100}%`;
  }
}

async function loadEditorialContent() {
  try {
    const [editorialResponse, racesResponse, newsResponse] = await Promise.all([
      fetch("data/editorial.json", { cache: "no-store" }),
      fetch("data/races.json", { cache: "no-store" }),
      fetch("data/news.json", { cache: "no-store" })
    ]);
    if (!editorialResponse.ok) throw new Error("Could not load editorial data");
    const editorial = await editorialResponse.json();
    const raceData = racesResponse.ok ? await racesResponse.json() : null;
    const automatedNews = newsResponse.ok ? await newsResponse.json() : null;
    const newsArticles = mergeNewsArticles(automatedNews?.articles, editorial.newsArticles);

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
    renderRecentArticles(newsArticles);
    renderHomepageAnalysis(editorial.posts, newsArticles);
    renderNewsUpdated(automatedNews?.generatedAt);

    Object.entries(editorial.predictions || {}).forEach(([key, prediction]) => {
      renderHomepagePrediction(key, prediction);
    });

    document.dispatchEvent(new CustomEvent("japoll:editorial-loaded", {
      detail: { ...editorial, newsArticles }
    }));
  } catch (error) {
    console.error("Could not load Japoll editorial content:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadEditorialContent);
