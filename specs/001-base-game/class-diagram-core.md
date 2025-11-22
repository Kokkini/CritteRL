# Core Class Diagram: Base Game - CritteRL

**Date**: 2025-01-27  
**Feature**: Base Game Implementation - Core Classes Only

This document contains a simplified Mermaid class diagram showing only the core, most important classes for the game logic and physics simulation.

```mermaid
classDiagram
    %% External Interface
    class GameCore {
        <<interface>>
        +reset() GameState
        +step(actions, deltaTime) GameState
        +getNumPlayers() number
        +getObservationSize() number
        +getActionSize() number
    }

    %% Core Game Layer
    class CreatureGameCore {
        +observationSize number
        +actionSize number
        +numPlayers number
        +reset() GameState
        +step(actions, deltaTime) GameState
        +getNumPlayers() number
        +getObservationSize() number
        +getActionSize() number
        +getActionSpaces() ActionSpace[]
    }

    class Creature {
        +id string
        +name string
        +design CreatureDesign
        +getBones() Bone[]
        +getJoints() Joint[]
        +getMuscles() Muscle[]
        +getBone(id) Bone
        +getJoint(id) Joint
        +getMuscle(id) Muscle
        +getMeanJointPosition() Position
        +validate() ValidationResult
    }

    class TaskEnvironment {
        +config TaskConfig
        +targetPosition Position
        +startPosition Position
        +maxEpisodeTime number
        +completionRadius number
        +reset() void
        +step(deltaTime) void
        +getDistanceToTarget() number
        +isCompleted() boolean
        +getReward() number
        +getTargetPosition() Position
        +getStartPosition() Position
    }

    class RewardCalculator {
        +config RewardFunctionConfig
        +calculateStepReward(deltaDistance, deltaTime, isCompleted) number
        +calculateCompletionBonus() number
        +calculateStabilityPenalty(instability) number
        +reset() void
    }

    class ObservationBuilder {
        +observationSize number
        +buildObservation(jointPositions, targetPosition) number[]
        +normalizePosition(pos) Position
        +getObservationSize() number
        +reset() void
    }

    %% Core Physics Layer
    class PhysicsWorld {
        +world World
        +gravity Position
        +ground Body
        +createWorld() void
        +createCreature(design) CreaturePhysics
        +step(deltaTime) void
        +applyMuscleForces(creature, activations) void
        +getCreatureState(creature) CreatureState
        +resetCreature(creature) void
        +createGround(level, width) Body
        +destroy() void
    }

    class CreaturePhysics {
        +creature Creature
        +world World
        +createPhysicsBodies() void
        +getBodies() Body[]
        +getJoints() Joint[]
        +getBodyForBone(boneId) Body
        +getJointForConnection(jointId) Joint
        +getJointPositions() Position[]
        +reset() void
        +destroy() void
    }

    class ForceApplication {
        +applyMuscleForces(actions) void
        +calculateMuscleForce(muscle, action, length) Position
        +getMuscleLength(muscle) number
    }

    %% Core Data Models
    class CreatureDesign {
        +id string
        +name string
        +createdAt Date
        +updatedAt Date
        +bones Bone[]
        +joints Joint[]
        +muscles Muscle[]
        +addBone(bone) void
        +removeBone(id) void
        +addJoint(joint) void
        +removeJoint(id) void
        +addMuscle(muscle) void
        +removeMuscle(id) void
        +getBones() Bone[]
        +getJoints() Joint[]
        +getMuscles() Muscle[]
        +getMeanJointPosition() Position
        +validate() ValidationResult
        +toJSON() string
        +fromJSON(json) CreatureDesign
    }

    class Bone {
        +id string
        +position Position
        +size Size
        +angle number
        +density number
        +getPosition() Position
        +setPosition(pos) void
        +getSize() Size
        +setSize(size) void
        +validate() ValidationResult
    }

    class Joint {
        +id string
        +boneAId string
        +boneBId string
        +anchorA Position
        +anchorB Position
        +lowerAngle number
        +upperAngle number
        +enableLimit boolean
        +getBoneAId() string
        +getBoneBId() string
        +getAnchorA() Position
        +getAnchorB() Position
        +validate(creature) ValidationResult
    }

    class Muscle {
        +id string
        +boneAId string
        +boneBId string
        +maxForce number
        +restLength number
        +getBoneAId() string
        +getBoneBId() string
        +getRestLength() number
        +setRestLength(length) void
        +getMaxForce() number
        +setMaxForce(force) void
        +validate(creature) ValidationResult
    }

    class CreatureState {
        +positions Position[]
        +angles number[]
        +velocities Position[]
        +angularVelocities number[]
    }

    %% Relationships - Inheritance
    CreatureGameCore ..|> GameCore : implements

    %% Relationships - Composition
    CreatureDesign *-- Bone : contains
    CreatureDesign *-- Joint : contains
    CreatureDesign *-- Muscle : contains
    Creature *-- CreatureDesign : uses
    Joint --> Bone : references (boneAId, boneBId)
    Muscle --> Bone : references (boneAId, boneBId)
    CreaturePhysics *-- Creature : uses
    PhysicsWorld *-- CreaturePhysics : manages

    %% Relationships - Core Dependencies
    CreatureGameCore --> Creature : uses
    CreatureGameCore --> TaskEnvironment : uses
    CreatureGameCore --> RewardCalculator : uses
    CreatureGameCore --> ObservationBuilder : uses
    CreatureGameCore --> PhysicsWorld : uses
    TaskEnvironment --> Task : uses
    RewardCalculator --> RewardFunctionConfig : uses
    ObservationBuilder --> TaskEnvironment : uses
    CreaturePhysics --> World : uses
    ForceApplication --> CreaturePhysics : uses
    ForceApplication --> Muscle : uses
    PhysicsWorld --> CreaturePhysics : creates
    PhysicsWorld --> CreatureState : returns
```

