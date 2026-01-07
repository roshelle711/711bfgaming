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
            copper_ore: { min: 1, max: 1, chance: 0.40 },  // Common ore
            iron_ore: { min: 1, max: 1, chance: 0.20 },    // Uncommon ore
            gem: { min: 1, max: 1, chance: 0.05 }
        },
        respawnTime: 15000    // 15 seconds
    }
};

// Resource data - emojis and sell prices
export const resourceData = {
    wood: { emoji: '🪵', sellPrice: 5 },
    stone: { emoji: '🪨', sellPrice: 3 },
    fiber: { emoji: '🌿', sellPrice: 2 },
    copper_ore: { emoji: '🟤', sellPrice: 10 },
    iron_ore: { emoji: '�ite', sellPrice: 18 },
    copper_ingot: { emoji: '🥉', sellPrice: 18 },
    iron_ingot: { emoji: '🪙', sellPrice: 30 },
    gem: { emoji: '💎', sellPrice: 50 },
    blacksmith_hammer: { emoji: '🔨', sellPrice: 25 },
    honey: { emoji: '🍯', sellPrice: 35 }
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

// Alchemy ingredient types
export const ingredientTypes = ['herb_red', 'herb_blue', 'herb_green', 'mushroom', 'water_bottle'];

// Alchemy ingredient data - for spawning/buying/selling
export const ingredientData = {
    herb_red:     { emoji: '🌿', sellPrice: 8,  buyPrice: 5,  color: 0xE74C3C, name: 'Red Herb' },
    herb_blue:    { emoji: '🌿', sellPrice: 8,  buyPrice: 5,  color: 0x3498DB, name: 'Blue Herb' },
    herb_green:   { emoji: '🌿', sellPrice: 6,  buyPrice: 3,  color: 0x27AE60, name: 'Green Herb' },
    mushroom:     { emoji: '🍄', sellPrice: 12, buyPrice: 8,  color: 0x8E44AD, name: 'Mushroom' },
    water_bottle: { emoji: '🧴', sellPrice: 2,  buyPrice: 1,  color: 0x85C1E9, name: 'Water Bottle' }
};

// Potion data - effects and values
export const potionData = {
    health_potion_small:  { emoji: '❤️', sellPrice: 25, effect: 'health',  amount: 20, name: 'Small Health Potion' },
    mana_potion_small:    { emoji: '💙', sellPrice: 25, effect: 'mana',    amount: 20, name: 'Small Mana Potion' },
    stamina_potion_small: { emoji: '💚', sellPrice: 25, effect: 'stamina', amount: 20, name: 'Small Stamina Potion' },
    speed_potion:         { emoji: '💨', sellPrice: 40, effect: 'speed',   amount: 1.5, name: 'Speed Potion' }
};

// Dye data
export const dyeData = {
    dye_red:    { emoji: '🔴', sellPrice: 15, color: 0xE74C3C, name: 'Red Dye' },
    dye_blue:   { emoji: '🔵', sellPrice: 15, color: 0x3498DB, name: 'Blue Dye' },
    dye_green:  { emoji: '🟢', sellPrice: 15, color: 0x27AE60, name: 'Green Dye' },
    dye_yellow: { emoji: '🟡', sellPrice: 15, color: 0xF1C40F, name: 'Yellow Dye' }
};

// Outfit data - cozy skill gear
export const outfitData = {
    // Fisher Set
    fisher_hat: {
        slot: 'hat', setId: 'fisher', dyeable: true,
        bonuses: { fishingBiteChance: 0.03 },
        emoji: '🎣', name: 'Fisher Hat', sellPrice: 30
    },
    fisher_vest: {
        slot: 'top', setId: 'fisher', dyeable: true,
        bonuses: { fishingBiteChance: 0.03 },
        emoji: '🦺', name: 'Fisher Vest', sellPrice: 45
    },
    fisher_pants: {
        slot: 'bottom', setId: 'fisher', dyeable: true,
        bonuses: { fishingBiteChance: 0.02 },
        emoji: '👖', name: 'Fisher Pants', sellPrice: 40
    },
    // Chef Set
    chef_hat: {
        slot: 'hat', setId: 'chef', dyeable: false,
        bonuses: { cookTimeMultiplier: 0.95 },
        emoji: '👨‍🍳', name: 'Chef Hat', sellPrice: 30
    },
    chef_apron: {
        slot: 'top', setId: 'chef', dyeable: true,
        bonuses: { cookTimeMultiplier: 0.95 },
        emoji: '🧑‍🍳', name: 'Chef Apron', sellPrice: 45
    },
    // Farmer Set
    farmer_hat: {
        slot: 'hat', setId: 'farmer', dyeable: true,
        bonuses: { harvestYieldChance: 0.05 },
        emoji: '👒', name: 'Farmer Hat', sellPrice: 30
    },
    farmer_overalls: {
        slot: 'top', setId: 'farmer', dyeable: true,
        bonuses: { harvestYieldChance: 0.05 },
        emoji: '👕', name: 'Farmer Overalls', sellPrice: 45
    },
    // Alchemist Set
    alchemist_hood: {
        slot: 'hat', setId: 'alchemist', dyeable: true,
        bonuses: { potionPotency: 0.05 },
        emoji: '🧙', name: 'Alchemist Hood', sellPrice: 35
    },
    alchemist_robe: {
        slot: 'top', setId: 'alchemist', dyeable: true,
        bonuses: { potionPotency: 0.05 },
        emoji: '🥼', name: 'Alchemist Robe', sellPrice: 50
    }
};

// Set bonuses - awarded for wearing multiple pieces
export const setData = {
    fisher: {
        name: 'Fisher',
        bonus2pc: { fishingBiteChance: 0.05 },
        bonus3pc: { fishingRareChance: 0.05 }
    },
    chef: {
        name: 'Chef',
        bonus2pc: { cookTimeMultiplier: 0.9 },
        bonus3pc: { extraPortionChance: 0.1 }
    },
    farmer: {
        name: 'Farmer',
        bonus2pc: { harvestYieldChance: 0.1 },
        bonus3pc: { growthSpeedMultiplier: 1.1 }
    },
    alchemist: {
        name: 'Alchemist',
        bonus2pc: { potionPotency: 0.1 },
        bonus3pc: { ingredientSaveChance: 0.15 }
    }
};

// Armor data - combat gear
export const armorData = {
    iron_chest: { slot: 'chest', defense: 5, maxHP: 10, emoji: '🛡️', name: 'Iron Chestplate', sellPrice: 80 },
    iron_legs:  { slot: 'legs',  defense: 3, maxHP: 5,  emoji: '🦿', name: 'Iron Leggings', sellPrice: 60 },
    iron_boots: { slot: 'boots', defense: 2, maxHP: 0,  emoji: '🥾', name: 'Iron Boots', sellPrice: 40 }
};

// Herb spawn positions (in NATURE zone and scattered around map)
export const herbSpawnPositions = [
    // Nature zone (near pond and trees)
    { x: 180, y: 480, type: 'herb_red' },
    { x: 220, y: 550, type: 'herb_blue' },
    { x: 100, y: 600, type: 'herb_green' },
    { x: 280, y: 620, type: 'mushroom' },
    // Near residential
    { x: 350, y: 350, type: 'herb_green' },
    { x: 420, y: 220, type: 'herb_red' },
    // Near alchemy table
    { x: 320, y: 320, type: 'herb_blue' },
    { x: 450, y: 300, type: 'mushroom' },
    // Scattered around map edges
    { x: 80, y: 350, type: 'herb_red' },
    { x: 1350, y: 550, type: 'herb_green' },
    { x: 1300, y: 700, type: 'mushroom' },
    { x: 1100, y: 800, type: 'herb_blue' }
];

// Grass/weed spawn positions for fiber (scattered around nature areas)
export const grassSpawnPositions = [
    // Nature zone (near pond and trees)
    { x: 140, y: 500 },
    { x: 200, y: 620 },
    { x: 260, y: 520 },
    { x: 320, y: 580 },
    // Near farm area edges
    { x: 550, y: 650 },
    { x: 620, y: 700 },
    { x: 680, y: 650 },
    // Near orchard
    { x: 980, y: 650 },
    { x: 1100, y: 780 },
    { x: 1280, y: 650 },
    // Scattered around map edges
    { x: 60, y: 400 },
    { x: 1350, y: 480 },
    { x: 800, y: 820 }
];

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

// === UNIFIED TREE SYSTEM ===

// Tree lifecycle constants
export const TREE_LIFECYCLE_DAYS = 10;
export const TREE_STAGE_THRESHOLDS = { sapling: 0, young: 3, mature: 5, old: 8, fallen: 10 };
export const FALLEN_WOOD_MULTIPLIER = 10;
export const YOUNG_YIELD_MULTIPLIER = 0.5;
export const OLD_FRUIT_MULTIPLIER = 0.75;

// Season constants
export const SEASON_OPTIONS = [1, 7, 14, 30];  // Days per season
export const DEFAULT_SEASON_LENGTH = 7;
export const SEASONS = ['spring', 'summer', 'fall', 'winter'];

// Time speed settings (game minutes per real second)
// Formula: 1440 game min / timeSpeed = real seconds per game day
export const TIME_SPEED_OPTIONS = {
    relaxed: { speed: 2.4, label: 'Relaxed', desc: '10 min/day' },    // 1440/2.4 = 600s = 10 min
    normal: { speed: 4.8, label: 'Normal', desc: '5 min/day' },       // 1440/4.8 = 300s = 5 min
    fast: { speed: 12, label: 'Fast', desc: '2 min/day' },            // 1440/12 = 120s = 2 min
    hyper: { speed: 48, label: 'Hyper', desc: '30 sec/day' }          // 1440/48 = 30s
};
export const DEFAULT_TIME_SPEED = 'normal';

// Game presets - combined settings for different play styles
export const GAME_PRESETS = {
    quickTest: {
        label: 'Quick Test',
        desc: 'Fast days, rapid seasons - great for testing',
        timeSpeed: 'hyper',
        seasonLength: 1
    },
    balanced: {
        label: 'Balanced',
        desc: 'Moderate pace - good for normal play',
        timeSpeed: 'normal',
        seasonLength: 7
    },
    immersive: {
        label: 'Immersive',
        desc: 'Slow days, long seasons - relaxed experience',
        timeSpeed: 'relaxed',
        seasonLength: 14
    },
    custom: {
        label: 'Custom',
        desc: 'Choose your own settings below',
        timeSpeed: null,
        seasonLength: null
    }
};

// Bee constants
export const MAX_BEES = 6;
export const HIVE_CREATION_CHANCE = 0.2;
export const MAX_HIVE_HONEY = 3;

// Unified tree data - fruit trees AND wood trees
export const treeData = {
    // Fruit trees - yield fruit + wood
    apple_tree: {
        name: 'Apple Tree', emoji: '🍎', category: 'fruit',
        fruit: 'apple', seed: 'apple_seed',
        baseWood: 3, baseFruit: 2,
        canopyColor: { spring: 0x90EE90, summer: 0x228B22, fall: 0xDAA520, winter: 0x8B7355 },
        blossomColor: 0xFFB6C1,  // Light pink blossoms in spring
        deciduous: true
    },
    orange_tree: {
        name: 'Orange Tree', emoji: '🍊', category: 'fruit',
        fruit: 'orange', seed: 'orange_seed',
        baseWood: 3, baseFruit: 2,
        canopyColor: { spring: 0x90EE90, summer: 0x228B22, fall: 0xCD853F, winter: 0x8B7355 },
        blossomColor: 0xFFFFFF,  // White blossoms
        deciduous: true
    },
    cherry_tree: {
        name: 'Cherry Tree', emoji: '🍒', category: 'fruit',
        fruit: 'cherry', seed: 'cherry_seed',
        baseWood: 2, baseFruit: 3,
        canopyColor: { spring: 0x98FB98, summer: 0x228B22, fall: 0xDC143C, winter: 0x8B7355 },
        blossomColor: 0xFFB7C5,  // Cherry blossom pink
        deciduous: true
    },
    peach_tree: {
        name: 'Peach Tree', emoji: '🍑', category: 'fruit',
        fruit: 'peach', seed: 'peach_seed',
        baseWood: 3, baseFruit: 2,
        canopyColor: { spring: 0x90EE90, summer: 0x228B22, fall: 0xFFD700, winter: 0x8B7355 },
        blossomColor: 0xFFDAB9,  // Peach blossoms
        deciduous: true
    },
    // Wood trees - yield wood only
    oak_tree: {
        name: 'Oak Tree', emoji: '🌳', category: 'wood',
        fruit: null, seed: 'acorn',
        baseWood: 4, baseFruit: 0,
        canopyColor: { spring: 0x98FB98, summer: 0x2E8B57, fall: 0xCD853F, winter: 0x8B8378 },
        blossomColor: null,
        deciduous: true
    },
    pine_tree: {
        name: 'Pine Tree', emoji: '🌲', category: 'wood',
        fruit: null, seed: 'pinecone',
        baseWood: 5, baseFruit: 0,
        canopyColor: { spring: 0x228B22, summer: 0x006400, fall: 0x228B22, winter: 0x2F4F4F },
        blossomColor: null,
        deciduous: false  // Evergreen - keeps leaves in winter
    },
    birch_tree: {
        name: 'Birch Tree', emoji: '🌳', category: 'wood',
        fruit: null, seed: 'birch_seed',
        baseWood: 3, baseFruit: 0,
        canopyColor: { spring: 0xADFF2F, summer: 0x9ACD32, fall: 0xFFD700, winter: 0xD3D3D3 },
        blossomColor: null,
        deciduous: true,
        trunkColor: 0xFFFAF0  // White birch bark
    }
};

// Seed to tree type mapping - for planting
export const plantableSeeds = {
    apple_seed: 'apple_tree',
    orange_seed: 'orange_tree',
    cherry_seed: 'cherry_tree',
    peach_seed: 'peach_tree',
    acorn: 'oak_tree',
    pinecone: 'pine_tree',
    birch_seed: 'birch_tree'
};

// Seed data for inventory/shop
export const seedData = {
    apple_seed:  { emoji: '🌱', sellPrice: 5,  buyPrice: 15, name: 'Apple Seed' },
    orange_seed: { emoji: '🌱', sellPrice: 6,  buyPrice: 18, name: 'Orange Seed' },
    cherry_seed: { emoji: '🌱', sellPrice: 4,  buyPrice: 12, name: 'Cherry Seed' },
    peach_seed:  { emoji: '🌱', sellPrice: 7,  buyPrice: 20, name: 'Peach Seed' },
    acorn:       { emoji: '🌰', sellPrice: 3,  buyPrice: 10, name: 'Acorn' },
    pinecone:    { emoji: '🌲', sellPrice: 4,  buyPrice: 12, name: 'Pinecone' },
    birch_seed:  { emoji: '🌱', sellPrice: 3,  buyPrice: 10, name: 'Birch Seed' }
};

// Initial tree spawn positions for the unified tree system
export const treeSpawnPositions = [
    // Nature zone (left side)
    { x: 120, y: 450, type: 'oak_tree', stage: 'mature' },
    { x: 80, y: 520, type: 'pine_tree', stage: 'mature' },
    { x: 150, y: 580, type: 'birch_tree', stage: 'mature' },
    // Near residential
    { x: 480, y: 180, type: 'oak_tree', stage: 'old' },
    // Orchard area - fruit trees
    { x: 1050, y: 550, type: 'apple_tree', stage: 'mature' },
    { x: 1220, y: 550, type: 'orange_tree', stage: 'mature' },
    { x: 1050, y: 720, type: 'peach_tree', stage: 'young' },
    { x: 1220, y: 720, type: 'cherry_tree', stage: 'mature' },
    // More trees in orchard edges
    { x: 1300, y: 480, type: 'pine_tree', stage: 'mature' },
    { x: 1320, y: 620, type: 'oak_tree', stage: 'mature' }
];

// Watering and growth constants
export const GAME_DAY_MINUTES = 1440;                    // 24 hours * 60 minutes
export const WILT_THRESHOLD_DAYS = 3;                    // Days without water before wilting
export const WILT_THRESHOLD = GAME_DAY_MINUTES * WILT_THRESHOLD_DAYS;  // 4320 game minutes
export const HAZARD_CHANCE_PER_HOUR = 0.02;              // 2% chance per plot per game hour

// Crafting station types (cooking + alchemy)
export const craftingStations = {
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
    },
    alchemy_table: {
        name: 'Alchemy Table',
        emoji: '⚗️',
        color: 0x6B4E9E,
        description: 'Brew potions and elixirs'
    },
    tailor_bench: {
        name: 'Tailor Bench',
        emoji: '🧵',
        color: 0xDEB887,
        description: 'Craft outfits and dye clothing'
    },
    forge: {
        name: 'Forge',
        emoji: '🔨',
        color: 0x4A4A4A,
        description: 'Smelt ore and craft armor'
    }
};

