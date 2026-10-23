# Project Escape

**Drift** — a frictionless puzzle. Your ship glides until something stops it, and the black hole below pulls it down one cell at a time the moment it comes to rest. Place and rotate your own modules to steer it into the escape portal.

Made by Shravan Patil and Anshul Patil for Pixathon ("Any puzzle, your rules").

## How it plays

- **Thruster** — pushes an adjacent ship away when aligned on the same axis, with its flame toward or away from the ship.
- **Anchor** — holds the ship only in the adjacent square its glowing face points at.
- **Bumper** — its padded face stops the ship; the other sides reflect it.

Click any placed module to rotate it for free, or use the selected module's arrow controls.

Press **Launch** and the ship drifts. Reach the portal before the black hole eats you.

### You lose when

- the ship falls into the event horizon (the glowing bottom row),
- three modules touch the ship at once,
- you spend your last credits during flight (removing a module restores its full cost),
- or the mission timer runs out.

Losing sucks the whole screen into a pixelated black hole. **Try again** fires a white-hole fission burst and drops you back in.

## Levels

Training → Cold Start → Ricochet → High Orbit → Gravity Well. Completing Gravity Well opens the exit screen, with replay or return-to-launch options. All five missions have tested solutions within their budgets.

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
