import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * Farm plot state synced between all players
 */
export class FarmPlot extends Schema {
  @type("number")
  index: number = 0; // 0-7 for 8 plots

  @type("string")
  state: string = "grass"; // grass | tilled | planted | growing | ready

  @type("string")
  crop: string = ""; // "" | carrot | tomato | flower

  @type("number")
  growthTimer: number = 0; // 0-8000ms

  @type("string")
  lastActionBy: string = ""; // sessionId of player who last interacted
}

/**
 * NPC position synced between all players
 */
export class NPC extends Schema {
  @type("string")
  id: string = ""; // "mira" | "finn"

  @type("number")
  x: number = 0;

  @type("number")
  y: number = 0;

  @type("string")
  currentAction: string = "idle"; // idle | patrol | home
}

/**
 * Seed pickup state synced between all players
 */
export class SeedPickup extends Schema {
  @type("number")
  index: number = 0; // 0-2 for 3 pickups

  @type("number")
  x: number = 0;

  @type("number")
  y: number = 0;

  @type("string")
  seedType: string = ""; // carrot | tomato | flower

  @type("boolean")
  isCollected: boolean = false;

  @type("number")
  respawnTimer: number = 0; // countdown to respawn (ms)

  @type("string")
  collectedBy: string = ""; // sessionId who collected
}

export class Player extends Schema {
  @type("string")
  id: string = "";

  @type("string")
  sessionId: string = "";

  @type("string")
  name: string = "Player";

  @type("string")
  playerClass: string = "druid";

  @type("number")
  x: number = 600;

  @type("number")
  y: number = 400;

  @type("number")
  velocityX: number = 0;

  @type("number")
  velocityY: number = 0;

  @type("string")
  gender: string = "female";

  @type("number")
  skinTone: number = 0;

  @type("number")
  hairColor: number = 0;

  @type("string")
  pet: string = "cat";
}

export class GameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type({ map: FarmPlot })
  farmPlots = new MapSchema<FarmPlot>();

  @type({ map: NPC })
  npcs = new MapSchema<NPC>();

  @type({ map: SeedPickup })
  seedPickups = new MapSchema<SeedPickup>();

  @type("number")
  gameTime: number = 480; // 8:00 AM (480 minutes from midnight)

  @type("number")
  timeSpeed: number = 0.5;
}
