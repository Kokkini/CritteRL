# Contracts: Base Game - CritteRL

**Date**: 2025-01-27  
**Feature**: Base Game Implementation

## Overview

This document defines the TypeScript interfaces and contracts for the CritteRL game. Since this is a static web front-end application, these are component APIs and service interfaces rather than REST endpoints.

## Core Interfaces

### CreatureService

Service for managing creature designs (CRUD operations).

```typescript
interface CreatureService {
  // Create a new creature design
  createCreature(name?: string): Promise<CreatureDesign>;
  
  // Save creature design to storage
  saveCreature(design: CreatureDesign): Promise<void>;
  
  // Load creature design from storage
  loadCreature(id: string): Promise<CreatureDesign | null>;
  
  // List all saved creature designs
  listCreatures(): Promise<CreatureDesign[]>;
  
  // Delete creature design
  deleteCreature(id: string): Promise<void>;
  
  // Validate creature design
  validateCreature(design: CreatureDesign): ValidationResult;
}
```

**Error Handling**:
- `StorageQuotaExceededError`: When storage quota is exceeded
- `InvalidCreatureError`: When creature design is invalid
- `CreatureNotFoundError`: When creature ID doesn't exist

---

### StorageService

Service for managing browser storage with quota monitoring.

```typescript
interface StorageService {
  // Get current storage usage
  getStorageUsage(): Promise<StorageUsage>;
  
  // Check if approaching quota limit (80%)
  isApproachingQuota(): Promise<boolean>;
  
  // Get available storage space
  getAvailableSpace(): Promise<number>;
  
  // Clear all stored data (with confirmation)
  clearAll(): Promise<void>;
}

interface StorageUsage {
  used: number;        // Bytes used
  quota: number;       // Total quota
  percentage: number;  // Percentage used (0-100)
}
```

**Error Handling**:
- `QuotaExceededError`: When storage quota is exceeded
- `StorageUnavailableError`: When storage is not available

---

### TrainingService

Service for managing RL training sessions.

```typescript
interface TrainingService {
  // Start a new training session
  startTraining(
    creatureDesignId: string,
    taskId: string,
    config: TrainingConfig
  ): Promise<TrainingSession>;
  
  // Pause current training session
  pauseTraining(sessionId: string): Promise<void>;
  
  // Resume paused training session
  resumeTraining(sessionId: string): Promise<void>;
  
  // Stop training session
  stopTraining(sessionId: string): Promise<void>;
  
  // Save trained model from completed session
  saveTrainedModel(sessionId: string, name?: string): Promise<TrainedModel>;
  
  // Get training metrics
  getMetrics(sessionId: string): Promise<TrainingMetrics>;
  
  // Get training progress (for UI updates)
  getProgress(sessionId: string): Promise<TrainingProgress>;
}

interface TrainingProgress {
  currentEpisode: number;
  totalEpisodes: number | null;  // null if unlimited
  averageReward: number;
  completionRate: number;
  isRunning: boolean;
}
```

**Error Handling**:
- `TrainingSessionNotFoundError`: When session ID doesn't exist
- `TrainingAlreadyRunningError`: When trying to start training while another is running
- `InvalidConfigurationError`: When training config is invalid

---

### TaskService

Service for managing tasks and task execution.

```typescript
interface TaskService {
  // Get available tasks
  getAvailableTasks(): Promise<Task[]>;
  
  // Get task by ID
  getTask(id: string): Promise<Task | null>;
  
  // Test creature with trained model on a task
  testCreature(
    creatureDesignId: string,
    trainedModelId: string,
    taskId: string
  ): Promise<TaskResult>;
  
  // Get task performance history
  getTaskHistory(
    creatureDesignId: string,
    taskId: string
  ): Promise<TaskResult[]>;
}

interface TaskResult {
  taskId: string;
  creatureDesignId: string;
  trainedModelId: string;
  completed: boolean;
  distanceToTarget: number;  // Distance from mean of all joint positions to target
  timeToComplete: number | null;  // null if not completed
  score: number;
  timestamp: Date;
}
```

**Error Handling**:
- `TaskNotFoundError`: When task ID doesn't exist
- `CreatureNotFoundError`: When creature design doesn't exist
- `ModelNotFoundError`: When trained model doesn't exist

---

## Component APIs

### CreatureEditor Component

React/Vue component for visual creature editing.

```typescript
interface CreatureEditorProps {
  initialCreature?: CreatureDesign;
  onSave: (creature: CreatureDesign) => void;
  onCancel: () => void;
}

interface CreatureEditorRef {
  getCreature(): CreatureDesign;
  validate(): ValidationResult;
  reset(): void;
}
```

**Events**:
- `onBoneAdded(bone: Bone)`
- `onBoneRemoved(boneId: string)`
- `onJointAdded(joint: Joint)`
- `onMuscleAdded(muscle: Muscle)`
- `onCreatureChanged(creature: CreatureDesign)`

---

### TrainingView Component

React/Vue component for training visualization and control.

```typescript
interface TrainingViewProps {
  creatureDesignId: string;
  taskId: string;
  onTrainingComplete: (model: TrainedModel) => void;
  onTrainingPaused: (session: TrainingSession) => void;
}

interface TrainingViewRef {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  getMetrics(): TrainingMetrics;
}
```

