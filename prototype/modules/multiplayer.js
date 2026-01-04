/**
 * multiplayer.js - Colyseus connection, player/world synchronization
 *
 * Exports:
 * - connectToServer(): Connect to Colyseus server
 * - disconnectFromServer(): Disconnect from server
 * - createOtherPlayer(scene, sessionId, playerData): Create remote player sprite
 * - updateOtherPlayer(sessionId, x, y): Update remote player target position
 * - interpolateOtherPlayers(): Smooth movement for remote players
 * - sendPositionToServer(): Send local player position to server
 * - sendFarmAction(plotIndex, action, seedType): Send farm action to server
 * - sendCollectSeed(pickupIndex): Send seed collection to server
 * - interpolateNPCs(): Smooth NPC movement
 */

import { classes, SERVER_URL } from './config.js';
import { GameState } from './state.js';
import { lerp } from './utils.js';
import { drawPlot, drawPlant, drawSeedPickup } from './world.js';
import { updateInventoryDisplay, updateSeedIndicator } from './ui.js';

/**
 * Connect to Colyseus multiplayer server
 */
export async function connectToServer() {
    try {
        const client = new Colyseus.Client(SERVER_URL);

        GameState.room = await client.joinOrCreate("game", {
            name: GameState.playerName,
            playerClass: GameState.playerClass,
            customization: GameState.customization
        });

        console.log("Connected to server! Session ID:", GameState.room.sessionId);

        // Listen for players joining (0.14.x API uses assignment)
        GameState.room.state.players.onAdd = (playerData, sessionId) => {
            // Skip if this is our own player
            if (sessionId === GameState.room.sessionId) {
                console.log("Local player registered on server");
                return;
            }

            console.log("Player joined:", sessionId, playerData.name);
            createOtherPlayer(sessionId, playerData);

            // Listen for position changes on this player (0.14.x API)
            playerData.onChange = (changes) => {
                changes.forEach(change => {
                    if (change.field === "x" || change.field === "y") {
                        updateOtherPlayer(sessionId, playerData.x, playerData.y);
                    }
                });
            };
        };

        // Listen for players leaving (0.14.x API uses assignment)
        GameState.room.state.players.onRemove = (playerData, sessionId) => {
            console.log("Player left:", sessionId);
            if (GameState.otherPlayers[sessionId]) {
                GameState.otherPlayers[sessionId].destroy();
                delete GameState.otherPlayers[sessionId];
            }
        };

        // ===== World State Sync =====

        // Sync farm plots from server
        GameState.room.state.farmPlots.onAdd = (plotData, key) => {
            syncFarmPlot(plotData);

            plotData.onChange = () => {
                syncFarmPlot(plotData);
            };
        };

        // Sync NPCs from server
        GameState.room.state.npcs.onAdd = (npcData, key) => {
            syncNPC(npcData);

            npcData.onChange = () => {
                syncNPC(npcData);
            };
        };

        // Sync seed pickups from server
        GameState.room.state.seedPickups.onAdd = (pickupData, key) => {
            syncSeedPickup(pickupData);

            pickupData.onChange = () => {
                syncSeedPickup(pickupData);
            };
        };

        // Sync game time from server
        GameState.room.state.onChange = (changes) => {
            changes.forEach(change => {
                if (change.field === "gameTime") {
                    GameState.gameTime = change.value;
                }
                if (change.field === "timeSpeed") {
                    GameState.timeSpeed = change.value;
                }
            });
        };

        // Listen for harvest broadcast (to add crop to our inventory)
        GameState.room.onMessage("cropHarvested", (message) => {
            // Only add to inventory if we harvested it
            if (message.harvestedBy === GameState.room.sessionId) {
                GameState.inventory.crops[message.crop]++;
                updateInventoryDisplay();
            }
        });

        // Listen for seed collection broadcast
        GameState.room.onMessage("seedCollected", (message) => {
            // Only add to inventory if we collected it
            if (message.collectedBy === GameState.room.sessionId) {
                GameState.inventory.seeds[message.seedType] += message.amount;
                updateInventoryDisplay();
                updateSeedIndicator();
            }
        });

        // Handle disconnection
        GameState.room.onLeave((code) => {
            console.log("Left room with code:", code);
            GameState.room = null;
            // Clean up all other players
            Object.keys(GameState.otherPlayers).forEach(sessionId => {
                if (GameState.otherPlayers[sessionId]) {
                    GameState.otherPlayers[sessionId].destroy();
                }
            });
            GameState.otherPlayers = {};
        });

        GameState.room.onError((code, message) => {
            console.error("Room error:", code, message);
        });

    } catch (error) {
        console.error("Failed to connect to server:", error);
        // Game continues in single-player mode
    }
}

