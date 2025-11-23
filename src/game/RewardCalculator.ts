/**
 * RewardCalculator - Calculates rewards based on distance changes, time penalties, and completion bonuses
 */

import { RewardFunctionConfig } from '../utils/types';

export class RewardCalculator {
  readonly config: RewardFunctionConfig;
  private previousDistance: number = 0;

  constructor(config: RewardFunctionConfig) {
    this.config = config;
  }

  /**
   * Calculate step reward
   */
  calculateStepReward(
    currentDistance: number,
    deltaTime: number,
    isCompleted: boolean
  ): number {
    let reward = 0;

    // Distance progress reward: factor * (prev_dist - current_dist)
    // Positive when getting closer (prev_dist > current_dist)
    const deltaDistance = this.previousDistance - currentDistance;
    reward += this.config.distanceProgressRewardFactor * deltaDistance;

    // Absolute distance penalty: -factor * abs_distance * deltaTime
    reward -= this.config.distancePenaltyFactor * currentDistance * deltaTime;

    // Time penalty (encourages faster completion)
    reward -= this.config.timePenaltyFactor * deltaTime;

    // Completion bonus (one-time when target reached)
    if (isCompleted) {
      reward += this.calculateCompletionBonus();
    }

    return reward;
  }

  /**
   * Calculate completion bonus
   */
  calculateCompletionBonus(): number {
    return this.config.completionBonus;
  }

  /**
   * Reset calculator state
   */
  reset(initialDistance: number): void {
    this.previousDistance = initialDistance;
  }

  /**
   * Get previous distance
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
}

