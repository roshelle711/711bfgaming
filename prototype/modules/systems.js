/**
 * systems.js - Farming, fishing, cooking, shop mechanics
 *
 * Exports:
 * - hoePlot(plot): Hoe a grass plot to tilled
 * - plantSeed(plot): Plant current seed in tilled plot
 * - harvestCrop(plot): Harvest ready crop
 * - updatePlantGrowth(delta): Update plant growth timers
 * - waterPlot(plot): Water a planted crop
 * - removeHazard(plot): Remove weeds/bugs from plot
 * - harvestFruit(tree): Harvest fruit from tree
 * - findNearestFruitTree(): Find nearest fruit tree
 * - updateFruitRegrowth(delta): Update fruit regrowth timers
 * - startFishing(): Start fishing at pond
 * - updateFishing(delta): Update fishing timer
 * - showShopMenu(): Display shop menu
 * - showCraftingMenu(): Display crafting menu
 * - craftItem(item): Craft a recipe
 * - sellItem(category, item): Sell an item
 * - checkSeedPickups(): Check for seed pickup collection
 * - respawnSeedPickups(delta): Respawn collected seeds
 */

import { seedTypes, fishTypes, recipes, sellPrices, seedBuyPrices, cropData, fruitData, fruitTreePositions } from './config.js';
import { GameState } from './state.js';
import { showDialog, closeDialog, updateInventoryDisplay, updateCoinDisplay, updateSeedIndicator } from './ui.js';
import { drawPlot, drawPlant, drawSeedPickup, drawFruitTree } from './world.js';
import { sendFarmAction, sendCollectSeed, sendWaterAction, sendRemoveHazard, sendHarvestFruit } from './multiplayer.js';

/**
 * Hoe a grass plot to prepare for planting
 * Server-authoritative when connected, local fallback for single-player
 */
export function hoePlot(plot) {
    if (plot.state !== 'grass') return;

    if (GameState.room) {
        // Server-authoritative: send action, server will sync state back
        sendFarmAction(plot.index, 'hoe');
    } else {
        // Single-player fallback
        plot.state = 'tilled';
        plot.usageCount = 0; // Reset usage when freshly hoed
        drawPlot(plot);
    }
}

/**
 * Plant the currently selected seed in a tilled plot
 * Server-authoritative when connected, local fallback for single-player
 */
export function plantSeed(plot, scene) {
    if (plot.state !== 'tilled') return false;

    const seedType = seedTypes[GameState.currentSeedIndex];
    if (GameState.inventory.seeds[seedType] <= 0) return false;

    if (GameState.room) {
        // Server-authoritative: deduct seed locally, send action
        // Server will handle plot state, client syncs via schema
        GameState.inventory.seeds[seedType]--;
        sendFarmAction(plot.index, 'plant', seedType);
        updateInventoryDisplay();
        updateSeedIndicator();
        return true;
    } else {
        // Single-player fallback
        GameState.inventory.seeds[seedType]--;
        plot.state = 'planted';
        plot.crop = seedType;
        plot.growthTimer = 0;
        drawPlot(plot);
        drawPlant(scene, plot);
        updateInventoryDisplay();
        updateSeedIndicator();
        return true;
    }
}

/**
 * Harvest a ready crop
 * Server-authoritative when connected, local fallback for single-player
 */
export function harvestCrop(plot) {
    if (plot.state !== 'ready' || !plot.crop) return false;

    if (GameState.room) {
        // Server-authoritative: send action
        // Server broadcasts cropHarvested, we add to inventory in message handler
        sendFarmAction(plot.index, 'harvest');
        return true;
    } else {
        // Single-player fallback
        GameState.inventory.crops[plot.crop]++;

        // Increment usage and check if plot is exhausted
        plot.usageCount = (plot.usageCount || 0) + 1;
        const USAGE_LIMIT = 5;

        if (plot.usageCount >= USAGE_LIMIT) {
            // Plot exhausted - revert to grass
            plot.state = 'grass';
            plot.usageCount = 0;
        } else {
            plot.state = 'tilled';
        }

        plot.crop = null;
        plot.growthTimer = 0;
        plot.isWatered = false;
        plot.harvestTime = GameState.gameTime;
        if (plot.plantGraphics) {
            plot.plantGraphics.destroy();
            plot.plantGraphics = null;
        }
        drawPlot(plot);
        updateInventoryDisplay();
        return true;
    }
}

