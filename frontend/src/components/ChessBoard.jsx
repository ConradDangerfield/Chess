import { useState, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

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

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (lastMove) {
      const hl = { backgroundColor: "rgba(254, 240, 138, 0.5)" };
      styles[lastMove.from] = hl;
      styles[lastMove.to] = hl;
    }
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: "rgba(0, 47, 167, 0.25)",
      };
    }
    legalMoves.forEach((m) => {
      const occupied = game.get(m.to);
      if (occupied) {
        styles[m.to] = {
          ...styles[m.to],
          background: "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.18) 55%)",
        };
      } else {
        styles[m.to] = {
          ...styles[m.to],
          background: "radial-gradient(circle, rgba(0,0,0,0.18) 22%, transparent 22%)",
        };
      }
    });
    return styles;
  }, [lastMove, selectedSquare, legalMoves, game]);

  const canDragPiece = useCallback(
    ({ piece }) => {
      if (!isMyTurn) return false;
      const pt = piece.pieceType;
      if (playerColor === "white" && pt[0] === "w") return true;
      if (playerColor === "black" && pt[0] === "b") return true;
      return false;
    },
    [isMyTurn, playerColor]
  );

  // v5 fix: onPieceDrag receives { square } not { sourceSquare }
  const onPieceDrag = useCallback(
    ({ square: sourceSquare }) => {
      if (!isMyTurn) return;
      const moves = game.moves({ square: sourceSquare, verbose: true });
      setSelectedSquare(sourceSquare);
      setLegalMoves(moves);
    },
    [isMyTurn, game]
  );

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }) => {
      if (!targetSquare) return false;
      const pt = piece.pieceType;
      const isPromotion =
        pt[1] === "P" && (targetSquare[1] === "8" || targetSquare[1] === "1");
      const promo = isPromotion ? "q" : undefined;
      try {
        const testGame = new Chess(fen);
        const result = testGame.move({ from: sourceSquare, to: targetSquare, promotion: promo });
        if (!result) { setSelectedSquare(null); setLegalMoves([]); return false; }
      } catch { setSelectedSquare(null); setLegalMoves([]); return false; }
      onMove(sourceSquare, targetSquare, promo);
      setSelectedSquare(null);
      setLegalMoves([]);
      return true;
    },
    [fen, onMove]
  );

  const onSquareClick = useCallback(
    ({ square, piece: squarePiece }) => {
      if (!isMyTurn) return;
      if (selectedSquare) {
        const moveMatch = legalMoves.find((m) => m.to === square);
        if (moveMatch) {
          const promo = moveMatch.promotion ? "q" : undefined;
          try {
            const testGame = new Chess(fen);
            const result = testGame.move({ from: selectedSquare, to: square, promotion: promo });
            if (result) { onMove(selectedSquare, square, promo); setSelectedSquare(null); setLegalMoves([]); return; }
          } catch { /* fall through */ }
        }
      }
      if (squarePiece) {
        const moves = game.moves({ square, verbose: true });
        if (moves.length > 0) { setSelectedSquare(square); setLegalMoves(moves); }
        else { setSelectedSquare(null); setLegalMoves([]); }
      } else { setSelectedSquare(null); setLegalMoves([]); }
    },
    [isMyTurn, selectedSquare, legalMoves, game, onMove, fen]
  );

  // Top captured = opponent's captured pieces, bottom = yours
  return (
    <div data-testid="chess-board">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          onPieceDrop,
          onPieceDrag,
          onSquareClick,
          canDragPiece,
          allowDragging: true,
          dragActivationDistance: 3,
          squareStyles,
          darkSquareStyle: { backgroundColor: "#B58863" },
          lightSquareStyle: { backgroundColor: "#F0D9B5" },
          boardStyle: { borderRadius: "2px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" },
          animationDurationInMs: 200,
        }}
      />
    </div>
  );
}
