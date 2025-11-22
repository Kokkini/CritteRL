# Data Model: Base Game - CritteRL

**Date**: 2025-01-27  
**Feature**: Base Game Implementation

## Entities

### Creature Design

Represents a creature's physical structure in 2D space. Stored in browser storage and can be saved/loaded independently of training state.

**Fields**:
- `id`: string (unique identifier, UUID)
- `name`: string (user-provided name, optional)
- `createdAt`: Date (timestamp when created)
- `updatedAt`: Date (timestamp when last modified)
- `bones`: Bone[] (array of bone definitions)
- `joints`: Joint[] (array of joint definitions)
- `muscles`: Muscle[] (array of muscle definitions)

**Bone**:
- `id`: string (unique within creature)
- `position`: { x: number, y: number } (2D position in creature space)
- `size`: { width: number, height: number } (dimensions)
- `angle`: number (initial rotation in radians, default 0)
- `density`: number (physics density, affects mass)

**Joint**:
- `id`: string (unique within creature)
- `boneAId`: string (reference to first bone)
- `boneBId`: string (reference to second bone)
- `anchorA`: { x: number, y: number } (attachment point on bone A, relative to bone center)
- `anchorB`: { x: number, y: number } (attachment point on bone B, relative to bone center)
- `lowerAngle`: number (minimum rotation angle in radians, optional)
- `upperAngle`: number (maximum rotation angle in radians, optional)
- `enableLimit`: boolean (whether angle limits are enforced)

**Muscle**:
- `id`: string (unique within creature)
- `boneAId`: string (reference to first bone)
- `boneBId`: string (reference to second bone)
- `maxForce`: number (maximum force the muscle can apply)
- `restLength`: number (length when muscle is at rest, used for spring-like behavior)
- **Note**: Muscles always attach at the center point of each bone. The attachment points are always at (0, 0) relative to each bone's center, so no attachment coordinates are stored.

**Validation Rules**:
- At least one bone required
- Joints must reference valid bone IDs
- Muscles must reference valid bone IDs
- Muscles connect bones at their center points (no attachment coordinates needed)
- Bone positions must be finite numbers
- Muscle maxForce must be positive
- Joint angles must be valid (lowerAngle < upperAngle if limits enabled)

**State Transitions**:
- Created → Saved (when user saves design)
- Saved → Loaded (when user loads design)
- Loaded → Modified → Saved (when user edits and saves)

---

### Trained Model

Represents a creature's learned neural network. Contains policy and value network weights that determine the creature's behavior. Associated with a specific creature design.

**Fields**:
- `id`: string (unique identifier, UUID)
- `creatureDesignId`: string (reference to Creature Design)
- `name`: string (user-provided name, optional)
- `createdAt`: Date (timestamp when training started)
- `trainedAt`: Date (timestamp when training completed)
- `episodes`: number (number of training episodes completed)
- `policyWeights`: Float32Array[] (neural network policy weights, array of layers)
- `valueWeights`: Float32Array[] (neural network value function weights, array of layers)
- `hyperparameters`: TrainingHyperparameters (training configuration used)
- `performanceMetrics`: PerformanceMetrics (training performance data)

**TrainingHyperparameters**:
- `learningRate`: number (PPO learning rate)
- `gamma`: number (discount factor)
- `lambda`: number (GAE lambda)
- `clipEpsilon`: number (PPO clip parameter)
- `valueCoeff`: number (value function loss coefficient)
- `entropyCoeff`: number (entropy bonus coefficient)
- `maxEpisodeLength`: number (maximum steps per episode)
- `batchSize`: number (training batch size)

**PerformanceMetrics**:
- `episodeRewards`: number[] (reward per episode, for plotting)
- `episodeLengths`: number[] (steps per episode)
- `completionRate`: number (percentage of episodes where target was reached)
- `averageDistance`: number (average final distance to target)
- `bestDistance`: number (closest distance to target achieved)

**Validation Rules**:
- Must reference valid creatureDesignId
- policyWeights and valueWeights must have matching layer structures
- All weight arrays must be finite numbers
- episodes must be non-negative
- hyperparameters must have valid ranges (e.g., learningRate > 0)

**State Transitions**:
- Training → Saved (when training completes and model is saved)
- Saved → Loaded (when model is loaded for testing)
- Saved → Deleted (when user deletes model)

---

### Training Session

Represents an active training process. Contains current episode count, performance metrics, and training configuration.

**Fields**:
- `id`: string (unique identifier, UUID)
- `creatureDesignId`: string (reference to Creature Design)
- `taskId`: string (reference to Task)
- `status`: 'running' | 'paused' | 'stopped' | 'completed'
- `currentEpisode`: number (current episode number)
- `startedAt`: Date (when training started)
- `pausedAt`: Date | null (when training was paused, if applicable)
- `config`: TrainingConfig (training configuration)
- `metrics`: TrainingMetrics (current training metrics)
- `checkpoint`: TrainingCheckpoint | null (state for resuming)

**TrainingConfig**:
- `task`: TaskConfig (task-specific configuration)
- `hyperparameters`: TrainingHyperparameters (RL hyperparameters)
- `maxEpisodes`: number (maximum episodes to train, optional)
- `autoSaveInterval`: number (episodes between auto-saves)

