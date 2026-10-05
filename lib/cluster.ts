export interface Point {
  id: string;
  x: number;
  y: number;
}

/**
 * Sorts points on the screen into groups of neighbours: each point joins the
 * first earlier point within `radius` of it that started a group. A group of
 * one is a pin that stands alone.
 */
export function groupPoints(points: Point[], radius: number): string[][] {
  const groups: { x: number; y: number; ids: string[] }[] = [];
  for (const point of points) {
    const home = groups.find((g) => Math.hypot(g.x - point.x, g.y - point.y) <= radius);
    if (home) home.ids.push(point.id);
    else groups.push({ x: point.x, y: point.y, ids: [point.id] });
  }
  return groups.map((g) => g.ids);
}
