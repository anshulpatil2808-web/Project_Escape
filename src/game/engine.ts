export type ModType = "reactor" | "solar" | "conduit" | "thruster" | "shield" | "comms";
export type Cell = ModType | "rock" | null;

export const MODS: Record<ModType, { name: string; cost: number; gen: number; use: number; desc: string }> = {
  reactor: { name: "Reactor", cost: 5, gen: 4, use: 0, desc: "+4 energy" },
  solar: { name: "Solar Array", cost: 1, gen: 1, use: 0, desc: "+1 energy" },
  conduit: { name: "Conduit", cost: 1, gen: 0, use: 0, desc: "Links modules" },
  thruster: { name: "Thruster", cost: 2, gen: 0, use: 3, desc: "Needs 3 energy" },
  shield: { name: "Shield", cost: 3, gen: 0, use: 2, desc: "Needs 2 energy" },
  comms: { name: "Comms Dish", cost: 2, gen: 0, use: 1, desc: "Needs 1 energy" },
};

export interface Level {
  name: string;
  brief: string;
  budget: number;
  goals: Partial<Record<ModType, number>>;
  rocks: [number, number][];
}

export const SIZE = 7;

export const LEVELS: Level[] = [
  { name: "Ignition", brief: "Bring one thruster online.", budget: 8, goals: { thruster: 1 }, rocks: [[3, 3]] },
  { name: "First Contact", brief: "Two thrusters and a comms dish, on a tight budget.", budget: 15, goals: { thruster: 2, comms: 1 }, rocks: [[2, 2], [4, 4], [2, 4]] },
  { name: "Debris Field", brief: "Shield up and burn through the rubble.", budget: 18, goals: { shield: 2, thruster: 1 }, rocks: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 1], [1, 5]] },
  { name: "Open Orbit", brief: "Sandbox. Build anything you like.", budget: 999, goals: {}, rocks: [] },
];

export function makeGrid(level: Level): Cell[][] {
  const g: Cell[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  level.rocks.forEach(([x, y]) => (g[y]![x] = "rock"));
  return g;
}

/** Returns powered cells ("x,y") — a connected network is powered if its generation covers its demand. */
export function computePower(g: Cell[][]) {
  const seen = new Set<string>();
  const powered = new Set<string>();
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const c = g[y]![x];
      if (!c || c === "rock" || seen.has(`${x},${y}`)) continue;
      const comp: string[] = [];
      const stack = [[x, y]];
      let gen = 0, use = 0;
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop() as [number, number];
        const m = g[cy]![cx] as ModType;
        comp.push(`${cx},${cy}`);
        gen += MODS[m].gen;
        use += MODS[m].use;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          const n = g[ny]?.[nx];
          if (n && n !== "rock" && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            stack.push([nx, ny]);
          }
        }
      }
      if (gen > 0 && gen >= use) comp.forEach((k) => powered.add(k));
    }
  return powered;
}

export function spent(g: Cell[][]) {
  return g.flat().reduce((s, c) => (c && c !== "rock" ? s + MODS[c].cost : s), 0);
}

export function goalProgress(g: Cell[][], level: Level, powered: Set<string>) {
  const counts: Partial<Record<ModType, number>> = {};
  g.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c && c !== "rock" && powered.has(`${x},${y}`)) counts[c] = (counts[c] ?? 0) + 1;
    }),
  );
  const entries = Object.entries(level.goals) as [ModType, number][];
  const done = entries.length > 0 && entries.every(([t, n]) => (counts[t] ?? 0) >= n) && spent(g) <= level.budget;
  return { counts, done };
}
