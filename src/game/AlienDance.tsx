import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Decorative pixel crew, separate from the puzzle and its simulation. */
export function AlienDance() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`alien-stage ${paused ? "alien-stage-paused" : ""}`}>
      <Button variant="ghost" size="icon" className="alien-motion text-muted-foreground" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Resume alien dancing" : "Pause alien dancing"} title={paused ? "Resume alien dancing" : "Pause alien dancing"}>
        {paused ? <Play /> : <Pause />}
      </Button>
      <div className="alien-crew" role="img" aria-label="Five pixel aliens dancing on a space station deck">
        {[0, 1, 2, 3, 4].map((alien) => (
          <svg key={alien} className={`dancing-alien alien-${alien}`} viewBox="0 0 32 40" shapeRendering="crispEdges" aria-hidden="true">
            <g className="alien-body" fill="currentColor">
              <path d="M9 4h2v5H9zM21 4h2v5h-2zM7 2h6v3H7zM19 2h6v3h-6zM9 9h14v2h3v12h-3v2H9v-2H6V11h3z" />
              <path className="alien-eyes" fill="var(--background)" d="M10 14h4v5h-4zM19 14h4v5h-4z" />
              <path fill="var(--foreground)" d="M11 14h2v2h-2zM20 14h2v2h-2z" />
              <path fill="var(--background)" d="M14 21h5v2h-5z" />
              <path d="M11 25h10v7H11z" />
              <path fill="var(--primary-foreground)" d="M11 29h10v2H11z" />
              <g className="alien-arm-left"><path d="M7 25h4v3H7zM4 22h3v5H4zM2 19h4v3H2z" /></g>
              <g className="alien-arm-right"><path d="M21 25h4v3h-4zM25 22h3v5h-3zM26 19h4v3h-4z" /></g>
              <path className="alien-leg-left" d="M11 32h4v4h-2v2H8v-3h3z" />
              <path className="alien-leg-right" d="M18 32h3v3h3v3h-5v-2h-1z" />
            </g>
          </svg>
        ))}
      </div>
      <div className="alien-deck" aria-hidden="true" />
    </div>
  );
}