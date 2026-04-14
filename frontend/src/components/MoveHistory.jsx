/**
 * Displays the move history in a two-column algebraic notation grid.
 */
export default function MoveHistory({ moves }) {
  // Group moves into pairs (white + black)
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
    });
  }

  return (
    <div className="p-4" data-testid="move-history">
      {pairs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          No moves yet. Make the first move!
        </p>
      ) : (
        <div className="space-y-0">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_1fr] gap-2 pb-2 border-b border-border">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">#</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">White</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Black</span>
          </div>

          {/* Moves */}
          {pairs.map((pair) => (
            <div
              key={pair.number}
              className="grid grid-cols-[40px_1fr_1fr] gap-2 py-1.5 hover:bg-[#F4F4F5] transition-colors duration-150 -mx-1 px-1 rounded-sm"
            >
              <span className="text-xs text-muted-foreground font-mono">
                {pair.number}.
              </span>
              <span
                className="text-sm font-mono font-medium text-foreground"
                data-testid={`move-white-${pair.number}`}
              >
                {pair.white?.san || ""}
              </span>
              <span
                className="text-sm font-mono font-medium text-foreground"
                data-testid={`move-black-${pair.number}`}
              >
                {pair.black?.san || ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
