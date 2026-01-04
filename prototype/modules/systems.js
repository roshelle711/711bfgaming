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

import { seedTypes, fishTypes, recipes, sellPrices, cropData, fruitData, fruitTreePositions } from './config.js';
import { GameState } from './state.js';
import { showDialog, closeDialog, updateInventoryDisplay, updateCoinDisplay, updateSeedIndicator } from './ui.js';
import { drawPlot, drawPlant, drawSeedPickup } from './world.js';
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
        plot.state = 'tilled';
        plot.crop = null;
        plot.growthTimer = 0;
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
    showDialog('🎣 Fishing...\n(Wait for a catch!)');
}

/**
 * Update fishing timer and catch fish
 */
export function updateFishing(delta) {
    if (!GameState.isFishing) return;

    GameState.fishingTimer += delta;

    // Random catch time between 2-5 seconds
    const catchTime = 2000 + Math.random() * 3000;

    if (GameState.fishingTimer >= catchTime) {
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
        showDialog(`🎣 You caught a ${fish}! ${emoji[fish]}`);

        GameState.isFishing = false;
        GameState.fishingTimer = 0;
    }
}

/**
 * Show the shop selling menu
 */
export function showShopMenu() {
    const inv = GameState.inventory;
    const prices = sellPrices;

    let text = "═══ 🛒 FINN'S SHOP ═══\n\n";
    text += "SELL CROPS:\n";
    text += `1: 🥕 Carrot (${inv.crops.carrot}) → ${prices.crops.carrot}💰\n`;
    text += `2: 🍅 Tomato (${inv.crops.tomato}) → ${prices.crops.tomato}💰\n`;
    text += `3: 🌸 Flower (${inv.crops.flower}) → ${prices.crops.flower}💰\n`;
    text += "SELL FISH:\n";
    text += `4: 🐟 Bass (${inv.fish.bass}) → ${prices.fish.bass}💰\n`;
    text += `5: 🐠 Salmon (${inv.fish.salmon}) → ${prices.fish.salmon}💰\n`;
    text += `6: ✨ Goldfish (${inv.fish.goldfish}) → ${prices.fish.goldfish}💰\n`;
    text += "SELL COOKED:\n";
    text += `7: 🥗 Salad (${inv.crafted.salad}) → 50💰 | 8: 💐 Bouquet (${inv.crafted.bouquet}) → 80💰\n`;
    text += "[Press 1-8 to sell, E to close]";

    showDialog(text);

    const scene = GameState.scene;
    if (scene) {
        scene.input.keyboard.once('keydown-ONE', () => sellItem('crops', 'carrot'));
        scene.input.keyboard.once('keydown-TWO', () => sellItem('crops', 'tomato'));
        scene.input.keyboard.once('keydown-THREE', () => sellItem('crops', 'flower'));
        scene.input.keyboard.once('keydown-FOUR', () => sellItem('fish', 'bass'));
        scene.input.keyboard.once('keydown-FIVE', () => sellItem('fish', 'salmon'));
        scene.input.keyboard.once('keydown-SIX', () => sellItem('fish', 'goldfish'));
        scene.input.keyboard.once('keydown-SEVEN', () => sellItem('crafted', 'salad'));
        scene.input.keyboard.once('keydown-EIGHT', () => sellItem('crafted', 'bouquet'));
    }
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
    text += "[Press 1-4 to cook, E to close]";

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
            }
        }
    });
}
