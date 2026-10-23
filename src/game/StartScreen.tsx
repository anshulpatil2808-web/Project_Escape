import { useEffect, useRef, useState } from "react";
import { play } from "./sound";
import { drawArtwork } from "./artwork";

const W = 160, H = 120;

/** Pixel-art launch pad. Space / tap / click launches the rocket into the game. */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const launchAt = useRef<number | null>(null);
  const [launching, setLaunching] = useState(false);

  const launch = () => {
    if (launchAt.current !== null) return;
    launchAt.current = performance.now();
    setLaunching(true);
    play("power");
    setTimeout(() => play("blackhole"), 150);
    setTimeout(onStart, 1900);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); launch(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() }));
    const glows = Array.from({ length: 10 }, () => ({ x: Math.random() * W, y: Math.random() * 70, p: Math.random() * 6 }));
    const rocks = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * W, y: 46 + i * 8, v: 0.05 + Math.random() * 0.08, s: 2 + (i % 3) }));
    let hitAt: number | null = null;
    const debris: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
    let comet = { x: -20, y: 0, t: 0 };
    const smoke: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
    let raf = 0;
    const px = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    const loop = (now: number) => {
      const lt = launchAt.current ? (now - launchAt.current) / 1000 : 0;
      const shake = launchAt.current && lt < 1.2 ? Math.round((Math.random() - 0.5) * 2) : 0;
      px(0, 0, W, H, "#06040f");
      // stars streak faster during launch
      for (const s of stars) {
        s.y += 0.02 + s.s * 0.05 + lt * lt * 3 * s.s;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        const len = launchAt.current ? Math.min(8, 1 + lt * 6 * s.s) : 1;
        px(s.x, s.y, 1, len, s.s > 0.7 ? "#ffffff" : s.s > 0.4 ? "#9fc2ff" : "#3a4a70");
      }
      // nebula haze (dithered starry lighting)
      for (let y = 0; y < 70; y += 2) for (let x = (y / 2) % 2 ? 0 : 1; x < W; x += 2) {
        const d = Math.hypot(x - 40, y - 35) / 40;
        const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((y / 2) % 4) * 4 + ((x >> 1) % 4)]! / 16;
        if (d < 1 && bayer > d) px(x, y, 1, 1, d < 0.5 ? "#2a1450" : "#150a2e");
      }
      // twinkling bright stars with cross flares
      for (const g of glows) {
        const tw = (Math.sin(now / 400 + g.p) + 1) / 2;
        px(g.x, g.y, 1, 1, "#ffffff");
        if (tw > 0.4) { px(g.x - 1, g.y, 3, 1, "#cfe0ff"); px(g.x, g.y - 1, 1, 3, "#cfe0ff"); }
        if (tw > 0.8) { px(g.x - 2, g.y, 5, 1, "#6f8fd0"); px(g.x, g.y - 2, 1, 5, "#6f8fd0"); px(g.x, g.y, 1, 1, "#ffffff"); }
      }
      // drifting asteroids
      for (const r of rocks) {
        r.x += r.v; if (r.x > W + 4) r.x = -4;
        if (!drawArtwork(c, "rock", r.x, r.y, r.s + 4)) { px(r.x, r.y, r.s, r.s, "#6b5a4a"); px(r.x, r.y, 1, 1, "#a08870"); }
      }
      // satellite orbiting
      const sa = now / 3000, sx2 = 40 + Math.cos(sa) * 26, sy2 = 22 + Math.sin(sa) * 8;
      px(sx2 - 3, sy2, 2, 1, "#5ef2ff"); px(sx2, sy2 - 1, 2, 3, "#c8d0e0"); px(sx2 + 3, sy2, 2, 1, "#5ef2ff");
      if (Math.floor(now / 500) % 2) px(sx2 + 1, sy2 - 2, 1, 1, "#ff5a5a");
      // occasional comet
      comet.t--; if (comet.t < -400) comet = { x: -10, y: Math.random() * 40, t: 0 };
      if (comet.t > -120) { comet.x += 1.6; comet.y += 0.4; for (let i = 0; i < 8; i++) px(comet.x - i * 1.6, comet.y - i * 0.4, 1, 1, i < 2 ? "#ffffff" : i < 5 ? "#9fe8ff" : "#2a5a80"); }
      // planet & black hole on the horizon
      for (let i = 0; i < 18; i++) { const r = 18 - i; px(128 - r + shake, 30 - Math.round(r * 0.3), r * 2, 1, i % 4 === 0 ? "#c040ff" : "#2a0a3a"); }
      px(124 + shake, 27, 8, 6, "#06040f");
      px(123 + shake, 26, 10, 1, "#5ef2ff");
      // ground pad
      const groundY = 100; // the pad stays put while the ship climbs away from it
      px(0, groundY + shake, W, H, "#1a2130");
      px(0, groundY + shake, W, 1, "#5b6b82");
      px(3 + shake, groundY - 4 + shake, 22, 4, "#2c3647");
      px(6 + shake, groundY - 26 + shake, 2, 22, "#5b6b82"); // tower
      for (let y = 0; y < 22; y += 4) px(6 + shake, groundY - 26 + y + shake, 5, 1, "#5b6b82");

      // rocket
      // asteroid that crosses the launch path and smacks the rocket
      const HIT = 0.7;
      if (launchAt.current && lt > 0.2) {
        const t = lt - 0.2;
        const ax = hitAt === null ? 75 - (t / (HIT - 0.2)) * 61 : 14 - (lt - hitAt) * 70;
        const ay = hitAt === null ? 40 + t * 10 : 45 + (lt - hitAt) * 40;
        if (hitAt === null && lt >= HIT) {
          hitAt = lt; play("remove");
          for (let i = 0; i < 24; i++) debris.push({ x: 15, y: 45, vx: (Math.random() - 0.3) * 3, vy: (Math.random() - 0.5) * 3, l: 42 });
        }
        if (!drawArtwork(c, "rock", ax - 5, ay - 5, 12)) { px(ax - 3, ay - 3, 7, 7, "#5a4838"); px(ax - 2, ay - 4, 5, 9, "#5a4838"); }
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]!; d.x += d.vx; d.y += d.vy; d.vy += 0.05; d.l--;
        px(d.x, d.y, d.l > 30 ? 2 : 1, d.l > 30 ? 2 : 1, d.l > 30 ? "#fff4d0" : d.l > 15 ? "#ffb347" : "#6b5a4a");
        if (d.l <= 0) debris.splice(i, 1);
      }
      // impact: knocked back down, then recovers
      const since = hitAt === null ? -1 : lt - hitAt;
      const bump = since >= 0 ? 14 * Math.exp(-since * 4) * Math.min(1, since * 12) : 0;
      const kickX = since >= 0 && since < 0.3 ? Math.round((Math.random() - 0.5) * 4) : 0;
      if (since >= 0 && since < 0.05) { c.fillStyle = "rgba(255,240,200,0.22)"; c.fillRect(0, 0, W, H); }
      const climb = launchAt.current ? Math.min(52, lt * lt * 45) - bump : Math.sin(now / 600) * 0.5;
      const rx = 11 + shake + kickX - Math.round(bump * 0.3), ry = groundY - 30 - climb + shake;
      // rocket: the uploaded pixel-art fighter (simple silhouette until it loads)
      const RS = 28;
      if (!drawArtwork(c, "rocket", rx + 3 - RS / 2, ry + 11 - RS / 2, RS)) {
        px(rx + 2, ry - 2, 2, 2, "#ff5a5a");
        px(rx + 1, ry, 4, 20, "#e8f0ff");
        px(rx - 1, ry + 12, 2, 8, "#ff5a5a");
        px(rx + 5, ry + 12, 2, 8, "#ff5a5a");
      }
      // impact burst follows the nose
      if (since >= 0 && since < 0.22) {
        const k = 2 + Math.round(since * 26);
        const bx = rx + 3, by = ry - 2;
        px(bx - k, by, k, 1, "#fff4d0");
        px(bx + 1, by, k, 1, "#ffb347");
        px(bx, by - k, 1, k, "#fff4d0");
        px(bx, by + 1, 1, k, "#ffb347");
        px(bx - k - 1, by - k - 1, 2, 2, "#fff4d0");
        px(bx + k, by - k - 1, 2, 2, "#ffb347");
        px(bx - k - 1, by + k, 2, 2, "#ffb347");
        px(bx + k, by + k, 2, 2, "#fff4d0");
      }
      // flame only once the engines fire
      const flame = launchAt.current ? 8 + Math.random() * 10 : 0;
      if (flame > 0) {
        px(rx - 1, ry + 25, 8, flame, "#ffb347");
        px(rx + 1, ry + 25, 4, flame * 0.6, "#fff4d0");
      }
      // smoke clouds
      const rate = launchAt.current ? 6 : 0.3;
      for (let i = 0; i < rate; i++)
        if (Math.random() < rate / 6) smoke.push({ x: rx + 3, y: Math.min(ry + 24 + flame, groundY - 2), vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 0.3, l: 60 });
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i]!;
        s.x += s.vx; s.y += s.vy; s.vx *= 0.97; s.l--;
        const sz = s.l > 40 ? 2 : 3;
        px(s.x, s.y, sz, sz, s.l > 45 ? "#ffd27a" : s.l > 25 ? "#8a9bb3" : "#3a4150");
        if (s.l <= 0) smoke.splice(i, 1);
      }
      // white-out at the end of launch
      if (lt > 1.4) { c.fillStyle = `rgba(255,255,255,${Math.min(1, (lt - 1.4) * 2)})`; c.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="start-screen" onClick={launch} role="button" aria-label="Press space to launch">
      <canvas ref={ref} width={W} height={H} className="hole-canvas" aria-hidden />
      <div className={`start-ui ${launching ? "start-ui-out" : ""}`}>
        <h1 className="title-glitch font-pixel text-3xl text-primary md:text-6xl">PROJECT ESCAPE</h1>
        <div className="start-card">
          <p className="text-2xl text-foreground">Your ship has no brakes. A black hole wants it. Aim thrusters to fly it home.</p>
          <ul className="mx-auto mt-5 space-y-1 text-left text-lg text-muted-foreground">
            <li>▸ Place thrusters, anchors and bumpers on the grid</li>
            <li>▸ Turn any module to choose its active face</li>
            <li>▸ Hit Launch and watch the ship drift</li>
            <li>▸ Reach the portal before the black hole eats you</li>
          </ul>
          <p className="blink font-pixel mt-8 text-sm text-accent md:text-base">
            <span className="hidden md:inline">PRESS SPACE TO LAUNCH</span>
            <span className="md:hidden">TAP TO LAUNCH</span>
          </p>
        </div>
      </div>
      <p className="credit absolute bottom-4 left-0 right-0 z-[52] text-center text-lg text-muted-foreground">Made by Shravan Patil and Anshul Patil</p>
    </div>
  );
}
