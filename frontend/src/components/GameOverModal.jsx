import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const PRODUCT_URL =
  "https://shop.conraddangerfield.com/products/the-king-s-way-tee?variant=50115434512604";
const PRODUCT_IMAGE = "/kings-way-tee.png";
const EMERGENT_URL = "https://app.emergent.sh/register?ref=timo990308";

function getResultText(status) {
  if (status.startsWith("checkmate")) {
    const winner = status.split("_")[1];
    return `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins`;
  }
  if (status === "stalemate") return "Stalemate";
  if (status === "draw_insufficient") return "Draw — insufficient material";
  if (status === "draw_fifty") return "Draw — fifty-move rule";
  if (status === "draw_repetition") return "Draw — threefold repetition";
  return "Game Over";
}

export default function GameOverModal({ gameState, playerColor, onPlayAgain }) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCta(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const result = getResultText(gameState.status);
  const isWinner =
    gameState.status.startsWith("checkmate") &&
    gameState.status.split("_")[1] === playerColor;

  return (
    <div
      data-testid="game-over-modal"
      className="absolute inset-0 z-30 flex items-center justify-center animate-in fade-in-0 duration-300"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-sm" />

      <div
        className="relative z-10 w-[88%] max-w-xs bg-white/95 backdrop-blur-sm border border-border rounded-sm shadow-2xl px-5 py-6 text-center animate-in zoom-in-95 duration-300"
        data-testid="game-over-card"
      >
        {/* 1. Game result */}
        <h2
          className="font-heading text-xl sm:text-2xl font-bold tracking-tighter text-[#0A0A0A]"
          data-testid="game-over-headline"
        >
          {result}
        </h2>

        <div
          className={`mx-auto mt-3 h-0.5 w-10 rounded-full ${
            isWinner
              ? "bg-green-500"
              : gameState.status.startsWith("checkmate")
              ? "bg-[#FF3B30]"
              : "bg-yellow-500"
          }`}
        />

        {/* 2–4. Product CTA — delayed */}
        <div
          className={`mt-4 transition-all duration-500 ${
            showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          data-testid="game-over-cta"
        >
          {/* 2. Contextual text */}
          <p className="text-xs text-muted-foreground mb-3">
            Celebrate like a champion
          </p>

          {/* 3. Product image (clickable) */}
          <a
            href={PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-sm overflow-hidden hover:opacity-90 transition-opacity duration-200"
            data-testid="product-link"
          >
            <img
              src={PRODUCT_IMAGE}
              alt="The King's Way Tee"
              className="w-28 h-auto mx-auto"
              loading="lazy"
            />
          </a>

          {/* 4. Caption */}
          <p className="mt-2 text-[10px] text-muted-foreground">
            The King's Way Tee
          </p>
        </div>

        {/* Play Again */}
        {onPlayAgain && (
          <Button
            data-testid="play-again-button"
            onClick={onPlayAgain}
            className="mt-4 w-full h-9 rounded-sm bg-[#0A0A0A] hover:bg-[#0A0A0A]/90 text-white text-sm font-medium transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Play Again
          </Button>
        )}

        {/* 5. Emergent credit — demoted */}
        <p className="mt-4 text-[9px] text-muted-foreground/60">
          Built in a few hours with{" "}
          <a
            href={EMERGENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            data-testid="emergent-link"
          >
            Emergent
          </a>
        </p>
      </div>
    </div>
  );
}
