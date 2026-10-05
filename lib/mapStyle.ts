import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

/**
 * How many screen pixels one map pixel covers. The map is drawn at 1/MAP_PIXEL
 * resolution and scaled up without smoothing, which is what makes it look
 * like pixel art. Line widths below are given in map pixels.
 */
export const MAP_PIXEL = 3;

// A bright 16-bit overworld: green land, blue water, cream roads.
// Map data comes from OpenFreeMap (OpenStreetMap), no key needed.
const C = {
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
};

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

const ROADS = [
  road("road-minor", ["minor", "service"], C.road, C.roadEdge, MINOR, 12),
  road("road-mid", ["secondary", "tertiary"], C.road, C.roadEdge, MID),
  road("road-major", ["primary", "trunk"], C.major, C.majorEdge, MAJOR),
  road("road-highway", ["motorway"], C.highway, C.highwayEdge, MAJOR),
];

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

export const pixelStyle: StyleSpecification = {
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

    label("label-water", {
      "source-layer": "water_name",
      filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
      layout: {
        "text-field": NAME,
        "text-font": ["Noto Sans Bold"],
        "text-size": 15,
        "text-max-width": 6,
      },
      color: C.labelWater,
      halo: "#cfe6ff",
    }),
    label("label-road", {
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
    label("label-area", {
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
    label("label-city", {
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
