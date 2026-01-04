/**
 * world.js - Buildings, farm plots, NPCs, environment
 *
 * Exports:
 * - createHouse(graphics, x, y, roofColor, label, scene): Draw a house
 * - createFarmPlot(scene, x, y): Create farm plot data structure
 * - drawPlot(plot): Render farm plot (grass or tilled)
 * - drawPlant(scene, plot): Render crop on plot
 * - createSeedPickup(scene, x, y, seedType): Create seed pickup
 * - drawSeedPickup(pickup): Render seed pickup
 * - setupWorld(scene, graphics): Create all world elements
 * - createNPCs(scene): Create Mira and Finn NPCs
 * - updateNPCPatrol(): Update NPC patrol behavior
 */

import { npcPatrolPoints, miraHome, npcSpeed } from './config.js';
import { GameState } from './state.js';
import { getDayPhase } from './utils.js';
import { createWhimsicalCharacter } from './player.js';

/**
 * Draw a house with roof, door, windows, and chimney
 */
export function createHouse(graphics, x, y, roofColor, label, scene) {
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(x - 60, y - 50, 120, 100);
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(x - 62, y + 45, 124, 10);
    graphics.fillStyle(roofColor, 1);
    graphics.fillTriangle(x - 70, y - 50, x, y - 110, x + 70, y - 50);
    graphics.fillStyle(0x654321, 1);
    graphics.fillRect(x - 18, y + 5, 36, 45);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillCircle(x + 10, y + 28, 4);
    graphics.fillStyle(0x87CEEB, 1);
    graphics.fillRect(x - 48, y - 30, 24, 24);
    graphics.fillRect(x + 24, y - 30, 24, 24);
    graphics.lineStyle(2, 0xFFFFFF, 1);
    graphics.strokeRect(x - 48, y - 30, 24, 24);
    graphics.strokeRect(x + 24, y - 30, 24, 24);
    graphics.lineBetween(x - 36, y - 30, x - 36, y - 6);
    graphics.lineBetween(x - 48, y - 18, x - 24, y - 18);
    graphics.lineBetween(x + 36, y - 30, x + 36, y - 6);
    graphics.lineBetween(x + 24, y - 18, x + 48, y - 18);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(x + 30, y - 95, 20, 35);
    graphics.fillStyle(0xCCCCCC, 0.5);
    graphics.fillCircle(x + 40, y - 102, 8);
    graphics.fillCircle(x + 44, y - 115, 6);
    graphics.fillCircle(x + 38, y - 125, 5);

    if (scene && label) {
        scene.add.text(x, y - 118, label, {
            fontSize: '12px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
    }
}

/**
 * Create a farm plot data structure
 */
export function createFarmPlot(scene, x, y) {
    const plot = { x, y, state: 'grass', crop: null, growthTimer: 0, graphics: scene.add.graphics(), plantGraphics: null };
    drawPlot(plot);
    return plot;
}

/**
 * Draw the farm plot ground (grass or tilled)
 */
export function drawPlot(plot) {
    plot.graphics.clear();
    const { x, y } = plot;
    const size = 44;

    if (plot.state === 'grass') {
        plot.graphics.fillStyle(0x8B7355, 1).fillRect(x - size/2, y - size/2, size, size);
        plot.graphics.fillStyle(0x90EE90, 0.5).fillRect(x - size/2, y - size/2, size, size);
    } else {
        plot.graphics.fillStyle(0x5D4037, 1).fillRect(x - size/2, y - size/2, size, size);
        if (plot.state === 'tilled') {
            plot.graphics.lineStyle(2, 0x4A3728, 1);
            for (let i = -15; i <= 15; i += 10) plot.graphics.lineBetween(x - 18, y + i, x + 18, y + i);
        }
    }
    plot.graphics.lineStyle(1, 0x666666, 0.5).strokeRect(x - size/2, y - size/2, size, size);
}

/**
 * Draw plant on farm plot based on crop type and growth state
 */
export function drawPlant(scene, plot) {
    if (plot.plantGraphics) plot.plantGraphics.destroy();
    if (!plot.crop) return;

    plot.plantGraphics = scene.add.graphics();
    const { x, y, crop, state } = plot;

    if (crop === 'carrot') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 4, 2, 8);
            plot.plantGraphics.fillCircle(x, y - 6, 3);
        } else if (state === 'growing') {
            for (let i = -2; i <= 2; i++) {
                plot.plantGraphics.fillRect(x + i * 3, y - 10 + Math.abs(i) * 2, 2, 12 - Math.abs(i) * 2);
            }
        } else if (state === 'ready') {
            for (let i = -3; i <= 3; i++) {
                plot.plantGraphics.fillRect(x + i * 2.5, y - 12 + Math.abs(i) * 2, 2, 14 - Math.abs(i) * 2);
            }
            plot.plantGraphics.fillStyle(0xFFA500, 1);
            plot.plantGraphics.fillTriangle(x - 6, y + 2, x, y + 16, x + 6, y + 2);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.6);
            plot.plantGraphics.fillCircle(x - 2, y + 4, 2);
        }
    } else if (crop === 'tomato') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 5, 2, 10);
            plot.plantGraphics.fillCircle(x - 3, y - 4, 3);
            plot.plantGraphics.fillCircle(x + 3, y - 4, 3);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 14);
            plot.plantGraphics.fillCircle(x - 5, y - 4, 4);
            plot.plantGraphics.fillCircle(x + 5, y - 4, 4);
            plot.plantGraphics.fillCircle(x - 3, y - 8, 3);
            plot.plantGraphics.fillCircle(x + 3, y - 8, 3);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 1, y - 10, 2, 16);
            plot.plantGraphics.fillCircle(x - 6, y - 2, 5);
            plot.plantGraphics.fillCircle(x + 6, y - 2, 5);
            plot.plantGraphics.fillCircle(x - 4, y - 10, 4);
            plot.plantGraphics.fillCircle(x + 4, y - 10, 4);
            plot.plantGraphics.fillStyle(0xFF6347, 1);
            plot.plantGraphics.fillCircle(x - 5, y - 2, 6);
            plot.plantGraphics.fillCircle(x + 5, y + 2, 5);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.6);
            plot.plantGraphics.fillCircle(x - 7, y - 4, 2);
            plot.plantGraphics.fillCircle(x + 3, y, 1.5);
        }
    } else if (crop === 'flower') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 3, 2, 8);
            plot.plantGraphics.fillEllipse(x - 4, y, 4, 6);
            plot.plantGraphics.fillEllipse(x + 4, y, 4, 6);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 14);
            plot.plantGraphics.fillEllipse(x - 5, y + 2, 5, 8);
            plot.plantGraphics.fillEllipse(x + 5, y + 2, 5, 8);
            plot.plantGraphics.fillStyle(0xFF69B4, 0.5);
            plot.plantGraphics.fillCircle(x, y - 10, 5);
        } else if (state === 'ready') {
            plot.plantGraphics.fillStyle(0x228B22, 1);
            plot.plantGraphics.fillRect(x - 1, y - 6, 2, 16);
            plot.plantGraphics.fillEllipse(x - 6, y + 4, 5, 9);
            plot.plantGraphics.fillEllipse(x + 6, y + 4, 5, 9);
            plot.plantGraphics.fillStyle(0xFF69B4, 1);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const px = x + Math.cos(angle) * 8;
                const py = y - 12 + Math.sin(angle) * 8;
                plot.plantGraphics.fillCircle(px, py, 5);
            }
            plot.plantGraphics.fillStyle(0xFFD700, 1);
            plot.plantGraphics.fillCircle(x, y - 12, 4);
            plot.plantGraphics.fillStyle(0xFFFFFF, 0.5);
            plot.plantGraphics.fillCircle(x - 1, y - 14, 1.5);
        }
    }
}

