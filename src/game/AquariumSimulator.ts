/**
 * AquariumSimulator - Manages simulation of multiple creatures in aquarium
 */

import { nanoid } from 'nanoid';
import { AquariumState, AquariumCreature, CreatureDesign, TrainedModel, Position, RewardFunctionConfig, FoodBall } from '../utils/types';
import { CreatureGameCore } from './CreatureGameCore';
import { AquariumRunningTaskEnvironment } from './AquariumRunningTaskEnvironment';
import { RunningRewardCalculator } from './RunningRewardCalculator';
import { RunningObservationBuilder } from './RunningObservationBuilder';
import { PolicyController } from '../MimicRL/controllers/PolicyController';
import { PolicyAgent } from '../MimicRL/agents/PolicyAgent';
import { CreatureService } from '../services/CreatureService';
import { TrainingService } from '../services/TrainingService';
import { GameConstants } from '../utils/constants';
import { Action } from '../MimicRL/core/GameCore';

// TensorFlow.js is loaded from CDN as a global 'tf' object
declare const tf: any;

interface CreatureInstance {
  aquariumCreature: AquariumCreature;
  gameCore: CreatureGameCore;
  controller: PolicyController | null; // null = random actions
  creatureDesign: CreatureDesign;
}

export class AquariumSimulator {
  private aquariumState: AquariumState;
  private creatureInstances: Map<string, CreatureInstance> = new Map();
  private creatureService: CreatureService;
  private trainingService: TrainingService;
  private directionChangeInterval: number = GameConstants.AQUARIUM_DIRECTION_CHANGE_INTERVAL;
  private foodBalls: FoodBall[] = [];

  constructor(
    aquariumState: AquariumState,
    creatureService: CreatureService,
    trainingService: TrainingService
  ) {
    this.aquariumState = aquariumState;
    this.creatureService = creatureService;
    this.trainingService = trainingService;
  }

  /**
   * Initialize simulator: load creature designs, models, and create game cores
   */
  async initialize(): Promise<void> {
    // Clear existing instances
    this.destroy();
    // Clear any existing food balls (session-only by default)
    this.foodBalls = [];

    // Load all creatures and create game cores
    for (const aquariumCreature of this.aquariumState.creatures) {
      try {
        // Load creature design
        const creatureDesign = await this.creatureService.loadCreature(aquariumCreature.creatureDesignId);
        if (!creatureDesign) {
          console.warn(`[AquariumSimulator] Creature design not found: ${aquariumCreature.creatureDesignId}`);
          continue;
        }

        // Create task config for running task
        const taskConfig = {
          startPosition: aquariumCreature.position,
          maxEpisodeTime: GameConstants.DEFAULT_EPISODE_TIME,
          environment: this.aquariumState.environment,
        };

        // Create reward config
        const rewardConfig: RewardFunctionConfig = {
          distanceProgressRewardFactor: GameConstants.DEFAULT_RUNNING_REWARD_FACTOR,
          distancePenaltyFactor: 0,
          timePenaltyFactor: GameConstants.DEFAULT_RUNNING_TIME_PENALTY,
          completionBonus: 0,
        };

        // Create game core with running task
        // Note: We'll override the environment after creation to use AquariumRunningTaskEnvironment
        const gameCore = new CreatureGameCore(
          creatureDesign,
          taskConfig,
          rewardConfig,
          'running'
        );

        // Override task environment with AquariumRunningTaskEnvironment
        const aquariumEnv = new AquariumRunningTaskEnvironment(taskConfig);
        aquariumEnv.setDirection(aquariumCreature.direction);
        aquariumEnv.reset(aquariumCreature.position);
        (gameCore as any).taskEnvironment = aquariumEnv;

        // Override observation builder (ensure it's RunningObservationBuilder)
        const obsBuilder = new RunningObservationBuilder(this.aquariumState.environment.groundLevel);
        (gameCore as any).observationBuilder = obsBuilder;

        // Override reward calculator (ensure it's RunningRewardCalculator)
        const rewardCalc = new RunningRewardCalculator(rewardConfig);
        (gameCore as any).rewardCalculator = rewardCalc;

        // Update observation size (should be 8 for running task)
        (gameCore as any).observationSize = 8;

        // Create controller from model if available
        let controller: PolicyController | null = null;
        if (aquariumCreature.modelId) {
          try {
            const model = await this.trainingService.loadTrainedModel(aquariumCreature.modelId);
            if (model && model.exportBundle) {
              const policyAgent = await this.createPolicyAgentFromModel(model, gameCore);
              controller = new PolicyController(policyAgent);
            }
          } catch (error) {
            console.warn(`[AquariumSimulator] Failed to load model ${aquariumCreature.modelId}:`, error);
          }
        }

        // Store instance
        this.creatureInstances.set(aquariumCreature.id, {
          aquariumCreature,
          gameCore,
          controller,
          creatureDesign,
        });

        // Reset game core
        gameCore.reset();
      } catch (error) {
        console.error(`[AquariumSimulator] Failed to initialize creature ${aquariumCreature.id}:`, error);
      }
    }
  }

