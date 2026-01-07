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

import { classes, petTypes, skinTones, baseSpeed, maxSpeed, acceleration, deceleration, DEPTH_LAYERS, getWorldDepth, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { GameState, saveGameSession } from './state.js';
import { lerp } from './utils.js';
import { removeHazard } from './systems.js';
import { updateInventoryDisplay } from './ui.js';

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

    // Shadow - separate from container so it can have independent depth
    // For player, shadow is stored externally and updated in movement
    // For NPCs, shadow stays in container (simpler, less critical)
    if (isNPC) {
        const shadow = scene.add.ellipse(0, 28, 30, 10, 0x000000, 0.25);
        container.add(shadow);
        container.shadow = shadow;
    } else {
        // Player shadow: external object with Y-based depth (slightly behind player)
        const shadow = scene.add.ellipse(x, y + 28, 30, 10, 0x000000, 0.25);
        // Shadow at foot position depth but with -1 sublayer to render behind player
        shadow.setDepth(getWorldDepth(y + 28, -1));
        container.externalShadow = shadow;
        console.log(`[Shadow] Created at Y=${y + 28}, depth=${getWorldDepth(y + 28, -1)}`);
    }

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
        // Dress body (no triangle bottom)
        container.add(scene.add.ellipse(0, -2, 28, 14, bodyColor));
        container.add(scene.add.ellipse(0, 8, 20, 14, bodyColor));
        container.add(scene.add.ellipse(0, 18, 24, 14, bodyColor));  // Rounded bottom instead of triangle
        const accentColor = isNPC ? (npcStyle?.accent || 0xF39C12) : cls.accent;
        // Belt/ribbon detail
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
            // Wizard hat - smaller, more proportional
            container.add(scene.add.triangle(0, -50, -10, 12, 0, -14, 10, 12, 0x3498DB));
            container.add(scene.add.ellipse(0, -40, 26, 6, 0x2980B9));  // Hat brim
            container.add(scene.add.circle(0, -52, 3, 0xF1C40F));  // Star on tip
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

    // Darken color helper for shading - proper per-channel RGB subtraction
    const darken = (color, amount = 0x22) => {
        const r = Math.max(0, ((color >> 16) & 0xFF) - amount);
        const g = Math.max(0, ((color >> 8) & 0xFF) - amount);
        const b = Math.max(0, (color & 0xFF) - amount);
        return (r << 16) | (g << 8) | b;
    };

    if (petType === 'cat') {
        // Body with shading
        container.add(scene.add.ellipse(0, 5, 20, 16, darken(pet.color)));  // Shadow layer
        container.add(scene.add.ellipse(-2, 4, 18, 14, pet.color));  // Main body
        // Head with shading
        container.add(scene.add.circle(0, -6, 12, darken(pet.color)));
        container.add(scene.add.circle(-1, -7, 11, pet.color));
        // Ears
        container.add(scene.add.triangle(-7, -16, 0, 8, 4, 0, 8, 8, pet.color));
        container.add(scene.add.triangle(7, -16, 0, 8, 4, 0, 8, 8, pet.color));
        container.add(scene.add.triangle(-7, -14, 0, 5, 2, 0, 4, 5, 0xFFB6C1));
        container.add(scene.add.triangle(7, -14, 0, 5, 2, 0, 4, 5, 0xFFB6C1));
        // Eyes
        container.add(scene.add.ellipse(-4, -7, 5, 6, 0x90EE90));
        container.add(scene.add.ellipse(4, -7, 5, 6, 0x90EE90));
        container.add(scene.add.ellipse(-4, -7, 2, 4, 0x000000));
        container.add(scene.add.ellipse(4, -7, 2, 4, 0x000000));
        container.add(scene.add.circle(-5, -8, 1.5, 0xFFFFFF));
        container.add(scene.add.circle(3, -8, 1.5, 0xFFFFFF));
        // Nose
        container.add(scene.add.triangle(0, -3, -2, 3, 0, 0, 2, 3, 0xFFB6C1));
        // Tail with shading
        container.add(scene.add.ellipse(12, 2, 5, 14, darken(pet.color)));
        container.add(scene.add.ellipse(11, 1, 4, 12, pet.color));
    } else if (petType === 'dog') {
        // Body with shading
        container.add(scene.add.ellipse(0, 6, 22, 16, darken(pet.color)));
        container.add(scene.add.ellipse(-1, 5, 20, 14, pet.color));
        // Belly patch
        container.add(scene.add.ellipse(0, 8, 12, 8, pet.accent));
        // Head with shading
        container.add(scene.add.circle(0, -6, 13, darken(pet.color)));
        container.add(scene.add.circle(-1, -7, 12, pet.color));
        // Snout
        container.add(scene.add.ellipse(0, -2, 8, 5, pet.accent));
        // Floppy ears
        container.add(scene.add.ellipse(-11, -2, 6, 11, darken(pet.color)));
        container.add(scene.add.ellipse(-10, -3, 5, 10, pet.color));
        container.add(scene.add.ellipse(11, -2, 6, 11, darken(pet.color)));
        container.add(scene.add.ellipse(10, -3, 5, 10, pet.color));
        // Eyes
        container.add(scene.add.circle(-5, -9, 4, 0xFFFFFF));
        container.add(scene.add.circle(5, -9, 4, 0xFFFFFF));
        container.add(scene.add.circle(-5, -9, 2.5, 0x4A3728));
        container.add(scene.add.circle(5, -9, 2.5, 0x4A3728));
        container.add(scene.add.circle(-6, -10, 1, 0xFFFFFF));
        container.add(scene.add.circle(4, -10, 1, 0xFFFFFF));
        // Nose
        container.add(scene.add.ellipse(0, -1, 4, 3, 0x000000));
        // Tail
        container.add(scene.add.ellipse(14, 0, 5, 10, pet.color));
    } else if (petType === 'bunny') {
        // Body with shading
        container.add(scene.add.ellipse(0, 6, 18, 16, darken(pet.color)));
        container.add(scene.add.ellipse(-1, 5, 16, 14, pet.color));
        // Head with shading
        container.add(scene.add.circle(0, -5, 12, darken(pet.color)));
        container.add(scene.add.circle(-1, -6, 11, pet.color));
        // Long ears with shading
        container.add(scene.add.ellipse(-5, -22, 5, 16, darken(pet.color)));
        container.add(scene.add.ellipse(-5, -23, 4, 15, pet.color));
        container.add(scene.add.ellipse(5, -22, 5, 16, darken(pet.color)));
        container.add(scene.add.ellipse(5, -23, 4, 15, pet.color));
        // Inner ears
        container.add(scene.add.ellipse(-5, -23, 2, 11, pet.accent));
        container.add(scene.add.ellipse(5, -23, 2, 11, pet.accent));
        // Big cute eyes
        container.add(scene.add.circle(-4, -6, 5, 0xFF69B4));
        container.add(scene.add.circle(4, -6, 5, 0xFF69B4));
        container.add(scene.add.circle(-4, -6, 2.5, 0x000000));
        container.add(scene.add.circle(4, -6, 2.5, 0x000000));
        container.add(scene.add.circle(-5, -7, 1.5, 0xFFFFFF));
        container.add(scene.add.circle(3, -7, 1.5, 0xFFFFFF));
        // Nose
        container.add(scene.add.triangle(0, -2, -2, 2, 0, 0, 2, 2, 0xFFB6C1));
        // Cheeks
        container.add(scene.add.circle(-8, -3, 3, 0xFFB6C1, 0.4));
        container.add(scene.add.circle(8, -3, 3, 0xFFB6C1, 0.4));
        // Fluffy tail
        container.add(scene.add.circle(10, 8, 6, pet.color));
        container.add(scene.add.circle(9, 7, 4, pet.accent));
    } else if (petType === 'bird') {
        // Body
        container.add(scene.add.ellipse(0, 2, 14, 12, pet.color));
        // Head
        container.add(scene.add.circle(0, -8, 8, pet.color));
        // Wing
        container.add(scene.add.ellipse(5, 2, 8, 10, pet.accent));
        // Beak
        container.add(scene.add.triangle(8, -8, 0, 4, 8, 2, 0, 0, 0xF39C12));
        // Eye
        container.add(scene.add.circle(-2, -9, 3, 0xFFFFFF));
        container.add(scene.add.circle(-2, -9, 1.5, 0x000000));
        // Tail feathers
        container.add(scene.add.triangle(-8, 4, 0, 8, 4, 0, 8, 8, pet.accent));
    } else if (petType === 'fox') {
        // === CUTE FOX REDESIGN ===
        // Fluffy tail first (renders behind body)
        container.add(scene.add.ellipse(14, 4, 10, 16, darken(pet.color)));  // Tail shadow
        container.add(scene.add.ellipse(13, 3, 9, 14, pet.color));           // Tail main
        container.add(scene.add.ellipse(15, 10, 5, 8, pet.accent));          // Tail white tip

        // Round body (cuter proportions)
        container.add(scene.add.ellipse(0, 6, 20, 14, darken(pet.color)));   // Body shadow
        container.add(scene.add.ellipse(-1, 5, 18, 12, pet.color));          // Body main
        container.add(scene.add.ellipse(0, 8, 10, 6, pet.accent));           // White belly

        // Cute round head (larger for kawaii look)
        container.add(scene.add.circle(0, -7, 14, darken(pet.color)));       // Head shadow
        container.add(scene.add.circle(-1, -8, 13, pet.color));              // Head main

        // White face markings
        container.add(scene.add.ellipse(0, -3, 10, 8, pet.accent));          // White muzzle area
        container.add(scene.add.ellipse(-5, -6, 4, 5, pet.accent));          // Left cheek patch
        container.add(scene.add.ellipse(5, -6, 4, 5, pet.accent));           // Right cheek patch

        // Pointed ears (on top of head)
        container.add(scene.add.triangle(-8, -20, 0, 10, 5, 0, 10, 10, pet.color));   // Left ear
        container.add(scene.add.triangle(8, -20, 0, 10, 5, 0, 10, 10, pet.color));    // Right ear
        container.add(scene.add.triangle(-8, -17, 0, 6, 3, 0, 6, 6, 0x1A1A1A));       // Left inner
        container.add(scene.add.triangle(8, -17, 0, 6, 3, 0, 6, 6, 0x1A1A1A));        // Right inner

        // Big cute eyes
        container.add(scene.add.ellipse(-5, -9, 5, 6, 0xFFFFFF));            // Left eye white
        container.add(scene.add.ellipse(5, -9, 5, 6, 0xFFFFFF));             // Right eye white
        container.add(scene.add.ellipse(-5, -8, 3, 4, 0x4A3000));            // Left pupil (amber)
        container.add(scene.add.ellipse(5, -8, 3, 4, 0x4A3000));             // Right pupil (amber)
        container.add(scene.add.circle(-6, -10, 1.5, 0xFFFFFF));             // Left eye shine
        container.add(scene.add.circle(4, -10, 1.5, 0xFFFFFF));              // Right eye shine

        // Small black nose
        container.add(scene.add.ellipse(0, -2, 4, 3, 0x000000));
    }

    // No nameTag - pets are visually distinct without labels

    scene.physics.add.existing(container);
    container.body.setSize(20, 20).setOffset(-10, -5);

    // Pet state for wandering and tricks
    container.petType = petType;
    container.petState = 'following';  // 'following', 'wandering', 'idle_wander', 'collecting', 'trick'
    container.wanderTarget = { x: x, y: y };
    container.wanderTimer = 0;
    container.trickTimer = 0;
    container.trickType = null;
    container.originalScale = { x: 1, y: 1 };

    // Make pet clickable for tricks (silent easter egg)
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', () => {
        if (container.petState !== 'trick') {
            petDoTrick();
        }
    });

    return container;
}

