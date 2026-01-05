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
 * - drawLamppost(graphics, x, y): Draw Victorian-style lamppost structure
 * - drawLamppostLight(graphics, x, y): Draw lamppost light/glow (toggleable)
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
        }).setOrigin(0.5).setDepth(y + 100);  // Ensure labels are above nearby trees
    }
}

/**
 * Create a farm plot data structure
 * @param {number} index - Plot index (0-7) for server sync
 */
export function createFarmPlot(scene, x, y, index = 0) {
    const plot = {
        index, x, y,
        state: 'grass',
        crop: null,
        growthTimer: 0,
        isWatered: false,
        lastWateredTime: 0,
        hazard: '',
        graphics: scene.add.graphics(),
        plantGraphics: null
    };
    drawPlot(plot);
    return plot;
}

/**
 * Draw the farm plot ground (grass or tilled) with water/hazard indicators
 */
export function drawPlot(plot) {
    plot.graphics.clear();
    const { x, y } = plot;
    const size = 44;

    if (plot.state === 'grass') {
        plot.graphics.fillStyle(0x8B7355, 1).fillRect(x - size/2, y - size/2, size, size);
        plot.graphics.fillStyle(0x90EE90, 0.5).fillRect(x - size/2, y - size/2, size, size);
    } else {
        // Tilled/planted soil - darker if watered
        const soilColor = plot.isWatered ? 0x3E2723 : 0x5D4037;
        plot.graphics.fillStyle(soilColor, 1).fillRect(x - size/2, y - size/2, size, size);
        if (plot.state === 'tilled') {
            plot.graphics.lineStyle(2, 0x4A3728, 1);
            for (let i = -15; i <= 15; i += 10) plot.graphics.lineBetween(x - 18, y + i, x + 18, y + i);
        }
    }
    plot.graphics.lineStyle(1, 0x666666, 0.5).strokeRect(x - size/2, y - size/2, size, size);

    // Draw water indicator (small droplet)
    if (plot.isWatered && (plot.state === 'planted' || plot.state === 'growing')) {
        plot.graphics.fillStyle(0x4FC3F7, 0.8);
        plot.graphics.fillCircle(x + 16, y - 16, 4);
        plot.graphics.fillTriangle(x + 16, y - 22, x + 13, y - 16, x + 19, y - 16);
    }

    // Draw hazard indicator
    if (plot.hazard === 'weeds') {
        // Green tangled weeds
        plot.graphics.fillStyle(0x2E7D32, 1);
        plot.graphics.fillRect(x - 12, y + 8, 3, 12);
        plot.graphics.fillRect(x - 6, y + 6, 2, 14);
        plot.graphics.fillRect(x + 4, y + 10, 3, 10);
        plot.graphics.fillRect(x + 10, y + 7, 2, 13);
        plot.graphics.fillStyle(0x1B5E20, 1);
        plot.graphics.fillCircle(x - 10, y + 6, 4);
        plot.graphics.fillCircle(x - 4, y + 4, 3);
        plot.graphics.fillCircle(x + 6, y + 8, 4);
        plot.graphics.fillCircle(x + 12, y + 5, 3);
    } else if (plot.hazard === 'bugs') {
        // Small animated-looking bugs
        plot.graphics.fillStyle(0x000000, 1);
        plot.graphics.fillCircle(x - 8, y + 12, 3);
        plot.graphics.fillCircle(x - 6, y + 10, 2);
        plot.graphics.fillCircle(x + 6, y + 14, 3);
        plot.graphics.fillCircle(x + 8, y + 12, 2);
        plot.graphics.fillCircle(x, y + 16, 2);
        // Bug legs
        plot.graphics.lineStyle(1, 0x000000, 1);
        plot.graphics.lineBetween(x - 10, y + 11, x - 13, y + 9);
        plot.graphics.lineBetween(x - 6, y + 11, x - 3, y + 9);
        plot.graphics.lineBetween(x + 4, y + 13, x + 1, y + 11);
        plot.graphics.lineBetween(x + 8, y + 13, x + 11, y + 11);
    }
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
    } else if (crop === 'lettuce') {
        plot.plantGraphics.fillStyle(0x90EE90, 1); // Light green
        if (state === 'planted') {
            plot.plantGraphics.fillCircle(x, y - 2, 4);
        } else if (state === 'growing') {
            plot.plantGraphics.fillCircle(x, y - 4, 7);
            plot.plantGraphics.fillStyle(0x7CCD7C, 1);
            plot.plantGraphics.fillCircle(x - 3, y - 2, 4);
            plot.plantGraphics.fillCircle(x + 3, y - 2, 4);
        } else if (state === 'ready') {
            plot.plantGraphics.fillStyle(0x7CCD7C, 1);
            plot.plantGraphics.fillCircle(x, y - 6, 10);
            plot.plantGraphics.fillStyle(0x90EE90, 1);
            plot.plantGraphics.fillCircle(x, y - 8, 8);
            plot.plantGraphics.fillStyle(0xADFF2F, 1);
            plot.plantGraphics.fillCircle(x, y - 10, 5);
        }
    } else if (crop === 'onion') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 6, 2, 10);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 10, 2, 14);
            plot.plantGraphics.fillRect(x - 3, y - 8, 2, 10);
            plot.plantGraphics.fillRect(x + 2, y - 8, 2, 10);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 1, y - 12, 2, 14);
            plot.plantGraphics.fillRect(x - 4, y - 10, 2, 12);
            plot.plantGraphics.fillRect(x + 3, y - 10, 2, 12);
            plot.plantGraphics.fillStyle(0xE6E6FA, 1); // Purple-white onion
            plot.plantGraphics.fillCircle(x, y + 4, 8);
            plot.plantGraphics.fillStyle(0xD8BFD8, 1);
            plot.plantGraphics.fillCircle(x - 2, y + 3, 3);
        }
    } else if (crop === 'potato') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillCircle(x, y - 3, 4);
            plot.plantGraphics.fillRect(x - 1, y - 1, 2, 6);
        } else if (state === 'growing') {
            plot.plantGraphics.fillCircle(x - 4, y - 4, 5);
            plot.plantGraphics.fillCircle(x + 4, y - 4, 5);
            plot.plantGraphics.fillCircle(x, y - 8, 6);
        } else if (state === 'ready') {
            plot.plantGraphics.fillCircle(x - 5, y - 3, 6);
            plot.plantGraphics.fillCircle(x + 5, y - 3, 6);
            plot.plantGraphics.fillCircle(x, y - 8, 7);
            plot.plantGraphics.fillStyle(0xD2B48C, 1); // Tan potato
            plot.plantGraphics.fillEllipse(x - 4, y + 5, 6, 4);
            plot.plantGraphics.fillEllipse(x + 4, y + 6, 5, 3);
            plot.plantGraphics.fillStyle(0x8B7355, 1);
            plot.plantGraphics.fillCircle(x - 5, y + 4, 1);
            plot.plantGraphics.fillCircle(x + 3, y + 5, 1);
        }
    } else if (crop === 'pepper') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 4, 2, 8);
            plot.plantGraphics.fillCircle(x, y - 5, 3);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 12);
            plot.plantGraphics.fillCircle(x - 4, y - 6, 4);
            plot.plantGraphics.fillCircle(x + 4, y - 6, 4);
            plot.plantGraphics.fillCircle(x, y - 10, 5);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 1, y - 10, 2, 14);
            plot.plantGraphics.fillCircle(x - 5, y - 6, 5);
            plot.plantGraphics.fillCircle(x + 5, y - 6, 5);
            plot.plantGraphics.fillCircle(x, y - 12, 6);
            plot.plantGraphics.fillStyle(0xFF4500, 1); // Red pepper
            plot.plantGraphics.fillEllipse(x - 5, y - 2, 4, 7);
            plot.plantGraphics.fillStyle(0x32CD32, 1); // Green pepper
            plot.plantGraphics.fillEllipse(x + 5, y, 4, 6);
        }
    } else if (crop === 'corn') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 12);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 2, y - 16, 4, 20);
            plot.plantGraphics.fillStyle(0x2E8B57, 1);
            plot.plantGraphics.fillEllipse(x - 8, y - 6, 8, 4);
            plot.plantGraphics.fillEllipse(x + 8, y - 6, 8, 4);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 2, y - 22, 4, 26);
            plot.plantGraphics.fillStyle(0x2E8B57, 1);
            plot.plantGraphics.fillEllipse(x - 10, y - 8, 10, 5);
            plot.plantGraphics.fillEllipse(x + 10, y - 8, 10, 5);
            plot.plantGraphics.fillEllipse(x - 8, y - 16, 8, 4);
            plot.plantGraphics.fillEllipse(x + 8, y - 16, 8, 4);
            plot.plantGraphics.fillStyle(0xFFD700, 1); // Yellow corn
            plot.plantGraphics.fillEllipse(x + 6, y - 4, 5, 10);
            plot.plantGraphics.fillStyle(0x90EE90, 1); // Corn husk
            plot.plantGraphics.fillTriangle(x + 2, y - 14, x + 6, y - 6, x + 10, y - 14);
        }
    } else if (crop === 'pumpkin') {
        plot.plantGraphics.fillStyle(0x228B22, 1);
        if (state === 'planted') {
            plot.plantGraphics.fillRect(x - 1, y - 3, 2, 6);
            plot.plantGraphics.fillEllipse(x - 3, y - 2, 4, 3);
            plot.plantGraphics.fillEllipse(x + 3, y - 2, 4, 3);
        } else if (state === 'growing') {
            plot.plantGraphics.fillRect(x - 1, y - 4, 2, 8);
            plot.plantGraphics.fillEllipse(x - 8, y - 2, 8, 5);
            plot.plantGraphics.fillEllipse(x + 8, y - 2, 8, 5);
            plot.plantGraphics.fillStyle(0xFF8C00, 0.5);
            plot.plantGraphics.fillCircle(x, y + 4, 6);
        } else if (state === 'ready') {
            plot.plantGraphics.fillRect(x - 1, y - 8, 2, 10);
            plot.plantGraphics.fillEllipse(x - 12, y - 4, 10, 6);
            plot.plantGraphics.fillEllipse(x + 12, y - 4, 10, 6);
            plot.plantGraphics.fillStyle(0xFF6600, 1); // Orange pumpkin
            plot.plantGraphics.fillCircle(x, y + 6, 12);
            plot.plantGraphics.fillStyle(0xFF8C00, 1);
            plot.plantGraphics.fillEllipse(x - 5, y + 6, 5, 10);
            plot.plantGraphics.fillEllipse(x + 5, y + 6, 5, 10);
            plot.plantGraphics.fillStyle(0x228B22, 1);
            plot.plantGraphics.fillRect(x - 2, y - 4, 4, 6); // Stem
        }
    }

    // Draw wilted/dead overlay
    if (state === 'wilted' || state === 'dead') {
        plot.plantGraphics.fillStyle(state === 'dead' ? 0x4A3728 : 0x8B7355, 0.7);
        plot.plantGraphics.fillRect(x - 8, y - 10, 16, 20);
        plot.plantGraphics.fillStyle(0x654321, 1);
        plot.plantGraphics.fillRect(x - 2, y - 6, 4, 12);
        plot.plantGraphics.fillCircle(x - 4, y - 4, 3);
        plot.plantGraphics.fillCircle(x + 4, y - 2, 2);
    }
}

