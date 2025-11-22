/**
 * TaskEnvironment - Manages task environment setup, handles task state, computes rewards, and determines completion
 */

import {
  TaskConfig,
  Position,
  EnvironmentConfig,
} from '../utils/types';
import { GameConstants } from '../utils/constants';

export class TaskEnvironment {
  readonly config: TaskConfig;
  readonly targetPosition: Position;
  readonly startPosition: Position;
  readonly maxEpisodeTime: number;
  readonly completionRadius: number;
  private elapsedTime: number = 0;
  private previousDistance: number = 0;
  private completed: boolean = false;

  constructor(config: TaskConfig) {
    this.config = config;
    this.targetPosition = { ...config.targetPosition };
    this.startPosition = { ...config.startPosition };
    this.maxEpisodeTime = config.maxEpisodeTime;
    this.completionRadius = config.completionRadius;
    this.reset();
  }

  /**
   * Reset environment to initial state
   */
  reset(initialPosition?: Position): void {
    this.elapsedTime = 0;
    // Use provided initial position or start position as fallback
    const pos = initialPosition || this.startPosition;
    this.previousDistance = this.getDistanceToTarget(pos);
    this.completed = false;
  }

  /**
   * Step environment (update time)
   */
  step(deltaTime: number): void {
    if (!this.completed) {
      this.elapsedTime += deltaTime;
      if (this.elapsedTime >= this.maxEpisodeTime) {
        // Time limit reached
      }
    }
  }

  /**
   * Get distance to target from mean joint position
   */
  getDistanceToTarget(meanJointPosition: Position): number {
    const dx = meanJointPosition.x - this.targetPosition.x;
    const dy = meanJointPosition.y - this.targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if task is completed
   */
  isCompleted(meanJointPosition: Position): boolean {
    if (this.completed) {
      return true;
    }

    const distance = this.getDistanceToTarget(meanJointPosition);
    if (distance <= this.completionRadius) {
      this.completed = true;
      return true;
    }

    return false;
  }

  /**
   * Get reward (computed externally by RewardCalculator)
   * This method is kept for compatibility but actual reward calculation is in RewardCalculator
   */
  getReward(): number {
    return 0; // Reward is calculated by RewardCalculator
  }

  /**
   * Get target position
   */
  getTargetPosition(): Position {
    return { ...this.targetPosition };
  }

  /**
   * Get start position
   */
  getStartPosition(): Position {
    return { ...this.startPosition };
  }

  /**
   * Get elapsed time
   */
  getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Get previous distance (for reward calculation)
   */
  getPreviousDistance(): number {
    return this.previousDistance;
  }

  /**
   * Update previous distance
   */
  updatePreviousDistance(distance: number): void {
    this.previousDistance = distance;
  }

  /**
   * Check if time limit reached
   */
  isTimeLimitReached(): boolean {
    return this.elapsedTime >= this.maxEpisodeTime;
  }
}

