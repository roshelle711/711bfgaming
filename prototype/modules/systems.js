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
 * - showCraftingMenu(): Display cooking menu (filtered by current station)
 * - startCooking(itemName): Start cooking with timer
 * - updateCooking(delta): Update cooking timer
 * - craftItem(item): Craft a recipe instantly
 * - sellItem(category, item): Sell an item
 * - checkSeedPickups(): Check for seed pickup collection
 * - respawnSeedPickups(delta): Respawn collected seeds
 */

import { seedTypes, fishTypes, recipes, sellPrices, seedBuyPrices, cropData, fruitData, fruitTreePositions, cookingStations, ingredientData, potionData, outfitData, armorData, setData } from './config.js';
import { GameState, saveGameSession } from './state.js';
import { showDialog, closeDialog, updateInventoryDisplay, updateCoinDisplay, updateSeedIndicator } from './ui.js';
import { drawPlot, drawPlant, drawSeedPickup, drawFruitTree, drawHerbPickup, drawGrassPickup } from './world.js';
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
        saveGameSession();
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
        saveGameSession();
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

        // harvestYieldChance modifier: chance for extra crop
        const yieldBonus = GameState.playerModifiers?.harvestYieldChance || 0;
        if (yieldBonus > 0 && Math.random() < yieldBonus) {
            GameState.inventory.crops[plot.crop]++;
            console.log('[Systems] Bonus crop from harvestYieldChance!');
        }

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
        saveGameSession();
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
    const classBonus = isDruid ? 1.2 : 1.0;
    // growthSpeedMultiplier from gear (higher = faster growth)
    const gearBonus = GameState.playerModifiers?.growthSpeedMultiplier || 1.0;
    const growthMultiplier = classBonus * gearBonus;
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

    // Base catch time: 2-5 seconds
    // fishingBiteChance modifier reduces wait time (0.05 = 5% faster = 0.95 multiplier)
    const biteBonus = GameState.playerModifiers?.fishingBiteChance || 0;
    const waitMultiplier = Math.max(0.5, 1 - biteBonus); // Cap at 50% reduction
    GameState.fishingCatchTime = (2000 + Math.random() * 3000) * waitMultiplier;

    // Randomize bobber position within pond bounds for each cast
    GameState.bobberOffset = {
        x: (Math.random() - 0.5) * 60,  // -30 to +30 from center
        y: (Math.random() - 0.5) * 40   // -20 to +20 from center
    };

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
    const baseWeights = isShaman ? [0.3, 0.4, 0.3] : [0.5, 0.35, 0.15];

    // fishingRareChance modifier improves rare fish odds
    // Shifts weight from common (bass) to rare (goldfish)
    const rareBonus = GameState.playerModifiers?.fishingRareChance || 0;
    const weights = [
        Math.max(0.2, baseWeights[0] - rareBonus),       // bass (common) - reduced
        baseWeights[1],                                   // salmon (uncommon) - unchanged
        Math.min(0.5, baseWeights[2] + rareBonus)        // goldfish (rare) - increased
    ];

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

    // 20% chance to also find a water bottle while fishing
    let bonusText = '';
    if (Math.random() < 0.20) {
        GameState.inventory.ingredients.water_bottle++;
        bonusText = ' + 🧴';
    }

    updateInventoryDisplay();
    saveGameSession();

    const emoji = { bass: '🐟', salmon: '🐠', goldfish: '✨' };
    showFishingStatus(`${emoji[fish]} Caught ${fish}!${bonusText}`);

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
    text += "─── BUY SUPPLIES ───────────────────────────────\n";
    text += `B: 🧴 Water Bottle ${ingredientData.water_bottle.buyPrice}💰 (have: ${inv.ingredients?.water_bottle || 0})\n\n`;
    text += "[1-8 sell, Q/W/R/A/S/D/Z/X/C seeds, B bottle, ESC close]";

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
        // Buy supplies
        scene.input.keyboard.once('keydown-B', () => buyIngredient('water_bottle'));
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
        saveGameSession();
        showShopMenu(); // Refresh menu
        return true;
    }
    return false;
}

/**
 * Buy an ingredient from the shop
 */
