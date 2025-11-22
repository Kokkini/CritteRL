/**
 * Joint - Connection between two bones
 */

import { Joint, Position, ValidationResult, CreatureDesign } from './types';
import { validateJoint } from './validation';
import { GameConstants } from './constants';

export class JointImpl implements Joint {
  id: string;
  boneAId: string;
  boneBId: string;
  anchorA: Position;
  anchorB: Position;
  lowerAngle: number | null;
  upperAngle: number | null;
  enableLimit: boolean;

  constructor(
    id: string,
    boneAId: string,
    boneBId: string,
    anchorA: Position = { x: 0, y: 0 },
    anchorB: Position = { x: 0, y: 0 },
    lowerAngle: number | null = GameConstants.JOINT_LOWER_ANGLE,
    upperAngle: number | null = GameConstants.JOINT_UPPER_ANGLE,
    enableLimit: boolean = true
  ) {
    this.id = id;
    this.boneAId = boneAId;
    this.boneBId = boneBId;
    this.anchorA = { ...anchorA };
    this.anchorB = { ...anchorB };
    this.lowerAngle = lowerAngle;
    this.upperAngle = upperAngle;
    this.enableLimit = enableLimit;
  }

  getBoneAId(): string {
    return this.boneAId;
  }

  getBoneBId(): string {
    return this.boneBId;
  }

  getAnchorA(): Position {
    return { ...this.anchorA };
  }

  getAnchorB(): Position {
    return { ...this.anchorB };
  }

  validate(creature: CreatureDesign): ValidationResult {
    return validateJoint(this, creature);
  }
}

