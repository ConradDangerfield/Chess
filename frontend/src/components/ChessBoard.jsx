import { useState, useMemo, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

// Maps piece symbols to Unicode chess pieces
const PIECE_UNICODE = {
  p: "\u265F", n: "\u265E", b: "\u265D", r: "\u265C", q: "\u265B", k: "\u265A",
  P: "\u2659", N: "\u2658", B: "\u2657", R: "\u2656", Q: "\u2655", K: "\u2654",
};

/**
 * Computes captured pieces by comparing initial piece counts to current board.
 */
function getCapturedPieces(fen) {
  const initial = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1, p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const board = fen.split(" ")[0];
  const current = {};
  for (const ch of board) {
    if (/[pnbrqkPNBRQK]/.test(ch)) {
      current[ch] = (current[ch] || 0) + 1;
    }
  }
  const whiteCaptured = []; // black pieces captured by white
  const blackCaptured = []; // white pieces captured by black
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

/**
 * Renders a row of captured piece icons.
 */
function CapturedRow({ pieces, label }) {
  if (pieces.length === 0) return null;
  return (
    <span className="text-base leading-none tracking-tight" data-testid={`captured-${label}`}>
      {pieces.map((p, i) => (
        <span key={i} className="opacity-70">{PIECE_UNICODE[p]}</span>
      ))}
    </span>
  );
}

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

  const { whiteCaptured, blackCaptured } = useMemo(() => getCapturedPieces(fen), [fen]);

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
  const topCaptured = orientation === "white" ? whiteCaptured : blackCaptured;
  const bottomCaptured = orientation === "white" ? blackCaptured : whiteCaptured;

  return (
    <div data-testid="chess-board">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              onPieceDrop,
              onPieceDrag,
              onSquareClick,
              canDragPiece,
              squareStyles,
              darkSquareStyle: { backgroundColor: "#B58863" },
              lightSquareStyle: { backgroundColor: "#F0D9B5" },
              boardStyle: { borderRadius: "2px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" },
              animationDurationInMs: 200,
            }}
          />
        </div>
        {/* Captured pieces column */}
        <div className="flex flex-col justify-between py-1 min-w-[24px]" style={{ height: "100%" }} data-testid="captured-pieces">
          <CapturedRow pieces={topCaptured} label="top" />
          <CapturedRow pieces={bottomCaptured} label="bottom" />
        </div>
      </div>
    </div>
  );
}
