import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Starfield } from "@/game/Starfield";
import { drawCell } from "@/game/sprites";
import { LEVELS, MODS, SIZE, computePower, goalProgress, makeGrid, maxSurplus, moduleCount, inHorizon, refund, type Cell, type ModType } from "@/game/engine";
import { play } from "@/game/sound";
import { BlackHole } from "@/game/BlackHole";

type Loss = "credits" | "time" | "overload";
const LOSS_TEXT: Record<Loss, string> = {
  credits: "You ran out of credits.",
  time: "The countdown hit zero.",
  overload: "Unused energy overloaded the station.",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Escape — Outrun the Black Hole" },
      { name: "description", content: "Build an escape station from modules before the black hole swallows you in this pixel-art space puzzle." },
      { property: "og:title", content: "Project Escape — Outrun the Black Hole" },
      { property: "og:description", content: "Pick modules, wire your station, and escape the black hole in a pixel-art puzzle." },
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
  const [wallet, setWallet] = useState(LEVELS[0]!.budget);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0]!.time);
  const [lost, setLost] = useState<Loss | null>(null);

  const powered = useMemo(() => computePower(grid), [grid]);
  const { counts, done } = goalProgress(grid, level, powered);
  const sandbox = level.budget > 900;
  const surplus = maxSurplus(grid);
  const overloaded = !sandbox && surplus > level.maxSurplus;

  const lose = (why: Loss) => {
    if (lost || done) return;
    setLost(why);
    play("blackhole");
  };

  // countdown
  useEffect(() => {
    if (sandbox || done || lost) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [sandbox, done, lost, li]);
  useEffect(() => {
    if (sandbox || done || lost) return;
    if (timeLeft <= 0) lose("time");
    else if (timeLeft <= 10) play("warn");
  }, [timeLeft]);
  // overload: lose if the station stays overloaded for 3 seconds
  useEffect(() => {
    if (!overloaded || done || lost) return;
    play("warn");
    const id = setTimeout(() => lose("overload"), 3000);
    return () => clearTimeout(id);
  }, [overloaded, done, lost]);
  // out of credits: nothing affordable left and mission not done
  useEffect(() => {
    if (!sandbox && !done && !lost && wallet < 1) lose("credits");
  }, [wallet, done]);
  const wasDone = useRef(false);
  useEffect(() => {
    if (done && !wasDone.current) play("win");
    wasDone.current = done;
  }, [done]);

  const state = useRef({ grid, powered, level });
  state.current = { grid, powered, level };

  useEffect(() => {
    const c = canvas.current!.getContext("2d")!;
    let raf = 0;
    const loop = (t: number) => {
      const { grid, powered, level } = state.current;
      c.clearRect(0, 0, SIZE * TILE, SIZE * TILE);
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
          c.fillStyle = (x + y) % 2 ? "rgba(120,160,255,0.06)" : "rgba(120,160,255,0.03)";
          c.fillRect(x * TILE, y * TILE, TILE, TILE);
          c.fillStyle = "rgba(120,160,255,0.18)";
          c.fillRect(x * TILE, y * TILE, 1, 1);
          if (inHorizon(level, y)) {
            c.fillStyle = `rgba(200,60,255,${0.12 + 0.08 * Math.sin(t / 300 + x)})`;
            c.fillRect(x * TILE, y * TILE, TILE, TILE);
            if (((x * 7 + Math.floor(t / 120)) % 5) === 0) { c.fillStyle = "rgba(255,120,255,0.5)"; c.fillRect(x * TILE + ((t / 40 + x * 3) % TILE), y * TILE + 8, 1, 1); }
          }
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
    if (lost || done || grid[y]?.[x] === "rock") return;
    const next = grid.map((r) => [...r]);
    const cur = next[y]![x];
    if (tool === "erase" || cur === tool) {
      if (!cur || cur === "rock") return;
      next[y]![x] = null;
      if (!sandbox) setWallet((w) => w + refund(cur));
      play("remove");
    } else {
      if (!sandbox && !cur && moduleCount(grid) >= level.maxMods) return play("warn");
      if (inHorizon(level, y)) {
        // swallowed by the event horizon: pay full price, keep nothing
        if (!sandbox && MODS[tool].cost > wallet) return play("warn");
        if (!sandbox) setWallet((w) => w - MODS[tool].cost);
        return play("remove");
      }
      const price = MODS[tool].cost - (cur && cur !== "rock" ? refund(cur) : 0);
      if (!sandbox && price > wallet) return play("warn");
      next[y]![x] = tool;
      if (!sandbox) setWallet((w) => w - price);
      play(computePower(next).size > powered.size ? "power" : "place");
    }
    setGrid(next);
  };

  const loadLevel = (i: number) => {
    setLi(i);
    setGrid(makeGrid(LEVELS[i]!));
    setWallet(LEVELS[i]!.budget);
    setTimeLeft(LEVELS[i]!.time);
    setLost(null);
  };

  return (
    <main className="relative min-h-screen px-4 py-8 text-foreground">
      <Starfield />
      <div className={`mx-auto max-w-5xl ${lost ? "page-sucked" : ""}`}>
        <header className="mb-6 text-center">
          <h1 className="title-glitch font-pixel text-xl text-primary md:text-3xl">PROJECT ESCAPE</h1>
          <p className="mt-2 text-xl text-muted-foreground">Build fast. Spend wisely. Don't fall into the black hole.</p>
        </header>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {LEVELS.map((l, i) => (
            <button key={l.name} onClick={() => loadLevel(i)} className={`pixel-btn ${i === li ? "pixel-btn-active" : ""}`}>
              {i + 1}. {l.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
          <aside className="pixel-panel float-in order-2 md:order-1">
            <h2 className="font-pixel mb-3 text-xs text-accent">MODULES</h2>
            <div className="grid gap-2">
              {TYPES.map((t) => (
                <button key={t} onClick={() => setTool(t)} className={`pixel-btn flex justify-between text-left ${tool === t ? "pixel-btn-active" : ""}`}>
                  <span>{MODS[t].name}</span>
                  <span className={!sandbox && MODS[t].cost > wallet ? "text-destructive" : "text-muted-foreground"}>{MODS[t].desc} · ¢{MODS[t].cost}</span>
                </button>
              ))}
              <button onClick={() => setTool("erase")} className={`pixel-btn ${tool === "erase" ? "pixel-btn-active" : ""}`}>Remove</button>
            </div>
          </aside>

          <div className="order-1 flex flex-col items-center md:order-2">
            {!sandbox && (
              <div className="mb-3 flex w-full justify-between font-pixel text-xs">
                <span className={timeLeft <= 10 ? "timer-danger" : "text-accent"}>T-{Math.max(0, timeLeft)}s</span>
                <span className={overloaded ? "timer-danger" : "text-primary"}>SURGE {surplus}/{level.maxSurplus}</span>
              </div>
            )}
            <div className="board-wrap">
            <canvas
              ref={canvas}
              width={SIZE * TILE}
              height={SIZE * TILE}
              className="pixel-canvas pixel-frame w-[min(88vw,476px)] cursor-crosshair"
              onMouseMove={(e) => (hover.current = cellAt(e))}
              onMouseLeave={() => (hover.current = null)}
              onClick={(e) => place(...cellAt(e))}
            />
            </div>
            <p className="mt-3 text-lg text-muted-foreground">Click to place · click again to remove</p>
          </div>

          <aside className="pixel-panel float-in order-3">
            <h2 className="font-pixel mb-2 text-xs text-accent">MISSION</h2>
            <p className="text-xl">{level.brief}</p>
            {!sandbox && (
              <p className={`mt-3 text-xl ${wallet <= 2 ? "text-destructive" : ""}`}>
                Credits left: ¢{wallet} / ¢{level.budget}
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
              Touching modules share power. A network runs only if its energy covers every demand.
            </p>
            {!sandbox && (
              <ul className="mt-2 space-y-1 text-lg text-muted-foreground">
                <li>▸ Every placement spends credits. Removing refunds only half.</li>
                <li>▸ Spare energy over {level.maxSurplus} in one network overloads in 3s.</li>
                <li>▸ Finish before the countdown ends.</li>
                <li>▸ Max {level.maxMods} modules on the board ({moduleCount(grid)} used).</li>
                <li>▸ The glowing bottom row is the event horizon. Anything placed there is swallowed and the credits are lost.</li>
              </ul>
            )}
            {done && (
              <div className="mt-4 animate-pulse border-2 border-success p-3 text-center">
                <p className="font-pixel text-xs text-success">MISSION COMPLETE</p>
                {li < LEVELS.length - 1 && (
                  <button onClick={() => loadLevel(li + 1)} className="pixel-btn pixel-btn-active mt-3 w-full">Next mission →</button>
                )}
              </div>
            )}
            <button onClick={() => loadLevel(li)} className="pixel-btn mt-4 w-full">Restart mission</button>
          </aside>
        </div>
      </div>
      {lost && <BlackHole reason={LOSS_TEXT[lost]} onRetry={() => loadLevel(li)} />}
    </main>
  );
}
