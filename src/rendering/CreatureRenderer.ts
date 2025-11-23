/**
 * CreatureRenderer - Renders creatures (bones, joints, muscles) on canvas
 */

import * as planck from 'planck';
import { CanvasRenderer } from './CanvasRenderer';
import { Creature } from '../game/Creature';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { CreatureState } from '../utils/types';
import { GameConstants } from '../utils/constants';

export class CreatureRenderer {
  private renderer: CanvasRenderer;

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer;
  }

  /**
   * Render creature with bones, joints, and muscles
   */
  render(
    creature: Creature,
    physics: CreaturePhysics,
    state: CreatureState,
    actions?: number[]
  ): void {
    const ctx = this.renderer.getContext();

    // Render muscles first (behind bones)
    this.renderMuscles(creature, physics, ctx, actions);

    // Render bones
    this.renderBones(creature, physics, state, ctx);

    // Render joints
    this.renderJoints(creature, physics, ctx);

    // Render mean joint position (red dot) - on top of everything
    this.renderMeanJointPosition(physics, ctx);
  }

  /**
   * Render a bone
   */
  private renderBone(
    body: planck.Body,
    bone: { size: { width: number; height: number } },
    state: CreatureState,
    index: number,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.save();

    const pos = body.getPosition();
    const angle = body.getAngle();
    
    // Convert world coordinates to screen coordinates via viewport
    const viewport = this.renderer.getViewport();
    const screenX = viewport ? viewport.worldToScreenX(pos.x) : pos.x;
    const screenY = viewport ? viewport.worldToScreenY(pos.y) : this.renderer.physicsToScreenY(pos.y);

    ctx.translate(screenX, screenY);
    // Negate angle because physics uses Y-up (counterclockwise positive) 
    // while screen uses Y-down (clockwise positive)
    // When we flip Y-axis, we also need to flip the rotation direction
    ctx.rotate(-angle);

    // Convert bone size from meters to screen pixels
    const pixelsPerMeter = viewport ? viewport.getPixelsPerMeter() : 1;
    // Sizes are now stored in meters, convert directly to screen pixels
    const boneWidthPx = bone.size.width * pixelsPerMeter;
    const boneHeightPx = bone.size.height * pixelsPerMeter;
    
    // Draw bone rectangle
    ctx.fillStyle = '#2196F3';
    ctx.strokeStyle = '#1976D2';
    ctx.lineWidth = 2;
    ctx.fillRect(
      -boneWidthPx / 2,
      -boneHeightPx / 2,
      boneWidthPx,
      boneHeightPx
    );
    ctx.strokeRect(
      -boneWidthPx / 2,
      -boneHeightPx / 2,
      boneWidthPx,
      boneHeightPx
    );

    ctx.restore();
  }

  /**
   * Render all bones
   */
  private renderBones(
    creature: Creature,
    physics: CreaturePhysics,
    state: CreatureState,
    ctx: CanvasRenderingContext2D
  ): void {
    const bodies = physics.getBodies();
    const bones = creature.getBones();

    bodies.forEach((body, index) => {
      if (index < bones.length) {
        this.renderBone(body, bones[index], state, index, ctx);
      }
    });
  }

  /**
   * Render a joint
   */
  private renderJoint(
    joint: planck.Joint,
    ctx: CanvasRenderingContext2D
  ): void {
    const bodyA = joint.getBodyA();
    const pos = bodyA.getPosition();
    
    // Convert world coordinates to screen coordinates via viewport
    const viewport = this.renderer.getViewport();
    const screenX = viewport ? viewport.worldToScreenX(pos.x) : pos.x;
    const screenY = viewport ? viewport.worldToScreenY(pos.y) : this.renderer.physicsToScreenY(pos.y);
    
    // Joint size in screen pixels
    const jointRadiusPx = viewport ? viewport.worldToScreenDistance(0.05) : 5; // 5cm radius

    ctx.fillStyle = '#9C27B0';
    ctx.beginPath();
    ctx.arc(screenX, screenY, jointRadiusPx, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render all joints
   */
  private renderJoints(
    creature: Creature,
    physics: CreaturePhysics,
    ctx: CanvasRenderingContext2D
  ): void {
    const joints = physics.getJoints();
    joints.forEach((joint) => {
      this.renderJoint(joint, ctx);
    });
  }

  /**
   * Interpolate between two colors smoothly
   * @param color1 - First color as hex string (e.g., '#0000FF')
   * @param color2 - Second color as hex string (e.g., '#00FF00')
   * @param t - Interpolation factor (0 = color1, 1 = color2)
   * @returns Interpolated color as hex string
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Parse hex colors to RGB
    const parseHex = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    
    const [r1, g1, b1] = parseHex(color1);
    const [r2, g2, b2] = parseHex(color2);
    
    // Linear interpolation
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get color for muscle based on action value with smooth interpolation
   * @param action - Action value (typically ranges from MUSCLE_ACTION_MIN to MUSCLE_ACTION_MAX)
   * @returns Color as hex string
   */
  private getActionColor(action: number): string {
    // Normalize action to [0, 1] range
    // Action ranges from MUSCLE_ACTION_MIN (-0.5) to MUSCLE_ACTION_MAX (0.5)
    const minAction = GameConstants.MUSCLE_ACTION_MIN;
    const maxAction = GameConstants.MUSCLE_ACTION_MAX;
    const normalized = (action - minAction) / (maxAction - minAction);
    
    // Define color stops: Blue (min) -> Green (middle) -> Red (max)
    const blue = '#0000FF';   // Strong contraction
    const green = '#00FF00';  // Neutral
    const red = '#FF0000';    // Strong extension
    
    // Interpolate between colors
    if (normalized < 0.5) {
      // Blue to Green (0 to 0.5)
      return this.interpolateColor(blue, green, normalized * 2);
    } else {
      // Green to Red (0.5 to 1.0)
      return this.interpolateColor(green, red, (normalized - 0.5) * 2);
    }
  }

  /**
   * Render a muscle
   */
  private renderMuscle(
    muscle: { boneAId: string; boneBId: string; restLength?: number },
    bodyA: planck.Body,
    bodyB: planck.Body,
    ctx: CanvasRenderingContext2D,
    action?: number
  ): void {
    const posA = bodyA.getPosition();
    const posB = bodyB.getPosition();
    
    if (!posA || !posB || typeof posA.x !== 'number' || typeof posB.x !== 'number') {
      console.warn('[CreatureRenderer] Invalid positions for muscle rendering');
      return;
    }
    
    // Convert world coordinates to screen coordinates via viewport
    const viewport = this.renderer.getViewport();
    if (!viewport) {
      console.warn('[CreatureRenderer] No viewport available for muscle rendering');
      return;
    }
    
    const screenXA = viewport.worldToScreenX(posA.x);
    const screenYA = viewport.worldToScreenY(posA.y);
    const screenXB = viewport.worldToScreenX(posB.x);
    const screenYB = viewport.worldToScreenY(posB.y);

    // Calculate current muscle length for visual feedback
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    
    // Color based on action value (if provided), otherwise fall back to length-based coloring
    let strokeColor = '#00FF00'; // Green (default)
    
    if (action !== undefined) {
      // Smooth color interpolation based on action value
      strokeColor = this.getActionColor(action);
    } else if (muscle.restLength !== undefined) {
      // Fallback to length-based coloring if no action provided
      const ratio = currentLength / muscle.restLength;
      if (ratio < 0.8) {
        strokeColor = '#FF0000'; // Red (contracted)
      } else if (ratio > 1.2) {
        strokeColor = '#00FF00'; // Green (extended)
      }
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenXA, screenYA);
    ctx.lineTo(screenXB, screenYB);
    ctx.stroke();
  }

  /**
   * Render all muscles
   */
  private renderMuscles(
    creature: Creature,
    physics: CreaturePhysics,
    ctx: CanvasRenderingContext2D,
    actions?: number[]
  ): void {
    const muscles = creature.getMuscles();

    if (muscles.length === 0) {
      return;
    }

    muscles.forEach((muscle, index) => {
      const bodyA = physics.getBodyForBone(muscle.boneAId);
      const bodyB = physics.getBodyForBone(muscle.boneBId);

      if (bodyA && bodyB) {
        const action = actions && actions[index] !== undefined ? actions[index] : undefined;
        this.renderMuscle(muscle, bodyA, bodyB, ctx, action);
      } else {
        console.warn(`[CreatureRenderer] Muscle ${index} (${muscle.boneAId} -> ${muscle.boneBId}): missing bodies`);
      }
    });
  }

  /**
   * Render mean joint position as a red dot
   * This represents the "center" of the creature used for win condition
   */
  private renderMeanJointPosition(
    physics: CreaturePhysics,
    ctx: CanvasRenderingContext2D
  ): void {
    const jointPositions = physics.getJointPositions();
    
    if (jointPositions.length === 0) {
      return;
    }

    // Calculate mean position
    const sum = jointPositions.reduce(
      (acc, pos) => ({
        x: acc.x + pos.x,
        y: acc.y + pos.y,
      }),
      { x: 0, y: 0 }
    );
    const meanPos = {
      x: sum.x / jointPositions.length,
      y: sum.y / jointPositions.length,
    };

    // Convert world coordinates to screen coordinates via viewport
    const viewport = this.renderer.getViewport();
    if (!viewport) {
      return;
    }

    const screenX = viewport.worldToScreenX(meanPos.x);
    const screenY = viewport.worldToScreenY(meanPos.y);
    const radiusPx = viewport.worldToScreenDistance(0.1); // 10cm radius

    // Draw red dot
    ctx.fillStyle = '#FF0000'; // Red
    ctx.beginPath();
    ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    
    // Add white border for visibility
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

