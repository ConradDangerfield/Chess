import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, ExternalLink } from "lucide-react";

/**
 * Formats the server status string into a human-readable result.
 */
function getResultText(status, playerColor) {
  if (status.startsWith("checkmate")) {
    const winner = status.split("_")[1];
    const label = winner.charAt(0).toUpperCase() + winner.slice(1);
    return { headline: "Checkmate", detail: `${label} wins` };
  }
  if (status === "stalemate") {
    return { headline: "Stalemate", detail: "The game is a draw" };
  }
  if (status === "draw_insufficient") {
    return { headline: "Draw", detail: "Insufficient material" };
  }
  if (status === "draw_fifty") {
    return { headline: "Draw", detail: "Fifty-move rule" };
  }
  if (status === "draw_repetition") {
    return { headline: "Draw", detail: "Threefold repetition" };
  }
  return { headline: "Game Over", detail: "" };
}

/**
 * Full-board overlay shown when a game ends.
 * Displays result, CTA (delayed 400ms), and Play Again button.
 */
export default function GameOverModal({ gameState, playerColor, onPlayAgain }) {
  const [showCta, setShowCta] = useState(false);

  // Delay CTA text by 400ms after mount for readability
  useEffect(() => {
    const timer = setTimeout(() => setShowCta(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const { headline, detail } = getResultText(gameState.status, playerColor);

  const isWinner =
    gameState.status.startsWith("checkmate") &&
    gameState.status.split("_")[1] === playerColor;

  return (
    <div
      data-testid="game-over-modal"
      className="absolute inset-0 z-30 flex items-center justify-center animate-in fade-in-0 duration-300"
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-sm" />

      {/* Content card */}
      <div
        className="relative z-10 w-[85%] max-w-sm bg-white/95 backdrop-blur-sm border border-border rounded-sm shadow-2xl px-6 py-7 text-center animate-in zoom-in-95 duration-300"
        data-testid="game-over-card"
      >
        {/* Result */}
        <h2
          className="font-heading text-2xl sm:text-3xl font-bold tracking-tighter text-[#0A0A0A]"
          data-testid="game-over-headline"
        >
          {headline}
        </h2>
        {detail && (
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        )}

        {/* Win / loss accent line */}
        <div
          className={`mx-auto mt-4 h-0.5 w-12 rounded-full ${
            isWinner
              ? "bg-green-500"
              : gameState.status.startsWith("checkmate")
              ? "bg-[#FF3B30]"
              : "bg-yellow-500"
          }`}
        />

        {/* CTA — delayed appearance */}
        <div
          className={`mt-5 transition-all duration-500 ${
            showCta
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
          data-testid="game-over-cta"
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            This app was vibe-coded in a few hours.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Want to build your own?{" "}
            <a
              href="https://app.emergent.sh/register?ref=timo990308"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-[#002FA7] hover:underline"
              data-testid="cta-link"
            >
              Start here
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>

        {/* Play Again */}
        {onPlayAgain && (
          <Button
            data-testid="play-again-button"
            onClick={onPlayAgain}
            className="mt-5 w-full h-10 rounded-sm bg-[#0A0A0A] hover:bg-[#0A0A0A]/90 text-white font-medium transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
