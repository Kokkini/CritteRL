/**
 * AquariumRunningTaskEnvironment - Running task environment for aquarium creatures
 * Allows external control of running direction (not randomized on reset)
 */

import { TaskConfig, Position } from '../utils/types';

export class AquariumRunningTaskEnvironment {
  readonly config: TaskConfig;
  readonly startPosition: Position;
  readonly maxEpisodeTime: number;
  private elapsedTime: number = 0;
  private runningDirection: { x: number; y: number } = { x: 1, y: 0 }; // Unit vector
  private previousPosition: Position;
  private episodeStartPosition: Position;

  constructor(config: TaskConfig) {
    this.config = config;
    this.startPosition = { ...config.startPosition };
    this.maxEpisodeTime = config.maxEpisodeTime;
    this.previousPosition = { ...this.startPosition };
    this.episodeStartPosition = { ...this.startPosition };
  }

  /**
   * Reset environment to initial state (does NOT randomize direction)
   */
  reset(initialPosition?: Position): void {
    this.elapsedTime = 0;
    const pos = initialPosition || this.startPosition;
    this.previousPosition = { ...pos };
    this.episodeStartPosition = { ...pos };
    // Direction is NOT randomized - it's set externally
  }

  /**
   * Set running direction externally (for aquarium)
   */
  setDirection(direction: { x: number; y: number }): void {
    // Ensure it's a unit vector
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length > 0) {
      this.runningDirection = { x: direction.x / length, y: direction.y / length };
    } else {
      this.runningDirection = { x: 1, y: 0 }; // Default to right
    }
  }

  /**
   * Step environment (update time)
   */
  step(deltaTime: number): void {
    this.elapsedTime += deltaTime;
  }

  /**
   * Get running direction unit vector
   */
  getRunningDirection(): { x: number; y: number } {
    return { ...this.runningDirection };
  }

  /**
   * Calculate distance moved parallel to running direction from episode start
   */
  calculateDistanceInDirection(currentPosition: Position): number {
    const dx = currentPosition.x - this.episodeStartPosition.x;
    const dy = currentPosition.y - this.episodeStartPosition.y;
    // Dot product: (dx, dy) · (direction.x, direction.y)
    return dx * this.runningDirection.x + dy * this.runningDirection.y;
  }

  /**
   * Calculate delta distance moved parallel to running direction since last step
   */
  getDeltaDistanceInDirection(currentPosition: Position): number {
    const dx = currentPosition.x - this.previousPosition.x;
    const dy = currentPosition.y - this.previousPosition.y;
    // Dot product: (dx, dy) · (direction.x, direction.y)
    const deltaDistance = dx * this.runningDirection.x + dy * this.runningDirection.y;
    
    // Update previous position
    this.previousPosition = { ...currentPosition };
    
    return deltaDistance;
  }

  /**
   * Get elapsed time
   */
  getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Check if time limit reached
   */
  isTimeLimitReached(): boolean {
    return this.elapsedTime >= this.maxEpisodeTime;
  }

  /**
   * Get start position
   */
  getStartPosition(): Position {
    return { ...this.startPosition };
  }
}

