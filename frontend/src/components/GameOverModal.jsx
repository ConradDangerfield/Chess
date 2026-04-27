import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const PRODUCT_URL =
  "https://shop.conraddangerfield.com/products/the-king-s-way-tee?variant=50115434512604";
const PRODUCT_IMAGE = "/kings-way-tee.png";

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

function getCtaText(status, playerColor) {
  if (!status.startsWith("checkmate")) return "Recover in style";
  const winner = status.split("_")[1];
  if (winner === playerColor) return "Celebrate like a champion";
  if (playerColor === "spectator") return "Celebrate like a champion";
  return "That hurt. Recover in style";
}

export default function GameOverModal({ gameState, playerColor, onPlayAgain }) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCta(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const result = getResultText(gameState.status);
  const ctaText = getCtaText(gameState.status, playerColor);
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
        {/* Result */}
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

        {/* Product CTA — delayed */}
        <div
          className={`mt-4 transition-all duration-500 ${
            showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          data-testid="game-over-cta"
        >
          <p className="text-xs text-muted-foreground mb-3">
            {ctaText}
          </p>

          {/* Product image — bigger, hover scale, pointer cursor */}
          <a
            href={PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block cursor-pointer"
            data-testid="product-link"
          >
            <img
              src={PRODUCT_IMAGE}
              alt=""
              className="w-36 h-auto mx-auto rounded-sm transition-transform duration-200 hover:scale-105"
              loading="lazy"
            />
          </a>

          {/* Click hint */}
          <p className="mt-1.5 text-[10px] text-muted-foreground/70">
            Tap to view
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
      </div>
    </div>
  );
}
