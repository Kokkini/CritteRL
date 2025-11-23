/**
 * CreatureDesign - Complete creature structure definition
 */

import { nanoid } from 'nanoid';
import {
  CreatureDesign,
  Bone,
  Joint,
  Muscle,
  Position,
} from './types';
import { validateCreatureDesign, ValidationResult } from './validation';
import { GameConstants } from './constants';

export class CreatureDesignImpl implements CreatureDesign {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  bones: Bone[];
  joints: Joint[];
  muscles: Muscle[];

  constructor(name: string = '') {
    this.id = nanoid();
    this.name = name;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.bones = [];
    this.joints = [];
    this.muscles = [];
  }

  addBone(bone: Bone): void {
    this.bones.push(bone);
    this.updatedAt = new Date();
  }

  removeBone(id: string): void {
    this.bones = this.bones.filter((b) => b.id !== id);
    // Remove joints and muscles that reference this bone
    this.joints = this.joints.filter(
      (j) => j.boneAId !== id && j.boneBId !== id
    );
    this.muscles = this.muscles.filter(
      (m) => m.boneAId !== id && m.boneBId !== id
    );
    this.updatedAt = new Date();
  }

  addJoint(joint: Joint): void {
    this.joints.push(joint);
    this.updatedAt = new Date();
  }

  removeJoint(id: string): void {
    this.joints = this.joints.filter((j) => j.id !== id);
    this.updatedAt = new Date();
  }

  addMuscle(muscle: Muscle): void {
    this.muscles.push(muscle);
    this.updatedAt = new Date();
  }

  removeMuscle(id: string): void {
    this.muscles = this.muscles.filter((m) => m.id !== id);
    this.updatedAt = new Date();
  }

  getBones(): Bone[] {
    return [...this.bones];
  }

  getJoints(): Joint[] {
    return [...this.joints];
  }

  getMuscles(): Muscle[] {
    return [...this.muscles];
  }

  getMeanJointPosition(): Position {
    if (this.bones.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = this.bones.reduce(
      (acc, bone) => ({
        x: acc.x + bone.position.x,
        y: acc.y + bone.position.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / this.bones.length,
      y: sum.y / this.bones.length,
    };
  }

  validate(): ValidationResult {
    return validateCreatureDesign(this);
  }

  toJSON(): string {
    // Save bones without density (will be set from constants on load)
    const bonesToSave = this.bones.map(({ density, ...bone }) => bone);
    
    // Save muscles without maxForce (will be set from constants on load)
    const musclesToSave = this.muscles.map(({ maxForce, ...muscle }) => muscle);
    
    return JSON.stringify({
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      bones: bonesToSave,
      joints: this.joints,
      muscles: musclesToSave,
    });
  }

  static fromJSON(json: string): CreatureDesignImpl {
    const data = JSON.parse(json);
    const design = new CreatureDesignImpl(data.name);
    design.id = data.id;
    design.createdAt = new Date(data.createdAt);
    design.updatedAt = new Date(data.updatedAt);
    
    // Load bones and set density from constants (not saved)
    const loadedBones = data.bones as Array<Omit<Bone, 'density'>>;
    design.bones = loadedBones.map((bone) => ({
      ...bone,
      density: GameConstants.DEFAULT_BONE_DENSITY,
    }));
    
    design.joints = data.joints;
    
    // Load muscles and set maxForce from constants (not saved)
    const loadedMuscles = data.muscles as Array<Omit<Muscle, 'maxForce'>>;
    design.muscles = loadedMuscles.map((muscle) => ({
      ...muscle,
      maxForce: GameConstants.DEFAULT_MUSCLE_MAX_FORCE,
    }));
    
    return design;
  }
}

