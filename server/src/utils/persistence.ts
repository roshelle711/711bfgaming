/**
 * persistence.ts - World state persistence to JSON file
 *
 * Exports:
 * - PersistedWorldState: Interface for saved data
 * - loadWorldState(): Load from disk
 * - saveWorldState(): Save to disk
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

const DATA_DIR = path.join(__dirname, "../../data");
const WORLD_STATE_FILE = path.join(DATA_DIR, "world-state.json");

export interface PersistedWorldState {
  farmPlots: Array<{
    index: number;
    state: string;
    crop: string;
    growthTimer: number;
    isWatered?: boolean;
    lastWateredTime?: number;
    hazard?: string;
  }>;
  seedPickups: Array<{
    index: number;
    isCollected: boolean;
    respawnTimer: number;
  }>;
  fruitTrees?: Array<{
    index: number;
    hasFruit: boolean;
    fruitTimer: number;
  }>;
  gameTime: number;
  lastSaved: number;
}

/**
 * Ensure data directory exists
 */
function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info({ event: "data_dir_created", path: DATA_DIR }, "Created data directory");
  }
}

/**
 * Load world state from disk
 * @returns Persisted state or null if not found
 */
export function loadWorldState(): PersistedWorldState | null {
  ensureDataDirectory();

  try {
    if (fs.existsSync(WORLD_STATE_FILE)) {
      const data = fs.readFileSync(WORLD_STATE_FILE, "utf-8");
      const state = JSON.parse(data) as PersistedWorldState;
      logger.info(
        { event: "world_state_loaded", plotCount: state.farmPlots?.length, gameTime: state.gameTime },
        "Loaded world state from disk"
      );
      return state;
    }
  } catch (error) {
    logger.error(
      { event: "world_state_load_error", error: (error as Error).message },
      "Failed to load world state"
    );
  }
  return null;
}

/**
 * Save world state to disk
 * @param state The world state to persist
 */
export function saveWorldState(state: PersistedWorldState): void {
  ensureDataDirectory();

  try {
    state.lastSaved = Date.now();
    const data = JSON.stringify(state, null, 2);
    fs.writeFileSync(WORLD_STATE_FILE, data, "utf-8");
    logger.debug(
      { event: "world_state_saved", plotCount: state.farmPlots?.length },
      "Saved world state to disk"
    );
  } catch (error) {
    logger.error(
      { event: "world_state_save_error", error: (error as Error).message },
      "Failed to save world state"
    );
  }
}
