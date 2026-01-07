/**
 * state.js - Centralized game state object
 *
 * Exports:
 * - GameState: All runtime game state (player, inventory, etc.)
 * - loadPresets, savePresets: Character preset management
 * - saveCurrentAsPreset, loadPreset: Preset slot operations
 */

// Centralized game state - all modules read/write from this object
export const GameState = {
    // Phaser scene reference (set by game.js)
    scene: null,

    // Player & NPCs (set by world.js/player.js)
    player: null,
    playerPet: null,
    npc: null,           // Mira
    shopkeeper: null,    // Finn

    // Player identity
    playerClass: 'druid',
    playerName: 'Roshelle',

    // Customization
    customization: {
        skinTone: 0xFFDBB4,
        hairColor: 0x4A3728,
        gender: 'female',
        pet: 'cat'
    },

    // Inventory & economy
    inventory: {
        tools: { hoe: 1, wateringCan: 1, fishingRod: 1, axe: 1, pickaxe: 1 },  // Player starts with basic tools
        seeds: { carrot: 3, tomato: 3, flower: 3, lettuce: 2, onion: 2, potato: 2, pepper: 1, corn: 1, pumpkin: 1 },
        crops: { carrot: 0, tomato: 0, flower: 0, lettuce: 0, onion: 0, potato: 0, pepper: 0, corn: 0, pumpkin: 0 },
        fruits: { apple: 0, orange: 0, peach: 0, cherry: 0 },
        fish: { bass: 0, salmon: 0, goldfish: 0 },
        ingredients: { herb_red: 3, herb_blue: 3, herb_green: 3, mushroom: 2, water_bottle: 5 },  // Starter alchemy mats
        potions: { health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0 },
        crafted: {
            // No-station recipes
            salad: 0, bouquet: 0, magicPotion: 0,
            // Campfire
            grilledFish: 0, grilledSalmon: 0, roastedCorn: 0,
            // Stove
            fishStew: 0, vegetableSoup: 0, friedPotatoes: 0,
            // Oven
            bakedPotato: 0, fruitPie: 0, pumpkinPie: 0,
            // Alchemy
            health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0
        },
        resources: { wood: 0, stone: 0, fiber: 0, copper_ore: 0, iron_ore: 0, copper_ingot: 0, iron_ingot: 0, gem: 0, blacksmith_hammer: 0, honey: 0 },
        treeSeeds: { apple_seed: 0, orange_seed: 0, cherry_seed: 0, peach_seed: 0, acorn: 0, pinecone: 0, birch_seed: 0 },
        dyes: { dye_red: 0, dye_blue: 0, dye_green: 0, dye_yellow: 0 },
        outfits: {},  // Dynamic: { fisher_hat: 1, chef_apron: 1, etc. }
        armor: {}     // Dynamic: { iron_chest: 1, iron_legs: 1, etc. }
    },
    coins: 50,

    // Equipment - worn outfit and armor
    equipment: {
        // Outfit slots (cozy skill gear)
        hat: null,        // { id: 'fisher_hat', color: null }
        top: null,
        bottom: null,
        shoes: null,
        accessory: null,
        // Armor slots (combat gear)
        chest: null,      // { id: 'iron_chest' }
        legs: null,
        boots: null
    },

    // Computed modifiers from equipment (recalculated on equip change)
    playerModifiers: {
        // Skill bonuses (outfit layer)
        fishingBiteChance: 0,
        fishingRareChance: 0,
        cookTimeMultiplier: 1.0,
        extraPortionChance: 0,
        harvestYieldChance: 0,
        growthSpeedMultiplier: 1.0,
        potionPotency: 0,
        ingredientSaveChance: 0,
        dyeYieldChance: 0,
        // Combat stats (armor layer)
        defense: 0,
        maxHP: 0
    },

    // Hotbar system - 5 slots for tools and items
    // type: 'tool' | 'seed' | 'crop' | 'fruit' | 'fish' | 'empty'
    hotbar: [
        { type: 'tool', item: 'hoe', count: 1 },
        { type: 'tool', item: 'wateringCan', count: 1 },
        { type: 'tool', item: 'fishingRod', count: 1 },
        { type: 'tool', item: 'axe', count: 1 },
        { type: 'tool', item: 'pickaxe', count: 1 }
    ],
    activeHotbarSlot: 0,  // Currently selected slot (0-4)

    // Equipped tool (derived from active hotbar slot)
    equippedTool: 'hoe',   // 'none' | 'hoe' | 'wateringCan' | 'fishingRod' | 'axe' | 'pickaxe'
    isWatering: false,     // True during watering animation
    isHoeing: false,       // True during hoeing animation
    isPlanting: false,     // True during planting animation
    isHarvesting: false,   // True during harvesting animation
    isRemoving: false,     // True during hazard removal animation
    actionAnimTimer: 0,    // Animation frame timer (0-1)

    // Cooking stations
    cookingStations: [],           // Array of station objects in the world
    currentStationType: null,      // 'campfire' | 'stove' | 'oven' | null (when not at a station)
    isCooking: false,              // True while cooking timer is active
    cookingTimer: 0,               // Current cooking progress (ms)
    cookingDuration: 0,            // Total cook time for current recipe (ms)
    cookingRecipe: null,           // Currently cooking recipe name

    // Time & day/night
    gameTime: 360,      // Minutes (6:00 AM start - dawn)
    timeSpeed: 4.8,     // Game minutes per real second (see TIME_SPEED_OPTIONS)
    isNight: false,
    day: 1,             // Current game day (starts at 1)
    lastDayUpdate: 0,   // Tracks when day last incremented

    // Settings - time and seasons
    settings: {
        preset: 'balanced',     // 'quickTest' | 'balanced' | 'immersive' | 'custom'
        timeSpeedKey: 'normal', // 'relaxed' | 'normal' | 'fast' | 'hyper'
        seasonLength: 7         // Days per season (1, 7, 14, or 30)
    },

    // Farming
    farmPlots: [],
    currentSeedIndex: 0,
    seedPickups: [],
    fruitTrees: [],       // Legacy fruit tree system (for backwards compatibility)

    // Unified tree system
    trees: [],            // Array of tree objects with lifecycle
    bees: [],             // Array of bee objects

    // Alchemy ingredients
    herbPickups: [],

    // Grass/weeds for fiber
    grassPickups: [],

    // Resource gathering
    resourceNodes: [],

    // Fishing
    isFishing: false,
    fishingTimer: 0,
    fishingCatchTime: 0,
    fishingNotification: null,
    bobberOffset: { x: 0, y: 0 },  // Random offset for each cast

    // UI state
    isDialogOpen: false,
    craftingOpen: false,
    inventoryOpen: false,
    pauseMenuOpen: false,
    canInteract: false,
    currentInteractable: null,
    pauseMenuUI: [],

    // Multiplayer
    room: null,
    otherPlayers: {},   // sessionId -> Phaser container
    lastSentVelocity: { x: 0, y: 0 },

    // Movement
    currentSpeed: 0,
    targetVelocity: { x: 0, y: 0 },
    moveDirection: { x: 0, y: 0 },

    // NPC behavior
    currentPatrolIndex: 0,

    // Input references (set by game.js)
    cursors: null,
    wasd: null,
    interactKey: null,       // E - interact (NPC, shop, lamppost, etc.)
    escapeKey: null,         // ESC - close menus
    tabKey: null,            // TAB - cycle seeds
    inventoryKey: null,      // I - inventory
    hotbarKeys: null,        // 1-5 - hotbar slots
    isHoldingClick: false,   // For hold-to-repeat hoe
    holdRepeatTimer: null,   // Timer for hold-to-repeat

    // Hotbar UI elements (set by ui.js)
    hotbarSlots: null,       // Array of slot UI objects
    hotbarPanel: null,       // Background panel
    targetHighlight: null,   // Graphics for target tile highlight

    // UI elements (set by ui.js)
    interactPrompt: null,
    dialogBox: null,
    dialogText: null,
    farmPrompt: null,
    fishingPrompt: null,
    cookingPrompt: null,
    inventoryPanel: null,
    inventoryTitle: null,
    inventoryCloseHint: null,
    inventoryTooltip: null,
    inventoryIcons: null,
    seedIndicator: null,
    coinDisplay: null,
    dayOverlay: null,
    timeDisplay: null,

    // Character creation UI elements (temporary, cleaned up after start)
    creationUI: [],

    // Interactables list (buildings, NPCs, etc.)
    interactables: [],
    obstacles: null,

    // Character presets (loaded from localStorage)
    characterPresets: null
};

