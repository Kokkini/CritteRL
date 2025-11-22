/**
 * CreatureGameCore - Implements MimicRL's GameCore interface
 * Manages game state, applies actions, computes rewards, and provides observations for RL training
 */

import {
  GameCore,
  GameState,
  Action,
  ActionSpace,
} from '../MimicRL/core/GameCore';
import { Creature } from './Creature';
import { CreatureDesign, TaskConfig, RewardFunctionConfig, Position } from '../utils/types';
import { PhysicsWorld } from './PhysicsWorld';
import { TaskEnvironment } from './TaskEnvironment';
import { RewardCalculator } from './RewardCalculator';
import { ObservationBuilder } from './ObservationBuilder';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { GameConstants } from '../utils/constants';
import * as planck from 'planck';

export class CreatureGameCore implements GameCore {
  readonly observationSize: number;
  readonly actionSize: number;
  readonly numPlayers: number = 1; // Single creature

  private creature: Creature;
  public readonly physicsWorld: PhysicsWorld;
  public readonly taskEnvironment: TaskEnvironment;
  private rewardCalculator: RewardCalculator;
  private observationBuilder: ObservationBuilder;
  public creaturePhysics: CreaturePhysics | null = null;
  private stepCount: number = 0;
  private episodeStartTime: number = 0;

  constructor(
    creatureDesign: CreatureDesign,
    taskConfig: TaskConfig,
    rewardConfig: RewardFunctionConfig
  ) {
    this.creature = new Creature(creatureDesign);
    this.physicsWorld = new PhysicsWorld(taskConfig.environment.gravity);

    // Create task environment
    this.taskEnvironment = new TaskEnvironment(taskConfig);

    // Create reward calculator
    this.rewardCalculator = new RewardCalculator(rewardConfig);

    // Create observation builder
    this.observationBuilder = new ObservationBuilder(this.taskEnvironment);

    // Calculate observation size based on number of joints (bones)
    const numJoints = creatureDesign.bones.length;
    this.observationSize = this.observationBuilder.getObservationSize(numJoints);

    // Action size = number of muscles
    this.actionSize = creatureDesign.muscles.length;

    // Initialize physics
    this.initializePhysics();
  }

