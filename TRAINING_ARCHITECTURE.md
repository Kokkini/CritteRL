# Training Architecture - CritteRL

## How Training Works

### Overview

Training in CritteRL runs **headlessly** (without rendering) for maximum performance. The system uses MimicRL's `TrainingSession` which manages the entire RL training loop.

### Architecture

1. **Headless Training** (Primary):
   - `TrainingService` creates a `CreatureGameCore` instance
   - MimicRL's `TrainingSession` runs episodes headlessly using `RolloutCollector`
   - Multiple parallel rollouts collect experiences
   - PPO trainer updates the policy network
   - No rendering overhead - runs as fast as possible

2. **Optional Visualization** (Separate):
   - `TrainingView` creates a **separate** `CreatureGameCore` instance for visualization
   - This visualization instance does NOT affect training performance
   - Rendering runs independently in a separate animation loop
   - Training continues headlessly in the background

### Training Flow

```
User clicks "Start Training"
  ↓
TrainingService.startTraining()
  ↓
Creates CreatureGameCore (headless)
  ↓
Creates MimicRL TrainingSession
  ↓
TrainingSession.initialize()
  - Creates PolicyAgent
  - Creates RolloutCollectors (parallel)
  - Creates PPOTrainer
  ↓
TrainingSession.start()
  ↓
Training Loop (headless):
  while (isTraining && !isPaused):
    1. Collect rollouts (parallel episodes)
    2. Combine experiences
    3. Train PPO on experiences
    4. Update policy weights
    5. Repeat
  ↓
Callbacks update UI metrics
```

### Key Components

- **TrainingService**: Manages training sessions, loads creatures/tasks, creates MimicRL sessions
- **CreatureGameCore**: Implements MimicRL's `GameCore` interface for RL training
- **MimicRL TrainingSession**: Runs headless training loop with PPO
- **RolloutCollector**: Collects experiences from headless game episodes
- **PPOTrainer**: Updates neural network using PPO algorithm

### Performance

- **Training**: Runs headlessly at maximum speed (no rendering)
- **Visualization**: Optional, runs separately, doesn't slow down training
- **Parallel Rollouts**: Multiple episodes run in parallel for faster experience collection

### Metrics

Training metrics are updated via callbacks:
- `onTrainingProgress`: Called after each training iteration
- `onGameEnd`: Called when an episode completes
- `onTrainingComplete`: Called when training finishes

Metrics include:
- Episode rewards (rewardHistory)
- Episode lengths (gameLengthHistory)
- Win rate (completionRate)
- Average/best rewards

