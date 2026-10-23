import { describe, expect, it } from "vitest";
import { DIRS, LEVELS, makeDirs, makeGrid, refund, simulate, step, thrusterDrivesShip, type Cell } from "./engine";

type Mod = [number, number, Cell, number];
const build = (li: number, mods: Mod[]) => {
  const g = makeGrid(LEVELS[li]!), d = makeDirs();
  mods.forEach(([x, y, k, dir]) => { g[y]![x] = k; d[y]![x] = dir; });
  return { g, d };
};

describe("drift rules", () => {
  it("ends with Gravity Well after five missions, without Free Drift", () => {
    expect(LEVELS.length).toBe(5);
    expect(LEVELS.at(-1)?.name).toBe("Gravity Well");
    expect(LEVELS.some((level) => level.name === "Free Drift")).toBe(false);
  });
  it.each([["thruster", 2], ["shield", 3], ["comms", 1]] as const)("removing %s restores its full %i-coin cost", (module, price) => {
    expect(price - price + refund(module)).toBe(price);
    expect(refund(module)).toBe(price);
  });
  it.each([0, 1, 2, 3])("anchor direction %i holds only its facing square", (dir) => {
    const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
    const vector = vectors[dir];
    if (!vector) throw new Error("missing direction");
    const { g, d } = build(0, [[3, 3, "shield", dir]]);
    expect(step(g, d, LEVELS[0]!, [3 + vector[0], 3 + vector[1]], [1, 0]).event).toBe("held");
    expect(step(g, d, LEVELS[0]!, [3 - vector[0], 3 - vector[1]], [1, 0]).event).not.toBe("held");
  });
  it.each([0, 1, 2, 3])("bumper direction %i stops its front and reflects its back", (dir) => {
    const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
    const vector = vectors[dir];
    if (!vector) throw new Error("missing direction");
    const [dx, dy] = vector;
    const { g, d } = build(0, [[3, 3, "comms", dir]]);
    expect(step(g, d, LEVELS[0]!, [3 + dx, 3 + dy], [-dx, -dy]).vel).toEqual([0, 0]);
    const bounced = step(g, d, LEVELS[0]!, [3 - dx, 3 - dy], [dx, dy]);
    expect(bounced.ship).toEqual([3 - dx, 3 - dy]);
    expect(bounced.vel).toEqual([-dx || 0, -dy || 0]);
    expect(bounced.event).toBe("blocked");
  });
  it("a still ship falls into the black hole", () => {
    const { g, d } = build(2, []);
    expect(simulate(g, d, LEVELS[2]!)).toBe("blackhole");
  });
  it("exhaust toward the ship does not propel it, as in the reported Cold Start layout", () => {
    const facing = build(1, [[6, 2, "thruster", 3]]);
    const result = step(facing.g, facing.d, LEVELS[1]!, [5, 2], [0, 0]);
    expect(result.ship).toEqual([5, 2]);
    expect(result.vel).toEqual([0, 0]);
    expect(result.event).toBe("blocked");
    const away = build(1, [[6, 2, "thruster", 1]]);
    expect(step(away.g, away.d, LEVELS[1]!, [5, 2], [0, 0]).ship).toEqual([4, 2]);
    const side = build(1, [[6, 2, "thruster", 0]]);
    expect(step(side.g, side.d, LEVELS[1]!, [5, 2], [0, 0]).event).toBe("blocked"); // falls onto rock below
  });
  it("three modules touching the ship overload it", () => {
    const { g, d } = build(1, [[6, 2, "comms", 1], [4, 2, "comms", 1], [5, 1, "comms", 1]]);
    expect(simulate(g, d, LEVELS[1]!)).toBe("overload");
  });
  it("coins start at 2 and grow by 3 each mission", () => {
    expect(LEVELS.map((level) => level.budget)).toEqual([2, 5, 8, 11, 14]);
  });
  it("flight time starts at 20s and grows by 5s each mission", () => {
    expect(LEVELS.map((level) => level.time)).toEqual([20, 25, 30, 35, 40]);
  });
  it("every mission is solvable within its budget", () => {
    const solutions: Mod[][] = [
      [[0, 2, "thruster", 3]],
      [[0, 2, "comms", 1], [6, 2, "thruster", 1]],
      [[1, 3, "thruster", 3], [2, 5, "thruster", 2]],
      [[0, 0, "thruster", 3], [1, 4, "thruster", 2]],
      [[5, 1, "thruster", 1], [2, 2, "thruster", 1], [4, 5, "thruster", 2]],
    ];
    solutions.forEach((mods, li) => {
      const { g, d } = build(li, mods);
      const cost = mods.reduce((s, m) => s + (m[2] === "thruster" ? 2 : 1), 0);
      expect(cost).toBeLessThanOrEqual(LEVELS[li]!.budget);
      expect(simulate(g, d, LEVELS[li]!)).toBe("portal");
    });
  });
});

it.each([0, 1, 2, 3])("thrust opposes exhaust in direction %i", (dir) => {
  const exhaust = DIRS[dir];
  const level = LEVELS[0];
  if (!exhaust || !level) throw new Error("Missing direction or level");
  const ship: [number, number] = [3 - exhaust[0], 3 - exhaust[1]];
  const { g, d } = build(0, [[3, 3, "thruster", dir]]);
  expect(thrusterDrivesShip(d, 3, 3, ship)).toBe(true);
  expect(step(g, d, level, ship, [0, 0]).vel).toEqual([-exhaust[0] || 0, -exhaust[1] || 0]);
  expect(thrusterDrivesShip(d, 3, 3, [3 + exhaust[0], 3 + exhaust[1]])).toBe(false);
});

import { step as stepRule, LEVELS as L2, SIZE as S2 } from "./engine";
it("thruster with exhaust pointing away still pushes the ship forward", () => {
  const g = Array.from({ length: S2 }, () => Array(S2).fill(null));
  const dirs = Array.from({ length: S2 }, () => Array(S2).fill(0));
  g[2]![0] = "thruster"; dirs[2]![0] = 3; // left-facing exhaust, ship at [1,2]
  const r = stepRule(g, dirs, L2[0]!, [1, 2], [0, 0]);
  expect(r.ship).toEqual([2, 2]);
});
