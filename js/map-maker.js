const MAP_MAKER_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const MAP_MAKER_STORAGE_KEY = "japoll.map-maker.saves.v1";
const MAP_MAKER_SIMULATION_KEY = "japoll.map-maker.simulation.v1";
const MAP_MAKER_TYPES = ["house", "senate", "governor"];
const RATING_STEPS = {
  dem: ["demSolid", "demLikely", "demLean", "demTilt"],
  rep: ["repSolid", "repLikely", "repLean", "repTilt"]
};
const MAP_MAKER_ASSIGNMENTS = new Set(["clear", ...RATING_STEPS.dem, ...RATING_STEPS.rep, "dem", "rep"]);

const MAP_MAKER_META = {
  house: { title: "House", kicker: "Prediction", heading: "House map", noun: "district" },
  senate: { title: "Senate", kicker: "Prediction", heading: "Senate map", noun: "state race" },
  governor: { title: "Governor", kicker: "Prediction", heading: "Governor map", noun: "state race" }
};

let mapMakerData = null;
let mapMakerAtlas = null;
let mapMakerHouseGeometry = null;
let mapMakerType = "house";
let mapMakerParty = "dem";
let selectedRaceId = "";
const mapMakerWorkspaces = {};

// Data and rating helpers
function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  }[character]));
}

function getMap(type = mapMakerType) {
  return mapMakerData?.maps?.[type] || {};
}

function getActiveRaces(type = mapMakerType) {
  return (getMap(type).races || []).filter(race => race.active === true);
}

function getRaceId(type, race) {
  return type === "house" ? String(race.id) : String(race.fips || race.state || "").padStart(2, "0");
}

function getActiveRaceById(id, type = mapMakerType) {
  return getActiveRaces(type).find(race => getRaceId(type, race) === id);
}

function getRaceName(race) {
  return race?.label || race?.name || race?.id || "Race";
}

function describeRace(race, fallback = "No election on this map") {
  if (!race) return fallback;
  const outcome = getOutcome(getRaceId(mapMakerType, race));
  return `${getRaceName(race)}: ${formatOutcome(outcome)}. Click to change the selected party's rating.`;
}

function choiceFromRace(race) {
  const category = String(race.marginCategory || "");
  if (RATING_STEPS.dem.includes(category) || RATING_STEPS.rep.includes(category)) return category;
  if (category.startsWith("dem")) return "demLean";
  if (category.startsWith("rep")) return "repLean";
  return "clear";
}

function makeSiteForecastAssignments(type) {
  return new Map(getActiveRaces(type).map(race => [getRaceId(type, race), choiceFromRace(race)]));
}

function makeDefaultAssignments(type) {
  return new Map();
}

function getWorkspace(type = mapMakerType) {
  if (!mapMakerWorkspaces[type]) {
    mapMakerWorkspaces[type] = { assignments: makeDefaultAssignments(type), name: "", saveId: null, dirty: false };
  }
  return mapMakerWorkspaces[type];
}

function getOutcome(id) {
  return normalizeOutcome(getWorkspace().assignments.get(id));
}

function normalizeOutcome(outcome) {
  if (outcome === "dem") return "demLean";
  if (outcome === "rep") return "repLean";
  if (outcome === "tossup") return "clear";
  return MAP_MAKER_ASSIGNMENTS.has(outcome) ? outcome : "clear";
}

function getOutcomeParty(outcome) {
  const rating = normalizeOutcome(outcome);
  if (rating.startsWith("dem")) return "dem";
  if (rating.startsWith("rep")) return "rep";
  return rating;
}

function nextMapRating(outcome) {
  const current = normalizeOutcome(outcome);
  const ratings = RATING_STEPS[mapMakerParty];
  const index = ratings.indexOf(current);
  if (index < 0) return ratings[0];
  return ratings[index + 1] || "clear";
}

