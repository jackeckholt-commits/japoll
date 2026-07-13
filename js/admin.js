const REPOSITORY = "jackeckholt-commits/japoll";
const BRANCH = "main";
const API_ROOT = `https://api.github.com/repos/${REPOSITORY}`;

const RATING_OPTIONS = {
  "no-data": { label: "No rating yet", party: "none" },
  tossup: { label: "Toss-up", party: "none" },
  demSolid: { label: "Safe Democrat", party: "dem" },
  demLikely: { label: "Likely Democrat", party: "dem" },
  demLean: { label: "Lean Democrat", party: "dem" },
  demTilt: { label: "Tilt Democrat", party: "dem" },
  repTilt: { label: "Tilt Republican", party: "rep" },
  repLean: { label: "Lean Republican", party: "rep" },
  repLikely: { label: "Likely Republican", party: "rep" },
  repSolid: { label: "Safe Republican", party: "rep" }
};

const EXPECTED_TOTALS = { house: 435, senate: 100, governor: 50 };
let editorialData = null;
let raceData = null;
let connectedToken = sessionStorage.getItem("japollGithubToken") || "";
let currentRaceTab = "senate";
let hasUnsavedChanges = false;

const form = document.querySelector("#editor-form");
const tokenInput = document.querySelector("#github-token");
const connectButton = document.querySelector("#connect-button");
const connectionStatus = document.querySelector("#connection-status");
const saveButton = document.querySelector("#save-button");
const saveDock = document.querySelector(".save-dock");
const saveTitle = document.querySelector("#save-title");
const saveStatus = document.querySelector("#save-status");
const raceEditors = document.querySelector("#race-editors");
const raceSearch = document.querySelector("#race-search");
const houseStateFilter = document.querySelector("#house-state-filter");
const houseStateFilterLabel = document.querySelector("[data-house-state-filter]");
const raceFilterStatus = document.querySelector("#race-filter-status");
const houseEditorShortcut = document.querySelector("[data-open-race-tab=\"house\"]");
const postEditors = document.querySelector("#post-editors");
const addPostButton = document.querySelector("#add-post-button");
const newsEditors = document.querySelector("#news-editors");
const addNewsButton = document.querySelector("#add-news-button");

function valueAtPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setValueAtPath(object, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((value, key) => value[key] ??= {}, object);
  target[last] = value;
}

function markDirty() {
  hasUnsavedChanges = true;
  saveTitle.textContent = "Unpublished changes";
  saveStatus.textContent = connectedToken ? "Publish when you are ready." : "Connect GitHub to publish.";
}

function setConnection(message, state = "") {
  connectionStatus.textContent = message;
  connectionStatus.className = `connection-status${state ? ` is-${state}` : ""}`;
}

function setSaveState(title, message, state = "") {
  saveTitle.textContent = title;
  saveStatus.textContent = message;
  saveDock.className = `save-dock${state ? ` is-${state}` : ""}`;
}

function apiHeaders(token = connectedToken) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function connectGithub() {
  const token = tokenInput.value.trim() || connectedToken;
  if (!token) {
    setConnection("Paste your GitHub token first.", "error");
    return;
  }

  connectButton.disabled = true;
  connectButton.textContent = "Checking…";
  setConnection("Checking access to Japoll…");

  try {
    const response = await fetch(API_ROOT, { headers: apiHeaders(token) });
    if (!response.ok) throw new Error(response.status === 401 ? "That token is not valid." : "The token cannot access the Japoll repository.");
    const repository = await response.json();
    if (!repository.permissions?.push) throw new Error("This token can view Japoll, but it does not have Contents: Read and write permission.");

    connectedToken = token;
    sessionStorage.setItem("japollGithubToken", token);
    tokenInput.value = "";
    tokenInput.placeholder = "Connected for this tab";
    saveButton.disabled = false;
    setConnection("Connected. Your token is kept only in this browser tab.", "connected");
    setSaveState(hasUnsavedChanges ? "Unpublished changes" : "Ready to publish", "Your changes can now be sent to Japoll.");
  } catch (error) {
    connectedToken = "";
    sessionStorage.removeItem("japollGithubToken");
    saveButton.disabled = true;
    setConnection(error.message, "error");
  } finally {
    connectButton.disabled = false;
    connectButton.textContent = "Connect";
  }
}

