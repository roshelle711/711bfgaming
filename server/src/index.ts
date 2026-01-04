import { Server } from "colyseus";
import { BunWebSockets } from "@colyseus/bun-websockets";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";
import { logger } from "./utils/logger";

// Tailscale IP for this server
const TAILSCALE_IP = "100.66.58.107";
const PORT = parseInt(process.env.PORT || "2567", 10);
const MONITOR_PORT = parseInt(process.env.MONITOR_PORT || "2568", 10);

logger.info({ event: "server_init" }, "Initializing 711BF Gaming server");

// Create Colyseus server with Bun WebSockets transport
const gameServer = new Server({
  transport: new BunWebSockets(),
});

// Register game room
gameServer.define("game", GameRoom);

// Start the game server
gameServer
  .listen(PORT, "0.0.0.0")
  .then(() => {
    logger.info(
      {
        event: "server_started",
        port: PORT,
        host: "0.0.0.0",
        tailscaleIp: TAILSCALE_IP,
        monitorUrl: `http://localhost:${MONITOR_PORT}/colyseus`,
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
║  Status:     RUNNING (Bun Runtime)                         ║
║  Port:       ${PORT}                                          ║
║  Host:       0.0.0.0 (all interfaces)                      ║
║  Tailscale:  ${TAILSCALE_IP}:${PORT}                            ║
║  Monitor:    http://localhost:${MONITOR_PORT}/colyseus              ║
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

// Separate HTTP server for Colyseus Monitor (Express)
// This runs on a different port since BunWebSockets handles the main port
Bun.serve({
  port: MONITOR_PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    // Serve monitor at /colyseus
    if (url.pathname.startsWith("/colyseus")) {
      // Create a minimal express-like adapter for the monitor
      const monitorApp = monitor();

      // Convert Bun request to Express-compatible format
      return new Promise((resolve) => {
        const mockRes = {
          statusCode: 200,
          headers: new Headers({ "Content-Type": "text/html" }),
          body: "",
          setHeader(name: string, value: string) {
            this.headers.set(name, value);
          },
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          send(body: string) {
            this.body = body;
            resolve(new Response(this.body, {
              status: this.statusCode,
              headers: this.headers,
            }));
          },
          json(data: unknown) {
            this.headers.set("Content-Type", "application/json");
            this.body = JSON.stringify(data);
            resolve(new Response(this.body, {
              status: this.statusCode,
              headers: this.headers,
            }));
          },
          end(body?: string) {
            resolve(new Response(body || this.body, {
              status: this.statusCode,
              headers: this.headers,
            }));
          },
        };

        const mockReq = {
          method: req.method,
          url: url.pathname + url.search,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: Object.fromEntries(req.headers),
        };

        monitorApp(mockReq as any, mockRes as any, () => {
          resolve(new Response("Not Found", { status: 404 }));
        });
      });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", runtime: "bun" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

logger.info({ event: "monitor_started", port: MONITOR_PORT }, "Colyseus Monitor started");
