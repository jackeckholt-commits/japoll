const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS_TO_POSTAL = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS",
  "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY",
  "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC",
  "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY"
};

const COMPACT_LABEL_STATES = new Set(["CT", "DE", "MD", "MA", "NH", "NJ", "RI", "VT", "DC"]);
const TINY_LABEL_STATES = new Set(["HI"]);

const RATING_LABELS = {
  "no-data": "Unrated",
  tossup: "Toss-up",
  demSolid: "Safe Democrat",
  demLikely: "Likely Democrat",
  demLean: "Lean Democrat",
  demTilt: "Tilt Democrat",
  repTilt: "Tilt Republican",
  repLean: "Lean Republican",
  repLikely: "Likely Republican",
  repSolid: "Safe Republican"
};


function getRaceClass(race) {
  if (!race || race.active !== true) return "state-no-race";
  if (race.marginCategory && race.marginCategory !== "no-data") return `state-${race.marginCategory}`;
  if (race.status === "called" && race.party === "dem") return "state-called-dem";
  if (race.status === "called" && race.party === "rep") return "state-called-rep";
  if (race.status === "leading" && race.party === "dem") return "state-lead-dem";
  if (race.status === "leading" && race.party === "rep") return "state-lead-rep";
  if (race.status === "tossup") return "state-tossup";
  return "state-active-no-data";
}

function formatRaceStatus(race) {
  if (!race || race.active !== true) return "No active race on this map";
  if (race.status === "prediction") {
    return RATING_LABELS[race.marginCategory] || (race.party === "dem" ? "Democratic advantage" : "Republican advantage");
  }
  if (race.status === "called") return `${race.party === "dem" ? "Democratic" : "Republican"} hold/pickup`;
  if (race.status === "leading") return `${race.party === "dem" ? "Democrats" : "Republicans"} currently leading`;
  if (race.status === "tossup") return "Toss-up";
  return "No rating data yet";
}

function renderProjectionBar(container, mapData) {
  if (renderMarginSummary(container, mapData)) return;
  const control = mapData.control || null;

  if (control) {
    const total = Number(control.total || 1);
    const demValue = Number(control.dem || 0);
    const repValue = Number(control.rep || 0);
    const demWidth = Math.max((demValue / total) * 100, 3);
    const repWidth = Math.max((repValue / total) * 100, 3);
    const formatValue = value => control.showDecimals ? value.toFixed(1) : String(Math.round(value));

    container.innerHTML = `
      <div class="race-control-heading">
        <h3>${control.title || "Current Control"}</h3>
        <p>${control.majorityText || ""}</p>
      </div>
      <div class="race-control-bar current-control-bar" aria-label="${control.title || "Current control"}">
        <div class="race-bar-segment bar-dem-solid" style="width:${demWidth}%">
          <span><strong class="bar-count">${formatValue(demValue)}</strong><strong class="bar-label">${control.leftLabel || "D"}</strong></span>
        </div>
        <div class="race-bar-segment bar-rep-solid" style="width:${repWidth}%">
          <span><strong class="bar-count">${formatValue(repValue)}</strong><strong class="bar-label">${control.rightLabel || "R"}</strong></span>
        </div>
      </div>
      <div class="race-bar-subnote">${control.subtitle || ""}</div>
    `;
    return;
  }

  const projection = mapData.projection || {};
  const total = projection.total || 1;
  const segments = [
    ["demSolid", "Called/held D", "bar-dem-solid"],
    ["demLead", "D leading", "bar-dem-lead"],
    ["noData", "No data yet", "bar-no-data"],
    ["repLead", "R leading", "bar-rep-lead"],
    ["repSolid", "Called/held R", "bar-rep-solid"]
  ];

  const markup = segments.map(([key, label, className]) => {
    const value = Number(projection[key] || 0);
    if (value <= 0) return "";
    const width = Math.max((value / total) * 100, 3);
    return `<div class="race-bar-segment ${className}" style="width:${width}%"><span>${value}</span></div>`;
  }).join("");

  container.innerHTML = `
    <div class="race-bar-topline">
      <strong>${mapData.totalLabel || "Race map"}</strong>
      <span>placeholder race data</span>
    </div>
    <div class="race-control-bar" aria-label="Race control bar">${markup}</div>
    <div class="race-bar-legend">
      <span><i class="legend-swatch dem-solid"></i>Dem held/called</span>
      <span><i class="legend-swatch dem-lead"></i>Dem leading</span>
      <span><i class="legend-swatch no-data"></i>No data yet</span>
      <span><i class="legend-swatch rep-lead"></i>GOP leading</span>
      <span><i class="legend-swatch rep-solid"></i>GOP held/called</span>
    </div>
  `;
}



