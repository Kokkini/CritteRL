/**
 * CreaturePhysics - Creates and manages physics bodies for creatures
 */

import * as planck from 'planck';
import { Creature } from '../game/Creature';
import { CreatureDesign, Position } from '../utils/types';
import { PlanckAdapter } from './PlanckAdapter';
import { GameConstants } from '../utils/constants';

export class CreaturePhysics {
  readonly creature: Creature;
  readonly world: planck.World;
  private bodies: Map<string, planck.Body> = new Map();
  private joints: Map<string, planck.Joint> = new Map();
  private boneToBody: Map<string, planck.Body> = new Map();

  constructor(world: planck.World, creature: Creature) {
    this.creature = creature;
    this.world = world;
    this.createPhysicsBodies();
  }

  /**
   * Create physics bodies from creature design
   * Design positions and sizes are already in meters
   */
  createPhysicsBodies(): void {
    const design = this.creature.design;

    // Create bodies for each bone
    design.bones.forEach((bone, index) => {
      // Positions and sizes are already in meters, no conversion needed
      const worldX = bone.position.x;
      const worldY = bone.position.y;
      const worldWidth = bone.size.width;
      const worldHeight = bone.size.height;

      const body = this.world.createBody({
        type: 'dynamic',
        position: planck.Vec2(worldX, worldY),
        angle: bone.angle,
      });

      // Set damping to reduce oscillations and improve stability
      body.setLinearDamping(GameConstants.BONE_LINEAR_DAMPING);
      body.setAngularDamping(GameConstants.BONE_ANGULAR_DAMPING);

      // Create box fixture for bone (in meters)
      const shape = planck.Box(worldWidth / 2, worldHeight / 2);
      const fixture = body.createFixture(shape, {
        density: bone.density,
        friction: GameConstants.BONE_FRICTION,
        restitution: GameConstants.BONE_RESTITUTION,
      });
      
      // Set collision filter: bones only collide with environment, not with each other
      fixture.setFilterData({
        groupIndex: 0,
        categoryBits: GameConstants.COLLISION_CATEGORY_BONE,
        maskBits: GameConstants.COLLISION_MASK_BONE,
      });

      // Store user data for lookup
      body.setUserData({ boneId: bone.id });

      this.bodies.set(bone.id, body);
      this.boneToBody.set(bone.id, body);
    });

    // Create joints for connections
    design.joints.forEach((joint) => {
      const bodyA = this.boneToBody.get(joint.boneAId);
      const bodyB = this.boneToBody.get(joint.boneBId);

      if (!bodyA || !bodyB) {
        console.warn(`Failed to create joint ${joint.id}: bones not found`);
        return;
      }

      // Anchor positions are stored in local coordinates (relative to bone center, before rotation)
      // Anchors are now stored in meters, no conversion needed
      const anchorALocalX = joint.anchorA.x;
      const anchorALocalY = joint.anchorA.y;
      const anchorBLocalX = joint.anchorB.x;
      const anchorBLocalY = joint.anchorB.y;
      
      // Anchor positions are in local coordinates (relative to bone center, before rotation)
      // In Planck.js, localAnchor is relative to body center in the body's local coordinate system
      // This is exactly what we have, so we can use them directly
      const anchorA = planck.Vec2(anchorALocalX, anchorALocalY);
      const anchorB = planck.Vec2(anchorBLocalX, anchorBLocalY);
      
      console.log(`[CreaturePhysics] Creating joint ${joint.id}: anchorA=(${anchorALocalX.toFixed(3)}, ${anchorALocalY.toFixed(3)}), anchorB=(${anchorBLocalX.toFixed(3)}, ${anchorBLocalY.toFixed(3)})`);

      // Calculate reference angle: the initial angle difference between the two bones
      // This is the angle at which the joint is considered to be at 0° (the original configuration)
      // Get the initial angles from the bone designs
      const boneA = design.bones.find(b => b.id === joint.boneAId);
      const boneB = design.bones.find(b => b.id === joint.boneBId);
      
      if (!boneA || !boneB) {
        console.warn(`[CreaturePhysics] Cannot find bones for joint ${joint.id}, using referenceAngle=0`);
      }
      
      // Reference angle = angle difference between bones at creation time
      // This makes limits relative to the original bone configuration
      const angleA = boneA ? boneA.angle : 0;
      const angleB = boneB ? boneB.angle : 0;
      const referenceAngle = angleB - angleA;

      // Get angle limits (must be numbers, not null)
      const lowerAngle = joint.lowerAngle !== null ? joint.lowerAngle : -Math.PI;
      const upperAngle = joint.upperAngle !== null ? joint.upperAngle : Math.PI;

      console.log(`[CreaturePhysics] Joint ${joint.id} limits: enableLimit=${joint.enableLimit}, lowerAngle=${lowerAngle.toFixed(4)} (${(lowerAngle * 180 / Math.PI).toFixed(1)}°), upperAngle=${upperAngle.toFixed(4)} (${(upperAngle * 180 / Math.PI).toFixed(1)}°), referenceAngle=${referenceAngle.toFixed(4)} (${(referenceAngle * 180 / Math.PI).toFixed(1)}°) [boneA angle=${(angleA * 180 / Math.PI).toFixed(1)}°, boneB angle=${(angleB * 180 / Math.PI).toFixed(1)}°]`);

      const revoluteJoint = planck.RevoluteJoint({
        bodyA,
        bodyB,
        localAnchorA: anchorA,
        localAnchorB: anchorB,
        referenceAngle: referenceAngle,
        enableLimit: joint.enableLimit,
        lowerAngle: lowerAngle,
        upperAngle: upperAngle,
      });

      this.world.createJoint(revoluteJoint);
      
      // Explicitly set limits after creation to ensure they're applied
      if (joint.enableLimit) {
        revoluteJoint.enableLimit(true);
        revoluteJoint.setLimits(lowerAngle, upperAngle);
      } else {
        revoluteJoint.enableLimit(false);
      }
      
      this.joints.set(joint.id, revoluteJoint);
      
      // Verify the joint was created with limits
      if (joint.enableLimit) {
        const actualLower = revoluteJoint.getLowerLimit();
        const actualUpper = revoluteJoint.getUpperLimit();
        const actualEnabled = revoluteJoint.isLimitEnabled();
        console.log(`[CreaturePhysics] Joint ${joint.id} verification: limitEnabled=${actualEnabled}, lowerLimit=${actualLower.toFixed(4)} (${(actualLower * 180 / Math.PI).toFixed(1)}°), upperLimit=${actualUpper.toFixed(4)} (${(actualUpper * 180 / Math.PI).toFixed(1)}°)`);
      }
    });
  }

