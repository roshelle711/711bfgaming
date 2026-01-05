/**
 * game.js - Main entry point for 711BF Gaming
 *
 * This file orchestrates all modules and manages the Phaser lifecycle.
 * For feature-specific code, see the modules/ directory.
 */

// === MODULE IMPORTS ===
import { GAME_WIDTH, GAME_HEIGHT, classes, baseSpeed, maxSpeed, fruitTreePositions } from './modules/config.js';
import { GameState } from './modules/state.js';
import { getTimeString, getDayPhase } from './modules/utils.js';
import { createWhimsicalCharacter, createPet, updatePlayerMovement, updatePetFollow, updatePlayerSparkles, createToolGraphics, updateHeldTool, equipTool, initActionAnimations, updateActionAnimations, petDoTrick, isNearPet } from './modules/player.js';
import { createHouse, createFarmPlot, drawTree, createSeedPickup, createNPCs, updateNPCPatrol, drawLamppost, drawLamppostLight, createFruitTree } from './modules/world.js';
import { setupUI, showCharacterCreation, showDialog, closeDialog, updateInventoryDisplay, updateSeedIndicator, updateCoinDisplay, toggleInventory, setActiveHotbarSlot, updateHotbarDisplay, showPauseMenu, closePauseMenu } from './modules/ui.js';
import { hoePlot, plantSeed, harvestCrop, updatePlantGrowth, cycleSeedType, startFishing, updateFishing, showShopMenu, showCraftingMenu, checkSeedPickups, respawnSeedPickups, findNearestFarmPlot, isNearPond, isNearCookingStation, waterPlot, removeHazard, harvestFruit, findNearestFruitTree, updateFruitRegrowth } from './modules/systems.js';
import { connectToServer, interpolateOtherPlayers, sendPositionToServer, interpolateNPCs, sendToggleLamppost, sendWaterAction, sendRemoveHazard, sendHarvestFruit } from './modules/multiplayer.js';

// === PHASER CONFIGURATION ===
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
        roundPixels: true  // Prevents blurry text from subpixel rendering
    },
    scene: { preload, create, update },
    dom: { createContainer: true }
};

// Create the game
const game = new Phaser.Game(config);

// === PHASER LIFECYCLE ===

function preload() {
    // No assets to preload (all graphics are procedural)
}

