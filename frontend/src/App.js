import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import { isDiscordEmbed, setupDiscord, getDiscordSdk } from "@/lib/discord";

function App() {
  const [discordReady, setDiscordReady] = useState(!isDiscordEmbed);
  const [discordRoomId, setDiscordRoomId] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);

  // Initialise Discord SDK when running inside the Activity iframe
  useEffect(() => {
    if (!isDiscordEmbed) return;

    setupDiscord()
      .then(({ sdk, user }) => {
        // Use the Discord channel/instance as the room ID so everyone
        // in the same Activity session lands in the same game.
        const roomId = sdk?.instanceId || sdk?.channelId || "discord";
        setDiscordRoomId(roomId);
        setDiscordUsername(user?.global_name || user?.username || "Player");
        setDiscordReady(true);
      })
      .catch((err) => {
        console.error("Discord SDK setup failed:", err);
        // Fall back to normal mode
        setDiscordReady(true);
      });
  }, []);

  // Show loading while Discord SDK initialises
  if (!discordReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to Discord...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={
          isDiscordEmbed && discordRoomId
            ? <Navigate to={`/game/${discordRoomId}?discord=1&username=${encodeURIComponent(discordUsername || "")}`} replace />
            : <Home />
        } />
        <Route path="/game/:roomId" element={<Game discordUsername={discordUsername} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