/**
 * Update player movement based on input
 * Call this in the update loop
 */
export function updatePlayerMovement() {
    const player = GameState.player;
    if (!player || GameState.isFishing) return;

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

    // Update player depth based on foot Y position (y + 25 for ~50px character)
    player.setDepth(getWorldDepth(player.y + 25));

    // Update external shadow position and depth (shadow follows player)
    if (player.externalShadow) {
        player.externalShadow.x = player.x;
        player.externalShadow.y = player.y + 28;
        // Shadow at same Y-depth as player feet but -1 sublayer to render behind
        player.externalShadow.setDepth(getWorldDepth(player.y + 28, -1));
    }
}

/**
 * Check if a position is in the pond (forbidden zone for pet)
 */
function isPetInPond(x, y) {
    // Pond is an ellipse centered at (220, 680) with rx=100, ry=70
    const pondX = 220, pondY = 680, pondRx = 100, pondRy = 70;
    const dx = (x - pondX) / pondRx;
    const dy = (y - pondY) / pondRy;
    return (dx * dx + dy * dy) < 1;
}

/**
 * Get a valid wander target for the pet (avoiding pond)
 */
function getValidWanderTarget(playerX, playerY) {
    for (let attempts = 0; attempts < 10; attempts++) {
        const target = {
            x: playerX + (Math.random() - 0.5) * 100,
            y: playerY + (Math.random() - 0.5) * 100
        };
        if (!isPetInPond(target.x, target.y)) {
            return target;
        }
    }
    // Fallback: stay near player
    return { x: playerX + 20, y: playerY + 20 };
}

