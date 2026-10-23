import { useState } from "react";

/** Five pixel aliens hopping on a deck under the board. */
const SHAPES = [
  ["..111..", ".11111.", "1121211", "1111111", ".1.1.1.", ".1...1."],
  [".11111.", "1111111", "1211121", "1111111", "..1.1..", ".11.11."],
  ["..1.1..", ".11111.", "1121211", "1111111", "1.111.1", ".1...1."],
  ["..111..", "1111111", "1212121", ".11111.", "..111..", ".1.1.1."],
  [".11111.", "1111111", "1122211", "1111111", ".11111.", "..1.1.."],
] as const;
const COLORS = ["#7dff8a", "#5ef2ff", "#ff8bd0", "#ffe066", "#a78bff"];

export function AlienDance() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="alien-stage">
      <span aria-hidden />
      <div className="aliens">
        {SHAPES.map((shape, i) => (
          <svg
            key={i}
            viewBox={`0 0 ${shape[0].length} ${shape.length}`}
            width={34}
            height={29}
            aria-hidden
            className={`alien pixel-canvas ${paused ? "alien-still" : ""}`}
            style={{ animationDelay: `${i * 0.13}s` }}
          >
            {shape.flatMap((row, y) =>
              [...row].map((ch, x) =>
                ch === "." ? null : (
                  <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ch === "2" ? "#0b0f1c" : COLORS[i]} />
                ),
              ),
            )}
          </svg>
        ))}
      </div>
      <button
        type="button"
        className="pixel-btn alien-toggle font-pixel"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Play the alien dance" : "Pause the alien dance"}
      >
        {paused ? "▶" : "❚❚"}
      </button>
    </div>
  );
}
