import { useEffect, useRef } from "react";
import { drawArtwork } from "./artwork";
import type { ModType } from "./engine";

/** The UFO magnetically latches onto a module, then releases it into the void. */
export function UfoCapture({ module, onDone }: { module: ModType | null; onDone: () => void }) {
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
      const x = reduced ? 96 : Math.min(96, -24 + t * 180);
      c.fillStyle = "#5ef2ff"; c.fillRect(x - 7, 24, 14, 5);
      c.fillStyle = "#8a9bb3"; c.fillRect(x - 15, 29, 30, 5);
      c.fillStyle = "#e8f0ff"; c.fillRect(x - 10, 28, 20, 2);
      c.fillStyle = "#ffb347";
      for (let i = -10; i <= 10; i += 5) c.fillRect(x + i, 34, 2, 1);
      if (t > .65 && t < 1.65) {
        c.strokeStyle = "#7dff8a"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(96, 35); c.lineTo(96, 56); c.stroke();
        c.strokeRect(87, 52, 18, 18);
      }
      const y = t < 1.65 ? 54 : 54 + Math.pow((t - 1.65) * 32, 2) / 18;
      if (module) drawArtwork(c, module, 88, y, 16, 1);
      else { c.fillStyle = "#e8f0ff"; c.fillRect(92, y + 3, 8, 8); }
      c.fillStyle = "#07020e"; c.fillRect(0, 95, 192, 13);
      c.fillStyle = "#c040ff";
      for (let i = 0; i < 192; i += 4) c.fillRect(i, 94 + Math.round(Math.sin(i / 8 + t * 4)), 2, 1);
      if (t < 2.8) raf = requestAnimationFrame(loop);
      else onDone();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="fixed inset-0 z-[55] pointer-events-none" role="status" aria-label="UFO captured a module and dropped it into the void"><canvas ref={ref} width={192} height={108} className="hole-canvas" /><p className="relative z-[56] mt-10 text-center font-pixel text-sm text-accent">TIME EXPIRED · UFO SALVAGE</p></div>;
}