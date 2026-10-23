# Project Escape

**Project Escape** is a space-themed puzzle game built around **Drift**, a simple rule with a strategic twist: once launched, your ship keeps gliding until an object stops it. When the ship comes to rest, a black hole below pulls it one cell closer. Your goal is to place and rotate modules so the ship reaches the escape portal before time, credits, or the ship itself runs out.

Created by **Shravan Patil and Anshul Patil** for **Pixathon**, under the theme *“Any puzzle, your rules.”*

## Gameplay at a glance

1. **Plan your route.** Place modules on the board to shape how the ship will move.
2. **Set their direction.** Click a placed module to rotate it, or use the selected module’s arrow controls. Rotation is free.
3. **Launch the ship.** The ship drifts until a module changes or stops its movement.
4. **Reach the portal.** Navigate the level while managing your credits and the mission timer.

### Modules

- **Thruster** — pushes an adjacent ship away when both are aligned on the same axis and the flame points toward or away from the ship.
- **Anchor** — holds the ship only in the adjacent square toward which its glowing face points.
- **Bumper** — stops the ship on its padded face and reflects it when it hits another side.

### Lose conditions

A mission ends in failure if any of these happens:

- The ship falls into the event horizon, represented by the glowing bottom row.
- Three modules touch the ship at the same time.
- You run out of credits during flight. Removing a module restores its full cost.
- The mission timer reaches zero.

When a mission fails, the screen collapses into a pixelated black hole. Select **Try again** to trigger a white-hole-style restart effect and return to the mission.

## Levels

Progress through five missions, each designed to introduce or test different movement challenges:

1. **Training**
2. **Cold Start**
3. **Ricochet**
4. **High Orbit**
5. **Gravity Well**

Completing **Gravity Well** unlocks the exit screen, where you can replay or return to the launch screen. Each mission has a tested solution that fits within its credit budget.

## Run locally

You’ll need Node.js and npm installed.

```sh
git clone https://github.com/anshulpatil2808-web/Project_Escape.git
cd Project_Escape
npm install
npm run dev
```

## Development

The game separates its rules from its interface:

- Core puzzle logic lives in `src/game/engine.ts`, in the `step()` function.
- Engine tests live in `src/game/engine.test.ts` and can be run with `bunx vitest run`.
- The UI renders the game and advances its ticks; game rules are kept out of the UI.
- Black-hole and white-hole effects are drawn on small canvases and scaled with `image-rendering: pixelated` for a crisp pixel-art look.

## Built with

- [Lovable](https://lovable.dev)

---

Have fun plotting your escape among the stars! 🚀