**TrainingMetrics**:
- `episodeRewards`: number[] (rewards for completed episodes)
- `episodeLengths`: number[] (lengths for completed episodes)
- `averageReward`: number (average reward across all episodes)
- `bestReward`: number (best episode reward)
- `completionRate`: number (percentage of episodes completed successfully)

**TrainingCheckpoint**:
- `episode`: number (episode number at checkpoint)
- `policyWeights`: Float32Array[] (current policy weights)
- `valueWeights`: Float32Array[] (current value weights)
- `optimizerState`: object (optimizer state for resuming training)
- `timestamp`: Date (when checkpoint was created)

**Validation Rules**:
- Must reference valid creatureDesignId and taskId
- status must be one of the defined states
- currentEpisode must be non-negative
- config must be valid (hyperparameters within valid ranges)

**State Transitions**:
- Created → Running (when training starts)
- Running → Paused (when user pauses)
- Paused → Running (when user resumes)
- Running → Stopped (when user stops)
- Running → Completed (when maxEpisodes reached or training completes)
- Any state → Deleted (when session is discarded)

---

### Task

Represents a challenge for creatures to learn. Contains task definition, reward structure, and environment setup.

**Fields**:
- `id`: string (unique identifier)
- `name`: string (display name, e.g., "Reach Target")
- `description`: string (task description)
- `type`: 'reach_target' | 'jump' | 'climb' | 'fly' (task type)
- `config`: TaskConfig (task-specific configuration)
- `rewardFunction`: RewardFunctionConfig (reward calculation parameters)

**TaskConfig** (for "Reach Target"):
- `targetPosition`: { x: number, y: number } (target waypoint position)
- `startPosition`: { x: number, y: number } (creature starting position)
- `maxEpisodeTime`: number (maximum episode duration in seconds, e.g., 30)
- `completionRadius`: number (distance from target to consider "reached" - measured from mean joint position to target)
- `environment`: EnvironmentConfig (environment setup)

**EnvironmentConfig**:
- `type`: 'flat_plane' (environment type)
- `groundLevel`: number (Y coordinate of ground plane in side-view 2D world)
- `width`: number (environment width along X-axis, horizontal)
- `height`: number (environment height along Y-axis, vertical)
- `gravity`: { x: number, y: number } (gravity vector, default {0, -9.8})
  - X-axis: horizontal (left-right)
  - Y-axis: vertical (up-down)
  - Gravity points downward along negative Y-axis (side-scroller view)

**RewardFunctionConfig**:
- `distanceRewardFactor`: number (multiplier for distance-based reward per step)
- `timePenaltyFactor`: number (multiplier for time-based penalty per step)
- `completionBonus`: number (bonus reward for reaching target)
- `stabilityPenaltyFactor`: number (optional, penalty multiplier for unstable physics)

**Validation Rules**:
- targetPosition and startPosition must be within environment bounds
- maxEpisodeTime must be positive
- completionRadius must be positive
- All reward weights must be finite numbers

**State Transitions**: Tasks are static definitions, no state transitions.

---

## Relationships

- **Creature Design** → **Trained Model**: One-to-many (one creature design can have multiple trained models)
- **Creature Design** → **Training Session**: One-to-many (one creature design can have multiple training sessions)
- **Task** → **Training Session**: One-to-many (one task can be used in multiple training sessions)
- **Trained Model** → **Creature Design**: Many-to-one (each trained model belongs to one creature design)

---

## Storage Mapping

### localStorage
- Creature designs (as JSON strings)
- User preferences (theme, default settings)
- Storage quota warnings (last warning timestamp)

**Key Format**: `creature_design_${id}`, `user_preferences`, `storage_warning_${timestamp}`

### IndexedDB
- Trained models (large binary data)
- Training sessions (with checkpoints)
- Performance metrics (for charts/visualization)

**Database**: `critterl_db`
**Object Stores**:
- `trained_models` (key: id)
- `training_sessions` (key: id)
- `performance_metrics` (key: modelId)

---

## Data Flow

1. **Creature Creation**:
   - User creates design in editor → Creature Design object created
   - Saved to localStorage → JSON serialization
   - Loaded from localStorage → JSON deserialization → Creature Design object

2. **Training**:
   - Creature Design loaded → Training Session created
   - Training runs → Metrics updated in memory
   - Checkpoint saved periodically → TrainingCheckpoint to IndexedDB
   - Training completes → Trained Model created → Saved to IndexedDB

3. **Testing**:
   - Trained Model loaded from IndexedDB → Policy weights loaded
   - Creature Design loaded from localStorage → Physics bodies created
   - Task executed → Performance metrics collected
   - Results displayed → Metrics stored in IndexedDB

---

## Data Validation

All entities must be validated before:
- Saving to storage
- Loading from storage
- Using in game logic

Validation functions:
- `validateCreatureDesign(design: CreatureDesign): ValidationResult`
- `validateTrainedModel(model: TrainedModel): ValidationResult`
- `validateTrainingSession(session: TrainingSession): ValidationResult`
- `validateTask(task: Task): ValidationResult`

ValidationResult:
- `valid`: boolean
- `errors`: string[] (validation error messages)

