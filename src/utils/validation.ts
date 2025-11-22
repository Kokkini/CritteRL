/**
 * Validation utilities
 */

import { ValidationResult, CreatureDesign, Bone, Joint, Muscle } from './types';

/**
 * Create a validation result
 */
export function createValidationResult(
  valid: boolean,
  errors: string[] = []
): ValidationResult {
  return { valid, errors };
}

/**
 * Validate a bone
 */
export function validateBone(bone: Bone): ValidationResult {
  const errors: string[] = [];

  if (!bone.id || bone.id.trim() === '') {
    errors.push('Bone must have a valid ID');
  }

  if (!Number.isFinite(bone.position.x) || !Number.isFinite(bone.position.y)) {
    errors.push('Bone position must be finite numbers');
  }

  if (!Number.isFinite(bone.size.width) || bone.size.width <= 0) {
    errors.push('Bone width must be a positive finite number');
  }

  if (!Number.isFinite(bone.size.height) || bone.size.height <= 0) {
    errors.push('Bone height must be a positive finite number');
  }

  if (!Number.isFinite(bone.angle)) {
    errors.push('Bone angle must be a finite number');
  }

  if (!Number.isFinite(bone.density) || bone.density <= 0) {
    errors.push('Bone density must be a positive finite number');
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a joint
 */
export function validateJoint(joint: Joint, creature: CreatureDesign): ValidationResult {
  const errors: string[] = [];

  if (!joint.id || joint.id.trim() === '') {
    errors.push('Joint must have a valid ID');
  }

  // Check bone references
  const boneA = creature.bones.find((b) => b.id === joint.boneAId);
  const boneB = creature.bones.find((b) => b.id === joint.boneBId);

  if (!boneA) {
    errors.push(`Joint references invalid boneA: ${joint.boneAId}`);
  }

  if (!boneB) {
    errors.push(`Joint references invalid boneB: ${joint.boneBId}`);
  }

  if (joint.boneAId === joint.boneBId) {
    errors.push('Joint cannot connect a bone to itself');
  }

  // Validate angle limits
  if (joint.enableLimit) {
    if (joint.lowerAngle === null || joint.upperAngle === null) {
      errors.push('Joint angle limits must be set when enableLimit is true');
    } else if (!Number.isFinite(joint.lowerAngle) || !Number.isFinite(joint.upperAngle)) {
      errors.push('Joint angle limits must be finite numbers');
    } else if (joint.lowerAngle >= joint.upperAngle) {
      errors.push('Joint lowerAngle must be less than upperAngle');
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a muscle
 */
export function validateMuscle(muscle: Muscle, creature: CreatureDesign): ValidationResult {
  const errors: string[] = [];

  if (!muscle.id || muscle.id.trim() === '') {
    errors.push('Muscle must have a valid ID');
  }

  // Check bone references
  const boneA = creature.bones.find((b) => b.id === muscle.boneAId);
  const boneB = creature.bones.find((b) => b.id === muscle.boneBId);

  if (!boneA) {
    errors.push(`Muscle references invalid boneA: ${muscle.boneAId}`);
  }

  if (!boneB) {
    errors.push(`Muscle references invalid boneB: ${muscle.boneBId}`);
  }

  if (muscle.boneAId === muscle.boneBId) {
    errors.push('Muscle cannot connect a bone to itself');
  }

  if (!Number.isFinite(muscle.maxForce) || muscle.maxForce <= 0) {
    errors.push('Muscle maxForce must be a positive finite number');
  }

  if (!Number.isFinite(muscle.restLength) || muscle.restLength < 0) {
    errors.push('Muscle restLength must be a non-negative finite number');
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a creature design
 */
export function validateCreatureDesign(design: CreatureDesign): ValidationResult {
  const errors: string[] = [];

  if (!design.id || design.id.trim() === '') {
    errors.push('Creature design must have a valid ID');
  }

  // At least one bone required
  if (!design.bones || design.bones.length === 0) {
    errors.push('Creature design must have at least one bone');
  }

  // Validate all bones
  design.bones.forEach((bone) => {
    const result = validateBone(bone);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `Bone ${bone.id}: ${e}`));
    }
  });

  // Check for duplicate bone IDs
  const boneIds = design.bones.map((b) => b.id);
  const uniqueBoneIds = new Set(boneIds);
  if (boneIds.length !== uniqueBoneIds.size) {
    errors.push('Creature design has duplicate bone IDs');
  }

  // Validate all joints
  design.joints.forEach((joint) => {
    const result = validateJoint(joint, design);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `Joint ${joint.id}: ${e}`));
    }
  });

  // Check for duplicate joint IDs
  const jointIds = design.joints.map((j) => j.id);
  const uniqueJointIds = new Set(jointIds);
  if (jointIds.length !== uniqueJointIds.size) {
    errors.push('Creature design has duplicate joint IDs');
  }

  // Validate all muscles
  design.muscles.forEach((muscle) => {
    const result = validateMuscle(muscle, design);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `Muscle ${muscle.id}: ${e}`));
    }
  });

  // Check for duplicate muscle IDs
  const muscleIds = design.muscles.map((m) => m.id);
  const uniqueMuscleIds = new Set(muscleIds);
  if (muscleIds.length !== uniqueMuscleIds.size) {
    errors.push('Creature design has duplicate muscle IDs');
  }

  return createValidationResult(errors.length === 0, errors);
}

