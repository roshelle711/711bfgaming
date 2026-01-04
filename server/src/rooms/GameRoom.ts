import { Room, Client } from "colyseus";
import { Logger } from "pino";
import { GameState, Player, FarmPlot, NPC, SeedPickup } from "../schema/GameState";
import { createRoomLogger, createSessionLogger } from "../utils/logger";
import { loadWorldState, saveWorldState, PersistedWorldState } from "../utils/persistence";

interface PlayerOptions {
  id?: string;
  name?: string;
  playerClass?: string;
  gender?: string;
  skinTone?: number;
  hairColor?: number;
  pet?: string;
}

interface MoveMessage {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface AppearanceMessage {
  name?: string;
  playerClass?: string;
  gender?: string;
  skinTone?: number;
  hairColor?: number;
  pet?: string;
}

interface FarmActionMessage {
  plotIndex: number;
  action: "hoe" | "plant" | "harvest";
  seedType?: string; // required for "plant"
}

interface CollectSeedMessage {
  pickupIndex: number;
}

export class GameRoom extends Room<GameState> {
  private gameTimeInterval: ReturnType<typeof setInterval> | null = null;
  private worldUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private roomLogger!: Logger;

  // NPC patrol state
  private miraPatrolIndex: number = 0;
  private readonly PATROL_POINTS = [
    { x: 450, y: 550 },
    { x: 700, y: 500 },
    { x: 600, y: 400 },
    { x: 350, y: 450 },
    { x: 400, y: 600 },
  ];
  private readonly MIRA_HOME = { x: 235, y: 235 };

  // Farm plot positions (matches client layout - farmStartX=500, farmStartY=700)
  private readonly FARM_PLOT_POSITIONS = [
    { x: 420, y: 675 }, { x: 470, y: 675 }, { x: 520, y: 675 }, { x: 570, y: 675 },
    { x: 420, y: 730 }, { x: 470, y: 730 }, { x: 520, y: 730 }, { x: 570, y: 730 },
  ];

  // Seed pickup positions
  private readonly SEED_PICKUP_DATA = [
    { x: 350, y: 500, seedType: "carrot" },
    { x: 400, y: 520, seedType: "tomato" },
    { x: 320, y: 540, seedType: "flower" },
  ];

  // NPC positions
  private readonly FINN_POSITION = { x: 1200, y: 680 };
  private readonly MIRA_START = { x: 450, y: 550 };

  onCreate(options: any): void {
    this.roomLogger = createRoomLogger(this.roomId);

    this.setState(new GameState());

    // Initialize world state
    this.initializeFarmPlots();
    this.initializeNPCs();
    this.initializeSeedPickups();

    // Load persisted world state (overrides defaults if exists)
    this.loadPersistedWorldState();

    // Start the game time loop
    this.startGameTimeLoop();

    // Start world update loop (plant growth, NPC patrol, seed respawns)
    this.startWorldUpdateLoop();

    // Register message handlers
    this.onMessage("move", (client, message: MoveMessage) => {
      this.handleMove(client, message);
    });

    this.onMessage("updateAppearance", (client, message: AppearanceMessage) => {
      this.handleUpdateAppearance(client, message);
    });

    this.onMessage("farmAction", (client, message: FarmActionMessage) => {
      this.handleFarmAction(client, message);
    });

    this.onMessage("collectSeed", (client, message: CollectSeedMessage) => {
      this.handleCollectSeed(client, message);
    });

    this.roomLogger.info({ event: "room_created" }, "GameRoom created");
  }

  onJoin(client: Client, options: PlayerOptions): void {
    const sessionLogger = createSessionLogger(client.sessionId, this.roomId);

    const player = new Player();
    player.id = options.id || client.sessionId;
    player.sessionId = client.sessionId;
    player.name = options.name || "Player";
    player.playerClass = options.playerClass || "druid";
    player.gender = options.gender || "female";
    player.skinTone = options.skinTone ?? 0;
    player.hairColor = options.hairColor ?? 0;
    player.pet = options.pet || "cat";
    // Default spawn position
    player.x = 600;
    player.y = 400;
    player.velocityX = 0;
    player.velocityY = 0;

    this.state.players.set(client.sessionId, player);

    sessionLogger.info(
      {
        event: "player_joined",
        playerName: player.name,
        playerClass: player.playerClass,
        playerId: player.id,
      },
      "Player joined room"
    );
  }

