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

  // Check
  if (isCheck) {
    return (
      <Badge
        data-testid="game-status"
        variant="outline"
        className="rounded-sm font-medium text-xs border-[#FF3B30] text-[#FF3B30] bg-red-50"
      >
        Check!
      </Badge>
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