// Browser storage and simulator handoff
function setStatus(message, isError = false) {
  const status = document.querySelector("[data-map-maker-status]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function readSaves() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MAP_MAKER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeSaves(saves) {
  try {
    localStorage.setItem(MAP_MAKER_STORAGE_KEY, JSON.stringify(saves));
    return true;
  } catch (error) {
    setStatus("This browser could not save your prediction. Try allowing site storage.", true);
    return false;
  }
}

function startMapSimulation(prediction) {
  const activeIds = getActiveRaces(prediction.type).map(race => getRaceId(prediction.type, race));
  const assignments = Object.fromEntries(activeIds.map(id => [id, normalizeOutcome(prediction.assignments?.[id])]));
  const payload = {
    version: 1,
    name: prediction.name || `${MAP_MAKER_META[prediction.type].title} prediction`,
    type: prediction.type,
    assignments,
    createdAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(MAP_MAKER_SIMULATION_KEY, JSON.stringify(payload));
    window.location.href = "election-night.html?map=custom";
  } catch (error) {
    setStatus("This browser could not open your simulation. Try allowing site storage.", true);
  }
}

function makeSaveId() {
  return window.crypto?.randomUUID?.() || `map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSavedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatOutcome(outcome) {
  return ({
    demSolid: "Solid Democratic",
    demLikely: "Likely Democratic",
    demLean: "Lean Democratic",
    demTilt: "Tilt Democratic",
    repSolid: "Solid Republican",
    repLikely: "Likely Republican",
    repLean: "Lean Republican",
    repTilt: "Tilt Republican",
    clear: "Uncalled"
  }[normalizeOutcome(outcome)] || "Uncalled");
}

// Workspace summaries and selected-race controls
function summaryForCurrentMap() {
  const counts = { dem: 0, rep: 0, clear: 0 };
  getActiveRaces().forEach(race => {
    counts[getOutcomeParty(getOutcome(getRaceId(mapMakerType, race)))] += 1;
  });
  return counts;
}

function renderSummary() {
  const summary = document.querySelector("[data-map-maker-summary]");
  if (!summary) return;

  const map = getMap();
  const meta = MAP_MAKER_META[mapMakerType];
  const counts = summaryForCurrentMap();
  const carryover = map.carryover || null;
  const demTotal = Number(carryover?.dem || 0) + counts.dem;
  const repTotal = Number(carryover?.rep || 0) + counts.rep;
  const activeTotal = getActiveRaces().length;
  const totalLabel = carryover ? `${activeTotal} races in 2026` : `${activeTotal} districts`;
  const detail = carryover
    ? `Current control before these races: D ${Number(carryover.dem || 0)} and R ${Number(carryover.rep || 0)}.`
    : "Every House district is included.";

  summary.innerHTML = `
    <article class="map-maker-total is-dem"><span>${carryover ? "Democratic picks" : "Democrats"}</span><strong>${counts.dem}</strong><small>${carryover ? `Projected total: ${demTotal}` : "districts picked"}</small></article>
    <article class="map-maker-total is-clear"><span>Uncalled</span><strong>${counts.clear}</strong><small>${activeTotal} races on this map</small></article>
    <article class="map-maker-total is-rep"><span>${carryover ? "Republican picks" : "Republicans"}</span><strong>${counts.rep}</strong><small>${carryover ? `Projected total: ${repTotal}` : "districts picked"}</small></article>
    <p class="map-maker-summary-note"><strong>${totalLabel}</strong><span>${detail}${counts.clear ? ` ${counts.clear} still uncalled.` : ""}</span></p>
  `;
}

function renderDetail() {
  const panel = document.querySelector("[data-map-maker-detail]");
  if (!panel) return;
  const race = getActiveRaceById(selectedRaceId);
  const meta = MAP_MAKER_META[mapMakerType];

  if (!race) {
    panel.innerHTML = `<span class="detail-kicker">${mapMakerParty === "dem" ? "Democrats selected" : "GOP selected"}</span><h3>Select a ${meta.noun}</h3><p>Each click changes only that party's rating.</p>`;
    return;
  }

  const outcome = getOutcome(selectedRaceId);
  const party = getOutcomeParty(outcome);
  panel.innerHTML = `
    <span class="detail-kicker">${escapeHtml(race.state || "House")}</span>
    <h3>${escapeHtml(getRaceName(race))}</h3>
    <p class="map-maker-detail-outcome is-${party}"><i></i><strong>${formatOutcome(outcome)}</strong></p>
    <p class="map-maker-rating-hint">Click again to move through ${mapMakerParty === "dem" ? "Democratic" : "GOP"} ratings.</p>
  `;
}

