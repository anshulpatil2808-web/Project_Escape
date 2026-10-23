import { useEffect, useRef, useState } from "react";
import { play } from "./sound";

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
    const rocks = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * W, y: 10 + i * 14, v: 0.05 + Math.random() * 0.08, s: 2 + (i % 3) }));
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
        if (d < 1 && Math.random() > d) px(x, y, 1, 1, d < 0.5 ? "#2a1450" : "#150a2e");
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
        px(r.x, r.y, r.s, r.s, "#6b5a4a"); px(r.x, r.y, 1, 1, "#a08870");
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
      px(122 + shake, 26, 12, 8, "#000000");
      // ground pad
      const groundY = 100 + Math.min(40, lt * lt * 18); // ground drops away as we climb
      px(0, groundY + shake, W, H, "#1a2130");
      px(0, groundY + shake, W, 1, "#5b6b82");
      px(66 + shake, groundY - 4 + shake, 28, 4, "#2c3647");
      px(70 + shake, groundY - 30 + shake, 2, 26, "#5b6b82"); // tower
      for (let y = 0; y < 26; y += 4) px(70 + shake, groundY - 30 + y + shake, 6, 1, "#5b6b82");

      // rocket
      const climb = launchAt.current ? lt * lt * 70 : Math.sin(now / 600) * 0.5;
      const rx = 78 + shake, ry = groundY - 34 - climb + shake;
      px(rx, ry, 6, 26, "#e8f0ff");
      px(rx + 1, ry - 4, 4, 4, "#e8f0ff");
      px(rx + 2, ry - 6, 2, 2, "#ff5a5a");
      px(rx + 2, ry + 6, 2, 3, "#5ef2ff");
      px(rx - 3, ry + 18, 3, 8, "#ff5a5a");
      px(rx + 6, ry + 18, 3, 8, "#ff5a5a");
      px(rx, ry + 12, 6, 1, "#8a9bb3");
      const flame = launchAt.current ? 10 + Math.random() * 10 : 2 + Math.random() * 2;
      px(rx + 1, ry + 26, 4, flame, "#ffb347");
      px(rx + 2, ry + 26, 2, flame * 0.6, "#fff4d0");
      // smoke clouds
      const rate = launchAt.current ? 6 : 0.3;
      for (let i = 0; i < rate; i++)
        if (Math.random() < rate / 6) smoke.push({ x: rx + 3, y: Math.min(ry + 26 + flame, groundY - 2), vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 0.3, l: 60 });
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
        <p className="mt-4 max-w-md text-2xl text-foreground">Your ship has no brakes. A black hole wants it. Aim thrusters to fly it home.</p>
        <ul className="mx-auto mt-5 max-w-md space-y-1 text-left text-lg text-muted-foreground">
          <li>▸ Place thrusters, anchors and bumpers on the grid</li>
          <li>▸ Click a thruster to rotate it — line it up with the ship</li>
          <li>▸ Hit Launch and watch the ship drift</li>
          <li>▸ Reach the portal before the black hole eats you</li>
        </ul>
        <p className="blink font-pixel mt-8 text-sm text-accent md:text-base">
          <span className="hidden md:inline">PRESS SPACE TO LAUNCH</span>
          <span className="md:hidden">TAP TO LAUNCH</span>
        </p>
      </div>
      <p className="credit absolute bottom-4 left-0 right-0 z-[52] text-center text-lg text-muted-foreground">Made by Shravan Patil and Anshul Patil</p>
    </div>
  );
}