/**
 * Find something for the pet to collect (weed, grass, or herb)
 * @returns {Object|null} - { type: 'weed'|'grass'|'herb', target: object } or null
 */
function findCollectible() {
    // Check for weeds in farm plots
    if (GameState.farmPlots) {
        for (const plot of GameState.farmPlots) {
            if (plot.hazard === 'weeds') {
                return { type: 'weed', target: plot };
            }
        }
    }

    // Check for grass pickups (fiber)
    if (GameState.grassPickups) {
        for (const pickup of GameState.grassPickups) {
            if (!pickup.isCollected) {
                return { type: 'grass', target: pickup };
            }
        }
    }

    // Check for herb pickups
    if (GameState.herbPickups) {
        for (const pickup of GameState.herbPickups) {
            if (!pickup.isCollected) {
                return { type: 'herb', target: pickup };
            }
        }
    }

    return null;
}

/**
 * Pet collects a pickup (grass or herb)
 */
function petCollectPickup(pickup, type) {
    if (!pickup || pickup.isCollected) return;

    pickup.isCollected = true;
    pickup.graphics?.clear();

    if (type === 'grass') {
        // Add fiber (1-2 per grass)
        const amount = Math.random() < 0.3 ? 2 : 1;
        GameState.inventory.resources.fiber = (GameState.inventory.resources.fiber || 0) + amount;
    } else if (type === 'herb') {
        // Add herb to ingredients
        const herbType = pickup.herbType;
        if (GameState.inventory.ingredients[herbType] !== undefined) {
            GameState.inventory.ingredients[herbType]++;
        }
    }

    updateInventoryDisplay();
    saveGameSession();
}

