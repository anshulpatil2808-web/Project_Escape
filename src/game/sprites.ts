import type { Cell, ModType } from "./engine";
import { drawArtwork } from "./artwork";

// Pixel-art palette (canvas content colors)
const P = {
  hull: "#5b6b82", hullL: "#8a9bb3", hullD: "#2c3647", edge: "#1a2130",
  amber: "#ffb347", amberD: "#c46a1a", cyan: "#5ef2ff", cyanD: "#1d7a9a",
  red: "#ff5a5a", green: "#7dff8a", blue: "#3a6df0", blueL: "#9fc2ff",
  rock: "#5a4a42", rockL: "#8a7365", rockD: "#2e2420", off: "#3a4150",
};

type Ctx = CanvasRenderingContext2D;
/** Facing marker is always on the active side; base art faces upward. */
export function drawDirectionalCell(c: Ctx, cell: ModType, x: number, y: number, t: number, dir: number) {
  if (drawArtwork(c, cell, x, y, 16, dir)) {
    c.save(); c.translate(x + 8, y + 8); c.rotate(dir * Math.PI / 2);
    r(c, -3, -7, 6, 1, cell === "shield" ? P.green : P.amber);
    r(c, -1, -8, 2, 1, P.cyan); c.restore();
    return;
  }
  c.save();
  c.translate(x + 8, y + 8);
  c.rotate(dir * Math.PI / 2);
  drawCell(c, cell, -8, -8, t, true);
  const color = cell === "shield" ? P.green : P.amber;
  r(c, -5, -7, 10, 2, color);
  r(c, -1, -8, 2, 1, P.cyan);
  if (cell === "shield") {
    r(c, -3, -4, 1, 2, color);
    r(c, 2, -4, 1, 2, color);
  }
  c.restore();
}
const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

function base(c: Ctx, x: number, y: number) {
  r(c, x + 1, y + 1, 14, 14, P.edge);
  r(c, x + 2, y + 2, 12, 12, P.hull);
  r(c, x + 2, y + 2, 12, 1, P.hullL);
  r(c, x + 2, y + 13, 12, 1, P.hullD);
  r(c, x + 2, y + 2, 1, 1, P.hullL);
  r(c, x + 13, y + 13, 1, 1, P.edge);
}

export function drawCell(c: Ctx, cell: Cell, x: number, y: number, t: number, on: boolean) {
  if (!cell) return;
  const blink = Math.floor(t / 400) % 2 === 0;
  const f = Math.floor(t / 90);
  if (cell === "rock") {
    if (drawArtwork(c, "rock", x, y, 16)) return;
    const wob = Math.round(Math.sin(t / 900 + x) * 0.6);
    r(c, x + 3, y + 4 + wob, 10, 8, P.rock);
    r(c, x + 4, y + 3 + wob, 7, 1, P.rock);
    r(c, x + 4, y + 4 + wob, 4, 2, P.rockL);
    r(c, x + 9, y + 9 + wob, 2, 2, P.rockD);
    r(c, x + 5, y + 10 + wob, 2, 1, P.rockD);
    r(c, x + 4, y + 12 + wob, 8, 1, P.rockD);
    return;
  }
  const glow = on ? P.cyan : P.off;
  switch (cell) {
    case "reactor": {
      base(c, x, y);
      r(c, x + 4, y + 4, 8, 8, P.hullD);
      const pulse = on ? (Math.sin(t / 150) > 0 ? P.amber : P.amberD) : P.off;
      r(c, x + 5, y + 5, 6, 6, pulse);
      r(c, x + 6, y + 6, 4, 4, on ? "#fff2c4" : P.hullD);
      // orbiting particle
      const a = t / 250;
      const px = Math.round(7.5 + Math.cos(a) * 4), py = Math.round(7.5 + Math.sin(a) * 4);
      if (on) r(c, x + px, y + py, 1, 1, "#ffffff");
      break;
    }
    case "solar": {
      r(c, x + 7, y + 1, 2, 14, P.hullD);
      for (let i = 0; i < 2; i++) {
        const ox = i ? 9 : 1;
        r(c, x + ox, y + 3, 6, 10, P.edge);
        r(c, x + ox + 1, y + 4, 4, 8, P.blue);
        r(c, x + ox + 1, y + 7, 4, 1, P.edge);
        const shine = (f + i * 3) % 12;
        if (shine < 8) r(c, x + ox + 1 + (shine % 4), y + 4 + Math.floor(shine / 2), 1, 1, P.blueL);
      }
      break;
    }
    case "conduit": {
      r(c, x, y + 6, 16, 4, P.edge);
      r(c, x + 6, y, 4, 16, P.edge);
      r(c, x, y + 7, 16, 2, P.hullD);
      r(c, x + 7, y, 2, 16, P.hullD);
      if (on) {
        const p = f % 16;
        r(c, x + p, y + 7, 2, 2, P.cyan);
        r(c, x + 7, y + ((p + 8) % 16), 2, 2, P.cyan);
      }
      r(c, x + 6, y + 6, 4, 4, P.hullL);
      break;
    }
    case "thruster": {
      base(c, x, y);
      r(c, x + 4, y + 3, 8, 6, P.hullD);
      r(c, x + 5, y + 4, 6, 1, glow);
      r(c, x + 3, y + 9, 10, 4, P.edge);
      if (on) {
        const len = 2 + ((f * 7) % 3);
        r(c, x + 5, y + 13, 6, Math.min(len, 3), P.amber);
        r(c, x + 6, y + 13, 4, Math.min(len, 3), "#fff2c4");
        r(c, x + 7, y + 15, 2, 1, P.red);
      }
      break;
    }
    case "shield": {
      base(c, x, y);
      r(c, x + 6, y + 6, 4, 4, on ? P.green : P.off);
      r(c, x + 7, y + 7, 2, 2, on ? "#eaffea" : P.hullD);
      if (on) {
        c.globalAlpha = 0.35 + Math.sin(t / 200) * 0.2;
        r(c, x, y, 16, 1, P.green);
        r(c, x, y + 15, 16, 1, P.green);
        r(c, x, y, 1, 16, P.green);
        r(c, x + 15, y, 1, 16, P.green);
        c.globalAlpha = 1;
      }
      break;
    }
    case "comms": {
      base(c, x, y);
      r(c, x + 7, y + 6, 2, 7, P.hullD);
      r(c, x + 3, y + 4, 10, 2, P.hullL);
      r(c, x + 4, y + 6, 8, 1, P.hullD);
      r(c, x + 7, y + 2, 2, 2, on && blink ? P.red : P.off);
      if (on) {
        const w = (f % 8);
        c.globalAlpha = 1 - w / 8;
        r(c, x + 8 - w, y + 1 - Math.floor(w / 3), 1, 1, P.cyan);
        r(c, x + 8 + w, y + 1 - Math.floor(w / 3), 1, 1, P.cyan);
        c.globalAlpha = 1;
      }
      break;
    }
  }
}
