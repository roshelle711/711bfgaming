// 711BF Gaming - Prototype v9
// Features: Multiplayer! See other players on Tailscale network. Colyseus server backend.

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: false
    },
    scene: { preload, create, update },
    dom: { createContainer: true }
};

const game = new Phaser.Game(config);

// Multiplayer
let room = null;
let otherPlayers = {};  // sessionId -> Phaser container
// Server URL detection: use wss:// when accessed via game.711bf.org, otherwise fall back to local
const SERVER_URL = (() => {
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
let lastSentVelocity = { x: 0, y: 0 };

// Character classes
const classes = {
    druid: { color: 0x228B22, accent: 0x90EE90, emoji: '🌿', bonus: 'Crops grow 20% faster' },
    shaman: { color: 0x9B59B6, accent: 0xE8DAEF, emoji: '🔮', bonus: 'Better fish catches' },
    warrior: { color: 0xC0392B, accent: 0xF5B7B1, emoji: '⚔️', bonus: 'Faster movement' },
    mage: { color: 0x3498DB, accent: 0xAED6F1, emoji: '✨', bonus: 'Magical sparkles!' },
    priest: { color: 0xF1C40F, accent: 0xFCF3CF, emoji: '🌟', bonus: 'NPCs like you more' },
    hunter: { color: 0x795548, accent: 0xD7CCC8, emoji: '🏹', bonus: 'Find extra seeds' }
};

// Pet types
const petTypes = {
    cat: { color: 0xF5A623, accent: 0xFFD700, emoji: '🐱', name: 'Cat' },
    dog: { color: 0x8B4513, accent: 0xDEB887, emoji: '🐕', name: 'Dog' },
    bunny: { color: 0xFFFFFF, accent: 0xFFB6C1, emoji: '🐰', name: 'Bunny' },
    bird: { color: 0x5DADE2, accent: 0x85C1E9, emoji: '🐦', name: 'Bird' },
    fox: { color: 0xE67E22, accent: 0xFFFFFF, emoji: '🦊', name: 'Fox' },
    none: { color: 0x666666, accent: 0x888888, emoji: '❌', name: 'No Pet' }
};

let playerClass = 'druid';
let playerName = 'Roshelle';

// Character customization
let customization = {
    skinTone: 0xFFDBB4,
    hairColor: 0x4A3728,
    gender: 'female',
    pet: 'cat'
};

const skinTones = [0xFFDBB4, 0xF5CBA7, 0xE0AC69, 0xC68642, 0x8D5524, 0xD4A574];
const hairColors = [0x2C1810, 0x4A3728, 0x8B4513, 0xD4A574, 0xE8C07D, 0x1a1a2e, 0x722F37, 0xE91E63, 0x9C27B0, 0x3F51B5];

// Character presets (saved to localStorage)
let characterPresets = loadPresets();

// Game state
let player, npc, shopkeeper, playerPet;
let cursors, wasd, interactKey, hoeKey, plantKey, tabKey, fishKey, craftKey;
let baseSpeed = 200;
let maxSpeed = 280;
let currentSpeed = 0;
let acceleration = 15;
let deceleration = 20;
let obstacles, interactables = [];
let interactPrompt, dialogBox, dialogText, farmPrompt;
let canInteract = false, currentInteractable = null, isDialogOpen = false;

// Movement smoothing
let targetVelocity = { x: 0, y: 0 };
let moveDirection = { x: 0, y: 0 };

// NPC behavior
let npcPatrolPoints = [
    { x: 400, y: 500 }, { x: 600, y: 450 }, { x: 500, y: 350 },
    { x: 300, y: 400 }, { x: 350, y: 550 }
];
let currentPatrolIndex = 0;
let npcSpeed = 60;
let miraHome = { x: 235, y: 205 };

// Day/Night cycle
let gameTime = 480;
let timeSpeed = 0.5;
let dayOverlay, timeDisplay;
let isNight = false;

// Farming
let farmPlots = [];
let seedTypes = ['carrot', 'tomato', 'flower'];
let currentSeedIndex = 0;

// Inventory & Economy
let inventory = {
    seeds: { carrot: 3, tomato: 3, flower: 3 },
    crops: { carrot: 0, tomato: 0, flower: 0 },
    fish: { bass: 0, salmon: 0, goldfish: 0 },
    crafted: { salad: 0, bouquet: 0, fishStew: 0, magicPotion: 0 }
};
let coins = 50;
let inventoryDisplay, seedIndicator, coinDisplay;
let seedPickups = [];

// Fishing
let isFishing = false;
let fishingTimer = 0;
let fishTypes = ['bass', 'salmon', 'goldfish'];
let fishingPrompt;

// Cooking
const recipes = {
    salad: { ingredients: { carrot: 1, tomato: 1 }, sellPrice: 50 },
    bouquet: { ingredients: { flower: 3 }, sellPrice: 80 },
    fishStew: { ingredients: { bass: 2, tomato: 1 }, sellPrice: 75 },
    magicPotion: { ingredients: { flower: 2, goldfish: 1 }, sellPrice: 150 }
};
let craftingOpen = false;

const sellPrices = {
    crops: { carrot: 15, tomato: 20, flower: 25 },
    fish: { bass: 10, salmon: 25, goldfish: 50 },
    crafted: { salad: 50, bouquet: 80, fishStew: 75, magicPotion: 150 }
};

let creationUI = [];

function preload() {}

// === PRESET MANAGEMENT ===
function loadPresets() {
    try {
        const saved = localStorage.getItem('711bf_presets');
        return saved ? JSON.parse(saved) : [null, null, null];
    } catch (e) {
        return [null, null, null];
    }
}

function savePresets() {
    try {
        localStorage.setItem('711bf_presets', JSON.stringify(characterPresets));
    } catch (e) {
        console.warn('Could not save presets');
    }
}

function saveCurrentAsPreset(slot) {
    characterPresets[slot] = {
        name: playerName,
        class: playerClass,
        customization: { ...customization }
    };
    savePresets();
}

function loadPreset(slot) {
    const preset = characterPresets[slot];
    if (preset) {
        playerName = preset.name;
        playerClass = preset.class;
        customization = { ...preset.customization };
        return true;
    }
    return false;
}

// === WHIMSICAL CHARACTER CREATOR ===
function createWhimsicalCharacter(scene, x, y, classType, isNPC = false, npcStyle = null, charCustom = null) {
    const container = scene.add.container(x, y);
    const cls = classes[classType] || classes.mage;
    const isFemale = charCustom?.gender === 'female' || (!isNPC && customization.gender === 'female');

    container.floatOffset = Math.random() * Math.PI * 2;

    // Shadow
    const shadow = scene.add.ellipse(0, 28, 30, 10, 0x000000, 0.25);
    container.add(shadow);
    container.shadow = shadow;

    // Sparkles for player
    if (!isNPC) {
        for (let i = 0; i < 4; i++) {
            const sparkle = scene.add.circle(-18 + Math.random() * 36, -35 + Math.random() * 25, 2, 0xFFFFFF, 0.6);
            sparkle.sparkleOffset = Math.random() * Math.PI * 2;
            container.add(sparkle);
            if (!container.sparkles) container.sparkles = [];
            container.sparkles.push(sparkle);
        }
    }

    const bodyColor = isNPC ? (npcStyle?.body || 0xE67E22) : cls.color;

    if (isFemale) {
        container.add(scene.add.ellipse(0, -2, 28, 14, bodyColor));
        container.add(scene.add.ellipse(0, 8, 18, 12, bodyColor));
        container.add(scene.add.ellipse(0, 18, 26, 16, bodyColor));
        container.add(scene.add.triangle(0, 28, -18, 0, 0, 12, 18, 0, bodyColor));
        const accentColor = isNPC ? (npcStyle?.accent || 0xF39C12) : cls.accent;
        container.add(scene.add.ellipse(0, 10, 20, 4, accentColor));
        container.add(scene.add.circle(-4, 10, 3, accentColor));
        container.add(scene.add.circle(4, 10, 3, accentColor));
        container.add(scene.add.circle(0, 10, 2, 0xFFFFFF, 0.5));
    } else {
        container.add(scene.add.ellipse(0, 8, 28, 36, bodyColor));
        container.add(scene.add.ellipse(0, 10, 20, 24, isNPC ? (npcStyle?.accent || 0xF39C12) : cls.accent, 0.5));
    }

    const skinTone = charCustom?.skinTone || (isNPC ? (npcStyle?.skin || skinTones[2]) : customization.skinTone);
    container.add(scene.add.circle(0, -20, 18, skinTone));
    container.add(scene.add.ellipse(-10, -15, 6, 4, 0xFFB6C1, 0.6));
    container.add(scene.add.ellipse(10, -15, 6, 4, 0xFFB6C1, 0.6));

    const hairColor = charCustom?.hairColor || (isNPC ? (npcStyle?.hair || 0x8B4513) : customization.hairColor);

    if (isFemale) {
        container.add(scene.add.ellipse(-14, -10, 10, 35, hairColor));
        container.add(scene.add.ellipse(14, -10, 10, 35, hairColor));
        container.add(scene.add.ellipse(-16, 5, 8, 20, hairColor));
        container.add(scene.add.ellipse(16, 5, 8, 20, hairColor));
        container.add(scene.add.circle(-12, -34, 11, hairColor));
        container.add(scene.add.circle(12, -34, 11, hairColor));
        container.add(scene.add.circle(0, -38, 13, hairColor));
        container.add(scene.add.circle(-6, -36, 10, hairColor));
        container.add(scene.add.circle(6, -36, 10, hairColor));
        container.add(scene.add.ellipse(-8, -30, 8, 6, hairColor));
        container.add(scene.add.ellipse(8, -30, 8, 6, hairColor));
        container.add(scene.add.ellipse(0, -32, 6, 5, hairColor));
    } else {
        container.add(scene.add.circle(-10, -32, 10, hairColor));
        container.add(scene.add.circle(10, -32, 10, hairColor));
        container.add(scene.add.circle(0, -36, 12, hairColor));
        container.add(scene.add.circle(-6, -34, 8, hairColor));
        container.add(scene.add.circle(6, -34, 8, hairColor));
    }

    container.add(scene.add.ellipse(-7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.ellipse(7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.circle(-7, -21, 4, 0x000000));
    container.add(scene.add.circle(7, -21, 4, 0x000000));
    container.add(scene.add.circle(-6, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(8, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(-8, -20, 1, 0xFFFFFF));
    container.add(scene.add.circle(6, -20, 1, 0xFFFFFF));

    if (isFemale) {
        container.add(scene.add.line(0, 0, -12, -28, -14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, -9, -30, -10, -34, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 12, -28, 14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 9, -30, 10, -34, 0x000000).setLineWidth(1.5));
    }

    const mouth = scene.add.arc(0, -12, 5, 0, 180, false, 0x000000);
    mouth.setStrokeStyle(2, 0x000000);
    container.add(mouth);

    // Class accessories
    if (!isNPC) {
        if (classType === 'druid') {
            if (isFemale) {
                container.add(scene.add.circle(-14, -42, 5, 0xFF69B4));
                container.add(scene.add.circle(0, -46, 6, 0xFFD700));
                container.add(scene.add.circle(14, -42, 5, 0xFF69B4));
                container.add(scene.add.circle(-8, -44, 4, 0x87CEEB));
                container.add(scene.add.circle(8, -44, 4, 0x90EE90));
            } else {
                container.add(scene.add.circle(-12, -40, 5, 0x228B22));
                container.add(scene.add.circle(12, -40, 5, 0x228B22));
                container.add(scene.add.circle(0, -44, 6, 0x32CD32));
            }
        } else if (classType === 'shaman') {
            container.add(scene.add.circle(-16, -12, 6, 0x9B59B6, 0.7));
            container.add(scene.add.circle(16, -12, 6, 0x9B59B6, 0.7));
        } else if (classType === 'warrior') {
            container.add(scene.add.ellipse(0, -36, 24, 10, 0x808080));
            container.add(scene.add.triangle(-14, -42, 0, 12, 4, 0, 8, 12, 0x696969));
            container.add(scene.add.triangle(14, -42, 0, 12, 4, 0, 8, 12, 0x696969));
        } else if (classType === 'mage') {
            container.add(scene.add.triangle(0, -58, -16, 18, 0, -20, 16, 18, 0x3498DB));
            container.add(scene.add.ellipse(0, -40, 34, 8, 0x2980B9));
            container.add(scene.add.circle(0, -56, 4, 0xF1C40F));
        } else if (classType === 'priest') {
            container.add(scene.add.circle(0, -48, 12, 0xF1C40F, 0.3));
            const haloRing = scene.add.circle(0, -48, 12, 0xF1C40F, 0);
            haloRing.setStrokeStyle(3, 0xF1C40F);
            container.add(haloRing);
        } else if (classType === 'hunter') {
            container.add(scene.add.arc(0, -24, 22, 180, 360, false, 0x5D4E37));
            container.add(scene.add.triangle(-16, -42, 0, 10, 6, 0, 12, 10, 0x5D4E37));
            container.add(scene.add.triangle(16, -42, 0, 10, 6, 0, 12, 10, 0x5D4E37));
        }
    }

    if (isNPC && npcStyle?.accessory === 'apron') {
        container.add(scene.add.rectangle(0, 12, 22, 18, 0xFFFFFF));
        container.add(scene.add.rectangle(0, 8, 18, 3, 0xFFFFFF));
    }

    scene.physics.add.existing(container);
    container.body.setSize(30, 50).setOffset(-15, -15);
    if (!isNPC) container.body.setCollideWorldBounds(true);

    return container;
}

// === CREATE PET ===
function createPet(scene, x, y, petType) {
    if (petType === 'none') return null;

    const container = scene.add.container(x, y);
    const pet = petTypes[petType];

    container.add(scene.add.ellipse(0, 12, 16, 5, 0x000000, 0.2));

    if (petType === 'cat') {
        container.add(scene.add.ellipse(0, 4, 18, 14, pet.color));
        container.add(scene.add.circle(0, -8, 10, pet.color));
        container.add(scene.add.triangle(-8, -18, 0, 8, 4, 0, 8, 8, pet.color));
        container.add(scene.add.triangle(8, -18, 0, 8, 4, 0, 8, 8, pet.color));
        container.add(scene.add.triangle(-8, -16, 0, 5, 2, 0, 4, 5, 0xFFB6C1));
        container.add(scene.add.triangle(8, -16, 0, 5, 2, 0, 4, 5, 0xFFB6C1));
        container.add(scene.add.ellipse(-4, -9, 4, 5, 0x90EE90));
        container.add(scene.add.ellipse(4, -9, 4, 5, 0x90EE90));
        container.add(scene.add.ellipse(-4, -9, 2, 4, 0x000000));
        container.add(scene.add.ellipse(4, -9, 2, 4, 0x000000));
        container.add(scene.add.triangle(0, -5, -2, 3, 0, 0, 2, 3, 0xFFB6C1));
        container.add(scene.add.ellipse(12, 0, 4, 12, pet.color));
    } else if (petType === 'dog') {
        container.add(scene.add.ellipse(0, 4, 20, 14, pet.color));
        container.add(scene.add.ellipse(0, -8, 14, 12, pet.color));
        container.add(scene.add.ellipse(-10, -4, 6, 10, pet.color));
        container.add(scene.add.ellipse(10, -4, 6, 10, pet.color));
        container.add(scene.add.ellipse(0, -4, 8, 6, pet.accent));
        container.add(scene.add.circle(-4, -10, 3, 0x000000));
        container.add(scene.add.circle(4, -10, 3, 0x000000));
        container.add(scene.add.circle(0, -4, 3, 0x000000));
        container.add(scene.add.ellipse(14, -2, 5, 8, pet.color));
    } else if (petType === 'bunny') {
        container.add(scene.add.ellipse(0, 6, 16, 14, pet.color));
        container.add(scene.add.circle(0, -6, 11, pet.color));
        container.add(scene.add.ellipse(-5, -24, 5, 14, pet.color));
        container.add(scene.add.ellipse(5, -24, 5, 14, pet.color));
        container.add(scene.add.ellipse(-5, -24, 3, 10, pet.accent));
        container.add(scene.add.ellipse(5, -24, 3, 10, pet.accent));
        container.add(scene.add.circle(-4, -7, 3, 0xFF69B4));
        container.add(scene.add.circle(4, -7, 3, 0xFF69B4));
        container.add(scene.add.circle(-4, -7, 1.5, 0x000000));
        container.add(scene.add.circle(4, -7, 1.5, 0x000000));
        container.add(scene.add.circle(10, 6, 6, pet.color));
    } else if (petType === 'bird') {
        container.add(scene.add.ellipse(0, 2, 14, 12, pet.color));
        container.add(scene.add.circle(0, -8, 8, pet.color));
        container.add(scene.add.ellipse(6, 2, 8, 10, pet.accent));
        container.add(scene.add.triangle(8, -8, 0, 4, 8, 2, 0, 0, 0xF39C12));
        container.add(scene.add.circle(-2, -9, 2, 0x000000));
        container.add(scene.add.triangle(-8, 4, 0, 8, 4, 0, 8, 8, pet.accent));
    } else if (petType === 'fox') {
        container.add(scene.add.ellipse(0, 4, 18, 14, pet.color));
        container.add(scene.add.ellipse(0, -8, 12, 10, pet.color));
        container.add(scene.add.triangle(-8, -20, 0, 10, 5, 0, 10, 10, pet.color));
        container.add(scene.add.triangle(8, -20, 0, 10, 5, 0, 10, 10, pet.color));
        container.add(scene.add.ellipse(0, -4, 8, 6, pet.accent));
        container.add(scene.add.ellipse(-4, -10, 3, 4, 0x2ECC71));
        container.add(scene.add.ellipse(4, -10, 3, 4, 0x2ECC71));
        container.add(scene.add.ellipse(-4, -10, 1, 3, 0x000000));
        container.add(scene.add.ellipse(4, -10, 1, 3, 0x000000));
        container.add(scene.add.circle(0, -5, 2, 0x000000));
        container.add(scene.add.ellipse(14, 0, 6, 12, pet.color));
        container.add(scene.add.ellipse(16, 4, 4, 6, pet.accent));
    }

    const nameTag = scene.add.text(0, -35, pet.emoji, { fontSize: '12px' }).setOrigin(0.5);
    container.add(nameTag);

    scene.physics.add.existing(container);
    container.body.setSize(20, 20).setOffset(-10, -5);

    container.petType = petType;
    return container;
}

function createHouse(graphics, x, y, roofColor, label, scene) {
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(x - 60, y - 50, 120, 100);
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(x - 62, y + 45, 124, 10);
    graphics.fillStyle(roofColor, 1);
    graphics.fillTriangle(x - 70, y - 50, x, y - 110, x + 70, y - 50);
    graphics.fillStyle(0x654321, 1);
    graphics.fillRect(x - 18, y + 5, 36, 45);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillCircle(x + 10, y + 28, 4);
    graphics.fillStyle(0x87CEEB, 1);
    graphics.fillRect(x - 48, y - 30, 24, 24);
    graphics.fillRect(x + 24, y - 30, 24, 24);
    graphics.lineStyle(2, 0xFFFFFF, 1);
    graphics.strokeRect(x - 48, y - 30, 24, 24);
    graphics.strokeRect(x + 24, y - 30, 24, 24);
    graphics.lineBetween(x - 36, y - 30, x - 36, y - 6);
    graphics.lineBetween(x - 48, y - 18, x - 24, y - 18);
    graphics.lineBetween(x + 36, y - 30, x + 36, y - 6);
    graphics.lineBetween(x + 24, y - 18, x + 48, y - 18);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(x + 30, y - 95, 20, 35);
    graphics.fillStyle(0xCCCCCC, 0.5);
    graphics.fillCircle(x + 40, y - 102, 8);
    graphics.fillCircle(x + 44, y - 115, 6);
    graphics.fillCircle(x + 38, y - 125, 5);

    if (scene && label) {
        scene.add.text(x, y - 118, label, {
            fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
    }
}

function createFarmPlot(scene, x, y) {
    const plot = { x, y, state: 'grass', crop: null, growthTimer: 0, graphics: scene.add.graphics(), plantGraphics: null };
    drawPlot(plot);
    return plot;
}

function drawPlot(plot) {
    plot.graphics.clear();
    const { x, y } = plot;
    const size = 44;

    if (plot.state === 'grass') {
        plot.graphics.fillStyle(0x8B7355, 1).fillRect(x - size/2, y - size/2, size, size);
        plot.graphics.fillStyle(0x90EE90, 0.5).fillRect(x - size/2, y - size/2, size, size);
    } else {
        plot.graphics.fillStyle(0x5D4037, 1).fillRect(x - size/2, y - size/2, size, size);
        if (plot.state === 'tilled') {
            plot.graphics.lineStyle(2, 0x4A3728, 1);
            for (let i = -15; i <= 15; i += 10) plot.graphics.lineBetween(x - 18, y + i, x + 18, y + i);
        }
    }
    plot.graphics.lineStyle(1, 0x666666, 0.5).strokeRect(x - size/2, y - size/2, size, size);
}

// === VARIED PLANT SHAPES ===
function drawPlant(scene, plot) {
    if (plot.plantGraphics) plot.plantGraphics.destroy();
    if (!plot.crop) return;

    plot.plantGraphics = scene.add.graphics();
    const { x, y, crop, state } = plot;

    if (crop === 'carrot') {
        // Carrot: feathery leaves on top
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 4, 2, 8);
            plot.plantGraphics.fillCircle(x, y - 6, 3);
        } else if (state === 'growing') {
            // Multiple thin leaves
            for (let i = -2; i <= 2; i++) {
                plot.plantGraphics.fillRect(x + i * 3, y - 10 + Math.abs(i) * 2, 2, 12 - Math.abs(i) * 2);
            }
        } else if (state === 'ready') {
            // Full feathery top
            for (let i = -3; i <= 3; i++) {
                plot.plantGraphics.fillRect(x + i * 2.5, y - 12 + Math.abs(i) * 2, 2, 14 - Math.abs(i) * 2);
            }
            // Orange carrot visible
            plot.plantGraphics.fillStyle(0xFFA500, 1);
            plot.plantGraphics.fillTriangle(x - 6, y + 2, x, y + 16, x + 6, y + 2);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.6);
            plot.plantGraphics.fillCircle(x - 2, y + 4, 2);
        }
    } else if (crop === 'tomato') {
        // Tomato: bushy vine
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 5, 2, 10);
            plot.plantGraphics.fillCircle(x - 3, y - 4, 3);
            plot.plantGraphics.fillCircle(x + 3, y - 4, 3);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 14);
            plot.plantGraphics.fillCircle(x - 5, y - 4, 4);
            plot.plantGraphics.fillCircle(x + 5, y - 4, 4);
            plot.plantGraphics.fillCircle(x - 3, y - 8, 3);
            plot.plantGraphics.fillCircle(x + 3, y - 8, 3);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 1, y - 10, 2, 16);
            plot.plantGraphics.fillCircle(x - 6, y - 2, 5);
            plot.plantGraphics.fillCircle(x + 6, y - 2, 5);
            plot.plantGraphics.fillCircle(x - 4, y - 10, 4);
            plot.plantGraphics.fillCircle(x + 4, y - 10, 4);
            // Red tomatoes
            plot.plantGraphics.fillStyle(0xFF6347, 1);
            plot.plantGraphics.fillCircle(x - 5, y - 2, 6);
            plot.plantGraphics.fillCircle(x + 5, y + 2, 5);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.6);
            plot.plantGraphics.fillCircle(x - 7, y - 4, 2);
            plot.plantGraphics.fillCircle(x + 3, y, 1.5);
        }
    } else if (crop === 'flower') {
        // Flower: tall stem with petals
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 3, 2, 8);
            plot.plantGraphics.fillEllipse(x - 4, y, 4, 6);
            plot.plantGraphics.fillEllipse(x + 4, y, 4, 6);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 14);
            plot.plantGraphics.fillEllipse(x - 5, y + 2, 5, 8);
            plot.plantGraphics.fillEllipse(x + 5, y + 2, 5, 8);
            // Bud
            plot.plantGraphics.fillStyle(0xFF69B4, 0.5);
            plot.plantGraphics.fillCircle(x, y - 10, 5);
        } else if (state === 'ready') {
            plot.plantGraphics.fillStyle(0x228B22, 1);
            plot.plantGraphics.fillRect(x - 1, y - 6, 2, 16);
            plot.plantGraphics.fillEllipse(x - 6, y + 4, 5, 9);
            plot.plantGraphics.fillEllipse(x + 6, y + 4, 5, 9);
            // Flower petals
            plot.plantGraphics.fillStyle(0xFF69B4, 1);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const px = x + Math.cos(angle) * 8;
                const py = y - 12 + Math.sin(angle) * 8;
                plot.plantGraphics.fillCircle(px, py, 5);
            }
            // Center
            plot.plantGraphics.fillStyle(0xFFD700, 1);
            plot.plantGraphics.fillCircle(x, y - 12, 4);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.5);
            plot.plantGraphics.fillCircle(x - 1, y - 14, 1.5);
        }
    }
}

