/**
 * ui.js - Dialogs, menus, character creation, HUD
 *
 * Exports:
 * - showDialog(message): Show dialog box with message
 * - closeDialog(): Close current dialog
 * - showCharacterCreation(scene, onComplete): Show character creation screen
 * - createInventoryIcons(scene): Create icon grid for inventory
 * - updateInventoryDisplay(): Update inventory icon counts
 * - toggleInventory(): Toggle inventory panel visibility
 * - updateSeedIndicator(): Update seed selection HUD
 * - updateCoinDisplay(): Update coin HUD
 * - setupUI(scene): Initialize all UI elements
 */

import { classes, petTypes, skinTones, hairColors, seedTypes, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GameState, loadPreset, saveCurrentAsPreset } from './state.js';
import { createWhimsicalCharacter, createPet } from './player.js';

/**
 * Show a dialog box with a message
 */
export function showDialog(message) {
    const scene = GameState.scene;
    if (!scene) return;

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

    GameState.dialogBox.setSize(boxWidth, boxHeight);
    GameState.dialogBox.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - boxHeight/2 - 20);
    GameState.dialogText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - boxHeight/2 - 30);
    scene.dialogCloseText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 35);

    GameState.dialogBox.setVisible(true);
    GameState.dialogText.setText(message).setVisible(true);
    scene.dialogCloseText.setVisible(true);
    GameState.isDialogOpen = true;
    GameState.interactPrompt.setVisible(false);
    GameState.farmPrompt.setVisible(false);
}

/**
 * Close the dialog box
 */
export function closeDialog() {
    GameState.dialogBox?.setVisible(false);
    GameState.dialogText?.setVisible(false);
    GameState.scene?.dialogCloseText?.setVisible(false);
    GameState.isDialogOpen = false;
    GameState.craftingOpen = false;
}

/**
 * Inventory item definitions
 */
const inventoryItems = {
    // Seeds (9 types)
    carrotSeed: { emoji: '🥕', name: 'Carrot Seed', category: 'seeds', key: 'carrot' },
    tomatoSeed: { emoji: '🍅', name: 'Tomato Seed', category: 'seeds', key: 'tomato' },
    flowerSeed: { emoji: '🌸', name: 'Flower Seed', category: 'seeds', key: 'flower' },
    lettuceSeed: { emoji: '🥬', name: 'Lettuce Seed', category: 'seeds', key: 'lettuce' },
    onionSeed: { emoji: '🧅', name: 'Onion Seed', category: 'seeds', key: 'onion' },
    potatoSeed: { emoji: '🥔', name: 'Potato Seed', category: 'seeds', key: 'potato' },
    pepperSeed: { emoji: '🌶️', name: 'Pepper Seed', category: 'seeds', key: 'pepper' },
    cornSeed: { emoji: '🌽', name: 'Corn Seed', category: 'seeds', key: 'corn' },
    pumpkinSeed: { emoji: '🎃', name: 'Pumpkin Seed', category: 'seeds', key: 'pumpkin' },
    // Crops (9 types)
    carrot: { emoji: '🥕', name: 'Carrot', category: 'crops', key: 'carrot' },
    tomato: { emoji: '🍅', name: 'Tomato', category: 'crops', key: 'tomato' },
    flower: { emoji: '🌸', name: 'Flower', category: 'crops', key: 'flower' },
    lettuce: { emoji: '🥬', name: 'Lettuce', category: 'crops', key: 'lettuce' },
    onion: { emoji: '🧅', name: 'Onion', category: 'crops', key: 'onion' },
    potato: { emoji: '🥔', name: 'Potato', category: 'crops', key: 'potato' },
    pepper: { emoji: '🌶️', name: 'Pepper', category: 'crops', key: 'pepper' },
    corn: { emoji: '🌽', name: 'Corn', category: 'crops', key: 'corn' },
    pumpkin: { emoji: '🎃', name: 'Pumpkin', category: 'crops', key: 'pumpkin' },
    // Fruits (4 types)
    apple: { emoji: '🍎', name: 'Apple', category: 'fruits', key: 'apple' },
    orange: { emoji: '🍊', name: 'Orange', category: 'fruits', key: 'orange' },
    peach: { emoji: '🍑', name: 'Peach', category: 'fruits', key: 'peach' },
    cherry: { emoji: '🍒', name: 'Cherry', category: 'fruits', key: 'cherry' },
    // Fish
    bass: { emoji: '🐟', name: 'Bass', category: 'fish', key: 'bass' },
    salmon: { emoji: '🐠', name: 'Salmon', category: 'fish', key: 'salmon' },
    goldfish: { emoji: '✨', name: 'Goldfish', category: 'fish', key: 'goldfish' },
    // Cooked
    salad: { emoji: '🥗', name: 'Salad', category: 'crafted', key: 'salad' },
    bouquet: { emoji: '💐', name: 'Bouquet', category: 'crafted', key: 'bouquet' },
    fishStew: { emoji: '🍲', name: 'Fish Stew', category: 'crafted', key: 'fishStew' },
    magicPotion: { emoji: '🧪', name: 'Magic Potion', category: 'crafted', key: 'magicPotion' }
};

