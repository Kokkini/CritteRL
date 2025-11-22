/**
 * ObservationBuilder - Builds observation vectors from physics state, normalizes values, and maintains previous frame state
 */

import { TaskEnvironment } from './TaskEnvironment';
import { Position } from '../utils/types';
import { GameConstants } from '../utils/constants';

export class ObservationBuilder {
  readonly observationSize: number;
  private environment: TaskEnvironment;
  private previousJointPositions: Position[] = [];
  private previousTargetPosition: Position = { x: 0, y: 0 };
  private environmentBounds: { width: number; height: number };

  constructor(environment: TaskEnvironment) {
    this.environment = environment;
    const envConfig = environment.config.environment;
    this.environmentBounds = {
      width: envConfig.width,
      height: envConfig.height,
    };

    // Observation size: (num_joints * 2 * 2) + (2 * 2) = (num_joints * 4) + 4
    // This will be set when we know the number of joints
    this.observationSize = 4; // Minimum size (will be updated)
  }

  /**
   * Build observation vector from joint positions and target position
   */
  buildObservation(
    jointPositions: Position[],
    targetPosition: Position
  ): number[] {
    const observation: number[] = [];

    // Normalize positions
    const normalizedJoints = jointPositions.map((pos) =>
      this.normalizePosition(pos)
    );
    const normalizedTarget = this.normalizePosition(targetPosition);

    // Current frame: joint positions
    normalizedJoints.forEach((pos) => {
      observation.push(pos.x, pos.y);
    });

    // Current frame: target position
    observation.push(normalizedTarget.x, normalizedTarget.y);

    // Previous frame: joint positions (or zeros if first frame)
    if (this.previousJointPositions.length === jointPositions.length) {
      const normalizedPrevJoints = this.previousJointPositions.map((pos) =>
        this.normalizePosition(pos)
      );
      normalizedPrevJoints.forEach((pos) => {
        observation.push(pos.x, pos.y);
      });
    } else {
      // First frame: use zeros
      jointPositions.forEach(() => {
        observation.push(0, 0);
      });
    }

    // Previous frame: target position
    const normalizedPrevTarget = this.normalizePosition(this.previousTargetPosition);
    observation.push(normalizedPrevTarget.x, normalizedPrevTarget.y);

    // Update previous frame state
    this.previousJointPositions = [...jointPositions];
    this.previousTargetPosition = { ...targetPosition };

    return observation;
  }

  /**
   * Normalize position to [-1, 1] range based on environment bounds
   */
  normalizePosition(pos: Position): Position {
    const normalizedX =
      (pos.x / this.environmentBounds.width) * 2 - 1; // Map [0, width] to [-1, 1]
    const normalizedY =
      (pos.y / this.environmentBounds.height) * 2 - 1; // Map [0, height] to [-1, 1]

    // Clamp to [-1, 1]
    return {
      x: Math.max(-1, Math.min(1, normalizedX)),
      y: Math.max(-1, Math.min(1, normalizedY)),
    };
  }

  /**
   * Get observation size (depends on number of joints)
   */
  getObservationSize(numJoints: number): number {
    // (num_joints * 2 * 2) + (2 * 2) = (num_joints * 4) + 4
    return numJoints * 4 + 4;
  }

  /**
   * Reset observation builder (clear previous frame state)
   */
  reset(): void {
    this.previousJointPositions = [];
    this.previousTargetPosition = this.environment.getTargetPosition();
  }
}

