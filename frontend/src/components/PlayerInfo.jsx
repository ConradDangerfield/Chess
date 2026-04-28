/**
 * Shows player name, color indicator, and captured pieces above/below the board.
 * position="top" => opponent, position="bottom" => self/same-side
 *
 * Captured display semantics:
 *   - The pieces shown next to a player are the ones THEY have captured from the opponent.
 *   - White's row shows black pieces taken; black's row shows white pieces taken.
 */

const PIECE_UNICODE = {
  p: "\u265F", n: "\u265E", b: "\u265D", r: "\u265C", q: "\u265B", k: "\u265A",
  P: "\u2659", N: "\u2658", B: "\u2657", R: "\u2656", Q: "\u2655", K: "\u2654",
};

function getCapturedPieces(fen) {
  const initial = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1, p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const board = fen.split(" ")[0];
  const current = {};
  for (const ch of board) {
    if (/[pnbrqkPNBRQK]/.test(ch)) {
      current[ch] = (current[ch] || 0) + 1;
    }
  }
  // whiteCaptured = black pieces captured BY white (white player took these)
  // blackCaptured = white pieces captured BY black
  const whiteCaptured = [];
  const blackCaptured = [];
  for (const piece of "qrbnp") {
    const diff = (initial[piece] || 0) - (current[piece] || 0);
    for (let i = 0; i < diff; i++) whiteCaptured.push(piece);
  }
  for (const piece of "QRBNP") {
    const diff = (initial[piece] || 0) - (current[piece] || 0);
    for (let i = 0; i < diff; i++) blackCaptured.push(piece);
  }
  return { whiteCaptured, blackCaptured };
}

export default function PlayerInfo({ gameState, playerColor, position, orientation }) {
  if (!gameState) return null;

  const topColor = orientation === "white" ? "black" : "white";
  const bottomColor = orientation === "white" ? "white" : "black";
  const color = position === "top" ? topColor : bottomColor;

  const player = color === "white" ? gameState.white : gameState.black;
  const isTurn = gameState.turn === color && !gameState.isGameOver;

  const { whiteCaptured, blackCaptured } = getCapturedPieces(gameState.fen);
  const captured = color === "white" ? whiteCaptured : blackCaptured;

  return (
    <div
      className={`flex items-center justify-between gap-3 ${position === "top" ? "mb-2" : "mt-2"}`}
      data-testid={`player-info-${position}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-3 h-3 rounded-sm border flex-shrink-0 ${
            color === "white"
              ? "bg-white border-[#E4E4E7]"
              : "bg-[#262626] border-[#262626]"
          }`}
        />

        <span className="text-sm font-medium truncate">
          {player ? player.username : "Waiting for player..."}
        </span>

        {player && color === playerColor && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex-shrink-0">
            (you)
          </span>
        )}

        {isTurn && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#002FA7] animate-pulse flex-shrink-0" />
        )}
      </div>

      {/* Captured pieces — inline, larger, on the player's own side */}
      {captured.length > 0 && (
        <span
          className="text-2xl leading-none tracking-tight whitespace-nowrap"
          data-testid={`captured-${position}`}
          aria-label={`Captured pieces: ${captured.length}`}
        >
          {captured.map((p, i) => (
            <span key={i} className="opacity-75">
              {PIECE_UNICODE[p]}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
