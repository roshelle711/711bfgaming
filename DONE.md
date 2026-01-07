# 711BF Gaming - Completed Features

## Format
Each entry includes: feature name, completion date, and implementation location for reference.

---

## v11 (2026-01-07)

### Weather System
- [x] **Weather particle effects** - `game.js:1560-1650`
  - Snow in winter (white circles, horizontal drift)
  - Rain in spring (cornflower blue streaks, 60% opacity, 1px x 4)
  - Monsoon mode (royal blue, 75% opacity, 2px x 6, heavy intensity)
  - Randomized spawn Y prevents visible row pattern
- [x] **Weather presets** - `config.js` (WEATHER_PRESETS, WEATHER_INTENSITY_OPTIONS)
  - Auto, Frequent, Rare, Off presets
  - Light, Normal, Heavy intensity options
- [x] **Manual weather toggles** - `game.js:1030-1070`
  - Ctrl+Alt+S (snow), Ctrl+Alt+R (rain), Ctrl+Alt+M (monsoon), Ctrl+Alt+N (none)
- [x] **Weather settings in pause menu** - `ui.js:1220-1270`
  - Preset and intensity dropdowns
  - Hotkey hints displayed

### Time & Season System
- [x] **Configurable game presets** - `config.js` (GAME_PRESETS, TIME_SPEED_OPTIONS)
  - Quick Test (30s day, 1 day/season), Balanced (5m day, 7 days/season)
  - Immersive (10m day, 14 days/season), Custom mode
- [x] **Season length options** - `config.js` (SEASON_OPTIONS: 1, 7, 14, 30 days)
- [x] **Day/night cycle 75%/25%** - `utils.js:getDayPhase`
  - Daytime 6:00-22:00 (16 hours), Nighttime 23:00-5:00 (6 hours)
- [x] **Pause menu with game settings** - `ui.js:1050-1280`
  - Preset selection, time speed, season length controls
  - Depth layered above all other UI (MODAL = 3000)
  - ESC key to toggle

---

## v10 (2026-01-04)

### Code Modularization
- [x] **ES6 module structure** - `prototype/modules/`
  - Split ~1750 line game.js into 8 focused modules
  - config.js: Constants, classes, pets, recipes, prices (~90 lines)
  - state.js: Centralized GameState object, preset management (~130 lines)
  - utils.js: Time formatting, day phase, helpers (~65 lines)
  - player.js: Character creation, movement, pets, sparkles (~290 lines)
  - world.js: Buildings, farm plots, NPCs, environment (~300 lines)
  - ui.js: Dialogs, menus, character creation screen (~380 lines)
  - systems.js: Farming, fishing, cooking, shop mechanics (~290 lines)
  - multiplayer.js: Colyseus connection, player sync (~230 lines)
- [x] **Refactored game.js** - `prototype/game.js` (~290 lines)
  - Main entry point, imports modules, Phaser lifecycle
  - Coordinates module initialization and update loops
- [x] **Module reference doc** - `prototype/MODULES.md`
  - Quick lookup: which module owns which feature
  - Common workflows (add class, fix movement, add recipe, etc.)
  - State reference for GameState object
- [x] **ES6 imports in HTML** - `prototype/index.html`
  - Changed to `type="module"` for ES6 module support

### Bug Fixes
- [x] **WASD input handling** - `player.js:262+`
  - Fixed: Phaser WASD keys use `.W`, `.A`, `.S`, `.D` not `.left`, `.up`, etc.
  - Added guards for undefined input during scene loading
- [x] **NPC nameplate anchoring** - `world.js:214-235`
  - Fixed: Nameplates now added to NPC containers with `npc.add(nameplate)`
  - NPCs set to immovable with `body.setImmovable(true)`

---

## v9 (2026-01-03)

### Multiplayer Foundation (Phase 1)
- [x] **Colyseus server** - `server/src/index.ts`
  - Node.js + TypeScript + Colyseus 0.14.x (matches client SDK)
  - Binds to 0.0.0.0:2567 for Tailscale access
  - Includes Colyseus monitor at /colyseus
- [x] **Game room** - `server/src/rooms/GameRoom.ts`
  - Handles player join/leave
  - Syncs player positions in real-time
  - Shared day/night cycle (gameTime)
- [x] **State schema** - `server/src/schema/GameState.ts`
  - Player: position, velocity, name, class, appearance
  - GameState: players map, gameTime, timeSpeed
- [x] **Client multiplayer** - `prototype/game.js:1526-1600`
  - Connects to Colyseus server via WSS
  - Uses 0.14.x API (assignment-based callbacks)
  - Renders other players with full customization
  - Smooth interpolation for other player movement
  - Graceful fallback to single-player if server unavailable
- [x] **Traefik reverse proxy** - `infrastructure/traefik/`
  - HTTPS via Let's Encrypt certificates
  - `game.711bf.org` → localhost:3000 (Phaser client)
  - `ws.game.711bf.org` → localhost:2567 (WebSocket)
- [x] **Structured logging** - `server/src/utils/logger.ts`
  - Pino logger with pretty-print in dev, JSON in prod
  - Events: server_init, server_started, player_joined, player_left
- [x] **Development scripts** - `scripts/start-dev.ps1`
  - Starts Colyseus, HTTP server, and optionally Traefik
  - `-Traefik` flag for HTTPS mode

