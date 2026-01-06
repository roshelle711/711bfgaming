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
        crafted: { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 },
        resources: { wood: 0, stone: 0, ore: 0, gem: 0 }
    },
    coins: 50,

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

    // Time & day/night
    gameTime: 480,      // Minutes (8:00 AM start)
    timeSpeed: 0.5,
    isNight: false,

    // Farming
    farmPlots: [],
    currentSeedIndex: 0,
    seedPickups: [],
    fruitTrees: [],

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
            crafted: { ...GameState.inventory.crafted },
            resources: { ...GameState.inventory.resources }
        },
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
                crafted: { ...preset.inventory.crafted },
                resources: preset.inventory.resources ? { ...preset.inventory.resources } : { wood: 0, stone: 0, ore: 0, gem: 0 }
            };
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
        crafted: { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 },
        resources: { wood: 0, stone: 0, ore: 0, gem: 0 }
    };
    GameState.coins = 50;
    GameState.gameTime = 480;
    GameState.farmPlots = [];
    GameState.seedPickups = [];
    GameState.fruitTrees = [];
    GameState.resourceNodes = [];
    GameState.otherPlayers = {};
    GameState.equippedTool = 'none';
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
                crafted: { ...GameState.inventory.crafted },
                resources: { ...GameState.inventory.resources }
            },
            coins: GameState.coins,
            gameTime: GameState.gameTime,
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
                crafted: sessionData.inventory.crafted || { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 },
                resources: sessionData.inventory.resources || { wood: 0, stone: 0, ore: 0, gem: 0 }
            };
        }

        if (sessionData.coins !== undefined) {
            GameState.coins = sessionData.coins;
        }
        if (sessionData.gameTime !== undefined) {
            GameState.gameTime = sessionData.gameTime;
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
