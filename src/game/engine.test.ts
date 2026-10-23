import { describe, expect, it } from "vitest";
import { LEVELS, makeDirs, makeGrid, simulate, step, type Cell } from "./engine";

type Mod = [number, number, Cell, number];
const build = (li: number, mods: Mod[]) => {
  const g = makeGrid(LEVELS[li]!), d = makeDirs();
  mods.forEach(([x, y, k, dir]) => { g[y]![x] = k; d[y]![x] = dir; });
  return { g, d };
};

describe("drift rules", () => {
  it("a still ship falls into the black hole", () => {
    const { g, d } = build(1, []);
    expect(simulate(g, d, LEVELS[1]!)).toBe("blackhole");
  });
  it("a thruster only launches the ship when its blast faces the ship", () => {
    const facing = build(0, [[6, 2, "thruster", 3]]);
    expect(step(facing.g, facing.d, LEVELS[0]!, [5, 2], [0, 0]).ship).toEqual([4, 2]);
    const away = build(0, [[6, 2, "thruster", 1]]);
    expect(step(away.g, away.d, LEVELS[0]!, [5, 2], [0, 0]).event).toBe("blocked"); // falls onto rock below
  });
  it("three modules touching the ship overload it", () => {
    const { g, d } = build(0, [[6, 2, "comms", 1], [4, 2, "comms", 1], [5, 1, "comms", 1]]);
    expect(simulate(g, d, LEVELS[0]!)).toBe("overload");
  });
  it("every mission is solvable within its exact budget", () => {
    const solutions: Mod[][] = [
      [[0, 2, "comms", 1], [6, 2, "thruster", 3]],
      [[1, 3, "thruster", 1], [2, 5, "thruster", 0]],
      [[0, 0, "thruster", 1], [1, 4, "thruster", 0]],
      [[5, 1, "thruster", 3], [2, 2, "thruster", 3], [4, 5, "thruster", 0]],
    ];
    solutions.forEach((mods, li) => {
      const { g, d } = build(li, mods);
      const cost = mods.reduce((s, m) => s + (m[2] === "thruster" ? 2 : 1), 0);
      expect(cost).toBe(LEVELS[li]!.budget);
      expect(simulate(g, d, LEVELS[li]!)).toBe("portal");
    });
  });
});
