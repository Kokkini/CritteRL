/**
 * AquariumService - Manages aquarium state persistence
 */

import { nanoid } from 'nanoid';
import { StorageService, STORES } from './StorageService';
import { AquariumState, AquariumCreature, EnvironmentConfig, Position } from '../utils/types';
import { GameConstants } from '../utils/constants';

const AQUARIUM_STATE_KEY = 'aquarium_state';

export class AquariumService {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Get default aquarium environment
   */
  private getDefaultEnvironment(): EnvironmentConfig {
    return {
      type: 'flat_plane',
      groundLevel: GameConstants.DEFAULT_GROUND_LEVEL,
      width: GameConstants.AQUARIUM_ENVIRONMENT_WIDTH,
      height: GameConstants.AQUARIUM_ENVIRONMENT_HEIGHT,
      gravity: GameConstants.DEFAULT_GRAVITY,
    };
  }

  /**
   * Load aquarium state from storage
   */
  async loadAquariumState(): Promise<AquariumState | null> {
    try {
      await this.storageService.initialize();
      const data = await this.storageService.loadFromIndexedDB<{
        id: string;
        creatures: any[];
        environment: EnvironmentConfig;
        lastUpdated: string;
      }>(STORES.AQUARIUM_STATE, AQUARIUM_STATE_KEY);

      if (!data) {
        return null;
      }

      return {
        creatures: data.creatures,
        environment: data.environment,
        lastUpdated: new Date(data.lastUpdated),
      };
    } catch (error) {
      console.error('[AquariumService] Failed to load aquarium state:', error);
      return null;
    }
  }

  /**
   * Save aquarium state to storage
   */
  async saveAquariumState(state: AquariumState): Promise<void> {
    try {
      await this.storageService.initialize();
      await this.storageService.saveToIndexedDB(STORES.AQUARIUM_STATE, {
        id: AQUARIUM_STATE_KEY,
        creatures: state.creatures,
        environment: state.environment,
        lastUpdated: state.lastUpdated.toISOString(),
      });
    } catch (error) {
      console.error('[AquariumService] Failed to save aquarium state:', error);
      throw error;
    }
  }

  /**
   * Add creatures to aquarium
   */
  async addCreatureToAquarium(
    creatureDesignId: string,
    modelId: string | null,
    count: number
  ): Promise<void> {
    const state = await this.loadAquariumState() || {
      creatures: [],
      environment: this.getDefaultEnvironment(),
      lastUpdated: new Date(),
    };

    // Randomly place creatures within spawn area
    for (let i = 0; i < count; i++) {
      // Random position within spawn bounds
      const x = GameConstants.AQUARIUM_SPAWN_MIN_X + 
        Math.random() * (GameConstants.AQUARIUM_SPAWN_MAX_X - GameConstants.AQUARIUM_SPAWN_MIN_X);
      const y = state.environment.groundLevel + 
        GameConstants.AQUARIUM_SPAWN_MIN_Y + 
        Math.random() * (GameConstants.AQUARIUM_SPAWN_MAX_Y - GameConstants.AQUARIUM_SPAWN_MIN_Y);

      // Random initial direction
      const directionX = Math.random() < 0.5 ? 1 : -1;
      const direction = { x: directionX, y: 0 };

      const aquariumCreature: AquariumCreature = {
        id: nanoid(),
        creatureDesignId,
        modelId,
        position: { x, y },
        direction,
        lastDirectionChange: Date.now(),
        foodEaten: 0,
      };

      state.creatures.push(aquariumCreature);
    }

    state.lastUpdated = new Date();

    // Enforce max creatures limit
    if (state.creatures.length > GameConstants.AQUARIUM_MAX_CREATURES) {
      state.creatures = state.creatures.slice(0, GameConstants.AQUARIUM_MAX_CREATURES);
    }

    await this.saveAquariumState(state);
    console.log(`[AquariumService] Saved aquarium state with ${state.creatures.length} creatures`);
  }

  /**
   * Remove creature from aquarium
   */
  async removeCreatureFromAquarium(aquariumCreatureId: string): Promise<void> {
    const state = await this.loadAquariumState();
    if (!state) {
      return;
    }

    state.creatures = state.creatures.filter((c) => c.id !== aquariumCreatureId);
    state.lastUpdated = new Date();
    await this.saveAquariumState(state);
  }

  /**
   * Get creatures in aquarium for a specific design and model
   */
  async getCreaturesInAquarium(creatureDesignId: string, modelId: string | null): Promise<AquariumCreature[]> {
    const state = await this.loadAquariumState();
    if (!state) {
      return [];
    }

    return state.creatures.filter(
      (c) => c.creatureDesignId === creatureDesignId && c.modelId === modelId
    );
  }

  /**
   * Remove all creatures with a specific design and model from aquarium
   */
  async removeCreaturesFromAquarium(creatureDesignId: string, modelId: string | null): Promise<void> {
    const state = await this.loadAquariumState();
    if (!state) {
      return;
    }

    state.creatures = state.creatures.filter(
      (c) => !(c.creatureDesignId === creatureDesignId && c.modelId === modelId)
    );
    state.lastUpdated = new Date();
    await this.saveAquariumState(state);
  }

  /**
   * Clear all creatures from aquarium
   */
  async clearAquarium(): Promise<void> {
    const state: AquariumState = {
      creatures: [],
      environment: this.getDefaultEnvironment(),
      lastUpdated: new Date(),
    };
    await this.saveAquariumState(state);
  }

  /**
   * Update aquarium state (for direction changes, etc.)
   */
  async updateAquariumState(state: AquariumState): Promise<void> {
    state.lastUpdated = new Date();
    await this.saveAquariumState(state);
  }
}