  /**
   * Create PolicyAgent from TrainedModel
   */
  private async createPolicyAgentFromModel(
    model: TrainedModel,
    gameCore: CreatureGameCore
  ): Promise<PolicyAgent> {
    if (!model.exportBundle) {
      throw new Error('Model does not have export bundle');
    }

    const bundle = model.exportBundle;
    const tf = (window as any).tf;
    if (!tf) {
      throw new Error('TensorFlow.js not loaded');
    }

    // Load networks from bundle
    const NetworkUtils = (await import('../MimicRL/utils/NetworkUtils.js')).NetworkUtils;
    const policyNetwork = NetworkUtils.loadNetworkFromSerialized(bundle.policyNetwork);
    const valueNetwork = NetworkUtils.loadNetworkFromSerialized(bundle.valueNetwork);

    // Load learnableLogStd
    const logStdData = bundle.learnableLogStd.data;
    const logStdShape = bundle.learnableLogStd.shape;
    const logStdDtype = bundle.learnableLogStd.dtype;
    
    const learnableLogStdTensor = tf.tensor(logStdData, logStdShape, logStdDtype);
    const learnableLogStd = tf.variable(learnableLogStdTensor, true);

    // Create PolicyAgent
    const agent = new PolicyAgent({
      observationSize: bundle.observationSize,
      actionSize: bundle.actionSize,
      actionSpaces: bundle.actionSpaces,
      policyNetwork: policyNetwork,
      valueNetwork: valueNetwork,
      networkArchitecture: bundle.networkArchitecture,
      initialLogStd: logStdData,
    });

    // Replace learnableLogStd
    if (agent.learnableLogStd) {
      agent.learnableLogStd.dispose();
    }
    (agent as any).learnableLogStd = learnableLogStd;

    return agent;
  }

  /**
   * Step simulation for all creatures
   */
  step(deltaTime: number): void {
    const now = Date.now();

    // Update food ball motion (simple vertical physics with drag)
    this.updateFoodBalls(deltaTime);

    // Update directions (toward food if present, otherwise random)
    this.updateDirections(now);

    // Step each creature
    for (const [id, instance] of this.creatureInstances) {
      try {
        const gameCore = instance.gameCore;
        const aquariumEnv = gameCore.taskEnvironment as AquariumRunningTaskEnvironment;

        // Get action for this creature
        const action = this.getActionForCreature(instance);

        // Step game core
        gameCore.step([action], deltaTime);

        // Update aquarium creature direction from environment
        instance.aquariumCreature.direction = aquariumEnv.getRunningDirection();
      } catch (error) {
        console.error(`[AquariumSimulator] Error stepping creature ${id}:`, error);
      }
    }

    // After stepping, check for food consumption
    this.handleFoodConsumption();
  }

