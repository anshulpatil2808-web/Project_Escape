import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Starfield } from "@/game/Starfield";
import { drawCell } from "@/game/sprites";
import { HORIZON_Y, LEVELS, MODS, SIZE, makeGrid, refund, step, type Cell, type ModType, type Vec } from "@/game/engine";
import { play } from "@/game/sound";
import { BlackHole } from "@/game/BlackHole";
import { WhiteHole } from "@/game/WhiteHole";

type Loss = "credits" | "time" | "overload" | "blackhole";
const LOSS_TEXT: Record<Loss, string> = {
  credits: "You ran out of credits.",
  time: "The countdown hit zero.",
  overload: "Three modules touched the ship at once and overloaded it.",
  blackhole: "Your ship drifted past the event horizon.",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Escape — Drift Out of the Black Hole" },
      { name: "description", content: "Steer a frictionless pixel ship away from a black hole by placing pushers, anchors and bumpers." },
      { property: "og:title", content: "Project Escape — Drift Out of the Black Hole" },
      { property: "og:description", content: "A pixel-art space puzzle: nudge a drifting ship into the escape portal before gravity wins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

const TILE = 16;
const TICK = 600;
const TYPES = Object.keys(MODS) as ModType[];

/** Predict where the ship goes with the current layout (for the dotted guide). */
function predict(g: Cell[][], li: number, ship: Vec, vel: Vec) {
  const level = LEVELS[li]!;
  const path: Vec[] = [];
  let s = ship, v = vel;
  for (let i = 0; i < 16; i++) {
    const r = step(g, level, s, v);
    if (r.event === "held") break;
    path.push(r.ship);
    if (r.event !== "move" && r.event !== "blocked") break;
    if (r.event === "blocked" && path.length > 1 && r.ship === s) { /* falls again next tick */ }
    s = r.ship; v = r.vel;
  }
  return path;
}

function Game() {
  const [li, setLi] = useState(0);
  const level = LEVELS[li]!;
  const sandbox = level.budget > 900;
  const [grid, setGrid] = useState<Cell[][]>(() => makeGrid(LEVELS[0]!));
  const [tool, setTool] = useState<ModType | "erase">("thruster");
  const [ship, setShip] = useState<Vec>(LEVELS[0]!.ship);
  const [vel, setVel] = useState<Vec>([0, 0]);
  const [flying, setFlying] = useState(false);
  const [won, setWon] = useState(false);
  const [wallet, setWallet] = useState(LEVELS[0]!.budget);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0]!.time);
  const [lost, setLost] = useState<Loss | null>(null);
  const [emerging, setEmerging] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hover = useRef<[number, number] | null>(null);
  const trail = useRef<Vec[]>([]);

  const live = { grid, ship, vel, level, flying, li };
  const state = useRef(live);
  state.current = live;

  const lose = (why: Loss) => {
    setFlying(false);
    setLost(why);
    play("blackhole");
  };

  // simulation tick
  useEffect(() => {
    if (!flying || lost || won) return;
    const id = setInterval(() => {
      const { grid, ship, vel, level } = state.current;
      const r = step(grid, level, ship, vel);
      trail.current = [...trail.current.slice(-8), ship];
      setShip(r.ship);
      setVel(r.vel);
      if (r.event === "portal") { setWon(true); setFlying(false); play("win"); }
      else if (r.event === "blackhole") lose("blackhole");
      else if (r.event === "overload") lose("overload");
      else if (r.event === "blocked") play("remove");
    }, TICK);
    return () => clearInterval(id);
  }, [flying, lost, won]);

  // countdown while flying
  useEffect(() => {
    if (!flying || sandbox) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [flying, sandbox]);
  useEffect(() => {
    if (!flying || sandbox) return;
    if (timeLeft <= 0) lose("time");
    else if (timeLeft <= 5) play("warn");
  }, [timeLeft]);

  // render loop
  useEffect(() => {
    const c = canvas.current!.getContext("2d")!;
    let raf = 0;
    const loop = (t: number) => {
      const { grid, ship, vel, level, flying, li } = state.current;
      c.clearRect(0, 0, SIZE * TILE, SIZE * TILE);
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
          c.fillStyle = (x + y) % 2 ? "rgba(120,160,255,0.06)" : "rgba(120,160,255,0.03)";
          c.fillRect(x * TILE, y * TILE, TILE, TILE);
          c.fillStyle = "rgba(120,160,255,0.18)";
          c.fillRect(x * TILE, y * TILE, 1, 1);
        }
      // event horizon: swirling purple row
      for (let x = 0; x < SIZE * TILE; x++) {
        const h = 4 + Math.round(3 * Math.sin(x / 5 + t / 250));
        c.fillStyle = "rgba(10,0,20,0.9)";
        c.fillRect(x, HORIZON_Y * TILE + 16 - h - 8, 1, h + 8);
        if ((x + Math.floor(t / 60)) % 4 === 0) { c.fillStyle = "rgba(200,70,255,0.8)"; c.fillRect(x, HORIZON_Y * TILE + 16 - h - 9, 1, 1); }
      }
      // portal
      const [px, py] = level.portal;
      const pr = 5 + Math.round(Math.sin(t / 200));
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2 + t / 300;
        c.fillStyle = a % 2 ? "#5ef2ff" : "#ffffff";
        c.fillRect(Math.round(px * TILE + 8 + Math.cos(ang) * pr), Math.round(py * TILE + 8 + Math.sin(ang) * pr), 1, 1);
      }
      c.fillStyle = "rgba(94,242,255,0.25)";
      c.fillRect(px * TILE + 5, py * TILE + 5, 6, 6);
      // modules & rocks
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) drawCell(c, grid[y]![x]!, x * TILE, y * TILE, t + x * 37 + y * 53, true);
      // predicted path
      if (!flying) {
        predict(grid, li, ship, vel).forEach(([x, y], i) => {
          if (Math.floor(t / 150) % 16 === i) return;
          c.fillStyle = y >= HORIZON_Y ? "#ff5ad5" : "#ffe066";
          c.fillRect(x * TILE + 7, y * TILE + 7, 2, 2);
        });
      }
      // trail
      trail.current.forEach(([x, y], i) => {
        c.fillStyle = `rgba(94,242,255,${(i + 1) / 20})`;
        c.fillRect(x * TILE + 6, y * TILE + 6, 4, 4);
      });
      // ship
      const [sx, sy] = ship;
      const bob = Math.round(Math.sin(t / 180));
      const ox = sx * TILE, oy = sy * TILE + bob;
      c.fillStyle = "#1a2130"; c.fillRect(ox + 4, oy + 4, 8, 8);
      c.fillStyle = "#e8f0ff"; c.fillRect(ox + 5, oy + 5, 6, 6);
      c.fillStyle = "#5ef2ff"; c.fillRect(ox + 7, oy + 6, 2, 2);
      c.fillStyle = "#ff5a5a"; c.fillRect(ox + 5, oy + 10, 1, 1); c.fillRect(ox + 10, oy + 10, 1, 1);
      if (vel[0] || vel[1]) {
        const f = Math.floor(t / 80) % 2;
        c.fillStyle = f ? "#ffb347" : "#fff4d0";
        c.fillRect(ox + 7 - vel[0] * 5, oy + 7 - vel[1] * 5, 2, 2);
        c.fillStyle = "#c46a1a";
        c.fillRect(ox + 7 - vel[0] * (7 + f), oy + 7 - vel[1] * (7 + f), 2, 2);
      }
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
    if (lost || won || y >= HORIZON_Y) return play("warn");
    const cur = grid[y]?.[x];
    if (cur === "rock" || (x === ship[0] && y === ship[1]) || (x === level.portal[0] && y === level.portal[1])) return play("warn");
    const next = grid.map((r) => [...r]);
    if (tool === "erase" || cur === tool) {
      if (!cur) return;
      next[y]![x] = null;
      if (!sandbox) setWallet((w) => w + refund(cur as ModType));
      play("remove");
    } else {
      const price = MODS[tool].cost - (cur ? refund(cur as ModType) : 0);
      if (!sandbox && price > wallet) return play("warn");
      next[y]![x] = tool;
      if (!sandbox) {
        const left = wallet - price;
        setWallet(left);
        if (left <= 0 && flying) setTimeout(() => lose("credits"), 300);
      }
      play("place");
    }
    setGrid(next);
  };

  const loadLevel = (i: number) => {
    const l = LEVELS[i]!;
    setLi(i);
    setGrid(makeGrid(l));
    setShip(l.ship);
    setVel([0, 0]);
    setFlying(false);
    setWon(false);
    setWallet(l.budget);
    setTimeLeft(l.time);
    setLost(null);
    trail.current = [];
  };

  const launch = () => {
    setFlying(true);
    play("power");
  };

  return (
    <main className="relative min-h-screen px-4 py-8 text-foreground">
      <Starfield />
      <div className={`mx-auto max-w-5xl ${lost ? "page-sucked" : emerging ? "page-emerge" : ""}`}>
        <header className="mb-6 text-center">
          <h1 className="title-glitch font-pixel text-xl text-primary md:text-3xl">PROJECT ESCAPE</h1>
          <p className="mt-2 text-xl text-muted-foreground">Your ship has no brakes. The black hole is hungry. Steer it home.</p>
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
                <button key={t} onClick={() => setTool(t)} className={`pixel-btn text-left ${tool === t ? "pixel-btn-active" : ""}`}>
                  <span className="flex justify-between">
                    <span>{MODS[t].name}</span>
                    <span className={!sandbox && MODS[t].cost > wallet ? "text-destructive" : "text-accent"}>¢{MODS[t].cost}</span>
                  </span>
                  <span className="block text-base text-muted-foreground">{MODS[t].desc}</span>
                </button>
              ))}
              <button onClick={() => setTool("erase")} className={`pixel-btn ${tool === "erase" ? "pixel-btn-active" : ""}`}>Remove (half refund)</button>
            </div>
          </aside>

          <div className="order-1 flex flex-col items-center md:order-2">
            <div className="mb-3 flex w-full justify-between font-pixel text-xs">
              <span className={!sandbox && timeLeft <= 5 ? "timer-danger" : "text-accent"}>{sandbox ? "NO CLOCK" : `T-${Math.max(0, timeLeft)}s`}</span>
              <span className="text-primary">{sandbox ? "¢∞" : `¢${wallet}`}</span>
            </div>
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
            <div className="mt-3 flex w-full gap-2">
              {!flying && !won && (
                <button onClick={launch} className="pixel-btn pixel-btn-active flex-1 font-pixel text-xs">▶ LAUNCH</button>
              )}
              {flying && <p className="flex-1 text-center text-lg text-accent">In flight. You can still place modules!</p>}
              <button onClick={() => loadLevel(li)} className="pixel-btn">Restart</button>
            </div>
            <p className="mt-2 text-lg text-muted-foreground">Yellow dots show where the ship will go.</p>
          </div>

          <aside className="pixel-panel float-in order-3">
            <h2 className="font-pixel mb-2 text-xs text-accent">MISSION</h2>
            <p className="text-xl">{level.brief}</p>
            <h2 className="font-pixel mb-2 mt-4 text-xs text-accent">HOW IT WORKS</h2>
            <ol className="space-y-1 text-lg text-muted-foreground">
              <li>1. Get the ship into the spinning portal.</li>
              <li>2. No friction: once moving, the ship glides until it hits something.</li>
              <li>3. When it stops, the black hole pulls it down one cell at a time.</li>
              <li>4. Fall into the purple bottom row and it's gone.</li>
              <li>5. Three modules touching the ship at once overload it.</li>
              {!sandbox && <li>6. Spend every credit, or run out the clock, and the black hole wins.</li>}
            </ol>
            {won && (
              <div className="mt-4 animate-pulse border-2 border-success p-3 text-center">
                <p className="font-pixel text-xs text-success">ESCAPED!</p>
                {li < LEVELS.length - 1 && (
                  <button onClick={() => loadLevel(li + 1)} className="pixel-btn pixel-btn-active mt-3 w-full">Next mission →</button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
      {lost && <BlackHole reason={LOSS_TEXT[lost]} onRetry={() => { loadLevel(li); setEmerging(true); play("power"); }} />}
      {emerging && <WhiteHole onDone={() => setEmerging(false)} />}
    </main>
  );
}
