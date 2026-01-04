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
