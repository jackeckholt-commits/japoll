const HOUSE_BUCKETS = [
  { key: "demSafe", label: "Safe D", className: "house-bar-dem-safe" },
  { key: "demLikely", label: "Likely D", className: "house-bar-dem-likely" },
  { key: "demLean", label: "Lean/Tilt D", className: "house-bar-dem-lean" },
  { key: "tossup", label: "Toss Up", className: "house-bar-tossup" },
  { key: "repLean", label: "Lean/Tilt R", className: "house-bar-rep-lean" },
  { key: "repLikely", label: "Likely R", className: "house-bar-rep-likely" },
  { key: "repSafe", label: "Safe R", className: "house-bar-rep-safe" }
];

const HOUSE_PREDICTION_BUCKETS = [
  { key: "demProjected", label: "Democrats", className: "house-bar-proj-dem" },
  { key: "repProjected", label: "Republicans", className: "house-bar-proj-rep" }
];

function formatSeatValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatUpdatedDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getCategoryTotal(categories, buckets = HOUSE_BUCKETS) {
  return buckets.reduce((sum, bucket) => sum + Number(categories[bucket.key] || 0), 0) || 435;
}

function renderHouseSeatBar(categories, options = {}) {
  const buckets = options.prediction ? HOUSE_PREDICTION_BUCKETS : HOUSE_BUCKETS;
  const total = getCategoryTotal(categories, buckets);
  const majority = Number(options.majority || 218);
  const totalSeats = Number(options.totalSeats || total || 435);
  const majorityLeft = Math.max(0, Math.min(100, (majority / totalSeats) * 100));

  return `
    <div class="house-seat-bar ${options.compact ? "is-compact" : ""} ${options.prediction ? "is-prediction" : ""}" role="img" aria-label="${options.prediction ? "House seat prediction bar" : "House seat rating bar"}">
      ${buckets.map(bucket => {
        const value = Number(categories[bucket.key] || 0);
        if (value <= 0) return "";
        const width = Math.max((value / total) * 100, options.compact ? 4 : 6);
        return `
          <div class="house-seat-segment ${bucket.className}" style="width:${width}%" title="${bucket.label}: ${formatSeatValue(value)} seats">
            <span>${bucket.label}</span>
            <strong>${formatSeatValue(value)}</strong>
          </div>
        `;
      }).join("")}
      ${options.prediction ? `
        <div class="house-majority-marker" style="left:${majorityLeft}%">
          <i></i>
          <b>${formatSeatValue(majority)}</b>
        </div>
      ` : ""}
    </div>
  `;
}

function renderHouseOverview(data) {
  const averageSlot = document.querySelector("[data-house-average-bar]");
  const updatedSlot = document.querySelector("[data-house-updated]");
  const demSlot = document.querySelector("[data-house-dem-total]");
  const repSlot = document.querySelector("[data-house-rep-total]");
  const predictionNoteSlot = document.querySelector("[data-house-allocation-note]");
  const leadSlot = document.querySelector("[data-house-lead-note]");
  const legendSlot = document.querySelector("[data-house-legend]");

  const prediction = data.prediction || {};
  const predictionCategories = prediction.categories || {
    demProjected: data.summary.projectedDemocrats || data.summary.democratsRounded || 0,
    repProjected: data.summary.projectedRepublicans || data.summary.republicansRounded || 0
  };

  if (updatedSlot) updatedSlot.textContent = `Latest source update: ${formatUpdatedDate(data.updatedAt.slice(0, 10))}`;
  if (averageSlot) averageSlot.innerHTML = renderHouseSeatBar(predictionCategories, { prediction: true, majority: data.majority, totalSeats: data.totalSeats });
  if (demSlot) demSlot.textContent = formatSeatValue(predictionCategories.demProjected);
  if (repSlot) repSlot.textContent = formatSeatValue(predictionCategories.repProjected);
  if (leadSlot) leadSlot.textContent = "";

  if (predictionNoteSlot) {
    predictionNoteSlot.innerHTML = `
      <strong>Based on current averages</strong>
      <span>Site prediction using available House projection data.</span>
    `;
  }

  if (legendSlot) {
    legendSlot.innerHTML = "";
    legendSlot.hidden = true;
  }
}

function renderSourceCards(data) {
  const sourceSlot = document.querySelector("[data-house-source-cards]");
  if (!sourceSlot) return;

  sourceSlot.innerHTML = data.sources.map(source => `
    <article class="content-card house-source-card">
      <div class="house-source-header">
        <div>
          <span class="detail-kicker">${source.shortName}</span>
          <h3>${source.name}</h3>
        </div>
        <a href="${source.url}" target="_blank" rel="noopener noreferrer">Source ↗</a>
      </div>
      <div class="house-source-totals">
        <span class="dem"><strong>${formatSeatValue(source.totals.democrats)}</strong><small>Democrats</small></span>
        <span class="toss"><strong>${formatSeatValue(source.totals.tossup)}</strong><small>Toss-up</small></span>
        <span class="rep"><strong>${formatSeatValue(source.totals.republicans)}</strong><small>Republicans</small></span>
      </div>
      ${renderHouseSeatBar(source.categories, { compact: true })}
    </article>
  `).join("");
}

async function initializeHouseForecast() {
  const root = document.querySelector("[data-house-forecast-page]");
  if (!root) return;

  try {
    const response = await fetch("data/house-forecast.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load data/house-forecast.json");
    const data = await response.json();
    renderHouseOverview(data);
    renderSourceCards(data);
  } catch (error) {
    root.innerHTML = `
      <section class="content-card house-forecast-card">
        <h2>House Forecast</h2>
        <p>Could not load House forecast data. Please check data/house-forecast.json.</p>
      </section>
    `;
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", initializeHouseForecast);
