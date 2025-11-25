/**
 * RunningObservationBuilder - Builds observation vectors for running task
 * Similar to RunningBrain from Evolution reference
 */

import { CreaturePhysics } from '../physics/CreaturePhysics';
import { Position } from '../utils/types';
import { GameConstants } from '../utils/constants';

export class RunningObservationBuilder {
  readonly observationSize: number = 8; // Fixed size: 6 basic + 2 direction
  private groundLevel: number;

  constructor(groundLevel: number) {
    this.groundLevel = groundLevel;
  }

  /**
   * Build observation vector for running task
   * Inputs (8 total):
   * 1. Distance from ground (lowest joint Y position)
   * 2. Horizontal velocity (dx) - average of all joints
   * 3. Vertical velocity (dy) - average of all joints
   * 4. Rotational velocity - average of all bones
   * 5. Number of points touching ground
   * 6. Creature rotation - average of all bones
   * 7. Running direction X (unit vector component)
   * 8. Running direction Y (unit vector component)
   */
  buildObservation(
    jointPositions: Position[],
    creaturePhysics: CreaturePhysics,
    runningDirection: { x: number; y: number }
  ): number[] {
    const observation: number[] = [];

    // 1. Distance from ground (lowest joint Y position)
    const distanceFromGround = this.calculateDistanceFromGround(jointPositions);
    observation.push(distanceFromGround);

    // 2-3. Average velocity (horizontal and vertical)
    const avgVelocity = this.calculateAverageVelocity(creaturePhysics);
    observation.push(avgVelocity.x); // Horizontal velocity
    observation.push(avgVelocity.y); // Vertical velocity

    // 4. Average angular velocity
    const avgAngularVelocity = this.calculateAverageAngularVelocity(creaturePhysics);
    observation.push(avgAngularVelocity);

    // 5. Number of points touching ground
    const groundContacts = this.countGroundContacts(creaturePhysics, jointPositions);
    observation.push(groundContacts);

    // 6. Average rotation
    const avgRotation = this.calculateAverageRotation(creaturePhysics);
    observation.push(avgRotation);

    // 7-8. Running direction (unit vector)
    observation.push(runningDirection.x);
    observation.push(runningDirection.y);

    return observation;
  }

  /**
   * Calculate distance from ground (lowest joint Y position)
   */
  private calculateDistanceFromGround(jointPositions: Position[]): number {
    if (jointPositions.length === 0) {
      return 0;
    }

    let minY = jointPositions[0].y;
    for (let i = 1; i < jointPositions.length; i++) {
      if (jointPositions[i].y < minY) {
        minY = jointPositions[i].y;
      }
    }

    // Distance from ground level (groundLevel is the Y coordinate of ground surface)
    // If joint is below ground, distance is negative
    return minY - this.groundLevel;
  }

  /**
   * Calculate average velocity of all joints (bones)
   */
  private calculateAverageVelocity(creaturePhysics: CreaturePhysics): Position {
    const bodies = creaturePhysics.getBodies();
    if (bodies.length === 0) {
      return { x: 0, y: 0 };
    }

    let sumX = 0;
    let sumY = 0;

    for (const body of bodies) {
      const velocity = body.getLinearVelocity();
      sumX += velocity.x;
      sumY += velocity.y;
    }

    return {
      x: sumX / bodies.length,
      y: sumY / bodies.length,
    };
  }

  /**
   * Calculate average angular velocity of all bones
   */
  private calculateAverageAngularVelocity(creaturePhysics: CreaturePhysics): number {
    const bodies = creaturePhysics.getBodies();
    if (bodies.length === 0) {
      return 0;
    }

    let sum = 0;
    for (const body of bodies) {
      sum += body.getAngularVelocity();
    }

    return sum / bodies.length;
  }

  /**
   * Count number of joints (bones) touching ground
   * A joint is considered touching ground if its Y position is close to ground level
   */
  private countGroundContacts(
    creaturePhysics: CreaturePhysics,
    jointPositions: Position[]
  ): number {
    const contactThreshold = 0.1; // 10cm threshold
    let count = 0;

    for (const pos of jointPositions) {
      const distanceFromGround = pos.y - this.groundLevel;
      if (Math.abs(distanceFromGround) < contactThreshold) {
        count++;
      }
    }

    return count;
  }

  /**
   * Calculate average rotation of all bones
   * Normalized similar to Evolution reference: (angle - 180°) * 0.002778
   */
  private calculateAverageRotation(creaturePhysics: CreaturePhysics): number {
    const bodies = creaturePhysics.getBodies();
    if (bodies.length === 0) {
      return 0;
    }

    let sum = 0;
    for (const body of bodies) {
      const angle = body.getAngle(); // Angle in radians
      const angleDegrees = (angle * 180) / Math.PI; // Convert to degrees
      // Normalize: (angleDegrees - 180) * 0.002778
      sum += (angleDegrees - 180) * 0.002778;
    }

    return sum / bodies.length;
  }

  /**
   * Get observation size (fixed at 8 for running task)
   */
  getObservationSize(_numJoints?: number): number {
    return this.observationSize;
  }

  /**
   * Reset observation builder (clear any cached state)
   */
  reset(): void {
    // No state to reset for running task
  }
}

