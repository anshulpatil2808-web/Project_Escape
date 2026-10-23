import { WarpTunnel } from "@/game/WarpTunnel";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Starfield } from "@/game/Starfield";
import { drawCell } from "@/game/sprites";
import { DIRS, DIR_NAMES, HORIZON_Y, LEVELS, MODS, SIZE, makeDirs, makeGrid, refund, step, type Cell, type ModType, type Vec } from "@/game/engine";
import { StartScreen } from "@/game/StartScreen";
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

/** Directional thruster: armoured housing, nozzle on the firing side, flickering blast. */
function drawThruster(c: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
  c.save();
  c.translate(x + 8, y + 8);
  c.rotate((dir * Math.PI) / 2); // drawn pointing up, rotated to its direction
  const r = (px: number, py: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(px - 8, py - 8, w, h); };
  r(3, 5, 10, 10, "#1a2130");
  r(4, 6, 8, 8, "#5b6b82");
  r(4, 6, 8, 1, "#8a9bb3");
  r(5, 9, 6, 2, "#ffb347");
  r(7, 12, 2, 1, "#ff5a5a");
  r(5, 2, 6, 4, "#2c3647"); // nozzle
  r(6, 1, 4, 1, "#8a9bb3");
  const f = Math.floor(t / 70) % 3;
  r(6, -1 - f, 4, 2 + f, f ? "#ffb347" : "#fff4d0");
  r(7, -2 - f, 2, 1, "#5ef2ff");
  c.restore();
  // direction arrow chip
  c.fillStyle = "rgba(255,224,102,0.9)";
  const [dx, dy] = DIRS[dir]!;
  c.fillRect(x + 7 + dx * 6, y + 7 + dy * 6, 2, 2);
  void DIR_NAMES;
}

