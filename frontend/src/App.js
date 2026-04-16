import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import { isDiscordEmbed, setupDiscord } from "@/lib/discord";

function App() {
  const [ready, setReady] = useState(false);
  const [discordRoomId, setDiscordRoomId] = useState(null);
  const [discordUsername, setDiscordUsername] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isDiscordEmbed) {
      setReady(true);
      return;
    }

    // 10 second timeout — if Discord SDK hangs, fall back to normal mode
    const timeout = setTimeout(() => {
      console.warn("Discord SDK timed out — falling back to normal mode");
      setReady(true);
    }, 10000);

    setupDiscord()
      .then(({ sdk, user }) => {
        clearTimeout(timeout);
        const roomId = sdk?.instanceId || sdk?.channelId || "discord";
        setDiscordRoomId(roomId);
        setDiscordUsername(user?.global_name || user?.username || "Player");
        setReady(true);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error("Discord SDK error:", err);
        setError(err?.message || "Discord connection failed");
        // Fall back to normal mode after 2 seconds
        setTimeout(() => setReady(true), 2000);
      });

    return () => clearTimeout(timeout);
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {error ? error : "Connecting to Discord..."}
          </p>
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
