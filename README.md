# Project Escape 🚀

A space puzzle game where you guide a drifting spaceship to an escape portal.

## 🎮 Play the Game

**[▶ Play Project Escape](https://projectescape.lovable.app)**

Play in your browser—no installation required.

## How to Play

1. Place modules on the board to guide the ship.
2. Click a module or use the arrow controls to rotate it. Rotating is free.
3. Press **Launch**. The ship keeps moving until a module stops or changes its direction.
4. Reach the portal before time or credits run out.

## Modules

- **Thruster:** Pushes a nearby ship when correctly aligned.
- **Anchor:** Holds the ship in the square its glowing face points toward.
- **Bumper:** Stops the ship on its padded side and reflects it from the other sides.

## How You Lose

The mission fails if:

- The ship reaches the glowing bottom row (the event horizon).
- Three modules touch the ship at once.
- You run out of credits during flight.
- The timer reaches zero.

Removing a module restores its full cost. After a failed mission, select **Try again** to restart.

## Levels

Play through five missions:

1. Training
2. Cold Start
3. Ricochet
4. High Orbit
5. Gravity Well

Finish **Gravity Well** to unlock the exit screen, where you can replay or return to the launch screen. Every level has a tested solution within its credit budget.

## Run the Game Locally

You’ll need Node.js and npm.

```bash
git clone https://github.com/anshulpatil2808-web/Project_Escape.git
cd Project_Escape
npm install
npm run dev
```

## For Developers

- Game rules: `src/game/engine.ts`
- Engine tests: `src/game/engine.test.ts`
- Run tests: `bunx vitest run`
- Visual effects use small canvases scaled up for a pixelated look.

## Credits

Created by **Shravan Patil and Anshul Patil** for **Pixathon**, with the theme *“Any puzzle, your rules.”*

Built with [Lovable](https://lovable.dev).
