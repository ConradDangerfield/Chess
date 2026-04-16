import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Crown, ArrowRight, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from "@/lib/socket";

const API = `${BASE_URL}/api`;

export default function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);

  const createGame = async () => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/room/create`);
      navigate(`/game/${res.data.roomId}`);
    } catch {
      toast.error("Failed to create game");
    } finally {
      setCreating(false);
    }
  };

  const joinGame = () => {
    const code = roomCode.trim();
    if (!code) {
      toast.error("Enter a room code");
      return;
    }
    navigate(`/game/${code}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="home-page">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-10">
          {/* Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0A0A0A] rounded-sm flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter text-[#0A0A0A]">
                Chess
              </h1>
            </div>
            <p className="text-muted-foreground text-base">
              Real-time multiplayer chess. Create a room, share the link, play.
            </p>
          </div>

          {/* Create Game */}
          <div className="space-y-4">
            <Button
              data-testid="create-game-button"
              onClick={createGame}
              disabled={creating}
              className="w-full h-12 rounded-sm bg-[#0A0A0A] hover:bg-[#0A0A0A]/90 text-white font-medium text-base transition-all duration-200"
            >
              {creating ? "Creating..." : "Create New Game"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                or join
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Join Game */}
            <div className="flex gap-2">
              <Input
                data-testid="room-code-input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinGame()}
                placeholder="Enter room code"
                className="h-12 rounded-sm font-mono text-sm focus:ring-2 focus:ring-black focus:border-black"
              />
              <Button
                data-testid="join-game-button"
                onClick={joinGame}
                variant="outline"
                className="h-12 px-6 rounded-sm border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all duration-200"
              >
                Join
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 bg-[#F4F4F5] rounded-sm">
              <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">2 Players</p>
                <p className="text-xs text-muted-foreground">
                  Auto-assigned colors
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[#F4F4F5] rounded-sm">
              <Eye className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Spectators</p>
                <p className="text-xs text-muted-foreground">
                  Watch live games
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t">
        Real-time chess with Socket.IO
      </footer>
    </div>
  );
}