  /**
   * Get action for a creature (from controller or random)
   * Note: This is called before step(), so we need to get observation from last state
   */
  private getActionForCreature(instance: CreatureInstance): Action {
    if (instance.controller && instance.gameCore.creaturePhysics) {
      // Use trained model - build observation from current physics state
      try {
        const gameCore = instance.gameCore;
        const jointPositions = gameCore.creaturePhysics.getJointPositions();
        const aquariumEnv = gameCore.taskEnvironment as AquariumRunningTaskEnvironment;
        const runningDirection = aquariumEnv.getRunningDirection();
        const obsBuilder = gameCore.observationBuilder as RunningObservationBuilder;
        
        const observation = obsBuilder.buildObservation(
          jointPositions,
          gameCore.creaturePhysics,
          runningDirection
        );
        
        return instance.controller.decide(observation);
      } catch (error) {
        console.warn(`[AquariumSimulator] Error getting action from controller:`, error);
        // Fallback to random
      }
    }
    
    // Random actions or fallback
    const actionSize = instance.gameCore.actionSize;
    return new Array(actionSize).fill(0).map(() => (Math.random() - 0.5) * 2); // Random between -1 and 1
  }

  /**
   * Update food ball positions using simple gravity and drag.
   */
  private updateFoodBalls(deltaTime: number): void {
    if (this.foodBalls.length === 0) return;

    const gravityY = GameConstants.DEFAULT_GRAVITY.y; // Negative = down
    const drag = GameConstants.AQUARIUM_FOOD_DRAG_LINEAR;
    const groundLevel = this.aquariumState.environment.groundLevel;

    for (const food of this.foodBalls) {
      // Integrate velocity
      food.velocity.y += gravityY * deltaTime;
      // Apply simple linear drag
      food.velocity.y *= 1 - Math.min(drag * deltaTime, 0.9);

      // Integrate position
      food.position.y += food.velocity.y * deltaTime;

      // Prevent going below ground
      const minY = groundLevel + food.radius;
      if (food.position.y < minY) {
        food.position.y = minY;
        food.velocity.y = 0;
      }
    }
  }

  /**
   * Update running direction for each creature.
   * - If there are food balls, point toward the nearest one horizontally.
   * - If no food balls, fall back to periodic random direction changes.
   */
  private updateDirections(now: number): void {
    // If there are food balls, steer creatures toward the nearest one in X
    if (this.foodBalls.length > 0) {
      for (const [, instance] of this.creatureInstances) {
        const gameCore = instance.gameCore;
        const creaturePhysics = gameCore.creaturePhysics;
        if (!creaturePhysics) {
          continue;
        }

        const jointPositions = creaturePhysics.getJointPositions();
        if (jointPositions.length === 0) {
          continue;
        }

        // Compute center of mass (mean joint position)
        let sumX = 0;
        let sumY = 0;
        for (const p of jointPositions) {
          sumX += p.x;
          sumY += p.y;
        }
        const centerX = sumX / jointPositions.length;
        const centerY = sumY / jointPositions.length;

        // Find nearest food ball in Euclidean distance
        let nearest: FoodBall | null = null;
        let nearestDistSq = Number.POSITIVE_INFINITY;
        for (const food of this.foodBalls) {
          const dx = food.position.x - centerX;
          const dy = food.position.y - centerY;
          const distSq = dx * dx + dy * dy;
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = food;
          }
        }

        if (nearest) {
          const directionX = nearest.position.x >= centerX ? 1 : -1;
          const newDirection = { x: directionX, y: 0 };

          // Update in aquarium creature and environment
          instance.aquariumCreature.direction = newDirection;
          instance.aquariumCreature.lastDirectionChange = now;
          const aquariumEnv = gameCore.taskEnvironment as AquariumRunningTaskEnvironment;
          aquariumEnv.setDirection(newDirection);
        }
      }
      return;
    }

