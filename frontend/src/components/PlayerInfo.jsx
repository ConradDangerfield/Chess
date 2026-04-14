/**
 * Shows player name and color indicator above/below the board.
 * position="top" => opponent, position="bottom" => self/same-side
 */
export default function PlayerInfo({ gameState, playerColor, position, orientation }) {
  if (!gameState) return null;

  // Determine which color sits at top vs bottom based on board orientation
  const topColor = orientation === "white" ? "black" : "white";
  const bottomColor = orientation === "white" ? "white" : "black";
  const color = position === "top" ? topColor : bottomColor;

  const player = color === "white" ? gameState.white : gameState.black;
  const isTurn = gameState.turn === color && !gameState.isGameOver;

  return (
    <div
      className={`flex items-center gap-2 ${position === "top" ? "mb-2" : "mt-2"}`}
      data-testid={`player-info-${position}`}
    >
      {/* Color indicator */}
      <div
        className={`w-3 h-3 rounded-sm border ${
          color === "white"
            ? "bg-white border-[#E4E4E7]"
            : "bg-[#262626] border-[#262626]"
        }`}
      />

      <span className="text-sm font-medium truncate">
        {player ? player.username : "Waiting for player..."}
      </span>

      {player && color === playerColor && (
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          (you)
        </span>
      )}

      {isTurn && (
        <div className="w-1.5 h-1.5 rounded-full bg-[#002FA7] animate-pulse" />
      )}
    </div>
  );
}