  onLeave(client: Client, consented: boolean): void {
    const sessionLogger = createSessionLogger(client.sessionId, this.roomId);
    const player = this.state.players.get(client.sessionId);

    sessionLogger.info(
      {
        event: "player_left",
        consented,
        playerName: player?.name,
        playerId: player?.id,
      },
      "Player left room"
    );

    this.state.players.delete(client.sessionId);
  }

  onDispose(): void {
    this.roomLogger.info(
      { event: "room_disposed", playerCount: this.state.players.size },
      "GameRoom disposed"
    );

    if (this.gameTimeInterval) {
      clearInterval(this.gameTimeInterval);
      this.gameTimeInterval = null;
    }

    if (this.worldUpdateInterval) {
      clearInterval(this.worldUpdateInterval);
      this.worldUpdateInterval = null;
    }

    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }

    // Persist world state before shutdown
    this.persistWorldStateNow();
  }

  onError(error: Error, client?: Client): void {
    const context: Record<string, unknown> = {
      event: "room_error",
      error: error.message,
      stack: error.stack,
    };

    if (client) {
      context.sessionId = client.sessionId;
    }

    this.roomLogger.error(context, "Error in GameRoom");
  }

  private handleMove(client: Client, message: MoveMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.x = message.x;
      player.y = message.y;
      player.velocityX = message.velocityX;
      player.velocityY = message.velocityY;
    } else {
      this.roomLogger.warn(
        {
          event: "player_not_found",
          sessionId: client.sessionId,
          action: "move",
        },
        "Received move from unknown player"
      );
    }
  }

  private handleUpdateAppearance(client: Client, message: AppearanceMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      if (message.name !== undefined) player.name = message.name;
      if (message.playerClass !== undefined) player.playerClass = message.playerClass;
      if (message.gender !== undefined) player.gender = message.gender;
      if (message.skinTone !== undefined) player.skinTone = message.skinTone;
      if (message.hairColor !== undefined) player.hairColor = message.hairColor;
      if (message.pet !== undefined) player.pet = message.pet;
    } else {
      this.roomLogger.warn(
        {
          event: "player_not_found",
          sessionId: client.sessionId,
          action: "updateAppearance",
        },
        "Received appearance update from unknown player"
      );
    }
  }

  private startGameTimeLoop(): void {
    // Increment game time every 100ms
    this.gameTimeInterval = setInterval(() => {
      this.state.gameTime += this.state.timeSpeed;

      // Wrap at 1440 (24 hours * 60 minutes)
      if (this.state.gameTime >= 1440) {
        this.state.gameTime = this.state.gameTime % 1440;
      }
    }, 100);
  }

  // ===== World Initialization =====

  private initializeFarmPlots(): void {
    for (let i = 0; i < 8; i++) {
      const plot = new FarmPlot();
      plot.index = i;
      plot.state = "grass";
      plot.crop = "";
      plot.growthTimer = 0;
      this.state.farmPlots.set(String(i), plot);
    }
    this.roomLogger.debug({ event: "farm_plots_initialized", count: 8 }, "Initialized farm plots");
  }

  private initializeNPCs(): void {
    // Mira - druid who patrols during day
    const mira = new NPC();
    mira.id = "mira";
    mira.x = this.MIRA_START.x;
    mira.y = this.MIRA_START.y;
    mira.currentAction = "patrol";
    this.state.npcs.set("mira", mira);

    // Finn - shopkeeper (stationary, in front of General Store)
    const finn = new NPC();
    finn.id = "finn";
    finn.x = this.FINN_POSITION.x;
    finn.y = this.FINN_POSITION.y;
    finn.currentAction = "idle";
    this.state.npcs.set("finn", finn);

    this.roomLogger.debug({ event: "npcs_initialized" }, "Initialized NPCs");
  }

  private initializeSeedPickups(): void {
    this.SEED_PICKUP_DATA.forEach((data, i) => {
      const pickup = new SeedPickup();
      pickup.index = i;
      pickup.x = data.x;
      pickup.y = data.y;
      pickup.seedType = data.seedType;
      pickup.isCollected = false;
      pickup.respawnTimer = 0;
      this.state.seedPickups.set(String(i), pickup);
    });
    this.roomLogger.debug({ event: "seed_pickups_initialized", count: 3 }, "Initialized seed pickups");
  }

  // ===== World Update Loop =====

  private startWorldUpdateLoop(): void {
    // Update every 100ms (10 FPS for world state)
    this.worldUpdateInterval = setInterval(() => {
      const deltaMs = 100;
      this.updatePlantGrowth(deltaMs);
      this.updateSeedRespawns(deltaMs);
      this.updateNPCPositions();
    }, 100);
  }

  private updatePlantGrowth(deltaMs: number): void {
    this.state.farmPlots.forEach((plot) => {
      if (plot.state === "planted" || plot.state === "growing") {
        // Check if last actor was druid for growth bonus
        const lastPlayer = this.state.players.get(plot.lastActionBy);
        const multiplier = lastPlayer?.playerClass === "druid" ? 1.2 : 1.0;

        plot.growthTimer += deltaMs * multiplier;

        if (plot.state === "planted" && plot.growthTimer >= 3000) {
          plot.state = "growing";
        } else if (plot.state === "growing" && plot.growthTimer >= 8000) {
          plot.state = "ready";
        }
      }
    });
  }

  private updateSeedRespawns(deltaMs: number): void {
    this.state.seedPickups.forEach((pickup) => {
      if (pickup.isCollected && pickup.respawnTimer > 0) {
        pickup.respawnTimer -= deltaMs;
        if (pickup.respawnTimer <= 0) {
          pickup.isCollected = false;
          pickup.respawnTimer = 0;
          pickup.collectedBy = "";
        }
      }
    });
  }

  private updateNPCPositions(): void {
    const hour = Math.floor(this.state.gameTime / 60) % 24;
    const isNight = hour < 6 || hour >= 20;

    const mira = this.state.npcs.get("mira");
    if (mira) {
      if (isNight) {
        // Move to home (Mira's cottage)
        mira.currentAction = "home";
        this.moveNPCToward(mira, this.MIRA_HOME.x, this.MIRA_HOME.y);
      } else {
        // Patrol
        mira.currentAction = "patrol";
        this.updateMiraPatrol(mira);
      }
    }
    // Finn stays stationary at General Store
  }

  private updateMiraPatrol(mira: NPC): void {
    const target = this.PATROL_POINTS[this.miraPatrolIndex];
    const arrived = this.moveNPCToward(mira, target.x, target.y);
    if (arrived) {
      this.miraPatrolIndex = (this.miraPatrolIndex + 1) % this.PATROL_POINTS.length;
    }
  }

  private moveNPCToward(npc: NPC, targetX: number, targetY: number): boolean {
    const speed = 60 * 0.1; // 60 units/sec * 0.1 sec interval
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return true; // arrived

    npc.x += (dx / dist) * speed;
    npc.y += (dy / dist) * speed;
    return false;
  }

  // ===== Message Handlers =====

  private handleFarmAction(client: Client, message: FarmActionMessage): void {
    const plot = this.state.farmPlots.get(String(message.plotIndex));
    if (!plot) {
      this.roomLogger.warn(
        { event: "invalid_plot_index", plotIndex: message.plotIndex, sessionId: client.sessionId },
        "Farm action on invalid plot"
      );
      return;
    }

    const player = this.state.players.get(client.sessionId);

    switch (message.action) {
      case "hoe":
        if (plot.state === "grass") {
          plot.state = "tilled";
          plot.lastActionBy = client.sessionId;
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "plot_hoed", plotIndex: message.plotIndex, sessionId: client.sessionId },
            "Plot hoed"
          );
        }
        break;

      case "plant":
        if (plot.state === "tilled" && message.seedType) {
          plot.state = "planted";
          plot.crop = message.seedType;
          plot.growthTimer = 0;
          plot.lastActionBy = client.sessionId;
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "seed_planted", plotIndex: message.plotIndex, crop: message.seedType, sessionId: client.sessionId },
            "Seed planted"
          );
        }
        break;

      case "harvest":
        if (plot.state === "ready" && plot.crop) {
          // Broadcast harvest event so client can add to inventory
          this.broadcast("cropHarvested", {
            plotIndex: message.plotIndex,
            crop: plot.crop,
            harvestedBy: client.sessionId,
          });

          plot.state = "tilled";
          plot.crop = "";
          plot.growthTimer = 0;
          plot.lastActionBy = client.sessionId;
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "crop_harvested", plotIndex: message.plotIndex, sessionId: client.sessionId },
            "Crop harvested"
          );
        }
        break;
    }
  }

  private handleCollectSeed(client: Client, message: CollectSeedMessage): void {
    const pickup = this.state.seedPickups.get(String(message.pickupIndex));
    if (!pickup || pickup.isCollected) {
      return;
    }

    const player = this.state.players.get(client.sessionId);
    const isHunter = player?.playerClass === "hunter";

    pickup.isCollected = true;
    pickup.respawnTimer = 30000; // 30 seconds
    pickup.collectedBy = client.sessionId;

    // Broadcast collection event with bonus amount
    this.broadcast("seedCollected", {
      pickupIndex: message.pickupIndex,
      seedType: pickup.seedType,
      collectedBy: client.sessionId,
      amount: isHunter ? 2 : 1,
    });

    this.debouncedPersist();
    this.roomLogger.debug(
      { event: "seed_collected", pickupIndex: message.pickupIndex, seedType: pickup.seedType, sessionId: client.sessionId },
      "Seed collected"
    );
  }

  // ===== Persistence =====

  private loadPersistedWorldState(): void {
    const saved = loadWorldState();
    if (!saved) return;

    // Apply farm plot states
    saved.farmPlots?.forEach((plotData) => {
      const plot = this.state.farmPlots.get(String(plotData.index));
      if (plot) {
        plot.state = plotData.state;
        plot.crop = plotData.crop;
        plot.growthTimer = plotData.growthTimer;
      }
    });

    // Apply seed pickup states
    saved.seedPickups?.forEach((pickupData) => {
      const pickup = this.state.seedPickups.get(String(pickupData.index));
      if (pickup) {
        pickup.isCollected = pickupData.isCollected;
        pickup.respawnTimer = pickupData.respawnTimer;
      }
    });

    // Restore game time
    if (saved.gameTime !== undefined) {
      this.state.gameTime = saved.gameTime;
    }

    this.roomLogger.info(
      { event: "world_state_loaded", farmPlotCount: saved.farmPlots?.length },
      "Loaded persisted world state"
    );
  }

  private debouncedPersist(): void {
    // Debounce saves to avoid excessive disk writes
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }

    this.persistDebounceTimer = setTimeout(() => {
      this.persistWorldStateNow();
    }, 1000); // 1 second debounce
  }

  private persistWorldStateNow(): void {
    const state: PersistedWorldState = {
      farmPlots: [],
      seedPickups: [],
      gameTime: this.state.gameTime,
      lastSaved: Date.now(),
    };

    this.state.farmPlots.forEach((plot) => {
      state.farmPlots.push({
        index: plot.index,
        state: plot.state,
        crop: plot.crop,
        growthTimer: plot.growthTimer,
      });
    });

    this.state.seedPickups.forEach((pickup) => {
      state.seedPickups.push({
        index: pickup.index,
        isCollected: pickup.isCollected,
        respawnTimer: pickup.respawnTimer,
      });
    });

    saveWorldState(state);
  }
}