function getCandidatePartyClass(candidate) {
  const party = String(candidate.party || "").toLowerCase();
  if (candidate.demAligned || party.includes("dem-aligned")) return "is-dem-aligned";
  if (party.includes("democratic")) return "is-democrat";
  if (party.includes("republican")) return "is-republican";
  if (party.includes("libertarian")) return "is-libertarian";
  if (party.includes("independent")) return "is-independent";
  return "";
}

function getCandidateStatus(candidate, race) {
  if (candidate.statusLabel) return candidate.statusLabel;
  if (candidate.status) return candidate.status;
  if (candidate.incumbent) return "Incumbent";
  if (candidate.nominee) return "Nominee";
  if (race && race.candidateStatus) return race.candidateStatus;
  return "Candidate listed";
}

function getCandidateLastUpdated(candidate, race, mapData) {
  return candidate.lastUpdated || (race && race.lastUpdated) || (mapData && mapData.lastUpdated) || "Not yet listed";
}

function renderCandidateLinks(candidate) {
  const links = [];
  if (candidate.wikipedia) {
    links.push(`<a href="${candidate.wikipedia}" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a>`);
  }
  const campaignUrl = candidate.campaign || candidate.campaignWebsite || candidate.website;
  if (campaignUrl) {
    links.push(`<a href="${campaignUrl}" target="_blank" rel="noopener noreferrer">Campaign ↗</a>`);
  }
  if (!links.length) return "";
  return `<div class="candidate-actions">${links.join("")}</div>`;
}

function renderCandidateList(race, mapData) {
  const candidates = Array.isArray(race.candidates) ? race.candidates : [];
  if (!candidates.length) {
    return `
      <div class="candidate-waiting">
        <strong>Primary pending</strong>
        <span>Candidate links will appear once the matchup is clear.</span>
      </div>
    `;
  }
  return `
    <div class="candidate-list candidate-list-v2">
      ${candidates.map(candidate => `
        <article class="candidate-card ${getCandidatePartyClass(candidate)}">
          <div class="candidate-card-top candidate-card-top-simple">
            <strong>${candidate.name}</strong>
            ${candidate.party ? `<small>${candidate.party}</small>` : ""}
          </div>
          ${renderCandidateLinks(candidate)}
        </article>
      `).join("")}
    </div>
  `;
}

function renderRaceLinks(race, mapData) {
  if (mapData.unitLabel !== "district") return "";
  const sourceLinks = [
    [race.links?.primaryResults, race.links?.primaryResultsLabel || "Primary & results"],
    [race.links?.wikipedia, "Wikipedia"]
  ].filter(([url]) => Boolean(url));

  if (!sourceLinks.length) return "";
  return `
    <div class="race-resource-links">
      <h4>Race links</h4>
      <div class="candidate-actions">
        ${sourceLinks.map(([url, label]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join("")}
      </div>
    </div>
  `;
}

