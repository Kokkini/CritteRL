/**
 * TaskService - Manages tasks and task execution
 */

import { Task, TaskConfig, EnvironmentConfig, RewardFunctionConfig, TaskResult, CreatureDesign, TrainedModel } from '../utils/types';
import { GameConstants } from '../utils/constants';
import { StorageService, STORES } from './StorageService';
import { CreatureGameCore } from '../game/CreatureGameCore';
import { PolicyAgent } from '../MimicRL/agents/PolicyAgent';
import { Action } from '../MimicRL/core/GameCore';

// TensorFlow.js is loaded from CDN as a global 'tf' object
declare const tf: any;

// Default "Reach Target" task configuration
const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  type: 'flat_plane',
  groundLevel: GameConstants.DEFAULT_GROUND_LEVEL,
  width: GameConstants.DEFAULT_ENVIRONMENT_WIDTH,
  height: GameConstants.DEFAULT_ENVIRONMENT_HEIGHT,
  gravity: GameConstants.DEFAULT_GRAVITY,
};

const DEFAULT_REWARD_CONFIG: RewardFunctionConfig = {
  distanceProgressRewardFactor: GameConstants.DEFAULT_DISTANCE_PROGRESS_REWARD_FACTOR,
  distancePenaltyFactor: GameConstants.DEFAULT_DISTANCE_PENALTY_FACTOR,
  timePenaltyFactor: GameConstants.DEFAULT_TIME_PENALTY_FACTOR,
  completionBonus: GameConstants.DEFAULT_COMPLETION_BONUS,
};

const DEFAULT_TASK_CONFIG: TaskConfig = {
  targetPosition: GameConstants.DEFAULT_TARGET_POSITION,
  startPosition: GameConstants.DEFAULT_START_POSITION,
  maxEpisodeTime: GameConstants.DEFAULT_EPISODE_TIME,
  completionRadius: GameConstants.DEFAULT_COMPLETION_RADIUS,
  environment: DEFAULT_ENVIRONMENT,
};

const DEFAULT_TASK: Task = {
  id: GameConstants.DEFAULT_TASK_ID,
  name: GameConstants.DEFAULT_TASK_NAME,
  description: GameConstants.DEFAULT_TASK_DESCRIPTION,
  type: GameConstants.DEFAULT_TASK_TYPE,
  config: DEFAULT_TASK_CONFIG,
  rewardFunction: DEFAULT_REWARD_CONFIG,
};

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private storageService: StorageService;

  constructor(storageService?: StorageService) {
    // Initialize with default task
    this.tasks.set(GameConstants.DEFAULT_TASK_ID, DEFAULT_TASK);
    this.storageService = storageService || new StorageService();
  }

  /**
   * Get available tasks
   */
  async getAvailableTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  /**
   * Get default "Reach Target" task
   */
  getDefaultTask(): Task {
    return DEFAULT_TASK;
  }

  /**
   * Test creature with trained model on a task
   */
  async testCreature(
    creatureDesign: CreatureDesign,
    trainedModel: TrainedModel,
    taskId: string
  ): Promise<TaskResult> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    // Create game core
    const gameCore = new CreatureGameCore(
      creatureDesign,
      task.config,
      task.rewardFunction
    );

    // Create policy agent from trained model
    const policyAgent = this.createPolicyAgentFromModel(trainedModel, gameCore);

    // Run test episode
    const startTime = Date.now();
    let state = gameCore.reset();
    let totalReward = 0;
    let completed = false;
    let finalDistance = 0;
    const maxSteps = GameConstants.DEFAULT_TEST_MAX_STEPS;
    const timestep = GameConstants.DEFAULT_TEST_TIMESTEP;

    for (let step = 0; step < maxSteps && !state.done; step++) {
      // Get action from policy
      const actionResult = policyAgent.act(state.observations[0]);
      const actions: Action[] = [actionResult.action];

      // Step simulation
      state = gameCore.step(actions, timestep);
      totalReward += state.rewards[0];

      if (state.done) {
        completed = state.outcome?.[0] === 'win';
        // Get final distance
        const physicsWorld = (gameCore as any)['physicsWorld'];
        const creaturePhysics = (gameCore as any)['creaturePhysics'];
        if (physicsWorld && creaturePhysics) {
          const jointPositions = creaturePhysics.getJointPositions();
          const meanPos = this.calculateMeanPosition(jointPositions);
          const taskEnv = (gameCore as any)['taskEnvironment'];
          finalDistance = taskEnv.getDistanceToTarget(meanPos);
        }
        break;
      }
    }

    const timeToComplete = completed ? (Date.now() - startTime) / 1000 : null;

    // Create task result
    const result: TaskResult = {
      taskId,
      creatureDesignId: creatureDesign.id,
      trainedModelId: trainedModel.id,
      completed,
      distanceToTarget: finalDistance,
      timeToComplete,
      score: totalReward,
      timestamp: new Date(),
    };

    // Save result to history
    await this.saveTaskResult(result);

    // Cleanup
    gameCore.destroy();

    return result;
  }

  /**
   * Create policy agent from trained model
   */
  private createPolicyAgentFromModel(
    model: TrainedModel,
    gameCore: CreatureGameCore
  ): PolicyAgent {
    // Reconstruct policy and value networks from weights
    // This is a simplified version - full implementation would properly restore networks
    const policyAgent = new PolicyAgent({
      observationSize: gameCore.getObservationSize(),
      actionSize: gameCore.getActionSize(),
      actionSpaces: gameCore.getActionSpaces(),
      policyNetwork: model.policyWeights.length > 0 ? this.reconstructNetwork(model.policyWeights) : undefined,
      valueNetwork: model.valueWeights.length > 0 ? this.reconstructNetwork(model.valueWeights) : undefined,
    });

    return policyAgent;
  }

  /**
   * Reconstruct network from weights (simplified placeholder)
   */
  private reconstructNetwork(weights: Float32Array[]): any {
    // This would properly reconstruct TensorFlow.js models from weights
    // For now, return undefined to use default network creation
    return undefined;
  }

  /**
   * Calculate mean position
   */
  private calculateMeanPosition(positions: { x: number; y: number }[]): { x: number; y: number } {
    if (positions.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = positions.reduce(
      (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / positions.length,
      y: sum.y / positions.length,
    };
  }

  /**
   * Save task result to history
   */
  async saveTaskResult(result: TaskResult): Promise<void> {
    if (!this.storageService) {
      await this.storageService.initialize();
    }

    // Save to IndexedDB with composite key
    const key = `${result.creatureDesignId}_${result.trainedModelId}_${result.taskId}_${result.timestamp.getTime()}`;
    await this.storageService.saveToIndexedDB(STORES.PERFORMANCE_METRICS, {
      ...result,
      id: key,
      modelId: result.trainedModelId, // For indexing
    });
  }

  /**
   * Get task performance history
   */
  async getTaskHistory(
    creatureDesignId: string,
    taskId: string
  ): Promise<TaskResult[]> {
    if (!this.storageService) {
      await this.storageService.initialize();
    }

    // This would require querying IndexedDB with index on modelId
    // Simplified version - would need proper IndexedDB query
    const allResults: TaskResult[] = []; // Would load and filter

    return allResults.filter(
      (r) => r.creatureDesignId === creatureDesignId && r.taskId === taskId
    );
  }
}

// Error classes
export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = 'TaskNotFoundError';
  }
}

