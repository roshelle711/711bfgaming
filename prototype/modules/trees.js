/**
 * trees.js - Unified tree system with lifecycle, seasons, and interactions
 *
 * Exports:
 * - createTree: Create a tree object
 * - initializeTrees: Spawn initial trees from config
 * - updateTreeLifecycle: Daily lifecycle progression
 * - drawTree: Render a tree based on stage and season
 * - chopTree: Damage/destroy a tree
 * - harvestFruit: Collect fruit from mature tree
 * - plantSeed: Create new sapling from seed
 * - getCurrentSeason: Get current season string
 * - getTreeYield: Calculate wood/fruit based on stage
 */

import { GameState } from './state.js';
import {
    treeData, treeSpawnPositions, plantableSeeds, seedData,
    TREE_STAGE_THRESHOLDS, FALLEN_WOOD_MULTIPLIER,
    YOUNG_YIELD_MULTIPLIER, OLD_FRUIT_MULTIPLIER,
    DEFAULT_SEASON_LENGTH, SEASONS, GAME_DAY_MINUTES
} from './config.js';

// === SEASON SYSTEM ===

/**
 * Get the current season based on game day and season length setting
 * @returns {string} 'spring' | 'summer' | 'fall' | 'winter'
 */
export function getCurrentSeason() {
    const seasonLength = GameState.settings?.seasonLength || DEFAULT_SEASON_LENGTH;
    const yearLength = seasonLength * 4;
    const dayInYear = (GameState.day - 1) % yearLength;  // Day 1 = start of spring
    const seasonIndex = Math.floor(dayInYear / seasonLength);
    return SEASONS[seasonIndex] || 'summer';
}

/**
 * Get the day number within the current season (1-based)
 */
export function getDayInSeason() {
    const seasonLength = GameState.settings?.seasonLength || DEFAULT_SEASON_LENGTH;
    const dayInYear = (GameState.day - 1) % (seasonLength * 4);
    return (dayInYear % seasonLength) + 1;
}

/**
 * Get the current year number (1-based)
 */
export function getCurrentYear() {
    const seasonLength = GameState.settings?.seasonLength || DEFAULT_SEASON_LENGTH;
    const yearLength = seasonLength * 4;
    return Math.floor((GameState.day - 1) / yearLength) + 1;
}

// === TREE LIFECYCLE ===

/**
 * Get the lifecycle stage for a tree based on days since planted
 * @param {number} dayPlanted - The game day when tree was planted
 * @returns {string} 'sapling' | 'young' | 'mature' | 'old' | 'fallen'
 */
export function getTreeStage(dayPlanted) {
    const age = GameState.day - dayPlanted;

    if (age >= TREE_STAGE_THRESHOLDS.fallen) return 'fallen';
    if (age >= TREE_STAGE_THRESHOLDS.old) return 'old';
    if (age >= TREE_STAGE_THRESHOLDS.mature) return 'mature';
    if (age >= TREE_STAGE_THRESHOLDS.young) return 'young';
    return 'sapling';
}

/**
 * Create a tree object
 */
export function createTree(scene, type, x, y, initialStage = 'mature') {
    const data = treeData[type];
    if (!data) {
        console.warn(`[Trees] Unknown tree type: ${type}`);
        return null;
    }

    // Calculate dayPlanted based on initial stage
    let dayPlanted = GameState.day;
    if (initialStage === 'mature') {
        dayPlanted = GameState.day - TREE_STAGE_THRESHOLDS.mature;
    } else if (initialStage === 'young') {
        dayPlanted = GameState.day - TREE_STAGE_THRESHOLDS.young;
    } else if (initialStage === 'old') {
        dayPlanted = GameState.day - TREE_STAGE_THRESHOLDS.old;
    } else if (initialStage === 'fallen') {
        dayPlanted = GameState.day - TREE_STAGE_THRESHOLDS.fallen;
    }

    const tree = {
        type,
        x, y,
        dayPlanted,
        stage: initialStage,
        hp: 5,
        maxHp: 5,
        hasHive: false,
        hiveHoney: 0,
        graphics: scene.add.graphics(),
        fruitReady: initialStage === 'mature' || initialStage === 'old',
        lastFruitHarvest: 0
    };

    drawTree(tree);
    return tree;
}

