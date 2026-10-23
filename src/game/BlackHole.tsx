import { useEffect, useRef } from "react";

const W = 192, H = 108;
// Palette in the game's colours (canvas pixels need literal values)
const DISK = ["#2a0a3a", "#6a1a8a", "#c040ff", "#ff6ad5", "#ffd27a", "#fff4d0"];
const DEBRIS = ["#5ef2ff", "#ffb347", "#8aa0ff", "#ffffff", "#7dff9a"];

type P = { r: number; a: number; v: number; c: string; s: number };

/** Low-res, truly pixelated black hole that swallows everything. */
export function BlackHole({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    const cx = W / 2, cy = H / 2;
    // debris = the station and page being torn apart
    const parts: P[] = Array.from({ length: 700 }, () => ({
      r: 20 + Math.random() * 120,
      a: Math.random() * Math.PI * 2,
      v: 0.2 + Math.random() * 0.6,
      c: DEBRIS[Math.floor(Math.random() * DEBRIS.length)]!,
      s: Math.random() < 0.15 ? 2 : 1,
    }));
    const start = performance.now();
    let raf = 0;
    const px = (x: number, y: number, col: string, s = 1) => {
      c.fillStyle = col;
      c.fillRect(Math.round(x), Math.round(y), s, s);
    };
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const grow = Math.min(1, t / 2.2);
      const hr = 4 + grow * 14; // event horizon radius
      // fading trails for motion smear
      c.fillStyle = `rgba(4,2,10,${t < 2.4 ? 0.25 : 0.5})`;
      c.fillRect(0, 0, W, H);

      // accretion disk: dithered rings, flattened for a tilted view
      for (let ring = 0; ring < 14; ring++) {
        const rr = hr * 1.5 + ring * 2.2 * grow;
        const n = 60 + ring * 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + t * (3 - ring * 0.15);
          if ((i + ring + Math.floor(t * 12)) % 3 === 0) continue; // dither
          const x = cx + Math.cos(a) * rr * 1.9;
          const y = cy + Math.sin(a) * rr * 0.45;
          // hide the back half behind the hole
          if (Math.sin(a) < 0 && Math.hypot((x - cx) / 1.0, (y - cy) * 2.2) < hr * 1.1) continue;
          const doppler = Math.cos(a) > 0 ? 1 : 0; // approaching side brighter
          px(x, y, DISK[Math.max(0, Math.min(5, 5 - Math.floor(ring / 3) + doppler - 1))]!);
        }
      }
      // lensed arc over the top (gravity bends the far disk)
      for (let i = 0; i < 80; i++) {
        const a = Math.PI + (i / 80) * Math.PI;
        if ((i + Math.floor(t * 20)) % 2) continue;
        px(cx + Math.cos(a) * hr * 1.35, cy + Math.sin(a) * hr * 1.25, DISK[3 + (i % 3)]!);
      }

      // debris spirals in, stretched (spaghettified) near the hole
      for (const p of parts) {
        const pull = 1 + 40 / Math.max(p.r, 1);
        p.a += 0.02 * p.v * pull;
        p.r -= (0.15 + grow * 0.9) * p.v * pull * 0.6;
        if (p.r < hr) {
          p.r = 90 + Math.random() * 60;
          p.a = Math.random() * Math.PI * 2;
        }
        const x = cx + Math.cos(p.a) * p.r * 1.6, y = cy + Math.sin(p.a) * p.r * 0.8;
        px(x, y, p.c, p.s);
        if (p.r < hr * 3) {
          const x2 = cx + Math.cos(p.a - 0.08) * p.r * 1.6, y2 = cy + Math.sin(p.a - 0.08) * p.r * 0.8;
          px(x2, y2, p.c);
        }
      }

      // the horizon itself, with a 1px photon ring
      for (let y = -hr - 1; y <= hr + 1; y++)
        for (let x = -hr - 1; x <= hr + 1; x++) {
          const d = Math.hypot(x, y);
          if (d <= hr) px(cx + x, cy + y, "#000000");
          else if (d <= hr + 1.2 && (Math.floor(x + y + t * 30) & 1)) px(cx + x, cy + y, "#ffe9b0");
        }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <canvas ref={ref} width={W} height={H} className="hole-canvas hole-in" aria-hidden />
      <div className="hole-ui" role="alertdialog" aria-label="Lost to the black hole">
        <div className="hole-text">
          <p className="font-pixel text-lg text-hole-glow md:text-2xl">SPAGHETTIFIED</p>
          <p className="mt-3 text-2xl text-foreground">{reason} The black hole took your station.</p>
          <button onClick={onRetry} className="pixel-btn pixel-btn-active mt-5">Try again</button>
        </div>
      </div>
    </>
  );
}
