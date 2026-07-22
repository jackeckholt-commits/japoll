const START_MINUTE = 18 * 60;
const MAP_ORDER = ["senate", "house", "governor"];
const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const MAP_MAKER_SIMULATION_KEY = "japoll.map-maker.simulation.v1";
const PLAYBACK_SPEEDS = {
  "very-slow": 1250,
  slow: 800,
  normal: 420,
  fast: 220
};
const MARGIN_BY_CATEGORY = {
  demSolid: 18,
  repSolid: 18,
  demLikely: 11,
  repLikely: 11,
  demLean: 5.5,
  repLean: 5.5,
  demTilt: 2.5,
  repTilt: 2.5,
  tossup: 1,
  "no-data": 2
};
const MARGIN_LIMITS_BY_CATEGORY = {
  demTilt: [0.1, 2.5], repTilt: [0.1, 2.5],
  demLean: [2.6, 7.5], repLean: [2.6, 7.5],
  demLikely: [7.6, 14.9], repLikely: [7.6, 14.9],
  demSolid: [15, 30], repSolid: [15, 30],
  tossup: [0.1, 1.5], "no-data": [0.1, 5]
};
const CUSTOM_MAP_RATINGS = new Set([
  "clear", "dem", "rep", "tossup",
  "demSolid", "demLikely", "demLean", "demTilt",
  "repSolid", "repLikely", "repLean", "repTilt"
]);

const MAP_META = {
  senate: { label: "Senate", className: "is-senate" },
  house: { label: "House", className: "is-house" },
  governor: { label: "Governor", className: "is-governor" }
};

const POLL_CLOSES = {
  AL: 1200, AK: 1500, AZ: 1260, AR: 1170, CA: 1320, CO: 1260, CT: 1200, DE: 1200,
  FL: 1200, GA: 1140, HI: 1440, IA: 1260, ID: 1260, IL: 1200, IN: 1080, KS: 1260,
  KY: 1080, LA: 1260, ME: 1200, MD: 1200, MA: 1200, MI: 1200, MN: 1260, MS: 1200,
  MO: 1200, MT: 1260, NE: 1260, NV: 1320, NH: 1140, NJ: 1200, NM: 1260, NY: 1260,
  NC: 1170, ND: 1260, OH: 1170, OK: 1200, OR: 1320, PA: 1200, RI: 1200, SC: 1140,
  SD: 1260, TN: 1200, TX: 1200, UT: 1320, VT: 1140, VA: 1140, WA: 1320, WV: 1170,
  WI: 1260, WY: 1260, DC: 1200
};

const CALL_DELAYS = {
  demSolid: 15, repSolid: 15,
  demLikely: 55, repLikely: 55,
  demLean: 115, repLean: 115,
  demTilt: 185, repTilt: 185,
  tossup: 270, "no-data": 150
};

const PRESETS = {
  site: { label: "Site prediction", environment: 0 },
  "dem-edge": { label: "Democratic edge", environment: -1 },
  "dem-surge": { label: "Strong Democratic edge", environment: -3 },
  "gop-edge": { label: "GOP edge", environment: 1 },
  "gop-surge": { label: "Strong GOP edge", environment: 3 }
};

const PRESET_BY_ENVIRONMENT = {
  "-3": "dem-surge",
  "-1": "dem-edge",
  "0": "site",
  "1": "gop-edge",
  "3": "gop-surge"
};

let raceData = null;
let baseRaceData = null;
let customMapSimulation = null;
let events = [];
let scenario = "site";
let filter = "all";
let currentMinute = 0;
let customSeed = 0;
let environment = 0;
let randomness = 1;
let variationEnabled = false;
let isPlaying = false;
let playbackSpeed = "slow";
let playbackTimer = null;
let stateAtlas = null;
let houseGeometry = null;

// Race and scenario helpers
function getRaceId(mapKey, race) {
  return mapKey === "house"
    ? String(race.id)
    : String(race.fips || race.state || "").padStart(2, "0");
}

function getRaceKey(mapKey, race) {
  return `${mapKey}:${getRaceId(mapKey, race)}`;
}

