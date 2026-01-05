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

import { classes, petTypes, skinTones, hairColors, seedTypes, toolTypes, cropData, fruitData, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GameState, loadPreset, saveCurrentAsPreset, deletePreset } from './state.js';
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
    const boxHeight = Math.min(Math.max(bounds.height + padding * 2 + 40, 80), 450);  // Increased max height for shop

    // Position box so it sits above bottom of screen
    const boxY = GAME_HEIGHT - boxHeight / 2 - 25;

    GameState.dialogBox.setSize(boxWidth, boxHeight);
    GameState.dialogBox.setPosition(GAME_WIDTH / 2, boxY);

    // Position text at top of box with padding (change origin to top-center for multi-line)
    const textY = boxY - boxHeight / 2 + padding;
    GameState.dialogText.setOrigin(0.5, 0);  // Top-center origin
    GameState.dialogText.setPosition(GAME_WIDTH / 2, textY);
    scene.dialogCloseText.setPosition(GAME_WIDTH / 2, boxY + boxHeight / 2 - 15);

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
    GameState.inventoryCloseHint = scene.add.text(centerX, centerY + 210, '[ I, E, or ESC to close ]', {
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

// ===== HOTBAR SYSTEM =====

/**
 * Create the hotbar UI elements
 */
function createHotbarUI(scene) {
    const slotSize = 50;
    const slotGap = 8;
    const totalWidth = (slotSize * 5) + (slotGap * 4);
    const startX = (GAME_WIDTH - totalWidth) / 2 + slotSize / 2;
    const y = GAME_HEIGHT - 40;

    GameState.hotbarSlots = [];

    for (let i = 0; i < 5; i++) {
        const x = startX + i * (slotSize + slotGap);

        // Slot background
        const bg = scene.add.rectangle(x, y, slotSize, slotSize, 0x2C3E50, 0.9)
            .setStrokeStyle(3, 0x3498DB)
            .setDepth(100);

        // Slot number (1-5)
        const numText = scene.add.text(x - slotSize/2 + 5, y - slotSize/2 + 2, `${i + 1}`, {
            fontSize: '10px', fill: '#888'
        }).setDepth(101);

        // Item icon (emoji)
        const icon = scene.add.text(x, y - 5, '', {
            fontSize: '22px'
        }).setOrigin(0.5).setDepth(101);

        // Count text (for stackable items)
        const count = scene.add.text(x + slotSize/2 - 5, y + slotSize/2 - 5, '', {
            fontSize: '11px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(1).setDepth(101);

        GameState.hotbarSlots.push({ bg, numText, icon, count, x, y });
    }

    // Hotbar background panel
    GameState.hotbarPanel = scene.add.rectangle(GAME_WIDTH / 2, y, totalWidth + 20, slotSize + 16, 0x1a1a2e, 0.8)
        .setStrokeStyle(2, 0x9B59B6)
        .setDepth(99);
}

/**
 * Update the hotbar display to reflect current state
 */
export function updateHotbarDisplay() {
    if (!GameState.hotbarSlots) return;

    const emojis = {
        // Tools
        hoe: '🔨', wateringCan: '💧', fishingRod: '🎣',
        // Seeds
        carrot: '🥕', tomato: '🍅', flower: '🌸',
        lettuce: '🥬', onion: '🧅', potato: '🥔',
        pepper: '🌶️', corn: '🌽', pumpkin: '🎃',
        // Fruits
        apple: '🍎', orange: '🍊', peach: '🍑', cherry: '🍒',
        // Fish
        bass: '🐟', salmon: '🐠', goldfish: '✨'
    };

    for (let i = 0; i < 5; i++) {
        const slot = GameState.hotbarSlots[i];
        const hotbarItem = GameState.hotbar[i];
        const isActive = GameState.activeHotbarSlot === i;

        // Update border color for active slot
        slot.bg.setStrokeStyle(3, isActive ? 0xFFD700 : 0x3498DB);

        if (hotbarItem.type === 'empty' || !hotbarItem.item) {
            slot.icon.setText('');
            slot.count.setText('');
        } else {
            slot.icon.setText(emojis[hotbarItem.item] || '?');
            // Only show count for stackable items (not tools)
            if (hotbarItem.type !== 'tool' && hotbarItem.count > 1) {
                slot.count.setText(hotbarItem.count.toString());
            } else {
                slot.count.setText('');
            }
        }
    }
}

/**
 * Set the active hotbar slot (toggles off if same slot pressed again)
 * @param {number} slotIndex - 0-4 for slots 1-5
 */
export function setActiveHotbarSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex > 4) return;

    // Toggle off if pressing same slot
    if (GameState.activeHotbarSlot === slotIndex) {
        GameState.activeHotbarSlot = -1;  // -1 means no slot selected
        GameState.equippedTool = 'none';
        updateHotbarDisplay();
        return;
    }

    GameState.activeHotbarSlot = slotIndex;
    const hotbarItem = GameState.hotbar[slotIndex];

    // Update equipped tool based on active slot
    if (hotbarItem.type === 'tool') {
        GameState.equippedTool = hotbarItem.item;
    } else {
        GameState.equippedTool = 'none';
    }

    updateHotbarDisplay();
}

/**
 * Add an item to the hotbar
 * @param {string} type - 'tool' | 'seed' | 'crop' | 'fruit' | 'fish'
 * @param {string} item - Item type name
 * @param {number} count - Stack count (1 for tools)
 * @returns {boolean} True if item was added
 */
export function addToHotbar(type, item, count = 1) {
    // Find first empty slot
    const emptyIndex = GameState.hotbar.findIndex(slot => slot.type === 'empty');
    if (emptyIndex === -1) return false; // Hotbar full

    GameState.hotbar[emptyIndex] = { type, item, count };
    updateHotbarDisplay();
    return true;
}

/**
 * Remove item from hotbar slot
 * @param {number} slotIndex - 0-4 for slots 1-5
 */
export function removeFromHotbar(slotIndex) {
    if (slotIndex < 0 || slotIndex > 4) return;

    GameState.hotbar[slotIndex] = { type: 'empty', item: null, count: 0 };

    // If this was the active slot, update equipped tool
    if (GameState.activeHotbarSlot === slotIndex) {
        GameState.equippedTool = 'none';
    }

    updateHotbarDisplay();
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

    scene.dialogCloseText = scene.add.text(centerX, bottomY - 10, '[ E or ESC to close ]', {
        fontSize: '11px', fill: '#888'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    // Hotbar UI - 5 slots at bottom of screen
    createHotbarUI(scene);

    // Initial updates (inventory starts hidden, updates when opened)
    updateSeedIndicator();
    updateCoinDisplay();
    updateHotbarDisplay();
}

/**
 * Show character creation screen
 * Layout uses full 1400x900 screen with larger UI elements
 */
export function showCharacterCreation(scene, onComplete) {
    const creationUI = [];
    GameState.creationUI = creationUI;

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Use depth 1000+ to render above all world elements (trees at depth ~500-700)
    const overlay = scene.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.92).setDepth(1000);
    creationUI.push(overlay);

    // Title
    const title = scene.add.text(centerX, 50, '✨ Create Your Character ✨', {
        fontSize: '42px', fill: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1001);
    creationUI.push(title);

    // === LEFT COLUMN: Class Selection (x: 100-350) ===
    const leftX = 220;
    const classLabel = scene.add.text(leftX, 120, 'Choose Class', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(classLabel);

    const classKeys = Object.keys(classes);
    let classButtons = [];

    classKeys.forEach((cls, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = leftX - 85 + col * 170;
        const y = 190 + row * 100;
        const data = classes[cls];

        const btn = scene.add.rectangle(x, y, 150, 85, 0x2C3E50, 0.9)
            .setStrokeStyle(4, GameState.playerClass === cls ? 0xFFD700 : data.color)
            .setDepth(1001).setInteractive();
        creationUI.push(btn);
        classButtons.push({ btn, cls });

        const emoji = scene.add.text(x, y - 18, data.emoji, { fontSize: '32px' }).setOrigin(0.5).setDepth(1002);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 22, cls.toUpperCase(), { fontSize: '14px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1002);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            GameState.playerClass = cls;
            classButtons.forEach(b => b.btn.setStrokeStyle(4, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
            refreshPreview();
        });
        btn.on('pointerover', () => btn.setAlpha(0.8));
        btn.on('pointerout', () => btn.setAlpha(1));
    });

    // === CENTER: Preview & Name (x: 500-900) ===
    const nameLabel = scene.add.text(centerX, 120, 'Your Name', { fontSize: '22px', fill: '#fff' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(nameLabel);

    const nameInput = scene.add.dom(centerX, 165).createFromHTML(`
        <input type="text" id="playerNameInput" value="${GameState.playerName}"
        style="width: 260px; padding: 12px 16px; font-size: 20px; text-align: center;
        border: 3px solid #9B59B6; border-radius: 10px; background: #2C3E50; color: #fff;
        outline: none;">
    `).setDepth(1005);
    creationUI.push(nameInput);

    nameInput.addListener('input');
    nameInput.on('input', (e) => {
        GameState.playerName = e.target.value || 'Adventurer';
    });

    // Preview area background
    const previewBg = scene.add.rectangle(centerX, 350, 280, 280, 0x1a1a2e, 0.6)
        .setStrokeStyle(2, 0x9B59B6).setDepth(1001);
    creationUI.push(previewBg);

    const previewLabel = scene.add.text(centerX, 225, 'Preview', { fontSize: '16px', fill: '#888' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(previewLabel);

    // Character preview (scaled up)
    let previewChar = createWhimsicalCharacter(scene, centerX, 360, GameState.playerClass, false, null, GameState.customization);
    previewChar.setDepth(1005);
    previewChar.setScale(1.8);
    creationUI.push(previewChar);

    // Pet preview
    let previewPet = null;
    function updatePetPreview() {
        if (previewPet) { previewPet.destroy(); previewPet = null; }
        if (GameState.customization.pet !== 'none') {
            previewPet = createPet(scene, centerX + 90, 400, GameState.customization.pet);
            if (previewPet) {
                previewPet.setDepth(1004);
                previewPet.setScale(1.5);
                creationUI.push(previewPet);
            }
        }
    }
    updatePetPreview();

    function refreshPreview() {
        previewChar.destroy();
        previewChar = createWhimsicalCharacter(scene, centerX, 360, GameState.playerClass, false, null, GameState.customization);
        previewChar.setDepth(1005);
        previewChar.setScale(1.8);
        creationUI.push(previewChar);
        updatePetPreview();
    }

    // === RIGHT COLUMN: Appearance (x: 1050-1350) ===
    const rightX = GAME_WIDTH - 220;
    const appearLabel = scene.add.text(rightX, 120, 'Appearance', { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(appearLabel);

    // Body style
    const bodyLabel = scene.add.text(rightX, 170, 'Body Style', { fontSize: '16px', fill: '#aaa' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(bodyLabel);

    const femBtn = scene.add.rectangle(rightX - 65, 210, 110, 40, 0x9B59B6, 0.8).setDepth(1001).setInteractive()
        .setStrokeStyle(3, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
    creationUI.push(femBtn);
    const femText = scene.add.text(rightX - 65, 210, 'Feminine', { fontSize: '15px', fill: '#fff' }).setOrigin(0.5).setDepth(1002);
    creationUI.push(femText);

    const mascBtn = scene.add.rectangle(rightX + 65, 210, 110, 40, 0x3498DB, 0.8).setDepth(1001).setInteractive()
        .setStrokeStyle(3, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
    creationUI.push(mascBtn);
    const mascText = scene.add.text(rightX + 65, 210, 'Masculine', { fontSize: '15px', fill: '#fff' }).setOrigin(0.5).setDepth(1002);
    creationUI.push(mascText);

    femBtn.on('pointerdown', () => {
        GameState.customization.gender = 'female';
        femBtn.setStrokeStyle(3, 0xFFD700);
        mascBtn.setStrokeStyle(3, 0x3498DB);
        refreshPreview();
    });
    mascBtn.on('pointerdown', () => {
        GameState.customization.gender = 'male';
        mascBtn.setStrokeStyle(3, 0xFFD700);
        femBtn.setStrokeStyle(3, 0x9B59B6);
        refreshPreview();
    });

    // Skin tone
    const skinLabel = scene.add.text(rightX, 270, 'Skin Tone', { fontSize: '16px', fill: '#aaa' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(skinLabel);

    const skinButtons = [];
    skinTones.forEach((tone, i) => {
        const x = rightX - 90 + (i % 6) * 36;
        const y = 310;
        const btn = scene.add.circle(x, y, 14, tone).setDepth(1001).setInteractive()
            .setStrokeStyle(3, GameState.customization.skinTone === tone ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        skinButtons.push({ btn, tone });
        btn.on('pointerdown', () => {
            GameState.customization.skinTone = tone;
            skinButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
            refreshPreview();
        });
    });

    // Hair color
    const hairLabel = scene.add.text(rightX, 360, 'Hair Color', { fontSize: '16px', fill: '#aaa' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(hairLabel);

    const hairButtons = [];
    hairColors.forEach((color, i) => {
        const x = rightX - 90 + (i % 5) * 45;
        const y = 400 + Math.floor(i / 5) * 40;
        const btn = scene.add.circle(x, y, 14, color).setDepth(1001).setInteractive()
            .setStrokeStyle(3, GameState.customization.hairColor === color ? 0xFFD700 : 0x333333);
        creationUI.push(btn);
        hairButtons.push({ btn, color });
        btn.on('pointerdown', () => {
            GameState.customization.hairColor = color;
            hairButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
            refreshPreview();
        });
    });

    // === BOTTOM LEFT: Pets (aligned with class column) ===
    const petLabel = scene.add.text(leftX, 530, 'Pet Companion', { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(petLabel);

    const petKeys = Object.keys(petTypes);
    let petButtons = [];

    petKeys.forEach((pet, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = leftX - 110 + col * 110;
        const y = 600 + row * 90;
        const data = petTypes[pet];

        const btn = scene.add.rectangle(x, y, 95, 75, 0x2C3E50, 0.9)
            .setStrokeStyle(3, GameState.customization.pet === pet ? 0xFFD700 : data.color)
            .setDepth(1001).setInteractive();
        creationUI.push(btn);
        petButtons.push({ btn, pet });

        const emoji = scene.add.text(x, y - 12, data.emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(1002);
        creationUI.push(emoji);

        const name = scene.add.text(x, y + 24, data.name, { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(1002);
        creationUI.push(name);

        btn.on('pointerdown', () => {
            GameState.customization.pet = pet;
            petButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
            updatePetPreview();
        });
        btn.on('pointerover', () => btn.setAlpha(0.8));
        btn.on('pointerout', () => btn.setAlpha(1));
    });

    // === BOTTOM CENTER: Character Profiles (6 slots in 2x3 grid) ===
    const presetLabel = scene.add.text(centerX, 530, 'Character Profiles', { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(presetLabel);

    for (let i = 0; i < 6; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = centerX - 130 + col * 130;
        const y = 600 + row * 85;
        const preset = GameState.characterPresets[i];

        const slotBtn = scene.add.rectangle(x, y, 115, 70, preset ? 0x2C3E50 : 0x1a1a2e, 0.9)
            .setStrokeStyle(3, preset ? 0x27AE60 : 0x444444).setDepth(1001).setInteractive();
        creationUI.push(slotBtn);

        if (preset) {
            // Class emoji centered at top of slot
            const emoji = scene.add.text(x, y - 15, classes[preset.class]?.emoji || '?', { fontSize: '24px' }).setOrigin(0.5).setDepth(1002);
            creationUI.push(emoji);
            // Name centered below emoji, truncated to 8 chars
            const displayName = preset.name.length > 8 ? preset.name.substring(0, 8) : preset.name;
            const pname = scene.add.text(x, y + 15, displayName, { fontSize: '13px', fill: '#fff' }).setOrigin(0.5).setDepth(1002);
            creationUI.push(pname);

            // Delete button centered below slot (smaller)
            const delBtn = scene.add.rectangle(x, y + 48, 50, 18, 0xC0392B, 0.8)
                .setStrokeStyle(1, 0xE74C3C).setDepth(1003).setInteractive();
            creationUI.push(delBtn);
            const delX = scene.add.text(x, y + 48, '🗑 delete', { fontSize: '10px', fill: '#fff' }).setOrigin(0.5).setDepth(1004);
            creationUI.push(delX);

            delBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                deletePreset(i);
                creationUI.forEach(obj => obj.destroy());
                showCharacterCreation(scene, onComplete);
            });
            delBtn.on('pointerover', () => delBtn.setFillStyle(0xE74C3C, 1));
            delBtn.on('pointerout', () => delBtn.setFillStyle(0xC0392B, 0.8));

            slotBtn.on('pointerdown', () => {
                loadPreset(i);
                classButtons.forEach(b => b.btn.setStrokeStyle(4, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
                petButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
                skinButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
                hairButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
                femBtn.setStrokeStyle(3, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
                mascBtn.setStrokeStyle(3, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
                document.getElementById('playerNameInput').value = GameState.playerName;
                refreshPreview();
            });
        } else {
            const plus = scene.add.text(x, y - 8, '💾', { fontSize: '22px' }).setOrigin(0.5).setDepth(1002);
            creationUI.push(plus);
            const saveLabel = scene.add.text(x, y + 18, 'Save Slot', { fontSize: '11px', fill: '#666' }).setOrigin(0.5).setDepth(1002);
            creationUI.push(saveLabel);

            slotBtn.on('pointerdown', () => {
                saveCurrentAsPreset(i);
                creationUI.forEach(obj => obj.destroy());
                showCharacterCreation(scene, onComplete);
            });
        }
        slotBtn.on('pointerover', () => slotBtn.setAlpha(0.8));
        slotBtn.on('pointerout', () => slotBtn.setAlpha(1));
    }

    // === BOTTOM RIGHT: Actions ===
    // Randomize button
    const randomBtn = scene.add.rectangle(rightX, 560, 180, 50, 0xE67E22, 0.9).setDepth(1001).setInteractive().setStrokeStyle(3, 0xF39C12);
    creationUI.push(randomBtn);
    const randomText = scene.add.text(rightX, 560, '🎲 Randomize', { fontSize: '18px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1002);
    creationUI.push(randomText);

    randomBtn.on('pointerdown', () => {
        GameState.playerClass = classKeys[Math.floor(Math.random() * classKeys.length)];
        GameState.customization.skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
        GameState.customization.hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        GameState.customization.gender = Math.random() > 0.5 ? 'female' : 'male';
        const petOptions = petKeys.filter(p => p !== 'none');
        GameState.customization.pet = petOptions[Math.floor(Math.random() * petOptions.length)];

        classButtons.forEach(b => b.btn.setStrokeStyle(4, GameState.playerClass === b.cls ? 0xFFD700 : classes[b.cls].color));
        petButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.pet === b.pet ? 0xFFD700 : petTypes[b.pet].color));
        skinButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.skinTone === b.tone ? 0xFFD700 : 0x333333));
        hairButtons.forEach(b => b.btn.setStrokeStyle(3, GameState.customization.hairColor === b.color ? 0xFFD700 : 0x333333));
        femBtn.setStrokeStyle(3, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
        mascBtn.setStrokeStyle(3, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
        refreshPreview();
    });
    randomBtn.on('pointerover', () => randomBtn.setAlpha(0.8));
    randomBtn.on('pointerout', () => randomBtn.setAlpha(1));

    // Play button
    const playBtn = scene.add.rectangle(rightX, 640, 220, 70, 0x27AE60, 1).setDepth(1001).setInteractive().setStrokeStyle(4, 0x2ECC71);
    creationUI.push(playBtn);
    const playText = scene.add.text(rightX, 640, '▶ START GAME', { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1002);
    creationUI.push(playText);

    playBtn.on('pointerdown', () => {
        creationUI.forEach(obj => obj.destroy());
        GameState.creationUI = [];
        if (onComplete) onComplete();
    });
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ECC71, 1));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27AE60, 1));

    // Hint text at bottom
    const hintText = scene.add.text(rightX, 720, 'Click a saved profile to load it', { fontSize: '12px', fill: '#666' }).setOrigin(0.5).setDepth(1001);
    creationUI.push(hintText);
}

/**
 * Show pause menu with options
 * @param {Function} onChangeCharacter - Callback when user wants to change character
 */
export function showPauseMenu(onChangeCharacter) {
    const scene = GameState.scene;
    if (!scene || GameState.pauseMenuOpen) return;

    GameState.pauseMenuOpen = true;
    GameState.pauseMenuUI = [];

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Overlay
    const overlay = scene.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(300);
    GameState.pauseMenuUI.push(overlay);

    // Menu panel
    const panel = scene.add.rectangle(centerX, centerY, 350, 280, 0x1a1a2e, 0.95)
        .setStrokeStyle(3, 0x9B59B6).setDepth(301);
    GameState.pauseMenuUI.push(panel);

    // Title
    const title = scene.add.text(centerX, centerY - 100, '⏸ PAUSED', {
        fontSize: '28px', fill: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    GameState.pauseMenuUI.push(title);

    // Continue button
    const continueBtn = scene.add.rectangle(centerX, centerY - 20, 220, 50, 0x27AE60, 0.9)
        .setStrokeStyle(3, 0x2ECC71).setDepth(301).setInteractive();
    GameState.pauseMenuUI.push(continueBtn);
    const continueText = scene.add.text(centerX, centerY - 20, '▶ Continue', {
        fontSize: '18px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    GameState.pauseMenuUI.push(continueText);

    continueBtn.on('pointerdown', () => closePauseMenu());
    continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x2ECC71, 1));
    continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x27AE60, 0.9));

    // Change Character button
    const changeBtn = scene.add.rectangle(centerX, centerY + 50, 220, 50, 0xE67E22, 0.9)
        .setStrokeStyle(3, 0xF39C12).setDepth(301).setInteractive();
    GameState.pauseMenuUI.push(changeBtn);
    const changeText = scene.add.text(centerX, centerY + 50, '👤 Change Character', {
        fontSize: '16px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    GameState.pauseMenuUI.push(changeText);

    changeBtn.on('pointerdown', () => {
        closePauseMenu();
        if (onChangeCharacter) onChangeCharacter();
    });
    changeBtn.on('pointerover', () => changeBtn.setFillStyle(0xF39C12, 1));
    changeBtn.on('pointerout', () => changeBtn.setFillStyle(0xE67E22, 0.9));

    // Hint text
    const hint = scene.add.text(centerX, centerY + 110, '[ ESC to close ]', {
        fontSize: '12px', fill: '#666'
    }).setOrigin(0.5).setDepth(302);
    GameState.pauseMenuUI.push(hint);
}

/**
 * Close pause menu
 */
export function closePauseMenu() {
    GameState.pauseMenuUI.forEach(obj => obj.destroy());
    GameState.pauseMenuUI = [];
    GameState.pauseMenuOpen = false;
}
