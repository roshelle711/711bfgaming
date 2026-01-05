/**
 * player.js - Character creation, pet creation, movement
 *
 * Exports:
 * - createWhimsicalCharacter(scene, x, y, classType, isNPC, npcStyle, charCustom)
 * - createPet(scene, x, y, petType)
 * - updatePlayerMovement(delta): Handle player input and movement
 * - updatePetFollow(delta): Pet following behavior
 * - updatePlayerSparkles(time): Animate player sparkles
 */

import { classes, petTypes, skinTones, baseSpeed, maxSpeed, acceleration, deceleration } from './config.js';
import { GameState } from './state.js';
import { lerp } from './utils.js';

// Tool graphics containers (created once, reused)
let toolGraphics = null;

/**
 * Create a whimsical character sprite
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} classType - Character class (druid, shaman, warrior, mage, priest, hunter)
 * @param {boolean} isNPC - Is this an NPC (disables sparkles, world bounds)
 * @param {object} npcStyle - NPC styling overrides {body, accent, skin, hair, accessory}
 * @param {object} charCustom - Character customization {skinTone, hairColor, gender}
 * @returns {Phaser.GameObjects.Container} Character container with physics body
 */
export function createWhimsicalCharacter(scene, x, y, classType, isNPC = false, npcStyle = null, charCustom = null) {
    const container = scene.add.container(x, y);
    const cls = classes[classType] || classes.mage;
    const isFemale = charCustom?.gender === 'female' || (!isNPC && GameState.customization.gender === 'female');

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

    const skinTone = charCustom?.skinTone || (isNPC ? (npcStyle?.skin || skinTones[2]) : GameState.customization.skinTone);
    container.add(scene.add.circle(0, -20, 18, skinTone));
    container.add(scene.add.ellipse(-10, -15, 6, 4, 0xFFB6C1, 0.6));
    container.add(scene.add.ellipse(10, -15, 6, 4, 0xFFB6C1, 0.6));

    const hairColor = charCustom?.hairColor || (isNPC ? (npcStyle?.hair || 0x8B4513) : GameState.customization.hairColor);

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

/**
 * Create a pet companion
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} petType - Pet type (cat, dog, bunny, bird, fox, none)
 * @returns {Phaser.GameObjects.Container|null} Pet container or null if 'none'
 */
export function createPet(scene, x, y, petType) {
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

/**
 * Update player movement based on input
 * Call this in the update loop
 */
export function updatePlayerMovement() {
    const player = GameState.player;
    if (!player || GameState.isDialogOpen || GameState.isFishing) return;

    const cursors = GameState.cursors;
    const wasd = GameState.wasd;

    // Guard against uninitialized input
    // Note: cursors uses .left/.right/.up/.down, wasd uses .A/.D/.W/.S
    if (!cursors || !wasd || !cursors.left || !wasd.A) return;

    // Get input direction
    GameState.moveDirection.x = 0;
    GameState.moveDirection.y = 0;

    if (cursors.left.isDown || wasd.A.isDown) GameState.moveDirection.x = -1;
    else if (cursors.right.isDown || wasd.D.isDown) GameState.moveDirection.x = 1;

    if (cursors.up.isDown || wasd.W.isDown) GameState.moveDirection.y = -1;
    else if (cursors.down.isDown || wasd.S.isDown) GameState.moveDirection.y = 1;

    // Normalize diagonal movement
    if (GameState.moveDirection.x !== 0 && GameState.moveDirection.y !== 0) {
        const diag = 0.707;
        GameState.moveDirection.x *= diag;
        GameState.moveDirection.y *= diag;
    }

    // Smooth acceleration/deceleration
    if (GameState.moveDirection.x !== 0 || GameState.moveDirection.y !== 0) {
        GameState.currentSpeed = Math.min(GameState.currentSpeed + acceleration, maxSpeed);
    } else {
        GameState.currentSpeed = Math.max(GameState.currentSpeed - deceleration, 0);
    }

    // Calculate target velocity
    GameState.targetVelocity.x = GameState.moveDirection.x * GameState.currentSpeed;
    GameState.targetVelocity.y = GameState.moveDirection.y * GameState.currentSpeed;

    // Smooth interpolation
    const lerpFactor = 0.2;
    player.body.velocity.x = lerp(player.body.velocity.x, GameState.targetVelocity.x, lerpFactor);
    player.body.velocity.y = lerp(player.body.velocity.y, GameState.targetVelocity.y, lerpFactor);
}

/**
 * Update pet following behavior
 * Call this in the update loop
 */
export function updatePetFollow() {
    const pet = GameState.playerPet;
    const player = GameState.player;
    if (!pet || !player) return;

    const dx = player.x - pet.x;
    const dy = player.y - pet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 50) {
        const speed = Math.min(dist * 2, 180);
        pet.x += (dx / dist) * speed * 0.016;
        pet.y += (dy / dist) * speed * 0.016;
    }
}

/**
 * Animate player sparkles
 * @param {number} time - Game time in ms
 */
export function updatePlayerSparkles(time) {
    const player = GameState.player;
    if (!player || !player.sparkles) return;

    player.sparkles.forEach((sparkle, i) => {
        const t = time * 0.003 + sparkle.sparkleOffset;
        sparkle.alpha = 0.3 + Math.sin(t) * 0.4;
        sparkle.x = -15 + Math.sin(t + i) * 30;
        sparkle.y = -35 + Math.cos(t * 0.7 + i) * 20;
    });
}

/**
 * Create tool graphics container for player
 * @param {Phaser.Scene} scene - Phaser scene
 */
export function createToolGraphics(scene) {
    if (toolGraphics) return toolGraphics;

    toolGraphics = scene.add.graphics();
    toolGraphics.setDepth(1000); // Above player
    return toolGraphics;
}

/**
 * Draw the currently equipped tool
 * Call this in the update loop after player position is set
 */
export function updateHeldTool() {
    if (!toolGraphics || !GameState.player) return;

    toolGraphics.clear();

    const tool = GameState.equippedTool;
    if (tool === 'none') return;

    const px = GameState.player.x;
    const py = GameState.player.y;

    // Offset for hand position (right side of character)
    const toolX = px + 18;
    const toolY = py - 5;

    if (tool === 'hoe') {
        // Hoe: wooden handle + metal blade
        toolGraphics.fillStyle(0x8B4513, 1); // Brown handle
        toolGraphics.fillRect(toolX, toolY - 20, 4, 30);
        toolGraphics.fillStyle(0x696969, 1); // Gray metal blade
        toolGraphics.fillRect(toolX - 6, toolY - 22, 16, 5);
        toolGraphics.fillStyle(0x505050, 1); // Darker edge
        toolGraphics.fillRect(toolX - 6, toolY - 18, 16, 2);
    } else if (tool === 'wateringCan') {
        // Watering can: body + spout + handle
        toolGraphics.fillStyle(0x4682B4, 1); // Steel blue
        toolGraphics.fillEllipse(toolX, toolY, 16, 12); // Body
        toolGraphics.fillRect(toolX + 6, toolY - 10, 10, 4); // Spout
        toolGraphics.fillStyle(0x5F9EA0, 1); // Lighter shade
        toolGraphics.fillEllipse(toolX, toolY - 2, 10, 6); // Highlight
        // Handle
        toolGraphics.lineStyle(3, 0x4682B4, 1);
        toolGraphics.beginPath();
        toolGraphics.arc(toolX - 8, toolY - 8, 6, 0, Math.PI, true);
        toolGraphics.strokePath();
        // Water droplets from spout (when watering)
        if (GameState.isWatering) {
            toolGraphics.fillStyle(0x87CEEB, 0.8);
            for (let i = 0; i < 3; i++) {
                toolGraphics.fillCircle(toolX + 18 + i * 3, toolY - 8 + i * 4, 2);
            }
        }
    } else if (tool === 'fishingRod') {
        // Fishing rod: long pole + reel + line
        // Determine if player is right of pond center (pond at x=180)
        const pondCenterX = 180;
        const facingLeft = px > pondCenterX + 50; // If right of pond, face left toward water
        const dir = facingLeft ? -1 : 1;
        const rodX = facingLeft ? px - 18 : px + 18; // Flip rod position when facing left

        toolGraphics.fillStyle(0x8B4513, 1); // Brown pole
        toolGraphics.fillRect(rodX, toolY - 35, 3, 45); // Main pole
        toolGraphics.fillStyle(0x654321, 1); // Darker tip
        toolGraphics.fillRect(rodX, toolY - 40, 2, 8);
        // Reel
        toolGraphics.fillStyle(0x696969, 1);
        toolGraphics.fillCircle(rodX + 1, toolY + 5, 5);
        toolGraphics.fillStyle(0x505050, 1);
        toolGraphics.fillCircle(rodX + 1, toolY + 5, 3);
        // Line (when fishing)
        if (GameState.isFishing) {
            const lineEndX = rodX + dir * 35; // Line extends toward pond
            const lineEndY = toolY + 20;
            toolGraphics.lineStyle(1, 0xAAAAAA, 0.8);
            toolGraphics.lineBetween(rodX + 1, toolY - 40, lineEndX, lineEndY);
            // Bobber
            toolGraphics.fillStyle(0xFF6347, 1);
            toolGraphics.fillCircle(lineEndX, lineEndY + 2, 5);
            toolGraphics.fillStyle(0xFFFFFF, 1);
            toolGraphics.fillCircle(lineEndX, lineEndY + 4, 2);
        }
    }
}

// Action animation graphics (particles, effects)
let actionGraphics = null;

/**
 * Initialize action animation graphics
 */
export function initActionAnimations(scene) {
    actionGraphics = scene.add.graphics();
    actionGraphics.setDepth(1001); // Above tools
}

/**
 * Update action animations - call in game update loop
 * Renders particle effects for actions
 */
export function updateActionAnimations(delta) {
    if (!actionGraphics || !GameState.player) return;

    actionGraphics.clear();
    const px = GameState.player.x;
    const py = GameState.player.y;

    // Update animation timer
    if (GameState.isHoeing || GameState.isPlanting || GameState.isHarvesting ||
        GameState.isRemoving || GameState.isWatering) {
        GameState.actionAnimTimer = Math.min(1, GameState.actionAnimTimer + delta / 300);
    } else {
        GameState.actionAnimTimer = 0;
    }

    const t = GameState.actionAnimTimer;

    // HOEING: Dirt particles flying up (offset to the right of player)
    if (GameState.isHoeing) {
        const offsetX = 30; // Offset from player center
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const spread = 20 + i * 10;
            const height = 35 * t * (1 - t * 0.5);
            const angle = (i / numParticles) * Math.PI - Math.PI / 2;
            const dx = Math.cos(angle) * spread * t;
            const dy = -height + Math.sin(angle) * 8;
            actionGraphics.fillStyle(0x8B4513, 0.9 - t * 0.5);
            actionGraphics.fillCircle(px + offsetX + dx, py + 20 + dy, 3 + Math.random() * 2);
        }
        // Dust cloud
        actionGraphics.fillStyle(0xD2B48C, 0.5 * (1 - t));
        actionGraphics.fillEllipse(px + offsetX, py + 30, 45 * t, 15);
    }

    // PLANTING: Seed dropping + sparkles (offset forward)
    if (GameState.isPlanting) {
        const offsetX = 25;
        // Falling seed
        const seedY = py - 15 + t * 45;
        actionGraphics.fillStyle(0x228B22, 1);
        actionGraphics.fillCircle(px + offsetX, seedY, 5);
        actionGraphics.fillStyle(0x90EE90, 0.8);
        actionGraphics.fillCircle(px + offsetX - 1, seedY - 1, 2);
        // Green sparkles around plot
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 4;
            const dist = 18 + t * 12;
            actionGraphics.fillStyle(0x90EE90, 0.9 * (1 - t * 0.7));
            actionGraphics.fillCircle(
                px + offsetX + Math.cos(angle) * dist,
                py + 25 + Math.sin(angle) * dist * 0.5,
                3 + Math.random()
            );
        }
        // Ground glow
        actionGraphics.fillStyle(0x228B22, 0.3 * (1 - t));
        actionGraphics.fillEllipse(px + offsetX, py + 30, 35, 12);
    }

    // HARVESTING: Crop rising + sparkles (offset forward)
    if (GameState.isHarvesting) {
        const offsetX = 25;
        // Rising crop icon
        const cropY = py + 20 - t * 45;
        actionGraphics.fillStyle(0xFFD700, 1);
        actionGraphics.fillCircle(px + offsetX, cropY, 8);
        actionGraphics.fillStyle(0xFFF8DC, 0.9);
        actionGraphics.fillCircle(px + offsetX - 2, cropY - 2, 3);
        // Golden sparkles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + t * 6;
            const dist = 25 * t;
            actionGraphics.fillStyle(0xFFD700, 0.9 * (1 - t * 0.6));
            actionGraphics.fillCircle(
                px + offsetX + Math.cos(angle) * dist,
                cropY + Math.sin(angle) * dist * 0.4,
                3 + t * 3
            );
        }
        // Burst effect
        actionGraphics.fillStyle(0xFFD700, 0.4 * (1 - t));
        actionGraphics.fillCircle(px + offsetX, py + 20, 30 * t);
    }

    // REMOVING (weeds/bugs): Debris scattering (offset forward)
    if (GameState.isRemoving) {
        const offsetX = 25;
        // Debris flying away
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 3;
            const dist = 35 * t;
            const debrisY = py + 20 - t * 25;
            actionGraphics.fillStyle(i % 2 === 0 ? 0x228B22 : 0x8B4513, 0.9 * (1 - t * 0.7));
            actionGraphics.fillCircle(
                px + offsetX + Math.cos(angle) * dist,
                debrisY + Math.sin(angle) * 10,
                3 + Math.random() * 2
            );
        }
        // Poof cloud
        actionGraphics.fillStyle(0xD2B48C, 0.4 * (1 - t));
        actionGraphics.fillCircle(px + offsetX, py + 20, 25 * t);
    }

    // WATERING: Enhanced water arc (offset forward)
    if (GameState.isWatering) {
        const offsetX = 20;
        const numDrops = 12;
        for (let i = 0; i < numDrops; i++) {
            const dropT = (t + i * 0.08) % 1;
            const arc = Math.sin(dropT * Math.PI);
            const dx = offsetX + dropT * 35;
            const dy = -arc * 30 + dropT * 20;
            actionGraphics.fillStyle(0x87CEEB, 0.8 * (1 - dropT * 0.4));
            actionGraphics.fillCircle(px + dx, py + dy, 3 + arc * 2);
        }
        // Splash at landing
        if (t > 0.4) {
            const splashT = (t - 0.4) / 0.6;
            actionGraphics.fillStyle(0x87CEEB, 0.5 * (1 - splashT));
            actionGraphics.fillEllipse(px + offsetX + 35, py + 25, 25 * splashT, 10 * splashT);
            // Splash droplets
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI - Math.PI / 2;
                actionGraphics.fillCircle(
                    px + offsetX + 35 + Math.cos(angle) * 15 * splashT,
                    py + 25 - Math.sin(angle) * 12 * splashT,
                    2
                );
            }
        }
    }
}

/**
 * Equip a tool
 * @param {string} toolType - 'hoe', 'wateringCan', or 'none'
 */
export function equipTool(toolType) {
    GameState.equippedTool = toolType;
}

/**
 * Unequip the current tool
 */
export function unequipTool() {
    GameState.equippedTool = 'none';
}