function hashRace(race) {
  return String(race.id || `${race.state}-${race.district || race.label || "race"}`)
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function seededValue(race, salt = 0) {
  const value = Math.sin((hashRace(race) + 1) * 12.9898 + customSeed * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function cloneRaceData(data) {
  return JSON.parse(JSON.stringify(data));
}

function readCustomMapSimulation() {
  if (new URLSearchParams(window.location.search).get("map") !== "custom") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(MAP_MAKER_SIMULATION_KEY) || "null");
    if (!saved || !MAP_ORDER.includes(saved.type) || !saved.assignments || typeof saved.assignments !== "object") return null;
    return saved;
  } catch (error) {
    return null;
  }
}

function applyCustomMapSimulation(data, simulation) {
  const races = data.maps?.[simulation.type]?.races || [];
  races.forEach(race => {
    const id = getRaceId(simulation.type, race);
    const rawChoice = simulation.assignments[id] ?? "clear";
    if (!CUSTOM_MAP_RATINGS.has(rawChoice)) return;
    if (rawChoice === "clear") {
      race.active = false;
      return;
    }
    const choice = rawChoice === "dem" ? "demLean" : rawChoice === "rep" ? "repLean" : rawChoice;
    race.customMapChoice = choice;
    race.marginCategory = choice;
    if (choice.startsWith("dem")) race.party = "dem";
    if (choice.startsWith("rep")) race.party = "rep";
  });
}

function getShiftedCategory(category) {
  const magnitude = Math.abs(environment);
  if (!magnitude) return category;

  if (environment < 0) {
    if (magnitude >= 4) return { repLikely: "demLean", repLean: "demLikely", repTilt: "demSolid" }[category] || category;
    if (magnitude >= 3) return { repLikely: "demTilt", repLean: "demLean", repTilt: "demLikely" }[category] || category;
    if (magnitude >= 2) return { repLean: "demTilt", repTilt: "demLean" }[category] || category;
    return category === "repTilt" ? "demTilt" : category;
  }

  if (magnitude >= 4) return { demLikely: "repLean", demLean: "repLikely", demTilt: "repSolid" }[category] || category;
  if (magnitude >= 3) return { demLikely: "repTilt", demLean: "repLean", demTilt: "repLikely" }[category] || category;
  if (magnitude >= 2) return { demLean: "repTilt", demTilt: "repLean" }[category] || category;
  return category === "demTilt" ? "repTilt" : category;
}

function partyFromCategory(category, fallback) {
  if (String(category).startsWith("dem")) return "dem";
  if (String(category).startsWith("rep")) return "rep";
  return fallback === "dem" ? "dem" : "rep";
}

function getVariationChance(category) {
  const label = String(category);
  if (label.includes("Tilt")) return 0.04 * randomness;
  if (label.includes("Lean")) return 0.015 * randomness;
  if (label.includes("Likely")) return 0.004 * randomness;
  return 0;
}

function getOutcomeParty(race, category) {
  if (String(race.customMapChoice).startsWith("dem")) return "dem";
  if (String(race.customMapChoice).startsWith("rep")) return "rep";
  if (race.customMapChoice === "tossup") {
    return variationEnabled
      ? (seededValue(race, 7) < 0.5 ? "dem" : "rep")
      : (hashRace(race) % 2 ? "dem" : "rep");
  }
  const projectedParty = partyFromCategory(category, race.party);
  if (!variationEnabled) return projectedParty;

  const variationChance = getVariationChance(category);
  if (!variationChance || seededValue(race, 1) >= variationChance) return projectedParty;
  return projectedParty === "dem" ? "rep" : "dem";
}

function getCallMinute(race, mapKey, category) {
  const close = POLL_CLOSES[race.state] || 1200;
  const houseStagger = mapKey === "house" ? hashRace(race) % 38 : hashRace(race) % 13;
  const isCloseRace = String(category).includes("Tilt") || String(category).includes("Lean");
  const closeRaceJitter = variationEnabled && isCloseRace
    ? Math.round((seededValue(race, 2) - 0.5) * randomness * 14)
    : 0;
  return close + (CALL_DELAYS[category] ?? CALL_DELAYS["no-data"]) + houseStagger + closeRaceJitter;
}

function formatTime(minute) {
  const total = Math.round(minute / 5) * 5;
  const hour24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix} ET`;
}

function formatMargin(value) {
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function getMarginRange(category) {
  const label = String(category);
  if (label.includes("Solid")) return 1.1;
  if (label.includes("Likely")) return 1.7;
  if (label.includes("Lean")) return 2.3;
  if (label.includes("Tilt")) return 2.7;
  return 2.4;
}

function getEstimatedMargin(event) {
  const category = String(event.category || "no-data");
  const base = MARGIN_BY_CATEGORY[category] ?? MARGIN_BY_CATEGORY["no-data"];
  const range = getMarginRange(category);
  const randomShift = variationEnabled
    ? (seededValue(event.race, 13) - 0.5) * 2 * range * randomness
    : 0;
  const baselineParty = partyFromCategory(category, event.race.party);
  const upset = category !== "tossup" && event.party !== baselineParty;
  const [minimum, maximum] = MARGIN_LIMITS_BY_CATEGORY[category] || MARGIN_LIMITS_BY_CATEGORY["no-data"];
  const estimate = upset ? Math.abs(randomShift) + 0.4 : base + randomShift;
  return Math.min(maximum, Math.max(minimum, estimate));
}

function getRatingLabel(event) {
  const strength = ({
    demSolid: "Solid", repSolid: "Solid",
    demLikely: "Likely", repLikely: "Likely",
    demLean: "Lean", repLean: "Lean",
    demTilt: "Tilt", repTilt: "Tilt"
  })[event.category];
  if (!strength) return event.category === "tossup" ? "Close race" : "Race rating pending";
  return `${strength} ${event.party === "dem" ? "Democratic" : "Republican"}`;
}

function getVariationLabel() {
  return variationEnabled ? (["", "Low", "Medium", "High"][randomness] || "Low") : "Off";
}

// Map hover details and simulation events
function createMapTooltip(slot) {
  const tooltip = document.createElement("div");
  tooltip.className = "simulator-map-tooltip";
  tooltip.hidden = true;
  slot.appendChild(tooltip);
  return tooltip;
}

function bindMapTooltips(paths, slot) {
  const tooltip = createMapTooltip(slot);
  const useTapTooltips = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const hideTooltip = () => { tooltip.hidden = true; };
  const showTooltip = function showTooltip(event) {
    const raceKey = this.dataset.simulatorMapRace;
    const raceEvent = events.find(item => item.key === raceKey);
    if (!raceEvent) return hideTooltip();
    const rect = slot.getBoundingClientRect();
    const maxX = Math.max(8, slot.clientWidth - 226);
    const maxY = Math.max(8, slot.clientHeight - 104);
    const x = Math.max(8, Math.min(maxX, event.clientX - rect.left + 12));
    const y = Math.max(8, Math.min(maxY, event.clientY - rect.top + 12));
    const called = raceEvent.callMinute <= START_MINUTE + currentMinute;
    const status = called ? "Called" : "Est. call";
    const party = raceEvent.party === "dem" ? "Democratic" : "Republican";
    const result = called ? `${party} +${formatMargin(getEstimatedMargin(raceEvent))}` : getRatingLabel(raceEvent);
    tooltip.innerHTML = `<strong>${raceEvent.race.label}</strong><span class="is-${raceEvent.party}">${result}</span><small>${status} ${formatTime(raceEvent.callMinute)}</small>`;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.hidden = false;
  };
  paths
    .on("pointerenter pointermove", showTooltip)
    .on("pointerleave", hideTooltip)
    .on("click", function(event) {
      if (!useTapTooltips) return;
      event.stopPropagation();
      showTooltip.call(this, event);
    });

  if (useTapTooltips) {
    slot.addEventListener("click", event => {
      if (!event.target.closest("[data-simulator-map-race]")) hideTooltip();
    });
  }
}

function createEvents(data) {
  return MAP_ORDER.flatMap(mapKey => {
    const map = data.maps?.[mapKey];
    return (map?.races || [])
      .filter(race => race.active)
      .map(race => {
        const category = getShiftedCategory(race.marginCategory || "no-data");
        return {
          key: getRaceKey(mapKey, race),
          mapKey,
          race,
          category,
          party: getOutcomeParty(race, category),
          callMinute: getCallMinute(race, mapKey, category)
        };
      });
  }).sort((left, right) => left.callMinute - right.callMinute || left.race.label.localeCompare(right.race.label));
}

function getMapSummary(mapKey) {
  const map = raceData.maps?.[mapKey] || {};
  const mapEvents = events.filter(event => event.mapKey === mapKey);
  const called = mapEvents.filter(event => event.callMinute <= START_MINUTE + currentMinute);
  const carryover = map.carryover || { dem: 0, rep: 0 };
  const partyCount = (list, party) => list.filter(event => event.party === party).length;
  return {
    total: mapEvents.length,
    called: called.length,
    dem: Number(carryover.dem || 0) + partyCount(called, "dem"),
    rep: Number(carryover.rep || 0) + partyCount(called, "rep"),
    finalDem: Number(carryover.dem || 0) + partyCount(mapEvents, "dem"),
    finalRep: Number(carryover.rep || 0) + partyCount(mapEvents, "rep"),
    carryover: Number(carryover.dem || 0) + Number(carryover.rep || 0)
  };
}

// Simulator rendering
function renderScoreboard(mapKey) {
  const card = document.querySelector(`[data-simulator-score="${mapKey}"]`);
  if (!card) return;
  const summary = getMapSummary(mapKey);
  const meta = MAP_META[mapKey];
  card.className = `simulator-score-card ${meta.className}`;
  card.innerHTML = `
    <div class="simulator-score-topline"><span>${meta.label}</span><small>${summary.called} of ${summary.total} called</small></div>
    <div class="simulator-score-values"><div class="is-dem"><span>Democrats</span><strong>${summary.dem}</strong></div><div class="is-rep"><span>Republicans</span><strong>${summary.rep}</strong></div></div>
    <p>${summary.carryover ? "Includes seats not up tonight. " : ""}Final simulation: D ${summary.finalDem} · R ${summary.finalRep}</p>
  `;
}

function renderNextCall() {
  const element = document.querySelector("[data-simulator-next-call]");
  if (!element) return;
  const next = events.find(event => event.callMinute > START_MINUTE + currentMinute);
  element.innerHTML = next
    ? `<span>Next estimated call</span><strong>${formatTime(next.callMinute)} · ${next.race.label}</strong>`
    : "<span>Night complete</span><strong>All simulation calls are in</strong>";
}

function renderCallList() {
  const list = document.querySelector("[data-simulator-call-list]");
  if (!list) return;
  const called = events
    .filter(event => event.callMinute <= START_MINUTE + currentMinute && (filter === "all" || event.mapKey === filter))
    .sort((left, right) => right.callMinute - left.callMinute)
    .slice(0, 100);
  list.replaceChildren();

  if (!called.length) {
    const empty = document.createElement("div");
    empty.className = "simulator-empty-calls";
    empty.innerHTML = "<strong>The desk is waiting for polls to close.</strong><span>Move the clock forward to begin the simulation.</span>";
    list.appendChild(empty);
    return;
  }

  called.forEach(event => {
    const item = document.createElement("article");
    item.className = `simulator-call-item is-${event.party}`;
    item.innerHTML = `<time>${formatTime(event.callMinute)}</time><div><span>${MAP_META[event.mapKey].label}</span><strong>${event.race.label || event.race.name}</strong></div><b>${event.party === "dem" ? "D" : "R"}</b>`;
    list.appendChild(item);
  });
}

function updateSimulationMaps() {
  const eventByKey = new Map(events.map(event => [event.key, event]));
  const now = START_MINUTE + currentMinute;
  document.querySelectorAll("[data-simulator-map-race]").forEach(path => {
    const event = eventByKey.get(path.dataset.simulatorMapRace);
    path.dataset.callState = !event ? "inactive" : event.callMinute <= now ? event.party : "pending";
    path.dataset.rating = event?.category || "";
  });
  MAP_ORDER.forEach(mapKey => {
    const count = document.querySelector(`[data-simulator-map-count="${mapKey}"]`);
    if (count) count.textContent = `${getMapSummary(mapKey).called} called`;
  });
}

function renderAll() {
  MAP_ORDER.forEach(renderScoreboard);
  renderNextCall();
  renderCallList();
  updateSimulationMaps();
  const clock = document.querySelector("[data-simulator-clock]");
  const time = document.querySelector("[data-simulator-time]");
  if (clock) clock.value = String(currentMinute);
  if (time) time.textContent = formatTime(START_MINUTE + currentMinute);
  renderPlaybackControls();
}

function enableScrollZoom(svg, viewport) {
  const zoom = d3.zoom()
    .scaleExtent([1, 7])
    .filter(event => event.type === "wheel")
    .on("zoom", event => viewport.attr("transform", event.transform));
  svg.call(zoom)
    .on("mousedown.zoom", null)
    .on("dblclick.zoom", null)
    .on("touchstart.zoom", null);
  return zoom;
}

// Map rendering
function renderStateMap(mapKey) {
  const slot = document.querySelector(`[data-simulator-map="${mapKey}"]`);
  const map = raceData.maps?.[mapKey];
  if (!slot || !map || !stateAtlas || !window.d3 || !window.topojson) return;
  const racesByFips = new Map((map.races || []).map(race => [String(race.fips).padStart(2, "0"), race]));
  const features = topojson.feature(stateAtlas, stateAtlas.objects.states).features;
  const width = 700;
  const height = 430;
  const projection = d3.geoAlbersUsa().fitSize([width, height], { type: "FeatureCollection", features });
  const path = d3.geoPath(projection);
  const svg = d3.select(slot).html("").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img").attr("aria-label", `${MAP_META[mapKey].label} simulation map`);
  const viewport = svg.append("g");
  const paths = viewport.selectAll("path").data(features).join("path")
    .attr("d", path)
    .attr("class", "simulator-map-path")
    .attr("data-simulator-map-race", feature => {
      const race = racesByFips.get(String(feature.id).padStart(2, "0"));
      return race?.active ? getRaceKey(mapKey, race) : "";
    });
  paths.append("title").text(feature => {
      const race = racesByFips.get(String(feature.id).padStart(2, "0"));
      return race?.active ? race.label : "No election on this map";
    });
  bindMapTooltips(paths, slot);
  enableScrollZoom(svg, viewport);
}

function renderHouseMap() {
  const slot = document.querySelector('[data-simulator-map="house"]');
  const map = raceData.maps?.house;
  if (!slot || !map || !houseGeometry || !window.d3) return;
  const racesById = new Map((map.races || []).map(race => [race.id, race]));
  const features = houseGeometry.features || [];
  const width = 1100;
  const height = 620;
  const projection = d3.geoAlbersUsa().fitExtent([[10, 10], [width - 10, height - 10]], { type: "FeatureCollection", features });
  const path = d3.geoPath(projection);
  slot.innerHTML = `<div class="simulator-house-map-toolbar" role="group" aria-label="House map zoom"><button type="button" data-simulator-house-zoom="in" aria-label="Zoom in">+</button><button type="button" data-simulator-house-zoom="out" aria-label="Zoom out">−</button><button type="button" data-simulator-house-zoom="reset">Reset</button></div>`;
  const svg = d3.select(slot).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img").attr("aria-label", "House simulation map");
  const viewport = svg.append("g");
  const paths = viewport.selectAll("path").data(features).join("path")
    .attr("d", path)
    .attr("class", "simulator-map-path simulator-house-path")
    .attr("data-simulator-map-race", feature => {
      const race = racesById.get(feature.properties.id);
      return race?.active ? getRaceKey("house", race) : "";
    });
  paths.append("title").text(feature => features.length ? feature.properties.label : "House district");
  bindMapTooltips(paths, slot);

  const zoom = enableScrollZoom(svg, viewport);
  const controls = slot.querySelector(".simulator-house-map-toolbar");
  controls?.querySelector('[data-simulator-house-zoom="in"]')?.addEventListener("click", () => svg.transition().duration(160).call(zoom.scaleBy, 1.6));
  controls?.querySelector('[data-simulator-house-zoom="out"]')?.addEventListener("click", () => svg.transition().duration(160).call(zoom.scaleBy, 1 / 1.6));
  controls?.querySelector('[data-simulator-house-zoom="reset"]')?.addEventListener("click", () => svg.transition().duration(160).call(zoom.transform, d3.zoomIdentity));
}

function renderSimulationMaps() {
  renderStateMap("senate");
  renderStateMap("governor");
  renderHouseMap();
  updateSimulationMaps();
}

async function loadMapAssets() {
  try {
    const houseUrl = raceData.maps?.house?.geometryUrl || "assets/house-districts-2026.geojson";
    const [atlasResponse, houseResponse] = await Promise.all([fetch(US_ATLAS_URL), fetch(houseUrl)]);
    if (!atlasResponse.ok || !houseResponse.ok) throw new Error("Map geometry could not be loaded.");
    [stateAtlas, houseGeometry] = await Promise.all([atlasResponse.json(), houseResponse.json()]);
    renderSimulationMaps();
  } catch (error) {
    document.querySelectorAll("[data-simulator-map]").forEach(slot => {
      slot.innerHTML = `<p class="simulator-map-error">${error.message}</p>`;
    });
  }
}

// Simulator controls and playback
function updateScenarioControls() {
  document.querySelectorAll("[data-scenario]").forEach(button => {
    const active = button.dataset.scenario === scenario;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const slider = document.querySelector("[data-simulator-swing]");
  const presetLabel = document.querySelector("[data-simulator-preset-label]");
  const label = document.querySelector("[data-simulator-custom-label]");
  if (slider) slider.value = String(environment);
  if (presetLabel) presetLabel.textContent = customMapSimulation
    ? (customMapSimulation.name || "Your map")
    : (PRESETS[scenario]?.label || "Custom environment");
  if (label) label.textContent = "Adjusted with the slider";
  const variationToggle = document.querySelector("[data-simulator-variation-toggle]");
  const variationLevels = document.querySelector("[data-simulator-variation-levels]");
  if (variationToggle) {
    variationToggle.textContent = variationEnabled ? "Variation: On" : "Variation: Off";
    variationToggle.classList.toggle("is-active", variationEnabled);
    variationToggle.setAttribute("aria-pressed", String(variationEnabled));
    variationToggle.setAttribute("aria-expanded", String(variationEnabled));
  }
  if (variationLevels) variationLevels.hidden = !variationEnabled;
  document.querySelectorAll("[data-simulator-variation]").forEach(button => {
    const active = Number(button.dataset.simulatorVariation) === randomness;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const mapSource = document.querySelector("[data-simulator-map-source]");
  if (mapSource) {
    mapSource.hidden = !customMapSimulation;
    mapSource.textContent = customMapSimulation ? `Playing: ${customMapSimulation.name || "your map"}` : "";
  }
}

function stopPlayback() {
  if (playbackTimer) window.clearInterval(playbackTimer);
  playbackTimer = null;
  isPlaying = false;
  renderPlaybackControls();
}

function setupPlaybackSpeedControls() {
  const controls = document.querySelector(".simulator-speed-controls");
  if (!controls) return;
  controls.innerHTML = `
    <button type="button" data-simulator-speed="very-slow" aria-label="Very slow playback speed" aria-pressed="false">0.25x</button>
    <button type="button" data-simulator-speed="slow" aria-label="Slow playback speed" aria-pressed="true">0.5x</button>
    <button type="button" data-simulator-speed="normal" aria-label="Normal playback speed" aria-pressed="false">1x</button>
    <button type="button" data-simulator-speed="fast" aria-label="Fast playback speed" aria-pressed="false">2x</button>
  `;
}

function renderPlaybackControls() {
  const play = document.querySelector("[data-simulator-play]");
  if (play) {
    play.textContent = isPlaying ? "Pause" : "Play";
    play.setAttribute("aria-pressed", String(isPlaying));
  }
  document.querySelectorAll("[data-simulator-speed]").forEach(button => {
    const active = button.dataset.simulatorSpeed === playbackSpeed;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function rebuildSimulation(resetClock = false) {
  events = createEvents(raceData);
  const maxMinute = Math.ceil((Math.max(...events.map(event => event.callMinute), START_MINUTE) - START_MINUTE) / 5) * 5;
  const clock = document.querySelector("[data-simulator-clock]");
  const endTime = document.querySelector("[data-simulator-end-time]");
  if (clock) clock.max = String(maxMinute);
  if (endTime) endTime.textContent = formatTime(START_MINUTE + maxMinute).replace(" ET", "");
  currentMinute = resetClock ? 0 : Math.min(currentMinute, maxMinute);
  updateScenarioControls();
  renderAll();
}

function resetVariationSeed() {
  customSeed = variationEnabled ? Math.random() * 100000 : 0;
}

function setScenario(nextScenario, resetClock = false) {
  stopPlayback();
  if (customMapSimulation) {
    customMapSimulation = null;
    raceData = cloneRaceData(baseRaceData);
  }
  scenario = nextScenario;
  environment = PRESETS[nextScenario].environment;
  resetVariationSeed();
  rebuildSimulation(resetClock);
}

function setCustomEnvironment(value, resetClock = false) {
  stopPlayback();
  environment = Number(value);
  scenario = PRESET_BY_ENVIRONMENT[String(environment)] || "custom";
  resetVariationSeed();
  rebuildSimulation(resetClock);
}

function setVariationEnabled(enabled) {
  variationEnabled = enabled;
  resetVariationSeed();
  stopPlayback();
  rebuildSimulation(true);
}

function setVariationLevel(level) {
  randomness = Number(level);
  if (!variationEnabled) variationEnabled = true;
  resetVariationSeed();
  stopPlayback();
  rebuildSimulation(true);
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }
  const maxMinute = Number(document.querySelector("[data-simulator-clock]")?.max || 0);
  if (currentMinute >= maxMinute) currentMinute = 0;
  isPlaying = true;
  renderPlaybackControls();
  playbackTimer = window.setInterval(() => {
    currentMinute = Math.min(maxMinute, currentMinute + 5);
    renderAll();
    if (currentMinute >= maxMinute) stopPlayback();
  }, PLAYBACK_SPEEDS[playbackSpeed] || PLAYBACK_SPEEDS.slow);
}

function bindControls() {
  document.querySelectorAll("[data-scenario]").forEach(button => button.addEventListener("click", () => setScenario(button.dataset.scenario, true)));
  document.querySelector("[data-simulator-swing]")?.addEventListener("input", event => setCustomEnvironment(event.target.value, true));
  document.querySelector("[data-simulator-variation-toggle]")?.addEventListener("click", () => setVariationEnabled(!variationEnabled));
  document.querySelectorAll("[data-simulator-variation]").forEach(button => button.addEventListener("click", () => setVariationLevel(button.dataset.simulatorVariation)));
  document.querySelector("[data-simulator-play]")?.addEventListener("click", togglePlayback);
  document.querySelectorAll("[data-simulator-speed]").forEach(button => button.addEventListener("click", () => {
    playbackSpeed = button.dataset.simulatorSpeed || "slow";
    renderPlaybackControls();
  }));
  document.querySelectorAll("[data-simulator-filter]").forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.simulatorFilter;
    document.querySelectorAll("[data-simulator-filter]").forEach(control => {
      const active = control.dataset.simulatorFilter === filter;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    });
    renderCallList();
  }));
  document.querySelector("[data-simulator-clock]")?.addEventListener("input", event => {
    stopPlayback();
    currentMinute = Number(event.target.value || 0);
    renderAll();
  });
  document.querySelector("[data-simulator-restart]")?.addEventListener("click", () => {
    stopPlayback();
    currentMinute = 0;
    renderAll();
  });
  document.querySelector("[data-simulator-finish]")?.addEventListener("click", () => {
    stopPlayback();
    currentMinute = Number(document.querySelector("[data-simulator-clock]")?.max || 0);
    renderAll();
  });
}

// Startup
async function startSimulator() {
  const root = document.querySelector("[data-election-simulator]");
  if (!root) return;
  try {
    const response = await fetch("data/races.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Forecast data could not be loaded.");
    baseRaceData = await response.json();
    customMapSimulation = readCustomMapSimulation();
    raceData = cloneRaceData(baseRaceData);
    if (customMapSimulation) applyCustomMapSimulation(raceData, customMapSimulation);
    setupPlaybackSpeedControls();
    bindControls();
    if (customMapSimulation) {
      scenario = "custom-map";
      environment = 0;
      resetVariationSeed();
      rebuildSimulation(true);
    } else {
      setScenario("site");
    }
    void loadMapAssets();
  } catch (error) {
    root.innerHTML = `<section class="simulator-error"><h2>Simulator unavailable</h2><p>${error.message}</p></section>`;
  }
}

document.addEventListener("DOMContentLoaded", startSimulator);