function renderMarginSummary(container, mapData) {
  const summary = mapData.marginSummary;
  if (!summary || !Array.isArray(summary.segments)) return false;
  const total = Number(summary.total || summary.segments.reduce((sum, segment) => sum + Number(segment.count || 0), 0) || 1);
  const segments = summary.segments.map(segment => {
    const count = Number(segment.count || 0);
    if (count <= 0) return "";
    const width = Math.max((count / total) * 100, 3);
    const accessibleLabel = `${count} ${RATING_LABELS[segment.key] || "unrated"}`;
    return `<div class="margin-bar-segment ${segment.className || ""}" style="width:${width}%" aria-label="${accessibleLabel}" title="${accessibleLabel}"><strong>${count}</strong></div>`;
  }).join("");
  const legend = `
    <div class="margin-scale-legend" aria-label="Race rating color legend">
      <span><i class="margin-dem-solid"></i>Safe D</span>
      <span><i class="margin-dem-likely"></i>Likely D</span>
      <span><i class="margin-dem-lean"></i>Lean D</span>
      <span><i class="margin-dem-tilt"></i>Tilt D</span>
      <span><i class="margin-unrated"></i>Unrated</span>
      <span><i class="margin-rep-tilt"></i>Tilt R</span>
      <span><i class="margin-rep-lean"></i>Lean R</span>
      <span><i class="margin-rep-likely"></i>Likely R</span>
      <span><i class="margin-rep-solid"></i>Safe R</span>
    </div>
  `;
  container.innerHTML = `
    <div class="race-control-heading prediction-heading">
      <h3>${summary.title || "Race Prediction"}</h3>
      <p>${summary.subtitle || ""}</p>
    </div>
    <div class="margin-control-bar" aria-label="${summary.title || "Race rating summary"}">${segments}</div>
    ${legend}
    <div class="margin-legend-note">Ratings move from Tilt to Lean, Likely, and Safe.</div>
  `;
  return true;
}

function renderRaceDetail(panel, race, mapData) {
  if (!race) {
    const unit = mapData.unitLabel === "district" ? "district" : "state";
    const activeLabel = unit === "district" ? "Every district is selectable" : "Colored states have active races";
    panel.innerHTML = `
      <div class="race-detail-empty">
        <span class="detail-kicker">Interactive map</span>
        <h3>Select a ${unit}</h3>
        <p>Choose a ${unit} to view its current rating, candidate matchup, and race links.</p>
        <div class="race-detail-hint">
          <i aria-hidden="true"></i>
          <span>${activeLabel}</span>
        </div>
      </div>
    `;
    return;
  }
  const noteLine = race.note ? `<p>${race.note}</p>` : "";

  panel.innerHTML = `
    <span class="detail-kicker">${race.state}</span>
    <h3>${race.label || race.name}</h3>
    <p><strong>Status:</strong> ${formatRaceStatus(race)}</p>
    ${noteLine}
    <h4 class="candidate-heading">Candidates</h4>
    ${renderCandidateList(race, mapData)}
    ${renderRaceLinks(race, mapData)}
  `;
}

async function loadRaceData() {
  const raceResponse = await fetch("data/races.json", { cache: "no-store" });
  if (!raceResponse.ok) throw new Error("Could not load data/races.json");
  return raceResponse.json();
}

async function loadStateAtlas() {
  const atlasResponse = await fetch(US_ATLAS_URL);
  if (!atlasResponse.ok) throw new Error("Could not load US map geometry");
  return atlasResponse.json();
}

async function loadHouseGeometry(mapData) {
  const geometryResponse = await fetch(mapData.geometryUrl || "assets/house-districts-2026.geojson");
  if (!geometryResponse.ok) throw new Error("Could not load 2026 House district geometry");
  return geometryResponse.json();
}