// Initialize presets on load
GameState.characterPresets = loadPresetsFromStorage();

// === PRESET MANAGEMENT ===

function loadPresetsFromStorage() {
    try {
        const saved = localStorage.getItem('711bf_presets');
        const presets = saved ? JSON.parse(saved) : [null, null, null, null, null, null];
        // Ensure we always have 6 slots
        while (presets.length < 6) presets.push(null);
        return presets.slice(0, 6);
    } catch (e) {
        return [null, null, null, null, null, null];
    }
}

export function loadPresets() {
    GameState.characterPresets = loadPresetsFromStorage();
    return GameState.characterPresets;
}

export function savePresets() {
    try {
        localStorage.setItem('711bf_presets', JSON.stringify(GameState.characterPresets));
    } catch (e) {
        console.warn('Could not save presets');
    }
}

export function saveCurrentAsPreset(slot) {
    GameState.characterPresets[slot] = {
        name: GameState.playerName,
        class: GameState.playerClass,
        customization: { ...GameState.customization },
        inventory: {
            seeds: { ...GameState.inventory.seeds },
            crops: { ...GameState.inventory.crops },
            fruits: { ...GameState.inventory.fruits },
            fish: { ...GameState.inventory.fish },
            ingredients: { ...GameState.inventory.ingredients },
            potions: { ...GameState.inventory.potions },
            crafted: { ...GameState.inventory.crafted },
            resources: { ...GameState.inventory.resources },
            treeSeeds: { ...GameState.inventory.treeSeeds },
            dyes: { ...GameState.inventory.dyes },
            outfits: { ...GameState.inventory.outfits },
            armor: { ...GameState.inventory.armor }
        },
        equipment: { ...GameState.equipment },
        coins: GameState.coins
    };
    savePresets();
}