/**
 * Disconnect from server
 */
export function disconnectFromServer() {
    if (GameState.room) {
        GameState.room.leave();
        GameState.room = null;
    }
}

/**
 * Create a visual representation of another player
 */
export function createOtherPlayer(sessionId, playerData) {
    const scene = GameState.scene;
    if (!scene) return null;

    // Extract customization data from server
    const charCustom = {
        skinTone: playerData.customization?.skinTone || 0xFFDBB4,
        hairColor: playerData.customization?.hairColor || 0x4A3728,
        gender: playerData.customization?.gender || 'female',
        pet: playerData.customization?.pet || 'none'
    };

    const classType = playerData.playerClass || 'druid';
    const x = playerData.x || 600;
    const y = playerData.y || 450;

    // Create a simplified player container (no physics needed for other players)
    const container = scene.add.container(x, y);
    const cls = classes[classType] || classes.druid;
    const isFemale = charCustom.gender === 'female';

    container.floatOffset = Math.random() * Math.PI * 2;
    container.targetX = x;
    container.targetY = y;

    // Shadow
    const shadow = scene.add.ellipse(0, 28, 30, 10, 0x000000, 0.25);
    container.add(shadow);

    const bodyColor = cls.color;

    if (isFemale) {
        container.add(scene.add.ellipse(0, -2, 28, 14, bodyColor));
        container.add(scene.add.ellipse(0, 8, 18, 12, bodyColor));
        container.add(scene.add.ellipse(0, 18, 26, 16, bodyColor));
        container.add(scene.add.triangle(0, 28, -18, 0, 0, 12, 18, 0, bodyColor));
        const accentColor = cls.accent;
        container.add(scene.add.ellipse(0, 10, 20, 4, accentColor));
        container.add(scene.add.circle(-4, 10, 3, accentColor));
        container.add(scene.add.circle(4, 10, 3, accentColor));
        container.add(scene.add.circle(0, 10, 2, 0xFFFFFF, 0.5));
    } else {
        container.add(scene.add.ellipse(0, 8, 28, 36, bodyColor));
        container.add(scene.add.ellipse(0, 10, 20, 24, cls.accent, 0.5));
    }

    const skinTone = charCustom.skinTone;
    container.add(scene.add.circle(0, -20, 18, skinTone));
    container.add(scene.add.ellipse(-10, -15, 6, 4, 0xFFB6C1, 0.6));
    container.add(scene.add.ellipse(10, -15, 6, 4, 0xFFB6C1, 0.6));

    const hairColor = charCustom.hairColor;

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

    // Eyes
    container.add(scene.add.ellipse(-7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.ellipse(7, -22, 8, 10, 0xFFFFFF));
    container.add(scene.add.circle(-7, -21, 4, 0x000000));
    container.add(scene.add.circle(7, -21, 4, 0x000000));
    container.add(scene.add.circle(-6, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(8, -24, 2, 0xFFFFFF));
    container.add(scene.add.circle(-8, -20, 1, 0xFFFFFF));
    container.add(scene.add.circle(6, -20, 1, 0xFFFFFF));

    // Eyelashes for feminine
    if (isFemale) {
        container.add(scene.add.line(0, 0, -12, -28, -14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, -9, -30, -10, -34, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 12, -28, 14, -32, 0x000000).setLineWidth(1.5));
        container.add(scene.add.line(0, 0, 9, -30, 10, -34, 0x000000).setLineWidth(1.5));
    }

    // Mouth
    const mouth = scene.add.arc(0, -12, 5, 0, 180, false, 0x000000);
    mouth.setStrokeStyle(2, 0x000000);
    container.add(mouth);

    // Nameplate
    const nameplate = scene.add.text(0, -65, playerData.name || 'Player', {
        fontSize: '13px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
    container.add(nameplate);

    // Class icon
    const classIcon = scene.add.text(0, -50, cls.emoji, { fontSize: '14px' }).setOrigin(0.5);
    container.add(classIcon);

    // Store in otherPlayers map
    GameState.otherPlayers[sessionId] = container;

    return container;
}

/**
 * Update target position for another player
 */
export function updateOtherPlayer(sessionId, newX, newY) {
    const otherPlayer = GameState.otherPlayers[sessionId];
    if (!otherPlayer) return;

    // Update target positions for interpolation
    if (newX !== null) otherPlayer.targetX = newX;
    if (newY !== null) otherPlayer.targetY = newY;
}

/**
 * Smoothly interpolate other players toward their target positions
 */
export function interpolateOtherPlayers() {
    const lerpFactor = 0.15;

    Object.keys(GameState.otherPlayers).forEach(sessionId => {
        const otherPlayer = GameState.otherPlayers[sessionId];
        if (!otherPlayer || otherPlayer.targetX === undefined) return;

        // Interpolate position
        otherPlayer.x = lerp(otherPlayer.x, otherPlayer.targetX, lerpFactor);
        otherPlayer.y = lerp(otherPlayer.y, otherPlayer.targetY, lerpFactor);
    });
}

/**
 * Send local player position to server
 */
export function sendPositionToServer() {
    if (!GameState.room || !GameState.player) return;

    const player = GameState.player;
    const vx = Math.round(player.body.velocity.x);
    const vy = Math.round(player.body.velocity.y);

    // Only send when velocity changes significantly (not every frame)
    const velocityChanged = Math.abs(vx - GameState.lastSentVelocity.x) > 5 ||
                           Math.abs(vy - GameState.lastSentVelocity.y) > 5;

    if (velocityChanged) {
        GameState.room.send("move", {
            x: Math.round(player.x),
            y: Math.round(player.y),
            velocityX: vx,
            velocityY: vy
        });

        GameState.lastSentVelocity.x = vx;
        GameState.lastSentVelocity.y = vy;
    }
}

// ===== World Sync Helper Functions =====

/**
 * Sync farm plot state from server data
 */
function syncFarmPlot(plotData) {
    const localPlot = GameState.farmPlots[plotData.index];
    if (!localPlot) return;

    const stateChanged = localPlot.state !== plotData.state;
    const cropChanged = localPlot.crop !== plotData.crop;

    localPlot.state = plotData.state;
    localPlot.crop = plotData.crop || null;
    localPlot.growthTimer = plotData.growthTimer;

    // Redraw if state or crop changed
    if (stateChanged || cropChanged) {
        drawPlot(localPlot);
        if (localPlot.crop) {
            drawPlant(GameState.scene, localPlot);
        } else if (localPlot.plantGraphics) {
            localPlot.plantGraphics.destroy();
            localPlot.plantGraphics = null;
        }
    }
}

/**
 * Sync NPC position from server data
 */
function syncNPC(npcData) {
    if (npcData.id === "mira" && GameState.npc) {
        // Use interpolation targets for smooth movement
        GameState.npc.targetX = npcData.x;
        GameState.npc.targetY = npcData.y;
    } else if (npcData.id === "finn" && GameState.shopkeeper) {
        // Finn stays stationary, just update directly
        GameState.shopkeeper.x = npcData.x;
        GameState.shopkeeper.y = npcData.y;
    }
}

/**
 * Sync seed pickup state from server data
 */
function syncSeedPickup(pickupData) {
    const localPickup = GameState.seedPickups[pickupData.index];
    if (!localPickup) return;

    const wasCollected = localPickup.isCollected;
    localPickup.isCollected = pickupData.isCollected;
    localPickup.respawnTimer = pickupData.respawnTimer;

    // Redraw if collected state changed
    if (wasCollected !== pickupData.isCollected) {
        drawSeedPickup(localPickup);
    }
}

// ===== Action Senders =====

/**
 * Send farm action to server
 * @param {number} plotIndex - Index of the farm plot (0-7)
 * @param {string} action - "hoe", "plant", or "harvest"
 * @param {string|null} seedType - Required for "plant" action
 * @returns {boolean} True if message was sent
 */
export function sendFarmAction(plotIndex, action, seedType = null) {
    if (!GameState.room) return false;

    GameState.room.send("farmAction", {
        plotIndex,
        action,
        seedType
    });
    return true;
}

/**
 * Send seed pickup collection to server
 * @param {number} pickupIndex - Index of the seed pickup (0-2)
 * @returns {boolean} True if message was sent
 */
export function sendCollectSeed(pickupIndex) {
    if (!GameState.room) return false;

    GameState.room.send("collectSeed", { pickupIndex });
    return true;
}

/**
 * Interpolate NPC positions for smooth movement
 */
export function interpolateNPCs() {
    const lerpFactor = 0.1;

    // Mira interpolation
    if (GameState.npc && GameState.npc.targetX !== undefined) {
        GameState.npc.x = lerp(GameState.npc.x, GameState.npc.targetX, lerpFactor);
        GameState.npc.y = lerp(GameState.npc.y, GameState.npc.targetY, lerpFactor);
    }
}
