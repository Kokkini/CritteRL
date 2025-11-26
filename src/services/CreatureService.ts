/**
 * CreatureService - Manages creature design CRUD operations
 */

import {
  CreatureDesign,
  ValidationResult,
  Joint,
} from '../utils/types';
import { CreatureDesignImpl } from '../utils/CreatureDesign';
import { validateCreatureDesign } from '../utils/validation';
import {
  StorageService,
  QuotaExceededError,
  StorageUnavailableError,
} from './StorageService';
import { GameConstants } from '../utils/constants';
import { generateRandomName } from '../utils/nameGenerator';

const STORAGE_KEY_PREFIX = 'creature_design_';

export class CreatureService {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Create a new creature design
   */
  async createCreature(name?: string): Promise<CreatureDesign> {
    return new CreatureDesignImpl(name || generateRandomName());
  }

  /**
   * Save creature design to storage
   */
  async saveCreature(design: CreatureDesign): Promise<void> {
    // Validate before saving
    const validation = this.validateCreature(design);
    if (!validation.valid) {
      throw new InvalidCreatureError(validation.errors);
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${design.id}`;
      
      // Save bones without density (will be set from constants on load)
      const bonesToSave = design.bones.map(({ density, ...bone }) => bone);
      
      // Save muscles without maxForce (will be set from constants on load)
      const musclesToSave = design.muscles.map(({ maxForce, ...muscle }) => muscle);
      
      await this.storageService.saveToLocalStorage(key, {
        id: design.id,
        name: design.name,
        createdAt: design.createdAt.toISOString(),
        updatedAt: design.updatedAt.toISOString(),
        bones: bonesToSave,
        joints: design.joints,
        muscles: musclesToSave,
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw new StorageQuotaExceededError(error.message);
      }
      throw new StorageUnavailableError('Failed to save creature design');
    }
  }

  /**
   * Load creature design from storage
   */
  async loadCreature(id: string): Promise<CreatureDesign | null> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`;
      const data = await this.storageService.loadFromLocalStorage<{
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        bones: unknown[];
        joints: unknown[];
        muscles: unknown[];
      }>(key);

      if (!data) {
        return null;
      }

      // Reconstruct creature design
      const design = new CreatureDesignImpl(data.name);
      design.id = data.id;
      design.createdAt = new Date(data.createdAt);
      design.updatedAt = new Date(data.updatedAt);
      
      // Load bones and set density from constants (not saved)
      const loadedBones = data.bones as Array<Omit<CreatureDesign['bones'][0], 'density'>>;
      design.bones = loadedBones.map((bone) => ({
        ...bone,
        density: GameConstants.DEFAULT_BONE_DENSITY,
      }));
      
      // Load joints and apply migration: set default angle limits if not already set
      const loadedJoints = data.joints as Joint[];
      design.joints = loadedJoints.map((joint) => {
        // If joint doesn't have limits enabled or has null angles, apply defaults
        if (!joint.enableLimit || joint.lowerAngle === null || joint.upperAngle === null) {
          return {
            ...joint,
            enableLimit: true,
            lowerAngle: GameConstants.JOINT_LOWER_ANGLE,
            upperAngle: GameConstants.JOINT_UPPER_ANGLE,
          };
        }
        return joint;
      });
      
      // Load muscles and set maxForce from constants (not saved)
      const loadedMuscles = data.muscles as Array<Omit<CreatureDesign['muscles'][0], 'maxForce'>>;
      design.muscles = loadedMuscles.map((muscle) => ({
        ...muscle,
        maxForce: GameConstants.DEFAULT_MUSCLE_MAX_FORCE,
      }));

      // Validate loaded data
      const validation = this.validateCreature(design);
      if (!validation.valid) {
        throw new InvalidCreatureError([
          'Corrupted creature design data',
          ...validation.errors,
        ]);
      }

      return design;
    } catch (error) {
      if (error instanceof InvalidCreatureError) {
        throw error;
      }
      // Handle corrupted data gracefully
      throw new InvalidCreatureError([
        'Failed to load creature design: corrupted or invalid data',
      ]);
    }
  }

  /**
   * List all saved creature designs
   */
  async listCreatures(): Promise<CreatureDesign[]> {
    const creatures: CreatureDesign[] = [];
    const keys: string[] = [];

    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keys.push(key);
      }
    }

    // Load each creature
    for (const key of keys) {
      const id = key.replace(STORAGE_KEY_PREFIX, '');
      try {
        const creature = await this.loadCreature(id);
        if (creature) {
          creatures.push(creature);
        }
      } catch (error) {
        // Skip corrupted creatures
        console.warn(`Failed to load creature ${id}:`, error);
      }
    }

    // Sort by updatedAt (most recent first)
    return creatures.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Delete creature design
   */
  async deleteCreature(id: string): Promise<void> {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    localStorage.removeItem(key);
  }

  /**
   * Validate creature design
   */
  validateCreature(design: CreatureDesign): ValidationResult {
    return validateCreatureDesign(design);
  }
}

// Error classes
export class StorageQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

export class InvalidCreatureError extends Error {
  public errors: string[];

  constructor(errors: string[]) {
    super('Invalid creature design');
    this.name = 'InvalidCreatureError';
    this.errors = errors;
  }
}

export class CreatureNotFoundError extends Error {
  constructor(id: string) {
    super(`Creature not found: ${id}`);
    this.name = 'CreatureNotFoundError';
  }
}