/**
 * Create a seed pickup item
 */
export function createSeedPickup(scene, x, y, seedType) {
    const pickup = { x, y, seedType, isCollected: false, respawnTimer: 0, graphics: scene.add.graphics() };
    drawSeedPickup(pickup);
    return pickup;
}

/**
 * Draw seed pickup visual
 */
export function drawSeedPickup(pickup) {
    pickup.graphics.clear();
    if (pickup.isCollected) return;
    const { x, y, seedType } = pickup;
    const colors = { carrot: 0xFFA500, tomato: 0xFF6347, flower: 0xFF69B4 };

    pickup.graphics.fillStyle(0x228B22, 1);
    pickup.graphics.fillRect(x - 2, y - 3, 4, 14);
    pickup.graphics.fillCircle(x - 7, y + 3, 6);
    pickup.graphics.fillCircle(x + 7, y + 3, 6);
    pickup.graphics.fillStyle(colors[seedType], 1);
    pickup.graphics.fillCircle(x, y - 10, 10);
    pickup.graphics.fillStyle(0xFFFF00, 1);
    pickup.graphics.fillCircle(x, y - 10, 4);
    pickup.graphics.fillStyle(0xFFFFFF, 0.9);
    pickup.graphics.fillCircle(x + 3, y - 13, 3);
}

