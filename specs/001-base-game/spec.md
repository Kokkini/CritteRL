# Feature Specification: Base Game - CritteRL

**Feature Branch**: `001-base-game`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "base game: I want to build a game like the description in @game_description.md"

## Clarifications

### Session 2025-01-27

- Q: How many creature designs and trained models should a player be able to save? → A: Unlimited until browser storage quota reached, with warnings when approaching limit
- Q: What should the first/primary task be for creatures to learn? → A: Reach Target - Creature tries to reach a specific location/waypoint
- Q: How should training episodes be structured? → A: Time limit with early completion bonus (e.g., 30 seconds max, episode ends early if target reached, bonus reward for faster completion)
- Q: What should the training environment look like? → A: Simple flat plane with visible target waypoint (2D creatures in 2D world, no obstacles, flat ground)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Design a Creature (Priority: P1)

A player opens the game in their web browser and wants to create their first creature. They use a visual editor to place bones, connect them with joints, and attach muscles. The player can see their creature design in real-time as they build it. Once satisfied, they can save the creature design and proceed to training.

**Why this priority**: Without the ability to create creatures, the game has no core functionality. This is the foundation that all other features depend on. A player must be able to design a creature before it can learn or perform tasks.

**Independent Test**: Can be fully tested by opening the game, using the visual editor to create a simple creature with at least 2 bones connected by 1 joint, and verifying the creature design is saved. This delivers the core value of creature creation without requiring training or task execution.

**Acceptance Scenarios**:

1. **Given** the game is loaded in a browser, **When** a player clicks "Create New Creature", **Then** an empty canvas appears with tools for adding bones, joints, and muscles
2. **Given** a player is designing a creature, **When** they place a bone on the canvas, **Then** the bone appears at the selected location and can be moved or resized
3. **Given** a player has placed at least two bones, **When** they connect them with a joint, **Then** the bones are connected and can rotate relative to each other
4. **Given** a player has connected bones with joints, **When** they attach a muscle between two bones, **Then** the muscle appears and can apply force to move the connected bones
5. **Given** a player has created a creature design, **When** they click "Save Creature", **Then** the creature design is saved to browser storage and can be loaded later
6. **Given** a player has saved a creature, **When** they load it from storage, **Then** the creature design appears exactly as it was saved

---

### User Story 2 - Train Creature with Reinforcement Learning (Priority: P2)

A player has created a creature and wants to watch it learn to move. They start a training session where the creature attempts to perform a basic task (reach a target waypoint). The player watches in real-time as the creature's neural network learns through trial and error, gradually improving its performance. Training progress is visible through metrics and the creature's improving behavior.

**Why this priority**: The core differentiator of CritteRL is RL-based learning. Without training, creatures are just static designs. This story delivers the unique value proposition of watching AI learn in real-time.

**Independent Test**: Can be fully tested by loading a saved creature, starting a training session for a simple locomotion task, observing the creature attempt the task multiple times, and verifying that performance metrics improve over time. This delivers the core learning experience without requiring complex tasks or advanced creature designs.

**Acceptance Scenarios**:

1. **Given** a player has a saved creature, **When** they select "Start Training" and choose a basic task (e.g., "Reach Target"), **Then** the training session begins and the creature starts attempting to reach the target waypoint
2. **Given** a training session is running, **When** the creature performs actions, **Then** the creature's movements are visible in real-time on screen
3. **Given** a training session is running, **When** the creature completes the task (reaches target), fails (time limit reached), or the episode time limit expires, **Then** the neural network updates based on rewards (including early completion bonus if applicable) and the next episode begins
4. **Given** a training session has run for multiple episodes, **When** the player views training metrics, **Then** they can see improvement over time (e.g., distance to target, task completion rate, time to reach target)
5. **Given** a player wants to pause training, **When** they click "Pause Training", **Then** the training stops and can be resumed or the trained model can be saved
6. **Given** a player has trained a creature, **When** they save the trained model, **Then** the neural network weights are saved to browser storage and can be loaded for future use

---

### User Story 3 - Test Creature in Different Tasks (Priority: P3)

A player has trained a creature and wants to see how well it performs in different challenges. They can select from various tasks like running, jumping, climbing, or flying. The creature attempts each task using its trained neural network, and the player can see performance results for each task.

**Why this priority**: While training is the core learning mechanism, testing in different tasks demonstrates the creature's capabilities and provides variety. This expands the game's value by showing that creatures can learn diverse behaviors.

**Independent Test**: Can be fully tested by loading a trained creature, selecting a task from the available options, running the creature through the task, and viewing the results. This delivers task variety and performance evaluation without requiring new creature designs or additional training.

**Acceptance Scenarios**:

1. **Given** a player has a trained creature, **When** they select "Test Creature" and choose a task (e.g., "Jump Over Obstacle"), **Then** the creature attempts the task using its trained neural network
2. **Given** a creature is attempting a task, **When** it completes or fails the task, **Then** the player sees a performance score or result
3. **Given** a player has tested a creature in multiple tasks, **When** they view the task results, **Then** they can see performance metrics for each attempted task
4. **Given** a creature fails a task, **When** the player wants to improve performance, **Then** they can return to training to further train the creature for that specific task

---

### Edge Cases

