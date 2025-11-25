/**
 * RunningTaskEnvironment - Manages running task environment, direction, and distance calculations
 */

import { TaskConfig, Position } from '../utils/types';

export class RunningTaskEnvironment {
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
    this.reset();
  }

  /**
   * Reset environment to initial state and randomize running direction
   */
  reset(initialPosition?: Position): void {
    this.elapsedTime = 0;
    const pos = initialPosition || this.startPosition;
    this.previousPosition = { ...pos };
    this.episodeStartPosition = { ...pos };
    
    // Randomly choose direction: (1, 0) or (-1, 0)
    const directionX = Math.random() < 0.5 ? 1 : -1;
    this.runningDirection = { x: directionX, y: 0 }; // Unit vector (normalized)
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

