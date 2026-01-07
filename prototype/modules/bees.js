/**
 * bees.js - Bee AI, hive creation, and honey mechanics
 *
 * Exports:
 * - initializeBees: Spawn initial bees
 * - updateBees: Update bee movement and behavior
 * - spawnBee: Create a new bee
 * - drawBee: Render a bee
 */

import { GameState } from './state.js';
import { MAX_BEES, HIVE_CREATION_CHANCE, treeData } from './config.js';
import { getCurrentSeason } from './trees.js';

// Bee movement speed
const BEE_SPEED = 30;
const BEE_WANDER_RADIUS = 150;

/**
 * Create a bee object
 */
export function spawnBee(scene, x, y) {
    if (GameState.bees.length >= MAX_BEES) return null;

    const bee = {
        x, y,
        targetX: x,
        targetY: y,
        state: 'patrol',      // patrol, goingToHive, atHive, goingToFlower
        linkedTreeIndex: null,
        graphics: scene.add.graphics(),
        wingPhase: Math.random() * Math.PI * 2,
        pauseTimer: 0,
        hiveCheckTimer: 0
    };

    GameState.bees.push(bee);
    return bee;
}

/**
 * Initialize bees based on existing mature trees
 */
export function initializeBees(scene) {
    GameState.bees = [];

    // Count mature trees with potential for bees
    const matureTrees = GameState.trees.filter(t =>
        t.stage === 'mature' || t.stage === 'old'
    );

    // Spawn 1 bee per 2 mature trees, up to MAX_BEES
    const beeCount = Math.min(Math.floor(matureTrees.length / 2), MAX_BEES, 3);

    for (let i = 0; i < beeCount; i++) {
        // Spawn near a random mature tree
        const tree = matureTrees[Math.floor(Math.random() * matureTrees.length)];
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 60;
        spawnBee(scene, tree.x + offsetX, tree.y + offsetY - 30);
    }

    console.log(`[Bees] Initialized ${GameState.bees.length} bees`);
}

/**
 * Update all bees - movement, hive creation, etc.
 */
export function updateBees(delta) {
    const dt = delta / 1000;
    const season = getCurrentSeason();

    // Bees are less active in winter
    const activityMultiplier = season === 'winter' ? 0.3 : 1.0;

    GameState.bees.forEach((bee, index) => {
        // Update wing animation
        bee.wingPhase += dt * 20;

        // Handle pause timer (for hovering at flowers/hive)
        if (bee.pauseTimer > 0) {
            bee.pauseTimer -= dt;
            drawBee(bee);
            return;
        }

        // State machine
        switch (bee.state) {
            case 'patrol':
                updateBeePatrol(bee, dt, activityMultiplier);
                break;
            case 'goingToHive':
                updateBeeGoingToHive(bee, dt);
                break;
            case 'atHive':
                updateBeeAtHive(bee, dt);
                break;
            case 'goingToFlower':
                updateBeeGoingToFlower(bee, dt);
                break;
        }

        // Periodically check if bee should create a hive
        bee.hiveCheckTimer -= dt;
        if (bee.hiveCheckTimer <= 0) {
            bee.hiveCheckTimer = 10 + Math.random() * 20; // Check every 10-30 seconds
            tryCreateHive(bee);
        }

        drawBee(bee);
    });

    // Spawn new bees if needed (during spring/summer)
    if ((season === 'spring' || season === 'summer') && GameState.bees.length < MAX_BEES) {
        // Small chance to spawn a new bee each frame
        if (Math.random() < 0.0001 * dt * 1000) {
            const matureTrees = GameState.trees.filter(t =>
                t.stage === 'mature' || t.stage === 'old'
            );
            if (matureTrees.length > 0) {
                const tree = matureTrees[Math.floor(Math.random() * matureTrees.length)];
                spawnBee(GameState.scene, tree.x, tree.y - 50);
            }
        }
    }
}

function updateBeePatrol(bee, dt, activityMultiplier) {
    const dx = bee.targetX - bee.x;
    const dy = bee.targetY - bee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
        // Reached target - pick new one
        pickNewPatrolTarget(bee);

        // Sometimes pause to "investigate" a flower
        if (Math.random() < 0.3) {
            bee.pauseTimer = 0.5 + Math.random() * 1.5;
        }
    } else {
        // Move toward target
        const speed = BEE_SPEED * activityMultiplier;
        bee.x += (dx / dist) * speed * dt;
        bee.y += (dy / dist) * speed * dt;
    }

    // Occasionally go to a tree with a hive
    if (bee.linkedTreeIndex !== null && Math.random() < 0.01 * dt) {
        bee.state = 'goingToHive';
    }
}

