import { useEffect, useRef } from "react";

const W = 320, H = 180;

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: 1 + Math.floor(Math.random() * 3),
    }));
    const rocks = Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 2 + Math.random() * 3, v: 0.1 + Math.random() * 0.2 }));
    let shoot = { x: -50, y: 0, life: 0 };
    let raf = 0;
    const loop = (t: number) => {
      c.fillStyle = "#070914";
      c.fillRect(0, 0, W, H);
      // nebula bands
      for (let i = 0; i < 6; i++) {
        c.fillStyle = `rgba(${40 + i * 10},${30 + i * 6},${90 + i * 8},0.06)`;
        c.fillRect(0, 40 + i * 8 + Math.sin(t / 3000 + i) * 4, W, 10);
      }
      for (const s of stars) {
        s.x -= s.z * 0.08;
        if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
        const tw = Math.sin(t / 300 + s.y) > 0.8;
        c.fillStyle = s.z === 3 ? (tw ? "#ffffff" : "#cfe3ff") : s.z === 2 ? "#7f93c0" : "#3d4870";
        c.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
      }
      // planet, pixel-banded
      const cx = 270, cy = 150, R = 55;
      const rot = t / 4000;
      for (let y = -R; y <= R; y += 2)
        for (let x = -R; x <= R; x += 2) {
          if (x * x + y * y > R * R) continue;
          const light = (-x - y) / (R * 1.4);
          const band = Math.sin(y / 6 + Math.sin(x / 14 + rot) * 0.8);
          const v = Math.max(0, Math.min(1, 0.45 + light * 0.5 + band * 0.08));
          const step = Math.floor(v * 5) / 5;
          c.fillStyle = `rgb(${Math.floor(60 + step * 190)},${Math.floor(30 + step * 110)},${Math.floor(50 + step * 60)})`;
          c.fillRect(cx + x, cy + y, 2, 2);
        }
      for (const a of rocks) {
        a.x -= a.v;
        if (a.x < -6) { a.x = W + 6; a.y = Math.random() * H; }
        c.fillStyle = "#4a3c36";
        c.fillRect(Math.floor(a.x), Math.floor(a.y), Math.ceil(a.s), Math.ceil(a.s));
        c.fillStyle = "#7a665a";
        c.fillRect(Math.floor(a.x), Math.floor(a.y), 1, 1);
      }
      if (shoot.life <= 0 && Math.random() < 0.004) shoot = { x: Math.random() * W, y: Math.random() * 60, life: 40 };
      if (shoot.life > 0) {
        shoot.life--; shoot.x -= 3; shoot.y += 1;
        for (let i = 0; i < 6; i++) {
          c.fillStyle = `rgba(255,255,255,${1 - i / 6})`;
          c.fillRect(Math.floor(shoot.x + i * 3), Math.floor(shoot.y - i), 1, 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={W} height={H} className="pixel-canvas fixed inset-0 -z-10 h-full w-full object-cover" />;
}