/**
 * Update plant growth for all farm plots
 * Skip when connected - server handles growth and syncs via schema
 */
export function updatePlantGrowth(scene, delta) {
    // Server handles growth when connected
    if (GameState.room) return;

    // Single-player fallback
    const isDruid = GameState.playerClass === 'druid';
    const growthMultiplier = isDruid ? 1.2 : 1.0;
    const GAME_DAY_MINUTES = 1440;
    const RESET_DAYS = 3;

    GameState.farmPlots.forEach(plot => {
        if (plot.state === 'planted' || plot.state === 'growing') {
            plot.growthTimer += delta * growthMultiplier;

            if (plot.state === 'planted' && plot.growthTimer >= 3000) {
                plot.state = 'growing';
                drawPlant(scene, plot);
            } else if (plot.state === 'growing' && plot.growthTimer >= 8000) {
                plot.state = 'ready';
                drawPlant(scene, plot);
            }
        }

        // Reset tilled plots to grass after 3 game days
        if (plot.state === 'tilled' && plot.harvestTime !== undefined) {
            // Calculate time elapsed since harvest (handle day wraparound)
            let elapsed = GameState.gameTime - plot.harvestTime;
            if (elapsed < 0) elapsed += GAME_DAY_MINUTES; // Handle day change

            // Track cumulative time if we've been tilled for a while
            if (!plot.tilledDuration) plot.tilledDuration = 0;
            plot.tilledDuration += delta / 1000 * GameState.timeSpeed; // Convert to game minutes

            if (plot.tilledDuration >= GAME_DAY_MINUTES * RESET_DAYS) {
                plot.state = 'grass';
                plot.harvestTime = undefined;
                plot.tilledDuration = 0;
                drawPlot(plot);
            }
        }
    });
}

/**
 * Cycle to next seed type
 */
export function cycleSeedType() {
    GameState.currentSeedIndex = (GameState.currentSeedIndex + 1) % seedTypes.length;
    updateSeedIndicator();
}

/**
 * Start fishing at the pond
 */
export function startFishing() {
    if (GameState.isFishing) return;

    GameState.isFishing = true;
    GameState.fishingTimer = 0;
    GameState.fishingCatchTime = 2000 + Math.random() * 3000; // Set catch time once
    showFishingStatus('🎣 Casting...');
}

/**
 * Show brief fishing status (non-blocking notification)
 */
function showFishingStatus(text) {
    if (!GameState.fishingNotification) {
        // Create notification if it doesn't exist
        const scene = GameState.scene;
        if (scene) {
            GameState.fishingNotification = scene.add.text(180, 650, '', {
                fontSize: '16px',
                fill: '#fff',
                backgroundColor: '#00000099',
                padding: { x: 10, y: 6 }
            }).setOrigin(0.5).setDepth(100);
        }
    }
    if (GameState.fishingNotification) {
        GameState.fishingNotification.setText(text).setVisible(true);
    }
}

/**
 * Update fishing timer and catch fish
 */
export function updateFishing(delta) {
    if (!GameState.isFishing) return;

    GameState.fishingTimer += delta;

    // Update status while waiting
    if (GameState.fishingTimer < GameState.fishingCatchTime) {
        const dots = '.'.repeat(Math.floor(GameState.fishingTimer / 500) % 4);
        showFishingStatus(`🎣 Waiting${dots}`);
        return;
    }

    // Catch the fish!
    const isShaman = GameState.playerClass === 'shaman';
    const weights = isShaman ? [0.3, 0.4, 0.3] : [0.5, 0.35, 0.15];

    const roll = Math.random();
    let fishIndex = 0;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) {
            fishIndex = i;
            break;
        }
    }

    const fish = fishTypes[fishIndex];
    GameState.inventory.fish[fish]++;
    updateInventoryDisplay();

    const emoji = { bass: '🐟', salmon: '🐠', goldfish: '✨' };
    showFishingStatus(`${emoji[fish]} Caught ${fish}!`);

    // Brief pause, then continue fishing automatically
    GameState.isFishing = false;
    GameState.fishingTimer = 0;

    // Auto-continue fishing after showing catch for 1 second
    setTimeout(() => {
        if (GameState.fishingNotification) {
            GameState.fishingNotification.setVisible(false);
        }
        // Don't auto-restart - let player click again if they want to continue
    }, 1500);
}