function pickNewPatrolTarget(bee) {
    // Wander around current area, occasionally visiting trees or flowers
    const shouldVisitTree = Math.random() < 0.4 && GameState.trees.length > 0;

    if (shouldVisitTree) {
        const tree = GameState.trees[Math.floor(Math.random() * GameState.trees.length)];
        bee.targetX = tree.x + (Math.random() - 0.5) * 40;
        bee.targetY = tree.y - 30 + (Math.random() - 0.5) * 20;
    } else {
        // Random wander
        bee.targetX = bee.x + (Math.random() - 0.5) * BEE_WANDER_RADIUS;
        bee.targetY = bee.y + (Math.random() - 0.5) * BEE_WANDER_RADIUS * 0.6;

        // Keep in bounds
        bee.targetX = Math.max(50, Math.min(1350, bee.targetX));
        bee.targetY = Math.max(100, Math.min(800, bee.targetY));
    }
}

function updateBeeGoingToHive(bee, dt) {
    if (bee.linkedTreeIndex === null || bee.linkedTreeIndex >= GameState.trees.length) {
        bee.state = 'patrol';
        return;
    }

    const tree = GameState.trees[bee.linkedTreeIndex];
    const hiveX = tree.x + 20;
    const hiveY = tree.y - 35;

    const dx = hiveX - bee.x;
    const dy = hiveY - bee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
        bee.state = 'atHive';
        bee.pauseTimer = 2 + Math.random() * 3; // Stay at hive for 2-5 seconds
    } else {
        bee.x += (dx / dist) * BEE_SPEED * 1.5 * dt;
        bee.y += (dy / dist) * BEE_SPEED * 1.5 * dt;
    }
}

function updateBeeAtHive(bee, dt) {
    // Bee is at its hive, hover in place
    if (bee.pauseTimer <= 0) {
        bee.state = 'patrol';
        pickNewPatrolTarget(bee);
    }
}

function updateBeeGoingToFlower(bee, dt) {
    // Move toward flower target
    const dx = bee.targetX - bee.x;
    const dy = bee.targetY - bee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
        bee.pauseTimer = 1 + Math.random() * 2; // Hover at flower
        bee.state = 'patrol';
    } else {
        bee.x += (dx / dist) * BEE_SPEED * dt;
        bee.y += (dy / dist) * BEE_SPEED * dt;
    }
}

/**
 * Try to create a hive on a nearby mature tree
 */
function tryCreateHive(bee) {
    // Only if bee doesn't already have a hive
    if (bee.linkedTreeIndex !== null) return;

    // Find nearby mature tree without a hive
    for (let i = 0; i < GameState.trees.length; i++) {
        const tree = GameState.trees[i];
        if ((tree.stage === 'mature' || tree.stage === 'old') && !tree.hasHive) {
            const dx = tree.x - bee.x;
            const dy = tree.y - bee.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 100 && Math.random() < HIVE_CREATION_CHANCE) {
                tree.hasHive = true;
                tree.hiveHoney = 0;
                bee.linkedTreeIndex = i;
                console.log(`[Bees] Created hive on ${tree.type} at (${tree.x}, ${tree.y})`);

                // Import and call drawTree to update visual
                import('./trees.js').then(module => {
                    module.drawTree(tree);
                });
                return;
            }
        }
    }
}

/**
 * Draw a bee
 */
export function drawBee(bee) {
    const g = bee.graphics;
    g.clear();

    // Bobbing motion
    const bob = Math.sin(bee.wingPhase * 0.5) * 2;

    // Body
    g.fillStyle(0xFFD700, 1); // Yellow
    g.fillEllipse(bee.x, bee.y + bob, 8, 6);

    // Stripes
    g.fillStyle(0x2C2C2C, 1); // Black
    g.fillRect(bee.x - 3, bee.y + bob - 2, 2, 4);
    g.fillRect(bee.x + 1, bee.y + bob - 2, 2, 4);

    // Wings (animated)
    const wingY = Math.sin(bee.wingPhase) * 3;
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillEllipse(bee.x - 4, bee.y + bob - 4 + wingY, 5, 3);
    g.fillEllipse(bee.x + 4, bee.y + bob - 4 - wingY, 5, 3);

    // Head
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(bee.x + 5, bee.y + bob, 3);

    // Eyes
    g.fillStyle(0x000000, 1);
    g.fillCircle(bee.x + 6, bee.y + bob - 1, 1);

    // Stinger
    g.fillStyle(0x2C2C2C, 1);
    g.fillTriangle(
        bee.x - 4, bee.y + bob,
        bee.x - 7, bee.y + bob,
        bee.x - 4, bee.y + bob + 1
    );
}

/**
 * Update hive honey production for all trees with hives
 * Called once per day from tree lifecycle
 */
export function updateHiveHoney() {
    GameState.trees.forEach(tree => {
        if (tree.hasHive && tree.hiveHoney < 3) {
            tree.hiveHoney += 1;
        }
    });
}