### Version Compatibility Notes
- **Client SDK**: colyseus.js 0.14.13 (CDN)
- **Server**: colyseus 0.14.x, @colyseus/schema 1.x
- **API style**: 0.14.x uses assignment (`onAdd =`) not function calls

---

## v8 (2026-01-03)

### Canvas & Display
- [x] **Responsive canvas scaling** - `game.js:10-13` (Phaser.Scale.FIT + autoCenter)
  - Scales to browser window while maintaining 1200x800 game plane
- [x] **Anti-aliasing** - `game.js:21-25` (render config)
  - Smoother graphics with antialias: true, roundPixels: false

### Movement
- [x] **Smooth acceleration** - `game.js:72-82, 1230-1250`
  - Acceleration/deceleration with lerp interpolation (factor: 0.2)
  - Max speed increased to 280

### Character Creation
- [x] **Consolidated single screen** - `game.js:821+` (showCharacterCreation)
  - Class, appearance, pet, and name on one screen
- [x] **Name input field** - `game.js:870-890` (DOM text input)
  - Pre-filled "Roshelle" for development
- [x] **Randomize button** - `game.js:950+`
  - Randomizes class, hair color, and pet
- [x] **3 character presets** - `game.js:66-68, 142-175`
  - localStorage persistence under '711bf_presets' key
- [x] **No Pet option** - `game.js:49` (petTypes.none)

### UI/UX
- [x] **Dynamic dialog boxes** - showDialog function
  - Auto-resize based on text content bounds

### Visuals
- [x] **Varied plant shapes** - drawPlant function
  - Carrots (feathery leaves + orange root)
  - Tomatoes (bushy vine + red fruit)
  - Flowers (petals around center)

---

## v7 (2026-01-03)

### Character System
- [x] **6 character classes** - `game.js:20-27` (classes object with colors, bonuses)
  - Druid (faster crops), Shaman (better fish), Warrior (faster movement)
  - Mage (sparkles), Priest (NPC affinity), Hunter (extra seeds)
- [x] **Feminine/masculine body types** - `game.js:150-186` (createWhimsicalCharacter)
  - Hourglass shape with shoulders, waist, hips, skirt for feminine
  - Rectangular body for masculine
- [x] **Character customization screen** - `game.js:827-928` (showCustomization)
  - 6 skin tones, 10 hair colors, body style toggle
- [x] **Player nameplate** - `game.js:1000-1009` (in startGame)
  - Shows name and class emoji above character
- [x] **Whimsical character design** - Throughout createWhimsicalCharacter
  - Fluffy hair, rosy cheeks, big sparkly eyes, eyelashes

### Pets
- [x] **5 pet types** - `game.js:29-36` (petTypes object)
  - Cat, Dog, Bunny, Bird, Fox with unique designs
- [x] **Pet following behavior** - `game.js:1074-1093` (in update loop)
  - Smooth following with distance-based speed
- [x] **Pet selection screen** - `game.js:930-993` (showPetSelection)

### World
- [x] **Larger game canvas** - `game.js:5-7` (1200x800 config)
- [x] **Day/night cycle** - `game.js:1049-1063`
  - Dawn, day, dusk, night phases with overlay
- [x] **3 buildings** - Mira's cottage, Player home, Shop
- [x] **Fishing pond** - `game.js:644-667`
- [x] **Farm with 8 plots** - `game.js:669-678`
- [x] **Cooking station** - `game.js:680-697`

### Gameplay
- [x] **Farming system** - `game.js:1249-1309`
  - Hoe plots, plant seeds, grow crops, harvest
  - Growth stages: planted → growing → ready
- [x] **Fishing** - `game.js:1113-1134`
  - Press F near pond, random fish types
- [x] **Cooking/crafting** - `game.js:1342-1381`
  - 4 recipes: salad, bouquet, fish stew, magic potion
- [x] **Shop/selling** - `game.js:1312-1340`
  - Sell crops, fish, cooked items for coins
- [x] **Inventory system** - `game.js:81-90`
  - Seeds, crops, fish, crafted items, coins

### NPCs
- [x] **Mira (druid NPC)** - Patrols during day, goes home at night
- [x] **Finn (shopkeeper)** - Stands at shop

---

## v1-v6 (2026-01-02 to 2026-01-03)
*Initial prototypes consolidated above*

---

## Implementation Notes

### Key File Locations
- **Main game**: `prototype/game.js` (~1500 lines)
- **HTML wrapper**: `prototype/index.html`
- **Design doc**: `GAME_IDEAS.md`
- **Tech decisions**: `TECH_NOTES.md`
- **Version scripts**: `scripts/` (new-version.ps1, create-pr.ps1)

### Architecture Patterns
- **Characters**: Phaser containers with physics bodies
- **UI**: Phaser text/rectangles with depth layering
- **State**: Global variables (to be refactored for multiplayer)
- **Input**: WASD + action keys (E, H, P, F, C, TAB)

### Known Technical Debt
- ~~Movement uses instant velocity (no acceleration)~~ Fixed in v8
- ~~Dialog boxes are fixed size~~ Fixed in v8
- ~~No state persistence (localStorage)~~ Fixed in v8 (presets)
- State still uses global variables (for multiplayer refactor later)
