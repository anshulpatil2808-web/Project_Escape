import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Starfield } from "@/game/Starfield";
import { drawCell } from "@/game/sprites";
import { LEVELS, MODS, SIZE, computePower, goalProgress, makeGrid, spent, type Cell, type ModType } from "@/game/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orbital Assembly — Pixel Space Puzzle" },
      { name: "description", content: "Build your own space station from modules and power it up in this pixel-art puzzle." },
      { property: "og:title", content: "Orbital Assembly — Pixel Space Puzzle" },
      { property: "og:description", content: "Pick modules, wire your station, and power up in a pixel-art space puzzle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

const TILE = 16;
const TYPES = Object.keys(MODS) as ModType[];

function Game() {
  const [li, setLi] = useState(0);
  const level = LEVELS[li]!;
  const [grid, setGrid] = useState<Cell[][]>(() => makeGrid(LEVELS[0]!));
  const [tool, setTool] = useState<ModType | "erase">("reactor");
  const canvas = useRef<HTMLCanvasElement>(null);
  const hover = useRef<[number, number] | null>(null);

  const powered = useMemo(() => computePower(grid), [grid]);
  const { counts, done } = goalProgress(grid, level, powered);
  const cost = spent(grid);
  const sandbox = level.budget > 900;

  const state = useRef({ grid, powered });
  state.current = { grid, powered };

  useEffect(() => {
    const c = canvas.current!.getContext("2d")!;
    let raf = 0;
    const loop = (t: number) => {
      const { grid, powered } = state.current;
      c.clearRect(0, 0, SIZE * TILE, SIZE * TILE);
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
          c.fillStyle = (x + y) % 2 ? "rgba(120,160,255,0.06)" : "rgba(120,160,255,0.03)";
          c.fillRect(x * TILE, y * TILE, TILE, TILE);
          c.fillStyle = "rgba(120,160,255,0.18)";
          c.fillRect(x * TILE, y * TILE, 1, 1);
        }
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
          drawCell(c, grid[y]![x]!, x * TILE, y * TILE, t + x * 37 + y * 53, powered.has(`${x},${y}`));
      const h = hover.current;
      if (h) {
        c.strokeStyle = "rgba(94,242,255,0.8)";
        c.lineWidth = 1;
        c.strokeRect(h[0] * TILE + 0.5, h[1] * TILE + 0.5, TILE - 1, TILE - 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cellAt = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const b = e.currentTarget.getBoundingClientRect();
    return [Math.floor(((e.clientX - b.left) / b.width) * SIZE), Math.floor(((e.clientY - b.top) / b.height) * SIZE)];
  };

  const place = (x: number, y: number) => {
    if (grid[y]?.[x] === "rock") return;
    const next = grid.map((r) => [...r]);
    if (tool === "erase" || next[y]![x] === tool) next[y]![x] = null;
    else {
      next[y]![x] = tool;
      if (spent(next) > level.budget) return;
    }
    setGrid(next);
  };

  const loadLevel = (i: number) => {
    setLi(i);
    setGrid(makeGrid(LEVELS[i]!));
  };

  return (
    <main className="relative min-h-screen px-4 py-8 text-foreground">
      <Starfield />
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 text-center">
          <h1 className="font-pixel text-xl text-primary drop-shadow-[0_0_8px_var(--primary)] md:text-3xl">ORBITAL ASSEMBLY</h1>
          <p className="mt-2 text-xl text-muted-foreground">Pick your modules. Wire the station. Light it up.</p>
        </header>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {LEVELS.map((l, i) => (
            <button key={l.name} onClick={() => loadLevel(i)} className={`pixel-btn ${i === li ? "pixel-btn-active" : ""}`}>
              {i + 1}. {l.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
          <aside className="pixel-panel order-2 md:order-1">
            <h2 className="font-pixel mb-3 text-xs text-accent">MODULES</h2>
            <div className="grid gap-2">
              {TYPES.map((t) => (
                <button key={t} onClick={() => setTool(t)} className={`pixel-btn flex justify-between text-left ${tool === t ? "pixel-btn-active" : ""}`}>
                  <span>{MODS[t].name}</span>
                  <span className="text-muted-foreground">{MODS[t].desc} · ¢{MODS[t].cost}</span>
                </button>
              ))}
              <button onClick={() => setTool("erase")} className={`pixel-btn ${tool === "erase" ? "pixel-btn-active" : ""}`}>Remove</button>
            </div>
          </aside>

          <div className="order-1 flex flex-col items-center md:order-2">
            <canvas
              ref={canvas}
              width={SIZE * TILE}
              height={SIZE * TILE}
              className="pixel-canvas pixel-frame w-[min(88vw,476px)] cursor-crosshair"
              onMouseMove={(e) => (hover.current = cellAt(e))}
              onMouseLeave={() => (hover.current = null)}
              onClick={(e) => place(...cellAt(e))}
            />
            <p className="mt-3 text-lg text-muted-foreground">Click to place · click again to remove</p>
          </div>

          <aside className="pixel-panel order-3">
            <h2 className="font-pixel mb-2 text-xs text-accent">MISSION</h2>
            <p className="text-xl">{level.brief}</p>
            {!sandbox && (
              <p className={`mt-3 text-xl ${cost > level.budget ? "text-destructive" : ""}`}>
                Credits: ¢{cost} / ¢{level.budget}
              </p>
            )}
            <ul className="mt-3 space-y-1 text-xl">
              {(Object.entries(level.goals) as [ModType, number][]).map(([t, n]) => (
                <li key={t} className={(counts[t] ?? 0) >= n ? "text-success" : "text-muted-foreground"}>
                  {(counts[t] ?? 0) >= n ? "■" : "□"} {MODS[t].name} powered {Math.min(counts[t] ?? 0, n)}/{n}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg text-muted-foreground">
              Touching modules share one power network. A network runs only if its energy covers every demand.
            </p>
            {done && (
              <div className="mt-4 animate-pulse border-2 border-success p-3 text-center">
                <p className="font-pixel text-xs text-success">MISSION COMPLETE</p>
                {li < LEVELS.length - 1 && (
                  <button onClick={() => loadLevel(li + 1)} className="pixel-btn pixel-btn-active mt-3 w-full">Next mission →</button>
                )}
              </div>
            )}
            <button onClick={() => setGrid(makeGrid(level))} className="pixel-btn mt-4 w-full">Reset</button>
          </aside>
        </div>
      </div>
    </main>
  );
}