// Legacy alias for backwards compatibility
export const cookingStations = craftingStations;

// Crafting station positions
export const craftingStationPositions = [
    // Cooking stations (COMMERCIAL zone, below General Store)
    { x: 1050, y: 320, type: 'campfire' },
    { x: 1150, y: 320, type: 'stove' },
    { x: 1250, y: 320, type: 'oven' },
    // Craft Corner (near nature zone / residential)
    { x: 380, y: 280, type: 'alchemy_table' },
    { x: 480, y: 280, type: 'tailor_bench' },
    { x: 580, y: 280, type: 'forge' }
];

// Legacy alias
export const cookingStationPositions = craftingStationPositions;

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
    pumpkinPie: { ingredients: { pumpkin: 1, cherry: 1 }, sellPrice: 90, station: 'oven', cookTime: 4000, emoji: '🎃' },

    // Alchemy table recipes (potions)
    health_potion_small: { ingredients: { herb_red: 2, water_bottle: 1 }, sellPrice: 25, station: 'alchemy_table', cookTime: 2000, emoji: '❤️' },
    mana_potion_small: { ingredients: { herb_blue: 2, water_bottle: 1 }, sellPrice: 25, station: 'alchemy_table', cookTime: 2000, emoji: '💙' },
    stamina_potion_small: { ingredients: { herb_green: 2, water_bottle: 1 }, sellPrice: 25, station: 'alchemy_table', cookTime: 2000, emoji: '💚' },
    speed_potion: { ingredients: { herb_green: 1, herb_blue: 1, mushroom: 1 }, sellPrice: 40, station: 'alchemy_table', cookTime: 3000, emoji: '💨' },

    // Tailor bench recipes (dyes)
    dye_red: { ingredients: { flower: 3 }, sellPrice: 15, station: 'tailor_bench', cookTime: 1000, result: 'dyes', emoji: '🔴' },
    dye_blue: { ingredients: { herb_blue: 2 }, sellPrice: 15, station: 'tailor_bench', cookTime: 1000, result: 'dyes', emoji: '🔵' },
    dye_green: { ingredients: { herb_green: 2 }, sellPrice: 15, station: 'tailor_bench', cookTime: 1000, result: 'dyes', emoji: '🟢' },
    dye_yellow: { ingredients: { corn: 2 }, sellPrice: 15, station: 'tailor_bench', cookTime: 1000, result: 'dyes', emoji: '🟡' },

    // Tailor bench recipes (outfits)
    fisher_hat: { ingredients: { fiber: 3 }, sellPrice: 30, station: 'tailor_bench', cookTime: 2000, result: 'outfits', emoji: '🎣' },
    fisher_vest: { ingredients: { fiber: 5 }, sellPrice: 45, station: 'tailor_bench', cookTime: 3000, result: 'outfits', emoji: '🦺' },
    fisher_pants: { ingredients: { fiber: 4 }, sellPrice: 40, station: 'tailor_bench', cookTime: 2500, result: 'outfits', emoji: '👖' },
    chef_hat: { ingredients: { fiber: 3 }, sellPrice: 30, station: 'tailor_bench', cookTime: 2000, result: 'outfits', emoji: '👨‍🍳' },
    chef_apron: { ingredients: { fiber: 5 }, sellPrice: 45, station: 'tailor_bench', cookTime: 3000, result: 'outfits', emoji: '🧑‍🍳' },
    farmer_hat: { ingredients: { fiber: 3 }, sellPrice: 30, station: 'tailor_bench', cookTime: 2000, result: 'outfits', emoji: '👒' },
    farmer_overalls: { ingredients: { fiber: 5 }, sellPrice: 45, station: 'tailor_bench', cookTime: 3000, result: 'outfits', emoji: '👕' },
    alchemist_hood: { ingredients: { fiber: 4, herb_blue: 1 }, sellPrice: 35, station: 'tailor_bench', cookTime: 2500, result: 'outfits', emoji: '🧙' },
    alchemist_robe: { ingredients: { fiber: 6, herb_red: 1 }, sellPrice: 50, station: 'tailor_bench', cookTime: 3500, result: 'outfits', emoji: '🥼' },

    // Forge recipes - basic (no hammer required)
    blacksmith_hammer: { ingredients: { wood: 3, stone: 5 }, sellPrice: 25, station: 'forge', cookTime: 3000, result: 'resources', requiresHammer: false, emoji: '🔨' },
    copper_ingot: { ingredients: { copper_ore: 2 }, sellPrice: 18, station: 'forge', cookTime: 1500, result: 'resources', requiresHammer: false, emoji: '🥉' },
    iron_ingot: { ingredients: { iron_ore: 2 }, sellPrice: 30, station: 'forge', cookTime: 2000, result: 'resources', requiresHammer: false, emoji: '🪙' },

    // Forge recipes - armor (requires hammer)
    iron_chest: { ingredients: { iron_ingot: 5, wood: 2 }, sellPrice: 80, station: 'forge', cookTime: 4000, result: 'armor', requiresHammer: true, emoji: '🛡️' },
    iron_legs: { ingredients: { iron_ingot: 4, wood: 1 }, sellPrice: 60, station: 'forge', cookTime: 3500, result: 'armor', requiresHammer: true, emoji: '🦿' },
    iron_boots: { ingredients: { iron_ingot: 3 }, sellPrice: 40, station: 'forge', cookTime: 3000, result: 'armor', requiresHammer: true, emoji: '🥾' }
};