/**
 * Initialize trees from spawn positions
 */
export function initializeTrees(scene) {
    GameState.trees = [];

    treeSpawnPositions.forEach(pos => {
        const tree = createTree(scene, pos.type, pos.x, pos.y, pos.stage || 'mature');
        if (tree) {
            GameState.trees.push(tree);
        }
    });

    console.log(`[Trees] Initialized ${GameState.trees.length} trees`);
}

/**
 * Update tree lifecycle - call once per game day
 */
export function updateTreeLifecycle() {
    const treesToRemove = [];

    GameState.trees.forEach((tree, index) => {
        const newStage = getTreeStage(tree.dayPlanted);

        // Check if stage changed
        if (newStage !== tree.stage) {
            const oldStage = tree.stage;
            tree.stage = newStage;

            // Handle falling transition
            if (newStage === 'fallen' && oldStage !== 'fallen') {
                onTreeFall(tree, index);
            }

            // Redraw tree
            drawTree(tree);
        }

        // Fruit regrowth for mature/old trees
        if ((tree.stage === 'mature' || tree.stage === 'old') && !tree.fruitReady) {
            const data = treeData[tree.type];
            if (data.fruit) {
                // Fruit regrows after 1 day
                if (GameState.day > tree.lastFruitHarvest) {
                    tree.fruitReady = true;
                    drawTree(tree);
                }
            }
        }

        // Hive honey production
        if (tree.hasHive && tree.hiveHoney < 3) {
            tree.hiveHoney = Math.min(3, tree.hiveHoney + 1);
        }
    });

    // Remove destroyed trees
    treesToRemove.forEach(index => {
        const tree = GameState.trees[index];
        if (tree.graphics) tree.graphics.destroy();
        GameState.trees.splice(index, 1);
    });
}

/**
 * Handle tree falling - animated leaf splash + drop fruit and seeds
 */
function onTreeFall(tree, index) {
    const data = treeData[tree.type];
    const scene = GameState.scene;

    console.log(`[Trees] ${data.name} has fallen!`);

    // Animated leaf splash effect
    if (scene) {
        createLeafSplash(scene, tree.x, tree.y, data);
    }

    // Drop fruit pickups if fruit tree
    if (data.fruit && data.baseFruit > 0) {
        const fruitCount = Math.floor(Math.random() * 3) + 2; // 2-4 fruit
        for (let i = 0; i < fruitCount; i++) {
            const offsetX = (Math.random() - 0.5) * 60;
            const offsetY = (Math.random() - 0.5) * 40;
            // Add to fruits inventory directly for now
            GameState.inventory.fruits[data.fruit] = (GameState.inventory.fruits[data.fruit] || 0) + 1;
        }
        console.log(`[Trees] Dropped ${fruitCount} ${data.fruit}`);
    }

    // Drop seed pickup
    if (data.seed) {
        GameState.inventory.treeSeeds[data.seed] = (GameState.inventory.treeSeeds[data.seed] || 0) + 1;
        console.log(`[Trees] Dropped 1 ${data.seed}`);
    }
}

/**
 * Create animated leaf splash effect when tree falls
 */
