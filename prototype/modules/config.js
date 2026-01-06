/**
 * config.js - Game constants, class/pet definitions, prices
 *
 * Exports:
 * - classes: 6 character classes with colors, emojis, bonuses
 * - petTypes: 6 pet types (including 'none')
 * - skinTones: 6 skin color options
 * - hairColors: 10 hair color options
 * - recipes: 4 crafting recipes with ingredients
 * - sellPrices: item prices for selling
 * - seedTypes: available seed types
 * - fishTypes: available fish types
 * - SERVER_URL: WebSocket server URL (auto-detected)
 * - GAME_WIDTH, GAME_HEIGHT: canvas dimensions
 */

// Canvas dimensions
export const GAME_WIDTH = 1400;
export const GAME_HEIGHT = 900;

// Tool types with emojis
export const toolTypes = {
    hoe: { emoji: '🔨', name: 'Hoe' },
    wateringCan: { emoji: '💧', name: 'Watering Can' },
    fishingRod: { emoji: '🎣', name: 'Fishing Rod' },
    axe: { emoji: '🪓', name: 'Axe' },
    pickaxe: { emoji: '⛏️', name: 'Pickaxe' }
};

// Resource node types and drop tables
export const resourceNodeTypes = {
    tree: {
        hp: 3,
        color: 0x228B22,      // Forest green
        trunkColor: 0x8B4513, // Saddle brown
        width: 40,
        height: 60,
        emoji: '🌲',
        drops: {
            wood: { min: 1, max: 3, chance: 1.0 }
        },
        respawnTime: 15000    // 15 seconds
    },
    rock: {
        hp: 4,
        color: 0x808080,      // Gray
        highlightColor: 0xA0A0A0,
        width: 35,
        height: 30,
        emoji: '🪨',
        drops: {
            stone: { min: 1, max: 2, chance: 1.0 },
            ore: { min: 1, max: 1, chance: 0.35 },
            gem: { min: 1, max: 1, chance: 0.05 }
        },
        respawnTime: 15000    // 15 seconds
    }
};

// Resource data - emojis and sell prices
export const resourceData = {
    wood: { emoji: '🪵', sellPrice: 5 },
    stone: { emoji: '🪨', sellPrice: 3 },
    ore: { emoji: 'ORE', sellPrice: 15 },
    gem: { emoji: '💎', sellPrice: 50 }
};

// Resource node spawn positions (in NATURE and ORCHARD zones)
export const resourceNodePositions = [
    // Trees in nature zone (left side, away from pond)
    { x: 120, y: 450, type: 'tree' },
    { x: 80, y: 520, type: 'tree' },
    { x: 150, y: 580, type: 'tree' },
    // Trees near residential
    { x: 480, y: 180, type: 'tree' },
    // Rocks scattered around
    { x: 400, y: 380, type: 'rock' },
    { x: 900, y: 420, type: 'rock' },
    { x: 1000, y: 700, type: 'rock' },
    // More trees in orchard area edges
    { x: 1300, y: 480, type: 'tree' },
    { x: 1320, y: 620, type: 'tree' },
];

// Character classes
export const classes = {
    druid: { color: 0x228B22, accent: 0x90EE90, emoji: '🌿', bonus: 'Crops grow 20% faster' },
    shaman: { color: 0x9B59B6, accent: 0xE8DAEF, emoji: '🔮', bonus: 'Better fish catches' },
    warrior: { color: 0xC0392B, accent: 0xF5B7B1, emoji: '⚔️', bonus: 'Faster movement' },
    mage: { color: 0x3498DB, accent: 0xAED6F1, emoji: '✨', bonus: 'Magical sparkles!' },
    priest: { color: 0xF1C40F, accent: 0xFCF3CF, emoji: '🌟', bonus: 'NPCs like you more' },
    hunter: { color: 0x795548, accent: 0xD7CCC8, emoji: '🏹', bonus: 'Find extra seeds' }
};

// Pet types
export const petTypes = {
    cat: { color: 0xF5A623, accent: 0xFFD700, emoji: '🐱', name: 'Cat' },
    dog: { color: 0x8B4513, accent: 0xDEB887, emoji: '🐕', name: 'Dog' },
    bunny: { color: 0xFFFFFF, accent: 0xFFB6C1, emoji: '🐰', name: 'Bunny' },
    bird: { color: 0x5DADE2, accent: 0x85C1E9, emoji: '🐦', name: 'Bird' },
    fox: { color: 0xE67E22, accent: 0xFFFFFF, emoji: '🦊', name: 'Fox' },
    none: { color: 0x666666, accent: 0x888888, emoji: '❌', name: 'No Pet' }
};