/**
 * Create a seed pickup item
 * @param {number} index - Pickup index for server sync
 */
export function createSeedPickup(scene, x, y, seedType, index = 0) {
    const pickup = { index, x, y, seedType, isCollected: false, respawnTimer: 0, graphics: scene.add.graphics() };
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
    const colors = {
        carrot: 0xFFA500, tomato: 0xFF6347, flower: 0xFF69B4,
        lettuce: 0x90EE90, onion: 0x9370DB, potato: 0xD2B48C,
        pepper: 0xFF4500, corn: 0xFFD700, pumpkin: 0xFF8C00
    };

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
    // Mira - druid NPC near her cottage (adjusted for larger screen)
    GameState.npc = createWhimsicalCharacter(scene, 450, 550, 'druid', true, {
        body: 0xE67E22, accent: 0xF39C12, skin: 0xF5CBA7, hair: 0x8B4513
    });
    GameState.npc.body.setImmovable(true);

    // Add interpolation targets for server sync
    GameState.npc.targetX = 450;
    GameState.npc.targetY = 550;

    // Add nameplate to Mira's container (moves with her)
    const miraName = scene.add.text(0, -60, 'Mira 🌿', {
        fontSize: '12px', fill: '#fff', backgroundColor: '#00000099', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    GameState.npc.add(miraName);

    // Set interaction properties
    GameState.npc.interactType = 'npc';
    GameState.npc.message = `Welcome, ${GameState.playerName}! 🌟\nI'm Mira, the village druid.\nGrow crops, fish, cook recipes!\nSell at the shop for coins!`;
    GameState.interactables.push(GameState.npc);

    // Finn - shopkeeper with apron (in front of General Store door)
    GameState.shopkeeper = createWhimsicalCharacter(scene, 1200, 680, 'priest', true, {
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
 * Skip when connected - server handles NPC movement
 */
export function updateNPCPatrol() {
    // Server handles NPC movement when connected
    if (GameState.room) return;

    // Single-player fallback
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

/**
 * Draw a Victorian-style lamppost structure (without light)
 */
export function drawLamppost(graphics, x, y) {
    // Base plate
    graphics.fillStyle(0x2C2C2C, 1);
    graphics.fillRect(x - 12, y + 25, 24, 6);
    graphics.fillStyle(0x1A1A1A, 1);
    graphics.fillRect(x - 8, y + 20, 16, 8);

    // Main post
    graphics.fillStyle(0x2C2C2C, 1);
    graphics.fillRect(x - 4, y - 50, 8, 75);

    // Decorative rings on post
    graphics.fillStyle(0x3D3D3D, 1);
    graphics.fillRect(x - 6, y + 10, 12, 4);
    graphics.fillRect(x - 6, y - 10, 12, 4);
    graphics.fillRect(x - 5, y - 30, 10, 3);

    // Decorative scrollwork (simplified curves)
    graphics.fillStyle(0x2C2C2C, 1);
    graphics.fillCircle(x - 10, y - 40, 3);
    graphics.fillCircle(x + 10, y - 40, 3);
    graphics.fillRect(x - 10, y - 43, 4, 8);
    graphics.fillRect(x + 6, y - 43, 4, 8);

    // Cross arm
    graphics.fillRect(x - 14, y - 52, 28, 4);

    // Lamp housing frame (black iron)
    graphics.fillStyle(0x1A1A1A, 1);
    graphics.fillRect(x - 10, y - 75, 20, 4);  // Top
    graphics.fillRect(x - 10, y - 55, 20, 4);  // Bottom
    graphics.fillRect(x - 10, y - 75, 3, 24);  // Left side
    graphics.fillRect(x + 7, y - 75, 3, 24);   // Right side

    // Lamp top finial
    graphics.fillStyle(0x2C2C2C, 1);
    graphics.fillRect(x - 4, y - 82, 8, 8);
    graphics.fillCircle(x, y - 85, 4);

    // Dark glass when light is off
    graphics.fillStyle(0x404040, 0.7);
    graphics.fillRect(x - 7, y - 71, 14, 16);
}

/**
 * Draw lamppost light/glow (toggleable)
 */
export function drawLamppostLight(graphics, x, y) {
    // Glass panels (warm glow)
    graphics.fillStyle(0xFFF8DC, 0.9);
    graphics.fillRect(x - 7, y - 71, 14, 16);

    // Inner glow
    graphics.fillStyle(0xFFD700, 0.6);
    graphics.fillRect(x - 5, y - 68, 10, 10);

    // Flame/light source
    graphics.fillStyle(0xFFA500, 0.8);
    graphics.fillCircle(x, y - 63, 4);
    graphics.fillStyle(0xFFFF00, 0.9);
    graphics.fillCircle(x, y - 63, 2);
}

/**
 * Create a fruit tree data structure
 * @param {Phaser.Scene} scene - The game scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} treeType - Type of tree (apple, orange, peach, cherry)
 * @param {number} index - Tree index for server sync
 */
export function createFruitTree(scene, x, y, treeType, index = 0) {
    const tree = {
        index, x, y, treeType,
        hasFruit: true,
        fruitTimer: 0,
        graphics: scene.add.graphics(),
        needsRedraw: false
    };
    // Set depth based on Y position for proper layering
    // Lower depth = behind other objects
    tree.graphics.setDepth(y);
    drawFruitTree(tree);
    return tree;
}

/**
 * Draw a fruit tree with optional fruit
 */
export function drawFruitTree(tree) {
    tree.graphics.clear();
    const { x, y, treeType, hasFruit } = tree;

    // Trunk
    tree.graphics.fillStyle(0x8B4513, 1);
    tree.graphics.fillRect(x - 8, y - 10, 16, 40);
    tree.graphics.fillStyle(0x654321, 1);
    tree.graphics.fillRect(x - 4, y - 10, 4, 40);

    // Foliage colors vary by tree type
    const foliageColors = {
        apple: 0x228B22,   // Forest green
        orange: 0x2E8B57,  // Sea green
        peach: 0x3CB371,   // Medium sea green (natural, not too yellow)
        cherry: 0x2E8B57   // Sea green
    };

    // Draw foliage (layered circles)
    tree.graphics.fillStyle(foliageColors[treeType] || 0x228B22, 1);
    tree.graphics.fillCircle(x, y - 35, 30);
    tree.graphics.fillCircle(x - 20, y - 25, 22);
    tree.graphics.fillCircle(x + 20, y - 25, 22);
    tree.graphics.fillCircle(x - 10, y - 45, 18);
    tree.graphics.fillCircle(x + 10, y - 45, 18);

    // Darker foliage accents
    tree.graphics.fillStyle(0x1B5E20, 0.5);
    tree.graphics.fillCircle(x - 15, y - 30, 10);
    tree.graphics.fillCircle(x + 12, y - 40, 8);

    // Draw fruit if tree has fruit
    if (hasFruit) {
        const fruitColors = {
            apple: 0xFF0000,
            orange: 0xFFA500,
            peach: 0xFFDAB9,
            cherry: 0xDC143C
        };
        const fruitColor = fruitColors[treeType] || 0xFF0000;

        tree.graphics.fillStyle(fruitColor, 1);

        if (treeType === 'cherry') {
            // Cherries come in pairs
            tree.graphics.fillCircle(x - 15, y - 30, 5);
            tree.graphics.fillCircle(x - 10, y - 28, 5);
            tree.graphics.fillCircle(x + 12, y - 35, 5);
            tree.graphics.fillCircle(x + 17, y - 33, 5);
            tree.graphics.fillCircle(x - 5, y - 20, 5);
            tree.graphics.fillCircle(x, y - 18, 5);
            // Stems
            tree.graphics.lineStyle(1, 0x228B22, 1);
            tree.graphics.lineBetween(x - 12, y - 32, x - 10, y - 38);
            tree.graphics.lineBetween(x + 14, y - 37, x + 12, y - 43);
        } else {
            // Regular fruit
            tree.graphics.fillCircle(x - 15, y - 30, 6);
            tree.graphics.fillCircle(x + 18, y - 35, 6);
            tree.graphics.fillCircle(x - 8, y - 20, 6);
            tree.graphics.fillCircle(x + 10, y - 25, 6);
            tree.graphics.fillCircle(x - 2, y - 40, 5);
        }

        // Shine on fruit
        tree.graphics.fillStyle(0xFFFFFF, 0.4);
        tree.graphics.fillCircle(x - 17, y - 32, 2);
        tree.graphics.fillCircle(x + 16, y - 37, 2);
    }
}
