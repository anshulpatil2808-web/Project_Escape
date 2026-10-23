// PROJECT ESCAPE — "Drift" puzzle.
// A ship floats in space. Space has no friction: once moving, it keeps gliding.
// When it is still, the black hole (bottom row) pulls it down one cell per tick.
// You place modules to steer it into the escape portal.

export type ModType = "thruster" | "shield" | "comms";
type SpriteType = ModType | "reactor" | "solar" | "conduit";
export type Cell = SpriteType | "rock" | null;
export type Vec = [number, number];

/** 0 = up, 1 = right, 2 = down, 3 = left */
export const DIRS: Vec[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIR_NAMES = ["UP", "RIGHT", "DOWN", "LEFT"];

export const MODS: Record<ModType, { name: string; cost: number; desc: string }> = {
  thruster: { name: "Thruster", cost: 2, desc: "Fires one way. A ship in its blast gets launched that way. Click it to rotate." },
  shield: { name: "Anchor", cost: 3, desc: "Holds the ship still while it's next to it." },
  comms: { name: "Bumper", cost: 1, desc: "Stops the ship dead when it hits it." },
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

// Every level is checked by a solver (engine.test.ts): budget equals the cheapest solution.
export const LEVELS: Level[] = [
  { name: "Cold Start", brief: "Exact budget. One shot.", budget: 4, time: 25, ship: [1, 1], portal: [5, 4], rocks: [[5, 1]] },
  { name: "Ricochet", brief: "The direct route is blocked. Use what falls.", budget: 5, time: 30, ship: [3, 0], portal: [0, 2], rocks: [[2, 1], [1, 2], [3, 4]] },
  { name: "Dead Stop", brief: "Sometimes you need to stop before you go.", budget: 5, time: 30, ship: [0, 1], portal: [6, 2], rocks: [[6, 1], [4, 3], [2, 2]] },
  { name: "Gravity Well", brief: "Climb against the pull.", budget: 6, time: 35, ship: [5, 4], portal: [0, 0], rocks: [[4, 3], [1, 2], [2, 4], [0, 4]] },
  { name: "Needle", brief: "Thread the asteroid gap.", budget: 6, time: 35, ship: [6, 0], portal: [3, 5], rocks: [[2, 2], [4, 2], [3, 3], [5, 4], [1, 4]] },
  { name: "Last Light", brief: "Every credit counts. Think three moves ahead.", budget: 7, time: 40, ship: [0, 0], portal: [6, 5], rocks: [[3, 0], [1, 3], [5, 2], [4, 4], [2, 5]] },
  { name: "Free Drift", brief: "Sandbox. Unlimited credits, no clock.", budget: 999, time: 0, ship: [3, 2], portal: [6, 0], rocks: [] },
];

export function makeGrid(level: Level): Cell[][] {
  const g: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  level.rocks.forEach(([x, y]) => (g[y]![x] = "rock"));
  return g;
}
export const makeDirs = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(1) as number[]);

const isMod = (c: Cell): c is ModType => c === "thruster" || c === "shield" || c === "comms";
const N4: Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function neighbours(g: Cell[][], [sx, sy]: Vec) {
  return N4.map(([dx, dy]) => ({ x: sx + dx, y: sy + dy, c: g[sy + dy]?.[sx + dx] ?? null })).filter((n) => isMod(n.c));
}

export type StepResult = { ship: Vec; vel: Vec; event: "move" | "blocked" | "held" | "portal" | "blackhole" | "overload" };

/** One tick of the simulation. Rules are applied in this order. */
export function step(g: Cell[][], dirs: number[][], level: Level, ship: Vec, vel: Vec): StepResult {
  const [sx, sy] = ship;
  const adj = neighbours(g, ship);
  // 1. Overload: three or more modules touching the ship tear it apart
  if (adj.length >= 3) return { ship, vel: [0, 0], event: "overload" };
  // 2. Anchor next to the ship: it holds still
  if (adj.some((n) => n.c === "shield")) return { ship, vel: [0, 0], event: "held" };

  let v: Vec = vel;
  // 3. Thrusters whose blast points at the ship launch it in that direction
  const firing = adj.filter((n) => {
    if (n.c !== "thruster") return false;
    const [dx, dy] = DIRS[dirs[n.y]![n.x]!]!;
    return n.x + dx === sx && n.y + dy === sy;
  });
  if (firing.length) v = firing.reduce<Vec>((a, n) => { const d = DIRS[dirs[n.y]![n.x]!]!; return [a[0] + d[0], a[1] + d[1]]; }, [0, 0]);
  // 4. Not moving at all? The black hole pulls it down
  if (v[0] === 0 && v[1] === 0) v = [0, 1];
  v = Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];

  const nx = sx + v[0], ny = sy + v[1];
  if (nx === level.portal[0] && ny === level.portal[1]) return { ship: [nx, ny], vel: v, event: "portal" };
  if (ny >= HORIZON_Y && nx >= 0 && nx < SIZE) return { ship: [nx, ny], vel: v, event: "blackhole" };
  if (nx < 0 || nx >= SIZE || ny < 0 || g[ny]![nx]) return { ship, vel: [0, 0], event: "blocked" };
  return { ship: [nx, ny], vel: v, event: "move" };
}

/** Run a full flight with no mid-flight changes. */
export function simulate(g: Cell[][], dirs: number[][], level: Level, max = 60) {
  let s: Vec = level.ship, v: Vec = [0, 0];
  for (let i = 0; i < max; i++) {
    const r = step(g, dirs, level, s, v);
    if (r.event === "portal" || r.event === "blackhole" || r.event === "overload") return r.event;
    if (r.event === "held") return "stuck";
    s = r.ship; v = r.vel;
  }
  return "stuck";
}

/** Refund when a module is removed: half its cost, rounded down. */
export const refund = (m: ModType) => Math.floor(MODS[m].cost / 2);