/**
 * Show the shop menu with sell and buy options
 */
export function showShopMenu() {
    const inv = GameState.inventory;
    const prices = sellPrices;

    let text = `═══ 🛒 FINN'S SHOP ═══  (You have: ${GameState.coins}💰)\n\n`;
    text += "─── SELL ───────────────────────────────────────\n";
    text += `1: 🥕 Carrot (${inv.crops.carrot}) → ${prices.crops.carrot}💰  `;
    text += `2: 🍅 Tomato (${inv.crops.tomato}) → ${prices.crops.tomato}💰  `;
    text += `3: 🌸 Flower (${inv.crops.flower}) → ${prices.crops.flower}💰\n`;
    text += `4: 🐟 Bass (${inv.fish.bass}) → ${prices.fish.bass}💰  `;
    text += `5: 🐠 Salmon (${inv.fish.salmon}) → ${prices.fish.salmon}💰  `;
    text += `6: ✨ Goldfish (${inv.fish.goldfish}) → ${prices.fish.goldfish}💰\n`;
    text += `7: 🥗 Salad (${inv.crafted.salad}) → 50💰  `;
    text += `8: 💐 Bouquet (${inv.crafted.bouquet}) → 80💰\n\n`;
    text += "─── BUY SEEDS ──────────────────────────────────\n";
    text += `Q: 🥕 Carrot ${seedBuyPrices.carrot}💰  `;
    text += `W: 🍅 Tomato ${seedBuyPrices.tomato}💰  `;
    text += `R: 🌸 Flower ${seedBuyPrices.flower}💰\n`;
    text += `A: 🥬 Lettuce ${seedBuyPrices.lettuce}💰  `;
    text += `S: 🧅 Onion ${seedBuyPrices.onion}💰  `;
    text += `D: 🥔 Potato ${seedBuyPrices.potato}💰\n`;
    text += `Z: 🌶️ Pepper ${seedBuyPrices.pepper}💰  `;
    text += `X: 🌽 Corn ${seedBuyPrices.corn}💰  `;
    text += `C: 🎃 Pumpkin ${seedBuyPrices.pumpkin}💰\n\n`;
    text += "[1-8 sell, Q/W/R/A/S/D/Z/X/C buy, ESC to close]";

    showDialog(text);

    const scene = GameState.scene;
    if (scene) {
        // Sell keys
        scene.input.keyboard.once('keydown-ONE', () => sellItem('crops', 'carrot'));
        scene.input.keyboard.once('keydown-TWO', () => sellItem('crops', 'tomato'));
        scene.input.keyboard.once('keydown-THREE', () => sellItem('crops', 'flower'));
        scene.input.keyboard.once('keydown-FOUR', () => sellItem('fish', 'bass'));
        scene.input.keyboard.once('keydown-FIVE', () => sellItem('fish', 'salmon'));
        scene.input.keyboard.once('keydown-SIX', () => sellItem('fish', 'goldfish'));
        scene.input.keyboard.once('keydown-SEVEN', () => sellItem('crafted', 'salad'));
        scene.input.keyboard.once('keydown-EIGHT', () => sellItem('crafted', 'bouquet'));
        // Buy seed keys
        scene.input.keyboard.once('keydown-Q', () => buySeed('carrot'));
        scene.input.keyboard.once('keydown-W', () => buySeed('tomato'));
        scene.input.keyboard.once('keydown-R', () => buySeed('flower'));
        scene.input.keyboard.once('keydown-A', () => buySeed('lettuce'));
        scene.input.keyboard.once('keydown-S', () => buySeed('onion'));
        scene.input.keyboard.once('keydown-D', () => buySeed('potato'));
        scene.input.keyboard.once('keydown-Z', () => buySeed('pepper'));
        scene.input.keyboard.once('keydown-X', () => buySeed('corn'));
        scene.input.keyboard.once('keydown-C', () => buySeed('pumpkin'));
    }
}

/**
 * Buy a seed from the shop
 */
