/**
 * resources.js - Resource gathering system (trees, rocks)
 *
 * Exports:
 * - createResourceNode(scene, x, y, nodeType, index): Create a harvestable resource node
 * - hitResourceNode(node): Hit a node, handle drops when depleted
 * - setupResourceNodes(scene): Spawn all resource nodes from config
 * - addToInventory(resourceType, qty): Add resources to inventory
 * - showFloatingText(scene, x, y, text): Show floating drop text
 */

import { GameState, saveGameSession } from './state.js';
import { resourceNodeTypes, resourceData, resourceNodePositions } from './config.js';
import { showDialog } from './ui.js';

/**
 * Add resources to player inventory
 * @param {string} resourceType - 'wood', 'stone', 'ore', 'gem'
 * @param {number} qty - Amount to add
 */
export function addToInventory(resourceType, qty) {
    if (GameState.inventory.resources[resourceType] !== undefined) {
        GameState.inventory.resources[resourceType] += qty;
        console.log(`[Resources] Added ${qty} ${resourceType}. Total: ${GameState.inventory.resources[resourceType]}`);
        saveGameSession(); // Auto-save on inventory change
    }
}

/**
 * Check if player has enough of a resource
 * @param {string} resourceType - Resource type
 * @param {number} qty - Amount needed
 * @returns {boolean}
 */
export function hasResource(resourceType, qty) {
    return (GameState.inventory.resources[resourceType] || 0) >= qty;
}

/**
 * Remove resources from inventory
 * @param {string} resourceType - Resource type
 * @param {number} qty - Amount to remove
 * @returns {boolean} True if successful
 */
export function removeResource(resourceType, qty) {
    if (hasResource(resourceType, qty)) {
        GameState.inventory.resources[resourceType] -= qty;
        return true;
    }
    return false;
}

/**
 * Show floating text at position (for drop notifications)
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {string} color - Text color (default gold)
 */