  /**
   * Get all physics bodies
   */
  getBodies(): planck.Body[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Get all physics joints
   */
  getJoints(): planck.Joint[] {
    return Array.from(this.joints.values());
  }

  /**
   * Get physics body for a bone
   */
  getBodyForBone(boneId: string): planck.Body | null {
    return this.boneToBody.get(boneId) || null;
  }

  /**
   * Get physics joint for a connection
   */
  getJointForConnection(jointId: string): planck.Joint | null {
    return this.joints.get(jointId) || null;
  }

  /**
   * Get joint positions (center of each bone) in meters
   */
  getJointPositions(): Position[] {
    return this.creature.design.bones.map((bone) => {
      const body = this.boneToBody.get(bone.id);
      if (body) {
        const pos = body.getPosition();
        // Physics positions are already in meters
        return { x: pos.x, y: pos.y };
      }
      // Fallback: positions are already in meters
      return {
        x: bone.position.x,
        y: bone.position.y,
      };
    });
  }

  /**
   * Reset creature to initial state
   * Positions are now stored in meters, no conversion needed
   */
  reset(): void {
    const design = this.creature.design;
    design.bones.forEach((bone) => {
      const body = this.boneToBody.get(bone.id);
      if (body) {
        // Positions are already in meters
        body.setPosition(planck.Vec2(bone.position.x, bone.position.y));
        body.setAngle(bone.angle);
        body.setLinearVelocity(planck.Vec2(0, 0));
        body.setAngularVelocity(0);
      }
    });
  }

  /**
   * Destroy physics bodies and joints
   */
  destroy(): void {
    // Destroy joints
    this.joints.forEach((joint) => {
      this.world.destroyJoint(joint);
    });
    this.joints.clear();

    // Destroy bodies
    this.bodies.forEach((body) => {
      this.world.destroyBody(body);
    });
    this.bodies.clear();
    this.boneToBody.clear();
  }
}

