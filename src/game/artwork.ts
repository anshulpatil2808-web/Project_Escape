import bumper from "@/assets/bumper.png.asset.json";
import anchor from "@/assets/anchor.png.asset.json";
import asteroid from "@/assets/asteroid.png.asset.json";
import thruster from "@/assets/thruster.png.asset.json";
import rocket from "@/assets/rocket.png.asset.json";
import ship from "@/assets/ship.png.asset.json";
import ufo from "@/assets/ufo.png.asset.json";

export const ARTWORK = { comms: bumper.url, shield: anchor.url, rock: asteroid.url, thruster: thruster.url, rocket: rocket.url, ship: ship.url, ufo: ufo.url };
const images = new Map<string, HTMLImageElement>();

export function drawArtwork(c: CanvasRenderingContext2D, key: keyof typeof ARTWORK, x: number, y: number, size: number, dir?: number) {
  if (typeof Image === "undefined") return false;
  let image = images.get(key);
  if (!image) {
    image = new Image(); image.src = ARTWORK[key]; images.set(key, image);
  }
  if (!image.complete || !image.naturalWidth) return false;
  const scale = (size - 2) / Math.max(image.naturalWidth, image.naturalHeight);
  c.save();
  c.translate(x + size / 2, y + size / 2);
  // Uploaded thruster exhaust faces left; anchor's open clamp faces down.
  if (dir !== undefined) c.rotate((dir - (key === "thruster" ? 3 : key === "shield" ? 2 : 1)) * Math.PI / 2);
  c.imageSmoothingEnabled = false;
  c.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  c.restore();
  return true;
}