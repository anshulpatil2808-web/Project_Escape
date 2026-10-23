import { WarpTunnel } from "@/game/WarpTunnel";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Starfield } from "@/game/Starfield";
import { Button } from "@/components/ui/button";
import { RotateCw, ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from "lucide-react";
import { drawDirectionalCell, drawCell } from "@/game/sprites";
import { DIRS, DIR_NAMES, HORIZON_Y, LEVELS, MODS, SIZE, facesShip, makeDirs, makeGrid, refund, step, type Cell, type ModType, type Vec } from "@/game/engine";
import { StartScreen } from "@/game/StartScreen";
import { play } from "@/game/sound";
import { BlackHole } from "@/game/BlackHole";
import { WhiteHole } from "@/game/WhiteHole";
import { ExitScreen } from "@/game/ExitScreen";
import { UfoCapture } from "@/game/UfoCapture";
import { ARTWORK, drawArtwork } from "@/game/artwork";

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
  if (drawArtwork(c, "thruster", x, y, 16, dir)) return;
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
  const [finished, setFinished] = useState(false);
  const [ufo, setUfo] = useState(false);
  /** highest mission index the player may open; beating a mission unlocks the next */
  const [unlocked, setUnlocked] = useState(0);
  const [wallet, setWallet] = useState(LEVELS[0]!.budget);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0]!.time);
  const [lost, setLost] = useState<Loss | null>(null);
  const [emerging, setEmerging] = useState(false);
  const [dirs, setDirs] = useState<number[][]>(makeDirs);
  const [selected, setSelected] = useState<Vec | null>(null);
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
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
  const impact = useRef<{ x: number; y: number; at: number } | null>(null);
  const popped = useRef(new Map<string, number>());

  const locked = !started || !!lost || emerging || !!portalFx || tunnel || finished || ufo;
  const live = { grid, dirs, ship, vel, level, flying, li, won, tool, locked };
  const queueTransition = (action: () => void, delay: number) => { transitionTimers.current.push(setTimeout(action, delay)); };
  useEffect(() => () => transitionTimers.current.forEach(clearTimeout), []);
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
        setUnlocked((u) => Math.max(u, li + 1));
        warp.current = { at: performance.now(), kind: "out" };
        // ship passes through the portal, then the next level starts on its own
        if (li < LEVELS.length - 1) {
          // 1) page dives into the portal  2) hyperspace tunnel  3) page unfolds from the next start cell
          queueTransition(() => { setPortalFx({ kind: "enter", origin: cellOrigin(level.portal) }); setTunnel(true); }, 650);
          queueTransition(() => {
            loadLevel(li + 1, true);
            setPortalFx({ kind: "hidden", origin: "50% 50%" });
          }, 1350);
          queueTransition(() => {
            setPortalFx({ kind: "exit", origin: cellOrigin(LEVELS[li + 1]?.ship ?? [3, 2]) });
            warp.current = { at: performance.now(), kind: "in" }; play("power");
          }, 1750);
          queueTransition(() => { setPortalFx(null); setTunnel(false); }, 2600);
        } else {
          queueTransition(() => { setPortalFx({ kind: "enter", origin: cellOrigin(level.portal) }); setTunnel(true); }, 650);
          queueTransition(() => { setFinished(true); setTunnel(false); setPortalFx(null); }, 1850);
        }
      }
      else if (r.event === "blackhole") lose("blackhole");
      else if (r.event === "overload") lose("overload");
      else if (r.event === "blocked") {
        play("remove");
        if (vel[0] || vel[1]) impact.current = { x: ship[0] + vel[0], y: ship[1] + vel[1], at: performance.now() };
      }
    }, TICK);
    return () => clearInterval(id);
  }, [flying, lost, won]);

  // the clock runs the whole time a mission is open — planning included
  useEffect(() => {
    if (sandbox || !started || lost || won || finished) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [sandbox, started, lost, won, finished]);
  useEffect(() => {
    if (sandbox || !started || lost || won || finished) return;
    if (timeLeft <= 0) {
      setFlying(false);
      setUfo(true); play("warn");
    }
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
          const cell = grid[y]![x]!;
          if (!cell) continue;
          // placement pop: modules spring in from small
          const born = popped.current.get(`${x},${y}`);
          const age = born ? (performance.now() - born) / 220 : 1;
          const k = age < 1 ? 0.5 + 0.5 * Math.sin(age * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
          c.save();
          if (k !== 1) { c.translate(x * TILE + 8, y * TILE + 8); c.scale(k, k); c.translate(-(x * TILE + 8), -(y * TILE + 8)); }
          if (cell === "thruster") drawThruster(c, x * TILE, y * TILE, dirs[y]![x]!, t + x * 50);
          else if (cell === "shield" || cell === "comms") drawDirectionalCell(c, cell, x * TILE, y * TILE, t + x * 37 + y * 53, dirs[y]?.[x] ?? 1);
          else drawCell(c, cell, x * TILE, y * TILE, t + x * 37 + y * 53, true);
          c.restore();
        }
      // anchor tether: pulsing beam to the ship it is holding
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ax = ship[0] + dx, ay = ship[1] + dy;
        if (grid[ay]?.[ax] !== "shield" || !facesShip(dirs, ax, ay, ship)) continue;
        const on = Math.floor(t / 90) % 2;
        c.fillStyle = on ? "#7ff0ff" : "#2fa8c8";
        for (let i = 2; i < 14; i += 3) c.fillRect(ship[0] * TILE + 8 + dx * i - (dy ? 0 : 0), ship[1] * TILE + 8 + dy * i, 1, 1);
        c.strokeStyle = `rgba(127,240,255,${0.3 + 0.3 * Math.sin(t / 120)})`;
        c.strokeRect(ship[0] * TILE + 2.5, ship[1] * TILE + 2.5, 11, 11);
      }
      // bumper / wall impact shockwave
      const im = impact.current;
      if (im) {
        const a = (performance.now() - im.at) / 350;
        if (a < 1) {
          const r = 2 + a * 9;
          c.strokeStyle = `rgba(255,224,102,${1 - a})`;
          c.strokeRect(Math.round(im.x * TILE + 8 - r) + 0.5, Math.round(im.y * TILE + 8 - r) + 0.5, Math.round(r * 2), Math.round(r * 2));
          if (a < 0.2) { c.fillStyle = "rgba(255,244,208,0.6)"; c.fillRect(im.x * TILE, im.y * TILE, TILE, TILE); }
        } else impact.current = null;
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
      if (!drawArtwork(c, "ship", ox + 1, oy + 1, 14)) {
        c.fillStyle = "#1a2130"; c.fillRect(ox + 4, oy + 4, 8, 8);
        c.fillStyle = "#e8f0ff"; c.fillRect(ox + 5, oy + 5, 6, 6);
        c.fillStyle = "#5ef2ff"; c.fillRect(ox + 7, oy + 6, 2, 2);
        c.fillStyle = "#ff5a5a"; c.fillRect(ox + 5, oy + 10, 1, 1); c.fillRect(ox + 10, oy + 10, 1, 1);
      }
      if (vel[0] || vel[1]) {
        const f = Math.floor(t / 80) % 2;
        c.fillStyle = f ? "#ffb347" : "#fff4d0";
        c.fillRect(ox + 7 - vel[0] * 5, oy + 7 - vel[1] * 5, 2, 2);
        c.fillStyle = "#c46a1a";
        c.fillRect(ox + 7 - vel[0] * (7 + f), oy + 7 - vel[1] * (7 + f), 2, 2);
      }
      c.restore();
      const h = hover.current;
      const { tool: tl } = state.current;
      if (h && tl !== "erase" && !grid[h[1]]?.[h[0]] && h[1] < HORIZON_Y && !(h[0] === ship[0] && h[1] === ship[1])) {
        // ghost preview of what a click will place (thrusters pre-aimed at the ship)
        c.globalAlpha = 0.4 + 0.15 * Math.sin(t / 150);
        const d = ship[0] === h[0] ? (ship[1] > h[1] ? 2 : 0) : ship[1] === h[1] ? (ship[0] > h[0] ? 1 : 3) : 1;
        if (tl === "thruster") drawThruster(c, h[0] * TILE, h[1] * TILE, d, t);
        else drawDirectionalCell(c, tl, h[0] * TILE, h[1] * TILE, t, d);
        c.globalAlpha = 1;
      }
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

  const rotateModule = (cell: Vec, direction?: number) => {
    const [x, y] = cell;
    const current = state.current;
    const module = current.grid[y]?.[x];
    if (current.locked || current.won || !module || module === "rock") return;
    setSelected(cell);
    popped.current.set(`${x},${y}`, performance.now());
    setDirs((d) => d.map((row, yy) => row.map((v, xx) => xx === x && yy === y ? direction ?? (v + 1) % 4 : v)));
    play("warn");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "r" || e.repeat) return;
      const cell = hover.current;
      if (cell) rotateModule(cell);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cellAt = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const b = e.currentTarget.getBoundingClientRect();
    return [Math.floor(((e.clientX - b.left) / b.width) * SIZE), Math.floor(((e.clientY - b.top) / b.height) * SIZE)];
  };

  const place = (x: number, y: number) => {
    if (locked || won || y >= HORIZON_Y) return play("warn");
    const cur = grid[y]?.[x];
    if (cur === "rock" || (x === ship[0] && y === ship[1]) || (x === level.portal[0] && y === level.portal[1])) return play("warn");
    if (cur && tool !== "erase") {
      return rotateModule([x, y]);
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
      popped.current.set(`${x},${y}`, performance.now());
      setSelected([x, y]);
      {
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

  const loadLevel = (i: number, automatic = false) => {
    if (!automatic) {
      transitionTimers.current.forEach(clearTimeout);
      transitionTimers.current = [];
      setPortalFx(null); setTunnel(false);
    }
    const l = LEVELS[i];
    if (!l) return;
    setSelected(null);
    setFinished(false);
    setUfo(false);
    warp.current = null;
    impact.current = null;
    popped.current.clear();
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
    if (locked || won) return;
    setFlying(true);
    play("power");
  };

  return (
    <main className="relative min-h-screen px-3 py-4 text-foreground lg:px-6">
      {tunnel && <WarpTunnel duration={1950} />}
      <div
        ref={page}
        style={portalFx ? { transformOrigin: portalFx.origin } : undefined}
        className={`mx-auto max-w-[1700px] ${lost ? "page-sucked" : emerging ? "page-emerge" : portalFx ? `page-portal-${portalFx.kind}` : ""}`}
      >
        <Starfield />
        <header className="mb-3 text-center">
          <h1 className="title-glitch font-pixel text-xl text-primary md:text-3xl">PROJECT ESCAPE</h1>
          <p className="mt-2 text-xl text-muted-foreground">Your ship has no brakes. The black hole is hungry. Steer it home.</p>
        </header>

        <p className="goal-line mx-auto mb-4 max-w-2xl text-center text-xl">
          <span className="font-pixel text-sm text-accent">GOAL ▸ </span>Fly the ship into the portal before the black hole takes it.
        </p>
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {LEVELS.map((l, i) => (
            <Button variant="pixel" key={l.name} disabled={locked || i > unlocked} onClick={() => loadLevel(i)} className={`pixel-btn ${i === li ? "pixel-btn-active" : ""}`}>
              {i + 1}. {l.name}{i > unlocked ? " · LOCKED" : ""}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] lg:gap-8">
          <aside className="pixel-panel float-in order-2 md:order-1">
            <h2 className="font-pixel mb-3 text-sm text-accent">MODULES</h2>
            <div className="grid gap-2">
              {TYPES.map((t) => (
                <Button variant="pixel" key={t} onClick={() => setTool(t)} className={`pixel-btn flex-col items-stretch text-left ${tool === t ? "pixel-btn-active" : ""}`}>
                  <span className="flex justify-between">
                    <span className="flex items-center gap-2"><img src={ARTWORK[t]} alt="" className="pixel-canvas h-9 w-9 object-contain" />{MODS[t].name}</span>
                    <span className={!sandbox && MODS[t].cost > wallet ? "text-destructive" : "text-accent"}>¢{MODS[t].cost}</span>
                  </span>
                  <span className="block text-lg text-muted-foreground">{MODS[t].desc}</span>
                </Button>
              ))}
              <Button variant="pixel" onClick={() => setTool("erase")} className={`pixel-btn ${tool === "erase" ? "pixel-btn-active" : ""}`}>Remove</Button>
            </div>
            {selected && grid[selected[1]]?.[selected[0]] && grid[selected[1]]?.[selected[0]] !== "rock" && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xl text-primary">{MODS[grid[selected[1]]?.[selected[0]] as ModType]?.name} · {DIR_NAMES[dirs[selected[1]]?.[selected[0]] ?? 1]}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Module direction">
                  {[ArrowUp, ArrowRight, ArrowDown, ArrowLeft].map((Icon, dir) => (
                    <Button key={dir} variant="pixel" size="icon" disabled={locked || won} aria-label={`Face ${DIR_NAMES[dir]?.toLowerCase()}`} title={`Face ${DIR_NAMES[dir]?.toLowerCase()}`} aria-pressed={dirs[selected[1]]?.[selected[0]] === dir} className={dirs[selected[1]]?.[selected[0]] === dir ? "pixel-btn-active" : ""} onClick={() => rotateModule(selected, dir)}><Icon /></Button>
                  ))}
                  <Button variant="pixel" size="icon" disabled={locked || won} aria-label="Rotate selected module" title="Rotate clockwise" onClick={() => rotateModule(selected)}><RotateCw /></Button>
                </div>
              </div>
            )}
          </aside>

          <div className="board-column order-1 flex flex-col items-center md:order-2">
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
                className="pixel-canvas pixel-frame w-[min(92vw,74vh,760px)] cursor-crosshair"
                onMouseMove={(e) => (hover.current = cellAt(e))}
                onMouseLeave={() => (hover.current = null)}
                onClick={(e) => place(...cellAt(e))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (locked || won) return;
                  const [x, y] = cellAt(e);
                  const prev = tool;
                  if (grid[y]?.[x] && grid[y]![x] !== "rock") {
                    const next = grid.map((r) => [...r]);
                    const cur = next[y]![x] as ModType;
                    next[y]![x] = null;
                    if (!sandbox) setWallet((w) => w + refund(cur));
                    setGrid(next); setSelected(null); play("remove");
                  }
                  setTool(prev);
                }}
              />
            </div>
            <div className="mt-3 flex w-full gap-2">
              {!flying && !won && (
                <Button variant="pixel" onClick={launch} className="pixel-btn pixel-btn-active flex-1 font-pixel text-sm">▶ LAUNCH</Button>
              )}
              {flying && <p className="flex-1 text-center text-lg text-accent">Ship is moving — you can still place modules.</p>}
              <Button variant="pixel" disabled={locked} onClick={() => loadLevel(li)} className="pixel-btn">Restart</Button>
            </div>
            <p className="mt-2 text-center text-lg text-muted-foreground">Yellow dots show the ship’s path · Click any module to turn it · Right-click a module to remove it</p>
          </div>

          <aside className="pixel-panel float-in order-3">
            <h2 className="font-pixel mb-2 text-sm text-accent">MISSION</h2>
            <p className="text-xl">{level.brief}</p>
            <h2 className="font-pixel mb-2 mt-4 text-sm text-accent">HOW IT WORKS</h2>
            <ol className="space-y-1 text-xl text-muted-foreground">
              <li>1. Get the ship into the spinning portal.</li>
              <li>2. A thruster next to the ship, lined up with it, pushes the ship away from it. Turn any module to change its active face.</li>
              <li>3. Anchors hold only their facing square. Bumper fronts stop; their backs and sides bounce.</li>
              <li>4. No friction: once moving, the ship glides until it hits something.</li>
              <li>5. When the ship stops, the black hole pulls it down one square at a time.</li>
              <li>6. If it falls into the purple bottom row, it's gone.</li>
              <li>7. Three modules touching the ship at once will overload it.</li>
              {!sandbox && <li>8. Running out of credits (¢) or time also loses the level.</li>}
            </ol>
          </aside>
        </div>
        <footer className="relative mt-10 text-center text-lg text-muted-foreground">Made by Shravan Patil and Anshul Patil</footer>
      </div>
      {won && li < LEVELS.length - 1 && <p className="warp-banner font-pixel">SECTOR CLEAR · WARPING…</p>}
      {!started && <StartScreen onStart={() => { setStarted(true); setEmerging(true); }} />}
      {lost && <BlackHole reason={LOSS_TEXT[lost]} onRetry={() => { loadLevel(li); setEmerging(true); play("power"); }} />}
      {emerging && <WhiteHole onDone={() => setEmerging(false)} />}
      {finished && <ExitScreen onReplay={() => { loadLevel(0); setEmerging(true); }} onExit={() => { loadLevel(0); setStarted(false); }} />}
      {ufo && <UfoCapture onDone={() => { setUfo(false); lose("time"); }} />}
    </main>
  );
}
