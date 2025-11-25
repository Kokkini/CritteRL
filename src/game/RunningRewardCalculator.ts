/**
 * RunningRewardCalculator - Calculates rewards for running task based on distance moved in direction
 */

import { RewardFunctionConfig } from '../utils/types';

export class RunningRewardCalculator {
  readonly config: RewardFunctionConfig;

  constructor(config: RewardFunctionConfig) {
    this.config = config;
  }

  /**
   * Calculate step reward based on delta distance moved in running direction
   * @param deltaDistanceInDirection - Distance moved parallel to running direction (positive = good)
   * @param deltaTime - Time step in seconds
   */
  calculateStepReward(
    deltaDistanceInDirection: number,
    deltaTime: number
  ): number {
    let reward = 0;

    // Primary reward: factor * deltaDistanceInDirection
    // Positive when moving in the running direction
    reward += this.config.distanceProgressRewardFactor * deltaDistanceInDirection;

    // Time penalty (encourages faster movement)
    reward -= this.config.timePenaltyFactor * deltaTime;

    // Note: No completion bonus (episode ends on time limit only)
    // Note: No absolute distance penalty (we want to reward any movement in direction)

    return reward;
  }

  /**
   * Reset calculator state
   */
  reset(_initialDistance?: number): void {
    // No state to reset for running task
  }

  /**
   * Update previous distance (not used for running task, kept for interface compatibility)
   */
  updatePreviousDistance(_distance: number): void {
    // No state to update for running task
  }
}

