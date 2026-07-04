const REPOSITORY = "jackeckholt-commits/japoll";
const BRANCH = "main";
const API_ROOT = `https://api.github.com/repos/${REPOSITORY}`;

const RATING_OPTIONS = {
  "no-data": { label: "No rating yet", party: "none", marginLabel: null, margin: null },
  demSolid: { label: "Safe Democrat", party: "dem", marginLabel: "D+15 or more", margin: 18 },
  demLikely: { label: "Likely Democrat", party: "dem", marginLabel: "D+5 to D+15", margin: 9 },
  demLean: { label: "Lean Democrat", party: "dem", marginLabel: "D+1 to D+5", margin: 3 },
  demTilt: { label: "Tilt Democrat", party: "dem", marginLabel: "Tilt Democratic", margin: 0.5 },
  repTilt: { label: "Tilt Republican", party: "rep", marginLabel: "Tilt Republican", margin: 0.5 },
  repLean: { label: "Lean Republican", party: "rep", marginLabel: "R+1 to R+5", margin: 3 },
  repLikely: { label: "Likely Republican", party: "rep", marginLabel: "R+5 to R+15", margin: 9 },
  repSolid: { label: "Safe Republican", party: "rep", marginLabel: "R+15 or more", margin: 18 }
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
    renderRaceEditors();
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

function makeLabel(text, control) {
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = text;
  label.append(caption, control);
  return label;
}

function createRaceRow(type, race) {
  const row = document.createElement("article");
  row.className = "race-row";
  row.dataset.raceType = type;
  row.dataset.state = `${race.state} ${race.name}`.toLowerCase();

  const name = document.createElement("div");
  name.className = "race-name";
  const code = document.createElement("span");
  code.className = "state-code";
  code.textContent = race.state;
  const title = document.createElement("strong");
  title.textContent = race.name;
  name.append(code, title);

  const rating = document.createElement("select");
  rating.dataset.raceRating = "";
  rating.dataset.map = type;
  rating.dataset.fips = String(race.fips).padStart(2, "0");
  Object.entries(RATING_OPTIONS).forEach(([key, option]) => {
    const element = document.createElement("option");
    element.value = key;
    element.textContent = option.label;
    rating.appendChild(element);
  });
  rating.value = RATING_OPTIONS[race.marginCategory] ? race.marginCategory : "no-data";

  const margin = document.createElement("input");
  margin.type = "number";
  margin.min = "0";
  margin.max = "100";
  margin.step = "0.1";
  margin.dataset.raceMargin = "";
  margin.dataset.map = type;
  margin.dataset.fips = String(race.fips).padStart(2, "0");
  margin.value = Number.isFinite(Number(race.predictedMargin)) ? race.predictedMargin : "";
  margin.placeholder = "Optional";

  rating.addEventListener("change", () => {
    const defaultMargin = RATING_OPTIONS[rating.value].margin;
    margin.value = defaultMargin ?? "";
  });

  row.append(name, makeLabel("Rating", rating), makeLabel("Estimated margin", margin));
  return row;
}

function renderRaceEditors() {
  raceEditors.replaceChildren();
  ["senate", "governor"].forEach(type => {
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
}

function selectRaceTab(type) {
  currentRaceTab = type;
  document.querySelectorAll("[data-race-tab]").forEach(button => {
    const active = button.dataset.raceTab === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-race-list]").forEach(list => {
    list.hidden = list.dataset.raceList !== type;
  });
  filterRaces();
}

function filterRaces() {
  const query = raceSearch.value.trim().toLowerCase();
  document.querySelectorAll(`.race-row[data-race-type="${currentRaceTab}"]`).forEach(row => {
    row.hidden = Boolean(query) && !row.dataset.state.includes(query);
  });
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

  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  next.updatedAt = now.toISOString();
  ["house", "senate", "governor"].forEach(key => {
    next.analysis[key].eyebrow ||= "Japoll analysis";
    next.analysis[key].updatedAt = displayDate;
  });
  return next;
}

function updateRaceDataFromEditor() {
  const next = structuredClone(raceData);
  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  ["senate", "governor"].forEach(type => {
    const map = next.maps[type];
    const raceByFips = new Map(map.races.map(race => [String(race.fips).padStart(2, "0"), race]));

    document.querySelectorAll(`[data-race-rating][data-map="${type}"]`).forEach(select => {
      const race = raceByFips.get(select.dataset.fips);
      const option = RATING_OPTIONS[select.value];
      const marginInput = document.querySelector(`[data-race-margin][data-map="${type}"][data-fips="${select.dataset.fips}"]`);
      const margin = marginInput?.value === "" ? option.margin : Number(marginInput.value);
      if (!race || !option) return;

      race.party = option.party;
      race.status = select.value === "no-data" ? "no-data" : "prediction";
      race.marginCategory = select.value;
      race.marginLabel = option.marginLabel;
      race.predictedMargin = margin ?? null;
      race.lastUpdated = displayDate;
    });

    const activeRaces = map.races.filter(race => race.active === true);
    const counts = Object.fromEntries(Object.keys(RATING_OPTIONS).filter(key => key !== "no-data").map(key => [key, 0]));
    activeRaces.forEach(race => {
      if (counts[race.marginCategory] !== undefined) counts[race.marginCategory] += 1;
    });
    map.projection = { ...counts, total: activeRaces.length };
    if (map.marginSummary?.segments) {
      map.marginSummary.total = activeRaces.length;
      map.marginSummary.segments.forEach(segment => { segment.count = counts[segment.key] || 0; });
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
  if (event.target.matches("[data-field], [data-race-rating], [data-race-margin]")) {
    markDirty();
    validatePredictionTotals();
  }
});
document.querySelectorAll("[data-race-tab]").forEach(button => {
  button.addEventListener("click", () => selectRaceTab(button.dataset.raceTab));
});
raceSearch.addEventListener("input", filterRaces);
window.addEventListener("beforeunload", event => {
  if (!hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

if (connectedToken) connectGithub();
loadCurrentData();
