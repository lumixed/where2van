import type { Category, Status } from "./types";

/** 7×7 one-colour pixel sprites. `#` is a filled pixel. */
export const SPRITES = {
  eat: [
    "..#.#..",
    ".#.#...",
    ".......",
    "#######",
    "#######",
    ".#####.",
    "..###..",
  ],
  cafe: [
    "..#.#..",
    ".......",
    "######.",
    "#####.#",
    "######.",
    "#####..",
    ".###...",
  ],
  activity: [
    "...#...",
    "..###..",
    "#######",
    ".#####.",
    "..###..",
    ".##.##.",
    ".#...#.",
  ],
  concert: [
    "..#####",
    "..#####",
    "..#...#",
    "..#...#",
    ".##..##",
    "###.###",
    ".#...#.",
  ],
  outdoors: [
    "...#...",
    "..###..",
    ".#####.",
    "..###..",
    ".#####.",
    "#######",
    "...#...",
  ],
  shop: [
    "..###..",
    ".#...#.",
    "#######",
    "#######",
    "#######",
    "#######",
    "#######",
  ],
  other: [
    ".......",
    "...#...",
    "..###..",
    ".#####.",
    "..###..",
    "...#...",
    ".......",
  ],
  heart: [
    ".##.##.",
    "#######",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    "...#...",
  ],
  plus: [
    "...#...",
    "...#...",
    "...#...",
    "#######",
    "...#...",
    "...#...",
    "...#...",
  ],
  close: [
    "#.....#",
    ".#...#.",
    "..#.#..",
    "...#...",
    "..#.#..",
    ".#...#.",
    "#.....#",
  ],
  search: [
    ".###...",
    "#...#..",
    "#...#..",
    "#...#..",
    ".####..",
    ".....#.",
    "......#",
  ],
  pin: [
    "..###..",
    ".#####.",
    ".##.##.",
    ".#####.",
    "..###..",
    "...#...",
    "...#...",
  ],
  arrow: [
    "..#####",
    "....###",
    "...#.##",
    "..#...#",
    ".#.....",
    "#......",
    ".......",
  ],
  list: [
    "#.#####",
    ".......",
    "#.#####",
    ".......",
    "#.#####",
    ".......",
    "#.#####",
  ],
  calendar: [
    ".#...#.",
    "#######",
    "#######",
    "#.#.#.#",
    "#######",
    "#.#.#.#",
    "#######",
  ],
  left: [
    "...#...",
    "..##...",
    ".######",
    "#######",
    ".######",
    "..##...",
    "...#...",
  ],
  right: [
    "...#...",
    "...##..",
    "######.",
    "#######",
    "######.",
    "...##..",
    "...#...",
  ],
  camera: [
    ".##....",
    "#######",
    "###.###",
    "##...##",
    "###.###",
    "#######",
    ".......",
  ],
  trophy: [
    "#######",
    ".#####.",
    ".#####.",
    "..###..",
    "...#...",
    "..###..",
    ".#####.",
  ],
  bell: [
    "...#...",
    "..###..",
    ".#####.",
    ".#####.",
    ".#####.",
    "#######",
    "...#...",
  ],
  sun: [
    "#..#..#",
    ".#...#.",
    "..###..",
    "#.###.#",
    "..###..",
    ".#...#.",
    "#..#..#",
  ],
  moon: [
    "..###..",
    ".###...",
    "###....",
    "###....",
    "###....",
    ".###...",
    "..###..",
  ],
  sunset: [
    "...#...",
    ".#...#.",
    "..###..",
    ".#####.",
    "#######",
    ".......",
    "#######",
  ],
  clock: [
    ".#####.",
    "#..#..#",
    "#..#..#",
    "#..##.#",
    "#.....#",
    "#.....#",
    ".#####.",
  ],
  cloud: [
    ".......",
    "..##...",
    ".####..",
    "######.",
    "#######",
    "#######",
    ".......",
  ],
  rain: [
    "..##...",
    ".####..",
    "#######",
    "#######",
    ".......",
    ".#.#.#.",
    "#.#.#..",
  ],
  snow: [
    "..##...",
    ".####..",
    "#######",
    "#######",
    ".......",
    ".#...#.",
    "...#...",
  ],
  fog: [
    ".......",
    "#######",
    ".......",
    ".#####.",
    ".......",
    "#######",
    ".......",
  ],
  bolt: [
    "...##..",
    "..##...",
    ".####..",
    "...##..",
    "..##...",
    ".##....",
    ".#.....",
  ],
  soundOn: [
    "...#...",
    "..##.#.",
    "####..#",
    "####..#",
    "####..#",
    "..##.#.",
    "...#...",
  ],
  soundOff: [
    "...#...",
    "..##...",
    "####...",
    "####...",
    "####...",
    "..##...",
    "...#...",
  ],
  play: [
    "#......",
    "###....",
    "#####..",
    "#######",
    "#####..",
    "###....",
    "#......",
  ],
  pause: [
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
    ".##.##.",
  ],
  gear: [
    "..#.#..",
    ".#####.",
    "##...##",
    ".#...#.",
    "##...##",
    ".#####.",
    "..#.#..",
  ],
  dice: [
    ".#####.",
    "#.....#",
    "#.#.#.#",
    "#.....#",
    "#.#.#.#",
    "#.....#",
    ".#####.",
  ],
  question: [
    ".#####.",
    "##...##",
    "....##.",
    "...##..",
    "...#...",
    ".......",
    "...#...",
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

/** Turns sprite rows into an SVG path, one rectangle per run of pixels. */
export function spritePath(rows: readonly string[], ox = 0, oy = 0): string {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let end = x;
      while (row[end + 1] === "#") end++;
      const run = end - x + 1;
      d += `M${ox + x} ${oy + y}h${run}v1h-${run}z`;
      x = end;
    }
  });
  return d;
}

