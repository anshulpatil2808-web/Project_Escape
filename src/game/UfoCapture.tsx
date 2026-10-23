import { useEffect, useRef } from "react";
import { drawArtwork } from "./artwork";

/** Time is up: the saucer beams the crew capsule up, then drops it into the void. */
export function UfoCapture({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const c = canvas?.getContext("2d");
    if (!c) return;
    const start = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      c.clearRect(0, 0, 192, 108);
      c.fillStyle = "rgba(4,6,16,0.85)"; c.fillRect(0, 0, 192, 108);
      // drifting stars
      for (let i = 0; i < 26; i++) {
        const sx = (i * 37 + t * (6 + i % 5)) % 192;
        c.fillStyle = i % 3 ? "rgba(232,240,255,0.5)" : "rgba(94,242,255,0.6)";
        c.fillRect(Math.round(sx), (i * 53) % 88, 1, 1);
      }
      const x = reduced ? 96 : Math.min(96, -30 + t * 150);
      const bob = reduced ? 0 : Math.round(Math.sin(t * 3) * 1.5);
      // tractor beam
      if (t > 0.65 && t < 1.9) {
        c.fillStyle = "rgba(125,255,138,0.16)";
        for (let i = 0; i < 22; i++) c.fillRect(Math.round(x - 6 - i / 3), 34 + i, 12 + (i / 1.5), 1);
        c.fillStyle = "rgba(232,255,235,0.5)";
        c.fillRect(Math.round(x - 1), 34, 2, 22);
      }
      // crew capsule: sits, gets pulled up, then released into the void
      let cy = 58;
      if (t > 0.65 && t < 1.9) cy = 58 - Math.min(1, (t - 0.65) / 1.1) * 22;
      else if (t >= 1.9) cy = 36 + Math.pow((t - 1.9) * 30, 2) / 22;
      const tumble = t >= 1.9 ? Math.floor((t - 1.9) * 7) % 4 : 1;
      if (!drawArtwork(c, "ship", x - 8, cy, 16, tumble)) {
        c.fillStyle = "#1a2130"; c.fillRect(x - 5, cy + 3, 10, 10);
        c.fillStyle = "#e8f0ff"; c.fillRect(x - 4, cy + 4, 8, 8);
        c.fillStyle = "#5ef2ff"; c.fillRect(x - 2, cy + 5, 3, 3);
      }
      // saucer
      if (!drawArtwork(c, "ufo", x - 34, 8 + bob, 68)) {
        c.fillStyle = "#5ef2ff"; c.fillRect(x - 7, 24, 14, 5);
        c.fillStyle = "#8a9bb3"; c.fillRect(x - 15, 29, 30, 5);
        c.fillStyle = "#e8f0ff"; c.fillRect(x - 10, 28, 20, 2);
        c.fillStyle = "#ffb347";
        for (let i = -10; i <= 10; i += 5) c.fillRect(x + i, 34, 2, 1);
      }
      // the void
      c.fillStyle = "#07020e"; c.fillRect(0, 95, 192, 13);
      c.fillStyle = "#c040ff";
      for (let i = 0; i < 192; i += 4) c.fillRect(i, 94 + Math.round(Math.sin(i / 8 + t * 4)), 2, 1);
      if (t > 2.6) { c.fillStyle = `rgba(192,64,255,${Math.min(0.5, (t - 2.6) * 0.8)})`; c.fillRect(0, 0, 192, 108); }
      if (t < 3.2) raf = requestAnimationFrame(loop);
      else onDone();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="fixed inset-0 z-[55] pointer-events-none" role="status" aria-label="A UFO lifted the crew capsule and dropped it into the void"><canvas ref={ref} width={192} height={108} className="hole-canvas" /><p className="relative z-[56] mt-10 text-center font-pixel text-sm text-accent">TIME EXPIRED · UFO SALVAGE</p></div>;
}