async function loadCurrentData() {
  try {
    const [editorialResponse, racesResponse] = await Promise.all([
      fetch(`data/editorial.json?t=${Date.now()}`, { cache: "no-store" }),
      fetch(`data/races.json?t=${Date.now()}`, { cache: "no-store" })
    ]);
    if (!editorialResponse.ok || !racesResponse.ok) throw new Error("The current Japoll data could not be loaded.");

    editorialData = await editorialResponse.json();
    raceData = await racesResponse.json();
    populateForm();
    renderPostEditors();
    renderNewsEditors();
    renderRaceEditors();
    syncAutoPredictionFields(true);
    validatePredictionTotals();
    setSaveState("Current data loaded", connectedToken ? "Connected and ready to publish." : "Connect GitHub when you are ready to publish.");
  } catch (error) {
    setSaveState("Could not load the editor", error.message, "error");
  }
}

function populateForm() {
  document.querySelectorAll("[data-field]").forEach(input => {
    const value = valueAtPath(editorialData, input.dataset.field);
    input.value = value ?? "";
  });
}

function calculateProjectedTotals(type, useEditorValues = false) {
  const map = raceData?.maps?.[type];
  if (!map?.carryover) return null;

  const totals = {
    dem: Number(map.carryover.dem || 0),
    rep: Number(map.carryover.rep || 0)
  };

  if (useEditorValues) {
    document.querySelectorAll(`[data-race-rating][data-map="${type}"]`).forEach(select => {
      const party = RATING_OPTIONS[select.value]?.party;
      if (party === "dem" || party === "rep") totals[party] += 1;
    });
  } else {
    map.races.filter(race => race.active === true).forEach(race => {
      if (race.party === "dem" || race.party === "rep") totals[race.party] += 1;
    });
  }

  return totals;
}

function syncAutoPredictionFields(useEditorValues = false) {
  ["senate", "governor"].forEach(type => {
    const totals = calculateProjectedTotals(type, useEditorValues);
    if (!totals) return;
    const demInput = document.querySelector(`[data-field="predictions.${type}.democrats"]`);
    const repInput = document.querySelector(`[data-field="predictions.${type}.republicans"]`);
    if (demInput) demInput.value = String(totals.dem);
    if (repInput) repInput.value = String(totals.rep);
  });
}

