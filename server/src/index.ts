import { Server } from "colyseus";
import { createServer } from "http";
import { monitor } from "@colyseus/monitor";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";

// Tailscale IP for this server
const TAILSCALE_IP = "100.66.58.107";
const PORT = 2567;

const app = express();

// Attach Colyseus monitor (optional, for debugging)
app.use("/colyseus", monitor());

const httpServer = createServer(app);

const gameServer = new Server({
  server: httpServer,
});

// Register game room
gameServer.define("game", GameRoom);

gameServer.listen(PORT, "0.0.0.0").then(() => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           711BF Gaming - Colyseus Server                   ║
╠════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                       ║
║  Port:       ${PORT}                                          ║
║  Host:       0.0.0.0 (all interfaces)                      ║
║  Tailscale:  ${TAILSCALE_IP}:${PORT}                            ║
║  Monitor:    http://localhost:${PORT}/colyseus                ║
║  Room:       "game" (GameRoom registered)                  ║
╚════════════════════════════════════════════════════════════╝

Server ready for connections!
  `);
});
