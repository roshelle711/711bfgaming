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
        seeds: { carrot: 3, tomato: 3, flower: 3 },
        crops: { carrot: 0, tomato: 0, flower: 0 },
        fish: { bass: 0, salmon: 0, goldfish: 0 },
        crafted: { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 }
    },
    coins: 50,

    // Time & day/night
    gameTime: 480,      // Minutes (8:00 AM start)
    timeSpeed: 0.5,
    isNight: false,

    // Farming
    farmPlots: [],
    currentSeedIndex: 0,
    seedPickups: [],

    // Fishing
    isFishing: false,
    fishingTimer: 0,

    // UI state
    isDialogOpen: false,
    craftingOpen: false,
    inventoryOpen: false,
    canInteract: false,
    currentInteractable: null,

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
    interactKey: null,
    hoeKey: null,
    plantKey: null,
    tabKey: null,
    fishKey: null,
    craftKey: null,
    inventoryKey: null,

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
        return saved ? JSON.parse(saved) : [null, null, null];
    } catch (e) {
        return [null, null, null];
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
        customization: { ...GameState.customization }
    };
    savePresets();
}

export function loadPreset(slot) {
    const preset = GameState.characterPresets[slot];
    if (preset) {
        GameState.playerName = preset.name;
        GameState.playerClass = preset.class;
        GameState.customization = { ...preset.customization };
        return true;
    }
    return false;
}

// Reset state for new game (useful for testing)
export function resetState() {
    GameState.inventory = {
        seeds: { carrot: 3, tomato: 3, flower: 3 },
        crops: { carrot: 0, tomato: 0, flower: 0 },
        fish: { bass: 0, salmon: 0, goldfish: 0 },
        crafted: { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 }
    };
    GameState.coins = 50;
    GameState.gameTime = 480;
    GameState.farmPlots = [];
    GameState.seedPickups = [];
    GameState.otherPlayers = {};
}
