/**
 * ObservationBuilder - Builds observation vectors from physics state, normalizes values, and maintains previous frame state
 */

import { TaskEnvironment } from './TaskEnvironment';
import { Position } from '../utils/types';

export class ObservationBuilder {
  readonly observationSize: number;
  private environment: TaskEnvironment;
  private previousJointPositions: Position[] = [];
  private previousTargetPosition: Position = { x: 0, y: 0 };

  constructor(environment: TaskEnvironment) {
    this.environment = environment;

    // Observation size: 2 (COM) + (num_joints * 2) + 2 (target) + 2 (prev COM) + (num_joints * 2) + 2 (prev target) = (num_joints * 4) + 8
    // This will be set when we know the number of joints
    this.observationSize = 8; // Minimum size (will be updated)
  }

  /**
   * Build observation vector from joint positions and target position
   */
  buildObservation(
    jointPositions: Position[],
    targetPosition: Position
  ): number[] {
    const observation: number[] = [];

    // On first frame, initialize previous values to current values
    if (this.previousJointPositions.length === 0) {
      this.previousJointPositions = [...jointPositions];
      this.previousTargetPosition = { ...targetPosition };
    }

    // Calculate center of mass (mean of all joint positions)
    const centerOfMass = this.calculateCenterOfMass(jointPositions);
    const prevCOM = this.calculateCenterOfMass(this.previousJointPositions);

    // Normalize center of mass positions
    const normalizedCOM = this.normalizePosition(centerOfMass);
    const normalizedPrevCOM = this.normalizePosition(prevCOM);
    
    observation.push(normalizedCOM.x, normalizedCOM.y);

    // Make positions relative to center of mass and normalize
    const normalizedJoints = jointPositions.map((pos) => {
      const relativePos = {
        x: pos.x - centerOfMass.x,
        y: pos.y - centerOfMass.y
      };
      return this.normalizePosition(relativePos);
    });

    const relativeTarget = {
      x: targetPosition.x - centerOfMass.x,
      y: targetPosition.y - centerOfMass.y
    };
    const normalizedTarget = this.normalizePosition(relativeTarget);

    // Current frame: joint positions (relative to COM)
    normalizedJoints.forEach((pos) => {
      observation.push(pos.x, pos.y);
    });

    // Current frame: target position (relative to COM)
    observation.push(normalizedTarget.x, normalizedTarget.y);

    // Previous frame: center of mass
    observation.push(normalizedPrevCOM.x, normalizedPrevCOM.y);

    // Previous frame: joint positions (relative to previous COM)
    const normalizedPrevJoints = this.previousJointPositions.map((pos) => {
      const relativePos = {
        x: pos.x - prevCOM.x,
        y: pos.y - prevCOM.y
      };
      return this.normalizePosition(relativePos);
    });
      normalizedPrevJoints.forEach((pos) => {
        observation.push(pos.x, pos.y);
      });

    // Previous frame: target position (relative to previous COM)
    const relativePrevTarget = {
      x: this.previousTargetPosition.x - prevCOM.x,
      y: this.previousTargetPosition.y - prevCOM.y
    };
    const normalizedPrevTarget = this.normalizePosition(relativePrevTarget);
    observation.push(normalizedPrevTarget.x, normalizedPrevTarget.y);

    // Update previous frame state
    this.previousJointPositions = [...jointPositions];
    this.previousTargetPosition = { ...targetPosition };

    return observation;
  }

  /**
   * Calculate center of mass (mean position) from joint positions
   */
  calculateCenterOfMass(positions: Position[]): Position {
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = positions.reduce(
      (acc, pos) => ({
        x: acc.x + pos.x,
        y: acc.y + pos.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length,
    };
  }

  /**
   * Normalize position by dividing by 10
   */
  normalizePosition(pos: Position): Position {
    return {
      x: pos.x / 10,
      y: pos.y / 10,
    };
  }

  /**
   * Get observation size (depends on number of joints)
   */
  getObservationSize(numJoints: number): number {
    // 2 (COM) + (num_joints * 2) + 2 (target) + 2 (prev COM) + (num_joints * 2) + 2 (prev target) = (num_joints * 4) + 8
    return numJoints * 4 + 8;
  }

  /**
   * Reset observation builder (clear previous frame state)
   */
  reset(): void {
    this.previousJointPositions = [];
    this.previousTargetPosition = this.environment.getTargetPosition();
  }
}

