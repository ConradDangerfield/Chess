import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

/**
 * Full-screen glassmorphism modal prompting the user for a display name
 * before joining the game room.
 */
export default function UsernameModal({ onSubmit, roomId }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F4F5]/60 backdrop-blur-xl"
      data-testid="username-modal"
    >
      <div className="w-full max-w-sm mx-4 bg-white/70 backdrop-blur-xl border border-white/40 rounded-sm p-8 shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0A0A0A] rounded-sm flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-heading text-2xl font-bold tracking-tighter text-[#0A0A0A]">
                Join Game
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Room{" "}
              <code className="font-mono bg-[#F4F4F5] px-1.5 py-0.5 rounded-sm text-xs">
                {roomId}
              </code>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Display Name
              </label>
              <Input
                data-testid="username-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                maxLength={20}
                className="h-11 rounded-sm font-medium focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <Button
              data-testid="join-room-button"
              type="submit"
              disabled={!name.trim()}
              className="w-full h-11 rounded-sm bg-[#0A0A0A] hover:bg-[#0A0A0A]/90 text-white font-medium transition-all duration-200"
            >
              Enter Room
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
