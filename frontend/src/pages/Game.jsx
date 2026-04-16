import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import socket from "@/lib/socket";
import ChessBoard from "@/components/ChessBoard";
import MoveHistory from "@/components/MoveHistory";
import GameStatus from "@/components/GameStatus";
import PlayerInfo from "@/components/PlayerInfo";
import UsernameModal from "@/components/UsernameModal";
import GameOverModal from "@/components/GameOverModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw, Copy, ArrowLeft, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playGameOverSound,
  playNotifySound,
  isMuted,
  getVolume,
  setMuted,
  setVolume,
  toggleMute,
} from "@/lib/sounds";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

export default function Game({ discordUsername }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState(
    () => discordUsername || sessionStorage.getItem(`chess_user_${roomId}`) || ""
  );
  const [showUsernameModal, setShowUsernameModal] = useState(!username);

  const [gameState, setGameState] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [connected, setConnected] = useState(false);

  const joinedRef = useRef(false);

  const [muted, setMutedState] = useState(isMuted);
  const [volume, setVolumeState] = useState(getVolume);

  const isMyTurn =
    gameState &&
    playerColor !== "spectator" &&
    gameState.turn === playerColor;

  const orientation = playerColor === "black" ? "black" : "white";

  // ---- Socket connection ----
  useEffect(() => {
    if (!username) return;

    const joinRoom = () => {
      socket.emit("join_room", { roomId, username });
    };

    const handleConnect = () => {
      setConnected(true);
      joinRoom();
      joinedRef.current = true;
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    // Re-join room on reconnect (critical for Discord proxy which drops connections)
    const handleReconnect = () => {
      setConnected(true);
      joinRoom();
    };

    const handleRoomJoined = (data) => {
      setPlayerColor(data.color);
      setGameState(data.state);
      playNotifySound();
    };

    const handleGameState = (state) => {
      setGameState((prev) => {
        if (prev && !prev.isGameOver && state.isGameOver && !state.status.startsWith("checkmate")) {
          playGameOverSound();
        }
        return state;
      });
    };

    const handleMoveMade = (data) => {
      const san = data.san || "";
      if (san.includes("#")) {
        playGameOverSound();
      } else if (san.includes("+")) {
        playCheckSound();
      } else if (san.includes("x")) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    };

    const handleMoveError = (data) => {
      toast.error(data.message);
    };

    const handleGameReset = () => {
      toast.info("Game has been reset");
      playNotifySound();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect", handleReconnect);
    socket.on("room_joined", handleRoomJoined);
    socket.on("game_state", handleGameState);
    socket.on("move_made", handleMoveMade);
    socket.on("move_error", handleMoveError);
    socket.on("game_reset", handleGameReset);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect", handleReconnect);
      socket.off("room_joined", handleRoomJoined);
      socket.off("game_state", handleGameState);
      socket.off("move_made", handleMoveMade);
      socket.off("move_error", handleMoveError);
      socket.off("game_reset", handleGameReset);
      socket.disconnect();
    };
  }, [username, roomId]);

  // ---- Handlers ----
  const handleMove = useCallback((from, to, promotion) => {
    socket.emit("make_move", { from, to, promotion });
  }, []);

  const handleReset = useCallback(() => {
    socket.emit("reset_game");
  }, []);

  const handleSetUsername = (name) => {
    setUsername(name);
    sessionStorage.setItem(`chess_user_${roomId}`, name);
    setShowUsernameModal(false);
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    try {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Room link copied!");
    } catch {
      toast.info(`Room: ${roomId}`);
    }
  };

  const handleToggleMute = () => {
    toggleMute();
    setMutedState(isMuted());
  };

  const handleVolumeChange = (val) => {
    const v = val[0];
    setVolume(v);
    setVolumeState(v);
    if (v > 0 && muted) {
      setMuted(false);
      setMutedState(false);
    }
  };

  // ---- Username modal ----
  if (showUsernameModal || !username) {
    return (
      <UsernameModal
        onSubmit={handleSetUsername}
        roomId={roomId}
      />
    );
  }

  // ---- Loading ----
  if (!gameState) {
    return (
      <div
        className="h-screen flex items-center justify-center bg-white"
        data-testid="game-loading"
      >
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="h-screen w-full flex flex-col lg:grid lg:grid-cols-[1fr_240px] overflow-hidden bg-white"
        data-testid="game-page"
      >
        {/* ===== Board Panel ===== */}
        <div className="flex flex-col items-center justify-center p-4 lg:p-6 min-h-0">
          {/* Top bar */}
          <div className="w-full flex items-center justify-between mb-3" style={{ maxWidth: "min(85vh, 100%)" }}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="back-home-button"
                    variant="ghost"
                    size="icon"
                    className="rounded-sm"
                    onClick={() => navigate("/")}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to home</TooltipContent>
              </Tooltip>
              <Badge
                variant="outline"
                className="font-mono text-xs rounded-sm cursor-pointer hover:bg-[#F4F4F5] transition-colors duration-200"
                onClick={copyRoomLink}
                data-testid="room-id-badge"
              >
                {roomId}
                <Copy className="w-3 h-3 ml-1.5" />
              </Badge>
              {connected ? (
                <Wifi className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              )}

              {/* Volume control */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="volume-toggle-button"
                    variant="ghost"
                    size="icon"
                    className="rounded-sm h-7 w-7"
                  >
                    {muted ? (
                      <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-52 p-3"
                  side="bottom"
                  align="start"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Sound</span>
                      <button
                        data-testid="mute-button"
                        onClick={handleToggleMute}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {muted ? "Unmute" : "Mute"}
                      </button>
                    </div>
                    <Slider
                      data-testid="volume-slider"
                      value={[muted ? 0 : volume]}
                      onValueChange={handleVolumeChange}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {muted ? "Muted" : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <GameStatus
              gameState={gameState}
              playerColor={playerColor}
            />
          </div>

          {/* Board area */}
          <div className="w-full relative" style={{ maxWidth: "min(85vh, 100%)" }}>
            <PlayerInfo
              gameState={gameState}
              playerColor={playerColor}
              position="top"
              orientation={orientation}
            />

            <div className={`relative ${gameState.isCheck && !gameState.isGameOver ? "animate-check-pulse rounded-sm" : ""}`}>
              <ChessBoard
                fen={gameState.fen}
                orientation={orientation}
                onMove={handleMove}
                lastMove={gameState.lastMove}
                isMyTurn={isMyTurn}
                playerColor={playerColor}
              />

              {gameState.isGameOver && (
                <GameOverModal
                  gameState={gameState}
                  playerColor={playerColor}
                  onPlayAgain={playerColor !== "spectator" ? handleReset : null}
                />
              )}
            </div>

            <PlayerInfo
              gameState={gameState}
              playerColor={playerColor}
              position="bottom"
              orientation={orientation}
            />
          </div>
        </div>

        {/* ===== Sidebar — Move History only ===== */}
        <div className="border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0 max-h-[50vh] lg:max-h-full">
          <div className="px-4 pt-4 pb-0 flex items-center justify-between">
            <span className="text-sm font-medium" data-testid="moves-heading">Moves</span>

            {playerColor !== "spectator" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="reset-game-button"
                    variant="ghost"
                    size="sm"
                    className="rounded-sm text-muted-foreground hover:text-foreground"
                    onClick={handleReset}
                    disabled={gameState.moves.length === 0}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset the game</TooltipContent>
              </Tooltip>
            )}
          </div>

          <Separator className="mt-2" />

          <div className="flex-1 min-h-0 overflow-auto">
            <MoveHistory moves={gameState.moves} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
