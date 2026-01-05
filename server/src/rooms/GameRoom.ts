import { Room, Client } from "colyseus";
import { Logger } from "pino";
import { GameState, Player, FarmPlot, NPC, SeedPickup, Lamppost, FruitTree } from "../schema/GameState";
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

interface LamppostToggleMessage {
  lamppostIndex: number;
}

interface WaterActionMessage {
  plotIndex: number;
}

interface RemoveHazardMessage {
  plotIndex: number;
}

interface HarvestFruitMessage {
  treeIndex: number;
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

  // Fruit tree positions
  private readonly FRUIT_TREE_DATA = [
    { x: 100, y: 400, type: "apple" },
    { x: 150, y: 520, type: "orange" },
    { x: 1300, y: 400, type: "peach" },
    { x: 1250, y: 520, type: "cherry" },
  ];

  // Fruit regrow times (ms)
  private readonly FRUIT_REGROW_TIMES: Record<string, number> = {
    apple: 60000,
    orange: 75000,
    peach: 90000,
    cherry: 45000,
  };

  // Crop growth times (ms) - different per crop type
  private readonly CROP_GROWTH_TIMES: Record<string, number> = {
    carrot: 8000,
    tomato: 8000,
    flower: 8000,
    lettuce: 6000,
    onion: 9000,
    potato: 10000,
    pepper: 12000,
    corn: 15000,
    pumpkin: 20000,
  };

  // Watering constants
  private readonly GAME_DAY_MINUTES = 1440;
  private readonly WILT_THRESHOLD = this.GAME_DAY_MINUTES * 3; // 3 game days
  private readonly HAZARD_CHANCE_PER_HOUR = 0.02; // 2% per plot per hour

  // Hazard tracking
  private lastHazardCheckHour: number = -1;

