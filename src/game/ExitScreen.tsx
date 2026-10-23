import { Button } from "@/components/ui/button";
import { RotateCcw, LogOut } from "lucide-react";
import { Starfield } from "./Starfield";
import { ARTWORK } from "./artwork";

export function ExitScreen({ onReplay, onExit }: { onReplay: () => void; onExit: () => void }) {
  return (
    <section className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-center" aria-label="Escape complete">
      <Starfield />
      <div className="relative flex max-w-lg flex-col items-center gap-6">
        <p className="font-pixel text-xs text-accent">GRAVITY WELL CLEARED</p>
        <h1 className="font-pixel text-2xl text-primary md:text-4xl">PROJECT ESCAPE</h1>
        <div className="exit-orbit flex h-28 items-center justify-center gap-5" aria-hidden="true">
          <img src={ARTWORK.thruster} className="pixel-canvas h-16 w-16 object-contain" alt="" />
          <span className="exit-portal" />
        </div>
        <h2 className="font-pixel text-xl text-success">ESCAPED!</h2>
        <p className="text-2xl text-foreground">Five sectors behind you. The ship is home.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="pixel" onClick={onReplay}><RotateCcw />Play again</Button>
          <Button variant="pixel" onClick={onExit}><LogOut />Exit to launch</Button>
        </div>
      </div>
      <p className="absolute bottom-6 px-4 text-lg text-muted-foreground">Made by Shravan Patil and Anshul Patil</p>
    </section>
  );
}