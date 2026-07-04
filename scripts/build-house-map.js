import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const OUTPUT_PATH = path.resolve("assets/house-districts-2026.geojson");

const STATE_FIPS = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20",
  KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28",
  MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36",
  NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45",
  SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56"
};

const UPDATED_STATE_SOURCES = {
  AL: {
    type: "arcgis",
    url: "https://services7.arcgis.com/jF2q3LPxL7PETdYk/arcgis/rest/services/2023_CONG_LEGISLATIVE_PLAN/FeatureServer/0",
    districtField: "DISTRICT",
    authority: "Alabama Legislature 2023 enacted congressional plan"
  },
  CA: {
    type: "arcgis",
    url: "https://services3.arcgis.com/uknczv4rpevve42E/arcgis/rest/services/AB_604_-_California_Congressional_Districts_2027-2032_as_enacted_by_Proposition_50_view/FeatureServer/0",
    districtField: "DISTRICT",
    authority: "California Department of Technology / Proposition 50 (AB 604)"
  },
  FL: {
    type: "arcgis",
    url: "https://services6.arcgis.com/WNLWyVVqYEXv5C4T/arcgis/rest/services/EOGPCRP2026_WFL1/FeatureServer/0",
    districtField: "DISTRICT",
    authority: "Florida Legislature EOGPCRP2026"
  },
  LA: {
    type: "shapefile",
    url: "https://redist.legis.la.gov/2026_Files/Act2Congress/Shapefile/Shapefile%20-%20Act_2_%282026_RS%29.zip",
    districtField: "DISTRICT_I",
    authority: "Louisiana Legislature Act 2 (2026 Regular Session)"
  },
  MO: {
    type: "arcgis",
    url: "https://services2.arcgis.com/kNS2ppBA4rwAQQZy/arcgis/rest/services/HB1_Missouri_Congressional_Districts_2025/FeatureServer/0",
    districtField: "District",
    authority: "Missouri Spatial Data Information Service / HB 1 (2025)"
  },
  NC: {
    type: "arcgis",
    url: "https://services5.arcgis.com/gRcZqepTaRC6tVZL/arcgis/rest/services/NCGA_Congress_2025/FeatureServer/0",
    districtField: "District",
    authority: "North Carolina General Assembly C2025E"
  },
  OH: {
    type: "arcgis",
    url: "https://maps.ohio.gov/arcgis/rest/services/Hosted/Districts_2025_11_03_SHP/FeatureServer/0",
    districtField: "district",
    authority: "Ohio Geographically Referenced Information Program (2026-2032)"
  },
  TN: {
    type: "arcgis",
    url: "https://tnmap.tn.gov/arcgis/rest/services/ADMINISTRATIVE_BOUNDARIES/LEGISLATIVE_DISTRICTS/MapServer/2",
    districtField: "DISTRICT",
    authority: "Tennessee Office for Information Resources 2026 congressional boundaries"
  },
  TX: {
    type: "shapefile",
    url: "https://data.capitol.texas.gov/dataset/748c952b-e926-4f44-8d01-a738884b3ec8/resource/5712ebe1-d777-4d4a-b836-0534e17bca01/download/planc2333.zip",
    districtField: "District",
    authority: "Texas Legislative Council PLANC2333"
  },
  UT: {
    type: "arcgis",
    url: "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/political_us_congress_districts_2026_to_2032/FeatureServer/0",
    districtField: "DISTRICT",
    authority: "Utah Geospatial Resource Center 2026-2032 boundaries"
  }
};

