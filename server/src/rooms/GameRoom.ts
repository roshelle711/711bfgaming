import { Room, Client } from "colyseus";
import { GameState, Player } from "../schema/GameState";

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

  onCreate(options: any): void {
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

    console.log("GameRoom created!");
  }

  onJoin(client: Client, options: PlayerOptions): void {
    console.log(`Player ${client.sessionId} joined!`);

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
  }

  onLeave(client: Client, consented: boolean): void {
    console.log(`Player ${client.sessionId} left!`);
    this.state.players.delete(client.sessionId);
  }

  onDispose(): void {
    console.log("GameRoom disposed!");
    if (this.gameTimeInterval) {
      clearInterval(this.gameTimeInterval);
      this.gameTimeInterval = null;
    }
  }

  private handleMove(client: Client, message: MoveMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.x = message.x;
      player.y = message.y;
      player.velocityX = message.velocityX;
      player.velocityY = message.velocityY;
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
