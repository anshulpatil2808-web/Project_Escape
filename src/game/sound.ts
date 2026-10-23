// Retro sounds made in code. When sound files are uploaded, set the URLs here
// and they will play instead of the generated ones.
export const SOUND_FILES: Partial<Record<SoundName, string>> = {};

export type SoundName = "place" | "remove" | "power" | "win" | "warn" | "blackhole";

let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.08, slideTo?: number, delay = 0) {
  const a = ac(), t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur: number, vol = 0.15) {
  const a = ac(), buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf;
  f.type = "lowpass";
  f.frequency.setValueAtTime(2000, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(60, a.currentTime + dur);
  g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

export function play(name: SoundName) {
  try {
    const file = SOUND_FILES[name];
    if (file) return void new Audio(file).play();
    if (name === "place") tone(520, 0.08);
    if (name === "remove") tone(300, 0.1, "square", 0.06, 120);
    if (name === "power") { tone(440, 0.08); tone(660, 0.12, "square", 0.08, undefined, 0.08); }
    if (name === "win") [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, "square", 0.08, undefined, i * 0.1));
    if (name === "warn") tone(880, 0.06, "triangle", 0.05);
    if (name === "blackhole") { tone(400, 2.6, "sawtooth", 0.12, 30); tone(203, 2.6, "square", 0.06, 20); noise(2.8); }
  } catch { /* audio unavailable */ }
}
