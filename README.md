# Project Escape

**Drift** — a frictionless puzzle. Your ship glides until something stops it, and the black hole below pulls it down one cell at a time the moment it comes to rest. Place and rotate your own modules to steer it into the escape portal.

Made by Shravan Patil and Anshul Patil for Pixathon ("Any puzzle, your rules").

## How it plays

- **Thruster** — pushes the ship away along its flame. Click a placed thruster to rotate it a quarter turn, free of charge.
- **Anchor** — holds the ship still while it sits next to it.
- **Bumper** — stops the ship dead on contact.

Press **Launch** and the ship drifts. Reach the portal before the black hole eats you.

### You lose when

- the ship falls into the event horizon (the glowing bottom row),
- three modules touch the ship at once,
- you run out of credits (removing a module only refunds half),
- or the mission timer runs out.

Losing sucks the whole screen into a pixelated black hole. **Try again** fires a white-hole fission burst and drops you back in.

## Levels

Training → Cold Start → Ricochet → High Orbit → Gravity Well, plus a Free Drift sandbox. Every level is generated and validated by brute-force search over module placements, so each budget equals the cheapest solution that exists and no level is unsolvable.

## Run it locally

```sh
git clone <this-repository-url>
cd project-escape
npm i
npm run dev
```

## Development notes

- Puzzle rules are pure functions in `src/game/engine.ts` (`step()`), covered by `src/game/engine.test.ts` (`bunx vitest run`).
- The UI only renders and ticks — it never contains rules.
- Black/white hole effects draw on tiny canvases scaled up with `image-rendering: pixelated` for real pixelation.

Built with [Lovable](https://lovable.dev).
