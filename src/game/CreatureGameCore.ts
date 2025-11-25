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
import { CreatureDesign, TaskConfig, RewardFunctionConfig, Position, Task } from '../utils/types';
import { PhysicsWorld } from './PhysicsWorld';
import { TaskEnvironment } from './TaskEnvironment';
import { RunningTaskEnvironment } from './RunningTaskEnvironment';
import { RewardCalculator } from './RewardCalculator';
import { RunningRewardCalculator } from './RunningRewardCalculator';
import { ObservationBuilder } from './ObservationBuilder';
import { RunningObservationBuilder } from './RunningObservationBuilder';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { GameConstants } from '../utils/constants';
import * as planck from 'planck';

export class CreatureGameCore implements GameCore {
  readonly observationSize: number;
  readonly actionSize: number;
  readonly numPlayers: number = 1; // Single creature

  private creature: Creature;
  public readonly physicsWorld: PhysicsWorld;
  public readonly taskEnvironment: TaskEnvironment | RunningTaskEnvironment;
  private rewardCalculator: RewardCalculator | RunningRewardCalculator;
  private observationBuilder: ObservationBuilder | RunningObservationBuilder;
  public creaturePhysics: CreaturePhysics | null = null;
  private stepCount: number = 0;
  private episodeStartTime: number = 0;
  public readonly taskType: Task['type'];

  constructor(
    creatureDesign: CreatureDesign,
    taskConfig: TaskConfig,
    rewardConfig: RewardFunctionConfig,
    taskType?: Task['type']
  ) {
    this.creature = new Creature(creatureDesign);
    this.physicsWorld = new PhysicsWorld(taskConfig.environment.gravity);

    // Detect task type: use provided taskType or infer from config
    this.taskType = taskType || (taskConfig.targetPosition ? 'reach_target' : 'running');

    // Create task-specific components using factory methods
    this.taskEnvironment = this.createTaskEnvironment(taskConfig);
    this.rewardCalculator = this.createRewardCalculator(rewardConfig);
    this.observationBuilder = this.createObservationBuilder(taskConfig, this.taskEnvironment);

    // Calculate observation size based on task type
    if (this.taskType === 'running') {
      this.observationSize = 8; // Fixed size for running task
    } else {
    const numJoints = creatureDesign.bones.length;
      this.observationSize = (this.observationBuilder as ObservationBuilder).getObservationSize(numJoints);
    }

    // Action size = number of muscles
    this.actionSize = creatureDesign.muscles.length;

    // Initialize physics
    this.initializePhysics();
  }

  /**
   * Factory method to create task environment based on task type
   */
  private createTaskEnvironment(config: TaskConfig): TaskEnvironment | RunningTaskEnvironment {
    if (this.taskType === 'running') {
      return new RunningTaskEnvironment(config);
    } else {
      return new TaskEnvironment(config);
    }
  }

  /**
   * Factory method to create reward calculator based on task type
   */
  private createRewardCalculator(config: RewardFunctionConfig): RewardCalculator | RunningRewardCalculator {
    if (this.taskType === 'running') {
      return new RunningRewardCalculator(config);
    } else {
      return new RewardCalculator(config);
    }
  }

  /**
   * Factory method to create observation builder based on task type
   */
  private createObservationBuilder(
    config: TaskConfig,
    taskEnv: TaskEnvironment | RunningTaskEnvironment
  ): ObservationBuilder | RunningObservationBuilder {
    if (this.taskType === 'running') {
      return new RunningObservationBuilder(config.environment.groundLevel);
    } else {
      return new ObservationBuilder(taskEnv as TaskEnvironment);
    }
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

    // Reset reward calculator (task-specific)
    if (this.taskType === 'running') {
      (this.rewardCalculator as RunningRewardCalculator).reset();
    } else {
      const initialDistance = (this.taskEnvironment as TaskEnvironment).getDistanceToTarget(meanPos);
      (this.rewardCalculator as RewardCalculator).reset(initialDistance);
      (this.taskEnvironment as TaskEnvironment).updatePreviousDistance(initialDistance);
    }

    // Reset observation builder
    this.observationBuilder.reset();

    // Build initial observation (task-specific)
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

    let observation: number[];
    if (this.taskType === 'running') {
      const runningEnv = this.taskEnvironment as RunningTaskEnvironment;
      const runningDirection = runningEnv.getRunningDirection();
      observation = (this.observationBuilder as RunningObservationBuilder).buildObservation(
        jointPositions,
        this.creaturePhysics!,
        runningDirection
      );
    } else {
      const targetPos = (this.taskEnvironment as TaskEnvironment).getTargetPosition();
      observation = (this.observationBuilder as ObservationBuilder).buildObservation(
      jointPositions,
      targetPos
    );
    }

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

    // Task-specific logic
    let reward: number;
    let done: boolean;
    let isCompleted: boolean = false;
    let isTimeLimitReached: boolean;
    let observation: number[];

    if (this.taskType === 'running') {
      // Running task logic
      const runningEnv = this.taskEnvironment as RunningTaskEnvironment;
      isTimeLimitReached = runningEnv.isTimeLimitReached();
      done = isTimeLimitReached;

      // Calculate delta distance in running direction
      const deltaDistanceInDirection = runningEnv.getDeltaDistanceInDirection(meanJointPosition);

      // Calculate reward
      reward = (this.rewardCalculator as RunningRewardCalculator).calculateStepReward(
        deltaDistanceInDirection,
        deltaTime
      );

      // Build observation
      const runningDirection = runningEnv.getRunningDirection();
      observation = (this.observationBuilder as RunningObservationBuilder).buildObservation(
        jointPositions,
        this.creaturePhysics,
        runningDirection
      );
    } else {
      // Reach target task logic
      const taskEnv = this.taskEnvironment as TaskEnvironment;
      const targetPos = taskEnv.getTargetPosition();

    // Calculate distance to target
      const currentDistance = taskEnv.getDistanceToTarget(meanJointPosition);

    // Check completion
      isCompleted = taskEnv.isCompleted(meanJointPosition);
      isTimeLimitReached = taskEnv.isTimeLimitReached();
      done = isCompleted || isTimeLimitReached;

    // Calculate reward
      reward = (this.rewardCalculator as RewardCalculator).calculateStepReward(
        currentDistance,
      deltaTime,
      isCompleted
    );

    // Update previous distance
      taskEnv.updatePreviousDistance(currentDistance);
      (this.rewardCalculator as RewardCalculator).updatePreviousDistance(currentDistance);

    // Build observation
      observation = (this.observationBuilder as ObservationBuilder).buildObservation(
      jointPositions,
      targetPos
    );
    }

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
        distanceToTarget: this.taskType === 'running' ? undefined : (this.taskEnvironment as TaskEnvironment).getDistanceToTarget(meanJointPosition),
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

    if (this.taskType === 'running') {
      const runningEnv = this.taskEnvironment as RunningTaskEnvironment;
      const isTimeLimitReached = runningEnv.isTimeLimitReached();
      if (isTimeLimitReached) {
        return ['loss']; // Time limit reached = loss for running task
      }
      return null;
    } else {
      const taskEnv = this.taskEnvironment as TaskEnvironment;
    const jointPositions = this.creaturePhysics.getJointPositions();
    const meanJointPosition = this.calculateMeanPosition(jointPositions);
      const isCompleted = taskEnv.isCompleted(meanJointPosition);
      const isTimeLimitReached = taskEnv.isTimeLimitReached();

    if (isCompleted) {
      return ['win'];
    } else if (isTimeLimitReached) {
      return ['loss'];
      }
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

