// PROJECT ESCAPE — "Drift" puzzle.
// A ship floats in space. Space has no friction: once moving, it keeps gliding.
// When it is still, the black hole (bottom row) pulls it down one cell per tick.
// You place modules to steer it into the escape portal.

export type ModType = "thruster" | "shield" | "comms";
type SpriteType = ModType | "reactor" | "solar" | "conduit";
export type Cell = SpriteType | "rock" | null;
export type Vec = [number, number];

export const MODS: Record<ModType, { name: string; cost: number; desc: string }> = {
  thruster: { name: "Pusher", cost: 2, desc: "Pushes the ship away when it's next to it" },
  shield: { name: "Anchor", cost: 3, desc: "Holds the ship still while it's next to it" },
  comms: { name: "Bumper", cost: 1, desc: "Stops the ship dead when it hits it" },
};

export const SIZE = 7;
/** the bottom row is the black hole's event horizon */
export const HORIZON_Y = SIZE - 1;

export interface Level {
  name: string;
  brief: string;
  budget: number;
  time: number; // seconds of flight before the black hole wins
  ship: Vec;
  portal: Vec;
  rocks: Vec[];
}

export const LEVELS: Level[] = [
  { name: "First Push", brief: "Push the ship sideways into the portal.", budget: 6, time: 30, ship: [1, 2], portal: [5, 2], rocks: [] },
  { name: "Falling Catch", brief: "A rock blocks the way. Let it fall, then catch it.", budget: 6, time: 30, ship: [1, 1], portal: [5, 4], rocks: [[5, 1]] },
  { name: "Rock Landing", brief: "Let the ship land on the rock, then launch it.", budget: 6, time: 30, ship: [1, 1], portal: [6, 3], rocks: [[1, 4], [3, 2], [5, 4]] },
  { name: "Long Haul", brief: "Climb away from the black hole, then turn the corner.", budget: 8, time: 40, ship: [3, 4], portal: [6, 1], rocks: [[2, 2], [4, 2]] },
  { name: "Free Drift", brief: "Sandbox. Unlimited credits, no clock.", budget: 999, time: 0, ship: [3, 2], portal: [6, 0], rocks: [] },
];

export function makeGrid(level: Level): Cell[][] {
  const g: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  level.rocks.forEach(([x, y]) => (g[y]![x] = "rock"));
  return g;
}

const isMod = (c: Cell): c is ModType => c === "thruster" || c === "shield" || c === "comms";
const N4: Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function neighbours(g: Cell[][], [sx, sy]: Vec) {
  return N4.map(([dx, dy]) => ({ x: sx + dx, y: sy + dy, c: g[sy + dy]?.[sx + dx] ?? null })).filter((n) => isMod(n.c));
}

export type StepResult = { ship: Vec; vel: Vec; event: "move" | "blocked" | "held" | "portal" | "blackhole" | "overload" };

/** One tick of the simulation. Rules are applied in this order. */
export function step(g: Cell[][], level: Level, ship: Vec, vel: Vec): StepResult {
  const [sx, sy] = ship;
  const adj = neighbours(g, ship);
  // 1. Overload: three or more modules touching the ship tear it apart
  if (adj.length >= 3) return { ship, vel: [0, 0], event: "overload" };
  // 2. Anchor next to the ship: it holds still
  if (adj.some((n) => n.c === "shield")) return { ship, vel: [0, 0], event: "held" };

  let v: Vec = vel;
  // 3. Pushers next to the ship set its direction (away from them)
  const pushers = adj.filter((n) => n.c === "thruster");
  if (pushers.length) {
    v = pushers.reduce<Vec>((a, p) => [a[0] + (sx - p.x), a[1] + (sy - p.y)], [0, 0]);
  }
  // 4. Not moving at all? The black hole pulls it down
  if (v[0] === 0 && v[1] === 0) v = [0, 1];
  // One axis per tick: the stronger one wins, ties go vertical
  v = Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];

  const nx = sx + v[0], ny = sy + v[1];
  if (nx === level.portal[0] && ny === level.portal[1]) return { ship: [nx, ny], vel: v, event: "portal" };
  if (ny >= HORIZON_Y && nx >= 0 && nx < SIZE) return { ship: [nx, ny], vel: v, event: "blackhole" };
  if (nx < 0 || nx >= SIZE || ny < 0 || g[ny]![nx]) return { ship, vel: [0, 0], event: "blocked" };
  return { ship: [nx, ny], vel: v, event: "move" };
}

/** Refund when a module is removed: half its cost, rounded down. */
export const refund = (m: ModType) => Math.floor(MODS[m].cost / 2);