/** Predict where the ship goes with the current layout (for the dotted guide). */
function predict(g: Cell[][], dirs: number[][], li: number, ship: Vec, vel: Vec) {
  const level = LEVELS[li]!;
  const path: Vec[] = [];
  let s = ship, v = vel;
  for (let i = 0; i < 16; i++) {
    const r = step(g, dirs, level, s, v);
    if (r.event === "held") break;
    path.push(r.ship);
    if (r.event !== "move" && r.event !== "blocked") break;
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
  const [dirs, setDirs] = useState<number[][]>(makeDirs);
  const [started, setStarted] = useState(false);
  const warp = useRef<{ at: number; kind: "out" | "in" } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [portalFx, setPortalFx] = useState<{ kind: "enter" | "hidden" | "exit"; origin: string } | null>(null);
  const [tunnel, setTunnel] = useState(false);
  // where a grid cell sits inside the page wrapper, used as the warp's vanishing point
  const cellOrigin = ([x, y]: Vec) => {
    const c = canvas.current?.getBoundingClientRect(), w = page.current?.getBoundingClientRect();
    if (!c || !w) return "50% 50%";
    return `${c.left - w.left + ((x + 0.5) / SIZE) * c.width}px ${c.top - w.top + ((y + 0.5) / SIZE) * c.height}px`;
  };
  const hover = useRef<[number, number] | null>(null);
  const trail = useRef<Vec[]>([]);

  const live = { grid, dirs, ship, vel, level, flying, li, won };
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
      const { grid, dirs, ship, vel, level, li } = state.current;
      const r = step(grid, dirs, level, ship, vel);
      trail.current = [...trail.current.slice(-8), ship];
      setShip(r.ship);
      setVel(r.vel);
      if (r.event === "portal") {
        setWon(true); setFlying(false); play("win");
        warp.current = { at: performance.now(), kind: "out" };
        // ship passes through the portal, then the next level starts on its own
        if (li < LEVELS.length - 1) {
          // 1) page dives into the portal  2) hyperspace tunnel  3) page unfolds from the next start cell
          setTimeout(() => { setPortalFx({ kind: "enter", origin: cellOrigin(level.portal) }); setTunnel(true); }, 650);
          setTimeout(() => {
            loadLevel(li + 1);
            setPortalFx({ kind: "hidden", origin: "50% 50%" });
          }, 1350);
          setTimeout(() => {
            setPortalFx({ kind: "exit", origin: cellOrigin(LEVELS[li + 1]!.ship) });
            warp.current = { at: performance.now(), kind: "in" }; play("power");
          }, 1750);
          setTimeout(() => { setPortalFx(null); setTunnel(false); }, 2600);
        }
      }
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
      const { grid, dirs, ship, vel, level, flying, li, won } = state.current;
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
        for (let x = 0; x < SIZE; x++) {
          if (grid[y]![x] === "thruster") drawThruster(c, x * TILE, y * TILE, dirs[y]![x]!, t + x * 50);
          else drawCell(c, grid[y]![x]!, x * TILE, y * TILE, t + x * 37 + y * 53, true);
        }
      // predicted path
      if (!flying && !won) {
        predict(grid, dirs, li, ship, vel).forEach(([x, y], i) => {
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
      const w = warp.current;
      const wt = w ? (performance.now() - w.at) / 1000 : 9;
      c.save();
      if (w && wt < 1.6) {
        // out: ship spirals & shrinks into the portal; in: it pops out of the start cell
        const k = w.kind === "out" ? Math.max(0, 1 - wt / 1.2) : Math.min(1, wt / 0.6);
        c.translate(ox + 8, oy + 8);
        c.rotate((1 - k) * Math.PI * 4 * (w.kind === "out" ? 1 : -1));
        c.scale(k, k);
        c.translate(-(ox + 8), -(oy + 8));
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2 + wt * 6, r = (1 - k) * 12 + 2;
          c.fillStyle = i % 2 ? "#5ef2ff" : "#ffffff";
          c.fillRect(Math.round(ox + 8 + Math.cos(a) * r), Math.round(oy + 8 + Math.sin(a) * r), 1, 1);
        }
      }
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
      c.restore();
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
    if (tool === "thruster" && cur === "thruster") {
      // clicking a placed thruster rotates it (free)
      setDirs((d) => d.map((r, yy) => r.map((v, xx) => (xx === x && yy === y ? (v + 1) % 4 : v))));
      return play("warn");
    }
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
      if (tool === "thruster") {
        // aim at the ship by default if it sits in a straight line
        const d = ship[0] === x ? (ship[1] > y ? 2 : 0) : ship[1] === y ? (ship[0] > x ? 1 : 3) : 1;
        setDirs((ds) => ds.map((r, yy) => r.map((v, xx) => (xx === x && yy === y ? d : v))));
      }
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
    setDirs(makeDirs());
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
      {tunnel && <WarpTunnel duration={1950} />}
      <div
        ref={page}
        style={portalFx ? { transformOrigin: portalFx.origin } : undefined}
        className={`mx-auto max-w-5xl ${lost ? "page-sucked" : emerging ? "page-emerge" : portalFx ? `page-portal-${portalFx.kind}` : ""}`}
      >
        <header className="mb-6 text-center">
          <h1 className="title-glitch font-pixel text-xl text-primary md:text-3xl">PROJECT ESCAPE</h1>
          <p className="mt-2 text-xl text-muted-foreground">Your ship has no brakes. The black hole is hungry. Steer it home.</p>
        </header>

        <p className="goal-line mx-auto mb-4 max-w-2xl text-center text-xl">
          <span className="font-pixel text-sm text-accent">GOAL ▸ </span>Fly the ship into the portal before the black hole takes it.
        </p>
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {LEVELS.map((l, i) => (
            <button key={l.name} onClick={() => loadLevel(i)} className={`pixel-btn ${i === li ? "pixel-btn-active" : ""}`}>
              {i + 1}. {l.name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
          <aside className="pixel-panel float-in order-2 md:order-1">
            <h2 className="font-pixel mb-3 text-sm text-accent">MODULES</h2>
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
            <div className="mb-3 flex w-full justify-between font-pixel text-sm">
              <span className={!sandbox && timeLeft <= 5 ? "timer-danger" : "text-accent"}>{sandbox ? "NO CLOCK" : `T-${Math.max(0, timeLeft)}s`}</span>
              <span className="text-primary">{sandbox ? "¢∞" : `¢${wallet}`}</span>
            </div>
            <div className="board-wrap tactical">
              <span className="hud-tag hud-tl">SECTOR {String(li + 1).padStart(2, "0")}</span>
              <span className="hud-tag hud-tr">{flying ? "IN FLIGHT" : won ? "WARP" : "STANDBY"}</span>
              <canvas
                ref={canvas}
                width={SIZE * TILE}
                height={SIZE * TILE}
                className="pixel-canvas pixel-frame w-[min(88vw,476px)] cursor-crosshair"
                onMouseMove={(e) => (hover.current = cellAt(e))}
                onMouseLeave={() => (hover.current = null)}
                onClick={(e) => place(...cellAt(e))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const [x, y] = cellAt(e);
                  const prev = tool;
                  if (grid[y]?.[x] && grid[y]![x] !== "rock") {
                    const next = grid.map((r) => [...r]);
                    const cur = next[y]![x] as ModType;
                    next[y]![x] = null;
                    if (!sandbox) setWallet((w) => w + refund(cur));
                    setGrid(next); play("remove");
                  }
                  setTool(prev);
                }}
              />
            </div>
            <div className="mt-3 flex w-full gap-2">
              {!flying && !won && (
                <button onClick={launch} className="pixel-btn pixel-btn-active flex-1 font-pixel text-sm">▶ LAUNCH</button>
              )}
              {flying && <p className="flex-1 text-center text-lg text-accent">Ship is moving — you can still place modules.</p>}
              <button onClick={() => loadLevel(li)} className="pixel-btn">Restart</button>
            </div>
            <p className="mt-2 text-center text-lg text-muted-foreground">Yellow dots show the ship’s path · Click a thruster to turn it · Right-click a module to remove it</p>
          </div>

          <aside className="pixel-panel float-in order-3">
            <h2 className="font-pixel mb-2 text-sm text-accent">MISSION</h2>
            <p className="text-xl">{level.brief}</p>
            <h2 className="font-pixel mb-2 mt-4 text-sm text-accent">HOW IT WORKS</h2>
            <ol className="space-y-1 text-lg text-muted-foreground">
              <li>1. Get the ship into the spinning portal.</li>
              <li>2. A thruster next to the ship, lined up with it, pushes the ship away from it. Click a thruster to turn it.</li>
              <li>3. No friction: once moving, the ship glides until it hits something.</li>
              <li>4. When the ship stops, the black hole pulls it down one square at a time.</li>
              <li>5. If it falls into the purple bottom row, it's gone.</li>
              <li>6. Three modules touching the ship at once will overload it.</li>
              {!sandbox && <li>7. Running out of credits (¢) or time also loses the level.</li>}
            </ol>
            {won && li === LEVELS.length - 1 && (
              <div className="mt-4 animate-pulse border-2 border-success p-3 text-center">
                <p className="font-pixel text-sm text-success">ESCAPED!</p>
                <p className="mt-2 text-lg">Build anything you like, or start again from Training.</p>
                <button onClick={() => loadLevel(0)} className="pixel-btn mt-3 w-full">Play again</button>
                {li < LEVELS.length - 1 && (
                  <button onClick={() => loadLevel(li + 1)} className="pixel-btn pixel-btn-active mt-3 w-full">Next mission →</button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
      {won && li < LEVELS.length - 1 && <p className="warp-banner font-pixel">SECTOR CLEAR · WARPING…</p>}
      <footer className="relative mt-10 text-center text-lg text-muted-foreground">Made by Shravan Patil and Anshul Patil</footer>
      {!started && <StartScreen onStart={() => { setStarted(true); setEmerging(true); }} />}
      {lost && <BlackHole reason={LOSS_TEXT[lost]} onRetry={() => { loadLevel(li); setEmerging(true); play("power"); }} />}
      {emerging && <WhiteHole onDone={() => setEmerging(false)} />}
    </main>
  );
}
