import { Room, Client } from "colyseus";
import { Logger } from "pino";
import { GameState, Player } from "../schema/GameState";
import { createRoomLogger, createSessionLogger } from "../utils/logger";

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

export class GameRoom extends Room<GameState> {
  private gameTimeInterval: ReturnType<typeof setInterval> | null = null;
  private roomLogger!: Logger;

  onCreate(options: any): void {
    this.roomLogger = createRoomLogger(this.roomId);

    this.setState(new GameState());

    // Start the game time loop
    this.startGameTimeLoop();

    // Register message handlers
    this.onMessage("move", (client, message: MoveMessage) => {
      this.handleMove(client, message);
    });

    this.onMessage("updateAppearance", (client, message: AppearanceMessage) => {
      this.handleUpdateAppearance(client, message);
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
}