/**
 * Create inventory icon grid (called once during setup)
 */
export function createInventoryIcons(scene) {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    GameState.inventoryIcons = [];

    // Panel background - larger to fit more items
    GameState.inventoryPanel = scene.add.rectangle(centerX, centerY, 700, 480, 0x1a1a2e, 0.95)
        .setStrokeStyle(3, 0x9B59B6).setDepth(150).setVisible(false);

    // Title
    GameState.inventoryTitle = scene.add.text(centerX, centerY - 215, '📦 INVENTORY', {
        fontSize: '20px', fill: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    // Category labels and icons - expanded for all items
    const categories = [
        { name: '🌱 Seeds', items: ['carrotSeed', 'tomatoSeed', 'flowerSeed', 'lettuceSeed', 'onionSeed', 'potatoSeed', 'pepperSeed', 'cornSeed', 'pumpkinSeed'], y: -160 },
        { name: '🌾 Crops', items: ['carrot', 'tomato', 'flower', 'lettuce', 'onion', 'potato', 'pepper', 'corn', 'pumpkin'], y: -90 },
        { name: '🍎 Fruits', items: ['apple', 'orange', 'peach', 'cherry'], y: -20 },
        { name: '🐟 Fish', items: ['bass', 'salmon', 'goldfish'], y: 50 },
        { name: '🍳 Cooked', items: ['salad', 'bouquet', 'fishStew', 'magicPotion'], y: 120 }
    ];

    categories.forEach(cat => {
        // Category label
        const label = scene.add.text(centerX - 310, centerY + cat.y, cat.name, {
            fontSize: '14px', fill: '#aaa'
        }).setDepth(151).setVisible(false);
        GameState.inventoryIcons.push({ type: 'label', obj: label });

        // Item icons - arranged in a row with smaller spacing for more items
        cat.items.forEach((itemKey, i) => {
            const item = inventoryItems[itemKey];
            const x = centerX - 220 + i * 60;
            const y = centerY + cat.y;

            // Icon background (interactive)
            const bg = scene.add.rectangle(x, y, 55, 55, 0x2C3E50, 0.9)
                .setStrokeStyle(2, 0x3498DB).setDepth(151).setInteractive().setVisible(false);

            // Emoji icon
            const icon = scene.add.text(x, y - 5, item.emoji, {
                fontSize: '24px'
            }).setOrigin(0.5).setDepth(152).setVisible(false);

            // Count text
            const count = scene.add.text(x, y + 18, '0', {
                fontSize: '12px', fill: '#fff', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(152).setVisible(false);

            // Store reference
            GameState.inventoryIcons.push({
                type: 'item',
                bg, icon, count,
                itemKey,
                category: item.category,
                key: item.key,
                name: item.name,
                emoji: item.emoji
            });

            // Hover events
            bg.on('pointerover', () => {
                bg.setStrokeStyle(2, 0xFFD700);
                showInventoryTooltip(scene, x, y - 45, item.name);
            });
            bg.on('pointerout', () => {
                bg.setStrokeStyle(2, 0x3498DB);
                hideInventoryTooltip();
            });
        });
    });

    // Close hint
    GameState.inventoryCloseHint = scene.add.text(centerX, centerY + 210, '[ Press I to close ]', {
        fontSize: '12px', fill: '#666'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    // Tooltip (hidden by default)
    GameState.inventoryTooltip = scene.add.text(0, 0, '', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#000000cc', padding: { x: 6, y: 4 }
    }).setOrigin(0.5).setDepth(160).setVisible(false);
}

/**
 * Show tooltip above item
 */
function showInventoryTooltip(scene, x, y, text) {
    if (!GameState.inventoryTooltip) return;
    GameState.inventoryTooltip.setText(text);
    GameState.inventoryTooltip.setPosition(x, y);
    GameState.inventoryTooltip.setVisible(true);
}

/**
 * Hide tooltip
 */
function hideInventoryTooltip() {
    if (GameState.inventoryTooltip) {
        GameState.inventoryTooltip.setVisible(false);
    }
}

/**
 * Update inventory icon counts
 */
export function updateInventoryDisplay() {
    if (!GameState.inventoryIcons) return;
    const inv = GameState.inventory;

    GameState.inventoryIcons.forEach(item => {
        if (item.type !== 'item') return;

        let amount = 0;
        if (item.category === 'seeds') {
            amount = inv.seeds[item.key] || 0;
        } else if (item.category === 'crops') {
            amount = inv.crops[item.key] || 0;
        } else if (item.category === 'fruits') {
            amount = inv.fruits[item.key] || 0;
        } else if (item.category === 'fish') {
            amount = inv.fish[item.key] || 0;
        } else if (item.category === 'crafted') {
            amount = inv.crafted[item.key] || 0;
        }

        item.count.setText(amount.toString());
        // Dim items with 0 count
        item.icon.setAlpha(amount > 0 ? 1 : 0.4);
        item.count.setAlpha(amount > 0 ? 1 : 0.5);
    });
}

/**
 * Toggle inventory panel visibility
 */
export function toggleInventory() {
    if (GameState.inventoryOpen) {
        hideInventory();
    } else {
        showInventory();
    }
}

/**
 * Show the inventory panel
 */
export function showInventory() {
    if (!GameState.inventoryPanel) return;

    // Show all inventory elements
    GameState.inventoryPanel.setVisible(true);
    GameState.inventoryTitle?.setVisible(true);
    GameState.inventoryCloseHint?.setVisible(true);

    GameState.inventoryIcons?.forEach(item => {
        if (item.type === 'label') {
            item.obj.setVisible(true);
        } else if (item.type === 'item') {
            item.bg.setVisible(true);
            item.icon.setVisible(true);
            item.count.setVisible(true);
        }
    });

    updateInventoryDisplay();
    GameState.inventoryOpen = true;
}

/**
 * Hide the inventory panel
 */
export function hideInventory() {
    if (!GameState.inventoryPanel) return;

    // Hide all inventory elements
    GameState.inventoryPanel.setVisible(false);
    GameState.inventoryTitle?.setVisible(false);
    GameState.inventoryCloseHint?.setVisible(false);
    GameState.inventoryTooltip?.setVisible(false);

    GameState.inventoryIcons?.forEach(item => {
        if (item.type === 'label') {
            item.obj.setVisible(false);
        } else if (item.type === 'item') {
            item.bg.setVisible(false);
            item.icon.setVisible(false);
            item.count.setVisible(false);
        }
    });

    GameState.inventoryOpen = false;
}

/**
 * Update the seed indicator HUD
 */
export function updateSeedIndicator() {
    if (!GameState.seedIndicator) return;
    const emoji = {
        carrot: '🥕', tomato: '🍅', flower: '🌸',
        lettuce: '🥬', onion: '🧅', potato: '🥔',
        pepper: '🌶️', corn: '🌽', pumpkin: '🎃'
    };
    const seed = seedTypes[GameState.currentSeedIndex];
    GameState.seedIndicator.setText(`Plant: ${emoji[seed] || '🌱'} (${GameState.inventory.seeds[seed] || 0})`);
}

/**
 * Update the coin display HUD
 */
export function updateCoinDisplay() {
    if (!GameState.coinDisplay) return;
    GameState.coinDisplay.setText(`💰 ${GameState.coins}`);
}

/**
 * Initialize UI elements
 */
export function setupUI(scene) {
    // Store scene reference
    GameState.scene = scene;

    const centerX = GAME_WIDTH / 2;
    const bottomY = GAME_HEIGHT;

    // Create icon-based inventory (toggleable with I key)
    createInventoryIcons(scene);

    // Inventory hint (top right corner)
    scene.add.text(GAME_WIDTH - 10, 10, '📦 I = Inventory', {
        fontSize: '12px', fill: '#aaa', backgroundColor: '#00000066', padding: { x: 6, y: 4 }
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    // Seed indicator (below inventory hint)
    GameState.seedIndicator = scene.add.text(GAME_WIDTH - 10, 45, '', {
        fontSize: '14px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 6, y: 4 }
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    // Coin display
    GameState.coinDisplay = scene.add.text(10, 10, '', {
        fontSize: '18px', fill: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setDepth(100).setScrollFactor(0);

    // Time display
    GameState.timeDisplay = scene.add.text(10, 50, '', {
        fontSize: '14px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 6, y: 4 }
    }).setDepth(100).setScrollFactor(0);

    // Day/night overlay
    GameState.dayOverlay = scene.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a23, 0).setDepth(50);

    // Prompts
    GameState.interactPrompt = scene.add.text(centerX, bottomY - 150, '🔵 Press E to interact', {
        fontSize: '16px', fill: '#FFD700', fontStyle: 'bold', backgroundColor: '#00000099', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    GameState.farmPrompt = scene.add.text(centerX, bottomY - 180, '', {
        fontSize: '14px', fill: '#90EE90', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    GameState.fishingPrompt = scene.add.text(centerX, bottomY - 210, '', {
        fontSize: '14px', fill: '#87CEEB', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    GameState.cookingPrompt = scene.add.text(centerX, bottomY - 210, '', {
        fontSize: '14px', fill: '#FF6B35', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Dialog box
    GameState.dialogBox = scene.add.rectangle(centerX, bottomY - 50, 600, 100, 0x2C3E50, 0.95)
        .setStrokeStyle(3, 0x9B59B6).setDepth(150).setVisible(false);

    GameState.dialogText = scene.add.text(centerX, bottomY - 70, '', {
        fontSize: '14px', fill: '#fff', wordWrap: { width: 560 }, lineSpacing: 6, align: 'center'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    scene.dialogCloseText = scene.add.text(centerX, bottomY - 10, '[ Press E to close ]', {
        fontSize: '11px', fill: '#888'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    // Initial updates (inventory starts hidden, updates when opened)
    updateSeedIndicator();
    updateCoinDisplay();
}

/**
 * Show character creation screen
 */
export function showCharacterCreation(scene, onComplete) {
    const creationUI = [];
    GameState.creationUI = creationUI;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const overlay = scene.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9).setDepth(200);
    creationUI.push(overlay);

    // Title
    const title = scene.add.text(centerX, 35, '✨ Create Your Character ✨', {
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
            .setStrokeStyle(3, GameState.playerClass === cls ? 0xFFD700 : data.color)
            .setDepth(201).setInteractive();
        creationUI.push(btn);
        classButtons.push({ btn, cls });

        const emoji = scene.add.text(x, y - 15, data.emoji, { fontSize: '22px' }).setOrigin(0.5).setDepth(202);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 15, cls.toUpperCase(), { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            GameState.playerClass = cls;
            classButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
            refreshPreview();
        });
        btn.on('pointerover', () => btn.setAlpha(0.8));
        btn.on('pointerout', () => btn.setAlpha(1));
    });

    // === CENTER: Preview & Name ===
    const nameLabel = scene.add.text(centerX, 80, 'Your Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(nameLabel);

    const nameInput = scene.add.dom(centerX, 115).createFromHTML(`
        <input type="text" id="playerNameInput" value="${GameState.playerName}"
        style="width: 180px; padding: 8px 12px; font-size: 16px; text-align: center;
        border: 2px solid #9B59B6; border-radius: 8px; background: #2C3E50; color: #fff;
        outline: none;">
    `).setDepth(205);
    creationUI.push(nameInput);

    nameInput.addListener('input');
    nameInput.on('input', (e) => {
        GameState.playerName = e.target.value || 'Adventurer';
    });

    // Character preview
    let previewChar = createWhimsicalCharacter(scene, centerX, 280, GameState.playerClass, false, null, GameState.customization);
    previewChar.setDepth(205);
    creationUI.push(previewChar);

    // Pet preview
    let previewPet = null;
    function updatePetPreview() {
        if (previewPet) { previewPet.destroy(); previewPet = null; }
        if (GameState.customization.pet !== 'none') {
            previewPet = createPet(scene, centerX + 60, 290, GameState.customization.pet);
            if (previewPet) {
                previewPet.setDepth(204);
                creationUI.push(previewPet);
            }
        }
    }
    updatePetPreview();

    function refreshPreview() {
        previewChar.destroy();
        previewChar = createWhimsicalCharacter(scene, centerX, 280, GameState.playerClass, false, null, GameState.customization);
        previewChar.setDepth(205);
        creationUI.push(previewChar);
        updatePetPreview();
    }

    // === RIGHT COLUMN: Appearance ===
    const rightX = GAME_WIDTH - 200;
    const appearLabel = scene.add.text(rightX, 80, 'Appearance', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
    creationUI.push(appearLabel);

    // Body style
    const bodyLabel = scene.add.text(rightX, 115, 'Body Style', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(bodyLabel);

    const femBtn = scene.add.rectangle(rightX - 40, 145, 70, 30, 0x9B59B6, 0.8).setDepth(201).setInteractive()
        .setStrokeStyle(2, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
    creationUI.push(femBtn);
    const femText = scene.add.text(rightX - 40, 145, 'Feminine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(femText);

    const mascBtn = scene.add.rectangle(rightX + 40, 145, 70, 30, 0x3498DB, 0.8).setDepth(201).setInteractive()
        .setStrokeStyle(2, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
    creationUI.push(mascBtn);
    const mascText = scene.add.text(rightX + 40, 145, 'Masculine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(mascText);

    femBtn.on('pointerdown', () => {
        GameState.customization.gender = 'female';
        femBtn.setStrokeStyle(2, 0xFFD700);
        mascBtn.setStrokeStyle(2, 0x3498DB);
        refreshPreview();
    });
    mascBtn.on('pointerdown', () => {
        GameState.customization.gender = 'male';
        mascBtn.setStrokeStyle(2, 0xFFD700);
        femBtn.setStrokeStyle(2, 0x9B59B6);
        refreshPreview();
    });

    // Skin tone
    const skinLabel = scene.add.text(rightX, 180, 'Skin', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(skinLabel);

    const skinButtons = [];
    skinTones.forEach((tone, i) => {
        const x = rightX - 75 + (i % 6) * 25;
        const y = 205;
        const btn = scene.add.circle(x, y, 10, tone).setDepth(201).setInteractive()
            .setStrokeStyle(2, GameState.customization.skinTone === tone ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        skinButtons.push({ btn, tone });
        btn.on('pointerdown', () => {
            GameState.customization.skinTone = tone;
            skinButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
            refreshPreview();
        });
    });

    // Hair color
    const hairLabel = scene.add.text(rightX, 235, 'Hair', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(hairLabel);

    const hairButtons = [];
    hairColors.forEach((color, i) => {
        const x = rightX - 75 + (i % 5) * 25;
        const y = 260 + Math.floor(i / 5) * 25;
        const btn = scene.add.circle(x, y, 10, color).setDepth(201).setInteractive()
            .setStrokeStyle(2, GameState.customization.hairColor === color ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        hairButtons.push({ btn, color });
        btn.on('pointerdown', () => {
            GameState.customization.hairColor = color;
            hairButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
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
            .setStrokeStyle(2, GameState.customization.pet === pet ? 0xFFD700 : data.color)
            .setDepth(201).setInteractive();
        creationUI.push(btn);
        petButtons.push({ btn, pet });

        const emoji = scene.add.text(x, y - 8, data.emoji, { fontSize: '20px' }).setOrigin(0.5).setDepth(202);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 18, data.name, { fontSize: '9px', fill: '#aaa' }).setOrigin(0.5).setDepth(202);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            GameState.customization.pet = pet;
            petButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
            updatePetPreview();
        });
    });

    // === BOTTOM CENTER: Presets ===
    const presetLabel = scene.add.text(centerX, 380, 'Quick Start Presets', { fontSize: '14px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(presetLabel);

    for (let i = 0; i < 3; i++) {
        const x = centerX - 100 + i * 100;
        const preset = GameState.characterPresets[i];

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
                classButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
                petButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
                skinButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
                hairButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
                femBtn.setStrokeStyle(2, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
                mascBtn.setStrokeStyle(2, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
                document.getElementById('playerNameInput').value = GameState.playerName;
                refreshPreview();
            });
        } else {
            const plus = scene.add.text(x, 425, '💾', { fontSize: '16px' }).setOrigin(0.5).setDepth(202);
            creationUI.push(plus);
            const saveLabel = scene.add.text(x, 445, 'Save', { fontSize: '9px', fill: '#666' }).setOrigin(0.5).setDepth(202);
            creationUI.push(saveLabel);

            slotBtn.on('pointerdown', () => {
                saveCurrentAsPreset(i);
                // Refresh the UI
                creationUI.forEach(obj => obj.destroy());
                showCharacterCreation(scene, onComplete);
            });
        }
    }

    // === BOTTOM RIGHT: Actions ===
    // Randomize button
    const randomBtn = scene.add.rectangle(rightX, 400, 120, 35, 0xE67E22, 0.9).setDepth(201).setInteractive().setStrokeStyle(2, 0xF39C12);
    creationUI.push(randomBtn);
    const randomText = scene.add.text(rightX, 400, '🎲 Randomize', { fontSize: '13px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(randomText);

    randomBtn.on('pointerdown', () => {
        GameState.playerClass = classKeys[Math.floor(Math.random() * classKeys.length)];
        GameState.customization.skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
        GameState.customization.hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        GameState.customization.gender = Math.random() > 0.5 ? 'female' : 'male';
        const petOptions = petKeys.filter(p => p !== 'none');
        GameState.customization.pet = petOptions[Math.floor(Math.random() * petOptions.length)];

        classButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
        petButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
        skinButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
        hairButtons.forEach(b => b.btn.setStrokeStyle(2, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
        femBtn.setStrokeStyle(2, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
        mascBtn.setStrokeStyle(2, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
        refreshPreview();
    });
    randomBtn.on('pointerover', () => randomBtn.setAlpha(0.8));
    randomBtn.on('pointerout', () => randomBtn.setAlpha(1));

    // Play button
    const playBtn = scene.add.rectangle(rightX, 460, 150, 50, 0x27AE60, 1).setDepth(201).setInteractive().setStrokeStyle(3, 0x2ECC71);
    creationUI.push(playBtn);
    const playText = scene.add.text(rightX, 460, '▶ START GAME', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202);
    creationUI.push(playText);

    playBtn.on('pointerdown', () => {
        creationUI.forEach(obj => obj.destroy());
        GameState.creationUI = [];
        if (onComplete) onComplete();
    });
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ECC71, 1));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27AE60, 1));
}
