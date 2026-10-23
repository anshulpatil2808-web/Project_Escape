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
  thruster: { name: "Thruster", cost: 2, desc: "Place it next to the ship, in line with it, to push the ship away. Click it to turn it." },
  shield: { name: "Anchor", cost: 3, desc: "Its glowing face holds the ship in the square it points at." },
  comms: { name: "Bumper", cost: 1, desc: "The padded face stops the ship; the other sides bounce it back." },
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

// Every level is checked by a solver (engine.test.ts): budget must cover the cheapest solution.
// Coins start at 2 and grow by 3 per mission; the clock starts at 20s and grows by 20s per mission.
export const LEVELS: Level[] = [
  { name: "Training", brief: "Put a thruster on the left of the ship, then press Launch.", budget: 2, time: 20, ship: [1, 2], portal: [5, 2], rocks: [] },
  { name: "Cold Start", brief: "Exact budget, and only one answer works.", budget: 5, time: 40, ship: [5, 2], portal: [1, 3], rocks: [[0, 5], [1, 0], [6, 4], [4, 0], [5, 3]] },
  { name: "Ricochet", brief: "Two burns. Timing is everything.", budget: 8, time: 60, ship: [2, 4], portal: [5, 3], rocks: [[5, 2], [3, 1], [6, 1], [2, 2]] },
  { name: "High Orbit", brief: "Climb against the pull, then cross the void.", budget: 11, time: 80, ship: [1, 3], portal: [5, 0], rocks: [[6, 4], [0, 3], [1, 5], [4, 3]] },
  { name: "Gravity Well", brief: "Three burns, one solution. Think ahead.", budget: 14, time: 100, ship: [4, 4], portal: [0, 2], rocks: [[3, 2], [2, 4], [0, 1], [5, 3], [1, 5]] },
];

export function makeGrid(level: Level): Cell[][] {
  const g: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  level.rocks.forEach(([x, y]) => (g[y]![x] = "rock"));
  return g;
}
export const makeDirs = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(1) as number[]);

const isMod = (c: Cell): c is ModType => c === "thruster" || c === "shield" || c === "comms";
export function facesShip(dirs: number[][], x: number, y: number, ship: Vec) {
  const direction = DIRS[dirs[y]?.[x] ?? 1];
  return !!direction && x + direction[0] === ship[0] && y + direction[1] === ship[1];
}
/** The way this thruster sends the ship (0 up, 1 right, 2 down, 3 left), or null when it can't drive it. */
export function thrustPush(dirs: number[][], x: number, y: number, ship: Vec): number | null {
  const ax = ship[0] - x, ay = ship[1] - y;
  if (Math.abs(ax) + Math.abs(ay) !== 1) return null;
  const [dx, dy] = DIRS[dirs[y]?.[x] ?? 1]!;
  if (!(dx === ax && dy === ay) && !(dx === -ax && dy === -ay)) return null;
  return DIRS.findIndex(([ux, uy]) => ux === ax && uy === ay);
}
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
  // 2. Only an anchor's illuminated face holds the ship.
  if (adj.some((n) => n.c === "shield" && facesShip(dirs, n.x, n.y, ship))) return { ship, vel: [0, 0], event: "held" };

  let v: Vec = vel;
  // 3. Thrusters lined up with the ship (blast toward it, or exhaust pointing away like an engine)
  //    push it forward, away from the thruster. Sideways thrusters do nothing.
  const firing = adj.filter((n) => {
    if (n.c !== "thruster") return false;
    const [dx, dy] = DIRS[dirs[n.y]![n.x]!]!;
    const ax = sx - n.x, ay = sy - n.y;
    return (dx === ax && dy === ay) || (dx === -ax && dy === -ay);
  });
  if (firing.length) v = firing.reduce<Vec>((a, n) => [a[0] + (sx - n.x), a[1] + (sy - n.y)], [0, 0]);
  // 4. Not moving at all? The black hole pulls it down
  if (v[0] === 0 && v[1] === 0) v = [0, 1];
  v = Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])];

  const nx = sx + v[0], ny = sy + v[1];
  if (nx === level.portal[0] && ny === level.portal[1]) return { ship: [nx, ny], vel: v, event: "portal" };
  if (ny >= HORIZON_Y && nx >= 0 && nx < SIZE) return { ship: [nx, ny], vel: v, event: "blackhole" };
  if (g[ny]?.[nx] === "comms" && !facesShip(dirs, nx, ny, ship)) {
    return { ship, vel: [-v[0] || 0, -v[1] || 0], event: "blocked" };
  }
  if (nx < 0 || nx >= SIZE || ny < 0 || g[ny]?.[nx]) return { ship, vel: [0, 0], event: "blocked" };
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

/** Removing restores the full purchase cost; rotating is free. */
export const refund = (m: ModType) => MODS[m].cost;