export function buySeed(seedType) {
    const price = seedBuyPrices[seedType];
    if (!price) return false;

    if (GameState.coins >= price) {
        GameState.coins -= price;
        GameState.inventory.seeds[seedType]++;
        updateInventoryDisplay();
        updateCoinDisplay();
        updateSeedIndicator();
        showShopMenu(); // Refresh menu
        return true;
    }
    return false;
}

/**
 * Show the cooking/crafting menu
 */
export function showCraftingMenu() {
    const inv = GameState.inventory;
    GameState.craftingOpen = true;

    let text = "═══ 🍳 COOKING ═══\n\n";
    text += "RECIPES:\n";
    text += `1: 🥗 Salad = 🥕1 + 🍅1 (have: ${inv.crops.carrot}/${inv.crops.tomato})\n`;
    text += `2: 💐 Bouquet = 🌸3 (have: ${inv.crops.flower})\n`;
    text += `3: 🍲 Fish Stew = 🐟2 + 🍅1 (have: ${inv.fish.bass}/${inv.crops.tomato})\n`;
    text += `4: ✨ Magic Potion = 🌸2 + ✨🐟1 (have: ${inv.crops.flower}/${inv.fish.goldfish})\n\n`;
    text += "[1-4 to cook, E/ESC to close]";

    showDialog(text);

    const scene = GameState.scene;
    if (scene) {
        scene.input.keyboard.once('keydown-ONE', () => craftItem('salad'));
        scene.input.keyboard.once('keydown-TWO', () => craftItem('bouquet'));
        scene.input.keyboard.once('keydown-THREE', () => craftItem('fishStew'));
        scene.input.keyboard.once('keydown-FOUR', () => craftItem('magicPotion'));
    }
}

/**
 * Craft an item from recipe
 */
export function craftItem(item) {
    const recipe = recipes[item];
    if (!recipe) return false;

    const inv = GameState.inventory;
    let canCraft = true;

    // Check if we have all ingredients
    for (const [ing, amount] of Object.entries(recipe.ingredients)) {
        const have = inv.crops[ing] ?? inv.fish[ing] ?? 0;
        if (have < amount) canCraft = false;
    }

    if (canCraft) {
        // Consume ingredients
        for (const [ing, amount] of Object.entries(recipe.ingredients)) {
            if (inv.crops[ing] !== undefined) inv.crops[ing] -= amount;
            else if (inv.fish[ing] !== undefined) inv.fish[ing] -= amount;
        }
        inv.crafted[item]++;
        updateInventoryDisplay();
        showCraftingMenu(); // Refresh menu
        return true;
    }
    return false;
}

/**
 * Sell an item at the shop
 */
export function sellItem(category, item) {
    const inv = GameState.inventory;
    if (inv[category][item] > 0) {
        inv[category][item]--;
        GameState.coins += sellPrices[category]?.[item] ?? 50;
        updateInventoryDisplay();
        updateCoinDisplay();
        showShopMenu(); // Refresh menu
        return true;
    }
    return false;
}

/**
 * Check if player is collecting seed pickups
 * Server-authoritative when connected, local fallback for single-player
 */
export function checkSeedPickups() {
    const player = GameState.player;
    if (!player) return;

    GameState.seedPickups.forEach((pickup, index) => {
        if (pickup.isCollected) return;

        const dx = player.x - pickup.x;
        const dy = player.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
            if (GameState.room) {
                // Server-authoritative: send collection
                // Server broadcasts seedCollected, we add to inventory in message handler
                sendCollectSeed(pickup.index !== undefined ? pickup.index : index);
            } else {
                // Single-player fallback
                pickup.isCollected = true;

                // Hunter class gets extra seeds
                const amount = GameState.playerClass === 'hunter' ? 2 : 1;
                GameState.inventory.seeds[pickup.seedType] += amount;

                pickup.graphics.clear();
                updateInventoryDisplay();
                updateSeedIndicator();
            }
        }
    });
}

/**
 * Respawn collected seed pickups after delay
 * Skip when connected - server handles respawns and syncs via schema
 */
export function respawnSeedPickups(scene, delta) {
    // Server handles respawns when connected
    if (GameState.room) return;

    // Single-player fallback
    GameState.seedPickups.forEach(pickup => {
        if (pickup.isCollected) {
            pickup.respawnTimer += delta;
            if (pickup.respawnTimer >= 30000) { // 30 seconds
                pickup.isCollected = false;
                pickup.respawnTimer = 0;
                drawSeedPickup(pickup);
            }
        }
    });
}