**Events**:
- `onEpisodeComplete(episode: number, reward: number)`
- `onTrainingProgress(progress: TrainingProgress)`
- `onError(error: Error)`

---

### TaskView Component

React/Vue component for task testing and results.

```typescript
interface TaskViewProps {
  creatureDesignId: string;
  trainedModelId: string;
  taskId: string;
  onTestComplete: (result: TaskResult) => void;
}

interface TaskViewRef {
  startTest(): void;
  stopTest(): void;
  getResult(): TaskResult | null;
}
```

**Events**:
- `onTestStart()`
- `onTestComplete(result: TaskResult)`
- `onTestError(error: Error)`

---

## Game Core Interface (MimicRL Integration)

Implementation of MimicRL's GameCore interface for the creature game.

```typescript
import { GameCore, GameState, Action, ActionSpace } from '../MimicRL/core/GameCore';

class CreatureGameCore implements GameCore {
  // Reset game to initial state
  reset(): GameState;
  
  // Advance game by one step
  step(actions: Action[], deltaTime: number): GameState;
  
  // Get number of players (always 1 for single creature)
  getNumPlayers(): number;
  
  // Get observation vector size
  getObservationSize(): number;
  
  // Get action vector size (number of muscles)
  getActionSize(): number;
  
  // Get action space definitions
  getActionSpaces(): ActionSpace[];
}
```

**Observation Vector** (normalized to [-1, 1]):
- Joint positions (current frame): [x1, y1, x2, y2, ..., xn, yn] for each joint
- Target position (current frame): [target_x, target_y]
- Joint positions (previous frame): [x1_prev, y1_prev, x2_prev, y2_prev, ..., xn_prev, yn_prev]
- Target position (previous frame): [target_x_prev, target_y_prev]

**Note**: Positions are normalized to [-1, 1] range based on environment bounds. Velocity can be inferred by the network from the difference between current and previous frame positions.

**Distance Calculation**:
- Distance to target = distance from mean of all joint positions to target position
- `meanJointPosition = (sum of all joint positions) / num_joints`
- `distanceToTarget = ||meanJointPosition - targetPosition||`
- Used for reward calculation and completion detection

**Action Vector**:
- Continuous values [-1, 1] for each muscle activation
- Number of actions = number of muscles in creature
- Action interpretation:
  - `+1.0` = muscle fully expanded (pushes bones apart, target length = restLength × 2.0)
  - `0.0` = muscle at rest (target length = restLength, neutral)
  - `-1.0` = muscle fully contracted (pulls bones together, target length = restLength × 0.0)
- Target length formula: `targetLength = restLength × (1 + action)`
- Force calculation: Muscle applies force to move current length toward target length
  - Force magnitude = `k × (currentLength - targetLength)` where k is spring constant
  - Force direction: positive (expansion) pushes bones apart, negative (contraction) pulls bones together

---

## Physics Interface

### PhysicsWorld

Wrapper for Planck.js physics world.

```typescript
interface PhysicsWorld {
  // Create physics world
  createWorld(gravity: { x: number, y: number }): void;
  
  // Create creature physics bodies from design
  createCreature(design: CreatureDesign): CreaturePhysics;
  
  // Step physics simulation
  step(deltaTime: number): void;
  
  // Apply muscle forces
  applyMuscleForces(creature: CreaturePhysics, activations: number[]): void;
  
  // Get creature state (positions, velocities)
  getCreatureState(creature: CreaturePhysics): CreatureState;
  
  // Reset creature to initial state
  resetCreature(creature: CreaturePhysics): void;
  
  // Clean up physics world
  destroy(): void;
}

interface CreaturePhysics {
  bodies: Body[];      // Physics bodies for bones
  joints: Joint[];      // Physics joints
  muscles: Muscle[];   // Muscle force applicators (always attached at bone centers)
}

interface CreatureState {
  positions: { x: number, y: number }[];
  angles: number[];
  velocities: { x: number, y: number }[];
  angularVelocities: number[];
}
```

---

## Rendering Interface

### Renderer

2D canvas rendering interface.

```typescript
interface Renderer {
  // Initialize renderer with canvas
  initialize(canvas: HTMLCanvasElement): void;
  
  // Render creature
  renderCreature(creature: CreaturePhysics, state: CreatureState): void;
  
  // Render environment (ground, target)
  renderEnvironment(environment: EnvironmentConfig, target: { x: number, y: number }): void;
  
  // Clear canvas
  clear(): void;
  
  // Resize canvas
  resize(width: number, height: number): void;
  
  // Clean up renderer
  destroy(): void;
}
```

---

## Error Types

```typescript
class StorageQuotaExceededError extends Error {
  constructor(public usage: StorageUsage) {
    super('Storage quota exceeded');
  }
}

class InvalidCreatureError extends Error {
  constructor(public errors: string[]) {
    super('Invalid creature design');
  }
}

class TrainingSessionNotFoundError extends Error {
  constructor(public sessionId: string) {
    super(`Training session not found: ${sessionId}`);
  }
}

// ... other error types
```

---

## Validation Contracts

All data must be validated before use:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface Validator<T> {
  validate(data: T): ValidationResult;
}
```

**Validators**:
- `CreatureDesignValidator`
- `TrainedModelValidator`
- `TrainingConfigValidator`
- `TaskConfigValidator`