// Customization options
export const skinTones = [0xFFDBB4, 0xF5CBA7, 0xE0AC69, 0xC68642, 0x8D5524, 0xD4A574];
export const hairColors = [0x2C1810, 0x4A3728, 0x8B4513, 0xD4A574, 0xE8C07D, 0x1a1a2e, 0x722F37, 0xE91E63, 0x9C27B0, 0x3F51B5];

// Farming & fishing types
export const seedTypes = ['carrot', 'tomato', 'flower', 'lettuce', 'onion', 'potato', 'pepper', 'corn', 'pumpkin'];
export const fishTypes = ['bass', 'salmon', 'goldfish'];
export const fruitTypes = ['apple', 'orange', 'peach', 'cherry'];

// Crop data - growth times (ms), sell prices, and emojis
export const cropData = {
    carrot:   { growthTime: 8000,  sellPrice: 15, emoji: '🥕' },
    tomato:   { growthTime: 8000,  sellPrice: 20, emoji: '🍅' },
    flower:   { growthTime: 8000,  sellPrice: 25, emoji: '🌸' },
    lettuce:  { growthTime: 6000,  sellPrice: 12, emoji: '🥬' },
    onion:    { growthTime: 9000,  sellPrice: 18, emoji: '🧅' },
    potato:   { growthTime: 10000, sellPrice: 22, emoji: '🥔' },
    pepper:   { growthTime: 12000, sellPrice: 30, emoji: '🌶️' },
    corn:     { growthTime: 15000, sellPrice: 35, emoji: '🌽' },
    pumpkin:  { growthTime: 20000, sellPrice: 50, emoji: '🎃' }
};

// Fruit tree data - regrow times (ms), sell prices, and emojis
export const fruitData = {
    apple:  { regrowTime: 60000, sellPrice: 12, emoji: '🍎' },
    orange: { regrowTime: 75000, sellPrice: 15, emoji: '🍊' },
    peach:  { regrowTime: 90000, sellPrice: 20, emoji: '🍑' },
    cherry: { regrowTime: 45000, sellPrice: 8,  emoji: '🍒' }
};

// Fruit tree positions on map - ORCHARD zone (right side, bottom)
export const fruitTreePositions = [
    { x: 1050, y: 550, type: 'apple' },
    { x: 1220, y: 550, type: 'orange' },
    { x: 1050, y: 720, type: 'peach' },
    { x: 1220, y: 720, type: 'cherry' }
];

// Watering and growth constants
export const GAME_DAY_MINUTES = 1440;                    // 24 hours * 60 minutes
export const WILT_THRESHOLD_DAYS = 3;                    // Days without water before wilting
export const WILT_THRESHOLD = GAME_DAY_MINUTES * WILT_THRESHOLD_DAYS;  // 4320 game minutes
export const HAZARD_CHANCE_PER_HOUR = 0.02;              // 2% chance per plot per game hour

// Cooking station types
export const cookingStations = {
    campfire: {
        name: 'Campfire',
        emoji: '🔥',
        color: 0xE25822,
        description: 'Cook fish and roast items'
    },
    stove: {
        name: 'Stove',
        emoji: '🍳',
        color: 0x4A4A4A,
        description: 'Make stews, soups, and fried dishes'
    },
    oven: {
        name: 'Oven',
        emoji: '🧱',
        color: 0x8B4513,
        description: 'Bake bread, pastries, and casseroles'
    }
};

// Cooking station positions (in COMMERCIAL zone, below General Store)
export const cookingStationPositions = [
    { x: 1050, y: 320, type: 'campfire' },
    { x: 1150, y: 320, type: 'stove' },
    { x: 1250, y: 320, type: 'oven' }
];