function makeLabel(text, control) {
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = text;
  label.append(caption, control);
  return label;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createContentInput(field, value = "", options = {}) {
  const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
  input.dataset.postField = field;
  input.value = value || "";
  if (options.type) input.type = options.type;
  if (options.required) input.required = true;
  if (options.maxLength) input.maxLength = options.maxLength;
  if (options.rows) input.rows = options.rows;
  if (options.placeholder) input.placeholder = options.placeholder;
  return input;
}

function createPostEditor(post = {}, index = 0) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "post-editor";
  fieldset.dataset.postId = post.id || "";

  const legend = document.createElement("legend");
  legend.textContent = post.title || `New post ${index + 1}`;

  const heading = document.createElement("div");
  heading.className = "post-editor-heading";
  const helper = document.createElement("strong");
  helper.textContent = "Post details";
  const remove = document.createElement("button");
  remove.className = "remove-post-button";
  remove.type = "button";
  remove.textContent = "Remove post";
  remove.addEventListener("click", () => {
    fieldset.remove();
    markDirty();
  });
  heading.append(helper, remove);

  const category = createContentInput("category", post.category || "Analysis", { maxLength: 50 });
  const date = createContentInput("publishedAt", post.publishedAt || todayValue(), { type: "date", required: true });
  const title = createContentInput("title", post.title, { required: true, maxLength: 140 });
  const excerpt = createContentInput("excerpt", post.excerpt, { maxLength: 280 });
  const body = createContentInput("body", post.body, { multiline: true, required: true, rows: 10 });
  const imageUrl = createContentInput("imageUrl", post.imageUrl, { maxLength: 500, placeholder: "assets/photo.jpg or https://..." });
  const imageAlt = createContentInput("imageAlt", post.imageAlt, { maxLength: 180, placeholder: "Describe the image" });
  const imageCaption = createContentInput("imageCaption", post.imageCaption, { maxLength: 240, placeholder: "Optional caption" });
  const articleUrl = createContentInput("articleUrl", post.articleUrl, { maxLength: 500, placeholder: "https://..." });
  const articleTitle = createContentInput("articleTitle", post.articleTitle, { maxLength: 180, placeholder: "Text visitors will see" });

  const titleLabel = makeLabel("Headline", title);
  titleLabel.className = "post-title-field";
  const excerptLabel = makeLabel("Short summary", excerpt);
  excerptLabel.className = "post-excerpt-field";
  const bodyLabel = makeLabel("Post", body);
  bodyLabel.className = "post-body-field";
  const imageUrlLabel = makeLabel("Image URL or site file", imageUrl);
  imageUrlLabel.className = "post-media-field";
  const imageAltLabel = makeLabel("Image description", imageAlt);
  imageAltLabel.className = "post-media-field";
  const imageCaptionLabel = makeLabel("Image caption", imageCaption);
  imageCaptionLabel.className = "post-media-field post-wide-field";
  const articleUrlLabel = makeLabel("Related article URL", articleUrl);
  articleUrlLabel.className = "post-article-field";
  const articleTitleLabel = makeLabel("Related article title", articleTitle);
  articleTitleLabel.className = "post-article-field";

  title.addEventListener("input", () => {
    legend.textContent = title.value.trim() || "New post";
  });

  fieldset.append(
    legend,
    heading,
    makeLabel("Category", category),
    makeLabel("Publication date", date),
    titleLabel,
    excerptLabel,
    bodyLabel,
    imageUrlLabel,
    imageAltLabel,
    imageCaptionLabel,
    articleUrlLabel,
    articleTitleLabel
  );
  return fieldset;
}

function renderPostEditors() {
  if (!postEditors) return;
  postEditors.replaceChildren();
  const posts = Array.isArray(editorialData.posts) ? editorialData.posts : [];
  posts
    .slice()
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .forEach((post, index) => postEditors.appendChild(createPostEditor(post, index)));
}

function addNewPost() {
  if (!postEditors) return;
  const editor = createPostEditor({ category: "Analysis", publishedAt: todayValue() }, postEditors.children.length);
  postEditors.prepend(editor);
  markDirty();
  editor.querySelector('[data-post-field="title"]')?.focus();
}

function createNewsEditor(article = {}, index = 0) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "news-editor";
  const legend = document.createElement("legend");
  legend.textContent = article.source || `News link ${index + 1}`;
  const remove = document.createElement("button");
  remove.className = "remove-post-button";
  remove.type = "button";
  remove.textContent = "Remove link";
  remove.addEventListener("click", () => {
    fieldset.remove();
    markDirty();
  });

  const source = createContentInput("source", article.source, { maxLength: 80, placeholder: "AP, Reuters, local newspaper..." });
  const date = createContentInput("publishedAt", article.publishedAt || todayValue(), { type: "date", required: true });
  const title = createContentInput("title", article.title, { maxLength: 180, required: true });
  const url = createContentInput("url", article.url, { maxLength: 500, required: true, placeholder: "https://..." });
  [source, date, title, url].forEach(input => {
    input.dataset.newsField = input.dataset.postField;
    delete input.dataset.postField;
  });
  source.addEventListener("input", () => {
    legend.textContent = source.value.trim() || "News link";
  });

  fieldset.append(
    legend,
    remove,
    makeLabel("News source", source),
    makeLabel("Publication date", date),
    makeLabel("Headline", title),
    makeLabel("Article URL", url)
  );
  return fieldset;
}