export function buyIngredient(ingredientType) {
    const data = ingredientData[ingredientType];
    if (!data || !data.buyPrice) return false;

    if (GameState.coins >= data.buyPrice) {
        GameState.coins -= data.buyPrice;
        if (GameState.inventory.ingredients[ingredientType] !== undefined) {
            GameState.inventory.ingredients[ingredientType]++;
        }
        updateInventoryDisplay();
        updateCoinDisplay();
        saveGameSession();
        showShopMenu(); // Refresh menu
        return true;
    }
    return false;
}

/**
 * Use a potion from inventory
 * @param {string} potionType - The potion key (e.g., 'health_potion_small')
 * @returns {boolean} True if potion was used
 */
export function usePotion(potionType) {
    const inv = GameState.inventory;
    if (!inv.potions || inv.potions[potionType] <= 0) {
        return false;
    }

    // Consume the potion
    inv.potions[potionType]--;

    // Get potion data for effect message
    const data = potionData[potionType];
    const effectMessages = {
        health: `❤️ Restored ${data?.amount || 20} health!`,
        mana: `💙 Restored ${data?.amount || 20} mana!`,
        stamina: `💚 Restored ${data?.amount || 20} stamina!`,
        speed: `💨 Speed boost activated!`
    };

    const message = effectMessages[data?.effect] || `${data?.emoji || '🧪'} Used ${data?.name || potionType}!`;

    // Show effect notification
    showPotionEffect(message);

    updateInventoryDisplay();
    saveGameSession();
    return true;
}

/**
 * Show a brief potion effect notification
 */