function renderRaceMap(section, mapData, atlas) {
  const mapSlot = section.querySelector("[data-race-map-svg]");
  const detailPanel = section.querySelector("[data-race-detail]");
  const barSlot = section.querySelector("[data-race-bar]");

  if (!mapSlot || !detailPanel || !barSlot) return;

  renderProjectionBar(barSlot, mapData);
  renderCurrentCompositionNote(barSlot, mapData);
  renderRaceDetail(detailPanel, null, mapData);

  const raceByFips = new Map((mapData.races || []).map(race => [String(race.fips).padStart(2, "0"), race]));
  const stateFeatures = topojson.feature(atlas, atlas.objects.states).features;

  const width = 980;
  const height = 610;
  const projection = d3.geoAlbersUsa().fitSize([width, height], {
    type: "FeatureCollection",
    features: stateFeatures
  });
  const path = d3.geoPath(projection);

  const svg = d3.select(mapSlot)
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `${mapData.title} map`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("race-map-svg", true);

  svg.append("g")
    .attr("class", "race-map-states")
    .selectAll("path")
    .data(stateFeatures)
    .join("path")
    .attr("d", path)
    .attr("class", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const clickable = race && race.active === true ? " is-clickable" : "";
      return `race-state ${getRaceClass(race)}${clickable}`;
    })
    .attr("tabindex", feature => {
      const race = raceByFips.get(String(feature.id).padStart(2, "0"));
      return race && race.active === true ? "0" : null;
    })
    .attr("role", feature => {
      const race = raceByFips.get(String(feature.id).padStart(2, "0"));
      return race && race.active === true ? "button" : "img";
    })
    .attr("aria-label", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const postal = FIPS_TO_POSTAL[fips] || fips;
      return race ? `${race.name}: ${formatRaceStatus(race)}` : `${postal}: no active race`;
    })
    .on("click", function(event, feature) {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      if (!race || race.active !== true) return;

      svg.selectAll(".race-state").classed("is-selected", false);
      d3.select(this).classed("is-selected", true);
      renderRaceDetail(detailPanel, race, mapData);
    })
    .on("keydown", function(event, feature) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    })
    .append("title")
    .text(feature => {
      const fips = String(feature.id).padStart(2, "0");
      const race = raceByFips.get(fips);
      const postal = FIPS_TO_POSTAL[fips] || fips;
      return race ? `${race.name}: ${formatRaceStatus(race)}` : `${postal}: no active race`;
    });

  svg.append("g")
    .attr("class", "race-map-labels")
    .selectAll("text")
    .data(stateFeatures)
    .join("text")
    .attr("class", feature => {
      const fips = String(feature.id).padStart(2, "0");
      const postal = FIPS_TO_POSTAL[fips] || "";
      const race = raceByFips.get(fips);
      const classes = ["race-state-label"];
      if (race && race.active === true) classes.push("is-active");
      if (COMPACT_LABEL_STATES.has(postal)) classes.push("is-compact");
      if (TINY_LABEL_STATES.has(postal)) classes.push("is-tiny");
      return classes.join(" ");
    })
    .attr("x", feature => {
      const centroid = path.centroid(feature);
      return Number.isFinite(centroid[0]) ? centroid[0] : -999;
    })
    .attr("y", feature => {
      const centroid = path.centroid(feature);
      return Number.isFinite(centroid[1]) ? centroid[1] : -999;
    })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(feature => FIPS_TO_POSTAL[String(feature.id).padStart(2, "0")] || "");
}

