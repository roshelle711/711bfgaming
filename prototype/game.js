/**
 * game.js - Main entry point for 711BF Gaming
 *
 * This file orchestrates all modules and manages the Phaser lifecycle.
 * For feature-specific code, see the modules/ directory.
 */

// === MODULE IMPORTS ===
import { GAME_WIDTH, GAME_HEIGHT, classes, baseSpeed, maxSpeed } from './modules/config.js';
import { GameState } from './modules/state.js';
import { getTimeString, getDayPhase } from './modules/utils.js';
import { createWhimsicalCharacter, createPet, updatePlayerMovement, updatePetFollow, updatePlayerSparkles } from './modules/player.js';
import { createHouse, createFarmPlot, drawTree, createSeedPickup, createNPCs, updateNPCPatrol } from './modules/world.js';
import { setupUI, showCharacterCreation, showDialog, closeDialog, updateInventoryDisplay, updateSeedIndicator, updateCoinDisplay, toggleInventory } from './modules/ui.js';
import { hoePlot, plantSeed, harvestCrop, updatePlantGrowth, cycleSeedType, startFishing, updateFishing, showShopMenu, showCraftingMenu, checkSeedPickups, respawnSeedPickups, findNearestFarmPlot, isNearPond, isNearCookingStation } from './modules/systems.js';
import { connectToServer, interpolateOtherPlayers, sendPositionToServer, interpolateNPCs } from './modules/multiplayer.js';

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

    // Farm area - moved down for larger screen
    const farmStartX = 500, farmStartY = 700;
    graphics.fillStyle(0x8B7355, 1);
    graphics.fillRect(farmStartX - 110, farmStartY - 55, 230, 120);
    graphics.lineStyle(2, 0x654321, 1);
    graphics.strokeRect(farmStartX - 110, farmStartY - 55, 230, 120);
    graphics.fillStyle(0x5D4037, 0.3);
    for (let i = 0; i < 20; i++) {
        graphics.fillCircle(farmStartX - 100 + Math.random() * 210, farmStartY - 45 + Math.random() * 100, 3);
    }
    this.add.text(farmStartX, farmStartY - 75, '🌱 Farm', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Create farm plots with index for server sync
    let plotIndex = 0;
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
            const plot = createFarmPlot(this, farmStartX - 80 + col * 50, farmStartY - 25 + row * 55, plotIndex);
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

    // === UI SETUP ===
    setupUI(this);

    // === SHOW CHARACTER CREATION ===
    // Input setup moved to startGame() to avoid capturing keys during name entry
    showCharacterCreation(this, () => startGame(this));
}

/**
 * Start the game after character creation
 */
function startGame(scene) {
    // === INPUT SETUP (after character creation to avoid capturing keys during name entry) ===
    GameState.cursors = scene.input.keyboard.createCursorKeys();
    GameState.wasd = scene.input.keyboard.addKeys('W,S,A,D');
    GameState.interactKey = scene.input.keyboard.addKey('E');
    GameState.hoeKey = scene.input.keyboard.addKey('H');
    GameState.plantKey = scene.input.keyboard.addKey('P');
    GameState.tabKey = scene.input.keyboard.addKey('TAB');
    GameState.fishKey = scene.input.keyboard.addKey('F');
    GameState.craftKey = scene.input.keyboard.addKey('C');
    GameState.inventoryKey = scene.input.keyboard.addKey('I');

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
 * Handle keyboard input
 */
function handleInput(scene) {
    // Interact key (E)
    if (Phaser.Input.Keyboard.JustDown(GameState.interactKey)) {
        if (GameState.isDialogOpen) {
            closeDialog();
        } else if (GameState.canInteract && GameState.currentInteractable) {
            if (GameState.currentInteractable.interactType === 'shop') {
                showShopMenu();
            } else if (GameState.currentInteractable.message) {
                showDialog(GameState.currentInteractable.message);
            }
        }
    }

    // Hoe key (H)
    if (Phaser.Input.Keyboard.JustDown(GameState.hoeKey) && !GameState.isDialogOpen) {
        const plot = findNearestFarmPlot();
        if (plot) hoePlot(plot);
    }

    // Plant key (P)
    if (Phaser.Input.Keyboard.JustDown(GameState.plantKey) && !GameState.isDialogOpen) {
        const plot = findNearestFarmPlot();
        if (plot) {
            if (plot.state === 'ready') {
                harvestCrop(plot);
            } else {
                plantSeed(plot, scene);
            }
        }
    }

    // Tab key - cycle seeds
    if (Phaser.Input.Keyboard.JustDown(GameState.tabKey) && !GameState.isDialogOpen) {
        cycleSeedType();
    }

    // Fish key (F)
    if (Phaser.Input.Keyboard.JustDown(GameState.fishKey) && !GameState.isDialogOpen) {
        if (isNearPond()) {
            startFishing();
        }
    }

    // Craft key (C)
    if (Phaser.Input.Keyboard.JustDown(GameState.craftKey) && !GameState.isDialogOpen && !GameState.inventoryOpen) {
        if (isNearCookingStation()) {
            showCraftingMenu();
        }
    }

    // Inventory key (I)
    if (Phaser.Input.Keyboard.JustDown(GameState.inventoryKey) && !GameState.isDialogOpen) {
        toggleInventory();
    }
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

    // Farm prompts
    const nearPlot = findNearestFarmPlot();
    if (nearPlot) {
        let promptText = '';
        if (nearPlot.state === 'grass') promptText = '🔨 H to hoe';
        else if (nearPlot.state === 'tilled') promptText = '🌱 P to plant';
        else if (nearPlot.state === 'ready') promptText = '✋ P to harvest';
        GameState.farmPrompt.setText(promptText).setVisible(!!promptText);
    } else {
        GameState.farmPrompt.setVisible(false);
    }

    // Fishing prompt
    if (isNearPond() && !GameState.isFishing) {
        GameState.fishingPrompt.setText('🎣 F to fish').setVisible(true);
    } else {
        GameState.fishingPrompt.setVisible(false);
    }

    // Cooking prompt
    if (isNearCookingStation()) {
        GameState.cookingPrompt.setText('🍳 C to cook').setVisible(true);
    } else {
        GameState.cookingPrompt.setVisible(false);
    }
}
