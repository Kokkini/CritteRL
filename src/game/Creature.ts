/**
 * Creature - Represents a creature entity with bones, joints, and muscles
 */

import {
  CreatureDesign,
  Bone,
  Joint,
  Muscle,
  Position,
  ValidationResult,
} from '../utils/types';
import { validateCreatureDesign } from '../utils/validation';

export class Creature {
  readonly id: string;
  readonly name: string;
  readonly design: CreatureDesign;

  constructor(design: CreatureDesign) {
    this.id = design.id;
    this.name = design.name;
    this.design = design;
  }

  getBones(): Bone[] {
    return [...this.design.bones];
  }

  getJoints(): Joint[] {
    return [...this.design.joints];
  }

  getMuscles(): Muscle[] {
    return [...this.design.muscles];
  }

  getBone(id: string): Bone | null {
    return this.design.bones.find((b) => b.id === id) || null;
  }

  getJoint(id: string): Joint | null {
    return this.design.joints.find((j) => j.id === id) || null;
  }

  getMuscle(id: string): Muscle | null {
    return this.design.muscles.find((m) => m.id === id) || null;
  }

  /**
   * Get mean joint position in meters
   * Positions are now stored in meters in the design
   */
  getMeanJointPosition(): Position {
    if (this.design.bones.length === 0) {
      return { x: 0, y: 0 };
    }

    // Positions are already in meters
    const sum = this.design.bones.reduce(
      (acc, bone) => ({
        x: acc.x + bone.position.x,
        y: acc.y + bone.position.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / this.design.bones.length,
      y: sum.y / this.design.bones.length,
    };
  }

  validate(): ValidationResult {
    return validateCreatureDesign(this.design);
  }
}

