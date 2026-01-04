# 711BF Gaming - Completed Features

## Format
Each entry includes: feature name, completion date, and implementation location for reference.

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