const INK = "#2a2238";
const HEART = "#e2584d";
const TILE = { want: "#f8c23c", done: "#74c653", draft: "#8ccbff" };
const MINI_HEART = [".#.#.", "#####", "#####", ".###.", "..#.."];
// The heart sits on the tile's top-right corner and pokes one pixel outside
// the grid, so the SVG is drawn with `overflow: visible`.
const BADGE = { x: 9, y: 0 };
const BADGE_OUTLINE = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
].map(([dx, dy]) => spritePath(MINI_HEART, BADGE.x + dx, BADGE.y + dy)).join("");

function svg(width: number, height: number, body: string) {
  return `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}

/**
 * The map marker: a square tile with the category icon, on a 13×16 pixel
 * grid. Places we have been to are green and carry a small heart.
 * Without `pointer` it is just the tile, for use in lists.
 */
export function pinSvg(
  category: Category | null,
  status: Status | "draft",
  pointer = true,
): string {
  const icon = SPRITES[category ?? "question"];
  return svg(
    13,
    pointer ? 16 : 14,
    `<path fill="${INK}" d="M2 2h9v1h1v9h-1v1h-9v-1h-1v-9h1z"/>` +
      `<path fill="${TILE[status]}" d="M2 3h9v9h-9z"/>` +
      `<path fill="#fff" fill-opacity=".45" d="M2 3h9v1h-9z"/>` +
      `<path fill="${INK}" fill-opacity=".22" d="M2 11h9v1h-9z"/>` +
      `<path fill="${INK}" d="${spritePath(icon, 3, 4)}"/>` +
      (pointer ? `<path fill="${INK}" d="M4 13h5v1h-5zM5 14h3v1h-3zM6 15h1v1h-1z"/>` : "") +
      (status === "done"
        ? `<path fill="${INK}" d="${BADGE_OUTLINE}"/>` +
          `<path fill="${HEART}" d="${spritePath(MINI_HEART, BADGE.x, BADGE.y)}"/>`
        : ""),
  );
}

/** Empty cells that touch a filled one, on a grid one pixel larger all round. */
function outlineOf(rows: readonly string[]): string[] {
  const filled = (x: number, y: number) => rows[y]?.[x] === "#";
  const out: string[] = [];
  for (let y = -1; y <= rows.length; y++) {
    let line = "";
    for (let x = -1; x <= rows[0].length; x++) {
      const edge =
        !filled(x, y) &&
        (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1));
      line += edge ? "#" : ".";
    }
    out.push(line);
  }
  return out;
}

const STAR_OUTLINE = spritePath(outlineOf(SPRITES.activity));
const STAR_FILL = spritePath(SPRITES.activity, 1, 1);
/** The left half of the star, up to and including its middle column. */
const STAR_HALF = spritePath(
  SPRITES.activity.map((row) => row.slice(0, 4)),
  1,
  1,
);

/** A rating star with a dark outline: gold, half gold, or empty. */
export function starSvg(fill: "full" | "half" | "none"): string {
  return svg(
    9,
    9,
    `<path fill="${INK}" fill-opacity="${fill === "none" ? 0.35 : 1}" d="${STAR_OUTLINE}"/>` +
      `<path fill="${fill === "full" ? TILE.want : "#efe3c4"}" d="${STAR_FILL}"/>` +
      (fill === "half" ? `<path fill="${TILE.want}" d="${STAR_HALF}"/>` : ""),
  );
}

/** A 7×7 sprite as stand-alone SVG markup, for buttons built outside React. */
export function iconSvg(name: SpriteName): string {
  return (
    `<svg viewBox="0 0 7 7" width="14" height="14" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">` +
    `<path d="${spritePath(SPRITES[name])}"/></svg>`
  );
}
