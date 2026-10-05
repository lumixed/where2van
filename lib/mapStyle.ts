import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import type { Phase } from "./world";

/**
 * How many screen pixels one map pixel covers. The map is drawn at 1/MAP_PIXEL
 * resolution and scaled up without smoothing, which is what makes it look
 * like pixel art. Line widths below are given in map pixels.
 */
export const MAP_PIXEL = 3;

// Map data comes from OpenFreeMap (OpenStreetMap), no key needed.

interface Palette {
  land: string;
  park: string;
  parkEdge: string;
  sand: string;
  water: string;
  waterEdge: string;
  airport: string;
  road: string;
  roadEdge: string;
  major: string;
  majorEdge: string;
  highway: string;
  highwayEdge: string;
  path: string;
  rail: string;
  transit: string;
  house: string;
  houseEdge: string;
  tower: string;
  towerEdge: string;
  /** Label text and the outline drawn around it. */
  ink: string;
  paper: string;
  labelWater: string;
  waterHalo: string;
}

// A bright 16-bit overworld: green land, blue water, cream roads.
const DAY: Palette = {
  land: "#b5e08a",
  park: "#7cc65c",
  parkEdge: "#4f9d45",
  sand: "#f6e7a8",
  water: "#5aaaf2",
  waterEdge: "#2f7fd0",
  airport: "#dcd6c2",
  road: "#fbf3d5",
  roadEdge: "#b9a777",
  major: "#ffe58f",
  majorEdge: "#c2952f",
  highway: "#ffb85c",
  highwayEdge: "#b56b1f",
  path: "#e6d7ab",
  rail: "#7d7468",
  transit: "#3f5fd9",
  house: "#f3c9a0",
  houseEdge: "#a9744a",
  tower: "#a9c4ea",
  towerEdge: "#5a78a8",
  ink: "#2a2238",
  paper: "#fff6df",
  labelWater: "#1c4f94",
  waterHalo: "#cfe6ff",
};

// Sunrise and sunset: everything leans warm, and the water picks up the sky.
const GOLDEN: Palette = {
  ...DAY,
  land: "#dccb7e",
  park: "#a9b558",
  parkEdge: "#7a8a3e",
  sand: "#f5d49a",
  water: "#f09a7a",
  waterEdge: "#c96a5a",
  airport: "#e3cfae",
  road: "#fff0cf",
  roadEdge: "#c79a63",
  major: "#ffd27a",
  majorEdge: "#c98a2e",
  highway: "#ff9f55",
  highwayEdge: "#b35f1c",
  path: "#ecd3a0",
  house: "#f2b48c",
  houseEdge: "#a8623f",
  tower: "#e7a9c0",
  towerEdge: "#9a5f7d",
  labelWater: "#7a2f3a",
  waterHalo: "#ffe0d2",
};

// After dark: deep blues, amber street light on the main roads, lit towers.
const NIGHT: Palette = {
  land: "#1d2a40",
  park: "#18382f",
  parkEdge: "#102a24",
  sand: "#3a3b4a",
  water: "#0d1a36",
  waterEdge: "#08122a",
  airport: "#2a3348",
  road: "#3d4763",
  roadEdge: "#252d44",
  major: "#c9a14a",
  majorEdge: "#6f5622",
  highway: "#e3923c",
  highwayEdge: "#7a4a1a",
  path: "#333d58",
  rail: "#4a5068",
  transit: "#6f8cff",
  house: "#2a3453",
  houseEdge: "#1a2240",
  tower: "#f2cf7a",
  towerEdge: "#8a6f2e",
  ink: "#e9eefb",
  paper: "#0f1727",
  labelWater: "#86a9e6",
  waterHalo: "#08122a",
};

const PALETTES: Record<Phase, Palette> = { dawn: GOLDEN, day: DAY, dusk: GOLDEN, night: NIGHT };