export function loadPreset(slot) {
    const preset = GameState.characterPresets[slot];
    if (preset) {
        GameState.playerName = preset.name;
        GameState.playerClass = preset.class;
        GameState.customization = { ...preset.customization };
        // Load inventory if saved (backwards compatible with old presets)
        if (preset.inventory) {
            GameState.inventory = {
                tools: { hoe: 1, wateringCan: 1, fishingRod: 1, axe: 1, pickaxe: 1 },
                seeds: { ...preset.inventory.seeds },
                crops: { ...preset.inventory.crops },
                fruits: { ...preset.inventory.fruits },
                fish: { ...preset.inventory.fish },
                ingredients: preset.inventory.ingredients ? { ...preset.inventory.ingredients } : { herb_red: 3, herb_blue: 3, herb_green: 3, mushroom: 2, water_bottle: 5 },
                potions: preset.inventory.potions ? { ...preset.inventory.potions } : { health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0 },
                crafted: { ...preset.inventory.crafted },
                resources: preset.inventory.resources ? { ...preset.inventory.resources } : { wood: 0, stone: 0, fiber: 0, copper_ore: 0, iron_ore: 0, copper_ingot: 0, iron_ingot: 0, gem: 0, blacksmith_hammer: 0, honey: 0 },
                treeSeeds: preset.inventory.treeSeeds ? { ...preset.inventory.treeSeeds } : { apple_seed: 0, orange_seed: 0, cherry_seed: 0, peach_seed: 0, acorn: 0, pinecone: 0, birch_seed: 0 },
                dyes: preset.inventory.dyes ? { ...preset.inventory.dyes } : { dye_red: 0, dye_blue: 0, dye_green: 0, dye_yellow: 0 },
                outfits: preset.inventory.outfits ? { ...preset.inventory.outfits } : {},
                armor: preset.inventory.armor ? { ...preset.inventory.armor } : {}
            };
        }
        // Load equipment if saved
        if (preset.equipment) {
            GameState.equipment = { ...preset.equipment };
        }
        if (preset.coins !== undefined) {
            GameState.coins = preset.coins;
        }
        return true;
    }
    return false;
}

export function deletePreset(slot) {
    if (slot >= 0 && slot < GameState.characterPresets.length) {
        GameState.characterPresets[slot] = null;
        savePresets();
        return true;
    }
    return false;
}

