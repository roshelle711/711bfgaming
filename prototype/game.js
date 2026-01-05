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
import { createWhimsicalCharacter, createPet, updatePlayerMovement, updatePetFollow, updatePlayerSparkles, createToolGraphics, updateHeldTool, equipTool } from './modules/player.js';
import { createHouse, createFarmPlot, drawTree, createSeedPickup, createNPCs, updateNPCPatrol, drawLamppost, drawLamppostLight, createFruitTree } from './modules/world.js';
import { setupUI, showCharacterCreation, showDialog, closeDialog, updateInventoryDisplay, updateSeedIndicator, updateCoinDisplay, toggleInventory, setActiveHotbarSlot, updateHotbarDisplay } from './modules/ui.js';
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
        roundPixels: false
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
    // Background grass
    graphics.fillStyle(0x90EE90, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x7CCD7C, 1);
    for (let i = 0; i < 200; i++) {
        graphics.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 2 + Math.random() * 5);
    }

    // Flowers scattered
    const flowerColors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0xFFB6C1, 0xDDA0DD];
    for (let i = 0; i < 80; i++) {
        graphics.fillStyle(flowerColors[Math.floor(Math.random() * flowerColors.length)], 0.7);
        graphics.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 3 + Math.random() * 2);
    }

    // Paths - extended for larger screen
    graphics.fillStyle(0xD2B48C, 1);
    graphics.fillRect(150, 280, 1100, 30);  // Main horizontal path
    graphics.fillRect(680, 280, 30, 420);   // Main vertical path (center)
    graphics.fillRect(235, 200, 30, 85);    // To Mira's cottage
    graphics.fillRect(885, 200, 30, 85);    // To Your Home
    graphics.fillRect(1180, 500, 30, 180);  // To General Store

    // Path texture
    graphics.fillStyle(0xC4A77D, 0.5);
    for (let i = 0; i < 100; i++) {
        graphics.fillCircle(150 + Math.random() * 1100, 282 + Math.random() * 26, 5);
    }

    // Obstacles group
    GameState.obstacles = this.physics.add.staticGroup();

    // Trees - spread across larger map
    const trees = [
        { x: 60, y: 100, s: 35 }, { x: 1340, y: 100, s: 40 }, { x: 60, y: 800, s: 42 },
        { x: 1340, y: 800, s: 38 }, { x: 60, y: 450, s: 36 }, { x: 1340, y: 450, s: 34 },
        { x: 1050, y: 150, s: 32 }, { x: 100, y: 650, s: 30 }, { x: 1340, y: 600, s: 33 },
        { x: 60, y: 250, s: 28 }
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

    createHouse(graphics, 1200, 580, 0x27AE60, '🏪 General Store', this);
    GameState.obstacles.add(this.add.rectangle(1200, 580, 120, 100, 0x000000, 0));

    // Fishing pond - moved down for larger screen
    const pondX = 180, pondY = 720;
    graphics.fillStyle(0x5DADE2, 0.9);
    graphics.fillEllipse(pondX, pondY, 140, 100);
    graphics.fillStyle(0x85C1E9, 0.6);
    graphics.fillEllipse(pondX - 20, pondY - 15, 60, 40);
    graphics.lineStyle(3, 0x8B4513, 1);
    graphics.strokeEllipse(pondX, pondY, 145, 105);
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 55 + Math.random() * 15;
        graphics.fillStyle(0x90EE90, 1);
        graphics.fillCircle(pondX + Math.cos(angle) * dist, pondY + Math.sin(angle) * dist * 0.7, 6 + Math.random() * 4);
    }
    graphics.fillStyle(0x228B22, 1);
    graphics.fillCircle(pondX - 60, pondY + 35, 4);
    graphics.fillCircle(pondX + 50, pondY + 40, 5);
    graphics.fillCircle(pondX + 65, pondY - 30, 4);
    this.add.text(pondX, pondY - 70, '🎣 Fishing Pond', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

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

    // Seed pickups - scattered around the map
    const seedLocations = [
        { x: 350, y: 500, type: 'carrot' },
        { x: 400, y: 520, type: 'tomato' },
        { x: 320, y: 540, type: 'flower' },
        { x: 800, y: 500, type: 'carrot' },
        { x: 850, y: 520, type: 'tomato' },
        { x: 820, y: 550, type: 'flower' }
    ];
    seedLocations.forEach((loc, index) => {
        GameState.seedPickups.push(createSeedPickup(this, loc.x, loc.y, loc.type, index));
    });

    // Well decoration - repositioned for larger screen
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(610, 370, 60, 60);
    graphics.fillStyle(0x696969, 1);
    graphics.fillRect(620, 380, 40, 40);
    graphics.fillStyle(0x5DADE2, 0.7);
    graphics.fillRect(625, 385, 30, 30);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(605, 355, 70, 15);
    graphics.fillRect(630, 330, 20, 25);
    this.add.text(640, 315, '🪣', { fontSize: '16px' }).setOrigin(0.5);
    GameState.obstacles.add(this.add.rectangle(640, 400, 60, 60, 0x000000, 0));

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
            graphics: bird
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

    // Create tool graphics
    createToolGraphics(scene);

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
    updatePetFollow();

    // === SYSTEMS UPDATES ===
    updatePlantGrowth(this, delta);
    updateFishing(delta);
    checkSeedPickups();
    respawnSeedPickups(this, delta);
    updateNPCPatrol();
    updateWildlife(delta);
    updateFruitRegrowth(delta);
    updateHeldTool();
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
 */
function useActiveItem(scene) {
    const tool = GameState.equippedTool;
    const nearPlot = findNearestFarmPlot();
    console.log('useActiveItem - tool:', tool, 'nearPlot:', nearPlot ? nearPlot.state : 'none');

    // HOE: Till grass plots (uses nearest plot, not directional)
    if (tool === 'hoe') {
        console.log('Hoe equipped, nearPlot state:', nearPlot?.state);
        if (nearPlot && nearPlot.state === 'grass') {
            console.log('Hoeing plot!');
            // Small wind-up delay for satisfying feel
            GameState.isHoeing = true;
            setTimeout(() => {
                hoePlot(nearPlot);
                GameState.isHoeing = false;
            }, 150);
        }
        return;
    }

    // WATERING CAN: Water plants
    if (tool === 'wateringCan') {
        if (nearPlot && (nearPlot.state === 'planted' || nearPlot.state === 'growing') && !nearPlot.isWatered) {
            GameState.isWatering = true;
            waterPlot(nearPlot);
            setTimeout(() => {
                GameState.isWatering = false;
            }, 500);
        }
        return;
    }

    // FISHING ROD: Cast at pond
    if (tool === 'fishingRod') {
        if (isNearPond() && !GameState.isFishing) {
            startFishing();
        }
        return;
    }

    // === UNIVERSAL CLICK ACTIONS (work with any tool) ===

    // Fruit tree harvest
    const nearTree = findNearestFruitTree();
    if (nearTree && nearTree.hasFruit) {
        harvestFruit(nearTree);
        return;
    }

    // Farm plot actions
    if (nearPlot) {
        // Remove hazard/dead plant
        if (nearPlot.hazard || nearPlot.state === 'dead') {
            removeHazard(nearPlot);
            return;
        }
        // Harvest ready crops
        if (nearPlot.state === 'ready') {
            harvestCrop(nearPlot);
            return;
        }
        // Plant seeds in tilled soil (uses current seed selection from Tab)
        if (nearPlot.state === 'tilled') {
            plantSeed(nearPlot, scene);
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
 * Update target tile highlight (shows which plot hoe will hit)
 */
function updateTargetHighlight() {
    if (!GameState.targetHighlight || !GameState.player) return;

    GameState.targetHighlight.clear();

    // Only show highlight when hoe is equipped
    if (GameState.equippedTool !== 'hoe') return;

    const nearPlot = findNearestFarmPlot();
    if (!nearPlot) return;

    // Different colors based on plot state
    if (nearPlot.state === 'grass') {
        // Green highlight - can hoe this
        GameState.targetHighlight.lineStyle(3, 0x00FF00, 0.8);
        GameState.targetHighlight.strokeRect(nearPlot.x - 22, nearPlot.y - 22, 44, 44);
        // Corner brackets
        GameState.targetHighlight.fillStyle(0x00FF00, 0.3);
        GameState.targetHighlight.fillRect(nearPlot.x - 22, nearPlot.y - 22, 44, 44);
    } else {
        // Red highlight - can't hoe this
        GameState.targetHighlight.lineStyle(2, 0xFF0000, 0.5);
        GameState.targetHighlight.strokeRect(nearPlot.x - 22, nearPlot.y - 22, 44, 44);
    }
}

/**
 * Handle keyboard input
 */
function handleInput(scene) {
    // Escape key - close any open menu/dialog
    if (Phaser.Input.Keyboard.JustDown(GameState.escapeKey)) {
        if (GameState.isDialogOpen) {
            closeDialog();
        } else if (GameState.inventoryOpen) {
            toggleInventory();
        }
        return;
    }

    // Interact key (E) - tool actions AND interact actions (fallback for click)
    if (Phaser.Input.Keyboard.JustDown(GameState.interactKey) && !GameState.isDialogOpen && !GameState.inventoryOpen) {
        const tool = GameState.equippedTool;
        const nearPlot = findNearestFarmPlot();

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

        // Lamppost toggle
        const nearestLamppost = findNearestLamppost();
        if (nearestLamppost) {
            const lamppostIndex = GameState.lampposts.indexOf(nearestLamppost);
            if (!sendToggleLamppost(lamppostIndex)) {
                nearestLamppost.lightOn = !nearestLamppost.lightOn;
                nearestLamppost.lightGraphics.visible = nearestLamppost.lightOn;
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
        // Move toward target
        const dx = bird.targetX - bird.x;
        const dy = bird.targetY - bird.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
            // Pick new random target
            bird.targetX = 100 + Math.random() * 1200;
            bird.targetY = 80 + Math.random() * 250;
        } else {
            bird.x += (dx / dist) * bird.speed * dt;
            bird.y += (dy / dist) * bird.speed * dt;
            // Update facing direction based on movement
            if (Math.abs(dx) > 1) bird.facingRight = dx > 0;
        }

        // Animate wings
        bird.wingPhase += dt * 15;

        // Redraw with color and correct direction
        bird.graphics.clear();
        const wingY = Math.sin(bird.wingPhase) * 4;
        const dir = bird.facingRight ? 1 : -1;

        // Body
        bird.graphics.fillStyle(bird.color, 1);
        bird.graphics.fillEllipse(bird.x, bird.y, 8, 5);
        // Head
        bird.graphics.fillCircle(bird.x + 5 * dir, bird.y - 2, 3);
        // Wings (darker shade)
        bird.graphics.fillStyle(bird.color - 0x222222, 1);
        bird.graphics.fillTriangle(
            bird.x - 2 * dir, bird.y,
            bird.x - 8 * dir, bird.y - 6 + wingY,
            bird.x + 2 * dir, bird.y
        );
        bird.graphics.fillTriangle(
            bird.x - 2 * dir, bird.y,
            bird.x - 8 * dir, bird.y + 6 - wingY,
            bird.x + 2 * dir, bird.y
        );
        // Eye
        bird.graphics.fillStyle(0x000000, 1);
        bird.graphics.fillCircle(bird.x + 6 * dir, bird.y - 3, 1.5);
        // Beak
        bird.graphics.fillStyle(0xFFA500, 1);
        bird.graphics.fillTriangle(bird.x + 7 * dir, bird.y - 2, bird.x + 11 * dir, bird.y - 1, bird.x + 7 * dir, bird.y);
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
