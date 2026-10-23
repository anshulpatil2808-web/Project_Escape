import { useEffect, useRef } from "react";

const W = 160, H = 90;

/** Pixel hyperspace tunnel shown while the page travels from one portal to the next. */
export function WarpTunnel({ duration = 1300 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = ref.current;
    const c = element?.getContext("2d");
    if (!element || !c) return;
    const stars = Array.from({ length: 140 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 6, v: 0.6 + Math.random() * 2.4 }));
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - t0) / duration;
      // fade in quickly, hold, fade out
      const alpha = Math.max(0, Math.min(1, t * 6, (1 - t) * 4));
      c.globalAlpha = 1;
      c.fillStyle = "rgba(4,6,20,0.35)";
      c.fillRect(0, 0, W, H);
      // tunnel rings
      for (let i = 0; i < 6; i++) {
        const rr = ((now / 6 + i * 18) % 108);
        c.strokeStyle = i % 2 ? "#1d5c8a" : "#3a1d6e";
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(W / 2, H / 2, rr, rr * 0.6, 0, 0, Math.PI * 2); c.stroke();
      }
      for (const s of stars) {
        const r0 = s.r, r1 = s.r + s.v * 3;
        s.r += s.v * (1 + t * 2);
        if (s.r > 100) { s.r = Math.random() * 4; s.a = Math.random() * Math.PI * 2; }
        c.strokeStyle = s.v > 2.2 ? "#ffffff" : s.v > 1.4 ? "#7ff0ff" : "#c070ff";
        c.beginPath();
        c.moveTo(Math.round(W / 2 + Math.cos(s.a) * r0), Math.round(H / 2 + Math.sin(s.a) * r0 * 0.6));
        c.lineTo(Math.round(W / 2 + Math.cos(s.a) * r1), Math.round(H / 2 + Math.sin(s.a) * r1 * 0.6));
        c.stroke();
      }
      // bright core
      c.fillStyle = "#e8fbff"; c.fillRect(W / 2 - 2, H / 2 - 1, 4, 2);
      element.style.opacity = String(alpha);
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return <canvas ref={ref} width={W} height={H} className="hole-canvas pointer-events-none" aria-hidden />;
}