  /**
   * Initialize physics world and creature
   */
  private initializePhysics(): void {
    // Create ground FIRST (before creature) to ensure proper collision
    const envConfig = this.taskEnvironment.config.environment;
    const ground = this.physicsWorld.createGround(envConfig.groundLevel, envConfig.width);
    
    if (!ground) {
      console.error('[CreatureGameCore] Failed to create ground!');
    }

    // Create walls around environment boundaries
    this.physicsWorld.createWalls(
      envConfig.width,
      envConfig.height,
      envConfig.groundLevel,
      0.5 // 0.5m thick walls
    );

    // Create creature physics
    this.creaturePhysics = this.physicsWorld.createCreature(
      this.creature.design
    );

    // Position creature at start position
    const startPos = this.taskEnvironment.getStartPosition();
    
    // Log ground position for debugging
    const groundBody = this.physicsWorld.world.getBodyList();
    if (groundBody) {
      const groundPos = groundBody.getPosition();
      const groundTopY = groundPos.y + 0.5; // halfHeight = 0.5
      console.log(`[CreatureGameCore] Ground center: (${groundPos.x.toFixed(2)}, ${groundPos.y.toFixed(2)}), top at Y=${groundTopY.toFixed(2)}`);
    }
    
    if (this.creaturePhysics) {
      const bodies = this.creaturePhysics.getBodies();
      if (bodies.length > 0) {
        const firstBody = bodies[0];
        const currentPos = firstBody.getPosition();
        
        // Ensure we have a valid position
        if (currentPos && typeof currentPos.x === 'number' && typeof currentPos.y === 'number') {
          const offsetX = startPos.x - currentPos.x;
          const offsetY = startPos.y - currentPos.y;
          
          // Log creature position relative to ground
          const groundBody = this.physicsWorld.world.getBodyList();
          if (groundBody) {
            const groundTopY = groundBody.getPosition().y + 0.5;
            const distanceAboveGround = currentPos.y - groundTopY;
            console.log(`[CreatureGameCore] Creature initial position: (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}), ${distanceAboveGround.toFixed(2)} units above ground`);
          }

          // Move all bodies by offset
          bodies.forEach((body) => {
            const pos = body.getPosition();
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              const newPos = planck.Vec2(pos.x + offsetX, pos.y + offsetY);
              body.setPosition(newPos);
            }
          });
          
          const finalPos = firstBody.getPosition();
          console.log(`[CreatureGameCore] Creature positioned at start: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)})`);
        }
      }
    }
  }

  /**
   * Reset game to initial state
   */
  reset(): GameState {
    this.stepCount = 0;
    this.episodeStartTime = Date.now();

    // Reset physics first to get actual positions
    if (this.creaturePhysics) {
      this.physicsWorld.resetCreature(this.creaturePhysics);
      
      // Reposition creature at start position after reset
      const startPos = this.taskEnvironment.getStartPosition();
      const bodies = this.creaturePhysics.getBodies();
      if (bodies.length > 0) {
        const firstBody = bodies[0];
        const currentPos = firstBody.getPosition();
        
        if (currentPos && typeof currentPos.x === 'number' && typeof currentPos.y === 'number') {
          const offsetX = startPos.x - currentPos.x;
          const offsetY = startPos.y - currentPos.y;
          
          // Move all bodies by offset
          bodies.forEach((body) => {
            const pos = body.getPosition();
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              const newPos = planck.Vec2(pos.x + offsetX, pos.y + offsetY);
              body.setPosition(newPos);
              body.setLinearVelocity(planck.Vec2(0, 0));
              body.setAngularVelocity(0);
            }
          });
        }
      }
    } else {
      this.initializePhysics();
    }

    // Get mean position from physics or design
    let meanPos: Position;
    if (this.creaturePhysics) {
      const jointPositions = this.creaturePhysics.getJointPositions();
      meanPos = this.calculateMeanPosition(jointPositions);
    } else {
      meanPos = this.creature.getMeanJointPosition();
    }

    // Reset task environment with initial position
    this.taskEnvironment.reset(meanPos);

    // Reset reward calculator
    const initialDistance = this.taskEnvironment.getDistanceToTarget(meanPos);
    this.rewardCalculator.reset(initialDistance);
    this.taskEnvironment.updatePreviousDistance(initialDistance);

    // Reset observation builder
    this.observationBuilder.reset();

    // Build initial observation
    // Always use physics positions (in meters) - use design positions if physics not available
    let jointPositions: Position[];
    if (this.creaturePhysics) {
      jointPositions = this.creaturePhysics.getJointPositions();
    } else {
      // Positions are already in meters
      jointPositions = this.creature.design.bones.map((b) => ({
        x: b.position.x,
        y: b.position.y,
      }));
    }
    const targetPos = this.taskEnvironment.getTargetPosition();
    const observation = this.observationBuilder.buildObservation(
      jointPositions,
      targetPos
    );

    return {
      observations: [observation],
      rewards: [0],
      done: false,
      outcome: null,
      info: {
        stepCount: this.stepCount,
        elapsedTime: 0,
      },
    };
  }

  /**
   * Advance game by one step
   */
  step(actions: Action[], deltaTime: number): GameState {
    if (!this.creaturePhysics) {
      throw new Error('Creature physics not initialized');
    }

    this.stepCount++;

    // Apply muscle forces from actions
    if (actions.length > 0 && actions[0].length === this.actionSize) {
      this.physicsWorld.applyMuscleForces(this.creaturePhysics, actions[0]);
    }

    // Step physics simulation
    this.physicsWorld.step(deltaTime);

    // Step task environment
    this.taskEnvironment.step(deltaTime);

    // Get current state
    const jointPositions = this.creaturePhysics.getJointPositions();
    const meanJointPosition = this.calculateMeanPosition(jointPositions);
    const targetPos = this.taskEnvironment.getTargetPosition();

    // Calculate distance to target
    const currentDistance = this.taskEnvironment.getDistanceToTarget(
      meanJointPosition
    );
    const previousDistance = this.taskEnvironment.getPreviousDistance();
    const deltaDistance = previousDistance - currentDistance; // Positive when getting closer

    // Check completion
    const isCompleted = this.taskEnvironment.isCompleted(meanJointPosition);
    const isTimeLimitReached = this.taskEnvironment.isTimeLimitReached();
    const done = isCompleted || isTimeLimitReached;

    // Calculate reward
    const reward = this.rewardCalculator.calculateStepReward(
      deltaDistance,
      deltaTime,
      isCompleted
    );

    // Update previous distance
    this.taskEnvironment.updatePreviousDistance(currentDistance);
    this.rewardCalculator.updatePreviousDistance(currentDistance);

    // Build observation
    const observation = this.observationBuilder.buildObservation(
      jointPositions,
      targetPos
    );

    // Determine outcome
    let outcome: ('win' | 'loss' | 'tie')[] | null = null;
    if (done) {
      if (isCompleted) {
        outcome = ['win'];
      } else {
        outcome = ['loss'];
      }
    }

    const elapsedTime = (Date.now() - this.episodeStartTime) / 1000;

    return {
      observations: [observation],
      rewards: [reward],
      done,
      outcome,
      info: {
        stepCount: this.stepCount,
        elapsedTime,
        distanceToTarget: currentDistance,
        completed: isCompleted,
      },
    };
  }

  /**
   * Get number of players (always 1 for single creature)
   */
  getNumPlayers(): number {
    return this.numPlayers;
  }

  /**
   * Get observation vector size
   */
  getObservationSize(): number {
    return this.observationSize;
  }

  /**
   * Get action vector size (number of muscles)
   */
  getActionSize(): number {
    return this.actionSize;
  }

  /**
   * Get action space definitions (all continuous for muscles)
   */
  getActionSpaces(): ActionSpace[] {
    return Array(this.actionSize).fill({ type: 'continuous' as const });
  }

  /**
   * Get episode outcome
   */
  getOutcome(): ('win' | 'loss' | 'tie')[] | null {
    if (!this.creaturePhysics) {
      return null;
    }

    const jointPositions = this.creaturePhysics.getJointPositions();
    const meanJointPosition = this.calculateMeanPosition(jointPositions);
    const isCompleted = this.taskEnvironment.isCompleted(meanJointPosition);
    const isTimeLimitReached = this.taskEnvironment.isTimeLimitReached();

    if (isCompleted) {
      return ['win'];
    } else if (isTimeLimitReached) {
      return ['loss'];
    }

    return null;
  }

  /**
   * Calculate mean position from joint positions
   */
  private calculateMeanPosition(positions: { x: number; y: number }[]): {
    x: number;
    y: number;
  } {
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = positions.reduce(
      (acc, pos) => ({
        x: acc.x + pos.x,
        y: acc.y + pos.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.physicsWorld) {
      this.physicsWorld.destroy();
    }
  }
}

