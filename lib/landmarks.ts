import type { Category } from "./types";

/** What tapping a landmark sets off, besides its speech bubble. */
export type LandmarkEffect = "steam" | "sparkle" | "horn";

export interface Landmark {
  id: string;
  name: string;
  /** One line worth knowing. */
  fact: string;
  lat: number;
  lng: number;
  /** The category it gets if we add it to our places. */
  category: Category;
  effect?: LandmarkEffect;
  /** Pixel art, one character per pixel; see COLORS for the letters. */
  sprite: string[];
}

/** The paint box for landmark sprites. `.` is see-through. */
export const COLORS: Record<string, string> = {
  K: "#2a2238", // outline
  W: "#ffffff",
  S: "#e4ebf2", // silver
  G: "#b9c2cf", // grey
  g: "#8892a3", // dark grey
  B: "#5aaaf2", // blue
  b: "#2f6fd0", // dark blue
  R: "#e2584d", // red
  O: "#f08a2e", // orange
  Y: "#f8c23c", // yellow
  N: "#9a6a44", // brown
  n: "#6a452e", // dark brown
  T: "#74c653", // green
  t: "#3f8a3a", // dark green
};

export const LANDMARKS: Landmark[] = [
  {
    id: "science-world",
    name: "Science World",
    fact: "Built for Expo 86, when the dome was called the Expo Centre.",
    lat: 49.2734,
    lng: -123.1038,
    category: "activity",
    effect: "sparkle",
    sprite: [
      "......KKKK......",
      "....KKSGSGKK....",
      "...KSGSGSGSGK...",
      "..KGSGSGSGSGSK..",
      "..KSGSGSGSGSGK..",
      ".KGSGSGSGSGSGSK.",
      ".KSGSGSGSGSGSGK.",
      ".KGSGSGSGSGSGSK.",
      ".KKKKKKKKKKKKKK.",
      "..KBBBBBBBBBBK..",
      "..KBWBWBWBWBBK..",
      "..KKKKKKKKKKKK..",
    ],
  },
  {
    id: "canada-place",
    name: "Canada Place",
    fact: "Its five white sails have stood on the waterfront since Expo 86.",
    lat: 49.2888,
    lng: -123.1111,
    category: "activity",
    effect: "horn",
    sprite: [
      "..K...K...K...K.",
      ".KWK.KWK.KWK.KWK",
      ".KWK.KWK.KWK.KWK",
      "KWWWKWWWKWWWKWWK",
      "KWWWKWWWKWWWKWWK",
      "KKKKKKKKKKKKKKKK",
      "KSSSSSSSSSSSSSSK",
      "KSBSBSBSBSBSBSSK",
      "KKKKKKKKKKKKKKKK",
    ],
  },
  {
    id: "steam-clock",
    name: "Gastown Steam Clock",
    fact: "It whistles every quarter of an hour. Tap it to hear it.",
    lat: 49.2844,
    lng: -123.1089,
    category: "activity",
    effect: "steam",
    sprite: [
      "...KKKKK...",
      "...KYYYK...",
      "..KKKKKKK..",
      "..KWWKWWK..",
      "..KWWKKWK..",
      "..KWWWWWK..",
      "..KKKKKKK..",
      "...KNNNK...",
      "...KNYNK...",
      "...KNNNK...",
      "...KNYNK...",
      "..KKNNNKK..",
      "..KKKKKKK..",
    ],
  },
  {
    id: "lions-gate",
    name: "Lions Gate Bridge",
    fact: "Opened in 1938 and named after The Lions, the twin peaks to the north.",
    lat: 49.3153,
    lng: -123.1389,
    category: "outdoors",
    sprite: [
      "...KK......KK...",
      "...KK......KK...",
      "..KKKK....KKKK..",
      ".K.KK.K..K.KK.K.",
      "K..KK..KK..KK..K",
      "...KK......KK...",
      "KKKKKKKKKKKKKKKK",
      "KTTTTTTTTTTTTTTK",
      "KKKKKKKKKKKKKKKK",
      "...KK......KK...",
      "...KK......KK...",
    ],
  },
  {
    id: "totems",
    name: "Totem Poles",
    fact: "The poles at Brockton Point are among the most visited spots in British Columbia.",
    lat: 49.2992,
    lng: -123.121,
    category: "outdoors",
    sprite: [
      "....KKK....",
      "...KRRRK...",
      "KKKKRKRKKKK",
      "KYYKRRRKYYK",
      "KKKKKKKKKKK",
      "...KNYNK...",
      "...KNNNK...",
      "...KKKKK...",
      "...KTWTK...",
      "...KTTTK...",
      "...KKKKK...",
      "...KNRNK...",
      "...KNNNK...",
      "...KKKKK...",
    ],
  },
  {
    id: "bc-place",
    name: "BC Place",
    fact: "Home of the Whitecaps and the BC Lions.",
    lat: 49.2768,
    lng: -123.112,
    category: "concert",
    sprite: [
      "....KKKKKKKK....",
      "..KKWWWWWWWWKK..",
      ".KWWGWWGWWGWWWK.",
      "KWWGWWWGWWWGWWWK",
      "KWGWWWWGWWWWGWWK",
      "KKKKKKKKKKKKKKKK",
      "KBBBBBBBBBBBBBBK",
      "KKKKKKKKKKKKKKKK",
    ],
  },
  {
    id: "inukshuk",
    name: "Inukshuk",
    fact: "Made for Expo 86, then moved to English Bay.",
    lat: 49.2853,
    lng: -123.1437,
    category: "outdoors",
    sprite: [
      "...KKKKK...",
      "...KGGGK...",
      "...KKKKK...",
      "KKKKKKKKKKK",
      "KGGGGGGGGGK",
      "KKKKKKKKKKK",
      "..KGGGGGK..",
      "..KKKKKKK..",
      "..KGK.KGK..",
      "..KGK.KGK..",
      "..KGK.KGK..",
      "..KKK.KKK..",
    ],
  },
  {
    id: "market",
    name: "Granville Island Public Market",
    fact: "An industrial island that became a market in 1979.",
    lat: 49.2726,
    lng: -123.1352,
    category: "shop",
    sprite: [
      "KKKKKKKKKKKKKKKK",
      "KRRRRRRRRRRRRRRK",
      "KRWRWRWRWRWRWRRK",
      "KRRRRRRRRRRRRRRK",
      "KKKKKKKKKKKKKKKK",
      ".KYYKYYKYYKYYYK.",
      ".KYYKYYKYYKYYYK.",
      ".KKKKKKKKKKKKKK.",
    ],
  },
  {
    id: "grouse",
    name: "Grouse Mountain",
    fact: "The Peak of Vancouver, with a gondola to the top.",
    lat: 49.3795,
    lng: -123.0816,
    category: "outdoors",
    sprite: [
      ".......KK.......",
      "......KWWK......",
      ".....KWWWWK..K..",
      "....KWWGWWWKKWK.",
      "...KGGWGGGWKWWWK",
      "..KGGGGGGGKGGWGK",
      ".KGGGtGGGGGGGGGK",
      "KGGtttGGtGGGGtGK",
      "KtttttttttttttTK",
      "KKKKKKKKKKKKKKKK",
    ],
  },
  {
    id: "capilano",
    name: "Capilano Suspension Bridge",
    fact: "137 metres long, 70 metres above the river.",
    lat: 49.3429,
    lng: -123.1149,
    category: "outdoors",
    sprite: [
      ".KK..........KK.",
      "KttK........KttK",
      "KtTtK......KtTtK",
      "KtttK......KtttK",
      ".KnK........KnK.",
      "KKnKK......KKnKK",
      ".KnK.KK..KK.KnK.",
      ".KnNNNNKKNNNNnK.",
      ".KnK........KnK.",
      ".KnK........KnK.",
    ],
  },
  {
    id: "yvr",
    name: "Vancouver Airport",
    fact: "YVR sits on Sea Island, a train ride from downtown.",
    lat: 49.1947,
    lng: -123.1792,
    category: "other",
    sprite: [
      ".......KK.......",
      "......KWWK......",
      "......KWWK......",
      ".....KWWWWK.....",
      "KKKKKKWWWWKKKKKK",
      "KWWWWWWBBWWWWWWK",
      ".KKKKKWWWWKKKKK.",
      ".....KWWWWK.....",
      "......KWWK......",
      "....KKKWWKKK....",
      "....KWWWWWWK....",
      "....KKKKKKKK....",
    ],
  },
  {
    id: "lighthouse",
    name: "Point Atkinson Lighthouse",
    fact: "It watches over the harbour mouth from Lighthouse Park.",
    lat: 49.3303,
    lng: -123.2648,
    category: "outdoors",
    sprite: [
      "....KKK....",
      "...KRRRK...",
      "...KYYYK...",
      "...KKKKK...",
      "...KWWWK...",
      "...KWWWK...",
      "...KRRRK...",
      "...KWWWK...",
      "...KWWWK...",
      "..KKKKKKK..",
      ".KGGGGGGGK.",
    ],
  },
];