function updateMapInstruction() {
  const note = document.querySelector("[data-map-maker-map-note]");
  if (!note) return;
  const noun = mapMakerType === "house" ? "a district" : "an active state";
  note.textContent = `${mapMakerParty === "dem" ? "Democrats" : "GOP"} selected. Scroll to zoom; click ${noun} to change its rating.`;
}

function renderPartyPicker() {
  document.querySelectorAll("[data-map-maker-party]").forEach(button => {
    const active = button.dataset.mapMakerParty === mapMakerParty;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateMapInstruction();
}

function setMapMakerParty(party) {
  if (!RATING_STEPS[party]) return;
  mapMakerParty = party;
  renderPartyPicker();
  renderDetail();
}

function updateMapAppearance() {
  const racesById = new Map(getActiveRaces().map(race => [getRaceId(mapMakerType, race), race]));
  document.querySelectorAll("[data-map-maker-race]").forEach(element => {
    const id = element.dataset.mapMakerRace;
    const outcome = getOutcome(id);
    const race = racesById.get(id);
    element.dataset.mapMakerOutcome = getOutcomeParty(outcome);
    element.dataset.mapMakerRating = outcome;
    element.classList.toggle("is-selected", id === selectedRaceId);
    if (race) {
      const label = describeRace(race);
      element.setAttribute("aria-label", label);
      const title = element.querySelector("title");
      if (title) title.textContent = label;
    }
  });
}

function cycleRaceRating(race) {
  const id = getRaceId(mapMakerType, race);
  const workspace = getWorkspace();
  selectedRaceId = id;
  const outcome = nextMapRating(getOutcome(id));
  workspace.assignments.set(id, outcome);
  workspace.dirty = true;
  updateMapAppearance();
  renderSummary();
  renderDetail();
  setStatus(`${getRaceName(race)} set to ${formatOutcome(outcome)}. Tap it again to change it.`);
}

function bindRaceSelection(paths, getRace) {
  return paths
    .on("click", (event, feature) => {
      const race = getRace(feature);
      if (race) cycleRaceRating(race);
    })
    .on("keydown", (event, feature) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const race = getRace(feature);
      if (race) cycleRaceRating(race);
    });
}

function addRaceTitles(paths, getRace, fallback) {
  paths.append("title").text(feature => describeRace(getRace(feature), fallback));
}

function enableMouseWheelZoom(svg, viewport, width, height) {
  const zoom = d3.zoom()
    .filter(event => event.type === "wheel")
    .scaleExtent([1, 10])
    .translateExtent([[-80, -80], [width + 80, height + 80]])
    .on("zoom", event => viewport.attr("transform", event.transform));
  svg.call(zoom).on("dblclick.zoom", null);
  return zoom;
}

// Interactive map rendering
function renderStateMap() {
  const canvas = document.querySelector("[data-map-maker-canvas]");
  if (!canvas || !mapMakerAtlas || !window.d3 || !window.topojson) return;
  const racesByFips = new Map(getActiveRaces().map(race => [getRaceId(mapMakerType, race), race]));
  const features = topojson.feature(mapMakerAtlas, mapMakerAtlas.objects.states).features;
  const width = 980;
  const height = 610;
  const projection = d3.geoAlbersUsa().fitSize([width, height], { type: "FeatureCollection", features });
  const path = d3.geoPath(projection);
  canvas.replaceChildren();
  const svg = d3.select(canvas).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `${MAP_MAKER_META[mapMakerType].title} prediction map`)
    .classed("map-maker-svg", true);

  const viewport = svg.append("g");
  const paths = viewport.selectAll("path").data(features).join("path")
    .attr("d", path)
    .attr("class", feature => racesByFips.has(String(feature.id).padStart(2, "0")) ? "map-maker-path is-editable" : "map-maker-path is-locked")
    .attr("data-map-maker-race", feature => {
      const id = String(feature.id).padStart(2, "0");
      return racesByFips.has(id) ? id : null;
    })
    .attr("data-map-maker-outcome", feature => getOutcomeParty(getOutcome(String(feature.id).padStart(2, "0"))))
    .attr("data-map-maker-rating", feature => getOutcome(String(feature.id).padStart(2, "0")))
    .attr("tabindex", feature => racesByFips.has(String(feature.id).padStart(2, "0")) ? "0" : null)
    .attr("role", feature => racesByFips.has(String(feature.id).padStart(2, "0")) ? "button" : "img")
    .attr("aria-label", feature => describeRace(racesByFips.get(String(feature.id).padStart(2, "0"))));
  bindRaceSelection(paths, feature => racesByFips.get(String(feature.id).padStart(2, "0")));
  addRaceTitles(paths, feature => racesByFips.get(String(feature.id).padStart(2, "0")));
  enableMouseWheelZoom(svg, viewport, width, height);
}

