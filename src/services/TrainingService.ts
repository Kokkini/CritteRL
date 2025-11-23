/**
 * TrainingService - Manages RL training sessions
 */

import { nanoid } from 'nanoid';
import {
  TrainingSession as MimicRLTrainingSession,
  TrainingSessionOptions,
} from '../MimicRL/training/TrainingSession';
import { PolicyController } from '../MimicRL/controllers/PolicyController';
import { PlayerController } from '../MimicRL/controllers/PlayerController';
import {
  TrainingSession,
  TrainingConfig,
  TrainingMetrics,
  TrainingProgress,
  TrainedModel,
  TrainingHyperparameters,
  PerformanceMetrics,
  CreatureDesign,
} from '../utils/types';
import { StorageService, STORES } from './StorageService';
import { CreatureGameCore } from '../game/CreatureGameCore';
import { TaskService } from './TaskService';
import { CreatureService } from './CreatureService';

// TensorFlow.js is loaded from CDN as a global 'tf' object
declare const tf: any;

export class TrainingService {
  private storageService: StorageService;
  private taskService: TaskService;
  private creatureService: CreatureService;
  private activeSessions: Map<string, ActiveTrainingSession> = new Map();

  constructor(storageService: StorageService, taskService: TaskService, creatureService?: CreatureService) {
    this.storageService = storageService;
    this.taskService = taskService;
    this.creatureService = creatureService || new CreatureService(storageService);
  }

  /**
   * Start a new training session
   */
  async startTraining(
    creatureDesignId: string,
    taskId: string,
    config: TrainingConfig
  ): Promise<TrainingSession> {
    // Load creature design
    const creatureDesign = await this.creatureService.loadCreature(creatureDesignId);
    if (!creatureDesign) {
      throw new Error(`Creature not found: ${creatureDesignId}`);
    }

    // Get task
    const task = await this.taskService.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate creature has muscles (required for actions)
    if (!creatureDesign.muscles || creatureDesign.muscles.length === 0) {
      throw new Error('Creature must have at least one muscle to train');
    }

    // Create game core for training (headless)
    // Store design/config for cloning in rollout collectors
    const gameCore = new CreatureGameCore(
      creatureDesign,
      task.config,
      task.rewardFunction
    );
    
    // Store design and config for cloning game cores in rollouts
    (gameCore as any).creatureDesign = creatureDesign;
    (gameCore as any).taskConfig = task.config;
    (gameCore as any).rewardConfig = task.rewardFunction;

    // Create controllers (only player 0 is trainable)
    const controllers: (PlayerController | null)[] = [null]; // Will be replaced with PolicyController

    // Create MimicRL training session options
    const mimicRLOptions: TrainingSessionOptions = {
      trainablePlayers: [0],
      maxGames: config.maxEpisodes || 1000,
      autoSaveInterval: config.autoSaveInterval || 100,
      algorithm: {
        type: 'PPO',
        hyperparameters: {
          learningRate: config.hyperparameters.learningRate,
          clipRatio: 0.2,
          valueLossCoeff: config.hyperparameters.valueCoeff,
          entropyCoeff: config.hyperparameters.entropyCoeff,
          gaeLambda: config.hyperparameters.lambda,
          epochs: 4,
          miniBatchSize: config.hyperparameters.batchSize,
        },
      },
      networkArchitecture: {
        policyHiddenLayers: [64, 32],
        valueHiddenLayers: [64, 32],
        activation: 'relu',
      },
    };

    // Create MimicRL training session
    const mimicRLSession = new MimicRLTrainingSession(gameCore, controllers, mimicRLOptions);

    // Initialize the session
    const initialized = await mimicRLSession.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize training session');
    }

    // Create our training session entity
    const session: TrainingSession = {
      id: nanoid(),
      creatureDesignId,
      taskId,
      status: 'running',
      currentEpisode: 0,
      startedAt: new Date(),
      pausedAt: null,
      config,
      metrics: {
        episodeRewards: [],
        episodeLengths: [],
        averageReward: 0,
        bestReward: 0,
        completionRate: 0,
      },
      checkpoint: null,
    };

