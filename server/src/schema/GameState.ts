import { Schema, type, MapSchema } from "@colyseus/schema";

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

  @type("number")
  gameTime: number = 480; // 8:00 AM (480 minutes from midnight)

  @type("number")
  timeSpeed: number = 0.5;
}