function renderHouseMap() {
  const canvas = document.querySelector("[data-map-maker-canvas]");
  if (!canvas || !mapMakerHouseGeometry || !window.d3) return;
  const features = mapMakerHouseGeometry.features || [];
  const racesById = new Map(getActiveRaces().map(race => [getRaceId("house", race), race]));
  const states = [...new Set(features.map(feature => feature.properties.state))].sort();
  const width = 1100;
  const height = 680;
  const projection = d3.geoAlbersUsa().fitExtent([[18, 18], [width - 18, height - 18]], { type: "FeatureCollection", features });
  const path = d3.geoPath(projection);

  canvas.innerHTML = `
    <div class="map-maker-toolbar">
      <label><span>Jump to a state</span><select data-map-maker-state><option value="">National view</option>${states.map(state => `<option value="${state}">${state}</option>`).join("")}</select></label>
      <div><button type="button" data-map-maker-zoom="in" aria-label="Zoom in">+</button><button type="button" data-map-maker-zoom="out" aria-label="Zoom out">-</button><button type="button" data-map-maker-zoom="reset">Reset</button></div>
    </div>
  `;
  const svg = d3.select(canvas).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "House district prediction map")
    .classed("map-maker-svg map-maker-house-svg", true);
  const viewport = svg.append("g");
  const paths = viewport.selectAll("path").data(features).join("path")
    .attr("d", path)
    .attr("class", "map-maker-path map-maker-house-path is-editable")
    .attr("data-map-maker-race", feature => feature.properties.id)
    .attr("data-map-maker-outcome", feature => getOutcomeParty(getOutcome(feature.properties.id)))
    .attr("data-map-maker-rating", feature => getOutcome(feature.properties.id))
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-label", feature => describeRace(racesById.get(feature.properties.id), feature.properties.label));
  bindRaceSelection(paths, feature => racesById.get(feature.properties.id));
  addRaceTitles(paths, feature => racesById.get(feature.properties.id), "House district");

  const zoom = enableMouseWheelZoom(svg, viewport, width, height);
  const stateSelect = canvas.querySelector("[data-map-maker-state]");
  const reset = () => {
    stateSelect.value = "";
    svg.transition().duration(200).call(zoom.transform, d3.zoomIdentity);
  };
  canvas.querySelector('[data-map-maker-zoom="in"]').addEventListener("click", () => svg.transition().duration(160).call(zoom.scaleBy, 1.55));
  canvas.querySelector('[data-map-maker-zoom="out"]').addEventListener("click", () => svg.transition().duration(160).call(zoom.scaleBy, 1 / 1.55));
  canvas.querySelector('[data-map-maker-zoom="reset"]').addEventListener("click", reset);
  stateSelect.addEventListener("change", event => {
    const state = event.target.value;
    if (!state) return reset();
    const stateFeatures = features.filter(feature => feature.properties.state === state);
    const bounds = path.bounds({ type: "FeatureCollection", features: stateFeatures });
    const dx = Math.max(bounds[1][0] - bounds[0][0], 1);
    const dy = Math.max(bounds[1][1] - bounds[0][1], 1);
    const centerX = (bounds[0][0] + bounds[1][0]) / 2;
    const centerY = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(9, 0.82 / Math.max(dx / width, dy / height));
    svg.transition().duration(240).call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-centerX, -centerY));
  });
}

function renderMap() {
  const meta = MAP_MAKER_META[mapMakerType];
  document.querySelector("[data-map-maker-map-kicker]").textContent = meta.kicker;
  document.querySelector("[data-map-maker-map-title]").textContent = meta.heading;
  updateMapInstruction();
  if (mapMakerType === "house") renderHouseMap();
  else renderStateMap();
  updateMapAppearance();
}

