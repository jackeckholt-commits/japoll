function setEditorialText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value !== undefined && value !== null) element.textContent = value;
}

function renderAnalysis(section, analysis) {
  if (!section || !analysis) return;

  const body = section.querySelector("[data-analysis-body]");
  setEditorialText(`[data-analysis-page="${section.dataset.analysisPage}"] [data-analysis-eyebrow]`, analysis.eyebrow || "Japoll analysis");
  setEditorialText(`[data-analysis-page="${section.dataset.analysisPage}"] [data-analysis-title]`, analysis.title || "Race analysis");
  setEditorialText(`[data-analysis-page="${section.dataset.analysisPage}"] [data-analysis-summary]`, analysis.summary || "");
  setEditorialText(`[data-analysis-page="${section.dataset.analysisPage}"] [data-analysis-updated]`, analysis.updatedAt ? `Updated ${analysis.updatedAt}` : "");

  if (body) {
    body.replaceChildren();
    String(analysis.body || "")
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .forEach(paragraph => {
        const element = document.createElement("p");
        element.textContent = paragraph;
        body.appendChild(element);
      });
  }
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
    const response = await fetch("data/editorial.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load editorial data");
    const editorial = await response.json();

    document.querySelectorAll("[data-analysis-page]").forEach(section => {
      renderAnalysis(section, editorial.analysis?.[section.dataset.analysisPage]);
    });

    Object.entries(editorial.predictions || {}).forEach(([key, prediction]) => {
      renderHomepagePrediction(key, prediction);
    });

    document.dispatchEvent(new CustomEvent("japoll:editorial-loaded", { detail: editorial }));
  } catch (error) {
    console.error("Could not load Japoll editorial content:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadEditorialContent);
