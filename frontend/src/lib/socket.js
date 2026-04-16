import { io } from "socket.io-client";
import { isDiscordEmbed } from "@/lib/discord";

const BASE_URL = isDiscordEmbed
  ? "/.proxy"
  : (process.env.REACT_APP_BACKEND_URL || "");

const socket = io(BASE_URL, {
  path: "/api/socket.io",
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 20,
  // Discord's proxy doesn't support WebSocket upgrade — use polling only inside Discord
  transports: isDiscordEmbed ? ["polling"] : ["polling", "websocket"],
});

export { BASE_URL };
export default socket;
