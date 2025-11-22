/**
 * GameConfig - Configuration for MimicRL training
 * Provides defaults for RL training parameters
 * Uses constants from GameConstants for consistency
 */

import { GameConstants } from '../utils/constants';

export const GameConfig = {
  rl: {
    // Training parameters
    learningRate: GameConstants.RL_LEARNING_RATE,
    clipRatio: GameConstants.RL_CLIP_EPSILON,
    valueLossCoeff: GameConstants.RL_VALUE_COEFF,
    entropyCoeff: GameConstants.RL_ENTROPY_COEFF,
    maxGradNorm: GameConstants.RL_MAX_GRAD_NORM,
    gaeLambda: GameConstants.RL_LAMBDA,
    epochs: GameConstants.RL_EPOCHS,
    miniBatchSize: GameConstants.RL_MINI_BATCH_SIZE,
    algorithm: 'PPO',
    
    // Training session
    maxGames: GameConstants.RL_MAX_EPISODES,
    autoSaveInterval: GameConstants.RL_AUTO_SAVE_INTERVAL,
    parallelGames: GameConstants.RL_PARALLEL_GAMES,
    
    // Network architecture
    hiddenLayers: GameConstants.RL_HIDDEN_LAYERS,
    
    // Rollout configuration
    rollout: {
      rolloutMaxLength: GameConstants.RL_ROLLOUT_MAX_LENGTH,
      deltaTime: GameConstants.RL_ROLLOUT_DELTA_TIME,
      actionIntervalSeconds: GameConstants.RL_ROLLOUT_ACTION_INTERVAL,
      yieldInterval: GameConstants.RL_ROLLOUT_YIELD_INTERVAL,
    },
    
    // Rewards
    rewards: {
      maxGameLength: GameConstants.DEFAULT_EPISODE_TIME, // Use episode time constant
    },
    
    // Discount factor
    discountFactor: GameConstants.RL_GAMMA,
  },
};

