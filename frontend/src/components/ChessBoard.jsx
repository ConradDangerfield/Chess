import { useState, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

/**
 * ChessBoard wrapper with legal move highlighting and last-move highlight.
 * All move validation is server-authoritative — this component only does
 * client-side pre-validation for UX (legal move dots, snap-back).
 */
export default function ChessBoard({
  fen,
  orientation,
  onMove,
  lastMove,
  isMyTurn,
  playerColor,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);

  // Sync a local chess.js instance to the current FEN for legal-move lookups
  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Build custom square styles (last move highlight + legal move dots)
  const customSquareStyles = useMemo(() => {
    const styles = {};

    // Highlight last move
    if (lastMove) {
      const hl = { backgroundColor: "rgba(254, 240, 138, 0.5)" };
      styles[lastMove.from] = hl;
      styles[lastMove.to] = hl;
    }

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: "rgba(0, 47, 167, 0.25)",
      };
    }

    // Legal move dots / capture rings
    legalMoves.forEach((m) => {
      const occupied = game.get(m.to);
      if (occupied) {
        styles[m.to] = {
          ...styles[m.to],
          background:
            "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.18) 55%)",
        };
      } else {
        styles[m.to] = {
          ...styles[m.to],
          background:
            "radial-gradient(circle, rgba(0,0,0,0.18) 22%, transparent 22%)",
        };
      }
    });

    return styles;
  }, [lastMove, selectedSquare, legalMoves, game]);

  // Called when a piece drag begins
  const onPieceDragBegin = useCallback(
    (_piece, sourceSquare) => {
      if (!isMyTurn) return false;
      const moves = game.moves({ square: sourceSquare, verbose: true });
      setSelectedSquare(sourceSquare);
      setLegalMoves(moves);
      return true;
    },
    [isMyTurn, game]
  );

  // Called when a piece is dropped
  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare, piece) => {
      // Check for promotion
      const isPromotion =
        piece[1] === "P" &&
        (targetSquare[1] === "8" || targetSquare[1] === "1");

      const promo = isPromotion ? "q" : undefined;

      // Client-side pre-validation
      try {
        const testGame = new Chess(fen);
        const result = testGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: promo,
        });
        if (!result) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return false;
        }
      } catch {
        setSelectedSquare(null);
        setLegalMoves([]);
        return false;
      }

      // Send to server (server is authoritative)
      onMove(sourceSquare, targetSquare, promo);

      setSelectedSquare(null);
      setLegalMoves([]);
      return true; // optimistic update
    },
    [fen, onMove]
  );

  // Click-to-move support
  const onSquareClick = useCallback(
    (square) => {
      if (!isMyTurn) return;

      if (selectedSquare) {
        // Try making a move to the clicked square
        const moveMatch = legalMoves.find((m) => m.to === square);
        if (moveMatch) {
          const promo = moveMatch.promotion ? "q" : undefined;
          onMove(selectedSquare, square, promo);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }

      // Select a new piece
      const moves = game.moves({ square, verbose: true });
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [isMyTurn, selectedSquare, legalMoves, game, onMove]
  );

  // Only allow dragging own pieces
  const isDraggablePiece = useCallback(
    ({ piece }) => {
      if (!isMyTurn) return false;
      if (playerColor === "white" && piece[0] === "w") return true;
      if (playerColor === "black" && piece[0] === "b") return true;
      return false;
    },
    [isMyTurn, playerColor]
  );

  return (
    <div data-testid="chess-board">
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={onPieceDrop}
        onPieceDragBegin={onPieceDragBegin}
        onSquareClick={onSquareClick}
        isDraggablePiece={isDraggablePiece}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: "#262626" }}
        customLightSquareStyle={{ backgroundColor: "#F8F9FA" }}
        customBoardStyle={{
          borderRadius: "2px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}
        animationDuration={200}
      />
    </div>
  );
}
