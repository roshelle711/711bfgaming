import { Server } from "colyseus";
import { createServer } from "http";
import { monitor } from "@colyseus/monitor";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";
import { logger } from "./utils/logger";

// Tailscale IP for this server
const TAILSCALE_IP = "100.66.58.107";
const PORT = parseInt(process.env.PORT || "2567", 10);

logger.info({ event: "server_init" }, "Initializing 711BF Gaming server");

const app = express();

// Attach Colyseus monitor (optional, for debugging)
app.use("/colyseus", monitor());

const httpServer = createServer(app);

const gameServer = new Server({
  server: httpServer,
});

// Register game room
gameServer.define("game", GameRoom);

gameServer
  .listen(PORT, "0.0.0.0")
  .then(() => {
    logger.info(
      {
        event: "server_started",
        port: PORT,
        host: "0.0.0.0",
        tailscaleIp: TAILSCALE_IP,
        monitorUrl: `http://localhost:${PORT}/colyseus`,
        registeredRooms: ["game"],
      },
      "711BF Gaming server started successfully"
    );

    // Keep the ASCII banner for visual appeal in development
    if (process.env.NODE_ENV !== "production") {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           711BF Gaming - Colyseus Server                   ║
╠════════════════════════════════════════════════════════════╣
║  Status:     RUNNING (Node.js + tsx)                       ║
║  Port:       ${PORT}                                          ║
║  Host:       0.0.0.0 (all interfaces)                      ║
║  Tailscale:  ${TAILSCALE_IP}:${PORT}                            ║
║  Monitor:    http://localhost:${PORT}/colyseus                ║
║  Room:       "game" (GameRoom registered)                  ║
╚════════════════════════════════════════════════════════════╝

Server ready for connections!
      `);
    }
  })
  .catch((err) => {
    logger.error(
      { event: "server_start_error", error: err.message, stack: err.stack },
      "Failed to start server"
    );
    process.exit(1);
  });
