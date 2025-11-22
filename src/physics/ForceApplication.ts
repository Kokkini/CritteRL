/**
 * ForceApplication - Applies muscle forces to physics bodies based on RL actions
 */

import * as planck from 'planck';
import { CreaturePhysics } from './CreaturePhysics';
import { Muscle, Position } from '../utils/types';
import { GameConstants } from '../utils/constants';

export class ForceApplication {
  private creaturePhysics: CreaturePhysics;

  constructor(creaturePhysics: CreaturePhysics) {
    this.creaturePhysics = creaturePhysics;
  }

  /**
   * Apply muscle forces based on RL actions
   */
  applyMuscleForces(actions: number[]): void {
    const design = this.creaturePhysics.creature.design;
    const muscles = design.muscles;

    if (actions.length !== muscles.length) {
      console.warn(
        `[ForceApplication] Action count (${actions.length}) doesn't match muscle count (${muscles.length})`
      );
      return;
    }

    muscles.forEach((muscle, index) => {
      const action = Math.max(
        GameConstants.MUSCLE_ACTION_MIN,
        Math.min(GameConstants.MUSCLE_ACTION_MAX, actions[index])
      ); // Clamp to [MUSCLE_ACTION_MIN, MUSCLE_ACTION_MAX]
      const currentLength = this.getMuscleLength(muscle);
      const force = this.calculateMuscleForce(muscle, action, currentLength);

      // Apply force to both bones
      const bodyA = this.creaturePhysics.getBodyForBone(muscle.boneAId);
      const bodyB = this.creaturePhysics.getBodyForBone(muscle.boneBId);

      if (!bodyA || !bodyB) {
        console.warn(`[ForceApplication] Missing bodies for muscle ${index}`);
        return;
      }

      const posA = bodyA.getPosition();
      const posB = bodyB.getPosition();
      
      // Check if positions are valid
      if (!posA || !posB || typeof posA.x !== 'number' || typeof posB.x !== 'number') {
        console.warn(`[ForceApplication] Invalid positions for muscle ${index}`);
        return;
      }
      
      const direction = planck.Vec2(posB.x - posA.x, posB.y - posA.y);
      const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);

      if (length > 0.001) {
        // Normalize direction
        const normalizedDir = planck.Vec2(direction.x / length, direction.y / length);

        // Force magnitude (force.x contains the scalar force value)
        const forceMagnitude = force.x;
        
        // Apply force in the direction of the muscle (along the line between bones)
        // Force pulls bones together (negative) or pushes them apart (positive)
        // Half the force to each body, in opposite directions
        const forceA = planck.Vec2(
          normalizedDir.x * forceMagnitude * 0.5,
          normalizedDir.y * forceMagnitude * 0.5
        );
        const forceB = planck.Vec2(
          -normalizedDir.x * forceMagnitude * 0.5,
          -normalizedDir.y * forceMagnitude * 0.5
        );
        
        // Wake up bodies if they're sleeping (so forces can affect them)
        if (bodyA.isAwake() === false) {
          bodyA.setAwake(true);
        }
        if (bodyB.isAwake() === false) {
          bodyB.setAwake(true);
        }
        
        // Apply force at the center of each body
        bodyA.applyForce(forceA, posA);
        bodyB.applyForce(forceB, posB);
      }
    });
  }

  /**
   * Calculate muscle force based on action and current length
   */
  calculateMuscleForce(
    muscle: Muscle,
    action: number,
    currentLength: number
  ): Position {
    // Target length: restLength × (1 + action)
    // action = +1.0 → targetLength = restLength × 2.0 (fully expanded)
    // action = 0.0 → targetLength = restLength (at rest)
    // action = -1.0 → targetLength = restLength × 0.0 (fully contracted)
    const targetLength = muscle.restLength * (1 + action);

    // Spring force: k × (currentLength - targetLength)
    const lengthDifference = currentLength - targetLength;
    const forceMagnitude = GameConstants.MUSCLE_SPRING_CONSTANT * lengthDifference;

    // Clamp force to maxForce
    const clampedForce = Math.max(
      -muscle.maxForce,
      Math.min(muscle.maxForce, forceMagnitude)
    );

    return { x: clampedForce, y: 0 }; // Direction is applied separately
  }

  /**
   * Get current length of a muscle
   */
  getMuscleLength(muscle: Muscle): number {
    const bodyA = this.creaturePhysics.getBodyForBone(muscle.boneAId);
    const bodyB = this.creaturePhysics.getBodyForBone(muscle.boneBId);

    if (!bodyA || !bodyB) {
      return muscle.restLength;
    }

    const posA = bodyA.getPosition();
    const posB = bodyB.getPosition();

    // Check if positions are valid
    if (!posA || !posB || typeof posA.x !== 'number' || typeof posB.x !== 'number') {
      return muscle.restLength;
    }

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
}

