import { Badge } from "@/components/ui/badge";

/**
 * Displays the current game status: turn indicator, check, checkmate, or draw.
 */
export default function GameStatus({ gameState, playerColor }) {
  if (!gameState) return null;

  const { status, turn, isGameOver, isCheck } = gameState;

  // Game over states
  if (isGameOver) {
    if (status.startsWith("checkmate")) {
      const winner = status.split("_")[1];
      const isWinner = winner === playerColor;
      return (
        <Badge
          data-testid="game-status"
          variant="outline"
          className={`rounded-sm font-medium text-xs ${
            isWinner
              ? "border-green-600 text-green-700 bg-green-50"
              : "border-[#FF3B30] text-[#FF3B30] bg-red-50"
          }`}
        >
          Checkmate &mdash; {winner.charAt(0).toUpperCase() + winner.slice(1)} wins
        </Badge>
      );
    }
    return (
      <Badge
        data-testid="game-status"
        variant="outline"
        className="rounded-sm font-medium text-xs border-yellow-600 text-yellow-700 bg-yellow-50"
      >
        Draw
      </Badge>
    );
  }

  // Check — show turn AND check together so it's clear whose turn it is
  if (isCheck) {
    const myTurn = turn === playerColor;
    const turnLabel =
      playerColor === "spectator"
        ? `${turn.charAt(0).toUpperCase() + turn.slice(1)}'s turn`
        : myTurn
        ? "Your turn"
        : "Opponent's turn";
    return (
      <div className="flex items-center gap-1.5" data-testid="game-status">
        <Badge
          variant={myTurn && playerColor !== "spectator" ? "default" : "secondary"}
          className={`rounded-sm font-medium text-xs transition-all duration-200 ${
            myTurn && playerColor !== "spectator" ? "bg-[#0A0A0A] text-white" : ""
          }`}
        >
          {turnLabel}
        </Badge>
        <Badge
          data-testid="check-badge"
          variant="outline"
          className="rounded-sm font-semibold text-xs border-[#FF3B30] text-[#FF3B30] bg-red-50 animate-pulse"
        >
          Check!
        </Badge>
      </div>
    );
  }

  // Turn indicator
  if (playerColor === "spectator") {
    return (
      <Badge
        data-testid="game-status"
        variant="secondary"
        className="rounded-sm font-medium text-xs"
      >
        Spectating &mdash; {turn}'s turn
      </Badge>
    );
  }

  const myTurn = turn === playerColor;
  return (
    <Badge
      data-testid="game-status"
      variant={myTurn ? "default" : "secondary"}
      className={`rounded-sm font-medium text-xs transition-all duration-200 ${
        myTurn ? "bg-[#0A0A0A] text-white" : ""
      }`}
    >
      {myTurn ? "Your turn" : "Opponent's turn"}
    </Badge>
  );
}