/**
 * Check if player is idle (not moving)
 * @param {number} delta - Time delta in ms
 * @returns {boolean}
 */
function updatePlayerIdleState(delta) {
    const player = GameState.player;
    if (!player || !player.body) return false;

    const isMoving = Math.abs(player.body.velocity.x) > 5 || Math.abs(player.body.velocity.y) > 5;

    if (isMoving) {
        GameState.playerIdleTime = 0;
        return false;
    } else {
        GameState.playerIdleTime = (GameState.playerIdleTime || 0) + delta;
        return GameState.playerIdleTime > 2000; // Idle after 2 seconds
    }
}

/**
 * Update pet behavior - following, wandering, and tricks
 * When player is idle, pet wanders screen and cleans weeds
 * @param {number} delta - Time delta in ms
 */
export function updatePetFollow(delta = 16) {
    const pet = GameState.playerPet;
    const player = GameState.player;
    if (!pet || !player) return;

    const dx = player.x - pet.x;
    const dy = player.y - pet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if player is idle
    const isPlayerIdle = updatePlayerIdleState(delta);

    // Update trick animation
    if (pet.petState === 'trick') {
        pet.trickTimer -= delta;
        const progress = 1 - (pet.trickTimer / 800);

        if (pet.trickType === 'spin') {
            pet.rotation = progress * Math.PI * 4;
        } else if (pet.trickType === 'jump') {
            const jumpHeight = Math.sin(progress * Math.PI) * 25;
            pet.y = pet.baseY - jumpHeight;
        } else if (pet.trickType === 'flip') {
            pet.scaleY = Math.cos(progress * Math.PI * 2);
        }

        if (pet.trickTimer <= 0) {
            pet.petState = 'following';
            pet.rotation = 0;
            pet.scaleY = 1;
            if (pet.baseY) pet.y = pet.baseY;
        }
        return;
    }

    // If pet somehow ends up in pond, push it out
    if (isPetInPond(pet.x, pet.y)) {
        pet.x += (dx / dist) * 100 * delta / 1000;
        pet.y += (dy / dist) * 100 * delta / 1000;
        return;
    }

    // If player starts moving, pet returns to following
    if (!isPlayerIdle && dist > 120) {
        pet.petState = 'following';
        pet.collectTarget = null;
        pet.collectType = null;
    }

    // Collecting behavior (when pet reaches a collectible)
    if (pet.petState === 'collecting') {
        pet.cleanTimer -= delta;
        // Little wiggle animation while collecting
        pet.rotation = Math.sin(pet.cleanTimer / 50) * 0.2;

        if (pet.cleanTimer <= 0) {
            // Collect the item based on type
            if (pet.collectTarget) {
                if (pet.collectType === 'weed' && pet.collectTarget.hazard === 'weeds') {
                    removeHazard(pet.collectTarget);
                } else if (pet.collectType === 'grass' || pet.collectType === 'herb') {
                    petCollectPickup(pet.collectTarget, pet.collectType);
                }
            }
            pet.collectTarget = null;
            pet.collectType = null;
            pet.petState = isPlayerIdle ? 'idle_wander' : 'following';
            pet.rotation = 0;
        }
        return;
    }

    // Idle wander - expanded range, looks for collectibles
    if (pet.petState === 'idle_wander') {
        // If player starts moving, return to following
        if (!isPlayerIdle) {
            pet.petState = 'following';
            pet.collectTarget = null;
            pet.collectType = null;
            return;
        }

        // Check for things to collect (weeds, grass, herbs)
        if (!pet.collectTarget) {
            const collectible = findCollectible();
            if (collectible) {
                pet.collectTarget = collectible.target;
                pet.collectType = collectible.type;
            }
        }

        // Move toward collectible or wander target
        let targetX, targetY;
        if (pet.collectTarget) {
            targetX = pet.collectTarget.x;
            targetY = pet.collectTarget.y;
        } else {
            targetX = pet.wanderTarget?.x || player.x;
            targetY = pet.wanderTarget?.y || player.y;
        }

        const wdx = targetX - pet.x;
        const wdy = targetY - pet.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);

        // If near collectible, start collecting
        if (pet.collectTarget && wdist < 20) {
            pet.petState = 'collecting';
            pet.cleanTimer = 600; // 600ms to collect
            return;
        }

        if (wdist > 5) {
            const wanderSpeed = pet.collectTarget ? 70 : 50; // Faster toward collectibles
            const newX = pet.x + (wdx / wdist) * wanderSpeed * delta / 1000;
            const newY = pet.y + (wdy / wdist) * wanderSpeed * delta / 1000;
            if (!isPetInPond(newX, newY)) {
                pet.x = newX;
                pet.y = newY;
            }
        }

        // Pick new wander target periodically (if no collect target)
        pet.wanderTimer = (pet.wanderTimer || 0) - delta;
        if (pet.wanderTimer <= 0 && !pet.collectTarget) {
            pet.wanderTimer = 2000 + Math.random() * 3000;
            // Wander anywhere on visible screen
            pet.wanderTarget = {
                x: 50 + Math.random() * (GAME_WIDTH - 100),
                y: 50 + Math.random() * (GAME_HEIGHT - 100)
            };
        }
    } else if (pet.petState === 'following') {
        // If player is idle, switch to idle_wander regardless of distance
        if (isPlayerIdle && dist < 100) {
            pet.petState = 'idle_wander';
            pet.wanderTimer = 0; // Pick target immediately
            return;
        }

        // Follow the player
        if (dist > 50) {
            const speed = Math.min(dist * 2, 180);
            const newX = pet.x + (dx / dist) * speed * delta / 1000;
            const newY = pet.y + (dy / dist) * speed * delta / 1000;
            if (!isPetInPond(newX, newY)) {
                pet.x = newX;
                pet.y = newY;
            }
        } else if (dist < 40) {
            // Close enough, start wandering
            pet.petState = 'wandering';
            pet.wanderTimer = 1000 + Math.random() * 2000;
            pet.wanderTarget = getValidWanderTarget(player.x, player.y);
        }
    } else if (pet.petState === 'wandering') {
        // If player becomes idle, switch to idle_wander
        if (isPlayerIdle) {
            pet.petState = 'idle_wander';
            pet.wanderTimer = 0; // Pick new target immediately
            return;
        }

        // Wander around near the player
        pet.wanderTimer -= delta;

        const wdx = pet.wanderTarget.x - pet.x;
        const wdy = pet.wanderTarget.y - pet.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);

        if (wdist > 5) {
            const wanderSpeed = 40;
            const newX = pet.x + (wdx / wdist) * wanderSpeed * delta / 1000;
            const newY = pet.y + (wdy / wdist) * wanderSpeed * delta / 1000;
            if (!isPetInPond(newX, newY)) {
                pet.x = newX;
                pet.y = newY;
            }
        }

        if (pet.wanderTimer <= 0) {
            pet.wanderTimer = 1500 + Math.random() * 2500;
            pet.wanderTarget = getValidWanderTarget(player.x, player.y);
        }
    }

    // Update depth based on foot Y position
    pet.setDepth(getWorldDepth(pet.y + 10, -0.1));
}

