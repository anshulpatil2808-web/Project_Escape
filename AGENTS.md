<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Agent rules
- Puzzle rules live as pure functions in src/game/engine.ts (step()) with tests in engine.test.ts; UI only renders and ticks. Why: keeps rules testable and every level provably solvable.
- Black/white hole effects draw on tiny canvases scaled up with image-rendering: pixelated. Why: real pixelation instead of CSS blur.
- Directional module faces share engine predicates with canvas feedback; all placed modules use one rotation control. Why: keeps visual direction consistent with the actual rules.
- Uploaded module artwork is served through asset pointers and loaded lazily for canvas drawing, with procedural fallbacks. Why: avoids browser-only imports during SSR and keeps play usable while images load.
- The final mission transitions to ExitScreen; exiting returns to the launch screen rather than closing a browser tab. Why: browser tabs cannot reliably be closed by game code.
- Screen transitions lock editing/navigation and own cancellable timers; white-hole emergence includes background and footer. Why: avoids stale level changes and disconnected screen fragments.
- Levels are generated/validated by brute-force search over module placements; each test case records a solution and budget equals the cheapest one. Why: guarantees hard levels stay solvable.