/**
 * Find the nearest farm plot to player within range
 */
export function findNearestFarmPlot(maxDistance = 50) {
    const player = GameState.player;
    if (!player) return null;

    let nearest = null;
    let nearestDist = maxDistance;

    GameState.farmPlots.forEach(plot => {
        const dx = player.x - plot.x;
        const dy = player.y - plot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = plot;
        }
    });

    return nearest;
}

/**
 * Check if player is near the fishing pond
 */
export function isNearPond(pondX = 180, pondY = 720, range = 80) {
    const player = GameState.player;
    if (!player) return false;

    const dx = player.x - pondX;
    const dy = player.y - pondY;
    return Math.sqrt(dx * dx + dy * dy) < range;
}

/**
 * Check if player is near the cooking station
 */
export function isNearCookingStation(stationX = 1050, stationY = 450, range = 60) {
    const player = GameState.player;
    if (!player) return false;

    const dx = player.x - stationX;
    const dy = player.y - stationY;
    return Math.sqrt(dx * dx + dy * dy) < range;
}

/**
 * Water a planted crop
 * Server-authoritative when connected, local fallback for single-player
 */
export function waterPlot(plot) {
    if (plot.state !== 'planted' && plot.state !== 'growing') return false;

    if (GameState.room) {
        // Server-authoritative: send action
        sendWaterAction(plot.index);
        return true;
    } else {
        // Single-player fallback
        plot.isWatered = true;
        plot.lastWateredTime = GameState.gameTime;
        drawPlot(plot);
        return true;
    }
}

/**
 * Remove hazard (weeds/bugs) from a plot
 * Also handles removing wilted/dead plants
 * Server-authoritative when connected, local fallback for single-player
 */
export function removeHazard(plot) {
    // Can remove hazards or wilted/dead plants
    const hasHazard = plot.hazard && plot.hazard !== '';
    const isDead = plot.state === 'wilted' || plot.state === 'dead';

    if (!hasHazard && !isDead) return false;

    if (GameState.room) {
        // Server-authoritative: send action
        sendRemoveHazard(plot.index);
        return true;
    } else {
        // Single-player fallback
        plot.hazard = '';
        if (isDead) {
            plot.state = 'grass';
            plot.crop = '';
            plot.growthTimer = 0;
            plot.isWatered = false;
            if (plot.plantGraphics) {
                plot.plantGraphics.destroy();
                plot.plantGraphics = null;
            }
        }
        drawPlot(plot);
        return true;
    }
}

/**
 * Harvest fruit from a tree
 * Server-authoritative when connected, local fallback for single-player
 */
export function harvestFruit(tree) {
    if (!tree.hasFruit) return false;

    if (GameState.room) {
        // Server-authoritative: send action
        // Server broadcasts fruitHarvested, we add to inventory in message handler
        sendHarvestFruit(tree.index);
        return true;
    } else {
        // Single-player fallback
        GameState.inventory.fruits[tree.treeType]++;
        tree.hasFruit = false;
        tree.fruitTimer = fruitData[tree.treeType]?.regrowTime || 60000;
        drawFruitTree(tree);
        updateInventoryDisplay();
        return true;
    }
}

/**
 * Find the nearest fruit tree to player within range
 */
export function findNearestFruitTree(maxDistance = 60) {
    const player = GameState.player;
    if (!player) return null;

    let nearest = null;
    let nearestDist = maxDistance;

    GameState.fruitTrees.forEach(tree => {
        const dx = player.x - tree.x;
        const dy = player.y - tree.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = tree;
        }
    });

    return nearest;
}

/**
 * Update fruit tree regrowth for single-player mode
 */
export function updateFruitRegrowth(delta) {
    // Server handles regrowth when connected
    if (GameState.room) return;

    // Single-player fallback
    GameState.fruitTrees.forEach(tree => {
        if (!tree.hasFruit && tree.fruitTimer > 0) {
            tree.fruitTimer -= delta;
            if (tree.fruitTimer <= 0) {
                tree.hasFruit = true;
                tree.fruitTimer = 0;
                drawFruitTree(tree);
            }
        }
    });
}