/**
 * Make the pet do a trick animation
 * @returns {string} The trick performed
 */
export function petDoTrick() {
    const pet = GameState.playerPet;
    if (!pet || pet.petState === 'trick') return null;

    const tricks = ['spin', 'jump', 'flip'];
    const trick = tricks[Math.floor(Math.random() * tricks.length)];

    pet.petState = 'trick';
    pet.trickType = trick;
    pet.trickTimer = 800;
    pet.baseY = pet.y;

    return trick;
}

/**
 * Check if player is near their pet
 * @returns {boolean}
 */
export function isNearPet() {
    const pet = GameState.playerPet;
    const player = GameState.player;
    if (!pet || !player) return false;

    const dx = player.x - pet.x;
    const dy = player.y - pet.y;
    return Math.sqrt(dx * dx + dy * dy) < 120;  // Allow petting within 120px (matches return-to-follow distance)
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
    toolGraphics.setDepth(DEPTH_LAYERS.TOOL_EFFECTS);
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
        // Pond center and dimensions for bobber positioning
        const pondCenterX = 220;
        const pondCenterY = 680;
        const facingLeft = px > pondCenterX + 50; // If right of pond, face left toward water
        const dir = facingLeft ? -1 : 1;
        const rodX = facingLeft ? px - 18 : px + 18; // Flip rod position when facing left
        const rodTipY = toolY - 40;

        toolGraphics.fillStyle(0x8B4513, 1); // Brown pole
        toolGraphics.fillRect(rodX, toolY - 35, 3, 45); // Main pole
        toolGraphics.fillStyle(0x654321, 1); // Darker tip
        toolGraphics.fillRect(rodX, toolY - 40, 2, 8);
        // Reel
        toolGraphics.fillStyle(0x696969, 1);
        toolGraphics.fillCircle(rodX + 1, toolY + 5, 5);
        toolGraphics.fillStyle(0x505050, 1);
        toolGraphics.fillCircle(rodX + 1, toolY + 5, 3);
        // Line (when fishing) - bobber lands at random position in pond
        if (GameState.isFishing) {
            // Use the random offset set when fishing started
            const randOffsetX = GameState.bobberOffset?.x || 0;
            const randOffsetY = GameState.bobberOffset?.y || 0;

            // Bobber position inside pond with random offset
            const bobberX = pondCenterX + randOffsetX;
            const bobberY = pondCenterY - 10 + randOffsetY + (Math.sin(GameState.gameTime * 0.15) * 2);

            // Draw straight fishing line from rod tip to bobber
            const rodTipX = rodX + 1;
            toolGraphics.lineStyle(1, 0xAAAAAA, 0.8);
            toolGraphics.lineBetween(rodTipX, rodTipY, bobberX, bobberY);

            // Bobber
            toolGraphics.fillStyle(0xFF6347, 1);
            toolGraphics.fillCircle(bobberX, bobberY, 5);
            toolGraphics.fillStyle(0xFFFFFF, 1);
            toolGraphics.fillCircle(bobberX, bobberY + 2, 2);
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
    actionGraphics.setDepth(DEPTH_LAYERS.ACTION_EFFECTS);
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
