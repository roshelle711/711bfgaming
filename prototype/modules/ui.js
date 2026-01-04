/**
 * ui.js - Dialogs, menus, character creation, HUD
 *
 * Exports:
 * - showDialog(message): Show dialog box with message
 * - closeDialog(): Close current dialog
 * - showCharacterCreation(scene, onComplete): Show character creation screen
 * - updateInventoryDisplay(): Update inventory HUD
 * - updateSeedIndicator(): Update seed selection HUD
 * - updateCoinDisplay(): Update coin HUD
 * - setupUI(scene): Initialize all UI elements
 */

import { classes, petTypes, skinTones, hairColors, seedTypes } from './config.js';
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
    GameState.dialogBox.setPosition(600, 800 - boxHeight/2 - 20);
    GameState.dialogText.setPosition(600, 800 - boxHeight/2 - 30);
    scene.dialogCloseText.setPosition(600, 800 - 35);

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
 * Update the inventory display HUD
 */
export function updateInventoryDisplay() {
    if (!GameState.inventoryDisplay) return;
    const inv = GameState.inventory;
    let text = '📦 INVENTORY\n';
    text += `🌱 ${inv.seeds.carrot}/${inv.seeds.tomato}/${inv.seeds.flower}\n`;
    text += `🥕 ${inv.crops.carrot} 🍅 ${inv.crops.tomato} 🌸 ${inv.crops.flower}\n`;
    text += `🐟 ${inv.fish.bass} 🐠 ${inv.fish.salmon} ✨ ${inv.fish.goldfish}\n`;
    text += `📦 Crafted: ${inv.crafted.salad + inv.crafted.bouquet + inv.crafted.fishStew + inv.crafted.magicPotion}`;
    GameState.inventoryDisplay.setText(text);
}

/**
 * Update the seed indicator HUD
 */
export function updateSeedIndicator() {
    if (!GameState.seedIndicator) return;
    const emoji = { carrot: '🥕', tomato: '🍅', flower: '🌸' };
    const seed = seedTypes[GameState.currentSeedIndex];
    GameState.seedIndicator.setText(`Plant: ${emoji[seed]} (${GameState.inventory.seeds[seed]})`);
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

    // Inventory display (top right)
    GameState.inventoryDisplay = scene.add.text(1190, 10, '', {
        fontSize: '13px', fill: '#fff', backgroundColor: '#00000099',
        padding: { x: 8, y: 6 }, lineSpacing: 4
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    // Seed indicator
    GameState.seedIndicator = scene.add.text(1190, 130, '', {
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
    GameState.dayOverlay = scene.add.rectangle(600, 400, 1200, 800, 0x0a0a23, 0).setDepth(50);

    // Prompts
    GameState.interactPrompt = scene.add.text(600, 750, '🔵 Press E to interact', {
        fontSize: '16px', fill: '#FFD700', fontStyle: 'bold', backgroundColor: '#00000099', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    GameState.farmPrompt = scene.add.text(600, 720, '', {
        fontSize: '14px', fill: '#90EE90', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    GameState.fishingPrompt = scene.add.text(600, 680, '', {
        fontSize: '14px', fill: '#87CEEB', backgroundColor: '#00000099', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Dialog box
    GameState.dialogBox = scene.add.rectangle(600, 750, 600, 100, 0x2C3E50, 0.95)
        .setStrokeStyle(3, 0x9B59B6).setDepth(150).setVisible(false);

    GameState.dialogText = scene.add.text(600, 730, '', {
        fontSize: '14px', fill: '#fff', wordWrap: { width: 560 }, lineSpacing: 6, align: 'center'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    scene.dialogCloseText = scene.add.text(600, 790, '[ Press E to close ]', {
        fontSize: '11px', fill: '#888'
    }).setOrigin(0.5).setDepth(151).setVisible(false);

    // Initial updates
    updateInventoryDisplay();
    updateSeedIndicator();
    updateCoinDisplay();
}

/**
 * Show character creation screen
 */
export function showCharacterCreation(scene, onComplete) {
    const creationUI = [];
    GameState.creationUI = creationUI;

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
    const nameLabel = scene.add.text(600, 80, 'Your Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(nameLabel);

    const nameInput = scene.add.dom(600, 115).createFromHTML(`
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
    let previewChar = createWhimsicalCharacter(scene, 600, 280, GameState.playerClass, false, null, GameState.customization);
    previewChar.setDepth(205);
    creationUI.push(previewChar);

    // Pet preview
    let previewPet = null;
    function updatePetPreview() {
        if (previewPet) { previewPet.destroy(); previewPet = null; }
        if (GameState.customization.pet !== 'none') {
            previewPet = createPet(scene, 660, 290, GameState.customization.pet);
            if (previewPet) {
                previewPet.setDepth(204);
                creationUI.push(previewPet);
            }
        }
    }
    updatePetPreview();

    function refreshPreview() {
        previewChar.destroy();
        previewChar = createWhimsicalCharacter(scene, 600, 280, GameState.playerClass, false, null, GameState.customization);
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
        .setStrokeStyle(2, GameState.customization.gender === 'female' ? 0xFFD700 : 0x9B59B6);
    creationUI.push(femBtn);
    const femText = scene.add.text(960, 145, 'Feminine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
    creationUI.push(femText);

    const mascBtn = scene.add.rectangle(1040, 145, 70, 30, 0x3498DB, 0.8).setDepth(201).setInteractive()
        .setStrokeStyle(2, GameState.customization.gender === 'male' ? 0xFFD700 : 0x3498DB);
    creationUI.push(mascBtn);
    const mascText = scene.add.text(1040, 145, 'Masculine', { fontSize: '11px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
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
    const skinLabel = scene.add.text(1000, 180, 'Skin', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(skinLabel);

    const skinButtons = [];
    skinTones.forEach((tone, i) => {
        const x = 925 + (i % 6) * 25;
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
    const hairLabel = scene.add.text(1000, 235, 'Hair', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5).setDepth(201);
    creationUI.push(hairLabel);

    const hairButtons = [];
    hairColors.forEach((color, i) => {
        const x = 925 + (i % 5) * 25;
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
    const presetLabel = scene.add.text(600, 380, 'Quick Start Presets', { fontSize: '14px', fill: '#fff' }).setOrigin(0.5).setDepth(201);
    creationUI.push(presetLabel);

    for (let i = 0; i < 3; i++) {
        const x = 500 + i * 100;
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
    const randomBtn = scene.add.rectangle(1000, 400, 120, 35, 0xE67E22, 0.9).setDepth(201).setInteractive().setStrokeStyle(2, 0xF39C12);
    creationUI.push(randomBtn);
    const randomText = scene.add.text(1000, 400, '🎲 Randomize', { fontSize: '13px', fill: '#fff' }).setOrigin(0.5).setDepth(202);
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
    const playBtn = scene.add.rectangle(1000, 460, 150, 50, 0x27AE60, 1).setDepth(201).setInteractive().setStrokeStyle(3, 0x2ECC71);
    creationUI.push(playBtn);
    const playText = scene.add.text(1000, 460, '▶ START GAME', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202);
    creationUI.push(playText);

    playBtn.on('pointerdown', () => {
        creationUI.forEach(obj => obj.destroy());
        GameState.creationUI = [];
        if (onComplete) onComplete();
    });
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x2ECC71, 1));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x27AE60, 1));
}