function createLeafSplash(scene, x, y, treeData) {
    const season = getCurrentSeason();
    const leafColor = treeData.canopyColor?.[season] || treeData.canopyColor?.summer || 0x228B22;
    const fallColors = [leafColor, 0xDAA520, 0xCD853F, 0x8B4513]; // Mix of canopy + fall colors

    // Create 15-25 leaf particles
    const leafCount = 15 + Math.floor(Math.random() * 10);
    const leaves = [];

    for (let i = 0; i < leafCount; i++) {
        const leaf = scene.add.graphics();
        const color = fallColors[Math.floor(Math.random() * fallColors.length)];

        leaves.push({
            graphics: leaf,
            x: x + (Math.random() - 0.5) * 30,
            y: y - 40 - Math.random() * 30, // Start from canopy height
            vx: (Math.random() - 0.5) * 80, // Horizontal velocity
            vy: Math.random() * 30 + 20,     // Downward velocity
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 8,
            size: 3 + Math.random() * 4,
            color: color,
            alpha: 1,
            lifetime: 0
        });
    }

    // Animate leaves falling
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const animateLeaves = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
            // Clean up all leaf graphics
            leaves.forEach(leaf => leaf.graphics.destroy());
            return;
        }

        leaves.forEach(leaf => {
            // Update physics
            leaf.x += leaf.vx * 0.016; // ~60fps
            leaf.y += leaf.vy * 0.016;
            leaf.vy += 50 * 0.016; // Gravity
            leaf.vx *= 0.98; // Air resistance
            leaf.rotation += leaf.rotationSpeed * 0.016;

            // Wobble effect
            leaf.x += Math.sin(elapsed * 0.01 + leaf.rotation) * 0.5;

            // Fade out in last 30%
            if (progress > 0.7) {
                leaf.alpha = 1 - ((progress - 0.7) / 0.3);
            }

            // Draw leaf
            leaf.graphics.clear();
            leaf.graphics.fillStyle(leaf.color, leaf.alpha);

            // Rotate and draw leaf shape
            const cos = Math.cos(leaf.rotation);
            const sin = Math.sin(leaf.rotation);
            const s = leaf.size;

            // Simple leaf shape (elongated ellipse)
            leaf.graphics.fillEllipse(leaf.x, leaf.y, s * 1.5, s * 0.8);

            // Stem/vein
            leaf.graphics.lineStyle(1, leaf.color * 0.8, leaf.alpha * 0.5);
            leaf.graphics.lineBetween(
                leaf.x - s * 0.5 * cos,
                leaf.y - s * 0.5 * sin,
                leaf.x + s * 0.5 * cos,
                leaf.y + s * 0.5 * sin
            );
        });

        requestAnimationFrame(animateLeaves);
    };

    animateLeaves();
}

// === TREE RENDERING ===

/**
 * Draw a tree based on its stage and current season
 */
export function drawTree(tree) {
    const g = tree.graphics;
    g.clear();

    const data = treeData[tree.type];
    if (!data) return;

    const season = getCurrentSeason();
    const canopyColor = data.canopyColor[season] || data.canopyColor.summer;
    const trunkColor = data.trunkColor || 0x8B4513;

    switch (tree.stage) {
        case 'sapling':
            drawSapling(g, tree.x, tree.y, canopyColor);
            break;
        case 'young':
            drawYoungTree(g, tree.x, tree.y, canopyColor, trunkColor, data, season);
            break;
        case 'mature':
            drawMatureTree(g, tree.x, tree.y, canopyColor, trunkColor, data, season, tree.fruitReady);
            break;
        case 'old':
            drawOldTree(g, tree.x, tree.y, canopyColor, trunkColor, data, season, tree.fruitReady);
            break;
        case 'fallen':
            drawFallenTree(g, tree.x, tree.y, trunkColor, data);
            break;
    }

    // Draw hive if present
    if (tree.hasHive && tree.stage !== 'fallen') {
        drawHive(g, tree.x, tree.y, tree.hiveHoney);
    }
}

function drawSapling(g, x, y, canopyColor) {
    // Small stem
    g.fillStyle(0x8B4513);
    g.fillRect(x - 2, y - 15, 4, 15);

    // Tiny leaves
    g.fillStyle(canopyColor);
    g.fillCircle(x, y - 20, 8);
    g.fillCircle(x - 5, y - 16, 5);
    g.fillCircle(x + 5, y - 16, 5);
}

