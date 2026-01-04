# 711BF Gaming - System Architecture

> **Context**: This document is for sysadmin/architect mode. For game design, see GAME_IDEAS.md.

## Current Status
- **Phase**: 1 - Basic Multiplayer ✅ WORKING
- **Server**: Colyseus 0.14.x + Node.js + TypeScript
- **Client**: Phaser 3 + colyseus.js 0.14.13 (CDN)
- **Network**: Tailscale (100.66.58.107)
- **Proxy**: Traefik (HTTPS via Let's Encrypt)
- **Domains**: game.711bf.org, ws.game.711bf.org

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Player 1 │  │ Player 2 │  │ Player N │   Phaser 3        │
│  │ Browser  │  │ Browser  │  │ Browser  │   + Colyseus SDK  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        │         WebSocket         │
        │      (Tailscale VPN)      │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    COLYSEUS SERVER                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    GameRoom                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ GameState   │  │ Players Map │  │ World State │  │    │
│  │  │ - time      │  │ - positions │  │ - farm plots│  │    │
│  │  │ - day/night │  │ - names     │  │ - NPCs      │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Persistence Layer                       │    │
│  │  Phase 1: JSON file (world-state.json)              │    │
│  │  Phase 2: PostgreSQL + Redis                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
711bfgaming/
├── prototype/              # Client (Phaser game)
│   ├── index.html
│   └── game.js
├── server/                 # NEW: Colyseus server
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── rooms/
│   │   │   └── GameRoom.ts
│   │   └── schema/
│   │       └── GameState.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/                # Dev scripts
├── ARCHITECTURE.md         # This file (sysadmin context)
├── GAME_IDEAS.md          # Game design (creative context)
├── TODO.md / DONE.md      # Task tracking
└── README.md
```

---

## Phase 1: Basic Multiplayer

### Goals
- [x] Colyseus server running on Tailscale IP
- [ ] Players can join the same room
- [ ] See other players moving in real-time
- [ ] Shared day/night cycle
- [ ] Basic persistence (JSON file)

### State Schema (Phase 1)

```typescript
class Player extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") playerClass: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("string") gender: string;
  @type("number") skinTone: number;
  @type("number") hairColor: number;
  @type("string") pet: string;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") gameTime: number = 480;  // Shared day/night
  @type("number") timeSpeed: number = 0.5;
}
```

### Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `move` | Client → Server | Player position update |
| `playerJoined` | Server → Client | New player entered |
| `playerLeft` | Server → Client | Player disconnected |
| `sync` | Server → Client | Full state sync (on join) |

---

## Phase 2: Shared World (Future)

### Additional State
- Farm plots (who planted, growth stage)
- Inventory per player
- NPC positions and states
- Fishing spots

### Database Schema (PostgreSQL)
```sql
-- Future: accounts, inventory, quests
CREATE TABLE players (
  id UUID PRIMARY KEY,
  name VARCHAR(50),
  class VARCHAR(20),
  inventory JSONB,
  created_at TIMESTAMP
);
```

---

## Deployment

### Development (Current)
```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Serve client
cd prototype && python -m http.server 3000 --bind 0.0.0.0
```

### Access URLs
- **Local**: http://localhost:3000
- **Tailscale**: http://100.66.58.107:3000
- **Server WebSocket**: ws://100.66.58.107:2567

---

## Operational Notes

### Starting the System
```powershell
# From project root
.\scripts\start-dev.ps1
```

### Stopping the System
```powershell
# Kill server and client
Get-Process node, python | Stop-Process
```

### Logs
- Server logs: stdout in terminal
- Client logs: Browser DevTools console

---

## Tech Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-03 | Colyseus over Socket.io | Better long-term MMO fit, built-in rooms/state sync |
| 2026-01-03 | TypeScript for server | Type safety for schema, better tooling |
| 2026-01-03 | JSON persistence first | Simple for Phase 1, migrate to PostgreSQL later |
| 2026-01-03 | Traefik for reverse proxy | Native WebSocket support, Tailscale TLS integration |

---

*Last updated: 2026-01-03*

---

## Traefik Reverse Proxy

Traefik provides HTTPS access to the game via Tailscale built-in certificate resolver.

### Routing Diagram

```
Internet/Tailscale
        |
        v
  :80 ------> HTTP -> HTTPS redirect
        |
  :443 ----+-> game.711bf.org --> localhost:3000 (Phaser client)
           |
           +-> ws.game.711bf.org --> localhost:2567 (WebSocket/Colyseus)

  :8080 --> Dashboard (local access only)

  TLS Certificates: Tailscale (automatic)
```

### DNS Requirements

Configure these DNS records (or Tailscale MagicDNS):

| Hostname | Type | Value |
|----------|------|-------|
| game.711bf.org | A | 100.66.58.107 |
| ws.game.711bf.org | A | 100.66.58.107 |

### Configuration Files

```
infrastructure/traefik/
  traefik.yml       # Static config (entry points, resolvers)
  config.yml        # Dynamic config (routers, services)
```

### Starting Traefik

```powershell
# Standalone
.\scripts\start-traefik.ps1

# With game servers
.\scripts\start-dev.ps1 -Traefik
```

### Dashboard

Access the Traefik dashboard at: http://localhost:8080/dashboard/