function renderNewsEditors() {
  if (!newsEditors) return;
  newsEditors.replaceChildren();
  const articles = Array.isArray(editorialData.newsArticles) ? editorialData.newsArticles : [];
  articles
    .slice()
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .forEach((article, index) => newsEditors.appendChild(createNewsEditor(article, index)));
}

function addNewsArticle() {
  if (!newsEditors) return;
  const editor = createNewsEditor({ publishedAt: todayValue() }, newsEditors.children.length);
  newsEditors.prepend(editor);
  markDirty();
  editor.querySelector('[data-news-field="source"]')?.focus();
}

function createRaceRow(type, race) {
  const row = document.createElement("article");
  row.className = "race-row";
  row.dataset.raceType = type;
  row.dataset.state = `${race.id || ""} ${race.state} ${race.stateName || ""} ${race.name}`.toLowerCase();
  row.dataset.stateCode = race.state || "";

  const name = document.createElement("div");
  name.className = "race-name";
  const code = document.createElement("span");
  code.className = "state-code";
  code.textContent = type === "house" ? race.id : race.state;
  const title = document.createElement("strong");
  title.textContent = type === "house" ? race.stateName : race.name;
  name.append(code, title);

  const rating = document.createElement("select");
  rating.dataset.raceRating = "";
  rating.dataset.map = type;
  rating.dataset.raceKey = type === "house" ? race.id : String(race.fips).padStart(2, "0");
  Object.entries(RATING_OPTIONS).forEach(([key, option]) => {
    const element = document.createElement("option");
    element.value = key;
    element.textContent = option.label;
    rating.appendChild(element);
  });
  rating.value = RATING_OPTIONS[race.marginCategory] ? race.marginCategory : "no-data";

  row.append(name, makeLabel("Rating", rating));
  return row;
}

function renderRaceEditors() {
  raceEditors.replaceChildren();
  const houseRaces = (raceData.maps?.house?.races || []).filter(race => race.active === true);
  const houseStates = Array.from(
    new Map(houseRaces.map(race => [race.state, race.stateName || race.state])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  houseStateFilter.replaceChildren();
  const allStatesOption = document.createElement("option");
  allStatesOption.value = "";
  allStatesOption.textContent = `All states (${houseRaces.length})`;
  houseStateFilter.appendChild(allStatesOption);
  houseStates.forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    houseStateFilter.appendChild(option);
  });

  ["senate", "governor", "house"].forEach(type => {
    const list = document.createElement("div");
    list.className = "race-list";
    list.dataset.raceList = type;
    list.hidden = type !== currentRaceTab;

    const races = (raceData.maps?.[type]?.races || []).filter(race => race.active === true);
    races.forEach(race => list.appendChild(createRaceRow(type, race)));
    raceEditors.appendChild(list);
    const count = document.querySelector(`[data-race-count="${type}"]`);
    if (count) count.textContent = `(${races.length})`;
  });
  selectRaceTab(currentRaceTab);
}

function selectRaceTab(type) {
  if (currentRaceTab !== type) raceSearch.value = "";
  currentRaceTab = type;
  document.querySelectorAll("[data-race-tab]").forEach(button => {
    const active = button.dataset.raceTab === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-race-list]").forEach(list => {
    list.hidden = list.dataset.raceList !== type;
  });
  houseStateFilterLabel.hidden = type !== "house";
  raceSearch.placeholder = type === "house" ? "District, e.g. TX-18…" : "State or race…";
  filterRaces();
}

