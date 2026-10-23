import { describe, expect, it } from "vitest";
import { LEVELS, makeGrid, step, type Cell, type Vec } from "./engine";

const run = (g: Cell[][], li: number, max = 30) => {
  const l = LEVELS[li]!;
  let s: Vec = l.ship, v: Vec = [0, 0];
  for (let i = 0; i < max; i++) {
    const r = step(g, l, s, v);
    if (r.event === "portal" || r.event === "blackhole" || r.event === "overload") return r.event;
    s = r.ship; v = r.vel;
  }
  return "stuck";
};

describe("drift rules", () => {
  it("a still ship falls into the black hole", () => {
    expect(run(makeGrid(LEVELS[0]!), 0)).toBe("blackhole");
  });
  it("three modules touching the ship overload it", () => {
    const g = makeGrid(LEVELS[0]!);
    g[2]![0] = "thruster"; g[1]![1] = "comms"; g[3]![1] = "comms";
    expect(run(g, 0)).toBe("overload");
  });
  it("every mission has a solution", () => {
    const solutions: [number, number, number][][] = [
      [[0, 2, 0]],
      [[0, 1, 0], [3, 4, 0]],
      [[0, 3, 0]],
      [[3, 5, 0], [2, 1, 0]],
    ];
    solutions.forEach((mods, li) => {
      const g = makeGrid(LEVELS[li]!);
      mods.forEach(([x, y]) => (g[y]![x] = "thruster"));
      expect(run(g, li)).toBe("portal");
    });
  });
});
