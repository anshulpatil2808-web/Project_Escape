# Project Escape 🚀

**A space-themed strategy puzzle game where every move matters.**

Built by **Shravan Patil and Anshul Patil** for **Pixathon**, inspired by the theme *“Any puzzle, your rules.”*

## Overview

Your spaceship follows one key rule: **Drift**. Once launched, it continues moving until something stops or redirects it. When it stops, the black hole below pulls it one cell closer.

Place and rotate modules to guide your ship into the escape portal before your time, credits, or ship runs out.

## Quick start

**Requirements:** Node.js and npm.

```bash
git clone https://github.com/anshulpatil2808-web/Project_Escape.git
cd Project_Escape
npm install
npm run dev
```

Open the local URL displayed in your terminal.

## How to play

1. **Plan:** Place modules on the board to create a route.
2. **Rotate:** Click a placed module or use its arrow controls. Rotation is free.
3. **Launch:** The ship drifts until a module stops or redirects it.
4. **Escape:** Reach the portal while managing credits and the timer.

### Modules

| Module | Behavior |
| --- | --- |
| **Thruster** | Pushes an adjacent ship away when aligned on the same axis and its flame points toward or away from the ship. |
| **Anchor** | Holds the ship only in the adjacent square faced by its glowing side. |
| **Bumper** | Stops the ship on its padded face and reflects it when hit from another side. |

### Mission failure

A mission fails when:

- The ship enters the glowing bottom row (the event horizon).
- Three modules touch the ship simultaneously.
- Credits run out during flight. Removing a module refunds its full cost.
- The mission timer reaches zero.

After failure, the screen collapses into a pixelated black hole. Select **Try again** to restart with a white-hole-style transition.

## Missions

There are five missions, in order:

1. **Training**
2. **Cold Start**
3. **Ricochet**
4. **High Orbit**
5. **Gravity Well**

Finishing **Gravity Well** opens the exit screen, where you can replay or return to the launch screen. Each mission has a tested solution within its credit budget.

## Project guide

| Location | Purpose |
| --- | --- |
| `src/game/engine.ts` | Core puzzle rules, including `step()`. |
| `src/game/engine.test.ts` | Automated game-engine and level-solution tests. |
| `src/` | Game application and interface source. |
| `public/` | Publicly served assets. |
| `roadmap.md` | Feature checklist and pending work. |
| `AGENTS.md` | Project architecture rules and Lovable integration notes. |
| `package.json` | Dependencies and development commands. |

### Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build. |
| `npm run preview` | Preview a production build. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest tests. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run format` | Apply the configured Prettier formatting. |

### Architecture notes

- The puzzle engine owns the rules; the UI renders state and advances ticks.
- Black-hole and white-hole effects use small canvases scaled with `image-rendering: pixelated` for crisp pixel art.
- Module direction and rotation are designed to match the game-engine rules.
- See [AGENTS.md](AGENTS.md) for important implementation constraints and [roadmap.md](roadmap.md) for the feature checklist.

## Technology

The project uses React, TypeScript, Vite, Vitest, and [Lovable](https://lovable.dev), among other dependencies listed in [package.json](package.json).

## Credits

Created by **Shravan Patil and Anshul Patil** for **Pixathon**.

---

*Plan your route. Launch your ship. Escape the gravity well.*
