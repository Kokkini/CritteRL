/**
 * Base types and interfaces for CritteRL
 */

// Position in 2D space
export interface Position {
  x: number;
  y: number;
}

// Size dimensions
export interface Size {
  width: number;
  height: number;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Bone definition
export interface Bone {
  id: string;
  position: Position;
  size: Size;
  angle: number;
  density: number;
}

// Joint definition
export interface Joint {
  id: string;
  boneAId: string;
  boneBId: string;
  anchorA: Position;
  anchorB: Position;
  lowerAngle: number | null;
  upperAngle: number | null;
  enableLimit: boolean;
}

// Muscle definition
// Note: Muscles always attach at the center point of each bone (0, 0 relative to bone center)
export interface Muscle {
  id: string;
  boneAId: string;
  boneBId: string;
  maxForce: number;
  restLength: number;
}

// Creature Design
export interface CreatureDesign {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  bones: Bone[];
  joints: Joint[];
  muscles: Muscle[];
}

// Storage usage information
export interface StorageUsage {
  used: number; // Bytes used
  quota: number; // Total quota
  percentage: number; // Percentage used (0-100)
}

// Creature state (physics snapshot)
export interface CreatureState {
  positions: Position[];
  angles: number[];
  velocities: Position[];
  angularVelocities: number[];
}

// Task configuration
export interface TaskConfig {
  targetPosition: Position;
  startPosition: Position;
  maxEpisodeTime: number;
  completionRadius: number;
  environment: EnvironmentConfig;
}

// Environment configuration
export interface EnvironmentConfig {
  type: 'flat_plane';
  groundLevel: number;
  width: number;
  height: number;
  gravity: Position;
}

// Reward function configuration
export interface RewardFunctionConfig {
  distanceRewardFactor: number;
  timePenaltyFactor: number;
  completionBonus: number;
}

// Task definition
export interface Task {
  id: string;
  name: string;
  description: string;
  type: 'reach_target' | 'jump' | 'climb' | 'fly';
  config: TaskConfig;
  rewardFunction: RewardFunctionConfig;
}

// Training hyperparameters
export interface TrainingHyperparameters {
  learningRate: number;
  gamma: number;
  lambda: number;
  clipEpsilon: number;
  valueCoeff: number;
  entropyCoeff: number;
  maxEpisodeLength: number;
  batchSize: number;
}

// Performance metrics
export interface PerformanceMetrics {
  episodeRewards: number[];
  episodeLengths: number[];
  completionRate: number;
  averageDistance: number;
  bestDistance: number;
}

// Training metrics
export interface TrainingMetrics {
  episodeRewards: number[];
  episodeLengths: number[];
  averageReward: number;
  bestReward: number;
  completionRate: number;
}

// Training progress
export interface TrainingProgress {
  currentEpisode: number;
  totalEpisodes: number | null;
  averageReward: number;
  completionRate: number;
  isRunning: boolean;
}

// Training checkpoint
export interface TrainingCheckpoint {
  episode: number;
  policyWeights: Float32Array[];
  valueWeights: Float32Array[];
  optimizerState: unknown;
  timestamp: Date;
}

// Training configuration
export interface TrainingConfig {
  task: TaskConfig;
  hyperparameters: TrainingHyperparameters;
  maxEpisodes?: number;
  autoSaveInterval: number;
}

// Training session
export interface TrainingSession {
  id: string;
  creatureDesignId: string;
  taskId: string;
  status: 'running' | 'paused' | 'stopped' | 'completed';
  currentEpisode: number;
  startedAt: Date;
  pausedAt: Date | null;
  config: TrainingConfig;
  metrics: TrainingMetrics;
  checkpoint: TrainingCheckpoint | null;
}

// Trained model
export interface TrainedModel {
  id: string;
  creatureDesignId: string;
  name: string;
  createdAt: Date;
  trainedAt: Date;
  episodes: number;
  policyWeights: Float32Array[];
  valueWeights: Float32Array[];
  hyperparameters: TrainingHyperparameters;
  performanceMetrics: PerformanceMetrics;
  // Optional: Full export bundle for easy loading (includes network architecture, etc.)
  exportBundle?: {
    version: string;
    observationSize: number;
    actionSize: number;
    actionSpaces: unknown[];
    networkArchitecture: unknown;
    policyNetwork: unknown;
    valueNetwork: unknown;
    learnableStd: { data: number[]; shape: number[]; dtype: string };
    metadata: unknown;
  };
}

// Task result
export interface TaskResult {
  taskId: string;
  creatureDesignId: string;
  trainedModelId: string;
  completed: boolean;
  distanceToTarget: number;
  timeToComplete: number | null;
  score: number;
  timestamp: Date;
}

