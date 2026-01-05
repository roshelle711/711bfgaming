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
    fishingRod: { emoji: '🎣', name: 'Fishing Rod' }
};

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

// Fruit tree positions on map
export const fruitTreePositions = [
    { x: 100, y: 400, type: 'apple' },
    { x: 150, y: 520, type: 'orange' },
    { x: 1180, y: 380, type: 'peach' },
    { x: 1220, y: 500, type: 'cherry' }
];

// Watering and growth constants
export const GAME_DAY_MINUTES = 1440;                    // 24 hours * 60 minutes
export const WILT_THRESHOLD_DAYS = 3;                    // Days without water before wilting
export const WILT_THRESHOLD = GAME_DAY_MINUTES * WILT_THRESHOLD_DAYS;  // 4320 game minutes
export const HAZARD_CHANCE_PER_HOUR = 0.02;              // 2% chance per plot per game hour

// Crafting recipes
export const recipes = {
    salad: { ingredients: { carrot: 1, tomato: 1 }, sellPrice: 50 },
    bouquet: { ingredients: { flower: 3 }, sellPrice: 80 },
    fishStew: { ingredients: { bass: 2, tomato: 1 }, sellPrice: 75 },
    magicPotion: { ingredients: { flower: 2, goldfish: 1 }, sellPrice: 150 }
};

// Sell prices
export const sellPrices = {
    crops: { carrot: 15, tomato: 20, flower: 25, lettuce: 12, onion: 18, potato: 22, pepper: 30, corn: 35, pumpkin: 50 },
    fruits: { apple: 12, orange: 15, peach: 20, cherry: 8 },
    fish: { bass: 10, salmon: 25, goldfish: 50 },
    crafted: { salad: 50, bouquet: 80, fishStew: 75, magicPotion: 150 }
};

// NPC patrol waypoints - adjusted for larger screen
export const npcPatrolPoints = [
    { x: 450, y: 550 }, { x: 700, y: 500 }, { x: 600, y: 400 },
    { x: 350, y: 450 }, { x: 400, y: 600 }
];
export const miraHome = { x: 235, y: 235 };
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