// Sell prices
export const sellPrices = {
    crops: { carrot: 15, tomato: 20, flower: 25, lettuce: 12, onion: 18, potato: 22, pepper: 30, corn: 35, pumpkin: 50 },
    fruits: { apple: 12, orange: 15, peach: 20, cherry: 8 },
    fish: { bass: 10, salmon: 25, goldfish: 50 },
    ingredients: { herb_red: 8, herb_blue: 8, herb_green: 6, mushroom: 12, water_bottle: 2 },
    potions: { health_potion_small: 25, mana_potion_small: 25, stamina_potion_small: 25, speed_potion: 40 },
    dyes: { dye_red: 15, dye_blue: 15, dye_green: 15, dye_yellow: 15 },
    outfits: {
        fisher_hat: 30, fisher_vest: 45, fisher_pants: 40,
        chef_hat: 30, chef_apron: 45,
        farmer_hat: 30, farmer_overalls: 45,
        alchemist_hood: 35, alchemist_robe: 50
    },
    armor: { iron_chest: 80, iron_legs: 60, iron_boots: 40 },
    crafted: {
        // No-station recipes
        salad: 50, bouquet: 80, magicPotion: 150,
        // Campfire
        grilledFish: 25, grilledSalmon: 45, roastedCorn: 50,
        // Stove
        fishStew: 85, vegetableSoup: 60, friedPotatoes: 55,
        // Oven
        bakedPotato: 35, fruitPie: 70, pumpkinPie: 90,
        // Alchemy
        health_potion_small: 25, mana_potion_small: 25, stamina_potion_small: 25, speed_potion: 40
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