    // Set up callbacks to update our session metrics
    mimicRLSession.onTrainingProgress = (metrics: any) => {
      const active = this.activeSessions.get(session.id);
      if (active && metrics) {
        // Skip status-only updates (they don't have complete metrics)
        if (metrics._statusOnly) {
          console.log('[TrainingService] Skipping status-only update');
          return;
        }
        
        console.log('[TrainingService] onTrainingProgress callback received metrics:', {
          rewardHistory: metrics.rewardHistory?.length || 0,
          gameLengthHistory: metrics.gameLengthHistory?.length || 0,
          rewardStats: metrics.rewardStats,
          winRate: metrics.winRate,
          gamesCompleted: metrics.gamesCompleted,
          hasRewardHistory: !!metrics.rewardHistory,
          hasGameLengthHistory: !!metrics.gameLengthHistory
        });
        
        // Always read directly from MimicRL session's trainingMetrics (source of truth)
        // Don't trust the metrics passed in the callback - it might have stale/merged data
        if (active.mimicRLSession && active.mimicRLSession.trainingMetrics) {
          const mimicMetrics = active.mimicRLSession.trainingMetrics;
          active.session.metrics = {
            episodeRewards: Array.isArray(mimicMetrics.rewardHistory) ? [...mimicMetrics.rewardHistory] : [],
            episodeLengths: Array.isArray(mimicMetrics.gameLengthHistory) ? [...mimicMetrics.gameLengthHistory] : [],
            averageReward: mimicMetrics.rewardStats?.avg ?? 0,
            bestReward: mimicMetrics.rewardStats?.max ?? 0,
            completionRate: mimicMetrics.winRate ?? 0,
          };
          active.session.currentEpisode = active.mimicRLSession.gamesCompleted || 0;
          console.log('[TrainingService] Updated session metrics from MimicRL source:', {
            episodeRewards: active.session.metrics.episodeRewards.length,
            episodeLengths: active.session.metrics.episodeLengths.length,
            averageReward: active.session.metrics.averageReward,
            bestReward: active.session.metrics.bestReward
          });
        } else {
          // Fallback to callback metrics if MimicRL session not available
          active.session.metrics = {
            episodeRewards: metrics.rewardHistory || metrics.episodeRewards || [],
            episodeLengths: metrics.gameLengthHistory || metrics.episodeLengths || [],
            averageReward: metrics.rewardStats?.avg || metrics.averageReward || 0,
            bestReward: metrics.rewardStats?.max || metrics.bestReward || 0,
            completionRate: metrics.winRate || metrics.completionRate || 0,
          };
          active.session.currentEpisode = metrics.gamesCompleted || mimicRLSession.gamesCompleted || 0;
        }
      }
    };

    mimicRLSession.onGameEnd = () => {
      const active = this.activeSessions.get(session.id);
      if (active) {
        active.session.currentEpisode = mimicRLSession.gamesCompleted || 0;
      }
    };

    mimicRLSession.onTrainingComplete = () => {
      const active = this.activeSessions.get(session.id);
      if (active) {
        active.session.status = 'completed';
        // Cleanup game core when training completes
        if (active.gameCore) {
          active.gameCore.destroy();
        }
      }
    };

    // Store active session
    this.activeSessions.set(session.id, {
      session,
      mimicRLSession,
      gameCore, // Keep reference for cleanup
    });

    // Start training (runs asynchronously, headless)
    await mimicRLSession.start();