function createSeedPickup(scene, x, y, seedType) {
    const pickup = { x, y, seedType, isCollected: false, respawnTimer: 0, graphics: scene.add.graphics() };
    drawSeedPickup(pickup);
    return pickup;
}

function drawSeedPickup(pickup) {
    pickup.graphics.clear();
    if (pickup.isCollected) return;
    const { x, y, seedType } = pickup;
    const colors = { carrot: 0xFFA500, tomato: 0xFF6347, flower: 0xFF69B4 };

    pickup.graphics.fillStyle(0x228B22, 1);
    pickup.graphics.fillRect(x - 2, y - 3, 4, 14);
    pickup.graphics.fillCircle(x - 7, y + 3, 6);
    pickup.graphics.fillCircle(x + 7, y + 3, 6);
    pickup.graphics.fillStyle(colors[seedType], 1);
    pickup.graphics.fillCircle(x, y - 10, 10);
    pickup.graphics.fillStyle(0xFFFF00, 1);
    pickup.graphics.fillCircle(x, y - 10, 4);
    pickup.graphics.fillStyle(0xFFFFFF, 0.9);
    pickup.graphics.fillCircle(x + 3, y - 13, 3);
}

function getTimeString() {
    const hours = Math.floor(gameTime / 60) % 24;
    const mins = Math.floor(gameTime % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function getDayPhase() {
    const hour = Math.floor(gameTime / 60) % 24;
    if (hour >= 6 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
}

function updateInventoryDisplay() {
    let text = '📦 INVENTORY\n';
    text += `🌱 ${inventory.seeds.carrot}/${inventory.seeds.tomato}/${inventory.seeds.flower}\n`;
    text += `🥕 ${inventory.crops.carrot} 🍅 ${inventory.crops.tomato} 🌸 ${inventory.crops.flower}\n`;
    text += `🐟 ${inventory.fish.bass} 🐠 ${inventory.fish.salmon} ✨ ${inventory.fish.goldfish}\n`;
    text += `📦 Crafted: ${inventory.crafted.salad + inventory.crafted.bouquet + inventory.crafted.fishStew + inventory.crafted.magicPotion}`;
    inventoryDisplay.setText(text);
}

function updateSeedIndicator(scene) {
    const emoji = { carrot: '🥕', tomato: '🍅', flower: '🌸' };
    const seed = seedTypes[currentSeedIndex];
    seedIndicator.setText(`Plant: ${emoji[seed]} (${inventory.seeds[seed]})`);
}

function updateCoinDisplay() {
    coinDisplay.setText(`💰 ${coins}`);
}

// === DYNAMIC DIALOG BOX ===
function showDialog(message) {
    const scene = game.scene.scenes[0];

    // Measure text
    const testText = scene.add.text(0, 0, message, {
        fontSize: '14px',
        wordWrap: { width: 800 },
        lineSpacing: 6
    });
    const bounds = testText.getBounds();
    testText.destroy();

    const padding = 30;
    const boxWidth = Math.min(Math.max(bounds.width + padding * 2, 300), 1000);
    const boxHeight = Math.min(Math.max(bounds.height + padding * 2 + 30, 80), 300);

    dialogBox.setSize(boxWidth, boxHeight);
    dialogBox.setPosition(600, 800 - boxHeight/2 - 20);
    dialogText.setPosition(600, 800 - boxHeight/2 - 30);
    scene.dialogCloseText.setPosition(600, 800 - 35);

    dialogBox.setVisible(true);
    dialogText.setText(message).setVisible(true);
    scene.dialogCloseText.setVisible(true);
    isDialogOpen = true;
    interactPrompt.setVisible(false);
    farmPrompt.setVisible(false);
}

// === CREATE ===
function create() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x90EE90, 1).fillRect(0, 0, 1200, 800);
    graphics.fillStyle(0x7CCD7C, 1);
    for (let i = 0; i < 150; i++) graphics.fillCircle(Math.random() * 1200, Math.random() * 800, 2 + Math.random() * 5);

    const flowerColors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0xFFB6C1, 0xDDA0DD];
    for (let i = 0; i < 60; i++) {
        graphics.fillStyle(flowerColors[Math.floor(Math.random() * flowerColors.length)], 0.7);
        graphics.fillCircle(Math.random() * 1200, Math.random() * 800, 3 + Math.random() * 2);
    }

    graphics.fillStyle(0xD2B48C, 1);
    graphics.fillRect(150, 240, 900, 30);
    graphics.fillRect(580, 240, 30, 350);
    graphics.fillRect(235, 170, 30, 75);
    graphics.fillRect(785, 170, 30, 75);

    graphics.fillStyle(0xC4A77D, 0.5);
    for (let i = 0; i < 80; i++) {
        graphics.fillCircle(150 + Math.random() * 900, 242 + Math.random() * 26, 5);
    }

    obstacles = this.physics.add.staticGroup();

    const trees = [
        { x: 60, y: 100, s: 35 }, { x: 1140, y: 100, s: 40 }, { x: 60, y: 700, s: 42 },
        { x: 1140, y: 700, s: 38 }, { x: 60, y: 400, s: 36 }, { x: 1140, y: 400, s: 34 },
        { x: 950, y: 150, s: 32 }, { x: 100, y: 550, s: 30 }
    ];
    trees.forEach(t => {
        graphics.fillStyle(0x2ECC71, 1);
        graphics.fillCircle(t.x - 12, t.y - 6, t.s * 0.7);
        graphics.fillCircle(t.x + 12, t.y - 6, t.s * 0.7);
        graphics.fillStyle(0x27AE60, 1);
        graphics.fillCircle(t.x, t.y - 12, t.s * 0.8);
        graphics.fillStyle(0x229954, 1);
        graphics.fillCircle(t.x, t.y, t.s);
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(t.x - 7, t.y + t.s - 10, 14, 30);
        obstacles.add(this.add.rectangle(t.x, t.y + t.s, 18, 18, 0x000000, 0));
    });

    createHouse(graphics, 235, 120, 0xE74C3C, "🏠 Mira's Cottage", this);
    obstacles.add(this.add.rectangle(235, 120, 120, 100, 0x000000, 0));
    const miraDoor = this.add.rectangle(235, 175, 40, 35, 0x000000, 0);
    miraDoor.interactType = 'miraDoor';
    miraDoor.message = "Mira's cozy cottage! 🏡\nSmells like herbs and flowers inside.";
    interactables.push(miraDoor);

    createHouse(graphics, 500, 120, 0x3498DB, "🏠 Your Home", this);
    obstacles.add(this.add.rectangle(500, 120, 120, 100, 0x000000, 0));
    const playerDoor = this.add.rectangle(500, 175, 40, 35, 0x000000, 0);
    playerDoor.interactType = 'playerHome';
    playerDoor.message = "Home sweet home! 🏠✨\nYour cozy sanctuary awaits.";
    interactables.push(playerDoor);

    createHouse(graphics, 815, 120, 0x27AE60, "🛒 Finn's Shop", this);
    obstacles.add(this.add.rectangle(815, 120, 120, 100, 0x000000, 0));

    // Pond
    graphics.fillStyle(0x5DADE2, 0.3);
    graphics.fillCircle(1000, 600, 85);
    graphics.fillStyle(0x3498DB, 1);
    graphics.fillCircle(1000, 600, 75);
    graphics.fillStyle(0x5DADE2, 1);
    graphics.fillCircle(1000, 600, 60);
    graphics.fillStyle(0x85C1E9, 0.5);
    graphics.fillCircle(980, 580, 25);
    graphics.fillStyle(0x27AE60, 1);
    graphics.fillCircle(970, 620, 10);
    graphics.fillCircle(1030, 605, 8);
    graphics.fillCircle(985, 645, 7);
    graphics.fillStyle(0xFF69B4, 1);
    graphics.fillCircle(970, 620, 4);
    graphics.fillCircle(1030, 605, 3);
    graphics.fillStyle(0x228B22, 1);
    graphics.fillRect(1060, 560, 4, 35);
    graphics.fillRect(1068, 570, 4, 28);
    graphics.fillRect(935, 635, 4, 30);
    this.add.text(1000, 690, '🎣 Fishing Pond', { fontSize: '12px', fill: '#333' }).setOrigin(0.5);

    // Farm
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(130, 540, 5, 120).fillRect(130, 540, 220, 5).fillRect(345, 540, 5, 120).fillRect(130, 655, 220, 5);
    this.add.text(240, 525, '🌾 Farm', { fontSize: '13px', fill: '#654321' }).setOrigin(0.5);

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
            farmPlots.push(createFarmPlot(this, 165 + col * 50, 570 + row * 50));
        }
    }

    // Cooking station
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(420, 620, 70, 40);
    graphics.fillStyle(0xA0522D, 1);
    graphics.fillRect(423, 623, 64, 34);
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(428, 628, 54, 6);
    graphics.fillStyle(0x2C3E50, 1);
    graphics.fillCircle(455, 640, 15);
    graphics.fillStyle(0x5D6D7E, 1);
    graphics.fillCircle(455, 638, 10);
    this.add.text(455, 670, '🍳 Cooking', { fontSize: '11px', fill: '#654321' }).setOrigin(0.5);

    const craftTable = this.add.rectangle(455, 640, 80, 50, 0x000000, 0);
    craftTable.interactType = 'craft';
    craftTable.message = "Cooking Station! 🍳\nPress C to open recipes.";
    interactables.push(craftTable);

    // Seed pickups
    const seedLocs = [
        { x: 420, y: 400, type: 'carrot' }, { x: 680, y: 420, type: 'tomato' },
        { x: 780, y: 500, type: 'flower' }, { x: 350, y: 720, type: 'carrot' },
        { x: 620, y: 720, type: 'tomato' }, { x: 850, y: 380, type: 'flower' }
    ];
    seedLocs.forEach(l => seedPickups.push(createSeedPickup(this, l.x, l.y, l.type)));

    // Well
    graphics.fillStyle(0x808080, 1).fillCircle(700, 370, 25);
    graphics.fillStyle(0x4169E1, 1).fillCircle(700, 370, 16);
    graphics.fillStyle(0x8B4513, 1).fillRect(682, 345, 5, -25).fillRect(713, 345, 5, -25).fillRect(680, 320, 42, 5);
    const well = this.add.rectangle(700, 370, 50, 50, 0x000000, 0);
    well.interactType = 'well';
    well.message = "A magical well! ✨\nThe water shimmers with possibility.";
    interactables.push(well);

    // Signpost
    graphics.fillStyle(0x8B4513, 1).fillRect(392, 330, 8, 45);
    graphics.fillStyle(0xDEB887, 1).fillRect(355, 308, 85, 28);
    this.add.text(398, 322, '📜 Willowbrook', { fontSize: '11px', fill: '#654321' }).setOrigin(0.5);
    const sign = this.add.rectangle(398, 345, 60, 60, 0x000000, 0);
    sign.interactType = 'sign';
    sign.message = "✨ Welcome to Willowbrook! ✨\n🏠 Homes north | 🛒 Shop NE\n🎣 Pond east | 🌾 Farm south";
    interactables.push(sign);

    // Day/night overlay
    dayOverlay = this.add.rectangle(600, 400, 1200, 800, 0x000033, 0).setDepth(50);

    // Input
    wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    cursors = this.input.keyboard.createCursorKeys();
    interactKey = this.input.keyboard.addKey('E');
    hoeKey = this.input.keyboard.addKey('H');
    plantKey = this.input.keyboard.addKey('P');
    tabKey = this.input.keyboard.addKey('TAB');
    fishKey = this.input.keyboard.addKey('F');
    craftKey = this.input.keyboard.addKey('C');
    this.input.keyboard.addCapture('TAB');

    // UI
    interactPrompt = this.add.text(600, 750, '', { fontSize: '16px', fill: '#fff', backgroundColor: '#000000cc', padding: { x: 10, y: 5 } }).setOrigin(0.5).setDepth(100);

    dialogBox = this.add.rectangle(600, 720, 700, 100, 0x1a1a2e, 0.95).setStrokeStyle(3, 0x9B59B6).setDepth(100).setVisible(false);
    dialogText = this.add.text(600, 710, '', { fontSize: '14px', fill: '#fff', align: 'center', lineSpacing: 6, wordWrap: { width: 650 } }).setOrigin(0.5).setDepth(101).setVisible(false);
    this.dialogCloseText = this.add.text(600, 755, 'Press E to close', { fontSize: '11px', fill: '#aaa' }).setOrigin(0.5).setDepth(101).setVisible(false);

    farmPrompt = this.add.text(600, 720, '', { fontSize: '14px', fill: '#fff', backgroundColor: '#228B22cc', padding: { x: 10, y: 5 } }).setOrigin(0.5).setDepth(100);

    fishingPrompt = this.add.text(1000, 520, '', { fontSize: '14px', fill: '#fff', backgroundColor: '#3498DBcc', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(100);

    inventoryDisplay = this.add.text(10, 55, '', { fontSize: '12px', fill: '#fff', backgroundColor: '#1a1a2eee', padding: { x: 8, y: 5 }, lineSpacing: 2 }).setDepth(100);
    updateInventoryDisplay();

    seedIndicator = this.add.text(10, 145, '', { fontSize: '13px', fill: '#fff', backgroundColor: '#228B22cc', padding: { x: 8, y: 4 } }).setDepth(100);
    updateSeedIndicator(this);

    coinDisplay = this.add.text(10, 175, '', { fontSize: '15px', fill: '#FFD700', backgroundColor: '#1a1a2eee', padding: { x: 8, y: 4 } }).setDepth(100);
    updateCoinDisplay();

    timeDisplay = this.add.text(1120, 55, '', { fontSize: '13px', fill: '#fff', backgroundColor: '#1a1a2eee', padding: { x: 8, y: 4 } }).setDepth(100);

    this.add.text(600, 20, 'WASD:move | E:interact | H:hoe | P:plant | TAB:seed | F:fish | C:cook', {
        fontSize: '12px', fill: '#333', fontStyle: 'bold', backgroundColor: '#ffffffcc', padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    // Show character creation
    showCharacterCreation(this);

    this.shopMenuOpen = false;
    this.gameStarted = false;
}

// === CONSOLIDATED CHARACTER CREATION ===
function showCharacterCreation(scene) {
    const overlay = scene.add.rectangle(600, 400, 1200, 800, 0x000000, 0.9).setDepth(200);
    creationUI.push(overlay);

    // Title
    const title = scene.add.text(600, 35, '✨ Create Your Character ✨', {
        fontSize: '32px', fill: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    creationUI.push(title);

    // === LEFT COLUMN: Class Selection ===
    const classLabel = scene.add.text(200, 80, 'Choose Class', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
    creationUI.push(classLabel);

    const classKeys = Object.keys(classes);
    let classButtons = [];

    classKeys.forEach((cls, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = 130 + col * 140;
        const y = 130 + row * 80;
        const data = classes[cls];

        const btn = scene.add.rectangle(x, y, 120, 65, 0x2C3E50, 0.9)
            .setStrokeStyle(3, playerClass === cls ? 0xFFD700 : data.color)
            .setDepth(201).setInteractive();
        creationUI.push(btn);
        classButtons.push({ btn, cls });

        const emoji = scene.add.text(x, y - 15, data.emoji, { fontSize: '22px' }).setOrigin(0.5).setDepth(202);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 15, cls.toUpperCase(), { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            playerClass = cls;
            classButtons.forEach(b => b.btn.setStrokeStyle(3, playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
            refreshPreview();
        });
        btn.on('pointerover', () => btn.setAlpha(0.8));
        btn.on('pointerout', () => btn.setAlpha(1));
    });

    // === CENTER: Preview & Name ===
    // Name input
    const nameLabel = scene.add.text(600, 80, 'Your Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(nameLabel);

    const nameInput = scene.add.dom(600, 115).createFromHTML(`
        <input type="text" id="playerNameInput" value="${playerName}"
        style="width: 180px; padding: 8px 12px; font-size: 16px; text-align: center;
        border: 2px solid #9B59B6; border-radius: 8px; background: #2C3E50; color: #fff;
        outline: none;">
    `).setDepth(205);
    creationUI.push(nameInput);

    nameInput.addListener('input');
    nameInput.on('input', (e) => {
        playerName = e.target.value || 'Adventurer';
    });

    // Character preview
    let previewChar = createWhimsicalCharacter(scene, 600, 280, playerClass, false, null, customization);
    previewChar.setDepth(205);
    creationUI.push(previewChar);

    // Pet preview
    let previewPet = null;
    function updatePetPreview() {
        if (previewPet) { previewPet.destroy(); previewPet = null; }
        if (customization.pet !== 'none') {
            previewPet = createPet(scene, 660, 290, customization.pet);
            if (previewPet) {
                previewPet.setDepth(204);
                creationUI.push(previewPet);
            }
        }
    }
    updatePetPreview();

    function refreshPreview() {
        previewChar.destroy();
        previewChar = createWhimsicalCharacter(scene, 600, 280, playerClass, false, null, customization);
        previewChar.setDepth(205);
        creationUI.push(previewChar);
        updatePetPreview();
    }

    // === RIGHT COLUMN: Appearance ===
    const appearLabel = scene.add.text(1000, 80, 'Appearance', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
    creationUI.push(appearLabel);

    // Body style
    const bodyLabel = scene.add.text(1000, 115, 'Body Style', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(bodyLabel);

    const femBtn = scene.add.rectangle(960, 145, 70, 30, 0x9B59B6, 0.8).setDepth(201).setInteractive()
        .setStrokeStyle(2, customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
    creationUI.push(femBtn);
    const femText = scene.add.text(960, 145, 'Feminine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(femText);

    const mascBtn = scene.add.rectangle(1040, 145, 70, 30, 0x3498DB, 0.8).setDepth(201).setInteractive()
        .setStrokeStyle(2, customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
    creationUI.push(mascBtn);
    const mascText = scene.add.text(1040, 145, 'Masculine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(mascText);

    femBtn.on('pointerdown', () => {
        customization.gender = 'female';
        femBtn.setStrokeStyle(2, 0xFFD700);
        mascBtn.setStrokeStyle(2, 0x3498DB);
        refreshPreview();
    });
    mascBtn.on('pointerdown', () => {
        customization.gender = 'male';
        mascBtn.setStrokeStyle(2, 0xFFD700);
        femBtn.setStrokeStyle(2, 0x9B59B6);
        refreshPreview();
    });

    // Skin tone
    const skinLabel = scene.add.text(1000, 180, 'Skin', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(skinLabel);

    skinTones.forEach((tone, i) => {
        const x = 925 + (i % 6) * 25;
        const y = 205;
        const btn = scene.add.circle(x, y, 10, tone).setDepth(201).setInteractive()
            .setStrokeStyle(2, customization.skinTone === tone ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        btn.on('pointerdown', () => {
            customization.skinTone = tone;
            refreshPreview();
            skinTones.forEach((t, j) => {
                creationUI.filter(u => u.type === 'Arc' && u.y === 205)[j]?.setStrokeStyle(2, customization.skinTone === t ? 0xFFD700 : 0x333333);
            });
        });
    });

    // Hair color
    const hairLabel = scene.add.text(1000, 235, 'Hair', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(hairLabel);

    hairColors.forEach((color, i) => {
        const x = 925 + (i % 5) * 25;
        const y = 260 + Math.floor(i / 5) * 25;
        const btn = scene.add.circle(x, y, 10, color).setDepth(201).setInteractive()
            .setStrokeStyle(2, customization.hairColor === color ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        btn.on('pointerdown', () => {
            customization.hairColor = color;
            refreshPreview();
        });
    });

    // === BOTTOM LEFT: Pets ===
    const petLabel = scene.add.text(200, 360, 'Pet Companion', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
    creationUI.push(petLabel);

    const petKeys = Object.keys(petTypes);
    let petButtons = [];

    petKeys.forEach((pet, i) => {
        const x = 80 + (i % 3) * 80;
        const y = 410 + Math.floor(i / 3) * 70;
        const data = petTypes[pet];

        const btn = scene.add.rectangle(x, y, 65, 55, 0x2C3E50, 0.9)
            .setStrokeStyle(2, customization.pet === pet ? 0xFFD700 : data.color)
            .setDepth(201).setInteractive();
        creationUI.push(btn);
        petButtons.push({ btn, pet });

        const emoji = scene.add.text(x, y - 8, data.emoji, { fontSize: '20px' }).setOrigin(0.5).setDepth(202);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 18, data.name, { fontSize: '9px', fill: '#aaa' }).setOrigin(0.5).setDepth(202);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            customization.pet = pet;
            petButtons.forEach(b => b.btn.setStrokeStyle(2, customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
            updatePetPreview();
        });
    });

    // === BOTTOM CENTER: Presets ===
    const presetLabel = scene.add.text(600, 380, 'Quick Start Presets', { fontSize: '14px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(presetLabel);

    for (let i = 0; i < 3; i++) {
        const x = 500 + i * 100;
        const preset = characterPresets[i];

        const slotBtn = scene.add.rectangle(x, 430, 80, 60, preset ? 0x2C3E50 : 0x1a1a2e, 0.9)
            .setStrokeStyle(2, preset ? 0x27AE60 : 0x444444).setDepth(201).setInteractive();
        creationUI.push(slotBtn);

        if (preset) {
            const emoji = scene.add.text(x, 415, classes[preset.class]?.emoji || '?', { fontSize: '18px' }).setOrigin(0.5).setDepth(202);
            creationUI.push(emoji);
            const pname = scene.add.text(x, 440, preset.name.substring(0, 8), { fontSize: '10px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
            creationUI.push(pname);

            slotBtn.on('pointerdown', () => {
                loadPreset(i);
                classButtons.forEach(b => b.btn.setStrokeStyle(3, playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
                petButtons.forEach(b => b.btn.setStrokeStyle(2, customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
                document.getElementById('playerNameInput').value = playerName;
                refreshPreview();
            });
        } else {
            const plus = scene.add.text(x, 425, '💾', { fontSize: '16px' }).setOrigin(0.5).setDepth(202);
            creationUI.push(plus);
            const saveLabel = scene.add.text(x, 445, 'Save', { fontSize: '9px', fill: '#666' }).setOrigin(0.5).setDepth(202);
            creationUI.push(saveLabel);

            slotBtn.on('pointerdown', () => {
                saveCurrentAsPreset(i);
                showCharacterCreation(scene);
            });
        }
    }

    // === BOTTOM RIGHT: Actions ===
    // Randomize button
    const randomBtn = scene.add.rectangle(1000, 400, 120, 35, 0xE67E22, 0.9).setDepth(201).setInteractive().setStrokeStyle(2, 0xF39C12);
    creationUI.push(randomBtn);
    const randomText = scene.add.text(1000, 400, '🎲 Randomize', { fontSize: '13px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(randomText);

    randomBtn.on('pointerdown', () => {
        playerClass = classKeys[Math.floor(Math.random() * classKeys.length)];
        customization.skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
        customization.hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        customization.gender = Math.random() > 0.5 ? 'female' : 'male';
        const petOptions = petKeys.filter(p => p !== 'none');
        customization.pet = petOptions[Math.floor(Math.random() * petOptions.length)];

        classButtons.forEach(b => b.btn.setStrokeStyle(3, playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
        petButtons.forEach(b => b.btn.setStrokeStyle(2, customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
        femBtn.setStrokeStyle(2, customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
        mascBtn.setStrokeStyle(2, customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
        refreshPreview();
    });
    randomBtn.on('pointerover', () => randomBtn.setAlpha(0.8));
    randomBtn.on('pointerout', () => randomBtn.setAlpha(1));

    // Play button
    const playBtn = scene.add.rectangle(1000, 460, 150, 50, 0x27AE60, 1).setDepth(201).setInteractive().setStrokeStyle(3, 0x2ECC71);
    creationUI.push(playBtn);
    const playText = scene.add.text(1000, 460, '▶ START GAME', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202);
    creationUI.push(playText);

    playBtn.on('pointerdown', () => {
        creationUI.forEach(obj => obj.destroy());
        creationUI = [];
        startGame(scene);
    });
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ECC71, 1));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27AE60, 1));
}

function startGame(scene) {
    player = createWhimsicalCharacter(scene, 600, 450, playerClass, false, null, customization);

    const nameplate = scene.add.text(0, -65, playerName, {
        fontSize: '13px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    player.add(nameplate);

    const classIcon = scene.add.text(0, -50, classes[playerClass].emoji, { fontSize: '14px' }).setOrigin(0.5);
    player.add(classIcon);

    if (customization.pet !== 'none') {
        playerPet = createPet(scene, 650, 450, customization.pet);
        if (playerPet) playerPet.setDepth(player.depth - 1);
    }

    npc = createWhimsicalCharacter(scene, 400, 500, 'druid', true, { body: 0xE67E22, accent: 0xF39C12, hair: 0x8B4513, skin: 0xF5CBA7 });
    npc.body.setImmovable(true);
    const npcName = scene.add.text(0, -60, 'Mira 🌿', { fontSize: '12px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 4, y: 2 } }).setOrigin(0.5);
    npc.add(npcName);
    npc.interactType = 'npc';
    npc.message = `Welcome, ${playerName}! 🌟\nI'm Mira, the village druid.\nGrow crops, fish, cook recipes!\nSell at the shop for coins!`;
    interactables.push(npc);

    shopkeeper = createWhimsicalCharacter(scene, 815, 230, 'priest', true, { body: 0x27AE60, accent: 0x2ECC71, hair: 0x1E8449, accessory: 'apron', skin: 0xC68642 });
    shopkeeper.body.setImmovable(true);
    const shopName = scene.add.text(0, -60, 'Finn 🛒', { fontSize: '12px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 4, y: 2 } }).setOrigin(0.5);
    shopkeeper.add(shopName);
    shopkeeper.interactType = 'shop';
    shopkeeper.message = `Hello, ${playerName}! 🛒\nBring me crops, fish, or cooked dishes!\nPress E again to trade.`;
    interactables.push(shopkeeper);

    scene.physics.add.collider(player, obstacles);
    scene.physics.add.collider(player, npc);
    scene.physics.add.collider(player, shopkeeper);

    if (playerClass === 'warrior') {
        baseSpeed = 240;
        maxSpeed = 320;
    }

    scene.gameStarted = true;

    // Connect to multiplayer server
    connectToServer();
}

// === UPDATE ===
function update(time, delta) {
    if (!this.gameStarted) return;

    // Time
    gameTime += timeSpeed / 60;
    if (gameTime >= 1440) gameTime = 0;

    const phase = getDayPhase();
    isNight = (phase === 'night');

    let overlayAlpha = 0;
    if (phase === 'dawn') overlayAlpha = 0.12;
    else if (phase === 'dusk') overlayAlpha = 0.2;
    else if (phase === 'night') overlayAlpha = 0.45;
    dayOverlay.setFillStyle(0x0a0a23, overlayAlpha);

    const emoji = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
    timeDisplay.setText(`${emoji[phase]} ${getTimeString()}`);

    // Sparkle animations
    if (player && player.sparkles) {
        const t = time / 1000;
        player.sparkles.forEach((s, i) => s.setAlpha(0.3 + 0.5 * Math.sin(t * 3 + i)));
        player.shadow.setScale(0.9 + 0.1 * Math.sin(t * 2));
    }

    // Pet following (smooth)
    if (playerPet) {
        const petDx = player.x - playerPet.x;
        const petDy = player.y - playerPet.y;
        const petDist = Math.sqrt(petDx * petDx + petDy * petDy);

        if (petDist > 60) {
            const petSpeed = currentSpeed * 0.9;
            playerPet.body.setVelocity((petDx / petDist) * petSpeed, (petDy / petDist) * petSpeed);
        } else if (petDist > 40) {
            const petSpeed = currentSpeed * 0.5;
            playerPet.body.setVelocity((petDx / petDist) * petSpeed, (petDy / petDist) * petSpeed);
        } else {
            playerPet.body.velocity.x *= 0.9;
            playerPet.body.velocity.y *= 0.9;
        }
    }

    // Dialog handling
    if (isDialogOpen) {
        if (Phaser.Input.Keyboard.JustDown(interactKey)) {
            if (currentInteractable?.interactType === 'shop' && !this.shopMenuOpen) {
                this.shopMenuOpen = true;
                showShopMenu();
            } else if (currentInteractable?.interactType === 'craft' && !craftingOpen) {
                craftingOpen = true;
                showCraftingMenu();
            } else {
                closeDialog();
                this.shopMenuOpen = false;
                craftingOpen = false;
            }
        }
        return;
    }

    // Fishing
    if (isFishing) {
        fishingTimer++;
        const catchTime = playerClass === 'shaman' ? 80 : 120;
        fishingPrompt.setText(`🎣 Fishing... ${Math.floor(fishingTimer/60)}s`).setVisible(true);

        if (fishingTimer > catchTime + Math.random() * 80) {
            let fishType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
            if (playerClass === 'shaman' && Math.random() > 0.5) {
                fishType = Math.random() > 0.5 ? 'salmon' : 'goldfish';
            }
            inventory.fish[fishType]++;
            updateInventoryDisplay();
            const fishEmoji = { bass: '🐟', salmon: '🐠', goldfish: '✨🐟' };
            showDialog(`Caught a ${fishType}! ${fishEmoji[fishType]}`);
            isFishing = false;
            fishingPrompt.setVisible(false);
        }
        return;
    } else {
        fishingPrompt.setVisible(false);
    }

    // === SMOOTH MOVEMENT WITH ACCELERATION ===
    moveDirection.x = 0;
    moveDirection.y = 0;

    if (wasd.left.isDown || cursors.left.isDown) moveDirection.x = -1;
    else if (wasd.right.isDown || cursors.right.isDown) moveDirection.x = 1;
    if (wasd.up.isDown || cursors.up.isDown) moveDirection.y = -1;
    else if (wasd.down.isDown || cursors.down.isDown) moveDirection.y = 1;

    // Normalize diagonal movement
    const moveMagnitude = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.y * moveDirection.y);

    if (moveMagnitude > 0) {
        // Accelerate
        currentSpeed = Math.min(currentSpeed + acceleration, maxSpeed);
        moveDirection.x /= moveMagnitude;
        moveDirection.y /= moveMagnitude;
        targetVelocity.x = moveDirection.x * currentSpeed;
        targetVelocity.y = moveDirection.y * currentSpeed;
    } else {
        // Decelerate
        currentSpeed = Math.max(currentSpeed - deceleration, 0);
        targetVelocity.x *= 0.85;
        targetVelocity.y *= 0.85;
    }

    // Smooth velocity interpolation
    const currentVel = player.body.velocity;
    const lerpFactor = 0.2;
    player.body.setVelocity(
        currentVel.x + (targetVelocity.x - currentVel.x) * lerpFactor,
        currentVel.y + (targetVelocity.y - currentVel.y) * lerpFactor
    );

    // Multiplayer: Send position to server and interpolate other players
    sendPositionToServer();
    interpolateOtherPlayers();

    // NPC behavior
    let miraTarget = isNight ? miraHome : npcPatrolPoints[currentPatrolIndex];
    if (isNight) npc.message = "*yawns* 🌙\nGood night, friend!";

    const dx = miraTarget.x - npc.x;
    const dy = miraTarget.y - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
        if (!isNight) currentPatrolIndex = (currentPatrolIndex + 1) % npcPatrolPoints.length;
        npc.body.setVelocity(0);
    } else {
        npc.body.setVelocity((dx / dist) * npcSpeed, (dy / dist) * npcSpeed);
    }

    // Interactables
    canInteract = false;
    currentInteractable = null;

    interactables.forEach(obj => {
        const ox = obj.x ?? obj.body?.position.x;
        const oy = obj.y ?? obj.body?.position.y;
        if (Phaser.Math.Distance.Between(player.x, player.y, ox, oy) < 60) {
            canInteract = true;
            currentInteractable = obj;
        }
    });

    if (canInteract && currentInteractable) {
        const type = currentInteractable.interactType;
        let prompt = 'E: ';
        if (type === 'npc') prompt += 'Talk';
        else if (type === 'shop') prompt += 'Shop';
        else if (type === 'craft') prompt += 'Cook (or C)';
        else prompt += 'Interact';
        interactPrompt.setText(prompt).setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(interactKey)) {
            showDialog(currentInteractable.message);
        }
    } else {
        interactPrompt.setVisible(false);
    }

    // Cooking hotkey
    if (Phaser.Input.Keyboard.JustDown(craftKey)) {
        const distToCraft = Phaser.Math.Distance.Between(player.x, player.y, 455, 640);
        if (distToCraft < 70) {
            craftingOpen = true;
            showCraftingMenu();
        }
    }

    // Tab for seed cycling
    if (Phaser.Input.Keyboard.JustDown(tabKey)) {
        currentSeedIndex = (currentSeedIndex + 1) % seedTypes.length;
        updateSeedIndicator(game.scene.scenes[0]);
    }

    // Fishing prompt
    const distToPond = Phaser.Math.Distance.Between(player.x, player.y, 1000, 600);
    if (distToPond < 100 && distToPond > 45 && !canInteract) {
        fishingPrompt.setText('F: Fish 🎣').setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(fishKey)) {
            isFishing = true;
            fishingTimer = 0;
            fishingPrompt.setText('🎣 Casting...').setVisible(true);
        }
    }

    // Seed pickups
    let nearPickup = null;
    seedPickups.forEach(p => {
        if (!p.isCollected && Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) < 35) nearPickup = p;
    });

    if (nearPickup && !canInteract) {
        interactPrompt.setText('E: Collect seeds').setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey)) {
            let amount = 2 + Math.floor(Math.random() * 2);
            if (playerClass === 'hunter') amount += 1;
            inventory.seeds[nearPickup.seedType] += amount;
            nearPickup.isCollected = true;
            nearPickup.respawnTimer = 0;
            drawSeedPickup(nearPickup);
            updateInventoryDisplay();
            updateSeedIndicator(game.scene.scenes[0]);
            showDialog(`Found ${amount} ${nearPickup.seedType} seeds! 🌱`);
        }
    }

    seedPickups.forEach(p => {
        if (p.isCollected) {
            p.respawnTimer++;
            if (p.respawnTimer > 900) {
                p.isCollected = false;
                drawSeedPickup(p);
            }
        }
    });

    // Farming
    let nearPlot = null;
    farmPlots.forEach(p => {
        if (Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) < 40) nearPlot = p;
    });

    if (nearPlot) {
        const seed = seedTypes[currentSeedIndex];
        const count = inventory.seeds[seed];
        let text = '';

        if (nearPlot.state === 'grass') text = 'H: Hoe';
        else if (nearPlot.state === 'tilled') text = count > 0 ? `P: Plant ${seed}` : `No seeds! TAB`;
        else if (nearPlot.state === 'ready') text = 'E: Harvest! 🎉';
        else text = '🌱 Growing...';

        farmPrompt.setText(text).setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(hoeKey) && nearPlot.state === 'grass') {
            nearPlot.state = 'tilled';
            drawPlot(nearPlot);
        }

        if (Phaser.Input.Keyboard.JustDown(plantKey) && nearPlot.state === 'tilled' && count > 0) {
            inventory.seeds[seed]--;
            nearPlot.state = 'planted';
            nearPlot.crop = seed;
            nearPlot.growthTimer = 0;
            drawPlot(nearPlot);
            drawPlant(game.scene.scenes[0], nearPlot);
            updateInventoryDisplay();
            updateSeedIndicator(game.scene.scenes[0]);
        }

        if (Phaser.Input.Keyboard.JustDown(interactKey) && nearPlot.state === 'ready') {
            inventory.crops[nearPlot.crop]++;
            showDialog(`Harvested ${nearPlot.crop}! 🎉`);
            nearPlot.state = 'tilled';
            if (nearPlot.plantGraphics) nearPlot.plantGraphics.destroy();
            nearPlot.crop = null;
            drawPlot(nearPlot);
            updateInventoryDisplay();
        }
    } else {
        farmPrompt.setVisible(false);
    }

    // Plant growth
    const growthMultiplier = playerClass === 'druid' ? 1.2 : 1;
    farmPlots.forEach(p => {
        if (p.state === 'planted' || p.state === 'growing') {
            p.growthTimer += growthMultiplier;
            if (p.state === 'planted' && p.growthTimer > 180) {
                p.state = 'growing';
                drawPlant(game.scene.scenes[0], p);
            } else if (p.state === 'growing' && p.growthTimer > 360) {
                p.state = 'ready';
                drawPlant(game.scene.scenes[0], p);
            }
        }
    });
}

function showShopMenu() {
    let text = "═══ 🛒 FINN'S SHOP ═══\n\n";
    text += "SELL CROPS:\n";
    text += `1: 🥕 Carrot (${inventory.crops.carrot}) → ${sellPrices.crops.carrot}💰\n`;
    text += `2: 🍅 Tomato (${inventory.crops.tomato}) → ${sellPrices.crops.tomato}💰\n`;
    text += `3: 🌸 Flower (${inventory.crops.flower}) → ${sellPrices.crops.flower}💰\n`;
    text += "SELL FISH:\n";
    text += `4: 🐟 Bass (${inventory.fish.bass}) → ${sellPrices.fish.bass}💰\n`;
    text += `5: 🐠 Salmon (${inventory.fish.salmon}) → ${sellPrices.fish.salmon}💰\n`;
    text += `6: ✨ Goldfish (${inventory.fish.goldfish}) → ${sellPrices.fish.goldfish}💰\n`;
    text += "SELL COOKED:\n";
    text += `7: 🥗 Salad (${inventory.crafted.salad}) → 50💰 | 8: 💐 Bouquet (${inventory.crafted.bouquet}) → 80💰\n`;
    text += "[Press 1-8 to sell, E to close]";

    showDialog(text);

    const scene = game.scene.scenes[0];
    scene.input.keyboard.once('keydown-ONE', () => sellItem('crops', 'carrot'));
    scene.input.keyboard.once('keydown-TWO', () => sellItem('crops', 'tomato'));
    scene.input.keyboard.once('keydown-THREE', () => sellItem('crops', 'flower'));
    scene.input.keyboard.once('keydown-FOUR', () => sellItem('fish', 'bass'));
    scene.input.keyboard.once('keydown-FIVE', () => sellItem('fish', 'salmon'));
    scene.input.keyboard.once('keydown-SIX', () => sellItem('fish', 'goldfish'));
    scene.input.keyboard.once('keydown-SEVEN', () => sellItem('crafted', 'salad'));
    scene.input.keyboard.once('keydown-EIGHT', () => sellItem('crafted', 'bouquet'));
}

function showCraftingMenu() {
    let text = "═══ 🍳 COOKING ═══\n\n";
    text += "RECIPES:\n";
    text += `1: 🥗 Salad = 🥕1 + 🍅1 (have: ${inventory.crops.carrot}/${inventory.crops.tomato})\n`;
    text += `2: 💐 Bouquet = 🌸3 (have: ${inventory.crops.flower})\n`;
    text += `3: 🍲 Fish Stew = 🐟2 + 🍅1 (have: ${inventory.fish.bass}/${inventory.crops.tomato})\n`;
    text += `4: ✨ Magic Potion = 🌸2 + ✨🐟1 (have: ${inventory.crops.flower}/${inventory.fish.goldfish})\n\n`;
    text += "[Press 1-4 to cook, E to close]";

    showDialog(text);

    const scene = game.scene.scenes[0];
    scene.input.keyboard.once('keydown-ONE', () => craftItem('salad'));
    scene.input.keyboard.once('keydown-TWO', () => craftItem('bouquet'));
    scene.input.keyboard.once('keydown-THREE', () => craftItem('fishStew'));
    scene.input.keyboard.once('keydown-FOUR', () => craftItem('magicPotion'));
}

function craftItem(item) {
    const recipe = recipes[item];
    let canCraft = true;

    for (const [ing, amount] of Object.entries(recipe.ingredients)) {
        const have = inventory.crops[ing] ?? inventory.fish[ing] ?? 0;
        if (have < amount) canCraft = false;
    }

    if (canCraft) {
        for (const [ing, amount] of Object.entries(recipe.ingredients)) {
            if (inventory.crops[ing] !== undefined) inventory.crops[ing] -= amount;
            else if (inventory.fish[ing] !== undefined) inventory.fish[ing] -= amount;
        }
        inventory.crafted[item]++;
        updateInventoryDisplay();
        showCraftingMenu();
    }
}

function sellItem(category, item) {
    if (inventory[category][item] > 0) {
        inventory[category][item]--;
        coins += sellPrices[category]?.[item] ?? 50;
        updateInventoryDisplay();
        updateCoinDisplay();
        showShopMenu();
    }
}

function closeDialog() {
    isDialogOpen = false;
    isFishing = false;
    craftingOpen = false;
    dialogBox.setVisible(false);
    dialogText.setVisible(false);
    game.scene.scenes[0].dialogCloseText.setVisible(false);
}

// === MULTIPLAYER FUNCTIONS ===

async function connectToServer() {
    try {
        const client = new Colyseus.Client(SERVER_URL);

        room = await client.joinOrCreate("game", {
            name: playerName,
            playerClass: playerClass,
            customization: customization
        });

        console.log("Connected to server! Session ID:", room.sessionId);

        // Listen for players joining
        room.state.players.onAdd((playerData, sessionId) => {
            // Skip if this is our own player
            if (sessionId === room.sessionId) {
                console.log("Local player registered on server");
                return;
            }

            console.log("Player joined:", sessionId, playerData.name);
            createOtherPlayer(sessionId, playerData);

            // Listen for position changes on this player
            playerData.listen("x", (newX) => {
                updateOtherPlayer(sessionId, newX, null);
            });

            playerData.listen("y", (newY) => {
                updateOtherPlayer(sessionId, null, newY);
            });
        });

        // Listen for players leaving
        room.state.players.onRemove((playerData, sessionId) => {
            console.log("Player left:", sessionId);
            if (otherPlayers[sessionId]) {
                otherPlayers[sessionId].destroy();
                delete otherPlayers[sessionId];
            }
        });

        // Handle disconnection
        room.onLeave((code) => {
            console.log("Left room with code:", code);
            room = null;
            // Clean up all other players
            Object.keys(otherPlayers).forEach(sessionId => {
                if (otherPlayers[sessionId]) {
                    otherPlayers[sessionId].destroy();
                }
            });
            otherPlayers = {};
        });

        room.onError((code, message) => {
            console.error("Room error:", code, message);
        });

    } catch (error) {
        console.error("Failed to connect to server:", error);
        // Game continues in single-player mode
    }
}

function createOtherPlayer(sessionId, playerData) {
    const scene = game.scene.scenes[0];

    // Extract customization data from server
    const charCustom = {
        skinTone: playerData.customization?.skinTone || 0xFFDBB4,
        hairColor: playerData.customization?.hairColor || 0x4A3728,
        gender: playerData.customization?.gender || 'female',
        pet: playerData.customization?.pet || 'none'
    };

    const classType = playerData.playerClass || 'druid';
    const x = playerData.x || 600;
    const y = playerData.y || 450;

    // Create a simplified player container (no physics needed for other players)
    const container = scene.add.container(x, y);
    const cls = classes[classType] || classes.druid;
    const isFemale = charCustom.gender === 'female';

    container.floatOffset = Math.random() * Math.PI * 2;
    container.targetX = x;
    container.targetY = y;

    // Shadow
    const shadow = scene.add.ellipse(0, 28, 30, 10, 0x000000, 0.25);
    container.add(shadow);

    const bodyColor = cls.color;

    if (isFemale) {
        container.add(scene.add.ellipse(0, -2, 28, 14, bodyColor));
        container.add(scene.add.ellipse(0, 8, 18, 12, bodyColor));
        container.add(scene.add.ellipse(0, 18, 26, 16, bodyColor));
        container.add(scene.add.triangle(0, 28, -18, 0, 0, 12, 18, 0, bodyColor));
        const accentColor = cls.accent;
        container.add(scene.add.ellipse(0, 10, 20, 4, accentColor));
        container.add(scene.add.circle(-4, 10, 3, accentColor));
        container.add(scene.add.circle(4, 10, 3, accentColor));
        container.add(scene.add.circle(0, 10, 2, 0xFFFFFF, 0.5));
    } else {
        container.add(scene.add.ellipse(0, 8, 28, 36, bodyColor));
        container.add(scene.add.ellipse(0, 10, 20, 24, cls.accent, 0.5));
    }

    const skinTone = charCustom.skinTone;
    container.add(scene.add.circle(0, -20, 18, skinTone));
    container.add(scene.add.ellipse(-10, -15, 6, 4, 0xFFB6C1, 0.6));
    container.add(scene.add.ellipse(10, -15, 6, 4, 0xFFB6C1, 0.6));

    const hairColor = charCustom.hairColor;

    if (isFemale) {
        container.add(scene.add.ellipse(-14, -10, 10, 35, hairColor));
        container.add(scene.add.ellipse(14, -10, 10, 35, hairColor));
        container.add(scene.add.ellipse(-16, 5, 8, 20, hairColor));
        container.add(scene.add.ellipse(16, 5, 8, 20, hairColor));
        container.add(scene.add.circle(-12, -34, 11, hairColor));
        container.add(scene.add.circle(12, -34, 11, hairColor));
        container.add(scene.add.circle(0, -38, 13, hairColor));
        container.add(scene.add.circle(-6, -36, 10, hairColor));
        container.add(scene.add.circle(6, -36, 10, hairColor));
        container.add(scene.add.ellipse(-8, -30, 8, 6, hairColor));
        container.add(scene.add.ellipse(8, -30, 8, 6, hairColor));
        container.add(scene.add.ellipse(0, -32, 6, 5, hairColor));
    } else {
        container.add(scene.add.circle(-10, -32, 10, hairColor));
        container.add(scene.add.circle(10, -32, 10, hairColor));
        container.add(scene.add.circle(0, -36, 12, hairColor));
        container.add(scene.add.circle(-6, -34, 8, hairColor));
        container.add(scene.add.circle(6, -34, 8, hairColor));
    }

    // Eyes
    container.add(scene.add.ellipse(-7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.ellipse(7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.circle(-7, -21, 4, 0x000000));
    container.add(scene.add.circle(7, -21, 4, 0x000000));
    container.add(scene.add.circle(-6, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(8, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(-8, -20, 1, 0xFFFFFF));
    container.add(scene.add.circle(6, -20, 1, 0xFFFFFF));

    // Eyelashes for feminine
    if (isFemale) {
        container.add(scene.add.line(0, 0, -12, -28, -14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, -9, -30, -10, -34, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 12, -28, 14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 9, -30, 10, -34, 0x000000).setLineWidth(1.5));
    }

    // Mouth
    const mouth = scene.add.arc(0, -12, 5, 0, 180, false, 0x000000);
    mouth.setStrokeStyle(2, 0x000000);
    container.add(mouth);

    // Nameplate
    const nameplate = scene.add.text(0, -65, playerData.name || 'Player', {
        fontSize: '13px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    container.add(nameplate);

    // Class icon
    const classIcon = scene.add.text(0, -50, cls.emoji, { fontSize: '14px' }).setOrigin(0.5);
    container.add(classIcon);

    // Store in otherPlayers map
    otherPlayers[sessionId] = container;

    return container;
}

function updateOtherPlayer(sessionId, newX, newY) {
    const otherPlayer = otherPlayers[sessionId];
    if (!otherPlayer) return;

    // Update target positions for interpolation
    if (newX !== null) otherPlayer.targetX = newX;
    if (newY !== null) otherPlayer.targetY = newY;
}

function interpolateOtherPlayers() {
    // Smoothly move other players towards their target positions
    const lerpFactor = 0.15;

    Object.keys(otherPlayers).forEach(sessionId => {
        const otherPlayer = otherPlayers[sessionId];
        if (!otherPlayer || otherPlayer.targetX === undefined) return;

        // Interpolate position
        otherPlayer.x += (otherPlayer.targetX - otherPlayer.x) * lerpFactor;
        otherPlayer.y += (otherPlayer.targetY - otherPlayer.y) * lerpFactor;
    });
}

function sendPositionToServer() {
    if (!room || !player) return;

    const vx = Math.round(player.body.velocity.x);
    const vy = Math.round(player.body.velocity.y);

    // Only send when velocity changes significantly (not every frame)
    const velocityChanged = Math.abs(vx - lastSentVelocity.x) > 5 ||
                           Math.abs(vy - lastSentVelocity.y) > 5;

    if (velocityChanged) {
        room.send("move", {
            x: Math.round(player.x),
            y: Math.round(player.y),
            velocityX: vx,
            velocityY: vy
        });

        lastSentVelocity.x = vx;
        lastSentVelocity.y = vy;
    }
}