## Core Classes Overview

This simplified diagram focuses on the essential classes that form the core game loop and physics simulation:

### Game Layer
- **CreatureGameCore**: Implements MimicRL's GameCore interface, orchestrates the game loop
- **Creature**: Represents a creature entity with its structure
- **TaskEnvironment**: Manages task state, completion, and rewards
- **RewardCalculator**: Computes rewards based on performance
- **ObservationBuilder**: Constructs observation vectors for RL

### Physics Layer
- **PhysicsWorld**: Manages the physics simulation world
- **CreaturePhysics**: Creates and manages physics bodies for creatures
- **ForceApplication**: Applies muscle forces based on RL actions

### Data Models
- **CreatureDesign**: Complete creature structure definition
- **Bone**: Individual bone component
- **Joint**: Connection between two bones
- **Muscle**: Actuator connecting two bones
- **CreatureState**: Current physics state snapshot

### Key Relationships

1. **CreatureGameCore** orchestrates everything:
   - Uses `Creature` for creature structure
   - Uses `TaskEnvironment` for task management
   - Uses `RewardCalculator` for reward computation
   - Uses `ObservationBuilder` for RL observations
   - Uses `PhysicsWorld` for physics simulation

2. **CreatureDesign** is the blueprint:
   - Contains collections of `Bone`, `Joint`, and `Muscle`
   - `Joint` and `Muscle` reference `Bone` via IDs

3. **PhysicsWorld** manages simulation:
   - Creates `CreaturePhysics` instances from `CreatureDesign`
   - `CreaturePhysics` manages physics bodies and joints
   - `ForceApplication` applies muscle forces to physics bodies

### Excluded Classes

This simplified diagram excludes:
- **Services**: CreatureService, StorageService, TrainingService, TaskService, PhysicsService
- **UI Components**: All React components (CreatureEditor, TrainingView, etc.)
- **Rendering**: CanvasRenderer, CreatureRenderer, EnvironmentRenderer
- **Training Models**: TrainedModel, TrainingSession
- **Utilities**: ValidationResult, StorageUsage, TaskResult, GameConstants
- **Adapters**: PlanckAdapter (implementation detail)

These classes are important for the full application but not essential for understanding the core game loop and physics simulation.