    return session;
  }

  /**
   * Pause current training session
   */
  async pauseTraining(sessionId: string): Promise<void> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    if (active.session.status !== 'running') {
      throw new Error('Training session is not running');
    }

    active.session.status = 'paused';
    active.session.pausedAt = new Date();

    // Pause MimicRL session
    if (active.mimicRLSession) {
      active.mimicRLSession.pause();
    }
  }

  /**
   * Resume paused training session
   */
  async resumeTraining(sessionId: string): Promise<void> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    if (active.session.status !== 'paused') {
      throw new Error('Training session is not paused');
    }

    active.session.status = 'running';
    active.session.pausedAt = null;

    // Resume MimicRL session
    if (active.mimicRLSession) {
      active.mimicRLSession.resume();
    }
  }

  /**
   * Stop training session
   */
  async stopTraining(sessionId: string): Promise<void> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    active.session.status = 'stopped';

    // Stop MimicRL session
    if (active.mimicRLSession) {
      active.mimicRLSession.stop();
    }

    // Cleanup game core
    if (active.gameCore) {
      active.gameCore.destroy();
    }

    // Save checkpoint before stopping
    await this.saveCheckpoint(sessionId);
  }

  /**
   * Save trained model from completed session
   */
  async saveTrainedModel(sessionId: string, name?: string): Promise<TrainedModel> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    if (!active.mimicRLSession || !active.mimicRLSession.policyAgent) {
      throw new Error('No trained model available');
    }

    // Extract model weights from PolicyAgent
    const policyAgent = active.mimicRLSession.policyAgent;
    const policyWeights: Float32Array[] = [];
    const valueWeights: Float32Array[] = [];

    // Extract policy network weights
    if (policyAgent.policyNetwork) {
      const policyVars = policyAgent.policyNetwork.getWeights();
      for (const weight of policyVars) {
        const data = await weight.data();
        policyWeights.push(new Float32Array(data));
      }
    }

    // Extract value network weights
    if (policyAgent.valueNetwork) {
      const valueVars = policyAgent.valueNetwork.getWeights();
      for (const weight of valueVars) {
        const data = await weight.data();
        valueWeights.push(new Float32Array(data));
      }
    }

    // Export full bundle for easy loading (includes network architecture, etc.)
    const exportBundle = active.mimicRLSession.exportAgentWeights();

    const model: TrainedModel = {
      id: nanoid(),
      creatureDesignId: active.session.creatureDesignId,
      name: name || `Model ${new Date().toLocaleDateString()}`,
      createdAt: active.session.startedAt,
      trainedAt: new Date(),
      episodes: active.session.currentEpisode,
      policyWeights,
      valueWeights,
      hyperparameters: active.session.config.hyperparameters,
      performanceMetrics: {
        episodeRewards: active.session.metrics.episodeRewards,
        episodeLengths: active.session.metrics.episodeLengths,
        completionRate: active.session.metrics.completionRate,
        averageDistance: 0, // Would calculate from task-specific metrics
        bestDistance: 0, // Would calculate from task-specific metrics
      },
      exportBundle, // Store full bundle for easy loading
    };

    // Save to IndexedDB
    await this.storageService.saveToIndexedDB(STORES.TRAINED_MODELS, model);

    return model;
  }

  /**
   * Get training metrics
   */
  async getMetrics(sessionId: string): Promise<TrainingMetrics> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    // Always read directly from MimicRL session's trainingMetrics (source of truth)
    if (active.mimicRLSession && active.mimicRLSession.trainingMetrics) {
      const mimicMetrics = active.mimicRLSession.trainingMetrics;
      
      // Build metrics from MimicRL trainingMetrics
      const rewardHistory = Array.isArray(mimicMetrics.rewardHistory) ? [...mimicMetrics.rewardHistory] : [];
      const gameLengthHistory = Array.isArray(mimicMetrics.gameLengthHistory) ? [...mimicMetrics.gameLengthHistory] : [];
      
      const metrics: TrainingMetrics = {
        episodeRewards: rewardHistory,
        episodeLengths: gameLengthHistory,
        averageReward: mimicMetrics.rewardStats?.avg ?? 0,
        bestReward: mimicMetrics.rewardStats?.max ?? 0,
        completionRate: mimicMetrics.winRate ?? 0,
      };
      
      // Also update stored session metrics for consistency
      active.session.metrics = metrics;
      active.session.currentEpisode = active.mimicRLSession.gamesCompleted || 0;
      
      return metrics;
    }

    // Fallback to stored metrics if MimicRL session not available
    console.warn('[TrainingService] getMetrics - No MimicRL session, using stored metrics:', active.session.metrics);
    return { ...active.session.metrics };
  }

  /**
   * Get training progress
   */
  async getProgress(sessionId: string): Promise<TrainingProgress> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    // Get current episode from MimicRL session
    let currentEpisode = active.session.currentEpisode;
    if (active.mimicRLSession) {
      currentEpisode = active.mimicRLSession.gamesCompleted || 0;
      active.session.currentEpisode = currentEpisode;
    }

    // Get total experiences from MimicRL session (tracked as experiences are collected)
    let totalExperiences = 0;
    if (active.mimicRLSession) {
      totalExperiences = active.mimicRLSession.totalExperiences || 0;
    }

    return {
      currentEpisode,
      totalEpisodes: active.session.config.maxEpisodes || null,
      totalExperiences,
      averageReward: active.session.metrics.averageReward,
      completionRate: active.session.metrics.completionRate,
      isRunning: active.session.status === 'running' && active.mimicRLSession?.isTraining === true,
    };
  }

  /**
   * Save training checkpoint
   */
  private async saveCheckpoint(sessionId: string): Promise<void> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      return;
    }

    // Create checkpoint (simplified - would extract actual weights)
    active.session.checkpoint = {
      episode: active.session.currentEpisode,
      policyWeights: [], // Would extract from PolicyAgent
      valueWeights: [], // Would extract from PolicyAgent
      optimizerState: {},
      timestamp: new Date(),
    };

    // Save to IndexedDB
    await this.storageService.saveToIndexedDB(STORES.TRAINING_SESSIONS, active.session);
  }

  /**
   * Load trained model
   */
  async loadTrainedModel(id: string): Promise<TrainedModel | null> {
    return await this.storageService.loadFromIndexedDB<TrainedModel>(
      STORES.TRAINED_MODELS,
      id
    );
  }

  /**
   * List trained models for a creature
   */
  async listTrainedModels(creatureDesignId: string): Promise<TrainedModel[]> {
    try {
      console.log('[TrainingService] Listing models for creature:', creatureDesignId);
      
      // Ensure storage is initialized
      if (!this.storageService) {
        console.error('[TrainingService] StorageService not available');
        return [];
      }

      // Get all models from IndexedDB
      console.log('[TrainingService] Fetching all models from IndexedDB...');
      const allModels = await this.storageService.getAllFromIndexedDB<TrainedModel>(
        STORES.TRAINED_MODELS
      );
      console.log('[TrainingService] Found', allModels.length, 'total models in IndexedDB');
      
      // Filter by creatureDesignId, restore Date objects, and sort by trainedAt (most recent first)
      const filteredModels = allModels
        .filter((m) => {
          const matches = m.creatureDesignId === creatureDesignId;
          if (!matches && allModels.length > 0) {
            console.log('[TrainingService] Model', m.id, 'belongs to creature', m.creatureDesignId, 'not', creatureDesignId);
          }
          return matches;
        })
        .map((m) => ({
          ...m,
          createdAt: m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt),
          trainedAt: m.trainedAt instanceof Date ? m.trainedAt : new Date(m.trainedAt),
        }))
        .sort((a, b) => {
          return b.trainedAt.getTime() - a.trainedAt.getTime(); // Most recent first
        });
      
      console.log('[TrainingService] Filtered to', filteredModels.length, 'models for creature', creatureDesignId);
      return filteredModels;
    } catch (error) {
      console.error('[TrainingService] Failed to list trained models:', error);
      return [];
    }
  }

  /**
   * Delete trained model
   */
  async deleteTrainedModel(id: string): Promise<void> {
    await this.storageService.deleteFromIndexedDB(STORES.TRAINED_MODELS, id);
  }

  /**
   * Get PolicyAgent from active training session (for visualization)
   */
  getPolicyAgent(sessionId: string): any | null {
    const active = this.activeSessions.get(sessionId);
    if (active && active.mimicRLSession && active.mimicRLSession.policyAgent) {
      return active.mimicRLSession.policyAgent;
    }
    return null;
  }

  /**
   * Get MimicRL TrainingSession from active training session (for visualization)
   */
  getMimicRLSession(sessionId: string): any | null {
    const active = this.activeSessions.get(sessionId);
    if (active && active.mimicRLSession) {
      return active.mimicRLSession;
    }
    return null;
  }

  /**
   * Load a trained model into an active training session
   */
  async loadModelIntoSession(sessionId: string, modelId: string): Promise<void> {
    const active = this.activeSessions.get(sessionId);
    if (!active) {
      throw new TrainingSessionNotFoundError(sessionId);
    }

    // Load the model
    const model = await this.loadTrainedModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Check if model has export bundle (new format)
    if (model.exportBundle) {
      await active.mimicRLSession.importAgentWeights(model.exportBundle);
    } else {
      // Fallback: Try to reconstruct from weights (this may not work perfectly)
      throw new Error('Model does not have export bundle. Please save a new model.');
    }
  }
}

// Internal structure for active sessions
interface ActiveTrainingSession {
  session: TrainingSession;
  mimicRLSession: MimicRLTrainingSession;
  gameCore: CreatureGameCore;
}

// Error classes
export class TrainingSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Training session not found: ${sessionId}`);
    this.name = 'TrainingSessionNotFoundError';
  }
}

export class TrainingAlreadyRunningError extends Error {
  constructor() {
    super('Training is already running');
    this.name = 'TrainingAlreadyRunningError';
  }
}

export class InvalidConfigurationError extends Error {
  constructor(message: string) {
    super(`Invalid training configuration: ${message}`);
    this.name = 'InvalidConfigurationError';
  }
}

