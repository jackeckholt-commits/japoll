const HOUSE_BUCKETS = [
  { key: "demSafe", label: "Safe D", className: "house-bar-dem-safe" },
  { key: "demLikely", label: "Likely D", className: "house-bar-dem-likely" },
  { key: "demLean", label: "Lean/Tilt D", className: "house-bar-dem-lean" },
  { key: "tossup", label: "Toss Up", className: "house-bar-tossup" },
  { key: "repLean", label: "Lean/Tilt R", className: "house-bar-rep-lean" },
  { key: "repLikely", label: "Likely R", className: "house-bar-rep-likely" },
  { key: "repSafe", label: "Safe R", className: "house-bar-rep-safe" }
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

function getCategoryTotal(categories) {
  return HOUSE_BUCKETS.reduce((sum, bucket) => sum + Number(categories[bucket.key] || 0), 0) || 435;
}

function renderHouseSeatBar(categories, options = {}) {
  const total = getCategoryTotal(categories);
  return `
    <div class="house-seat-bar ${options.compact ? "is-compact" : ""}" role="img" aria-label="House seat rating bar">
      ${HOUSE_BUCKETS.map(bucket => {
        const value = Number(categories[bucket.key] || 0);
        if (value <= 0) return "";
        const width = Math.max((value / total) * 100, options.compact ? 3 : 4);
        return `
          <div class="house-seat-segment ${bucket.className}" style="width:${width}%" title="${bucket.label}: ${formatSeatValue(value)} seats">
            <strong>${formatSeatValue(value)}</strong>
            <span>${bucket.label}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderHouseLegend(target) {
  if (!target) return;
  target.innerHTML = HOUSE_BUCKETS.map(bucket => `
    <span class="house-legend-item"><i class="${bucket.className}"></i>${bucket.label}</span>
  `).join("");
}

function renderHouseOverview(data) {
  const averageSlot = document.querySelector("[data-house-average-bar]");
  const updatedSlot = document.querySelector("[data-house-updated]");
  const demSlot = document.querySelector("[data-house-dem-total]");
  const repSlot = document.querySelector("[data-house-rep-total]");
  const tossupSlot = document.querySelector("[data-house-tossup-total]");
  const leadSlot = document.querySelector("[data-house-lead-note]");
  const legendSlot = document.querySelector("[data-house-legend]");

  if (updatedSlot) updatedSlot.textContent = `Latest source update: ${formatUpdatedDate(data.updatedAt.slice(0, 10))}`;
  if (averageSlot) averageSlot.innerHTML = renderHouseSeatBar(data.average.categories);
  if (demSlot) demSlot.textContent = formatSeatValue(data.summary.democrats);
  if (repSlot) repSlot.textContent = formatSeatValue(data.summary.republicans);
  if (tossupSlot) tossupSlot.textContent = formatSeatValue(data.summary.tossup);
  if (leadSlot) {
    const dem = Number(data.summary.democrats || 0);
    const rep = Number(data.summary.republicans || 0);
    const leader = dem > rep ? "Democrats" : rep > dem ? "Republicans" : "Neither party";
    const margin = Math.abs(dem - rep).toFixed(1);
    leadSlot.textContent = `${leader} lead the non-toss-up average by ${margin} seats. Toss-ups are not assigned.`;
  }
  renderHouseLegend(legendSlot);
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
      <p class="house-source-note">Updated ${formatUpdatedDate(source.updated)}. ${source.note || ""}</p>
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
