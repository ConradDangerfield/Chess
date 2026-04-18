import { io } from "socket.io-client";
import { isDiscordEmbed } from "@/lib/discord";

const BASE_URL = isDiscordEmbed
  ? "/.proxy"
  : (process.env.REACT_APP_BACKEND_URL || "");

let socket;

if (isDiscordEmbed) {
  // Inside Discord: connect to same origin, use /.proxy in the path
  // This avoids socket.io treating /.proxy as a namespace
  socket = io({
    path: "/.proxy/api/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ["polling"],
    forceNew: true,
  });
} else {
  socket = io(BASE_URL, {
    path: "/api/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ["polling", "websocket"],
  });
}

export { BASE_URL };
export default socket;