function filterRaces() {
  const query = raceSearch.value.trim().toLowerCase();
  const selectedState = currentRaceTab === "house" ? houseStateFilter.value : "";
  let visibleCount = 0;
  let totalCount = 0;
  document.querySelectorAll(`.race-row[data-race-type="${currentRaceTab}"]`).forEach(row => {
    totalCount += 1;
    const matchesSearch = !query || row.dataset.state.includes(query);
    const matchesState = !selectedState || row.dataset.stateCode === selectedState;
    row.hidden = !(matchesSearch && matchesState);
    if (!row.hidden) visibleCount += 1;
  });

  const stateName = houseStateFilter.selectedOptions[0]?.textContent.replace(/\s*\(\d+\)$/, "") || "All states";
  if (currentRaceTab === "house" && selectedState) {
    raceFilterStatus.textContent = `Showing ${visibleCount} House district${visibleCount === 1 ? "" : "s"} in ${stateName}.`;
  } else if (query) {
    raceFilterStatus.textContent = `Showing ${visibleCount} of ${totalCount} races.`;
  } else {
    raceFilterStatus.textContent = currentRaceTab === "house"
      ? `Showing all ${totalCount} House districts. Choose a state to narrow the list.`
      : `Showing all ${totalCount} ${currentRaceTab === "senate" ? "Senate" : "governor"} races.`;
  }
}

function validatePredictionTotals() {
  let valid = true;
  Object.entries(EXPECTED_TOTALS).forEach(([key, expected]) => {
    const dem = Number(document.querySelector(`[data-field="predictions.${key}.democrats"]`)?.value);
    const rep = Number(document.querySelector(`[data-field="predictions.${key}.republicans"]`)?.value);
    const total = dem + rep;
    const status = document.querySelector(`[data-total-check="${key}"]`);
    const matches = Number.isFinite(total) && total === expected;
    valid &&= matches;
    if (status) {
      status.textContent = matches ? `✓ Totals ${expected}` : `Currently ${total || 0}; must total ${expected}`;
      status.classList.toggle("is-valid", matches);
      status.classList.toggle("is-invalid", !matches);
    }
  });
  return valid;
}