// Reset state for new game (useful for testing)
export function resetState() {
    GameState.inventory = {
        tools: { hoe: 1, wateringCan: 1, fishingRod: 1, axe: 1, pickaxe: 1 },
        seeds: { carrot: 3, tomato: 3, flower: 3, lettuce: 2, onion: 2, potato: 2, pepper: 1, corn: 1, pumpkin: 1 },
        crops: { carrot: 0, tomato: 0, flower: 0, lettuce: 0, onion: 0, potato: 0, pepper: 0, corn: 0, pumpkin: 0 },
        fruits: { apple: 0, orange: 0, peach: 0, cherry: 0 },
        fish: { bass: 0, salmon: 0, goldfish: 0 },
        ingredients: { herb_red: 3, herb_blue: 3, herb_green: 3, mushroom: 2, water_bottle: 5 },
        potions: { health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0 },
        crafted: {
            salad: 0, bouquet: 0, magicPotion: 0,
            grilledFish: 0, grilledSalmon: 0, roastedCorn: 0,
            fishStew: 0, vegetableSoup: 0, friedPotatoes: 0,
            bakedPotato: 0, fruitPie: 0, pumpkinPie: 0,
            health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0
        },
        resources: { wood: 0, stone: 0, fiber: 0, copper_ore: 0, iron_ore: 0, copper_ingot: 0, iron_ingot: 0, gem: 0, blacksmith_hammer: 0, honey: 0 },
        treeSeeds: { apple_seed: 0, orange_seed: 0, cherry_seed: 0, peach_seed: 0, acorn: 0, pinecone: 0, birch_seed: 0 },
        dyes: { dye_red: 0, dye_blue: 0, dye_green: 0, dye_yellow: 0 },
        outfits: {},
        armor: {}
    };
    GameState.coins = 50;
    GameState.gameTime = 480;
    GameState.day = 1;
    GameState.lastDayUpdate = 0;
    GameState.farmPlots = [];
    GameState.seedPickups = [];
    GameState.herbPickups = [];
    GameState.grassPickups = [];
    GameState.fruitTrees = [];
    GameState.trees = [];
    GameState.bees = [];
    GameState.resourceNodes = [];
    GameState.cookingStations = [];
    GameState.currentStationType = null;
    GameState.isCooking = false;
    GameState.otherPlayers = {};
    GameState.equippedTool = 'none';
    // Reset equipment
    GameState.equipment = {
        hat: null, top: null, bottom: null, shoes: null, accessory: null,
        chest: null, legs: null, boots: null
    };
    GameState.playerModifiers = {
        fishingBiteChance: 0, fishingRareChance: 0,
        cookTimeMultiplier: 1.0, extraPortionChance: 0,
        harvestYieldChance: 0, growthSpeedMultiplier: 1.0,
        potionPotency: 0, ingredientSaveChance: 0, dyeYieldChance: 0,
        defense: 0, maxHP: 0
    };
}

// === GAME SESSION PERSISTENCE ===

/**
 * Save current game session to localStorage
 * Called automatically when inventory changes
 */
export function saveGameSession() {
    try {
        const sessionData = {
            inventory: {
                seeds: { ...GameState.inventory.seeds },
                crops: { ...GameState.inventory.crops },
                fruits: { ...GameState.inventory.fruits },
                fish: { ...GameState.inventory.fish },
                ingredients: { ...GameState.inventory.ingredients },
                potions: { ...GameState.inventory.potions },
                crafted: { ...GameState.inventory.crafted },
                resources: { ...GameState.inventory.resources },
                treeSeeds: { ...GameState.inventory.treeSeeds },
                dyes: { ...GameState.inventory.dyes },
                outfits: { ...GameState.inventory.outfits },
                armor: { ...GameState.inventory.armor }
            },
            equipment: { ...GameState.equipment },
            coins: GameState.coins,
            gameTime: GameState.gameTime,
            day: GameState.day,
            settings: { ...GameState.settings },
            playerName: GameState.playerName,
            playerClass: GameState.playerClass,
            customization: { ...GameState.customization },
            savedAt: Date.now()
        };
        localStorage.setItem('711bf_session', JSON.stringify(sessionData));
        console.log('[State] Game session saved');
    } catch (e) {
        console.warn('[State] Could not save game session:', e);
    }
}

