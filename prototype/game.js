/**
 * game.js - Main entry point for 711BF Gaming
 *
 * This file orchestrates all modules and manages the Phaser lifecycle.
 * For feature-specific code, see the modules/ directory.
 */

// === MODULE IMPORTS ===
import { GAME_WIDTH, GAME_HEIGHT, classes, baseSpeed, maxSpeed, fruitTreePositions, herbSpawnPositions, grassSpawnPositions, GAME_DAY_MINUTES, DEPTH_LAYERS, getWorldDepth, treeData } from './modules/config.js';
import { GameState, loadGameSession, saveGameSession } from './modules/state.js';
import { getTimeString, getDayPhase } from './modules/utils.js';
import { initializeTrees, updateTreeLifecycle, updateTreeBlossoms, getCurrentSeason, getDayInSeason, getNearbyTree, chopTree as chopUnifiedTree, harvestFruit as harvestUnifiedTreeFruit, harvestHoney, plantSeed as plantTreeSeed } from './modules/trees.js';
import { initializeBees, updateBees, updateHiveHoney } from './modules/bees.js';
import { createWhimsicalCharacter, createPet, updatePlayerMovement, updatePetFollow, updatePlayerSparkles, createToolGraphics, updateHeldTool, equipTool, initActionAnimations, updateActionAnimations, petDoTrick, isNearPet } from './modules/player.js';
import { createHouse, createFarmPlot, drawTree, createSeedPickup, createHerbPickup, createGrassPickup, createNPCs, updateNPCPatrol, drawLamppost, drawLamppostLight, createFruitTree, setupCookingStations, findNearestCookingStation } from './modules/world.js';
import { setupUI, showCharacterCreation, showDialog, closeDialog, updateInventoryDisplay, updateSeedIndicator, updateCoinDisplay, toggleInventory, setActiveHotbarSlot, updateHotbarDisplay, showPauseMenu, closePauseMenu } from './modules/ui.js';
import { hoePlot, plantSeed, harvestCrop, updatePlantGrowth, cycleSeedType, startFishing, updateFishing, showShopMenu, showCraftingMenu, checkSeedPickups, respawnSeedPickups, checkHerbPickups, respawnHerbPickups, checkGrassPickups, respawnGrassPickups, findNearestFarmPlot, isNearPond, waterPlot, removeHazard, harvestFruit, findNearestFruitTree, updateFruitRegrowth, updateCooking } from './modules/systems.js';
import { connectToServer, interpolateOtherPlayers, sendPositionToServer, interpolateNPCs, sendToggleLamppost, sendWaterAction, sendRemoveHazard, sendHarvestFruit } from './modules/multiplayer.js';
import { setupResourceNodes, handleResourceClick } from './modules/resources.js';

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
    // Load saved game session (inventory, coins, etc.)
    loadGameSession();

    const graphics = this.add.graphics();
    // Explicitly set background to ground level depth
    graphics.setDepth(DEPTH_LAYERS.GROUND);
    console.log('[Game] Background graphics depth:', DEPTH_LAYERS.GROUND);

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
    // Use current timestamp + performance.now() for better entropy
    let seed = (Date.now() ^ (Math.floor(performance.now() * 1000))) % 2147483647;
    if (seed <= 0) seed += 2147483646;
    console.log('[Flowers] Random seed:', seed);

    const seededRandom = () => {
        // LCG parameters from Numerical Recipes
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    // Forbidden zones - flowers cannot spawn in these areas (zone-based layout)
    const forbiddenZones = [
        // === RESIDENTIAL ZONE (top-left) ===
        { type: 'rect', x: 80, y: 50, w: 400, h: 200 },

        // === TOWN CENTER (center-top) ===
        { type: 'rect', x: 550, y: 100, w: 300, h: 300 },

        // === COMMERCIAL ZONE (top-right) ===
        { type: 'rect', x: 1000, y: 50, w: 300, h: 350 },

        // === NATURE ZONE (bottom-left) - pond area ===
        { type: 'ellipse', x: 220, y: 680, rx: 180, ry: 150 },

        // === FARM ZONE (bottom-center) ===
        { type: 'rect', x: 500, y: 480, w: 400, h: 350 },

        // === ORCHARD ZONE (bottom-right) ===
        { type: 'rect', x: 950, y: 450, w: 350, h: 350 },

        // === PATHS connecting zones ===
        // Main horizontal path
        { type: 'rect', x: 100, y: 250, w: 1200, h: 80 },
        // Vertical paths
        { type: 'rect', x: 650, y: 330, w: 100, h: 200 },
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

    // Trees - decorative trees at map edges (not in playable zones)
    // foreground: true = renders in front of player (depth 900+y)
    const trees = [
        // Top edge
        { x: 50, y: 60, s: 35, foreground: false },
        { x: 1350, y: 60, s: 38, foreground: false },
        // Left edge
        { x: 40, y: 350, s: 32, foreground: false },
        // Right edge
        { x: 1360, y: 400, s: 36, foreground: false },
        // Bottom edge (foreground - player walks behind these)
        { x: 50, y: 850, s: 40, foreground: true },
        { x: 950, y: 840, s: 35, foreground: true },
        { x: 1350, y: 850, s: 38, foreground: true },
    ];
    trees.forEach(t => {
        // Each tree gets its own graphics object for depth control
        const treeGfx = this.add.graphics();

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

        // Set depth AFTER drawing - higher Y = higher depth = renders in front
        const footY = t.y + t.s + 22;  // trunk bottom
        const treeDepth = t.foreground ? DEPTH_LAYERS.FOREGROUND_TREES : getWorldDepth(footY);
        treeGfx.setDepth(treeDepth);
        console.log(`[DecorTree] at Y=${t.y}, footY=${footY}, depth=${treeDepth}, foreground=${t.foreground}`);

        GameState.obstacles.add(this.add.rectangle(t.x, t.y + t.s, 18, 18, 0x000000, 0));
    });

    // === RESIDENTIAL ZONE (top-left) ===
    createHouse(graphics, 180, 150, 0xE74C3C, "🏠 Mira's Cottage", this);
    GameState.obstacles.add(this.add.rectangle(180, 150, 120, 100, 0x000000, 0));
    const miraDoor = this.add.rectangle(180, 205, 40, 35, 0x000000, 0);
    miraDoor.interactType = 'miraDoor';
    miraDoor.message = "Mira's cottage... she's probably outside gardening!";
    GameState.interactables.push(miraDoor);

    createHouse(graphics, 380, 150, 0x3498DB, '🏡 Your Home', this);
    GameState.obstacles.add(this.add.rectangle(380, 150, 120, 100, 0x000000, 0));
    const homeDoor = this.add.rectangle(380, 205, 40, 35, 0x000000, 0);
    homeDoor.interactType = 'homeDoor';
    homeDoor.message = 'Your cozy home... maybe later you can rest here!';
    GameState.interactables.push(homeDoor);

    // === COMMERCIAL ZONE (top-right) ===
    createHouse(graphics, 1150, 150, 0x27AE60, '🏪 General Store', this);
    GameState.obstacles.add(this.add.rectangle(1150, 150, 120, 100, 0x000000, 0));

    // === NATURE ZONE (bottom-left) ===
    // Fishing pond - with depth and natural edges
    const pondX = 220, pondY = 680;

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

    // === FARM ZONE (bottom-center) ===
    // Farm area - 3 rows x 5 columns = 15 plots
    const farmStartX = 700, farmStartY = 650;
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

    // Cooking stations are now created via setupCookingStations() after startGame()

    // Seed pickups - scattered around zones (not in farm area itself)
    const seedLocations = [
        // Nature zone (near pond path)
        { x: 350, y: 450, type: 'carrot' },
        { x: 400, y: 480, type: 'flower' },
        // Town center area
        { x: 600, y: 400, type: 'tomato' },
        { x: 800, y: 400, type: 'lettuce' },
        // Path to orchard
        { x: 950, y: 500, type: 'onion' },
        { x: 1000, y: 550, type: 'flower' },
        // Near commercial zone
        { x: 1050, y: 400, type: 'potato' },
        { x: 1250, y: 400, type: 'carrot' },
        { x: 1200, y: 450, type: 'tomato' }
    ];
    seedLocations.forEach((loc, index) => {
        GameState.seedPickups.push(createSeedPickup(this, loc.x, loc.y, loc.type, index));
    });

    // Herb pickups (for alchemy)
    herbSpawnPositions.forEach((loc, index) => {
        GameState.herbPickups.push(createHerbPickup(this, loc.x, loc.y, loc.type, index));
    });

    // Grass pickups (for fiber)
    grassSpawnPositions.forEach((loc, index) => {
        GameState.grassPickups.push(createGrassPickup(this, loc.x, loc.y, index));
    });

    // === TOWN CENTER (center-top) ===
    // Well - water source for crops
    const wellX = 700, wellY = 180;
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(wellX - 30, wellY - 30, 60, 60);
    graphics.fillStyle(0x696969, 1);
    graphics.fillRect(wellX - 20, wellY - 20, 40, 40);
    graphics.fillStyle(0x5DADE2, 0.7);
    graphics.fillRect(wellX - 15, wellY - 15, 30, 30);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(wellX - 35, wellY - 45, 70, 15);
    graphics.fillRect(wellX - 10, wellY - 70, 20, 25);
    // Bucket sitting by the roadside
    this.add.text(wellX - 50, wellY, '🪣', { fontSize: '16px' }).setOrigin(0.5);
    this.add.text(wellX, wellY + 50, '💧 Well', {
        fontSize: '11px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 3, y: 2 }
    }).setOrigin(0.5);
    GameState.obstacles.add(this.add.rectangle(wellX, wellY, 60, 60, 0x000000, 0));

    // Well interaction
    const well = this.add.rectangle(wellX, wellY, 70, 70, 0x000000, 0);
    well.interactType = 'well';
    well.message = '💧 Village Well\n\nFresh water for your crops!\nEquip the watering can (2) to water plants.';
    GameState.interactables.push(well);

    // Signpost - in town center
    const signX = 700, signY = 320;
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(signX - 5, signY, 10, 60);
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(signX - 60, signY + 5, 120, 28);
    graphics.lineStyle(2, 0x654321, 1);
    graphics.strokeRect(signX - 60, signY + 5, 120, 28);
    this.add.text(signX, signY + 19, '← Nature | Farm ↓ | Shop →', {
        fontSize: '9px', fill: '#654321', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Signpost interaction
    const signpost = this.add.rectangle(signX, signY + 20, 120, 50, 0x000000, 0);
    signpost.interactType = 'sign';
    signpost.message = '📍 Town Center\n\n← West: Nature Zone (Pond, Homes)\n↓ South: Farm Zone\n→ East: Commercial Zone (Store, Cooking)\n↘ Southeast: Orchard';
    GameState.interactables.push(signpost);

    // Victorian lampposts - distributed across all zones
    const lamppostPositions = [
        // Residential zone
        { x: 280, y: 280 },
        // Town center
        { x: 550, y: 280 },
        { x: 850, y: 280 },
        // Commercial zone
        { x: 1050, y: 280 },
        // Nature zone (near pond)
        { x: 350, y: 550 },
        { x: 150, y: 550 },
        // Farm zone edges
        { x: 550, y: 500 },
        { x: 850, y: 500 },
        // Orchard zone
        { x: 1150, y: 450 },
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

    // Resource nodes (trees, rocks) - harvestable for wood, stone, ore, gems
    setupResourceNodes(this);

    // Unified tree system with lifecycle and seasons
    initializeTrees(this);

    // Bee system
    initializeBees(this);

    // Crafting stations (campfire, stove, oven, alchemy_table)
    setupCookingStations(this);

    // Click handler for resource nodes
    this.input.on('gameobjectdown', (pointer, gameObject) => {
        // Check if clicking a resource node
        if (handleResourceClick(gameObject, this)) {
            return; // Handled by resource system
        }
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

    // === WEATHER SYSTEM ===
    GameState.weather = {
        particles: [],
        graphics: this.add.graphics().setDepth(DEPTH_LAYERS.WEATHER).setScrollFactor(0),
        type: 'none',        // 'none' | 'snow' | 'rain'
        intensity: 0,        // 0-1, controls particle count
        showerTimer: 0,      // For intermittent spring showers
        isShowering: false
    };
    // Pre-create particle pool
    for (let i = 0; i < 150; i++) {
        GameState.weather.particles.push({
            x: 0, y: 0, speed: 0, size: 0, active: false, drift: 0
        });
    }

    // === UI SETUP ===
    setupUI(this);

    // Lamppost prompt (added after UI setup)
    GameState.lamppostPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 240, '', {
        fontSize: '14px', fill: '#FFD700', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

    // Water prompt (added after UI setup)
    GameState.waterPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, '', {
        fontSize: '14px', fill: '#87CEEB', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

    // Hazard prompt (added after UI setup)
    GameState.hazardPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 180, '', {
        fontSize: '14px', fill: '#FF6B6B', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

    // Fruit tree prompt (added after UI setup)
    GameState.fruitTreePrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 220, '', {
        fontSize: '14px', fill: '#90EE90', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

    // Cooking station prompt
    GameState.cookingPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 180, '', {
        fontSize: '14px', fill: '#FFA500', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

    // Unified tree prompt
    GameState.treePrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 160, '', {
        fontSize: '14px', fill: '#8B4513', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_PROMPTS).setVisible(false);

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
    GameState.petKey = scene.input.keyboard.addKey('P');  // Dedicated key for petting
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

    // Debug key F9 - toggle tree depth overlays
    GameState.debugKey = scene.input.keyboard.addKey('F9');
    GameState.debugOverlaysVisible = false;
    GameState.debugOverlays = [];

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
    GameState.targetHighlight.setDepth(DEPTH_LAYERS.GROUND_ITEMS);

    // Track mouse position for plot selection and dialog positioning
    // Initialize to player spawn position, then track mouse movement
    GameState.mouseX = 700;  // Player spawn X
    GameState.mouseY = 350;  // Above player spawn Y
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
            // Pet starts at y=450, foot position is y+10, use sublayer -0.1 to stay behind player
            GameState.playerPet.setDepth(getWorldDepth(450 + 10, -0.1));
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

    // Force display list to sort by depth after all objects created
    scene.children.sort('depth');
    console.log('[Game] Display list sorted by depth');

    // Connect to multiplayer
    connectToServer();
}

function update(time, delta) {
    if (!this.gameStarted) return;

    // === TIME & DAY/NIGHT ===
    // Always advance time locally (server can override if connected)
    // timeSpeed = game minutes per real second, delta is in ms
    const timeAdvance = GameState.timeSpeed * (delta / 1000);
    GameState.gameTime += timeAdvance;

    if (GameState.gameTime >= GAME_DAY_MINUTES) {
        GameState.gameTime -= GAME_DAY_MINUTES; // Wrap around smoothly
        // New day - advance day counter and update tree lifecycle
        GameState.day += 1;
        updateTreeLifecycle();
        updateHiveHoney();
        console.log(`[Time] Day ${GameState.day} - Season: ${getCurrentSeason()}`);
    }

    // Update tree blossoms every frame (real-time blossom→fruit transitions)
    updateTreeBlossoms();

    const phase = getDayPhase(GameState.gameTime);
    GameState.isNight = (phase === 'night');

    let overlayAlpha = 0;
    if (phase === 'dawn') overlayAlpha = 0.08;
    else if (phase === 'dusk') overlayAlpha = 0.15;
    else if (phase === 'night') overlayAlpha = 0.28;
    GameState.dayOverlay.setFillStyle(0x0a0a23, overlayAlpha);

    const emoji = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
    GameState.timeDisplay.setText(`${emoji[phase]} ${getTimeString(GameState.gameTime)}`);

    // Update season display
    if (GameState.seasonDisplay) {
        const season = getCurrentSeason();
        const seasonEmoji = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
        const dayInSeason = getDayInSeason();
        GameState.seasonDisplay.setText(`Day ${GameState.day} | ${seasonEmoji[season]} ${season.charAt(0).toUpperCase() + season.slice(1)} (${dayInSeason})`);
    }

    // === PLAYER UPDATES ===
    updatePlayerSparkles(time);
    updatePlayerMovement();

    // Auto-close dialog if player moves away
    if (GameState.isDialogOpen && GameState.dialogOpenPosition && GameState.player) {
        const dx = GameState.player.x - GameState.dialogOpenPosition.x;
        const dy = GameState.player.y - GameState.dialogOpenPosition.y;
        const distMoved = Math.sqrt(dx * dx + dy * dy);
        if (distMoved > 50) {  // ~50 pixels threshold
            closeDialog();
        }
    }

    updatePetFollow(delta);

    // === SYSTEMS UPDATES ===
    updatePlantGrowth(this, delta);
    updateFishing(delta);
    updateCooking(delta);
    checkSeedPickups();
    respawnSeedPickups(this, delta);
    checkHerbPickups();
    respawnHerbPickups(this, delta);
    checkGrassPickups();
    respawnGrassPickups(this, delta);
    updateNPCPatrol();
    updateWildlife(delta);
    updateWeather(delta);
    updateBees(delta);
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
    // Immediately stop player movement on any interaction
    if (GameState.player && GameState.player.body) {
        GameState.player.body.velocity.x = 0;
        GameState.player.body.velocity.y = 0;
        GameState.targetVelocity.x = 0;
        GameState.targetVelocity.y = 0;
        GameState.currentSpeed = 0;
    }

    const tool = GameState.equippedTool;
    // Use mouse-based selection for plots
    const targetPlot = findPlotUnderMouse(100);

    // === UNIVERSAL ACTIONS FIRST (work with any tool) ===

    // Unified tree fruit harvest (click-based)
    const nearUnifiedTree = getNearbyTree(GameState.player.x, GameState.player.y, 80);
    if (nearUnifiedTree && nearUnifiedTree.tree.fruitReady) {
        GameState.isHarvesting = true;
        const fruit = harvestUnifiedTreeFruit(nearUnifiedTree.index);
        if (fruit > 0) {
            showDialog(`Picked ${fruit} fruit! 🍎`);
            updateInventoryDisplay();
            saveGameSession();
        }
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

    // AXE: Chop unified trees
    if (tool === 'axe') {
        const nearbyTree = getNearbyTree(GameState.player.x, GameState.player.y);
        if (nearbyTree && nearbyTree.tree.stage !== 'sapling') {
            const result = chopUnifiedTree(nearbyTree.index);
            if (result.destroyed) {
                const drops = result.drops;
                let message = `+${drops.wood} wood`;
                if (drops.fruit > 0) message += `, +${drops.fruit} fruit`;
                if (drops.seed > 0) message += `, +1 seed`;
                showDialog(message);
                updateInventoryDisplay();
                saveGameSession();
            }
            return;
        }
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
    // Cache JustDown results - they only return true ONCE per frame!
    const escapeJustDown = Phaser.Input.Keyboard.JustDown(GameState.escapeKey);
    const interactJustDown = Phaser.Input.Keyboard.JustDown(GameState.interactKey);
    const petJustDown = Phaser.Input.Keyboard.JustDown(GameState.petKey);

    // Weather toggle keys (Ctrl+Alt + S/R/N/M)
    const ctrlKey = scene.input.keyboard.addKey('CTRL');
    const altKey = scene.input.keyboard.addKey('ALT');
    if (ctrlKey.isDown && altKey.isDown) {
        if (Phaser.Input.Keyboard.JustDown(scene.input.keyboard.addKey('S'))) {
            GameState.settings.manualWeather = GameState.settings.manualWeather === 'snow' ? null : 'snow';
            const status = GameState.settings.manualWeather === 'snow' ? 'Snow ON' : 'Auto weather';
            showDialog(`🌨️ ${status}`);
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(scene.input.keyboard.addKey('R'))) {
            GameState.settings.manualWeather = GameState.settings.manualWeather === 'rain' ? null : 'rain';
            const status = GameState.settings.manualWeather === 'rain' ? 'Rain ON' : 'Auto weather';
            showDialog(`🌧️ ${status}`);
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(scene.input.keyboard.addKey('M'))) {
            GameState.settings.manualWeather = GameState.settings.manualWeather === 'monsoon' ? null : 'monsoon';
            const status = GameState.settings.manualWeather === 'monsoon' ? 'MONSOON!' : 'Auto weather';
            showDialog(`🌊 ${status}`);
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(scene.input.keyboard.addKey('N'))) {
            GameState.settings.manualWeather = GameState.settings.manualWeather === 'none' ? null : 'none';
            const status = GameState.settings.manualWeather === 'none' ? 'Weather OFF' : 'Auto weather';
            showDialog(`☀️ ${status}`);
            return;
        }
    }

    // Debug: Log EVERY E key press to verify input is working
    if (interactJustDown) {
        console.log('[INPUT] E pressed! Dialog:', GameState.isDialogOpen, '| Inventory:', GameState.inventoryOpen, '| Pause:', GameState.pauseMenuOpen);
    }

    // Escape key OR E key - close any open menu/dialog, or open pause menu
    if (escapeJustDown ||
        (interactJustDown && (GameState.isDialogOpen || GameState.inventoryOpen || GameState.pauseMenuOpen))) {
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
    if (interactJustDown && !GameState.isDialogOpen && !GameState.inventoryOpen && !GameState.pauseMenuOpen) {
        console.log('[E key] Pressed! Starting interaction checks...');
        const tool = GameState.equippedTool;
        const nearPlot = findNearestFarmPlot();

        // === UNIFIED TREE INTERACTIONS ===
        const nearbyTree = getNearbyTree(GameState.player.x, GameState.player.y);
        if (nearbyTree) {
            const { index, tree } = nearbyTree;
            // Harvest honey from hive
            if (tree.hasHive && tree.hiveHoney > 0) {
                const honey = harvestHoney(index);
                if (honey > 0) {
                    showDialog(`Harvested ${honey} honey! 🍯`);
                    updateInventoryDisplay();
                    saveGameSession();
                }
                return;
            }
            // Harvest fruit from tree (year-round, matching old behavior)
            if (tree.fruitReady) {
                const fruit = harvestUnifiedTreeFruit(index);
                if (fruit > 0) {
                    showDialog(`Picked ${fruit} fruit! 🍎`);
                    updateInventoryDisplay();
                    saveGameSession();
                }
                return;
            }
        }

        // === COOKING STATION (priority over lamppost) ===
        if (findNearestCookingStation()) {
            showCraftingMenu();
            return;
        }

        // === LAMPPOST TOGGLE ===
        const nearestLamppost = findNearestLamppost();
        if (nearestLamppost) {
            console.log('[E key] Toggling lamppost');
            const lamppostIndex = GameState.lampposts.indexOf(nearestLamppost);
            if (!sendToggleLamppost(lamppostIndex)) {
                nearestLamppost.lightOn = !nearestLamppost.lightOn;
                nearestLamppost.lightGraphics.setVisible(nearestLamppost.lightOn);
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

        // Unified tree fruit harvest
        const nearUnifiedTreeE = getNearbyTree(GameState.player.x, GameState.player.y, 80);
        if (nearUnifiedTreeE && nearUnifiedTreeE.tree.fruitReady) {
            const fruit = harvestUnifiedTreeFruit(nearUnifiedTreeE.index);
            if (fruit > 0) {
                showDialog(`Picked ${fruit} fruit! 🍎`);
                updateInventoryDisplay();
                saveGameSession();
            }
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

    // F9 - Toggle debug tree overlays
    if (Phaser.Input.Keyboard.JustDown(GameState.debugKey)) {
        toggleTreeDebugOverlays(scene);
    }
}

/**
 * Toggle debug overlays showing tree IDs, Y positions, and depths
 */
function toggleTreeDebugOverlays(scene) {
    GameState.debugOverlaysVisible = !GameState.debugOverlaysVisible;

    if (GameState.debugOverlaysVisible) {
        // Create overlays for all trees
        let treeId = 0;

        // Unified trees from trees.js
        GameState.trees?.forEach((tree, index) => {
            const depth = tree.graphics.depth;
            const label = scene.add.text(tree.x, tree.y - 60,
                `#${treeId}\nY:${tree.y}\nD:${Math.round(depth)}`, {
                fontSize: '10px',
                fill: '#FFFFFF',
                backgroundColor: '#FF0000CC',
                padding: { x: 3, y: 2 },
                align: 'center'
            }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_HUD + 100);
            GameState.debugOverlays.push(label);
            treeId++;
        });

        // Fruit trees from world.js
        GameState.fruitTrees?.forEach((tree, index) => {
            const depth = tree.graphics.depth;
            const label = scene.add.text(tree.x, tree.y - 60,
                `F#${treeId}\nY:${tree.y}\nD:${Math.round(depth)}`, {
                fontSize: '10px',
                fill: '#FFFFFF',
                backgroundColor: '#00AA00CC',
                padding: { x: 3, y: 2 },
                align: 'center'
            }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_HUD + 100);
            GameState.debugOverlays.push(label);
            treeId++;
        });

        console.log(`[Debug] Showing ${treeId} tree overlays. Press F9 to hide.`);
        console.log('[Debug] Red = unified trees, Green = fruit trees');
        console.log('[Debug] Format: #ID, Y:position, D:depth');
    } else {
        // Destroy all overlays
        GameState.debugOverlays.forEach(overlay => overlay.destroy());
        GameState.debugOverlays = [];
        console.log('[Debug] Tree overlays hidden.');
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
 * Update weather effects based on season and settings
 * - Winter: gentle snowfall
 * - Spring: intermittent rain showers
 * - Manual override via Ctrl+S (snow), Ctrl+R (rain), Ctrl+N (none)
 */
function updateWeather(delta) {
    const weather = GameState.weather;
    if (!weather) return;

    const dt = delta / 1000;
    const season = getCurrentSeason();
    const g = weather.graphics;
    const settings = GameState.settings;

    // Get weather preset settings
    const weatherPreset = settings?.weatherPreset || 'auto';
    const intensitySetting = settings?.weatherIntensity || 'normal';
    const manualWeather = settings?.manualWeather;

    // Intensity multipliers
    const intensityMultipliers = { light: 0.5, normal: 1.0, heavy: 1.5 };
    const intensityMult = intensityMultipliers[intensitySetting] || 1.0;

    // Frequency multipliers for presets
    const frequencyMult = weatherPreset === 'frequent' ? 1.5 : weatherPreset === 'rare' ? 0.3 : 1.0;

    // Check if weather is disabled
    if (weatherPreset === 'off' && !manualWeather) {
        weather.intensity = Math.max(0, weather.intensity - 2 * dt);
        if (weather.intensity < 0.05) weather.type = 'none';
        g.clear();
        renderWeatherParticles(weather, g, dt);
        return;
    }

    // Determine weather type based on manual override or season
    let targetType = 'none';
    let targetIntensity = 0;

    if (manualWeather) {
        // Manual override active
        if (manualWeather === 'snow') {
            targetType = 'snow';
            targetIntensity = 0.8 * intensityMult;
        } else if (manualWeather === 'rain') {
            targetType = 'rain';
            targetIntensity = 0.7 * intensityMult;
        } else if (manualWeather === 'monsoon') {
            targetType = 'monsoon';
            targetIntensity = 1.5; // Max intensity, ignores multiplier
        }
        // 'none' means no weather
    } else {
        // Auto weather based on season
        if (season === 'winter') {
            targetType = 'snow';
            targetIntensity = 0.8 * intensityMult * frequencyMult;
        } else if (season === 'spring') {
            // Intermittent showers
            weather.showerTimer -= dt;
            if (weather.showerTimer <= 0) {
                weather.isShowering = !weather.isShowering;
                // Adjust timing based on frequency
                const showerDuration = (10 + Math.random() * 20) * (weatherPreset === 'frequent' ? 1.5 : weatherPreset === 'rare' ? 0.5 : 1);
                const breakDuration = (30 + Math.random() * 60) * (weatherPreset === 'frequent' ? 0.5 : weatherPreset === 'rare' ? 2 : 1);
                weather.showerTimer = weather.isShowering ? showerDuration : breakDuration;
            }
            if (weather.isShowering) {
                targetType = 'rain';
                targetIntensity = (0.5 + Math.random() * 0.3) * intensityMult;
            }
        }
    }

    // Smoothly transition intensity
    const transitionSpeed = 2 * dt;
    if (weather.type !== targetType && targetIntensity > 0) {
        weather.type = targetType;
    }
    if (targetIntensity > weather.intensity) {
        weather.intensity = Math.min(targetIntensity, weather.intensity + transitionSpeed);
    } else {
        weather.intensity = Math.max(targetIntensity, weather.intensity - transitionSpeed);
    }

    // If intensity is very low, set type to none
    if (weather.intensity < 0.05) {
        weather.type = 'none';
    }

    // Spawn new particles
    const maxParticles = Math.floor(weather.intensity * 100);
    let activeCount = weather.particles.filter(p => p.active).length;

    for (let i = 0; i < weather.particles.length && activeCount < maxParticles; i++) {
        const p = weather.particles[i];
        if (!p.active) {
            p.active = true;
            p.x = Math.random() * GAME_WIDTH;
            // Randomize starting Y so particles don't spawn in a row
            p.y = -10 - Math.random() * 100;

            if (weather.type === 'snow') {
                p.speed = 30 + Math.random() * 40;
                p.size = 2 + Math.random() * 3;
                p.drift = (Math.random() - 0.5) * 30; // Horizontal drift
            } else if (weather.type === 'rain' || weather.type === 'monsoon') {
                const isMonsoon = weather.type === 'monsoon';
                p.speed = isMonsoon ? 300 + Math.random() * 150 : 200 + Math.random() * 100;
                p.size = isMonsoon ? 2 + Math.random() * 2 : 1 + Math.random() * 2;
                p.drift = isMonsoon ? -30 : -20; // Slight angle
            }
            activeCount++;
        }
    }

    // Update and render particles
    g.clear();
    renderWeatherParticles(weather, g, dt);
}

/**
 * Render weather particles
 */
function renderWeatherParticles(weather, g, dt) {
    weather.particles.forEach(p => {
        if (!p.active) return;

        // Update position
        p.y += p.speed * dt;
        p.x += p.drift * dt;

        // Deactivate if off screen
        if (p.y > GAME_HEIGHT + 10 || p.x < -10 || p.x > GAME_WIDTH + 10) {
            p.active = false;
            return;
        }

        // Draw particle
        if (weather.type === 'snow') {
            g.fillStyle(0xFFFFFF, 0.8);
            g.fillCircle(p.x, p.y, p.size);
        } else if (weather.type === 'rain') {
            // Light rain - subtle blue streaks
            g.fillStyle(0x6495ED, 0.6);  // Cornflower blue, 60% opacity
            g.fillRect(p.x, p.y, 1, p.size * 4);
        } else if (weather.type === 'monsoon') {
            // Heavy monsoon - darker, thicker, more visible
            g.fillStyle(0x4169E1, 0.75);  // Royal blue
            g.fillRect(p.x, p.y, 2, p.size * 6);
        }
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

    // Show interact prompt only for interactables (pet interaction is click-based now)
    GameState.interactPrompt.setText('🔵 Press E to interact');
    GameState.interactPrompt.setVisible(GameState.canInteract);

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

    // Fruit tree prompt (unified system)
    const nearFruitTree = getNearbyTree(GameState.player.x, GameState.player.y, 80);
    if (nearFruitTree && treeData[nearFruitTree.tree.type]?.fruit) {
        if (nearFruitTree.tree.fruitReady) {
            const fruitEmoji = { apple: '🍎', orange: '🍊', peach: '🍑', cherry: '🍒' };
            const fruitType = treeData[nearFruitTree.tree.type].fruit;
            const emoji = fruitEmoji[fruitType] || '🍎';
            GameState.fruitTreePrompt.setText(`${emoji} Click to harvest`).setVisible(true);
        } else if (nearFruitTree.tree.blossoming) {
            GameState.fruitTreePrompt.setText('🌸 Blossoming...').setVisible(true);
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

    // Crafting station prompt and state
    const nearStation = findNearestCookingStation();
    if (nearStation) {
        const stationConfig = {
            campfire: '🔥', stove: '🍳', oven: '🧱',
            alchemy_table: '⚗️', tailor_bench: '🧵', forge: '🔨'
        };
        const actionConfig = {
            campfire: 'cook', stove: 'cook', oven: 'bake',
            alchemy_table: 'brew', tailor_bench: 'tailor', forge: 'forge'
        };
        const emoji = stationConfig[nearStation.stationType] || '🍳';
        const action = actionConfig[nearStation.stationType] || 'craft';
        GameState.currentStationType = nearStation.stationType;
        GameState.cookingPrompt.setText(`${emoji} E to ${action}`).setVisible(true);
    } else {
        GameState.currentStationType = null;
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

    // Unified tree prompt
    if (GameState.player && GameState.treePrompt) {
        const nearbyTree = getNearbyTree(GameState.player.x, GameState.player.y);
        if (nearbyTree) {
            const { tree } = nearbyTree;
            const tool = GameState.equippedTool;
            let promptText = '';

            if (tree.stage === 'sapling') {
                promptText = '🌱 Sapling - too young';
            } else if (tree.stage === 'fallen') {
                if (tool === 'axe') {
                    promptText = '🪵 Click to chop (10x wood!)';
                } else {
                    promptText = '🪓 Equip axe to chop';
                }
            } else if (tree.hasHive && tree.hiveHoney > 0) {
                promptText = `🍯 E to harvest honey (${tree.hiveHoney})`;
            } else if (tree.fruitReady && tree.stage !== 'sapling') {
                const season = getCurrentSeason();
                if (season === 'summer' || season === 'fall') {
                    promptText = '🍎 E to pick fruit';
                }
            } else if (tool === 'axe') {
                promptText = `🪓 Click to chop (${tree.hp}/${tree.maxHp} HP)`;
            } else {
                promptText = '🌳 ' + tree.stage.charAt(0).toUpperCase() + tree.stage.slice(1);
            }

            GameState.treePrompt.setText(promptText).setVisible(true);
        } else {
            GameState.treePrompt.setVisible(false);
        }
    }
}
