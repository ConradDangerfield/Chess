import { io } from "socket.io-client";
import { isDiscordEmbed } from "@/lib/discord";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

let socket;

if (isDiscordEmbed) {
  // Inside Discord: connect to same origin, /proxy namespace
  // Discord's proxy maps /.proxy/* -> chess.conraddangerfield.com/*
  // So path "/api/socket.io" goes through /.proxy/api/socket.io
  // -> chess.conraddangerfield.com/api/socket.io
  // Namespace must be "/proxy" to match server registration
  socket = io("/proxy", {
    path: "/api/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ["polling"],
    forceNew: true,
  });
} else {
  socket = io(BACKEND_URL, {
    path: "/api/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ["polling", "websocket"],
  });
}

export const BASE_URL = isDiscordEmbed ? "" : BACKEND_URL;
export default socket;