function drawYoungTree(g, x, y, canopyColor, trunkColor, data, season) {
    // Half-height trunk
    g.fillStyle(trunkColor);
    g.fillRect(x - 4, y - 30, 8, 30);

    // Small canopy
    g.fillStyle(canopyColor);
    if (data.deciduous && season === 'winter') {
        // Bare branches
        drawBranches(g, x, y - 30, 15, trunkColor);
    } else {
        g.fillCircle(x, y - 40, 18);
        g.fillCircle(x - 10, y - 35, 12);
        g.fillCircle(x + 10, y - 35, 12);
    }

    // Spring blossoms
    if (season === 'spring' && data.blossomColor) {
        drawBlossoms(g, x, y - 40, 12, data.blossomColor);
    }
}

function drawMatureTree(g, x, y, canopyColor, trunkColor, data, season, hasFruit) {
    // Full trunk
    g.fillStyle(trunkColor);
    g.fillRect(x - 6, y - 50, 12, 50);

    // Full canopy
    g.fillStyle(canopyColor);
    if (data.deciduous && season === 'winter') {
        // Bare branches with snow
        drawBranches(g, x, y - 50, 25, trunkColor);
        drawSnow(g, x, y - 60, 20);
    } else {
        g.fillCircle(x, y - 65, 28);
        g.fillCircle(x - 18, y - 55, 18);
        g.fillCircle(x + 18, y - 55, 18);
        g.fillCircle(x - 10, y - 45, 15);
        g.fillCircle(x + 10, y - 45, 15);

        // Pine tree shape for evergreens
        if (!data.deciduous) {
            g.fillStyle(canopyColor);
            // Triangle shape
            g.fillTriangle(x, y - 80, x - 25, y - 40, x + 25, y - 40);
            g.fillTriangle(x, y - 65, x - 20, y - 35, x + 20, y - 35);

            if (season === 'winter') {
                drawSnow(g, x, y - 70, 15);
            }
        }
    }

    // Spring blossoms
    if (season === 'spring' && data.blossomColor) {
        drawBlossoms(g, x, y - 65, 20, data.blossomColor);
    }

    // Summer/fall fruit
    if (hasFruit && data.fruit && (season === 'summer' || season === 'fall')) {
        drawFruit(g, x, y - 55, data);
    }
}

function drawOldTree(g, x, y, canopyColor, trunkColor, data, season, hasFruit) {
    // Gnarled trunk
    g.fillStyle(trunkColor);
    g.fillRect(x - 8, y - 55, 16, 55);
    g.fillRect(x - 12, y - 10, 6, 10); // Root
    g.fillRect(x + 6, y - 8, 6, 8);    // Root

    // Slightly sparse canopy
    g.fillStyle(canopyColor);
    if (data.deciduous && season === 'winter') {
        drawBranches(g, x, y - 55, 28, trunkColor);
        drawSnow(g, x, y - 65, 18);
    } else {
        g.fillCircle(x, y - 70, 25);
        g.fillCircle(x - 20, y - 60, 15);
        g.fillCircle(x + 18, y - 58, 16);
    }

    // Reduced fruit for old trees
    if (hasFruit && data.fruit && (season === 'summer' || season === 'fall')) {
        drawFruit(g, x, y - 58, data, true); // sparse = true
    }
}

function drawFallenTree(g, x, y, trunkColor, data) {
    // Horizontal log
    g.fillStyle(trunkColor);
    g.fillRect(x - 40, y - 8, 80, 16);

    // Rings on cut end
    g.fillStyle(0xDEB887);
    g.fillCircle(x + 40, y, 7);
    g.fillStyle(trunkColor);
    g.fillCircle(x + 40, y, 4);

    // Scattered leaves
    const leafColor = data.canopyColor?.fall || 0xCD853F;
    g.fillStyle(leafColor, 0.6);
    for (let i = 0; i < 5; i++) {
        const lx = x - 30 + Math.random() * 60;
        const ly = y - 15 + Math.random() * 10;
        g.fillCircle(lx, ly, 4);
    }
}

function drawBranches(g, x, y, size, color) {
    g.lineStyle(2, color);
    // Main branches
    g.lineBetween(x, y, x - size, y - size * 0.8);
    g.lineBetween(x, y, x + size, y - size * 0.7);
    g.lineBetween(x, y - 5, x - size * 0.6, y - size * 1.2);
    g.lineBetween(x, y - 5, x + size * 0.5, y - size * 1.1);
}

