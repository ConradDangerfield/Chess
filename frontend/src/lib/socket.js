import { io } from "socket.io-client";
import { isDiscordEmbed } from "@/lib/discord";

/**
 * When running inside Discord, all network requests must go through
 * the /.proxy mapped URL. Otherwise use the normal backend URL.
 */
const BASE_URL = isDiscordEmbed
  ? "/.proxy"
  : (process.env.REACT_APP_BACKEND_URL || "");

const socket = io(BASE_URL, {
  path: "/api/socket.io",
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 20,
  transports: ["polling", "websocket"],
});

export { BASE_URL };
export default socket;
