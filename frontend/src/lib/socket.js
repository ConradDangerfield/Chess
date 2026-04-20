import { io } from "socket.io-client";
import { isDiscordEmbed } from "@/lib/discord";

const BASE_URL = isDiscordEmbed
  ? "/.proxy"
  : (process.env.REACT_APP_BACKEND_URL || "");

let socket;

if (isDiscordEmbed) {
  // Inside Discord: connect to /proxy namespace via the Discord proxy path
  socket = io("/.proxy/proxy", {
    path: "/api/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ["polling"],
    forceNew: true,
  });
} else {
  // Normal browser: connect to default '/' namespace
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