function showPotionEffect(message) {
    const scene = GameState.scene;
    if (!scene) return;

    // Create floating text effect
    const player = GameState.player;
    const x = player ? player.x : 700;
    const y = player ? player.y - 60 : 400;

    const effectText = scene.add.text(x, y, message, {
        fontSize: '18px',
        fill: '#00FF00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(200);

    // Animate up and fade out
    scene.tweens.add({
        targets: effectText,
        y: y - 50,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => effectText.destroy()
    });
}

/**
 * Show the cooking/crafting menu
 * Filters recipes based on current station type (or shows all if no station)
 */
export function showCraftingMenu() {
    const inv = GameState.inventory;
    const stationType = GameState.currentStationType;
    GameState.craftingOpen = true;

    // Get station info for header
    const stationConfig = stationType ? cookingStations[stationType] : null;
    const headerEmoji = stationConfig?.emoji || '🍳';
    const headerName = stationConfig?.name || 'CRAFTING';

    let text = `═══ ${headerEmoji} ${headerName} ═══\n\n`;

    // Filter recipes by station type
    const availableRecipes = Object.entries(recipes).filter(([name, recipe]) => {
        if (stationType === null) {
            // At no station: only show non-station recipes
            return recipe.station === null;
        } else {
            // At a station: show recipes for this station
            return recipe.station === stationType;
        }
    });

    if (availableRecipes.length === 0) {
        if (stationType === null) {
            text += "Go to a crafting station!\n\n";
            text += "🔥 Campfire - grilled items\n";
            text += "🍳 Stove - stews & fried food\n";
            text += "🧱 Oven - baked goods\n";
            text += "⚗️ Alchemy Table - potions\n\n";
        } else {
            text += "No recipes available here.\n\n";
        }
    } else {
        text += "RECIPES:\n";
        availableRecipes.forEach(([name, recipe], idx) => {
            const num = idx + 1;
            const emoji = recipe.emoji || '?';
            const ingredientText = Object.entries(recipe.ingredients)
                .map(([ing, amt]) => {
                    const ingEmoji = getIngredientEmoji(ing);
                    const have = getIngredientCount(inv, ing);
                    return `${ingEmoji}${amt}(${have})`;
                })
                .join(' + ');
            const canMake = canCraftRecipe(name) ? '✓' : '✗';
            const cookTime = recipe.cookTime > 0 ? ` [${(recipe.cookTime / 1000).toFixed(1)}s]` : '';
            const hammerReq = recipe.requiresHammer ? ' 🔨' : '';
            text += `${num}: ${emoji} ${formatRecipeName(name)} = ${ingredientText} ${canMake}${cookTime}${hammerReq}\n`;
        });
        text += "\n";
    }

    // Show current station hint
    if (stationType) {
        text += `[1-${availableRecipes.length} to cook, E/ESC to close]`;
    } else {
        text += "[E/ESC to close]";
    }

    showDialog(text);

    // Set up key handlers for available recipes
    const scene = GameState.scene;
    if (scene && availableRecipes.length > 0) {
        const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        availableRecipes.forEach(([name, recipe], idx) => {
            if (idx < keyNames.length) {
                scene.input.keyboard.once(`keydown-${keyNames[idx]}`, () => startCooking(name));
            }
        });
    }
}

/**
 * Get emoji for an ingredient
 */
function getIngredientEmoji(ingredient) {
    const emojiMap = {
        // Crops
        carrot: '🥕', tomato: '🍅', flower: '🌸', lettuce: '🥬',
        onion: '🧅', potato: '🥔', pepper: '🌶️', corn: '🌽', pumpkin: '🎃',
        // Fish
        bass: '🐟', salmon: '🐠', goldfish: '✨',
        // Fruits
        apple: '🍎', orange: '🍊', peach: '🍑', cherry: '🍒',
        // Alchemy ingredients
        herb_red: '🌿', herb_blue: '🌿', herb_green: '🌿',
        mushroom: '🍄', water_bottle: '🧴',
        // Resources
        wood: '🪵', stone: '🪨', fiber: '🌿',
        copper_ore: '🟤', iron_ore: '⚙️', copper_ingot: '🥉', iron_ingot: '🪙',
        gem: '💎', blacksmith_hammer: '🔨'
    };
    return emojiMap[ingredient] || '?';
}

/**
 * Get count of an ingredient from inventory
 */
function getIngredientCount(inv, ingredient) {
    return inv.crops[ingredient] ?? inv.fish[ingredient] ?? inv.fruits[ingredient] ?? inv.ingredients?.[ingredient] ?? inv.resources?.[ingredient] ?? 0;
}

/**
 * Format recipe name for display (camelCase to Title Case)
 */
function formatRecipeName(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

/**
 * Check if player can craft a recipe (has all ingredients)
 */
function canCraftRecipe(itemName) {
    const recipe = recipes[itemName];
    if (!recipe) return false;

    const inv = GameState.inventory;

    // Check if recipe requires hammer and player has one
    if (recipe.requiresHammer && (!inv.resources.blacksmith_hammer || inv.resources.blacksmith_hammer <= 0)) {
        return false;
    }

    for (const [ing, amount] of Object.entries(recipe.ingredients)) {
        const have = getIngredientCount(inv, ing);
        if (have < amount) return false;
    }
    return true;
}

/**
 * Start cooking a recipe (with timer if recipe has cookTime)
 */
export function startCooking(itemName) {
    const recipe = recipes[itemName];
    if (!recipe) return false;

    // Check station requirement
    if (recipe.station !== null && recipe.station !== GameState.currentStationType) {
        const stationConfig = cookingStations[recipe.station];
        showDialog(`Need ${stationConfig?.emoji || ''} ${stationConfig?.name || recipe.station}!`);
        return false;
    }

    // Check ingredients
    if (!canCraftRecipe(itemName)) {
        showDialog("Missing ingredients!");
        return false;
    }

    // If no cook time, craft instantly
    if (!recipe.cookTime || recipe.cookTime <= 0) {
        return craftItem(itemName);
    }

    // Start cooking timer
    const inv = GameState.inventory;

    // Consume ingredients upfront
    for (const [ing, amount] of Object.entries(recipe.ingredients)) {
        if (inv.crops[ing] !== undefined) inv.crops[ing] -= amount;
        else if (inv.fish[ing] !== undefined) inv.fish[ing] -= amount;
        else if (inv.fruits[ing] !== undefined) inv.fruits[ing] -= amount;
        else if (inv.ingredients?.[ing] !== undefined) inv.ingredients[ing] -= amount;
        else if (inv.resources?.[ing] !== undefined) inv.resources[ing] -= amount;
    }

    // Apply cookTimeMultiplier from gear (lower = faster)
    const timeMultiplier = GameState.playerModifiers?.cookTimeMultiplier || 1.0;
    const adjustedCookTime = Math.max(500, recipe.cookTime * timeMultiplier); // Minimum 0.5s

    GameState.isCooking = true;
    GameState.cookingTimer = 0;
    GameState.cookingDuration = adjustedCookTime;
    GameState.cookingRecipe = itemName;

    updateInventoryDisplay();
    showDialog(`${recipe.emoji} Cooking ${formatRecipeName(itemName)}...`);

    return true;
}

/**
 * Update cooking timer (call in game update loop)
 */
export function updateCooking(delta) {
    if (!GameState.isCooking) return;

    GameState.cookingTimer += delta;

    // Update progress display
    const progress = Math.min(GameState.cookingTimer / GameState.cookingDuration, 1);
    const recipe = recipes[GameState.cookingRecipe];
    const barLength = 20;
    const filled = Math.floor(progress * barLength);
    const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    if (GameState.isDialogOpen) {
        const percent = Math.floor(progress * 100);
        showDialog(`${recipe?.emoji || '🍳'} Cooking ${formatRecipeName(GameState.cookingRecipe)}...\n\n[${progressBar}] ${percent}%`);
    }

    // Check if done
    if (GameState.cookingTimer >= GameState.cookingDuration) {
        finishCooking();
    }
}

/**
 * Finish cooking and add result to inventory
 */
function finishCooking() {
    const itemName = GameState.cookingRecipe;
    const recipe = recipes[itemName];

    GameState.isCooking = false;
    GameState.cookingTimer = 0;
    GameState.cookingDuration = 0;
    GameState.cookingRecipe = null;

    if (recipe) {
        // Add to appropriate inventory category based on recipe.result
        const inv = GameState.inventory;
        const resultType = recipe.result;

        if (resultType === 'dyes') {
            inv.dyes[itemName] = (inv.dyes[itemName] || 0) + 1;
        } else if (resultType === 'outfits') {
            inv.outfits[itemName] = (inv.outfits[itemName] || 0) + 1;
        } else if (resultType === 'armor') {
            inv.armor[itemName] = (inv.armor[itemName] || 0) + 1;
        } else if (resultType === 'resources') {
            inv.resources[itemName] = (inv.resources[itemName] || 0) + 1;
        } else if (inv.potions?.[itemName] !== undefined) {
            inv.potions[itemName]++;
        } else {
            inv.crafted[itemName] = (inv.crafted[itemName] || 0) + 1;
        }
        updateInventoryDisplay();
        saveGameSession();
        showDialog(`${recipe.emoji} ${formatRecipeName(itemName)} ready!`);

        // Auto-close after a moment and reopen menu
        setTimeout(() => {
            if (GameState.currentStationType) {
                showCraftingMenu();
            } else {
                closeDialog();
            }
        }, 1000);
    }
}

/**
 * Craft an item instantly (no timer) - for non-station recipes
 */
export function craftItem(itemName) {
    const recipe = recipes[itemName];
    if (!recipe) return false;

    // Check station requirement
    if (recipe.station !== null && recipe.station !== GameState.currentStationType) {
        return false;
    }

    const inv = GameState.inventory;

    // Check if we have all ingredients
    if (!canCraftRecipe(itemName)) return false;

    // Consume ingredients
    for (const [ing, amount] of Object.entries(recipe.ingredients)) {
        if (inv.crops[ing] !== undefined) inv.crops[ing] -= amount;
        else if (inv.fish[ing] !== undefined) inv.fish[ing] -= amount;
        else if (inv.fruits[ing] !== undefined) inv.fruits[ing] -= amount;
        else if (inv.ingredients?.[ing] !== undefined) inv.ingredients[ing] -= amount;
        else if (inv.resources?.[ing] !== undefined) inv.resources[ing] -= amount;
    }

    // Add to appropriate inventory category based on recipe.result
    const resultType = recipe.result;
    if (resultType === 'dyes') {
        inv.dyes[itemName] = (inv.dyes[itemName] || 0) + 1;
    } else if (resultType === 'outfits') {
        inv.outfits[itemName] = (inv.outfits[itemName] || 0) + 1;
    } else if (resultType === 'armor') {
        inv.armor[itemName] = (inv.armor[itemName] || 0) + 1;
    } else if (resultType === 'resources') {
        inv.resources[itemName] = (inv.resources[itemName] || 0) + 1;
    } else if (inv.potions?.[itemName] !== undefined) {
        inv.potions[itemName]++;
    } else {
        inv.crafted[itemName] = (inv.crafted[itemName] || 0) + 1;
    }
    updateInventoryDisplay();
    saveGameSession();
    showCraftingMenu(); // Refresh menu
    return true;
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
        saveGameSession();
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
                saveGameSession();
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
 * Check for herb/ingredient pickup collection
 */
export function checkHerbPickups() {
    const player = GameState.player;
    if (!player) return;

    GameState.herbPickups.forEach((pickup, index) => {
        if (pickup.isCollected) return;

        const dx = player.x - pickup.x;
        const dy = player.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
            // Collect the herb
            pickup.isCollected = true;
            pickup.graphics.clear();

            // Add to ingredients inventory
            const herbType = pickup.herbType;
            if (GameState.inventory.ingredients[herbType] !== undefined) {
                GameState.inventory.ingredients[herbType]++;
            }

            updateInventoryDisplay();
            saveGameSession();
        }
    });
}

/**
 * Respawn collected herb pickups after delay
 */
export function respawnHerbPickups(scene, delta) {
    GameState.herbPickups.forEach(pickup => {
        if (pickup.isCollected) {
            pickup.respawnTimer += delta;
            if (pickup.respawnTimer >= 45000) { // 45 seconds (longer than seeds)
                pickup.isCollected = false;
                pickup.respawnTimer = 0;
                drawHerbPickup(pickup);
            }
        }
    });
}

/**
 * Check for grass/weed pickup collection (for fiber)
 */
export function checkGrassPickups() {
    const player = GameState.player;
    if (!player) return;

    GameState.grassPickups.forEach((pickup, index) => {
        if (pickup.isCollected) return;

        const dx = player.x - pickup.x;
        const dy = player.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
            // Collect the grass
            pickup.isCollected = true;
            pickup.graphics.clear();

            // Add fiber to resources inventory (1-2 fiber per grass)
            const amount = Math.random() < 0.3 ? 2 : 1;  // 30% chance for 2
            GameState.inventory.resources.fiber = (GameState.inventory.resources.fiber || 0) + amount;

            updateInventoryDisplay();
            saveGameSession();
        }
    });
}

/**
 * Respawn collected grass pickups after delay
 */
export function respawnGrassPickups(scene, delta) {
    GameState.grassPickups.forEach(pickup => {
        if (pickup.isCollected) {
            pickup.respawnTimer += delta;
            if (pickup.respawnTimer >= 40000) { // 40 seconds
                pickup.isCollected = false;
                pickup.respawnTimer = 0;
                drawGrassPickup(pickup);
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
export function isNearPond(pondX = 220, pondY = 680, range = 80) {
    const player = GameState.player;
    if (!player) return false;

    const dx = player.x - pondX;
    const dy = player.y - pondY;
    return Math.sqrt(dx * dx + dy * dy) < range;
}

/**
 * Check if player is near the cooking station
 */
export function isNearCookingStation(stationX = 1150, stationY = 320, range = 60) {
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
        // Drop fiber when removing weeds (100% chance, 1-2 fiber)
        if (plot.hazard === 'weeds') {
            const fiberAmount = Math.random() < 0.4 ? 2 : 1;  // 40% chance for 2
            GameState.inventory.resources.fiber = (GameState.inventory.resources.fiber || 0) + fiberAmount;
            console.log(`[Systems] Got ${fiberAmount} fiber from removing weeds!`);
            updateInventoryDisplay();
        }

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
        saveGameSession();
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

// ===== EQUIPMENT & MODIFIERS SYSTEM =====

/**
 * Recalculate player modifiers from equipped gear
 * Called whenever equipment changes
 */
export function recalculateModifiers() {
    const mods = {
        // Skill bonuses (outfit layer)
        fishingBiteChance: 0,
        fishingRareChance: 0,
        cookTimeMultiplier: 1.0,
        extraPortionChance: 0,
        harvestYieldChance: 0,
        growthSpeedMultiplier: 1.0,
        potionPotency: 0,
        ingredientSaveChance: 0,
        dyeYieldChance: 0,
        // Combat stats (armor layer)
        defense: 0,
        maxHP: 0
    };

    const eq = GameState.equipment;
    const setCounts = {};  // Track pieces per set

    // Sum outfit bonuses from outfit slots
    ['hat', 'top', 'bottom', 'shoes', 'accessory'].forEach(slot => {
        if (eq[slot] && eq[slot].id) {
            const item = outfitData[eq[slot].id];
            if (item?.bonuses) {
                Object.entries(item.bonuses).forEach(([key, val]) => {
                    if (key === 'cookTimeMultiplier' || key === 'growthSpeedMultiplier') {
                        mods[key] *= val;
                    } else {
                        mods[key] = (mods[key] || 0) + val;
                    }
                });
            }
            // Track set pieces
            if (item?.setId) {
                setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
            }
        }
    });

    // Apply set bonuses
    Object.entries(setCounts).forEach(([setId, count]) => {
        const set = setData[setId];
        if (!set) return;

        if (count >= 2 && set.bonus2pc) {
            Object.entries(set.bonus2pc).forEach(([key, val]) => {
                if (key.includes('Multiplier')) mods[key] *= val;
                else mods[key] = (mods[key] || 0) + val;
            });
        }
        if (count >= 3 && set.bonus3pc) {
            Object.entries(set.bonus3pc).forEach(([key, val]) => {
                if (key.includes('Multiplier')) mods[key] *= val;
                else mods[key] = (mods[key] || 0) + val;
            });
        }
    });

    // Sum armor stats from armor slots
    ['chest', 'legs', 'boots'].forEach(slot => {
        if (eq[slot] && eq[slot].id) {
            const item = armorData[eq[slot].id];
            if (item) {
                mods.defense += item.defense || 0;
                mods.maxHP += item.maxHP || 0;
            }
        }
    });

    GameState.playerModifiers = mods;
    console.log('[Systems] Modifiers recalculated:', mods);
}

/**
 * Equip an outfit item
 * @param {string} itemId - The item ID (e.g., 'fisher_hat')
 * @returns {boolean} True if equipped successfully
 */
export function equipOutfit(itemId) {
    const item = outfitData[itemId];
    if (!item) return false;

    const inv = GameState.inventory;
    if (!inv.outfits[itemId] || inv.outfits[itemId] <= 0) return false;

    const slot = item.slot;
    if (!slot) return false;

    // Unequip current item in slot (return to inventory)
    if (GameState.equipment[slot] && GameState.equipment[slot].id) {
        const oldId = GameState.equipment[slot].id;
        inv.outfits[oldId] = (inv.outfits[oldId] || 0) + 1;
    }

    // Equip new item
    inv.outfits[itemId]--;
    GameState.equipment[slot] = { id: itemId, color: null };

    recalculateModifiers();
    updateInventoryDisplay();
    saveGameSession();
    return true;
}

/**
 * Unequip an outfit item (return to inventory)
 * @param {string} slot - The slot to unequip ('hat', 'top', 'bottom', 'shoes', 'accessory')
 * @returns {boolean} True if unequipped successfully
 */
export function unequipOutfit(slot) {
    if (!GameState.equipment[slot] || !GameState.equipment[slot].id) return false;

    const inv = GameState.inventory;
    const itemId = GameState.equipment[slot].id;

    // Return to inventory
    inv.outfits[itemId] = (inv.outfits[itemId] || 0) + 1;
    GameState.equipment[slot] = null;

    recalculateModifiers();
    updateInventoryDisplay();
    saveGameSession();
    return true;
}

/**
 * Equip an armor item
 * @param {string} itemId - The armor ID (e.g., 'iron_chest')
 * @returns {boolean} True if equipped successfully
 */
export function equipArmor(itemId) {
    const item = armorData[itemId];
    if (!item) return false;

    const inv = GameState.inventory;
    if (!inv.armor[itemId] || inv.armor[itemId] <= 0) return false;

    const slot = item.slot;
    if (!slot) return false;

    // Unequip current item in slot (return to inventory)
    if (GameState.equipment[slot] && GameState.equipment[slot].id) {
        const oldId = GameState.equipment[slot].id;
        inv.armor[oldId] = (inv.armor[oldId] || 0) + 1;
    }

    // Equip new item
    inv.armor[itemId]--;
    GameState.equipment[slot] = { id: itemId };

    recalculateModifiers();
    updateInventoryDisplay();
    saveGameSession();
    return true;
}

/**
 * Unequip an armor item (return to inventory)
 * @param {string} slot - The slot to unequip ('chest', 'legs', 'boots')
 * @returns {boolean} True if unequipped successfully
 */
export function unequipArmor(slot) {
    if (!GameState.equipment[slot] || !GameState.equipment[slot].id) return false;

    const inv = GameState.inventory;
    const itemId = GameState.equipment[slot].id;

    // Return to inventory
    inv.armor[itemId] = (inv.armor[itemId] || 0) + 1;
    GameState.equipment[slot] = null;

    recalculateModifiers();
    updateInventoryDisplay();
    saveGameSession();
    return true;
}