function drawSnow(g, x, y, size) {
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(x - size * 0.5, y, 5);
    g.fillCircle(x + size * 0.3, y + 3, 4);
    g.fillCircle(x, y - 5, 6);
}

function drawBlossoms(g, x, y, size, color) {
    g.fillStyle(color, 0.8);
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const bx = x + Math.cos(angle) * size * 0.8;
        const by = y + Math.sin(angle) * size * 0.6;
        g.fillCircle(bx, by, 4);
    }
}

function drawFruit(g, x, y, data, sparse = false) {
    const fruitColors = {
        apple: 0xE74C3C,
        orange: 0xF39C12,
        cherry: 0xC0392B,
        peach: 0xFFCBA4
    };
    const color = fruitColors[data.fruit] || 0xFF6B6B;
    g.fillStyle(color);

    const count = sparse ? 2 : 4;
    for (let i = 0; i < count; i++) {
        const fx = x - 15 + (i * 10);
        const fy = y + (i % 2) * 8;
        g.fillCircle(fx, fy, 4);
    }
}

function drawHive(g, x, y, honeyLevel) {
    // Beehive on tree
    const hiveY = y - 35;

    // Hive body
    g.fillStyle(0xDAA520);
    g.fillRect(x + 15, hiveY, 12, 15);
    g.fillStyle(0xB8860B);
    g.fillRect(x + 15, hiveY + 5, 12, 3);
    g.fillRect(x + 15, hiveY + 10, 12, 3);

    // Entrance
    g.fillStyle(0x2C1810);
    g.fillCircle(x + 21, hiveY + 13, 3);

    // Honey indicator
    if (honeyLevel > 0) {
        g.fillStyle(0xFFD700, 0.8);
        g.fillCircle(x + 21, hiveY + 2, honeyLevel + 1);
    }
}

// === TREE INTERACTIONS ===

/**
 * Chop a tree - deals damage and yields resources
 * @returns {object} { destroyed: boolean, drops: { wood, fruit, seed } }
 */
export function chopTree(treeIndex) {
    const tree = GameState.trees[treeIndex];
    if (!tree) return { destroyed: false, drops: {} };

    const data = treeData[tree.type];

    // Saplings can't be chopped
    if (tree.stage === 'sapling') {
        return { destroyed: false, drops: {}, message: 'Too small to chop!' };
    }

    // Deal damage
    tree.hp -= 1;

    if (tree.hp <= 0) {
        // Tree destroyed - calculate yields
        const drops = getTreeYield(tree);

        // Add to inventory
        GameState.inventory.resources.wood += drops.wood;
        if (drops.fruit > 0 && data.fruit) {
            GameState.inventory.fruits[data.fruit] = (GameState.inventory.fruits[data.fruit] || 0) + drops.fruit;
        }
        if (drops.seed && data.seed) {
            GameState.inventory.treeSeeds[data.seed] = (GameState.inventory.treeSeeds[data.seed] || 0) + drops.seed;
        }

        // Remove tree
        tree.graphics.destroy();
        GameState.trees.splice(treeIndex, 1);

        return { destroyed: true, drops };
    }

    // Still standing - show damage
    drawTree(tree);
    return { destroyed: false, drops: {} };
}

/**
 * Calculate yield based on tree stage
 */