function renderHouseDistrictMap(section, mapData, geoJson) {
  const mapSlot = section.querySelector("[data-race-map-svg]");
  const detailPanel = section.querySelector("[data-race-detail]");
  const barSlot = section.querySelector("[data-race-bar]");
  if (!mapSlot || !detailPanel || !barSlot) return;

  renderProjectionBar(barSlot, mapData);
  renderRaceDetail(detailPanel, null, mapData);

  const races = Array.isArray(mapData.races) ? mapData.races : [];
  const raceById = new Map(races.map(race => [race.id, race]));
  const features = Array.isArray(geoJson.features) ? geoJson.features : [];
  const width = 1100;
  const height = 680;
  const featureCollection = { type: "FeatureCollection", features };
  const projection = d3.geoAlbersUsa().fitExtent([[18, 18], [width - 18, height - 18]], featureCollection);
  const path = d3.geoPath(projection);
  const states = [...new Set(features.map(feature => feature.properties.state))].sort();

  mapSlot.innerHTML = `
    <div class="house-map-toolbar">
      <label>
        <span>Jump to a state</span>
        <select data-house-map-state>
          <option value="">National view</option>
          ${states.map(state => `<option value="${state}">${state}</option>`).join("")}
        </select>
      </label>
      <div class="house-map-zoom" aria-label="Map zoom controls">
        <button type="button" data-map-zoom-in aria-label="Zoom in">+</button>
        <button type="button" data-map-zoom-out aria-label="Zoom out">−</button>
        <button type="button" data-map-reset>Reset</button>
      </div>
    </div>
  `;

  const svg = d3.select(mapSlot)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "2026 United States House district rating map")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("race-map-svg house-district-map-svg", true);
  const viewport = svg.append("g").attr("class", "house-map-viewport");

  const districts = viewport.append("g")
    .attr("class", "house-map-districts")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("d", path)
    .attr("class", feature => {
      const race = raceById.get(feature.properties.id);
      return `house-district ${getRaceClass(race)} is-clickable`;
    })
    .attr("tabindex", "0")
    .attr("role", "button")
    .attr("aria-label", feature => {
      const race = raceById.get(feature.properties.id);
      return `${feature.properties.label}: ${formatRaceStatus(race)}`;
    })
    .on("click", function(event, feature) {
      const race = raceById.get(feature.properties.id);
      if (!race) return;
      districts.classed("is-selected", false);
      d3.select(this).classed("is-selected", true);
      renderRaceDetail(detailPanel, race, mapData);
    })
    .on("keydown", function(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

  districts.append("title").text(feature => {
    const race = raceById.get(feature.properties.id);
    return `${feature.properties.label}: ${formatRaceStatus(race)}`;
  });

  const updateFocusedState = state => {
    districts
      .classed("is-outside-focus", feature => Boolean(state) && feature.properties.state !== state)
      .attr("tabindex", feature => !state || feature.properties.state === state ? "0" : "-1");
  };

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[-80, -80], [width + 80, height + 80]])
    .on("zoom", event => {
      viewport.attr("transform", event.transform);
    });
  svg.call(zoom);

  const zoomBy = factor => svg.transition().duration(180).call(zoom.scaleBy, factor);
  mapSlot.querySelector("[data-map-zoom-in]").addEventListener("click", () => zoomBy(1.55));
  mapSlot.querySelector("[data-map-zoom-out]").addEventListener("click", () => zoomBy(1 / 1.55));

  const resetMap = () => {
    mapSlot.querySelector("[data-house-map-state]").value = "";
    updateFocusedState("");
    svg.transition().duration(220).call(zoom.transform, d3.zoomIdentity);
  };
  mapSlot.querySelector("[data-map-reset]").addEventListener("click", resetMap);

  mapSlot.querySelector("[data-house-map-state]").addEventListener("change", event => {
    const state = event.target.value;
    if (!state) {
      updateFocusedState("");
      svg.transition().duration(220).call(zoom.transform, d3.zoomIdentity);
      return;
    }
    updateFocusedState(state);
    const stateFeatures = features.filter(feature => feature.properties.state === state);
    const bounds = path.bounds({ type: "FeatureCollection", features: stateFeatures });
    const dx = Math.max(bounds[1][0] - bounds[0][0], 1);
    const dy = Math.max(bounds[1][1] - bounds[0][1], 1);
    const centerX = (bounds[0][0] + bounds[1][0]) / 2;
    const centerY = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(9, 0.82 / Math.max(dx / width, dy / height));
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);
    svg.transition().duration(260).call(zoom.transform, transform);
  });
}

function renderCurrentCompositionNote(container, mapData) {
  const note = mapData.currentCompositionNote;
  if (!note || !container) return;

  const wrapper = document.createElement("div");
  wrapper.className = "current-composition-note";
  wrapper.innerHTML = `
    <h4>${note.title || "Current seats not up this cycle"}</h4>
    <p>${note.text || ""}</p>
    <div class="composition-pill-row">
      ${(note.items || []).map(item => `
        <span class="composition-pill ${item.className || ""}">
          <strong>${item.value}</strong>
          <small>${item.label}</small>
        </span>
      `).join("")}
    </div>
  `;
  container.appendChild(wrapper);
}

async function initializeRaceMaps() {
  const sections = document.querySelectorAll("[data-race-map]");
  if (!sections.length) return;

  try {
    const raceData = await loadRaceData();
    const keys = new Set([...sections].map(section => section.getAttribute("data-race-map")));
    const [atlas, houseGeometry] = await Promise.all([
      keys.has("senate") || keys.has("governor") ? loadStateAtlas() : Promise.resolve(null),
      keys.has("house") ? loadHouseGeometry(raceData.maps?.house || {}) : Promise.resolve(null)
    ]);

    sections.forEach(section => {
      const key = section.getAttribute("data-race-map");
      const mapData = raceData.maps && raceData.maps[key];

      if (!mapData) return;
      if (key === "house") renderHouseDistrictMap(section, mapData, houseGeometry);
      else renderRaceMap(section, mapData, atlas);
    });
  } catch (error) {
    console.error("Could not load race map:", error);
    sections.forEach(section => {
      const mapSlot = section.querySelector("[data-race-map-svg]");
      if (mapSlot) {
        mapSlot.innerHTML = `
          <div class="map-error">
            <strong>Map could not load.</strong>
            <p>Try refreshing the page. The map uses public U.S. election geometry.</p>
          </div>
        `;
      }
    });
  }
}

initializeRaceMaps();