  onCreate(options: any): void {
    this.roomLogger = createRoomLogger(this.roomId);

    this.setState(new GameState());

    // Initialize world state
    this.initializeFarmPlots();
    this.initializeNPCs();
    this.initializeSeedPickups();
    this.initializeLampposts();
    this.initializeFruitTrees();

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

    this.onMessage("toggleLamppost", (client, message: LamppostToggleMessage) => {
      this.handleToggleLamppost(client, message);
    });

    this.onMessage("waterAction", (client, message: WaterActionMessage) => {
      this.handleWaterAction(client, message);
    });

    this.onMessage("removeHazard", (client, message: RemoveHazardMessage) => {
      this.handleRemoveHazard(client, message);
    });

    this.onMessage("harvestFruit", (client, message: HarvestFruitMessage) => {
      this.handleHarvestFruit(client, message);
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
    // 3 rows x 5 columns = 15 plots (must match client)
    for (let i = 0; i < 15; i++) {
      const plot = new FarmPlot();
      plot.index = i;
      plot.state = "grass";
      plot.crop = "";
      plot.growthTimer = 0;
      this.state.farmPlots.set(String(i), plot);
    }
    this.roomLogger.debug({ event: "farm_plots_initialized", count: 15 }, "Initialized farm plots");
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

  private initializeLampposts(): void {
    for (let i = 0; i < 8; i++) {
      const lamppost = new Lamppost();
      lamppost.index = i;
      lamppost.lightOn = true;
      this.state.lampposts.set(String(i), lamppost);
    }
    this.roomLogger.debug({ event: "lampposts_initialized", count: 8 }, "Initialized lampposts");
  }

  private initializeFruitTrees(): void {
    this.FRUIT_TREE_DATA.forEach((data, i) => {
      const tree = new FruitTree();
      tree.index = i;
      tree.treeType = data.type;
      tree.x = data.x;
      tree.y = data.y;
      tree.hasFruit = true;
      tree.fruitTimer = 0;
      this.state.fruitTrees.set(String(i), tree);
    });
    this.roomLogger.debug({ event: "fruit_trees_initialized", count: 4 }, "Initialized fruit trees");
  }

  // ===== World Update Loop =====

  private startWorldUpdateLoop(): void {
    // Update every 100ms (10 FPS for world state)
    this.worldUpdateInterval = setInterval(() => {
      const deltaMs = 100;
      this.updatePlantGrowth(deltaMs);
      this.updateWaterStatus();
      this.updateHazards();
      this.updateFruitRegrowth(deltaMs);
      this.updateSeedRespawns(deltaMs);
      this.updateNPCPositions();
    }, 100);
  }

  private updatePlantGrowth(deltaMs: number): void {
    this.state.farmPlots.forEach((plot) => {
      if (plot.state === "planted" || plot.state === "growing") {
        // Only grow if watered and no hazards
        if (!plot.isWatered || plot.hazard) {
          return; // Paused growth
        }

        // Check if last actor was druid for growth bonus
        const lastPlayer = this.state.players.get(plot.lastActionBy);
        const multiplier = lastPlayer?.playerClass === "druid" ? 1.2 : 1.0;

        plot.growthTimer += deltaMs * multiplier;

        // Get crop-specific growth time (default 8000 for unknown crops)
        const growthTime = this.CROP_GROWTH_TIMES[plot.crop] || 8000;
        const plantedThreshold = growthTime * 0.375; // ~3000/8000 ratio

        if (plot.state === "planted" && plot.growthTimer >= plantedThreshold) {
          plot.state = "growing";
        } else if (plot.state === "growing" && plot.growthTimer >= growthTime) {
          plot.state = "ready";
        }
      }
    });
  }

  private updateWaterStatus(): void {
    const currentTime = this.state.gameTime;

    this.state.farmPlots.forEach((plot) => {
      // Only check plants that need water
      if (plot.state !== "planted" && plot.state !== "growing") {
        return;
      }

      if (plot.isWatered && plot.lastWateredTime > 0) {
        // Check if plant has gone too long without water
        const timeSinceWatered = currentTime - plot.lastWateredTime;

        // Handle day wraparound (if current time < lastWatered, a day passed)
        const adjustedTime = timeSinceWatered < 0
          ? timeSinceWatered + this.GAME_DAY_MINUTES
          : timeSinceWatered;

        if (adjustedTime > this.WILT_THRESHOLD) {
          // Plant wilts from lack of water
          plot.state = "wilted";
          plot.isWatered = false;
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "plant_wilted", plotIndex: plot.index },
            "Plant wilted from lack of water"
          );
        }
      }
    });
  }

  private updateHazards(): void {
    const hour = Math.floor(this.state.gameTime / 60) % 24;

    // Only check once per game hour
    if (hour === this.lastHazardCheckHour) {
      return;
    }
    this.lastHazardCheckHour = hour;

    this.state.farmPlots.forEach((plot) => {
      // Don't add hazards to plots that already have them
      if (plot.hazard) return;

      if (Math.random() < this.HAZARD_CHANCE_PER_HOUR) {
        if (plot.state === "tilled") {
          // Weeds on empty tilled plots
          plot.hazard = "weeds";
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "hazard_spawned", plotIndex: plot.index, hazard: "weeds" },
            "Weeds spawned on plot"
          );
        } else if (plot.state === "planted" || plot.state === "growing") {
          // Bugs on planted plots
          plot.hazard = "bugs";
          this.debouncedPersist();
          this.roomLogger.debug(
            { event: "hazard_spawned", plotIndex: plot.index, hazard: "bugs" },
            "Bugs spawned on plot"
          );
        }
      }
    });
  }

  private updateFruitRegrowth(deltaMs: number): void {
    this.state.fruitTrees.forEach((tree) => {
      if (!tree.hasFruit && tree.fruitTimer > 0) {
        tree.fruitTimer -= deltaMs;
        if (tree.fruitTimer <= 0) {
          tree.hasFruit = true;
          tree.fruitTimer = 0;
          this.roomLogger.debug(
            { event: "fruit_regrown", treeIndex: tree.index, treeType: tree.treeType },
            "Fruit regrown on tree"
          );
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

  private handleToggleLamppost(client: Client, message: LamppostToggleMessage): void {
    const lamppost = this.state.lampposts.get(String(message.lamppostIndex));
    if (!lamppost) {
      return;
    }

    lamppost.lightOn = !lamppost.lightOn;
    this.roomLogger.debug(
      { event: "lamppost_toggled", lamppostIndex: message.lamppostIndex, lightOn: lamppost.lightOn, sessionId: client.sessionId },
      "Lamppost toggled"
    );
  }

  private handleWaterAction(client: Client, message: WaterActionMessage): void {
    const plot = this.state.farmPlots.get(String(message.plotIndex));
    if (!plot) {
      return;
    }

    // Can only water planted or growing crops
    if (plot.state !== "planted" && plot.state !== "growing") {
      return;
    }

    plot.isWatered = true;
    plot.lastWateredTime = this.state.gameTime;
    this.debouncedPersist();
    this.roomLogger.debug(
      { event: "plot_watered", plotIndex: message.plotIndex, sessionId: client.sessionId },
      "Plot watered"
    );
  }

  private handleRemoveHazard(client: Client, message: RemoveHazardMessage): void {
    const plot = this.state.farmPlots.get(String(message.plotIndex));
    if (!plot || !plot.hazard) {
      return;
    }

    const hazardType = plot.hazard;
    plot.hazard = "";

    // If removing a dead plant, reset to grass
    if (plot.state === "wilted" || plot.state === "dead") {
      plot.state = "grass";
      plot.crop = "";
      plot.growthTimer = 0;
      plot.isWatered = false;
      plot.lastWateredTime = 0;
    }

    this.debouncedPersist();
    this.roomLogger.debug(
      { event: "hazard_removed", plotIndex: message.plotIndex, hazardType, sessionId: client.sessionId },
      "Hazard removed from plot"
    );
  }

  private handleHarvestFruit(client: Client, message: HarvestFruitMessage): void {
    const tree = this.state.fruitTrees.get(String(message.treeIndex));
    if (!tree || !tree.hasFruit) {
      return;
    }

    // Broadcast harvest event so client can add to inventory
    this.broadcast("fruitHarvested", {
      treeIndex: message.treeIndex,
      fruitType: tree.treeType,
      harvestedBy: client.sessionId,
    });

    tree.hasFruit = false;
    tree.fruitTimer = this.FRUIT_REGROW_TIMES[tree.treeType] || 60000;
    tree.lastHarvestedBy = client.sessionId;
    this.roomLogger.debug(
      { event: "fruit_harvested", treeIndex: message.treeIndex, fruitType: tree.treeType, sessionId: client.sessionId },
      "Fruit harvested"
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
        plot.isWatered = plotData.isWatered ?? false;
        plot.lastWateredTime = plotData.lastWateredTime ?? 0;
        plot.hazard = plotData.hazard ?? "";
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

    // Apply fruit tree states
    saved.fruitTrees?.forEach((treeData) => {
      const tree = this.state.fruitTrees.get(String(treeData.index));
      if (tree) {
        tree.hasFruit = treeData.hasFruit;
        tree.fruitTimer = treeData.fruitTimer;
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
      fruitTrees: [],
      gameTime: this.state.gameTime,
      lastSaved: Date.now(),
    };

    this.state.farmPlots.forEach((plot) => {
      state.farmPlots.push({
        index: plot.index,
        state: plot.state,
        crop: plot.crop,
        growthTimer: plot.growthTimer,
        isWatered: plot.isWatered,
        lastWateredTime: plot.lastWateredTime,
        hazard: plot.hazard,
      });
    });

    this.state.seedPickups.forEach((pickup) => {
      state.seedPickups.push({
        index: pickup.index,
        isCollected: pickup.isCollected,
        respawnTimer: pickup.respawnTimer,
      });
    });

    this.state.fruitTrees.forEach((tree) => {
      state.fruitTrees!.push({
        index: tree.index,
        hasFruit: tree.hasFruit,
        fruitTimer: tree.fruitTimer,
      });
    });

    saveWorldState(state);
  }
}
