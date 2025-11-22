/**
 * PhysicsWorld - Wraps Planck.js world and manages physics simulation
 */

import * as planck from 'planck';
import { Position, CreatureState } from '../utils/types';
import { Creature } from './Creature';
import { CreatureDesign } from '../utils/types';
import { PlanckAdapter } from '../physics/PlanckAdapter';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { ForceApplication } from '../physics/ForceApplication';
import { GameConstants } from '../utils/constants';

export class PhysicsWorld {
  readonly world: planck.World;
  readonly gravity: Position;
  ground: planck.Body | null = null;
  private walls: planck.Body[] = [];
  private adapter: PlanckAdapter;
  private creaturePhysics: CreaturePhysics | null = null;
  private forceApplication: ForceApplication | null = null;

  constructor(gravity: Position = GameConstants.DEFAULT_GRAVITY) {
    this.gravity = gravity;
    this.adapter = new PlanckAdapter();
    this.world = this.adapter.createWorld(gravity);
  }

  /**
   * Create physics world (already done in constructor)
   */
  createWorld(): void {
    // World is already created in constructor
  }

  /**
   * Create creature physics from design
   */
  createCreature(design: CreatureDesign): CreaturePhysics {
    // Clean up existing creature if any
    if (this.creaturePhysics) {
      this.creaturePhysics.destroy();
    }

    const creature = new Creature(design);
    this.creaturePhysics = new CreaturePhysics(this.world, creature);
    this.forceApplication = new ForceApplication(this.creaturePhysics);
    
    console.log(`[PhysicsWorld] Creature created: ${design.bones.length} bones, ${design.muscles.length} muscles, ${this.creaturePhysics.getBodies().length} bodies`);

    return this.creaturePhysics;
  }

  /**
   * Step physics simulation
   */
  step(deltaTime: number): void {
    this.adapter.step(this.world, deltaTime);
    
    // Log body positions only for first few steps
    const stepCount = (this as any).__stepCount || 0;
    (this as any).__stepCount = stepCount + 1;
    
    if (stepCount < 3 && this.creaturePhysics) {
      const bodies = this.creaturePhysics.getBodies();
      if (bodies.length > 0) {
        const firstBody = bodies[0];
        const pos = firstBody.getPosition();
        console.log(`[PhysicsWorld] Step ${stepCount + 1} - First body at: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
      }
    }
  }

  /**
   * Apply muscle forces to creature
   */
  applyMuscleForces(creature: CreaturePhysics, activations: number[]): void {
    if (this.forceApplication && this.creaturePhysics === creature) {
      this.forceApplication.applyMuscleForces(activations);
    }
  }

  /**
   * Get creature state (positions, velocities, etc.)
   */
  getCreatureState(creature: CreaturePhysics): CreatureState {
    const bodies = creature.getBodies();
    const positions: Position[] = [];
    const angles: number[] = [];
    const velocities: Position[] = [];
    const angularVelocities: number[] = [];

    bodies.forEach((body) => {
      const pos = body.getPosition();
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        positions.push({ x: pos.x, y: pos.y });
        angles.push(body.getAngle());

        const vel = body.getLinearVelocity();
        if (vel && typeof vel.x === 'number' && typeof vel.y === 'number') {
          velocities.push({ x: vel.x, y: vel.y });
        } else {
          velocities.push({ x: 0, y: 0 });
        }
        angularVelocities.push(body.getAngularVelocity());
      }
    });

    return {
      positions,
      angles,
      velocities,
      angularVelocities,
    };
  }

  /**
   * Reset creature to initial state
   * Note: This resets to design positions, caller should reposition to start position
   */
  resetCreature(creature: CreaturePhysics): void {
    creature.reset();
  }

  /**
   * Create ground plane
   */
  createGround(level: number, width: number): planck.Body {
    if (this.ground) {
      this.world.destroyBody(this.ground);
    }
    this.ground = this.adapter.createGround(this.world, level, width);
    return this.ground;
  }

  /**
   * Create walls around environment boundaries
   */
  createWalls(width: number, height: number, groundLevel: number, wallThickness: number = 0.5): planck.Body[] {
    // Destroy existing walls
    this.walls.forEach(wall => {
      this.world.destroyBody(wall);
    });
    this.walls = [];

    // Create new walls
    this.walls = this.adapter.createWalls(this.world, width, height, groundLevel, wallThickness);
    return this.walls;
  }

  /**
   * Destroy physics world
   */
  destroy(): void {
    if (this.creaturePhysics) {
      this.creaturePhysics.destroy();
      this.creaturePhysics = null;
      this.forceApplication = null;
    }

    if (this.ground) {
      this.world.destroyBody(this.ground);
      this.ground = null;
    }

    // Destroy walls
    this.walls.forEach(wall => {
      this.world.destroyBody(wall);
    });
    this.walls = [];

    this.adapter.destroyWorld(this.world);
  }
}