export function getTreeYield(tree) {
    const data = treeData[tree.type];
    let woodMultiplier = 1.0;
    let fruitMultiplier = 1.0;
    let seedChance = 0.1; // 10% base chance for seed

    switch (tree.stage) {
        case 'sapling':
            return { wood: 0, fruit: 0, seed: 0 };
        case 'young':
            woodMultiplier = YOUNG_YIELD_MULTIPLIER;
            fruitMultiplier = YOUNG_YIELD_MULTIPLIER;
            seedChance = 0.05;
            break;
        case 'mature':
            woodMultiplier = 1.0;
            fruitMultiplier = 1.0;
            seedChance = 0.15;
            break;
        case 'old':
            woodMultiplier = 1.0;
            fruitMultiplier = OLD_FRUIT_MULTIPLIER;
            seedChance = 0.2;
            break;
        case 'fallen':
            woodMultiplier = FALLEN_WOOD_MULTIPLIER;
            fruitMultiplier = 0; // Already dropped
            seedChance = 0; // Already dropped
            break;
    }

    const wood = Math.floor(data.baseWood * woodMultiplier);
    const fruit = Math.floor(data.baseFruit * fruitMultiplier);
    const seed = Math.random() < seedChance ? 1 : 0;

    return { wood, fruit, seed };
}

/**
 * Harvest fruit from a tree
 * @returns {number} Amount of fruit harvested
 */
export function harvestFruit(treeIndex) {
    const tree = GameState.trees[treeIndex];
    if (!tree || !tree.fruitReady) return 0;

    const data = treeData[tree.type];
    if (!data.fruit) return 0;

    let amount = data.baseFruit;
    if (tree.stage === 'old') {
        amount = Math.floor(amount * OLD_FRUIT_MULTIPLIER);
    } else if (tree.stage === 'young') {
        amount = Math.floor(amount * YOUNG_YIELD_MULTIPLIER);
    }

    // Add to inventory
    GameState.inventory.fruits[data.fruit] = (GameState.inventory.fruits[data.fruit] || 0) + amount;

    // Mark as harvested
    tree.fruitReady = false;
    tree.lastFruitHarvest = GameState.day;
    drawTree(tree);

    return amount;
}

/**
 * Harvest honey from a tree's hive
 * @returns {number} Amount of honey harvested
 */
export function harvestHoney(treeIndex) {
    const tree = GameState.trees[treeIndex];
    if (!tree || !tree.hasHive || tree.hiveHoney === 0) return 0;

    const amount = tree.hiveHoney;
    tree.hiveHoney = 0;

    GameState.inventory.resources.honey = (GameState.inventory.resources.honey || 0) + amount;

    drawTree(tree);
    return amount;
}

/**
 * Plant a tree seed
 * @returns {object|null} The created tree or null if failed
 */
export function plantSeed(scene, seedType, x, y) {
    const treeType = plantableSeeds[seedType];
    if (!treeType) {
        console.warn(`[Trees] Unknown seed type: ${seedType}`);
        return null;
    }

    // Check if player has seed
    if (!GameState.inventory.treeSeeds[seedType] || GameState.inventory.treeSeeds[seedType] <= 0) {
        return null;
    }

    // Check for existing tree nearby
    const minDistance = 50;
    for (const tree of GameState.trees) {
        const dist = Math.sqrt((tree.x - x) ** 2 + (tree.y - y) ** 2);
        if (dist < minDistance) {
            return null; // Too close to another tree
        }
    }

    // Consume seed
    GameState.inventory.treeSeeds[seedType] -= 1;

    // Create sapling
    const tree = createTree(scene, treeType, x, y, 'sapling');
    if (tree) {
        tree.dayPlanted = GameState.day; // Start fresh
        GameState.trees.push(tree);
        console.log(`[Trees] Planted ${seedType} at (${x}, ${y})`);
    }

    return tree;
}

/**
 * Find tree at position
 * @returns {number} Tree index or -1 if not found
 */
export function findTreeAtPosition(x, y, radius = 40) {
    for (let i = 0; i < GameState.trees.length; i++) {
        const tree = GameState.trees[i];
        const dist = Math.sqrt((tree.x - x) ** 2 + (tree.y - y) ** 2);
        if (dist < radius) {
            return i;
        }
    }
    return -1;
}

/**
 * Check if player is near any tree
 */
export function getNearbyTree(playerX, playerY, radius = 50) {
    const index = findTreeAtPosition(playerX, playerY, radius);
    if (index >= 0) {
        return { index, tree: GameState.trees[index] };
    }
    return null;
}