// Crafting recipes - now with station requirements
// station: null = can craft anywhere (non-cooking items)
// station: 'campfire' | 'stove' | 'oven' = requires that station
export const recipes = {
    // No station required (crafting table / anywhere)
    salad: { ingredients: { carrot: 1, tomato: 1, lettuce: 1 }, sellPrice: 50, station: null, cookTime: 0, emoji: '🥗' },
    bouquet: { ingredients: { flower: 3 }, sellPrice: 80, station: null, cookTime: 0, emoji: '💐' },
    magicPotion: { ingredients: { flower: 2, goldfish: 1 }, sellPrice: 150, station: null, cookTime: 0, emoji: '🧪' },

    // Campfire recipes (grilled/roasted)
    grilledFish: { ingredients: { bass: 1 }, sellPrice: 25, station: 'campfire', cookTime: 1500, emoji: '🐟' },
    grilledSalmon: { ingredients: { salmon: 1 }, sellPrice: 45, station: 'campfire', cookTime: 2000, emoji: '🍣' },
    roastedCorn: { ingredients: { corn: 1 }, sellPrice: 50, station: 'campfire', cookTime: 1200, emoji: '🌽' },

    // Stove recipes (stews, soups, fried)
    fishStew: { ingredients: { bass: 2, tomato: 1, onion: 1 }, sellPrice: 85, station: 'stove', cookTime: 3000, emoji: '🍲' },
    vegetableSoup: { ingredients: { carrot: 1, potato: 1, onion: 1 }, sellPrice: 60, station: 'stove', cookTime: 2500, emoji: '🥣' },
    friedPotatoes: { ingredients: { potato: 2 }, sellPrice: 55, station: 'stove', cookTime: 2000, emoji: '🍟' },

    // Oven recipes (baked goods)
    bakedPotato: { ingredients: { potato: 1 }, sellPrice: 35, station: 'oven', cookTime: 2000, emoji: '🥔' },
    fruitPie: { ingredients: { apple: 2, cherry: 2 }, sellPrice: 70, station: 'oven', cookTime: 3500, emoji: '🥧' },
    pumpkinPie: { ingredients: { pumpkin: 1, cherry: 1 }, sellPrice: 90, station: 'oven', cookTime: 4000, emoji: '🎃' }
};

// Sell prices
export const sellPrices = {
    crops: { carrot: 15, tomato: 20, flower: 25, lettuce: 12, onion: 18, potato: 22, pepper: 30, corn: 35, pumpkin: 50 },
    fruits: { apple: 12, orange: 15, peach: 20, cherry: 8 },
    fish: { bass: 10, salmon: 25, goldfish: 50 },
    crafted: {
        // No-station recipes
        salad: 50, bouquet: 80, magicPotion: 150,
        // Campfire
        grilledFish: 25, grilledSalmon: 45, roastedCorn: 50,
        // Stove
        fishStew: 85, vegetableSoup: 60, friedPotatoes: 55,
        // Oven
        bakedPotato: 35, fruitPie: 70, pumpkinPie: 90
    }
};

// Buy prices for seeds (at the general store)
export const seedBuyPrices = {
    carrot: 8,    // sells for 15, profit: 7
    tomato: 10,   // sells for 20, profit: 10
    flower: 12,   // sells for 25, profit: 13
    lettuce: 6,   // sells for 12, profit: 6
    onion: 9,     // sells for 18, profit: 9
    potato: 11,   // sells for 22, profit: 11
    pepper: 15,   // sells for 30, profit: 15
    corn: 18,     // sells for 35, profit: 17
    pumpkin: 25   // sells for 50, profit: 25
};

// NPC patrol waypoints - Mira patrols between residential and town center
export const npcPatrolPoints = [
    { x: 300, y: 350 }, { x: 500, y: 350 }, { x: 700, y: 300 },
    { x: 500, y: 400 }, { x: 300, y: 400 }
];
export const miraHome = { x: 200, y: 230 };
export const npcSpeed = 60;

// Movement physics
export const baseSpeed = 200;
export const maxSpeed = 280;
export const acceleration = 15;
export const deceleration = 20;

// Server URL detection - uses WSS with TLS when accessed via game.711bf.org
export const SERVER_URL = (() => {
    const host = window.location.hostname;
    if (host === 'game.711bf.org') {
        return 'wss://ws.game.711bf.org';
    } else if (host === 'localhost' || host === '127.0.0.1') {
        return 'ws://localhost:2567';
    } else {
        // Tailscale IP or other direct access
        return 'ws://100.66.58.107:2567';
    }
})();
