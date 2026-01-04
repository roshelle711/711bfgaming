# 711BF Gaming - Module Reference

Quick lookup: which module to read/edit for each feature.

## Module Structure
```
prototype/
├── game.js           # Main entry - Phaser lifecycle, orchestration
├── MODULES.md        # This file
└── modules/
    ├── config.js     # Constants, class/pet definitions, prices
    ├── state.js      # Centralized game state object
    ├── utils.js      # Time formatting, day phase, helpers
    ├── player.js     # Character creation, movement, pets
    ├── world.js      # Buildings, farm plots, NPCs, environment
    ├── ui.js         # Dialogs, menus, character creation screen
    ├── systems.js    # Farming, fishing, cooking, shop
    └── multiplayer.js # Colyseus connection, player sync
```

## Feature → Module Lookup

### Core
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Phaser lifecycle | game.js | preload, create, update |
| Game constants | config.js | classes, petTypes, recipes, sellPrices |
| Runtime state | state.js | GameState object |
| Time helpers | utils.js | getTimeString, getDayPhase, lerp |

### Player
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Character rendering | player.js | createWhimsicalCharacter |
| Pet system | player.js | createPet, updatePetFollow |
| Movement physics | player.js | updatePlayerMovement |
| Sparkle effects | player.js | updatePlayerSparkles |

### World
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Buildings | world.js | createHouse |
| Farm plots | world.js | createFarmPlot, drawPlot, drawPlant |
| Seed pickups | world.js | createSeedPickup, drawSeedPickup |
| NPCs | world.js | createNPCs, updateNPCPatrol |

### Gameplay
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Farming | systems.js | hoePlot, plantSeed, harvestCrop |
| Plant growth | systems.js | updatePlantGrowth |
| Fishing | systems.js | startFishing, updateFishing |
| Cooking/crafting | systems.js | craftItem, showCraftingMenu |
| Shop/selling | systems.js | sellItem, showShopMenu |
| Seed collection | systems.js | checkSeedPickups, respawnSeedPickups |

### UI
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Dialog boxes | ui.js | showDialog, closeDialog |
| Character creation | ui.js | showCharacterCreation |
| Inventory HUD | ui.js | updateInventoryDisplay |
| Coin display | ui.js | updateCoinDisplay |
| Seed indicator | ui.js | updateSeedIndicator |
| Setup all UI | ui.js | setupUI |

### Multiplayer
| Feature | Module | Key Exports |
|---------|--------|-------------|
| Server connection | multiplayer.js | connectToServer, disconnectFromServer |
| Other players | multiplayer.js | createOtherPlayer |
| Position sync | multiplayer.js | sendPositionToServer, interpolateOtherPlayers |

## Common Workflows

### Add a new character class
1. Edit `config.js` → add to `classes` object
2. Edit `player.js` → add class accessories in `createWhimsicalCharacter`

### Add a new recipe
1. Edit `config.js` → add to `recipes` and `sellPrices`
2. Edit `systems.js` → update `showCraftingMenu` display

### Add a new building/NPC
1. Edit `world.js` → add to world setup or `createNPCs`
2. Edit `config.js` → if NPC has patrol points

### Fix a movement bug
1. Check `player.js` → `updatePlayerMovement`
2. Check `state.js` → movement-related state

### Debug multiplayer
1. Check `multiplayer.js` → connection and sync functions
2. Check server logs for events

## State Reference

All runtime state lives in `GameState` (state.js):

```javascript
GameState = {
  // Player & entities
  player, playerPet, npc, shopkeeper,

  // Identity
  playerClass, playerName, customization,

  // Economy
  inventory, coins,

  // Time
  gameTime, timeSpeed, isNight,

  // World
  farmPlots, seedPickups, interactables,

  // Multiplayer
  room, otherPlayers, lastSentVelocity,

  // Input
  cursors, wasd, interactKey, hoeKey, plantKey, tabKey, fishKey, craftKey,

  // UI
  dialogBox, dialogText, interactPrompt, farmPrompt, fishingPrompt,
  inventoryDisplay, seedIndicator, coinDisplay, dayOverlay, timeDisplay
}
```
