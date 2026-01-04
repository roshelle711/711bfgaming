/**
 * utils.js - Time formatting, day phase, interpolation helpers
 *
 * Exports:
 * - getTimeString(gameTime): Format time as "H:MM AM/PM"
 * - getDayPhase(gameTime): Returns 'dawn', 'day', 'dusk', or 'night'
 * - lerp(a, b, t): Linear interpolation
 */

/**
 * Format game time (in minutes) as 12-hour clock string
 * @param {number} gameTime - Minutes since midnight (0-1440)
 * @returns {string} Formatted time like "8:00 AM"
 */
export function getTimeString(gameTime) {
    const hours = Math.floor(gameTime / 60) % 24;
    const mins = Math.floor(gameTime % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get current day phase based on game time
 * @param {number} gameTime - Minutes since midnight (0-1440)
 * @returns {'dawn'|'day'|'dusk'|'night'} Current phase
 */
export function getDayPhase(gameTime) {
    const hour = Math.floor(gameTime / 60) % 24;
    if (hour >= 6 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