    // No food: use periodic random direction changes
    for (const [, instance] of this.creatureInstances) {
      const aquariumCreature = instance.aquariumCreature;
      const timeSinceLastChange = now - aquariumCreature.lastDirectionChange;

      if (timeSinceLastChange >= this.directionChangeInterval) {
        const directionX = Math.random() < 0.5 ? 1 : -1;
        const newDirection = { x: directionX, y: 0 };

        aquariumCreature.direction = newDirection;
        aquariumCreature.lastDirectionChange = now;

        const aquariumEnv = instance.gameCore.taskEnvironment as AquariumRunningTaskEnvironment;
        aquariumEnv.setDirection(newDirection);
      }
    }
  }

  /**
   * Handle consumption of food balls by creatures.
   * The first creature whose center comes within AQUARIUM_FOOD_EAT_RADIUS
   * of a food ball will consume it.
   */
  private handleFoodConsumption(): void {
    if (this.foodBalls.length === 0) {
      return;
    }

    const eatenIds = new Set<string>();
    const eatRadiusSq = GameConstants.AQUARIUM_FOOD_EAT_RADIUS * GameConstants.AQUARIUM_FOOD_EAT_RADIUS;

    for (const [, instance] of this.creatureInstances) {
      const gameCore = instance.gameCore;
      const creaturePhysics = gameCore.creaturePhysics;
      if (!creaturePhysics) {
        continue;
      }

      const jointPositions = creaturePhysics.getJointPositions();
      if (jointPositions.length === 0) {
        continue;
      }

      let sumX = 0;
      let sumY = 0;
      for (const p of jointPositions) {
        sumX += p.x;
        sumY += p.y;
      }
      const centerX = sumX / jointPositions.length;
      const centerY = sumY / jointPositions.length;

      for (const food of this.foodBalls) {
        if (eatenIds.has(food.id)) {
          continue;
        }
        const dx = food.position.x - centerX;
        const dy = food.position.y - centerY;
        const distSq = dx * dx + dy * dy;
        if (distSq <= eatRadiusSq) {
          eatenIds.add(food.id);
          // Increment this creature's food count
          instance.aquariumCreature.foodEaten = (instance.aquariumCreature.foodEaten || 0) + 1;
          // This creature eats the food; move to next creature
          break;
        }
      }
    }

    if (eatenIds.size > 0) {
      this.foodBalls = this.foodBalls.filter((f) => !eatenIds.has(f.id));
    }
  }

  /**
   * Add a new food ball at the given world position.
   */
  addFoodBall(position: Position, radius: number = GameConstants.AQUARIUM_FOOD_RADIUS): void {
    if (this.foodBalls.length >= GameConstants.AQUARIUM_FOOD_MAX_COUNT) {
      // Remove oldest to keep count under limit
      this.foodBalls.shift();
    }
    const food: FoodBall = {
      id: nanoid(),
      position: { x: position.x, y: position.y },
      radius,
      velocity: { x: 0, y: 0 },
    };
    this.foodBalls.push(food);
  }

  /**
   * Get current food balls for rendering.
   */
  getFoodBalls(): FoodBall[] {
    return this.foodBalls;
  }

  /**
   * Get all creature instances
   */
  getCreatureInstances(): Map<string, CreatureInstance> {
    return this.creatureInstances;
  }

  /**
   * Get creature game core by ID
   */
  getCreatureGameCore(id: string): CreatureGameCore | null {
    return this.creatureInstances.get(id)?.gameCore || null;
  }

  /**
   * Reset all creatures
   */
  reset(): void {
    for (const instance of this.creatureInstances.values()) {
      instance.gameCore.reset();
      const aquariumEnv = instance.gameCore.taskEnvironment as AquariumRunningTaskEnvironment;
      aquariumEnv.setDirection(instance.aquariumCreature.direction);
    }
  }

  /**
   * Destroy simulator and cleanup resources
   */
  destroy(): void {
    for (const instance of this.creatureInstances.values()) {
      try {
        instance.gameCore.destroy();
      } catch (error) {
        console.error('[AquariumSimulator] Error destroying game core:', error);
      }
    }
    this.creatureInstances.clear();
  }
}