function renderTabs() {
  document.querySelectorAll("[data-map-maker-type]").forEach(button => {
    const active = button.dataset.mapMakerType === mapMakerType;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

// Saved predictions and workspace actions
function renderSavedPredictions() {
  const list = document.querySelector("[data-map-maker-saved-list]");
  if (!list) return;
  const saves = readSaves().sort((left, right) => new Date(right.savedAt) - new Date(left.savedAt));
  if (!saves.length) {
    list.innerHTML = `<div class="map-maker-saved-empty"><strong>No saved predictions yet.</strong><span>Name your map and select Save prediction to keep it here.</span></div>`;
    return;
  }
  list.innerHTML = saves.map(save => `
    <article class="map-maker-saved-card">
      <div><span>${escapeHtml(MAP_MAKER_META[save.type]?.title || "Map")} prediction</span><h3>${escapeHtml(save.name || "Untitled prediction")}</h3><p>Saved ${formatSavedDate(save.savedAt)}</p></div>
      <div class="map-maker-saved-actions"><button type="button" data-map-maker-load="${escapeHtml(save.id)}">Open</button><button type="button" data-map-maker-simulate-save="${escapeHtml(save.id)}">Simulate</button><button type="button" data-map-maker-delete="${escapeHtml(save.id)}" aria-label="Delete ${escapeHtml(save.name || "prediction")}">Delete</button></div>
    </article>
  `).join("");
}

function renderWorkspace() {
  const workspace = getWorkspace();
  selectedRaceId = "";
  document.querySelector("[data-map-maker-name]").value = workspace.name;
  const resetButton = document.querySelector("[data-map-maker-reset]");
  if (resetButton) resetButton.textContent = mapMakerType === "house" ? "Start from House forecast" : "Start from site forecast";
  renderTabs();
  renderPartyPicker();
  renderSummary();
  renderDetail();
  renderMap();
  renderSavedPredictions();
  setStatus(workspace.saveId ? "Saved prediction loaded. Changes are not saved until you save again." : "Not saved yet.");
}

function setMapType(type, updateUrl = true) {
  if (!MAP_MAKER_TYPES.includes(type)) return;
  mapMakerType = type;
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("race", type);
    window.history.replaceState({}, "", url);
  }
  renderWorkspace();
}

function saveCurrentPrediction() {
  const workspace = getWorkspace();
  const input = document.querySelector("[data-map-maker-name]");
  workspace.name = input.value.trim() || `${MAP_MAKER_META[mapMakerType].title} prediction`;
  input.value = workspace.name;
  const saves = readSaves();
  const record = {
    id: workspace.saveId || makeSaveId(),
    version: 1,
    name: workspace.name,
    type: mapMakerType,
    assignments: Object.fromEntries(workspace.assignments),
    savedAt: new Date().toISOString()
  };
  const existingIndex = saves.findIndex(save => save.id === record.id);
  if (existingIndex >= 0) saves[existingIndex] = record;
  else saves.unshift(record);
  if (!writeSaves(saves)) return;
  workspace.saveId = record.id;
  workspace.dirty = false;
  renderSavedPredictions();
  setStatus(`Saved as “${workspace.name}”.`);
}

function simulateCurrentPrediction() {
  const workspace = getWorkspace();
  startMapSimulation({
    name: document.querySelector("[data-map-maker-name]").value.trim() || workspace.name,
    type: mapMakerType,
    assignments: Object.fromEntries(workspace.assignments)
  });
}

function resetToSiteForecast() {
  const workspace = getWorkspace();
  workspace.assignments = makeSiteForecastAssignments(mapMakerType);
  workspace.saveId = null;
  workspace.dirty = true;
  selectedRaceId = "";
  renderSummary();
  renderDetail();
  renderMap();
  setStatus("Started a fresh map from the site forecast. Save it to keep it.");
}

function clearCurrentMap() {
  const workspace = getWorkspace();
  workspace.assignments = new Map();
  workspace.saveId = null;
  workspace.dirty = true;
  selectedRaceId = "";
  renderSummary();
  renderDetail();
  renderMap();
  setStatus("Map cleared. Click races to build your prediction.");
}

function newPrediction() {
  const workspace = getWorkspace();
  workspace.assignments = makeDefaultAssignments();
  workspace.name = "";
  workspace.saveId = null;
  workspace.dirty = false;
  renderWorkspace();
  setStatus("New prediction ready. Give it a name when you are ready to save.");
}

function loadSavedPrediction(id) {
  const save = readSaves().find(item => item.id === id);
  if (!save || !MAP_MAKER_TYPES.includes(save.type)) return;
  const allowedIds = new Set(getActiveRaces(save.type).map(race => getRaceId(save.type, race)));
  const assignments = new Map(Object.entries(save.assignments || {})
    .map(([key, value]) => [key, normalizeOutcome(value)])
    .filter(([key, value]) => allowedIds.has(key) && value !== "clear"));
  mapMakerWorkspaces[save.type] = { assignments, name: save.name || "", saveId: save.id, dirty: false };
  setMapType(save.type);
}

function deleteSavedPrediction(id) {
  const saves = readSaves();
  const save = saves.find(item => item.id === id);
  if (!save || !window.confirm(`Delete “${save.name || "this prediction"}”?`)) return;
  if (!writeSaves(saves.filter(item => item.id !== id))) return;
  Object.values(mapMakerWorkspaces).forEach(workspace => {
    if (workspace.saveId === id) workspace.saveId = null;
  });
  renderSavedPredictions();
  setStatus("Saved prediction deleted.");
}

function bindMapMakerControls() {
  document.querySelectorAll("[data-map-maker-type]").forEach(button => button.addEventListener("click", () => setMapType(button.dataset.mapMakerType)));
  document.querySelectorAll("[data-map-maker-party]").forEach(button => button.addEventListener("click", () => setMapMakerParty(button.dataset.mapMakerParty)));
  document.querySelector("[data-map-maker-name]").addEventListener("input", event => {
    const workspace = getWorkspace();
    workspace.name = event.target.value;
    workspace.dirty = true;
  });
  document.querySelector("[data-map-maker-save]").addEventListener("click", saveCurrentPrediction);
  document.querySelectorAll("[data-map-maker-simulate]").forEach(button => button.addEventListener("click", simulateCurrentPrediction));
  document.querySelector("[data-map-maker-reset]").addEventListener("click", resetToSiteForecast);
  document.querySelector("[data-map-maker-clear]").addEventListener("click", clearCurrentMap);
  document.querySelector("[data-map-maker-new]").addEventListener("click", newPrediction);
  document.querySelector("[data-map-maker-saved-list]").addEventListener("click", event => {
    const load = event.target.closest("[data-map-maker-load]");
    const simulate = event.target.closest("[data-map-maker-simulate-save]");
    const remove = event.target.closest("[data-map-maker-delete]");
    if (load) loadSavedPrediction(load.dataset.mapMakerLoad);
    if (simulate) {
      const save = readSaves().find(item => item.id === simulate.dataset.mapMakerSimulateSave);
      if (save && MAP_MAKER_TYPES.includes(save.type)) startMapSimulation(save);
    }
    if (remove) deleteSavedPrediction(remove.dataset.mapMakerDelete);
  });
}

// Startup
async function startMapMaker() {
  const root = document.querySelector("[data-map-maker]");
  if (!root) return;
  const requestedType = new URLSearchParams(window.location.search).get("race");
  if (MAP_MAKER_TYPES.includes(requestedType)) mapMakerType = requestedType;
  try {
    const [raceResponse, atlasResponse] = await Promise.all([
      fetch("data/races.json", { cache: "no-store" }),
      fetch(MAP_MAKER_ATLAS_URL)
    ]);
    if (!raceResponse.ok || !atlasResponse.ok) throw new Error("The prediction map data could not load.");
    mapMakerData = await raceResponse.json();
    mapMakerAtlas = await atlasResponse.json();
    const houseResponse = await fetch(mapMakerData.maps?.house?.geometryUrl || "assets/house-districts-2026.geojson");
    if (!houseResponse.ok) throw new Error("The House district map could not load.");
    mapMakerHouseGeometry = await houseResponse.json();
    bindMapMakerControls();
    renderWorkspace();
  } catch (error) {
    root.innerHTML = `<section class="map-maker-error"><h2>Map maker unavailable</h2><p>${escapeHtml(error.message)}</p></section>`;
  }
}

document.addEventListener("DOMContentLoaded", startMapMaker);