const SOURCE = "omt";
const NAME: ExpressionSpecification = [
  "coalesce",
  ["get", "name_en"],
  ["get", "name:latin"],
  ["get", "name"],
];
const IS_LINE: ExpressionSpecification = [
  "match",
  ["geometry-type"],
  ["LineString", "MultiLineString"],
  true,
  false,
];
const NOT_TUNNEL: ExpressionSpecification = [
  "!=",
  ["get", "brunnel"],
  "tunnel",
];
const HEIGHT: ExpressionSpecification = ["coalesce", ["get", "render_height"], 0];
const TOWER_HEIGHT = 35;

type Stops = [zoom: number, mapPixels: number][];

function width(stops: Stops, extra = 0): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    ...stops.flatMap(([zoom, px]) => [zoom, (px + extra) * MAP_PIXEL]),
  ] as ExpressionSpecification;
}

const MINOR: Stops = [[12, 0.5], [14, 1], [16, 3], [18, 8], [20, 20]];
const MID: Stops = [[10, 0.5], [12, 1], [14, 2], [16, 4], [18, 11], [20, 24]];
const MAJOR: Stops = [[8, 0.5], [11, 1], [13, 2], [15, 4], [16, 6], [18, 14], [20, 28]];

/**
 * A road is two lines: a darker, wider edge underneath and the fill on top.
 * All edges are drawn before any fill so crossings join up cleanly.
 */
function road(
  id: string,
  classes: string[],
  color: string,
  edge: string,
  stops: Stops,
  minzoom = 0,
) {
  const line = (
    layerId: string,
    zoom: number,
    lineColor: string,
    extra: number,
  ): LayerSpecification => ({
    id: layerId,
    type: "line",
    source: SOURCE,
    "source-layer": "transportation",
    minzoom: zoom,
    filter: ["all", IS_LINE, NOT_TUNNEL, ["match", ["get", "class"], classes, true, false]],
    layout: { "line-cap": "square", "line-join": "miter" },
    paint: { "line-color": lineColor, "line-width": width(stops, extra) },
  });
  return {
    edge: line(`${id}-edge`, Math.max(minzoom, 13), edge, 2),
    fill: line(id, minzoom, color, 0),
  };
}

function roads(C: Palette) {
  return [
    road("road-minor", ["minor", "service"], C.road, C.roadEdge, MINOR, 12),
    road("road-mid", ["secondary", "tertiary"], C.road, C.roadEdge, MID),
    road("road-major", ["primary", "trunk"], C.major, C.majorEdge, MAJOR),
    road("road-highway", ["motorway"], C.highway, C.highwayEdge, MAJOR),
  ];
}

function landcover(id: string, cls: string, color: string, edge: string): LayerSpecification {
  return {
    id,
    type: "fill",
    source: SOURCE,
    "source-layer": "landcover",
    filter: ["==", ["get", "class"], cls],
    paint: { "fill-color": color, "fill-outline-color": edge },
  };
}

function building(
  id: string,
  filter: ExpressionSpecification,
  color: string,
  edge: string,
): LayerSpecification {
  return {
    id,
    type: "fill",
    source: SOURCE,
    "source-layer": "building",
    minzoom: 14,
    filter,
    paint: { "fill-color": color, "fill-outline-color": edge },
  };
}

function label(
  C: Palette,
  id: string,
  spec: Omit<Extract<LayerSpecification, { type: "symbol" }>, "id" | "type" | "source" | "paint"> & {
    color?: string;
    halo?: string;
  },
): LayerSpecification {
  const { color = C.ink, halo = C.paper, ...rest } = spec;
  return {
    ...rest,
    id,
    type: "symbol",
    source: SOURCE,
    paint: {
      "text-color": color,
      "text-halo-color": halo,
      "text-halo-width": MAP_PIXEL,
    },
  };
}