function collectEditorialData() {
  const next = structuredClone(editorialData);
  document.querySelectorAll("[data-field]").forEach(input => {
    const value = input.type === "number" ? Number(input.value) : input.value.trim();
    setValueAtPath(next, input.dataset.field, value);
  });

  const usedIds = new Set();
  next.posts = Array.from(document.querySelectorAll(".post-editor")).map((editor, index) => {
    const read = field => editor.querySelector(`[data-post-field="${field}"]`)?.value.trim() || "";
    const baseId = editor.dataset.postId || slugify(read("title")) || `post-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return {
      id,
      category: read("category") || "Analysis",
      title: read("title"),
      excerpt: read("excerpt"),
      body: read("body"),
      imageUrl: read("imageUrl"),
      imageAlt: read("imageAlt"),
      imageCaption: read("imageCaption"),
      articleUrl: read("articleUrl"),
      articleTitle: read("articleTitle"),
      publishedAt: read("publishedAt") || todayValue()
    };
  });
  next.newsArticles = Array.from(document.querySelectorAll(".news-editor")).map(editor => {
    const read = field => editor.querySelector(`[data-news-field="${field}"]`)?.value.trim() || "";
    return {
      source: read("source"),
      title: read("title"),
      url: read("url"),
      publishedAt: read("publishedAt") || todayValue()
    };
  });
  delete next.analysis;
  next.updatedAt = new Date().toISOString();
  return next;
}

function updateRaceDataFromEditor() {
  const next = structuredClone(raceData);
  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  ["senate", "governor", "house"].forEach(type => {
    const map = next.maps[type];
    const raceByKey = new Map(map.races.map(race => [
      type === "house" ? race.id : String(race.fips).padStart(2, "0"),
      race
    ]));

    document.querySelectorAll(`[data-race-rating][data-map="${type}"]`).forEach(select => {
      const race = raceByKey.get(select.dataset.raceKey);
      const option = RATING_OPTIONS[select.value];
      if (!race || !option) return;

      race.party = option.party;
      race.status = select.value === "no-data" ? "no-data" : select.value === "tossup" ? "tossup" : "prediction";
      race.marginCategory = select.value;
      race.marginLabel = null;
      race.predictedMargin = null;
      race.lastUpdated = displayDate;
    });

    const activeRaces = map.races.filter(race => race.active === true);
    const counts = Object.fromEntries(Object.keys(RATING_OPTIONS).map(key => [key, 0]));
    activeRaces.forEach(race => {
      if (counts[race.marginCategory] !== undefined) counts[race.marginCategory] += 1;
    });
    map.projection = { ...counts, noData: counts["no-data"], total: activeRaces.length };
    if (map.marginSummary?.segments) {
      map.marginSummary.total = activeRaces.length;
      map.marginSummary.segments.forEach(segment => { segment.count = counts[segment.key] || 0; });
    }
    if (map.carryover) {
      const demRated = activeRaces.filter(race => race.party === "dem").length;
      const repRated = activeRaces.filter(race => race.party === "rep").length;
      map.projectedTotals = {
        dem: Number(map.carryover.dem || 0) + demRated,
        rep: Number(map.carryover.rep || 0) + repRated,
        label: map.projectedTotals?.label || `Projected ${type} total`
      };
    }
    map.lastUpdated = displayDate;
  });

  next.updatedAt = now.toISOString();
  return next;
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { ...apiHeaders(), "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.message || "GitHub could not complete the update.");
  }
  return response.json();
}

async function publishDataFiles(editorial, races) {
  const reference = await githubRequest(`/git/ref/heads/${BRANCH}`);
  const parentSha = reference.object.sha;
  const parentCommit = await githubRequest(`/git/commits/${parentSha}`);
  const files = [
    ["data/editorial.json", editorial],
    ["data/races.json", races]
  ];

  const blobs = await Promise.all(files.map(([, data]) => githubRequest("/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: `${JSON.stringify(data, null, 2)}\n`, encoding: "utf-8" })
  })));

  const tree = await githubRequest("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: files.map(([path], index) => ({ path, mode: "100644", type: "blob", sha: blobs[index].sha }))
    })
  });

  const commit = await githubRequest("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: "Update Japoll predictions, analysis, and race ratings",
      tree: tree.sha,
      parents: [parentSha]
    })
  });

  await githubRequest(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
  return commit;
}

async function publishChanges(event) {
  event.preventDefault();
  if (!connectedToken) {
    setSaveState("Connect GitHub first", "Your changes are still safe in this tab.", "error");
    return;
  }
  if (!form.reportValidity() || !validatePredictionTotals()) {
    setSaveState("Check the highlighted fields", "House, Senate, and Governor totals must add up correctly.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Publishing…";
  setSaveState("Publishing to Japoll", "Keep this tab open for a moment.", "saving");

  try {
    const nextEditorial = collectEditorialData();
    const nextRaces = updateRaceDataFromEditor();
    await publishDataFiles(nextEditorial, nextRaces);
    editorialData = nextEditorial;
    raceData = nextRaces;
    hasUnsavedChanges = false;
    setSaveState("Published successfully", "GitHub Pages should show the update within a couple of minutes.", "success");
  } catch (error) {
    setSaveState("The update was not published", error.message, "error");
  } finally {
    saveButton.disabled = !connectedToken;
    saveButton.textContent = "Publish changes";
  }
}

connectButton.addEventListener("click", connectGithub);
tokenInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    connectGithub();
  }
});
form.addEventListener("submit", publishChanges);
form.addEventListener("input", event => {
  if (event.target.matches("[data-field], [data-post-field], [data-news-field], [data-race-rating]")) {
    if (event.target.matches('[data-race-rating][data-map="senate"], [data-race-rating][data-map="governor"]')) {
      syncAutoPredictionFields(true);
    }
    markDirty();
    validatePredictionTotals();
  }
});
addPostButton?.addEventListener("click", addNewPost);
addNewsButton?.addEventListener("click", addNewsArticle);
document.querySelectorAll("[data-race-tab]").forEach(button => {
  button.addEventListener("click", () => selectRaceTab(button.dataset.raceTab));
});
raceSearch.addEventListener("input", filterRaces);
houseStateFilter.addEventListener("change", filterRaces);
houseEditorShortcut.addEventListener("click", () => selectRaceTab("house"));
window.addEventListener("beforeunload", event => {
  if (!hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

if (connectedToken) connectGithub();
loadCurrentData();
