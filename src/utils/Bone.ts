/**
 * Bone - Individual bone component
 */

import { Bone, Position, Size, ValidationResult } from './types';
import { validateBone } from './validation';

export class BoneImpl implements Bone {
  id: string;
  position: Position;
  size: Size;
  angle: number;
  density: number;

  constructor(
    id: string,
    position: Position,
    size: Size,
    angle: number = 0,
    density: number = 1.0
  ) {
    this.id = id;
    this.position = { ...position };
    this.size = { ...size };
    this.angle = angle;
    this.density = density;
  }

  getPosition(): Position {
    return { ...this.position };
  }

  setPosition(pos: Position): void {
    this.position = { ...pos };
  }

  getSize(): Size {
    return { ...this.size };
  }

  setSize(size: Size): void {
    this.size = { ...size };
  }

  validate(): ValidationResult {
    return validateBone(this);
  }
}

