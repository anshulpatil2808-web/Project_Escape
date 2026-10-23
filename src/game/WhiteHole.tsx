import { useEffect, useRef } from "react";

const W = 192, H = 108;
const HOT = ["#ffffff", "#fff6c8", "#ffe066", "#7df9ff", "#5ef2ff", "#ff9a3c"];
type N = { x: number; y: number; vx: number; vy: number; gen: number; life: number };

/** Pixelated white hole: a nuclear-fission burst that spits the station back out. */
export function WhiteHole({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    const cx = W / 2, cy = H / 2;
    let nuclei: N[] = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return { x: cx, y: cy, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 0.7, gen: 0, life: 10 };
    });
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = Math.max(0, elapsed - 0.35);
      // fade old pixels to transparent so the page shows through as it emerges
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "rgba(0,0,0,0.3)";
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = "source-over";
      if (elapsed < 0.35) {
        c.fillStyle = HOT[3] ?? "#7df9ff";
        for (let i = 0; i < 24; i++) {
          const angle = i / 24 * Math.PI * 2 + elapsed * 8;
          const radius = 16 * (1 - elapsed / 0.35) + 3;
          c.fillRect(Math.round(cx + Math.cos(angle) * radius * 1.6), Math.round(cy + Math.sin(angle) * radius), 1, 1);
        }
        raf = requestAnimationFrame(loop);
        return;
      }
      // core flash then shockwave rings
      const core = Math.max(0, 14 - t * 14);
      for (let y = -core; y <= core; y++) for (let x = -core; x <= core; x++)
        if (Math.hypot(x, y) <= core) { c.fillStyle = HOT[Math.min(2, Math.floor(Math.hypot(x, y) / 5))]!; c.fillRect(Math.round(cx + x * 1.6), Math.round(cy + y), 2, 1); }
      for (let k = 0; k < 2; k++) {
        const r = (t - k * 0.25) * 120;
        if (r <= 0) continue;
        for (let i = 0; i < 120; i++) {
          if ((i + k) % 2) continue;
          const a = (i / 120) * Math.PI * 2;
          c.fillStyle = HOT[3 + k]!;
          c.fillRect(Math.round(cx + Math.cos(a) * r * 1.6), Math.round(cy + Math.sin(a) * r * 0.9), 1, 1);
        }
      }
      // fission: each nucleus splits in two, releasing neutrons
      const next: N[] = [];
      for (const n of nuclei) {
        n.x += n.vx; n.y += n.vy; n.life--;
        c.fillStyle = HOT[Math.min(5, n.gen)]!;
        c.fillRect(Math.round(n.x), Math.round(n.y), n.gen < 2 ? 2 : 1, n.gen < 2 ? 2 : 1);
        if (n.life <= 0 && n.gen < 4) {
          for (const s of [-0.6, 0.6]) {
            const cs = Math.cos(s), sn = Math.sin(s);
            next.push({ x: n.x, y: n.y, vx: (n.vx * cs - n.vy * sn) * 1.15, vy: (n.vx * sn + n.vy * cs) * 1.15, gen: n.gen + 1, life: 8 + Math.random() * 6 });
          }
          c.fillStyle = "#ffffff"; c.fillRect(Math.round(n.x) - 1, Math.round(n.y) - 1, 3, 3);
        } else if (n.x > -5 && n.x < W + 5 && n.y > -5 && n.y < H + 5) next.push(n);
      }
      nuclei = next;
      if (t < 1.55) raf = requestAnimationFrame(loop);
      else onDone();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={W} height={H} className="hole-canvas pointer-events-none" aria-hidden />;
}