/** The whole map look for a time of day. Only colours differ between them. */
export function pixelStyle(phase: Phase = "day"): StyleSpecification {
  const C = PALETTES[phase];
  const ROADS = roads(C);
  return {
    version: 8,
    name: "Where2Van",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SOURCE]: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": C.land } },
      landcover("wood", "wood", C.park, C.parkEdge),
      landcover("grass", "grass", C.park, C.parkEdge),
      {
        id: "park",
        type: "fill",
        source: SOURCE,
        "source-layer": "park",
        paint: { "fill-color": C.park, "fill-outline-color": C.parkEdge },
      },
      landcover("sand", "sand", C.sand, C.sand),
      {
        id: "waterway",
        type: "line",
        source: SOURCE,
        "source-layer": "waterway",
        paint: { "line-color": C.water, "line-width": width([[10, 0.5], [16, 2]]) },
      },
      {
        id: "water",
        type: "fill",
        source: SOURCE,
        "source-layer": "water",
        filter: NOT_TUNNEL,
        paint: { "fill-color": C.water, "fill-outline-color": C.waterEdge },
      },
      {
        id: "airport",
        type: "fill",
        source: SOURCE,
        "source-layer": "aeroway",
        filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
        paint: { "fill-color": C.airport },
      },

      {
        id: "path",
        type: "line",
        source: SOURCE,
        "source-layer": "transportation",
        minzoom: 15,
        filter: [
          "all",
          IS_LINE,
          NOT_TUNNEL,
          ["match", ["get", "class"], ["path", "pedestrian", "track"], true, false],
        ],
        paint: {
          "line-color": C.path,
          "line-width": MAP_PIXEL,
          "line-dasharray": [1, 1],
        },
      },
      ...ROADS.map((r) => r.edge),
      ...ROADS.map((r) => r.fill),
      {
        id: "rail",
        type: "line",
        source: SOURCE,
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["all", NOT_TUNNEL, ["==", ["get", "class"], "rail"]],
        paint: {
          "line-color": C.rail,
          "line-width": MAP_PIXEL,
          "line-dasharray": [2, 2],
        },
      },
      {
        // SkyTrain, drawn even where it runs underground.
        id: "transit",
        type: "line",
        source: SOURCE,
        "source-layer": "transportation",
        minzoom: 11,
        filter: ["==", ["get", "class"], "transit"],
        paint: {
          "line-color": C.transit,
          "line-width": MAP_PIXEL,
          "line-dasharray": [2, 1],
        },
      },

      building("houses", ["<", HEIGHT, TOWER_HEIGHT], C.house, C.houseEdge),
      building("towers", [">=", HEIGHT, TOWER_HEIGHT], C.tower, C.towerEdge),

      label(C, "label-water", {
        "source-layer": "water_name",
        filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
        layout: {
          "text-field": NAME,
          "text-font": ["Noto Sans Bold"],
          "text-size": 15,
          "text-max-width": 6,
        },
        color: C.labelWater,
        halo: C.waterHalo,
      }),
      label(C, "label-road", {
        "source-layer": "transportation_name",
        minzoom: 15,
        filter: [
          "match",
          ["get", "class"],
          ["motorway", "trunk", "primary", "secondary", "tertiary", "minor"],
          true,
          false,
        ],
        layout: {
          "symbol-placement": "line",
          "text-field": NAME,
          "text-font": ["Noto Sans Bold"],
          "text-size": 15,
        },
      }),
      label(C, "label-area", {
        "source-layer": "place",
        minzoom: 11,
        filter: [
          "match",
          ["get", "class"],
          ["suburb", "quarter", "neighbourhood"],
          true,
          false,
        ],
        layout: {
          "text-field": NAME,
          "text-font": ["Noto Sans Bold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 15, 15, 21],
          "text-max-width": 7,
        },
      }),
      label(C, "label-city", {
        "source-layer": "place",
        maxzoom: 13.5,
        filter: ["match", ["get", "class"], ["city", "town"], true, false],
        layout: {
          "text-field": NAME,
          "text-font": ["Noto Sans Bold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 18, 13, 27],
          "text-max-width": 8,
        },
      }),
    ],
  };
}
