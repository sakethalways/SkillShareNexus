// /context/SocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
      console.error("Socket URL is not defined in environment variables.");
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      reconnection: true, // Enables auto-reconnect
      transports: ["websocket"], // Use WebSocket to avoid polling
    });

    newSocket.on("connect", () => console.log("Connected to socket"));
    newSocket.on("disconnect", () => console.log("Disconnected from socket"));
    newSocket.on("connect_error", (err) => console.error("Socket connection error:", err));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
}
