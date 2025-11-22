/**
 * Muscle - Actuator connecting two bones
 */

import { Muscle, ValidationResult, CreatureDesign } from './types';
import { validateMuscle } from './validation';

export class MuscleImpl implements Muscle {
  id: string;
  boneAId: string;
  boneBId: string;
  maxForce: number;
  restLength: number;

  constructor(
    id: string,
    boneAId: string,
    boneBId: string,
    maxForce: number,
    restLength: number
  ) {
    this.id = id;
    this.boneAId = boneAId;
    this.boneBId = boneBId;
    this.maxForce = maxForce;
    this.restLength = restLength;
  }

  getBoneAId(): string {
    return this.boneAId;
  }

  getBoneBId(): string {
    return this.boneBId;
  }

  getRestLength(): number {
    return this.restLength;
  }

  setRestLength(length: number): void {
    this.restLength = length;
  }

  getMaxForce(): number {
    return this.maxForce;
  }

  setMaxForce(force: number): void {
    this.maxForce = force;
  }

  validate(creature: CreatureDesign): ValidationResult {
    return validateMuscle(this, creature);
  }
}

