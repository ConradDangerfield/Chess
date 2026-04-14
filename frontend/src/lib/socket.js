import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const socket = io(BACKEND_URL, {
  path: "/api/socket.io",
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 20,
  transports: ["polling", "websocket"],
});

export default socket;
