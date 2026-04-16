import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import { isDiscordEmbed, setupDiscord } from "@/lib/discord";

function App() {
  const [discordReady, setDiscordReady] = useState(!isDiscordEmbed);
  const [discordRoomId, setDiscordRoomId] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);

  useEffect(() => {
    if (!isDiscordEmbed) return;

    setupDiscord()
      .then(({ sdk, user }) => {
        const roomId = sdk?.instanceId || sdk?.channelId || "discord";
        setDiscordRoomId(roomId);
        setDiscordUsername(user?.global_name || user?.username || "Player");
        setDiscordReady(true);
      })
      .catch((err) => {
        console.error("Discord SDK setup failed:", err);
        setDiscordReady(true);
      });
  }, []);

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
            ? <Navigate to={`/game/${discordRoomId}`} replace />
            : <Home />
        } />
        <Route path="/game/:roomId" element={<Game discordUsername={discordUsername} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