- What happens when a player creates a creature with no joints or muscles? (Creature cannot move, but design should still be saveable)
- What happens when a player creates a creature with disconnected bones? (Should be allowed, but creature may not function as expected)
- What happens when training runs out of browser memory? (Should gracefully handle memory limits, possibly by limiting creature complexity or training batch size)
- What happens when a player tries to load a corrupted creature design from storage? (Should show an error message and allow creating a new creature)
- What happens when training is interrupted (browser closed, tab closed)? (Training progress should be saved periodically so it can be resumed)
- What happens when a training episode reaches the time limit before the creature reaches the target? (Episode ends, creature receives reward based on final distance to target, next episode begins)
- What happens when a creature's physics simulation becomes unstable (e.g., joints break, body parts detach)? (Should detect instability and reset the creature or show an error)
- What happens when a player creates a creature that is too complex for the browser to handle? (Should provide feedback about complexity limits or performance warnings)
- What happens when browser storage quota is reached or exceeded? (Should show clear error message when save fails due to quota, allow player to delete old creatures/models to free space, and warn when approaching quota limit at 80% capacity)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a visual editor interface for creating creatures with bones, joints, and muscles
- **FR-002**: System MUST allow players to place, move, resize, and delete bones on a canvas
- **FR-003**: System MUST allow players to connect bones using joints that enable rotation
- **FR-004**: System MUST allow players to attach muscles between bones that can apply forces
- **FR-005**: System MUST save creature designs to browser storage (localStorage or IndexedDB) with unlimited storage capacity until browser quota is reached
- **FR-006**: System MUST load previously saved creature designs from browser storage and MUST warn players when storage quota is approaching (e.g., when 80% full)
- **FR-007**: System MUST provide a 2D physics simulation that runs entirely in the browser (creatures are 2D in a 2D world)
- **FR-008**: System MUST simulate realistic 2D physics for joints, bones, muscles, and collisions
- **FR-009**: System MUST support reinforcement learning training using PPO algorithm
- **FR-010**: System MUST train creatures entirely in the browser without server communication
- **FR-011**: System MUST display training progress in real-time (creature movements, metrics)
- **FR-012**: System MUST allow players to start, pause, and stop training sessions
- **FR-013**: System MUST save trained neural network models to browser storage with unlimited storage capacity until browser quota is reached
- **FR-014**: System MUST load previously trained models from browser storage and MUST warn players when storage quota is approaching
- **FR-015**: System MUST provide at least one basic task for creatures to learn: "Reach Target" where the creature attempts to reach a specific location/waypoint on a simple flat 2D plane (no obstacles, flat ground), with a visible target waypoint. Rewards are based on proximity to target and completion. Training episodes MUST have a maximum time limit (e.g., 30 seconds) and MUST end early if the target is reached, with bonus rewards for faster completion
- **FR-016**: System MUST allow players to test trained creatures in selected tasks
- **FR-017**: System MUST display task performance results (scores, success/failure, metrics)
- **FR-018**: System MUST render creatures and their movements visually in real-time
- **FR-019**: System MUST maintain physics simulation at acceptable frame rate (target 60fps) for smooth visualization
- **FR-020**: System MUST handle training computation without freezing the user interface (use Web Workers if needed)
- **FR-021**: System MUST work entirely offline after initial page load (no external API calls)
- **FR-022**: System MUST persist all data (creature designs, trained models) in browser storage only

### Key Entities *(include if feature involves data)*

- **Creature Design**: Represents a creature's physical structure in 2D space. Contains bones (2D positions, sizes), joints (connections between bones, rotation limits), and muscles (connections, force parameters). Can be saved and loaded independently of training state.

- **Trained Model**: Represents a creature's learned neural network. Contains policy network weights and value network weights that determine the creature's behavior. Associated with a specific creature design and can be saved/loaded separately.

- **Training Session**: Represents an active training process. Contains current episode count, performance metrics over time, and training configuration (task, hyperparameters). Can be paused, resumed, or stopped.

- **Task**: Represents a challenge for creatures to learn. Contains task definition (goal, reward structure, environment setup), and can track performance metrics for creatures attempting it. The primary task "Reach Target" requires the creature to navigate to a specific waypoint location on a simple flat 2D plane (no obstacles, flat ground), with a visible target waypoint. Distance to target is calculated from the mean of all joint positions to the target position. Rewards are based on distance to target and successful completion. Training episodes have a maximum time limit (e.g., 30 seconds) and end early if the mean joint position reaches within completionRadius of the target, with bonus rewards for faster completion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can create a basic creature (2 bones, 1 joint, 1 muscle) in under 2 minutes from opening the game
- **SC-002**: Creature designs save and load successfully 100% of the time without data loss
- **SC-003**: Physics simulation maintains smooth visualization (60fps) for creatures with up to 10 bones during real-time training
- **SC-004**: Training sessions can run for at least 100 episodes without browser crashes or memory errors
- **SC-005**: Creatures show measurable improvement in task performance over training (e.g., average distance to target decreases by at least 50% after 50 training episodes, or task completion rate increases from 0% to at least 30%)
- **SC-006**: Game loads and becomes interactive within 3 seconds on a 3G connection
- **SC-007**: Training computation does not freeze the user interface for more than 100ms at a time
- **SC-008**: Players can successfully test trained creatures in tasks and view performance results 100% of the time
- **SC-009**: All game functionality works entirely offline after initial page load (no network requests after load)
- **SC-010**: Saved creature designs and trained models persist across browser sessions (data remains after closing and reopening browser)
