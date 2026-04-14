import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import socket from "@/lib/socket";
import ChessBoard from "@/components/ChessBoard";
import ChatPanel from "@/components/ChatPanel";
import MoveHistory from "@/components/MoveHistory";
import GameStatus from "@/components/GameStatus";
import PlayerInfo from "@/components/PlayerInfo";
import UsernameModal from "@/components/UsernameModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw, Copy, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playGameOverSound,
  playNotifySound,
} from "@/lib/sounds";

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Username from sessionStorage for reconnect
  const [username, setUsername] = useState(
    () => sessionStorage.getItem(`chess_user_${roomId}`) || ""
  );
  const [showUsernameModal, setShowUsernameModal] = useState(!username);

  // Game state from server
  const [gameState, setGameState] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  // Track if we already joined
  const joinedRef = useRef(false);

  // Determine turn
  const isMyTurn =
    gameState &&
    playerColor !== "spectator" &&
    gameState.turn === playerColor;

  const orientation = playerColor === "black" ? "black" : "white";

  // ---- Socket connection ----
  useEffect(() => {
    if (!username) return;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join_room", { roomId, username });
      joinedRef.current = true;
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleRoomJoined = (data) => {
      setPlayerColor(data.color);
      setGameState(data.state);
      setChatMessages(data.chat || []);
      playNotifySound();
    };

    const handleGameState = (state) => {
      // Play game-over sound for draws/stalemate (no '#' in SAN for these)
      setGameState((prev) => {
        if (prev && !prev.isGameOver && state.isGameOver && !state.status.startsWith("checkmate")) {
          playGameOverSound();
        }
        return state;
      });
    };

    // Sound effects based on move type
    const handleMoveMade = (data) => {
      // san contains 'x' for captures, '+' for check, '#' for checkmate
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

    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
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
    socket.on("room_joined", handleRoomJoined);
    socket.on("game_state", handleGameState);
    socket.on("move_made", handleMoveMade);
    socket.on("chat_message", handleChatMessage);
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
      socket.off("room_joined", handleRoomJoined);
      socket.off("game_state", handleGameState);
      socket.off("move_made", handleMoveMade);
      socket.off("chat_message", handleChatMessage);
      socket.off("move_error", handleMoveError);
      socket.off("game_reset", handleGameReset);
      socket.disconnect();
    };
  }, [username, roomId]);

  // ---- Handlers ----
  const handleMove = useCallback((from, to, promotion) => {
    socket.emit("make_move", { from, to, promotion });
  }, []);

  const handleChat = useCallback((message) => {
    socket.emit("send_chat", { message });
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
    navigator.clipboard.writeText(window.location.href);
    toast.success("Room link copied!");
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
        className="h-screen w-full flex flex-col lg:grid lg:grid-cols-12 overflow-hidden bg-white"
        data-testid="game-page"
      >
        {/* ===== Board Panel ===== */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-4 lg:p-6 min-h-0">
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
            </div>

            <GameStatus
              gameState={gameState}
              playerColor={playerColor}
            />
          </div>

          {/* Board area */}
          <div className="w-full" style={{ maxWidth: "min(85vh, 100%)" }}>
            <PlayerInfo
              gameState={gameState}
              playerColor={playerColor}
              position="top"
              orientation={orientation}
            />

            <div className={gameState.isCheck && !gameState.isGameOver ? "animate-check-pulse rounded-sm" : ""}>
              <ChessBoard
                fen={gameState.fen}
                orientation={orientation}
                onMove={handleMove}
                lastMove={gameState.lastMove}
                isMyTurn={isMyTurn}
                playerColor={playerColor}
              />
            </div>

            <PlayerInfo
              gameState={gameState}
              playerColor={playerColor}
              position="bottom"
              orientation={orientation}
            />
          </div>
        </div>

        {/* ===== Sidebar ===== */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0 max-h-[50vh] lg:max-h-full">
          <Tabs defaultValue="chat" className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-4 pb-0 flex items-center justify-between">
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger
                  value="chat"
                  data-testid="chat-tab"
                  className="rounded-none bg-transparent px-0 pb-2 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-[#0A0A0A] text-muted-foreground border-b-2 border-transparent transition-all duration-200"
                >
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="moves"
                  data-testid="moves-tab"
                  className="rounded-none bg-transparent px-0 pb-2 text-sm font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-[#0A0A0A] text-muted-foreground border-b-2 border-transparent transition-all duration-200"
                >
                  Moves
                </TabsTrigger>
              </TabsList>

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

            <Separator className="mt-0" />

            <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
              <ChatPanel
                messages={chatMessages}
                onSend={handleChat}
                username={username}
              />
            </TabsContent>

            <TabsContent value="moves" className="flex-1 min-h-0 mt-0 overflow-auto">
              <MoveHistory moves={gameState.moves} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