const BASE_SOURCE = {
  url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_119th_Congressional_Districts_no_territories/FeatureServer/0",
  authority: "U.S. Census Bureau 119th congressional districts via Esri"
};

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchArcGisGeoJson(url, outFields = "*") {
  const query = new URL(`${url}/query`);
  query.searchParams.set("where", "1=1");
  query.searchParams.set("outFields", outFields);
  query.searchParams.set("returnGeometry", "true");
  query.searchParams.set("outSR", "4326");
  query.searchParams.set("geometryPrecision", "5");
  query.searchParams.set("maxAllowableOffset", "0.0015");
  query.searchParams.set("f", "geojson");
  const response = await fetch(query);
  if (!response.ok) throw new Error(`Could not query ${url}: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error(`No features returned by ${url}`);
  return data;
}

function runMapshaper(args) {
  execFileSync("npx.cmd", ["--yes", "mapshaper", ...args], {
    shell: true,
    stdio: "inherit"
  });
}

async function readOfficialShapefile(source, workDir, state) {
  const zipPath = path.join(workDir, `${state}.zip`);
  const geoJsonPath = path.join(workDir, `${state}.geojson`);
  await writeFile(zipPath, await fetchBuffer(source.url));
  runMapshaper([zipPath, "-proj", "wgs84", "-o", geoJsonPath, "format=geojson"]);
  return JSON.parse(await readFile(geoJsonPath, "utf8"));
}

function normalizeDistrict(value) {
  const number = Number(String(value).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(number)) throw new Error(`Invalid district number: ${value}`);
  return String(number).padStart(2, "0");
}

function ordinal(number) {
  const remainder = number % 100;
  if (remainder >= 11 && remainder <= 13) return `${number}th`;
  return `${number}${number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th"}`;
}

function normalizeFeature(feature, state, districtField) {
  const district = normalizeDistrict(feature.properties?.[districtField]);
  const stateFips = STATE_FIPS[state];
  const number = Number(district);
  return {
    type: "Feature",
    id: `${state}-${district}`,
    properties: {
      id: `${state}-${district}`,
      state,
      stateFips,
      district,
      label: district === "00" ? `${state} At-Large` : `${state} ${ordinal(number)}`
    },
    geometry: feature.geometry
  };
}

function assertDistrictCounts(features) {
  const counts = new Map();
  const ids = new Set();
  features.forEach(feature => {
    const { id, state } = feature.properties;
    if (ids.has(id)) throw new Error(`Duplicate district ${id}`);
    ids.add(id);
    counts.set(state, (counts.get(state) || 0) + 1);
  });
  if (features.length !== 435) throw new Error(`Expected 435 voting districts; found ${features.length}`);
  Object.entries(STATE_FIPS).forEach(([state]) => {
    if (!counts.has(state)) throw new Error(`Missing districts for ${state}`);
  });
}

function rewindGeometryForD3(geometry) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(ring => ring.reverse());
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(polygon => polygon.forEach(ring => ring.reverse()));
  }
}

async function main() {
  const workDir = await mkdtemp(path.join(tmpdir(), "japoll-house-map-"));
  try {
    const updatedStates = new Set(Object.keys(UPDATED_STATE_SOURCES));
    const base = await fetchArcGisGeoJson(
      BASE_SOURCE.url,
      "DISTRICTID,STFIPS,CDFIPS,STATE_ABBR,STATE_NAME"
    );
    const features = base.features
      .filter(feature => feature.properties.STATE_ABBR !== "DC")
      .filter(feature => !updatedStates.has(feature.properties.STATE_ABBR))
      .map(feature => normalizeFeature(feature, feature.properties.STATE_ABBR, "CDFIPS"));

    for (const [state, source] of Object.entries(UPDATED_STATE_SOURCES)) {
      const data = source.type === "arcgis"
        ? await fetchArcGisGeoJson(source.url)
        : await readOfficialShapefile(source, workDir, state);
      features.push(...data.features.map(feature => normalizeFeature(feature, state, source.districtField)));
    }

    features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
    assertDistrictCounts(features);

    const combinedPath = path.join(workDir, "house-districts-combined.geojson");
    const finalPath = path.join(workDir, "house-districts-final.geojson");
    const collection = {
      type: "FeatureCollection",
      metadata: {
        congress: 120,
        electionYear: 2026,
        updatedAt: "2026-07-04",
        baseSource: BASE_SOURCE,
        updatedStateSources: Object.fromEntries(
          Object.entries(UPDATED_STATE_SOURCES).map(([state, source]) => [state, {
            authority: source.authority,
            url: source.url
          }])
        )
      },
      features
    };
    await writeFile(combinedPath, `${JSON.stringify(collection)}\n`);
    runMapshaper([
      combinedPath,
      "-simplify", "7%", "keep-shapes",
      "-o", finalPath, "format=geojson", "precision=0.0001"
    ]);

    const simplified = JSON.parse(await readFile(finalPath, "utf8"));
    simplified.metadata = collection.metadata;
    simplified.features.forEach(feature => rewindGeometryForD3(feature.geometry));
    assertDistrictCounts(simplified.features);
    await writeFile(OUTPUT_PATH, `${JSON.stringify(simplified)}\n`);
    console.log(`Wrote ${OUTPUT_PATH} with ${simplified.features.length} districts.`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