function create() {
    const graphics = this.add.graphics();

    // === WORLD SETUP ===
    // Background grass with subtle gradient effect
    graphics.fillStyle(0x90EE90, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grass variation - lighter areas (sun patches)
    graphics.fillStyle(0xA8F0A8, 0.4);
    for (let i = 0; i < 15; i++) {
        const patchX = Math.random() * GAME_WIDTH;
        const patchY = Math.random() * GAME_HEIGHT;
        graphics.fillEllipse(patchX, patchY, 80 + Math.random() * 100, 40 + Math.random() * 60);
    }

    // Grass variation - darker tufts
    graphics.fillStyle(0x7CCD7C, 1);
    for (let i = 0; i < 250; i++) {
        graphics.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 2 + Math.random() * 5);
    }

    // Small grass blades for texture
    graphics.fillStyle(0x6BBF6B, 0.6);
    for (let i = 0; i < 300; i++) {
        const gx = Math.random() * GAME_WIDTH;
        const gy = Math.random() * GAME_HEIGHT;
        graphics.fillTriangle(gx, gy, gx - 1, gy + 6, gx + 1, gy + 6);
    }

    // Flowers in small random clusters across the map
    const flowerColors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0xFFB6C1, 0xDDA0DD];

    // Proper seeded random using Linear Congruential Generator (LCG)
    // This produces different results each game load based on timestamp
    let seed = Date.now() % 2147483647;
    if (seed <= 0) seed += 2147483646;

    const seededRandom = () => {
        // LCG parameters from Numerical Recipes
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    // Forbidden zones - flowers cannot spawn here (with extra padding)
    const forbiddenZones = [
        // Pond (ellipse at 180, 720 with larger exclusion)
        { type: 'ellipse', x: 180, y: 720, rx: 110, ry: 90 },
        // Farm area with LOTS of padding (the whole farm region)
        { type: 'rect', x: 340, y: 580, w: 320, h: 230 },
        // Mira's cottage with padding
        { type: 'rect', x: 155, y: 80, w: 160, h: 150 },
        // Your home with padding
        { type: 'rect', x: 805, y: 80, w: 160, h: 150 },
        // General store with padding
        { type: 'rect', x: 1120, y: 510, w: 160, h: 150 },
        // Main horizontal path
        { type: 'rect', x: 140, y: 265, w: 1120, h: 55 },
        // Vertical paths (wider exclusion)
        { type: 'rect', x: 665, y: 270, w: 60, h: 440 },
        { type: 'rect', x: 220, y: 185, w: 60, h: 100 },
        { type: 'rect', x: 870, y: 185, w: 60, h: 100 },
        { type: 'rect', x: 1165, y: 485, w: 60, h: 210 },
        // Well with padding
        { type: 'rect', x: 580, y: 330, w: 120, h: 130 },
        // Cooking station with padding
        { type: 'rect', x: 1000, y: 410, w: 100, h: 80 },
        // Signpost area
        { type: 'rect', x: 640, y: 310, w: 130, h: 60 },
    ];

    // Check if a point is in a forbidden zone
    function isInForbiddenZone(x, y) {
        for (const zone of forbiddenZones) {
            if (zone.type === 'rect') {
                if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
                    return true;
                }
            } else if (zone.type === 'ellipse') {
                const dx = (x - zone.x) / zone.rx;
                const dy = (y - zone.y) / zone.ry;
                if (dx * dx + dy * dy <= 1) {
                    return true;
                }
            }
        }
        return false;
    }

    // Generate 30-40 small random clusters (1-3 flowers each)
    const numClusters = 30 + Math.floor(seededRandom() * 11);
    for (let c = 0; c < numClusters; c++) {
        // Pick random position across entire map using seeded random
        let clusterX, clusterY;
        let attempts = 0;
        do {
            clusterX = 50 + seededRandom() * (GAME_WIDTH - 100);
            clusterY = 50 + seededRandom() * (GAME_HEIGHT - 100);
            attempts++;
        } while (isInForbiddenZone(clusterX, clusterY) && attempts < 30);

        // Skip if we couldn't find a valid position
        if (isInForbiddenZone(clusterX, clusterY)) continue;

        const clusterSize = 1 + Math.floor(seededRandom() * 3); // 1-3 flowers per cluster
        const clusterColor = flowerColors[Math.floor(seededRandom() * flowerColors.length)];

        for (let f = 0; f < clusterSize; f++) {
            // Mix of cluster color and random colors for variety
            const useClusterColor = seededRandom() > 0.3;
            const color = useClusterColor ? clusterColor : flowerColors[Math.floor(seededRandom() * flowerColors.length)];
            graphics.fillStyle(color, 0.6 + seededRandom() * 0.3);

            // Flowers spread within 10-20px of cluster center
            const spread = 10 + seededRandom() * 10;
            const angle = seededRandom() * Math.PI * 2;
            const dist = seededRandom() * spread;
            const fx = clusterX + Math.cos(angle) * dist;
            const fy = clusterY + Math.sin(angle) * dist;

            // Double check the flower position isn't forbidden
            if (!isInForbiddenZone(fx, fy)) {
                graphics.fillCircle(fx, fy, 2 + seededRandom() * 3);
            }
        }
    }

    // Paths - with subtle edge shadows for depth
    const pathData = [
        { x: 150, y: 280, w: 1100, h: 30 },  // Main horizontal path
        { x: 680, y: 280, w: 30, h: 420 },   // Main vertical path (center)
        { x: 235, y: 200, w: 30, h: 85 },    // To Mira's cottage
        { x: 885, y: 200, w: 30, h: 85 },    // To Your Home
        { x: 1180, y: 500, w: 30, h: 180 }   // To General Store
    ];

    // Path shadows (underneath)
    graphics.fillStyle(0x8B7355, 0.3);
    pathData.forEach(p => graphics.fillRect(p.x + 2, p.y + 2, p.w, p.h));

    // Main path surface
    graphics.fillStyle(0xD2B48C, 1);
    pathData.forEach(p => graphics.fillRect(p.x, p.y, p.w, p.h));

    // Path highlight (top edge)
    graphics.fillStyle(0xE8D4B8, 0.5);
    pathData.forEach(p => graphics.fillRect(p.x, p.y, p.w, 3));

    // Path texture - pebbles and dirt
    graphics.fillStyle(0xC4A77D, 0.5);
    for (let i = 0; i < 120; i++) {
        graphics.fillCircle(150 + Math.random() * 1100, 282 + Math.random() * 26, 3 + Math.random() * 4);
    }
    // Darker pebbles for variety
    graphics.fillStyle(0xA68B5B, 0.4);
    for (let i = 0; i < 60; i++) {
        graphics.fillCircle(150 + Math.random() * 1100, 282 + Math.random() * 26, 2 + Math.random() * 3);
    }

    // Obstacles group
    GameState.obstacles = this.physics.add.staticGroup();

    // Trees - each on separate graphics with depth based on Y position
    // Some trees are "foreground" (high depth) and some are "background" (low depth)
    const trees = [
        { x: 60, y: 100, s: 35, foreground: false },
        { x: 1340, y: 100, s: 40, foreground: false },
        { x: 60, y: 800, s: 42, foreground: true },    // Bottom-left in front
        { x: 1340, y: 800, s: 38, foreground: true },  // Bottom-right in front
        { x: 60, y: 450, s: 36, foreground: false },
        { x: 1340, y: 450, s: 34, foreground: true },  // Middle-right in front
        { x: 1050, y: 150, s: 32, foreground: false },
        { x: 100, y: 650, s: 30, foreground: true },   // Lower-left in front
        { x: 1340, y: 600, s: 33, foreground: false },
        { x: 60, y: 250, s: 28, foreground: false }
    ];
    trees.forEach(t => {
        // Each tree gets its own graphics object for depth control
        const treeGfx = this.add.graphics();
        // Foreground trees have depth 900+ (above player ~450), background trees use Y position
        const treeDepth = t.foreground ? 900 + t.y : t.y;
        treeGfx.setDepth(treeDepth);

        // Ground shadow (ellipse beneath tree)
        treeGfx.fillStyle(0x1a3a1a, 0.25);
        treeGfx.fillEllipse(t.x + 5, t.y + t.s + 15, t.s * 1.2, t.s * 0.5);

        // Trunk
        treeGfx.fillStyle(0x5D4037, 1);
        treeGfx.fillRect(t.x - 7, t.y + t.s - 10, 14, 32);
        treeGfx.fillStyle(0x4A3328, 0.6);
        treeGfx.fillRect(t.x - 4, t.y + t.s - 5, 3, 25);  // Bark texture

        // Foliage layers (back to front for depth)
        treeGfx.fillStyle(0x1B5E20, 0.8);  // Deep shadow
        treeGfx.fillCircle(t.x + 5, t.y + 5, t.s * 0.75);
        treeGfx.fillStyle(0x2ECC71, 1);     // Mid leaves
        treeGfx.fillCircle(t.x - 12, t.y - 6, t.s * 0.7);
        treeGfx.fillCircle(t.x + 12, t.y - 6, t.s * 0.7);
        treeGfx.fillStyle(0x27AE60, 1);     // Main canopy
        treeGfx.fillCircle(t.x, t.y - 12, t.s * 0.8);
        treeGfx.fillStyle(0x229954, 1);     // Top layer
        treeGfx.fillCircle(t.x, t.y, t.s);
        treeGfx.fillStyle(0x58D68D, 0.5);   // Highlight (sun)
        treeGfx.fillCircle(t.x - 8, t.y - 10, t.s * 0.4);

        GameState.obstacles.add(this.add.rectangle(t.x, t.y + t.s, 18, 18, 0x000000, 0));
    });

    // Houses - repositioned for larger screen
    createHouse(graphics, 235, 150, 0xE74C3C, "🏠 Mira's Cottage", this);
    GameState.obstacles.add(this.add.rectangle(235, 150, 120, 100, 0x000000, 0));
    const miraDoor = this.add.rectangle(235, 205, 40, 35, 0x000000, 0);
    miraDoor.interactType = 'miraDoor';
    miraDoor.message = "Mira's cottage... she's probably outside gardening!";
    GameState.interactables.push(miraDoor);

    createHouse(graphics, 885, 150, 0x3498DB, '🏡 Your Home', this);
    GameState.obstacles.add(this.add.rectangle(885, 150, 120, 100, 0x000000, 0));
    const homeDoor = this.add.rectangle(885, 205, 40, 35, 0x000000, 0);
    homeDoor.interactType = 'homeDoor';
    homeDoor.message = 'Your cozy home... maybe later you can rest here!';
    GameState.interactables.push(homeDoor);

    // General Store needs separate graphics with higher depth to appear in front of nearby fruit trees
    const storeGraphics = this.add.graphics();
    storeGraphics.setDepth(580);  // Depth = Y position for proper layering
    createHouse(storeGraphics, 1200, 580, 0x27AE60, '🏪 General Store', this);
    GameState.obstacles.add(this.add.rectangle(1200, 580, 120, 100, 0x000000, 0));

    // Fishing pond - with depth and natural edges
    const pondX = 180, pondY = 720;

    // Mud/dirt edge around pond
    graphics.fillStyle(0x6B4423, 0.6);
    graphics.fillEllipse(pondX, pondY, 155, 115);

    // Deep water (center)
    graphics.fillStyle(0x2980B9, 0.95);
    graphics.fillEllipse(pondX, pondY, 140, 100);

    // Mid water
    graphics.fillStyle(0x3498DB, 0.8);
    graphics.fillEllipse(pondX, pondY, 120, 85);

    // Shallow edges (lighter)
    graphics.fillStyle(0x5DADE2, 0.9);
    graphics.fillEllipse(pondX, pondY, 100, 70);

    // Surface highlights
    graphics.fillStyle(0x85C1E9, 0.5);
    graphics.fillEllipse(pondX - 25, pondY - 20, 50, 30);
    graphics.fillStyle(0xAED6F1, 0.3);
    graphics.fillEllipse(pondX - 30, pondY - 25, 30, 18);

    // Water ripples
    graphics.lineStyle(1, 0x85C1E9, 0.4);
    graphics.strokeEllipse(pondX + 20, pondY + 10, 25, 15);
    graphics.strokeEllipse(pondX - 35, pondY + 20, 20, 12);

    // Natural edge with rocks
    graphics.lineStyle(3, 0x5D4037, 0.8);
    graphics.strokeEllipse(pondX, pondY, 145, 105);
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const rockDist = 68 + Math.random() * 5;
        graphics.fillStyle(0x808080, 0.8);
        graphics.fillCircle(pondX + Math.cos(angle) * rockDist, pondY + Math.sin(angle) * rockDist * 0.72, 4 + Math.random() * 4);
    }

    // Lily pads and reeds
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 35 + Math.random() * 25;
        graphics.fillStyle(0x228B22, 0.9);
        graphics.fillEllipse(pondX + Math.cos(angle) * dist, pondY + Math.sin(angle) * dist * 0.7, 10, 7);
        graphics.fillStyle(0x90EE90, 0.7);
        graphics.fillEllipse(pondX + Math.cos(angle) * dist - 1, pondY + Math.sin(angle) * dist * 0.7 - 1, 6, 4);
    }

    // Cattails/reeds on edges
    const reedPositions = [
        { x: pondX - 65, y: pondY + 30 },
        { x: pondX + 60, y: pondY + 35 },
        { x: pondX + 70, y: pondY - 25 },
        { x: pondX - 70, y: pondY - 15 }
    ];
    reedPositions.forEach(r => {
        graphics.fillStyle(0x2E7D32, 1);
        graphics.fillRect(r.x - 1, r.y - 20, 2, 25);
        graphics.fillStyle(0x5D4037, 1);
        graphics.fillEllipse(r.x, r.y - 22, 4, 8);
    });

    this.add.text(pondX, pondY - 75, '🎣 Fishing Pond', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Pond collision - prevent walking through the pond
    GameState.obstacles.add(this.add.ellipse(pondX, pondY, 100, 70, 0x000000, 0));

    // Farm area - expanded for more plots (3 rows x 5 columns = 15 plots)
    const farmStartX = 500, farmStartY = 700;
    const farmWidth = 280, farmHeight = 170;
    graphics.fillStyle(0x8B7355, 1);
    graphics.fillRect(farmStartX - farmWidth/2, farmStartY - farmHeight/2, farmWidth, farmHeight);
    graphics.lineStyle(2, 0x654321, 1);
    graphics.strokeRect(farmStartX - farmWidth/2, farmStartY - farmHeight/2, farmWidth, farmHeight);
    graphics.fillStyle(0x5D4037, 0.3);
    for (let i = 0; i < 30; i++) {
        graphics.fillCircle(farmStartX - farmWidth/2 + 10 + Math.random() * (farmWidth - 20), farmStartY - farmHeight/2 + 10 + Math.random() * (farmHeight - 20), 3);
    }
    this.add.text(farmStartX, farmStartY - farmHeight/2 - 15, '🌱 Farm', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Create farm plots with index for server sync (3 rows x 5 columns)
    let plotIndex = 0;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            const plot = createFarmPlot(this, farmStartX - 100 + col * 50, farmStartY - 50 + row * 50, plotIndex);
            GameState.farmPlots.push(plot);
            plotIndex++;
        }
    }

    // Cooking station - repositioned for larger screen
    const cookX = 1050, cookY = 450;
    graphics.fillStyle(0x795548, 1);
    graphics.fillRect(cookX - 35, cookY - 25, 70, 50);
    graphics.fillStyle(0x5D4037, 1);
    graphics.fillRect(cookX - 30, cookY - 20, 60, 40);
    graphics.fillStyle(0xFF6B35, 0.8);
    graphics.fillCircle(cookX - 10, cookY, 8);
    graphics.fillCircle(cookX + 10, cookY + 5, 6);
    graphics.fillStyle(0xFFD93D, 0.6);
    graphics.fillCircle(cookX - 8, cookY - 5, 4);
    graphics.fillCircle(cookX + 12, cookY, 3);
    graphics.fillStyle(0x808080, 1);
    graphics.fillEllipse(cookX, cookY - 10, 25, 12);
    this.add.text(cookX, cookY - 45, '🍳 Cooking', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Seed pickups - scattered around the map (west, middle, east)
    const seedLocations = [
        // West group (near pond)
        { x: 350, y: 500, type: 'carrot' },
        { x: 400, y: 520, type: 'tomato' },
        { x: 320, y: 540, type: 'flower' },
        // Middle group (near farm)
        { x: 550, y: 600, type: 'lettuce' },
        { x: 600, y: 620, type: 'onion' },
        { x: 580, y: 580, type: 'flower' },
        // East group (near store)
        { x: 800, y: 500, type: 'carrot' },
        { x: 850, y: 520, type: 'tomato' },
        { x: 820, y: 550, type: 'flower' }
    ];
    seedLocations.forEach((loc, index) => {
        GameState.seedPickups.push(createSeedPickup(this, loc.x, loc.y, loc.type, index));
    });

    // Well - water source for crops
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(610, 370, 60, 60);
    graphics.fillStyle(0x696969, 1);
    graphics.fillRect(620, 380, 40, 40);
    graphics.fillStyle(0x5DADE2, 0.7);
    graphics.fillRect(625, 385, 30, 30);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(605, 355, 70, 15);
    graphics.fillRect(630, 330, 20, 25);
    // Bucket sitting by the roadside (not on the well)
    this.add.text(570, 380, '🪣', { fontSize: '16px' }).setOrigin(0.5);
    this.add.text(640, 440, '💧 Well', {
        fontSize: '11px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 3, y: 2 }
    }).setOrigin(0.5);
    GameState.obstacles.add(this.add.rectangle(640, 400, 60, 60, 0x000000, 0));

    // Well interaction
    const well = this.add.rectangle(640, 400, 70, 70, 0x000000, 0);
    well.interactType = 'well';
    well.message = '💧 Village Well\n\nFresh water for your crops!\nEquip the watering can (2) to water plants.';
    GameState.interactables.push(well);

    // Signpost - repositioned for larger screen
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(695, 320, 10, 60);
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(655, 325, 100, 25);
    graphics.lineStyle(2, 0x654321, 1);
    graphics.strokeRect(655, 325, 100, 25);
    this.add.text(705, 337, '← Pond  Shop →', {
        fontSize: '10px', fill: '#654321', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Signpost interaction
    const signpost = this.add.rectangle(705, 345, 100, 40, 0x000000, 0);
    signpost.interactType = 'sign';
    signpost.message = '📍 Village Center\n← West: Fishing Pond & Mira\'s Cottage\n↓ South: Farm Plots\n→ East: Cooking Station & General Store';
    GameState.interactables.push(signpost);

    // Victorian lampposts - each individually toggleable (L key when nearby)
    const lamppostPositions = [
        { x: 350, y: 280 },   // West path
        { x: 550, y: 280 },   // Near village center (west)
        { x: 850, y: 280 },   // Near village center (east)
        { x: 1050, y: 280 },  // East path
        { x: 320, y: 450 },   // Near Mira's patrol area
        { x: 780, y: 500 },   // South central
        { x: 1100, y: 500 },  // Near General Store path
        { x: 300, y: 650 }    // Near fishing pond
    ];
    GameState.lampposts = [];
    lamppostPositions.forEach(pos => {
        // Draw structure on main graphics
        drawLamppost(graphics, pos.x, pos.y);
        // Create individual light graphics for each lamppost
        const lightGraphics = this.add.graphics();
        drawLamppostLight(lightGraphics, pos.x, pos.y);
        GameState.lampposts.push({ x: pos.x, y: pos.y, lightOn: true, lightGraphics });
    });

    // Fruit trees - harvestable trees around the map edges
    GameState.fruitTrees = [];
    fruitTreePositions.forEach((pos, index) => {
        const tree = createFruitTree(this, pos.x, pos.y, pos.type, index);
        GameState.fruitTrees.push(tree);
    });

    // Ambient wildlife - birds and butterflies
    GameState.birds = [];
    const birdColors = [0xE74C3C, 0x3498DB, 0xF39C12, 0x9B59B6, 0x1ABC9C]; // Red, blue, orange, purple, teal
    for (let i = 0; i < 5; i++) {
        const bird = this.add.graphics();
        const birdData = {
            x: 200 + Math.random() * 1000,
            y: 100 + Math.random() * 200,
            targetX: 200 + Math.random() * 1000,
            targetY: 100 + Math.random() * 200,
            wingPhase: Math.random() * Math.PI * 2,
            speed: 40 + Math.random() * 30,
            color: birdColors[i % birdColors.length],
            facingRight: true,
            graphics: bird,
            perched: false,        // Is the bird perched on a lamppost?
            perchTimer: 0,         // How long until it takes off again
            perchLamppost: null    // Which lamppost it's on
        };
        GameState.birds.push(birdData);
    }

    GameState.butterflies = [];
    const butterflyColors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0xDDA0DD, 0xFFA500];
    for (let i = 0; i < 8; i++) {
        const butterfly = this.add.graphics();
        const butterflyData = {
            x: 100 + Math.random() * 1200,
            y: 300 + Math.random() * 500,
            targetX: 100 + Math.random() * 1200,
            targetY: 300 + Math.random() * 500,
            wingPhase: Math.random() * Math.PI * 2,
            color: butterflyColors[Math.floor(Math.random() * butterflyColors.length)],
            speed: 20 + Math.random() * 20,
            graphics: butterfly
        };
        GameState.butterflies.push(butterflyData);
    }

    // === UI SETUP ===
    setupUI(this);

    // Lamppost prompt (added after UI setup)
    GameState.lamppostPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 240, '', {
        fontSize: '14px', fill: '#FFD700', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Water prompt (added after UI setup)
    GameState.waterPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, '', {
        fontSize: '14px', fill: '#87CEEB', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Hazard prompt (added after UI setup)
    GameState.hazardPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 180, '', {
        fontSize: '14px', fill: '#FF6B6B', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Fruit tree prompt (added after UI setup)
    GameState.fruitTreePrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 220, '', {
        fontSize: '14px', fill: '#90EE90', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // === SHOW CHARACTER CREATION ===
    // Input setup moved to startGame() to avoid capturing keys during name entry
    showCharacterCreation(this, () => startGame(this));
}

/**
 * Start the game after character creation
 */
function startGame(scene) {
    // Store scene reference for multiplayer module
    GameState.scene = scene;

    // === INPUT SETUP (after character creation to avoid capturing keys during name entry) ===
    GameState.cursors = scene.input.keyboard.createCursorKeys();
    GameState.wasd = scene.input.keyboard.addKeys('W,S,A,D');
    GameState.interactKey = scene.input.keyboard.addKey('E');
    GameState.escapeKey = scene.input.keyboard.addKey('ESC');
    GameState.tabKey = scene.input.keyboard.addKey('TAB');
    GameState.inventoryKey = scene.input.keyboard.addKey('I');
    // Hotbar slot keys 1-5
    GameState.hotbarKeys = [
        scene.input.keyboard.addKey('ONE'),
        scene.input.keyboard.addKey('TWO'),
        scene.input.keyboard.addKey('THREE'),
        scene.input.keyboard.addKey('FOUR'),
        scene.input.keyboard.addKey('FIVE')
    ];

    // Left click for tool use (with hold-to-repeat for hoe)
    GameState.isHoldingClick = false;
    GameState.holdRepeatTimer = null;

    scene.input.on('pointerdown', (pointer) => {
        console.log('Click detected:', pointer.leftButtonDown(), 'Dialog:', GameState.isDialogOpen, 'Inventory:', GameState.inventoryOpen);
        if (pointer.leftButtonDown() && !GameState.isDialogOpen && !GameState.inventoryOpen) {
            console.log('Calling useActiveItem, tool:', GameState.equippedTool);
            GameState.isHoldingClick = true;
            useActiveItem(scene);

            // Set up hold-to-repeat for hoe
            if (GameState.equippedTool === 'hoe') {
                GameState.holdRepeatTimer = setInterval(() => {
                    if (GameState.isHoldingClick && !GameState.isHoeing) {
                        useActiveItem(scene);
                    }
                }, 350); // Repeat every 350ms while holding
            }
        }
    });

    scene.input.on('pointerup', () => {
        GameState.isHoldingClick = false;
        if (GameState.holdRepeatTimer) {
            clearInterval(GameState.holdRepeatTimer);
            GameState.holdRepeatTimer = null;
        }
    });

    // Create target highlight graphics for hoe
    GameState.targetHighlight = scene.add.graphics();
    GameState.targetHighlight.setDepth(5);

    // Track mouse position for plot selection
    GameState.mouseX = 0;
    GameState.mouseY = 0;
    scene.input.on('pointermove', (pointer) => {
        GameState.mouseX = pointer.worldX;
        GameState.mouseY = pointer.worldY;
    });

    // Create tool graphics and action animations
    createToolGraphics(scene);
    initActionAnimations(scene);

    // Create player
    GameState.player = createWhimsicalCharacter(scene, 700, 450, GameState.playerClass, false, null, GameState.customization);

    // Nameplate
    const nameplate = scene.add.text(0, -65, GameState.playerName, {
        fontSize: '13px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    GameState.player.add(nameplate);

    // Class icon
    const classIcon = scene.add.text(0, -50, classes[GameState.playerClass].emoji, { fontSize: '14px' }).setOrigin(0.5);
    GameState.player.add(classIcon);

    // Create pet
    if (GameState.customization.pet !== 'none') {
        GameState.playerPet = createPet(scene, 650, 450, GameState.customization.pet);
        if (GameState.playerPet) {
            GameState.playerPet.setDepth(GameState.player.depth - 1);
        }
    }

    // Create NPCs
    createNPCs(scene);

    // Collisions
    scene.physics.add.collider(GameState.player, GameState.obstacles);
    if (GameState.npc) scene.physics.add.collider(GameState.player, GameState.npc);
    if (GameState.shopkeeper) scene.physics.add.collider(GameState.player, GameState.shopkeeper);

    // Class bonuses
    if (GameState.playerClass === 'warrior') {
        GameState.baseSpeed = 240;
        GameState.maxSpeed = 320;
    }

    scene.gameStarted = true;

    // Connect to multiplayer
    connectToServer();
}

function update(time, delta) {
    if (!this.gameStarted) return;

    // === TIME & DAY/NIGHT ===
    // Skip local time advancement when connected - server syncs time
    if (!GameState.room) {
        GameState.gameTime += GameState.timeSpeed / 60;
        if (GameState.gameTime >= 1440) GameState.gameTime = 0;
    }

    const phase = getDayPhase(GameState.gameTime);
    GameState.isNight = (phase === 'night');

    let overlayAlpha = 0;
    if (phase === 'dawn') overlayAlpha = 0.08;
    else if (phase === 'dusk') overlayAlpha = 0.15;
    else if (phase === 'night') overlayAlpha = 0.28;
    GameState.dayOverlay.setFillStyle(0x0a0a23, overlayAlpha);

    const emoji = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
    GameState.timeDisplay.setText(`${emoji[phase]} ${getTimeString(GameState.gameTime)}`);

    // === PLAYER UPDATES ===
    updatePlayerSparkles(time);
    updatePlayerMovement();
    updatePetFollow(delta);

    // === SYSTEMS UPDATES ===
    updatePlantGrowth(this, delta);
    updateFishing(delta);
    checkSeedPickups();
    respawnSeedPickups(this, delta);
    updateNPCPatrol();
    updateWildlife(delta);
    updateFruitRegrowth(delta);
    updateHeldTool();
    updateActionAnimations(delta);
    updateTargetHighlight();

    // === MULTIPLAYER ===
    interpolateOtherPlayers();
    interpolateNPCs();
    sendPositionToServer();

    // === INPUT HANDLING ===
    handleInput(this);

    // === PROXIMITY PROMPTS ===
    updateProximityPrompts();
}

/**
 * Use the active item/tool on left click
 * Uses mouse position to select plot within player reach
 */
function useActiveItem(scene) {
    const tool = GameState.equippedTool;
    // Use mouse-based selection for plots
    const targetPlot = findPlotUnderMouse(100);

    // === UNIVERSAL ACTIONS FIRST (work with any tool) ===

    // Fruit tree harvest
    const nearTree = findNearestFruitTree();
    if (nearTree && nearTree.hasFruit) {
        GameState.isHarvesting = true;
        harvestFruit(nearTree);
        setTimeout(() => { GameState.isHarvesting = false; }, 400);
        return;
    }

    // Farm plot universal actions (harvest, remove hazard, plant)
    if (targetPlot) {
        // Harvest ready crops - works with any tool
        if (targetPlot.state === 'ready') {
            GameState.isHarvesting = true;
            harvestCrop(targetPlot);
            setTimeout(() => { GameState.isHarvesting = false; }, 400);
            return;
        }
        // Remove hazard/dead plant - works with any tool
        if (targetPlot.hazard || targetPlot.state === 'dead') {
            GameState.isRemoving = true;
            removeHazard(targetPlot);
            setTimeout(() => { GameState.isRemoving = false; }, 350);
            return;
        }
        // Plant seeds in tilled soil - works with any tool
        if (targetPlot.state === 'tilled') {
            GameState.isPlanting = true;
            plantSeed(targetPlot, scene);
            setTimeout(() => { GameState.isPlanting = false; }, 400);
            return;
        }
    }

    // === TOOL-SPECIFIC ACTIONS ===

    // HOE: Till grass plots
    if (tool === 'hoe' && targetPlot && targetPlot.state === 'grass') {
        GameState.isHoeing = true;
        setTimeout(() => {
            hoePlot(targetPlot);
            GameState.isHoeing = false;
        }, 150);
        return;
    }

    // WATERING CAN: Water plants
    if (tool === 'wateringCan' && targetPlot &&
        (targetPlot.state === 'planted' || targetPlot.state === 'growing') && !targetPlot.isWatered) {
        GameState.isWatering = true;
        waterPlot(targetPlot);
        setTimeout(() => {
            GameState.isWatering = false;
        }, 500);
        return;
    }

    // FISHING ROD: Cast at pond
    if (tool === 'fishingRod' && isNearPond() && !GameState.isFishing) {
        startFishing();
        return;
    }
}

/**
 * Find the farm plot in front of the player based on facing direction
 */
function findTargetPlot() {
    if (!GameState.player) return null;

    // Get player facing direction (use last non-zero velocity or default to down)
    let facingX = GameState.moveDirection?.x || 0;
    let facingY = GameState.moveDirection?.y || 1; // Default facing down

    // Target position is ~50px in front of player
    const targetX = GameState.player.x + facingX * 50;
    const targetY = GameState.player.y + facingY * 50;

    // Find closest plot to target position
    let closestPlot = null;
    let closestDist = 40; // Must be within 40px of target

    GameState.farmPlots.forEach(plot => {
        const dx = targetX - plot.x;
        const dy = targetY - plot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
            closestDist = dist;
            closestPlot = plot;
        }
    });

    return closestPlot;
}

/**
 * Find the plot under mouse cursor that's within player reach
 * Returns null if no plot is under mouse or player is too far
 */
function findPlotUnderMouse(playerRange = 100) {
    if (!GameState.player) return null;

    let closestToMouse = null;
    let closestMouseDist = 30; // Must click within 30px of plot center

    GameState.farmPlots.forEach(plot => {
        // Check distance from mouse to plot
        const mouseDx = GameState.mouseX - plot.x;
        const mouseDy = GameState.mouseY - plot.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        // Check distance from player to plot
        const playerDx = GameState.player.x - plot.x;
        const playerDy = GameState.player.y - plot.y;
        const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);

        // Plot must be close to mouse AND within player range
        if (mouseDist < closestMouseDist && playerDist < playerRange) {
            closestMouseDist = mouseDist;
            closestToMouse = plot;
        }
    });

    return closestToMouse;
}

/**
 * Update target tile highlight (follows mouse, shows which plot will be affected)
 */
function updateTargetHighlight() {
    if (!GameState.targetHighlight || !GameState.player) return;

    GameState.targetHighlight.clear();

    const tool = GameState.equippedTool;

    // Find plot under mouse within player reach
    const targetPlot = findPlotUnderMouse(100);
    if (!targetPlot) return;

    // Determine highlight color based on tool and plot state
    let canAct = false;
    let highlightColor = 0xFF0000; // Red = can't act

    if (tool === 'hoe' && targetPlot.state === 'grass') {
        canAct = true;
        highlightColor = 0x00FF00; // Green = can hoe
    } else if (tool === 'wateringCan' && (targetPlot.state === 'planted' || targetPlot.state === 'growing') && !targetPlot.isWatered) {
        canAct = true;
        highlightColor = 0x00BFFF; // Blue = can water
    } else if (targetPlot.state === 'tilled') {
        canAct = true;
        highlightColor = 0xFFD700; // Gold = can plant
    } else if (targetPlot.state === 'ready') {
        canAct = true;
        highlightColor = 0x00FF00; // Green = can harvest
    } else if (targetPlot.hazard || targetPlot.state === 'dead') {
        canAct = true;
        highlightColor = 0xFFA500; // Orange = can remove
    }

    // Draw highlight
    if (canAct) {
        GameState.targetHighlight.lineStyle(3, highlightColor, 0.9);
        GameState.targetHighlight.strokeRect(targetPlot.x - 22, targetPlot.y - 22, 44, 44);
        GameState.targetHighlight.fillStyle(highlightColor, 0.25);
        GameState.targetHighlight.fillRect(targetPlot.x - 22, targetPlot.y - 22, 44, 44);
    } else {
        // Show red outline for plots you can't interact with
        GameState.targetHighlight.lineStyle(2, 0xFF0000, 0.4);
        GameState.targetHighlight.strokeRect(targetPlot.x - 22, targetPlot.y - 22, 44, 44);
    }
}

/**
 * Handle keyboard input
 */
function handleInput(scene) {
    // Escape key OR E key - close any open menu/dialog, or open pause menu
    if (Phaser.Input.Keyboard.JustDown(GameState.escapeKey) ||
        (Phaser.Input.Keyboard.JustDown(GameState.interactKey) && (GameState.isDialogOpen || GameState.inventoryOpen || GameState.pauseMenuOpen))) {
        if (GameState.pauseMenuOpen) {
            closePauseMenu();
            return;
        } else if (GameState.isDialogOpen) {
            closeDialog();
            return;
        } else if (GameState.inventoryOpen) {
            toggleInventory();
            return;
        } else if (Phaser.Input.Keyboard.JustDown(GameState.escapeKey)) {
            // No menus open - show pause menu
            showPauseMenu(() => {
                // Change Character callback - restart character creation
                GameState.scene.scene.restart();
            });
            return;
        }
    }

    // Interact key (E) - tool actions AND interact actions (fallback for click)
    if (Phaser.Input.Keyboard.JustDown(GameState.interactKey) && !GameState.isDialogOpen && !GameState.inventoryOpen && !GameState.pauseMenuOpen) {
        const tool = GameState.equippedTool;
        const nearPlot = findNearestFarmPlot();

        // === PET INTERACTION (HIGHEST priority - check first!) ===
        const petExists = !!GameState.playerPet;
        if (petExists) {
            const pet = GameState.playerPet;
            const player = GameState.player;
            const petDist = Math.sqrt(Math.pow(player.x - pet.x, 2) + Math.pow(player.y - pet.y, 2));
            const petState = pet.petState;
            console.log('[E key] Pet dist:', petDist.toFixed(0), '| State:', petState, '| Pos:', pet.x.toFixed(0), pet.y.toFixed(0));

            if (petDist < 120 && petState !== 'trick') {
                console.log('[E key] Triggering pet trick!');
                const trick = petDoTrick();
                if (trick) {
                    const petName = GameState.customization.pet.charAt(0).toUpperCase() + GameState.customization.pet.slice(1);
                    const trickMessages = {
                        spin: `${petName} does a happy spin! 🎉`,
                        jump: `${petName} jumps with joy! 🎉`,
                        flip: `${petName} does a cute flip! 🎉`
                    };
                    showDialog(trickMessages[trick]);
                    return;
                }
            }
        }

        // === LAMPPOST TOGGLE ===
        const nearestLamppost = findNearestLamppost();
        if (nearestLamppost) {
            console.log('[E key] Toggling lamppost');
            const lamppostIndex = GameState.lampposts.indexOf(nearestLamppost);
            if (!sendToggleLamppost(lamppostIndex)) {
                nearestLamppost.lightOn = !nearestLamppost.lightOn;
                nearestLamppost.lightGraphics.visible = nearestLamppost.lightOn;
            }
            return;
        }

        // === TOOL ACTIONS (E key as fallback for click) ===

        // HOE: Till grass plots
        if (tool === 'hoe' && nearPlot && nearPlot.state === 'grass') {
            hoePlot(nearPlot);
            return;
        }

        // WATERING CAN: Water plants
        if (tool === 'wateringCan' && nearPlot &&
            (nearPlot.state === 'planted' || nearPlot.state === 'growing') && !nearPlot.isWatered) {
            waterPlot(nearPlot);
            return;
        }

        // FISHING ROD: Fish at pond
        if (tool === 'fishingRod' && isNearPond() && !GameState.isFishing) {
            startFishing();
            return;
        }

        // === UNIVERSAL ACTIONS ===

        // Fruit tree harvest
        const nearTree = findNearestFruitTree();
        if (nearTree && nearTree.hasFruit) {
            harvestFruit(nearTree);
            return;
        }

        // Farm plot actions (plant, harvest, remove hazard)
        if (nearPlot) {
            if (nearPlot.hazard || nearPlot.state === 'dead') {
                removeHazard(nearPlot);
                return;
            }
            if (nearPlot.state === 'ready') {
                harvestCrop(nearPlot);
                return;
            }
            if (nearPlot.state === 'tilled') {
                plantSeed(nearPlot, GameState.scene);
                return;
            }
        }

        // NPC/Shop interactions
        if (GameState.canInteract && GameState.currentInteractable) {
            if (GameState.currentInteractable.interactType === 'shop') {
                showShopMenu();
            } else if (GameState.currentInteractable.message) {
                showDialog(GameState.currentInteractable.message);
            }
            return;
        }

        // Cooking station
        if (isNearCookingStation()) {
            showCraftingMenu();
            return;
        }
    }

    // Also allow E to close dialogs
    if (Phaser.Input.Keyboard.JustDown(GameState.interactKey) && GameState.isDialogOpen) {
        closeDialog();
        return;
    }

    // Tab key - cycle seeds
    if (Phaser.Input.Keyboard.JustDown(GameState.tabKey) && !GameState.isDialogOpen) {
        cycleSeedType();
    }

    // Inventory key (I)
    if (Phaser.Input.Keyboard.JustDown(GameState.inventoryKey) && !GameState.isDialogOpen) {
        toggleInventory();
    }

    // Hotbar slot selection (1-5)
    if (!GameState.isDialogOpen && !GameState.inventoryOpen && GameState.hotbarKeys) {
        for (let i = 0; i < 5; i++) {
            if (Phaser.Input.Keyboard.JustDown(GameState.hotbarKeys[i])) {
                setActiveHotbarSlot(i);
                break;
            }
        }
    }
}

/**
 * Find the nearest lamppost within interaction range
 */
function findNearestLamppost() {
    if (!GameState.player || !GameState.lampposts) return null;

    let nearest = null;
    let nearestDist = 80; // Interaction range

    GameState.lampposts.forEach(lamp => {
        const dx = GameState.player.x - lamp.x;
        const dy = GameState.player.y - lamp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = lamp;
        }
    });

    return nearest;
}

/**
 * Update ambient wildlife (birds and butterflies)
 */
function updateWildlife(delta) {
    const dt = delta / 1000;

    // Update birds
    GameState.birds?.forEach(bird => {
        // Handle perched state
        if (bird.perched) {
            bird.perchTimer -= dt;
            if (bird.perchTimer <= 0) {
                // Take off! Pick a random flying target or another lamppost
                bird.perched = false;
                bird.perchLamppost = null;
                bird.targetX = 100 + Math.random() * 1200;
                bird.targetY = 80 + Math.random() * 250;
            }
        } else {
            // Move toward target
            const dx = bird.targetX - bird.x;
            const dy = bird.targetY - bird.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                // Reached target - decide what to do next
                const shouldPerch = Math.random() < 0.25 && GameState.lampposts?.length > 0;
                if (shouldPerch) {
                    // Pick a random lamppost to land on
                    const lamp = GameState.lampposts[Math.floor(Math.random() * GameState.lampposts.length)];
                    bird.targetX = lamp.x + (Math.random() - 0.5) * 10;
                    bird.targetY = lamp.y - 55;  // Top of lamppost
                    bird.perchLamppost = lamp;
                } else {
                    // Pick new random flying target
                    bird.targetX = 100 + Math.random() * 1200;
                    bird.targetY = 80 + Math.random() * 250;
                }
            } else {
                bird.x += (dx / dist) * bird.speed * dt;
                bird.y += (dy / dist) * bird.speed * dt;
                // Update facing direction based on movement
                if (Math.abs(dx) > 1) bird.facingRight = dx > 0;

                // Check if arrived at lamppost target
                if (bird.perchLamppost && dist < 15) {
                    bird.perched = true;
                    bird.perchTimer = 3 + Math.random() * 5;  // Perch for 3-8 seconds
                    bird.x = bird.targetX;
                    bird.y = bird.targetY;
                }
            }
        }

        // Redraw bird
        bird.graphics.clear();
        const dir = bird.facingRight ? 1 : -1;

        if (bird.perched) {
            // Perched pose - wings folded, legs visible
            // Legs
            bird.graphics.fillStyle(0x333333, 1);
            bird.graphics.fillRect(bird.x - 2, bird.y + 3, 1, 4);
            bird.graphics.fillRect(bird.x + 1, bird.y + 3, 1, 4);
            // Body (slightly upright)
            bird.graphics.fillStyle(bird.color, 1);
            bird.graphics.fillEllipse(bird.x, bird.y, 6, 6);
            // Folded wing line
            bird.graphics.lineStyle(1, bird.color - 0x222222, 1);
            bird.graphics.lineBetween(bird.x - 3, bird.y - 1, bird.x + 2, bird.y + 3);
            // Head
            bird.graphics.fillStyle(bird.color, 1);
            bird.graphics.fillCircle(bird.x + 3 * dir, bird.y - 4, 3);
            // Eye
            bird.graphics.fillStyle(0x000000, 1);
            bird.graphics.fillCircle(bird.x + 4 * dir, bird.y - 4, 1.2);
            // Beak
            bird.graphics.fillStyle(0xFFA500, 1);
            bird.graphics.fillTriangle(bird.x + 5 * dir, bird.y - 4, bird.x + 8 * dir, bird.y - 3, bird.x + 5 * dir, bird.y - 2);
            // Tail
            bird.graphics.fillStyle(bird.color - 0x111111, 1);
            bird.graphics.fillTriangle(bird.x - 3 * dir, bird.y + 1, bird.x - 6 * dir, bird.y + 4, bird.x - 2 * dir, bird.y + 4);
        } else {
            // Flying pose - animate wings
            bird.wingPhase += dt * 15;
            const wingY = Math.sin(bird.wingPhase) * 4;

            // Wings first (behind body)
            bird.graphics.fillStyle(bird.color - 0x222222, 1);
            bird.graphics.fillTriangle(
                bird.x - 2, bird.y,
                bird.x, bird.y - 8 + wingY,
                bird.x + 2, bird.y
            );
            // Body
            bird.graphics.fillStyle(bird.color, 1);
            bird.graphics.fillEllipse(bird.x, bird.y, 8, 5);
            // Head
            bird.graphics.fillCircle(bird.x + 5 * dir, bird.y - 2, 3);
            // Tail feathers
            bird.graphics.fillStyle(bird.color - 0x111111, 1);
            bird.graphics.fillTriangle(
                bird.x - 4 * dir, bird.y - 1,
                bird.x - 8 * dir, bird.y - 2,
                bird.x - 4 * dir, bird.y + 2
            );
            // Eye
            bird.graphics.fillStyle(0x000000, 1);
            bird.graphics.fillCircle(bird.x + 6 * dir, bird.y - 3, 1.5);
            // Beak
            bird.graphics.fillStyle(0xFFA500, 1);
            bird.graphics.fillTriangle(bird.x + 7 * dir, bird.y - 2, bird.x + 11 * dir, bird.y - 1, bird.x + 7 * dir, bird.y);
        }
    });

    // Update butterflies
    GameState.butterflies?.forEach(bf => {
        // Move toward target (more erratic)
        const dx = bf.targetX - bf.x;
        const dy = bf.targetY - bf.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
            // Pick new random target
            bf.targetX = 100 + Math.random() * 1200;
            bf.targetY = 250 + Math.random() * 550;
        } else {
            // Add some wobble
            const wobbleX = Math.sin(bf.wingPhase * 2) * 20;
            const wobbleY = Math.cos(bf.wingPhase * 3) * 10;
            bf.x += ((dx / dist) * bf.speed + wobbleX * dt) * dt;
            bf.y += ((dy / dist) * bf.speed + wobbleY * dt) * dt;
        }

        // Animate wings
        bf.wingPhase += dt * 12;
        const wingSpread = Math.abs(Math.sin(bf.wingPhase)) * 6;

        // Redraw
        bf.graphics.clear();
        // Wings
        bf.graphics.fillStyle(bf.color, 0.85);
        bf.graphics.fillEllipse(bf.x - 4, bf.y - wingSpread, 5, 4);
        bf.graphics.fillEllipse(bf.x + 4, bf.y - wingSpread, 5, 4);
        bf.graphics.fillEllipse(bf.x - 3, bf.y + wingSpread * 0.5, 4, 3);
        bf.graphics.fillEllipse(bf.x + 3, bf.y + wingSpread * 0.5, 4, 3);
        // Body
        bf.graphics.fillStyle(0x2C2C2C, 1);
        bf.graphics.fillEllipse(bf.x, bf.y, 2, 6);
        // Antennae
        bf.graphics.lineStyle(1, 0x2C2C2C, 1);
        bf.graphics.lineBetween(bf.x - 1, bf.y - 5, bf.x - 3, bf.y - 9);
        bf.graphics.lineBetween(bf.x + 1, bf.y - 5, bf.x + 3, bf.y - 9);
    });
}

/**
 * Update proximity-based prompts
 */
function updateProximityPrompts() {
    if (GameState.isDialogOpen) return;

    // Check interactables
    GameState.canInteract = false;
    GameState.currentInteractable = null;
    GameState.interactables.forEach(obj => {
        const dx = GameState.player.x - obj.x;
        const dy = GameState.player.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
            GameState.canInteract = true;
            GameState.currentInteractable = obj;
        }
    });

    // Show pet prompt if near pet and no other interaction
    if (!GameState.canInteract && isNearPet() && GameState.playerPet?.petState !== 'trick') {
        GameState.interactPrompt.setText('🐾 Press E to pet');
        GameState.interactPrompt.setVisible(true);
    } else {
        GameState.interactPrompt.setText('🔵 Press E to interact');
        GameState.interactPrompt.setVisible(GameState.canInteract);
    }

    // Farm prompts - tool-aware with click actions
    const nearPlot = findNearestFarmPlot();
    const tool = GameState.equippedTool;
    if (nearPlot) {
        let promptText = '';
        // Tool-specific actions (left click)
        if (tool === 'hoe' && nearPlot.state === 'grass') {
            promptText = '🔨 Click to hoe';
        } else if (tool === 'wateringCan' && (nearPlot.state === 'planted' || nearPlot.state === 'growing') && !nearPlot.isWatered) {
            promptText = '💧 Click to water';
        }
        // Hand actions (left click when no tool or empty slot)
        else if (nearPlot.hazard) {
            const hazardName = nearPlot.hazard === 'weeds' ? '🌿 Weeds' : '🐛 Bugs';
            promptText = `${hazardName} - Click to remove`;
        } else if (nearPlot.state === 'dead') {
            promptText = '💀 Click to clear';
        } else if (nearPlot.state === 'tilled') {
            promptText = '🌱 Click to plant';
        } else if (nearPlot.state === 'ready') {
            promptText = '✋ Click to harvest';
        }
        // Show hint if wrong tool equipped
        else if (nearPlot.state === 'grass' && tool !== 'hoe') {
            promptText = '🔨 Equip hoe (1)';
        } else if ((nearPlot.state === 'planted' || nearPlot.state === 'growing') && !nearPlot.isWatered && tool !== 'wateringCan') {
            promptText = '💧 Equip watering can (2)';
        }
        GameState.farmPrompt.setText(promptText).setVisible(!!promptText);
        GameState.waterPrompt.setVisible(false);
        GameState.hazardPrompt.setVisible(false);
    } else {
        GameState.farmPrompt.setVisible(false);
        GameState.waterPrompt.setVisible(false);
        GameState.hazardPrompt.setVisible(false);
    }

    // Fruit tree prompt
    const nearTree = findNearestFruitTree();
    if (nearTree) {
        if (nearTree.hasFruit) {
            const fruitEmoji = { apple: '🍎', orange: '🍊', peach: '🍑', cherry: '🍒' };
            const emoji = fruitEmoji[nearTree.treeType] || '🍎';
            GameState.fruitTreePrompt.setText(`${emoji} Click to harvest`).setVisible(true);
        } else {
            GameState.fruitTreePrompt.setText('⏳ Growing...').setVisible(true);
        }
    } else {
        GameState.fruitTreePrompt.setVisible(false);
    }

    // Fishing prompt - tool-aware with click
    if (isNearPond() && !GameState.isFishing) {
        if (tool === 'fishingRod') {
            GameState.fishingPrompt.setText('🎣 Click to cast').setVisible(true);
        } else {
            GameState.fishingPrompt.setText('🎣 Equip fishing rod (3)').setVisible(true);
        }
    } else {
        GameState.fishingPrompt.setVisible(false);
    }

    // Cooking prompt
    if (isNearCookingStation()) {
        GameState.cookingPrompt.setText('🍳 E to cook').setVisible(true);
    } else {
        GameState.cookingPrompt.setVisible(false);
    }

    // Lamppost prompt
    const nearLamp = findNearestLamppost();
    if (nearLamp) {
        const status = nearLamp.lightOn ? 'off' : 'on';
        GameState.lamppostPrompt.setText(`💡 E to turn ${status}`).setVisible(true);
    } else {
        GameState.lamppostPrompt.setVisible(false);
    }
}