/**
 * Load saved game session from localStorage
 * Called on game startup
 * @returns {boolean} True if session was loaded
 */
export function loadGameSession() {
    try {
        const saved = localStorage.getItem('711bf_session');
        if (!saved) return false;

        const sessionData = JSON.parse(saved);

        // Restore inventory (with defaults for missing fields)
        if (sessionData.inventory) {
            GameState.inventory = {
                tools: { hoe: 1, wateringCan: 1, fishingRod: 1, axe: 1, pickaxe: 1 },
                seeds: sessionData.inventory.seeds || { carrot: 3, tomato: 3, flower: 3, lettuce: 2, onion: 2, potato: 2, pepper: 1, corn: 1, pumpkin: 1 },
                crops: sessionData.inventory.crops || { carrot: 0, tomato: 0, flower: 0, lettuce: 0, onion: 0, potato: 0, pepper: 0, corn: 0, pumpkin: 0 },
                fruits: sessionData.inventory.fruits || { apple: 0, orange: 0, peach: 0, cherry: 0 },
                fish: sessionData.inventory.fish || { bass: 0, salmon: 0, goldfish: 0 },
                ingredients: sessionData.inventory.ingredients || { herb_red: 3, herb_blue: 3, herb_green: 3, mushroom: 2, water_bottle: 5 },
                potions: sessionData.inventory.potions || { health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0 },
                crafted: {
                    // Defaults for all recipes (new ones will be 0 if not in saved data)
                    salad: 0, bouquet: 0, magicPotion: 0,
                    grilledFish: 0, grilledSalmon: 0, roastedCorn: 0,
                    fishStew: 0, vegetableSoup: 0, friedPotatoes: 0,
                    bakedPotato: 0, fruitPie: 0, pumpkinPie: 0,
                    health_potion_small: 0, mana_potion_small: 0, stamina_potion_small: 0, speed_potion: 0,
                    ...(sessionData.inventory.crafted || {})
                },
                resources: sessionData.inventory.resources || { wood: 0, stone: 0, fiber: 0, copper_ore: 0, iron_ore: 0, copper_ingot: 0, iron_ingot: 0, gem: 0, blacksmith_hammer: 0, honey: 0 },
                treeSeeds: sessionData.inventory.treeSeeds || { apple_seed: 0, orange_seed: 0, cherry_seed: 0, peach_seed: 0, acorn: 0, pinecone: 0, birch_seed: 0 },
                dyes: sessionData.inventory.dyes || { dye_red: 0, dye_blue: 0, dye_green: 0, dye_yellow: 0 },
                outfits: sessionData.inventory.outfits || {},
                armor: sessionData.inventory.armor || {}
            };
        }

        // Restore equipment
        if (sessionData.equipment) {
            GameState.equipment = { ...sessionData.equipment };
        }

        if (sessionData.coins !== undefined) {
            GameState.coins = sessionData.coins;
        }
        if (sessionData.gameTime !== undefined) {
            GameState.gameTime = sessionData.gameTime;
        }
        if (sessionData.day !== undefined) {
            GameState.day = sessionData.day;
        }
        if (sessionData.settings) {
            GameState.settings = { ...sessionData.settings };
            // Apply timeSpeed from settings if present
            if (sessionData.settings.timeSpeedKey) {
                // Import TIME_SPEED_OPTIONS dynamically to avoid circular dependency
                import('./config.js').then(config => {
                    const speedOpt = config.TIME_SPEED_OPTIONS[sessionData.settings.timeSpeedKey];
                    if (speedOpt) {
                        GameState.timeSpeed = speedOpt.speed;
                    }
                });
            }
        }
        if (sessionData.playerName) {
            GameState.playerName = sessionData.playerName;
        }
        if (sessionData.playerClass) {
            GameState.playerClass = sessionData.playerClass;
        }
        if (sessionData.customization) {
            GameState.customization = { ...sessionData.customization };
        }

        console.log('[State] Game session loaded from', new Date(sessionData.savedAt).toLocaleTimeString());
        return true;
    } catch (e) {
        console.warn('[State] Could not load game session:', e);
        return false;
    }
}