/**
 * Create NPC characters (Mira and Finn)
 */
export function createNPCs(scene) {
    // Mira - druid NPC near her cottage
    GameState.npc = createWhimsicalCharacter(scene, 400, 500, 'druid', true, {
        body: 0xE67E22, accent: 0xF39C12, skin: 0xF5CBA7, hair: 0x8B4513
    });
    GameState.npc.body.setImmovable(true);

    // Add nameplate to Mira's container (moves with her)
    const miraName = scene.add.text(0, -60, 'Mira 🌿', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    GameState.npc.add(miraName);

    // Set interaction properties
    GameState.npc.interactType = 'npc';
    GameState.npc.message = `Welcome, ${GameState.playerName}! 🌟\nI'm Mira, the village druid.\nGrow crops, fish, cook recipes!\nSell at the shop for coins!`;
    GameState.interactables.push(GameState.npc);

    // Finn - shopkeeper with apron
    GameState.shopkeeper = createWhimsicalCharacter(scene, 815, 230, 'priest', true, {
        body: 0x27AE60, accent: 0x2ECC71, skin: 0xC68642, hair: 0x1E8449, accessory: 'apron'
    });
    GameState.shopkeeper.body.setImmovable(true);

    // Add nameplate to Finn's container
    const finnName = scene.add.text(0, -60, 'Finn 🛒', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    GameState.shopkeeper.add(finnName);

    // Set interaction properties
    GameState.shopkeeper.interactType = 'shop';
    GameState.shopkeeper.message = `Hello, ${GameState.playerName}! 🛒\nBring me crops, fish, or cooked dishes!\nPress E again to trade.`;
    GameState.interactables.push(GameState.shopkeeper);
}

/**
 * Update NPC patrol behavior
 * Mira patrols during day, goes home at night
 */
export function updateNPCPatrol() {
    const npc = GameState.npc;
    if (!npc) return;

    const phase = getDayPhase(GameState.gameTime);
    const isNight = phase === 'night';

    // Target: patrol point or home
    const target = isNight ? miraHome : npcPatrolPoints[GameState.currentPatrolIndex];

    const dx = target.x - npc.x;
    const dy = target.y - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
        const speed = npcSpeed;
        npc.x += (dx / dist) * speed * 0.016;
        npc.y += (dy / dist) * speed * 0.016;
    } else if (!isNight) {
        // Reached patrol point, move to next
        GameState.currentPatrolIndex = (GameState.currentPatrolIndex + 1) % npcPatrolPoints.length;
    }
}

/**
 * Draw a tree
 */
export function drawTree(graphics, x, y) {
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(x - 8, y - 20, 16, 40);
    graphics.fillStyle(0x228B22, 1);
    graphics.fillCircle(x, y - 35, 30);
    graphics.fillCircle(x - 20, y - 25, 20);
    graphics.fillCircle(x + 20, y - 25, 20);
    graphics.fillCircle(x, y - 50, 22);
    graphics.fillStyle(0x32CD32, 0.5);
    graphics.fillCircle(x - 10, y - 40, 12);
    graphics.fillCircle(x + 10, y - 30, 10);
}

/**
 * Draw a small flower decoration
 */
export function drawSmallFlower(graphics, x, y, color) {
    graphics.fillStyle(0x228B22, 1);
    graphics.fillRect(x - 1, y - 2, 2, 8);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(x - 4, y - 4, 4);
    graphics.fillCircle(x + 4, y - 4, 4);
    graphics.fillCircle(x, y - 7, 4);
    graphics.fillCircle(x, y - 1, 4);
    graphics.fillStyle(0xFFFF00, 1);
    graphics.fillCircle(x, y - 4, 3);
}