export function showFloatingText(scene, x, y, text, color = '#FFD700') {
    const floatText = scene.add.text(x, y - 20, text, {
        fontSize: '14px',
        fill: color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(1000);

    // Float up and fade out
    scene.tweens.add({
        targets: floatText,
        y: y - 60,
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => floatText.destroy()
    });
}

/**
 * Check if player has the required tool for a node type
 * @param {string} nodeType - 'tree' or 'rock'
 * @returns {boolean}
 */
export function hasRequiredTool(nodeType) {
    // Check if the correct tool is EQUIPPED (selected in hotbar)
    const equipped = GameState.equippedTool;
    if (nodeType === 'tree') {
        return equipped === 'axe';
    } else if (nodeType === 'rock') {
        return equipped === 'pickaxe';
    }
    return true; // Unknown node types don't require tools
}

/**
 * Get the required tool name for a node type
 * @param {string} nodeType - 'tree' or 'rock'
 * @returns {string}
 */
function getRequiredToolName(nodeType) {
    if (nodeType === 'tree') return 'Equip Axe 🪓';
    if (nodeType === 'rock') return 'Equip Pickaxe ⛏️';
    return 'Tool';
}

/**
 * Create a resource node (tree or rock)
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} nodeType - 'tree' or 'rock'
 * @param {number} index - Unique index for this node
 * @returns {Phaser.GameObjects.Container} The node container
 */
export function createResourceNode(scene, x, y, nodeType, index) {
    const config = resourceNodeTypes[nodeType];
    if (!config) {
        console.error(`Unknown resource node type: ${nodeType}`);
        return null;
    }

    const container = scene.add.container(x, y);
    const graphics = scene.add.graphics();
    container.add(graphics);

    // Draw the node based on type
    if (nodeType === 'tree') {
        // Trunk
        graphics.fillStyle(config.trunkColor, 1);
        graphics.fillRect(-6, 10, 12, 25);
        // Foliage layers
        graphics.fillStyle(0x1B5E20, 0.9);
        graphics.fillCircle(0, -5, 22);
        graphics.fillStyle(config.color, 1);
        graphics.fillCircle(0, -10, 20);
        graphics.fillStyle(0x2ECC71, 0.8);
        graphics.fillCircle(-5, -15, 12);
        graphics.fillCircle(5, -12, 10);
    } else if (nodeType === 'rock') {
        // Main rock body
        graphics.fillStyle(config.color, 1);
        graphics.fillEllipse(0, 5, config.width, config.height);
        // Highlight
        graphics.fillStyle(config.highlightColor, 0.6);
        graphics.fillEllipse(-5, 0, config.width * 0.6, config.height * 0.5);
        // Dark edge
        graphics.fillStyle(0x505050, 0.5);
        graphics.fillEllipse(5, 10, config.width * 0.4, config.height * 0.3);
    }

    // Set depth based on Y position
    container.setDepth(y);

    // Store node data
    container.nodeType = nodeType;
    container.nodeIndex = index;
    container.hp = config.hp;
    container.maxHp = config.hp;
    container.isActive = true;

    // Make interactive - use a hit area
    const hitArea = new Phaser.Geom.Rectangle(
        -config.width / 2,
        -config.height / 2,
        config.width,
        config.height
    );
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Add to tracking array
    GameState.resourceNodes.push(container);

    return container;
}

/**
 * Hit a resource node
 * @param {Phaser.GameObjects.Container} node - The node to hit
 * @param {Phaser.Scene} scene - Phaser scene
 */
export function hitResourceNode(node, scene) {
    if (!node || !node.isActive) return;

    const config = resourceNodeTypes[node.nodeType];
    if (!config) return;

    // Check for required tool
    if (!hasRequiredTool(node.nodeType)) {
        const toolName = getRequiredToolName(node.nodeType);
        showFloatingText(scene, node.x, node.y, `Need ${toolName}!`, '#FF6B6B');
        // Small shake for "nope" feedback
        scene.tweens.add({
            targets: node,
            x: node.x + 2,
            duration: 30,
            yoyo: true,
            repeat: 3
        });
        return;
    }

    // Decrement HP
    node.hp--;
    console.log(`[Resources] Hit ${node.nodeType}! HP: ${node.hp}/${node.maxHp}`);

    // Shake feedback
    scene.tweens.add({
        targets: node,
        x: node.x + 3,
        duration: 50,
        yoyo: true,
        repeat: 2,
        ease: 'Power1'
    });

    // Check if depleted
    if (node.hp <= 0) {
        harvestNode(node, scene, config);
    }
}

/**
 * Harvest a depleted node - calculate drops and respawn
 */
function harvestNode(node, scene, config) {
    node.isActive = false;

    // Calculate drops
    const drops = [];
    for (const [resourceType, dropConfig] of Object.entries(config.drops)) {
        if (Math.random() < dropConfig.chance) {
            const qty = dropConfig.min + Math.floor(Math.random() * (dropConfig.max - dropConfig.min + 1));
            drops.push({ type: resourceType, qty });
            addToInventory(resourceType, qty);
        }
    }

    // Show floating text for drops
    const dropText = drops.map(d => {
        const data = resourceData[d.type];
        return `+${d.qty} ${data?.emoji || d.type}`;
    }).join(' ');

    if (dropText) {
        showFloatingText(scene, node.x, node.y, dropText);
    }

    // Hide the node
    node.setVisible(false);

    // Respawn after delay
    scene.time.delayedCall(config.respawnTime, () => {
        respawnNode(node, config);
    });
}

/**
 * Respawn a harvested node
 */
function respawnNode(node, config) {
    node.hp = config.hp;
    node.isActive = true;
    node.setVisible(true);

    // Fade in effect
    node.alpha = 0;
    GameState.scene.tweens.add({
        targets: node,
        alpha: 1,
        duration: 500,
        ease: 'Power2'
    });

    console.log(`[Resources] ${node.nodeType} respawned at (${node.x}, ${node.y})`);
}

/**
 * Setup all resource nodes from config
 * @param {Phaser.Scene} scene - Phaser scene
 */
export function setupResourceNodes(scene) {
    GameState.resourceNodes = [];

    resourceNodePositions.forEach((pos, index) => {
        createResourceNode(scene, pos.x, pos.y, pos.type, index);
    });

    console.log(`[Resources] Created ${GameState.resourceNodes.length} resource nodes`);
}

/**
 * Handle click on a game object - check if it's a resource node
 * @param {Phaser.GameObjects.GameObject} gameObject - Clicked object
 * @param {Phaser.Scene} scene - Phaser scene
 * @returns {boolean} True if handled
 */
export function handleResourceClick(gameObject, scene) {
    // Check if the clicked object is a resource node container
    if (gameObject.nodeType && gameObject.isActive) {
        hitResourceNode(gameObject, scene);
        return true;
    }
    return false;
}
