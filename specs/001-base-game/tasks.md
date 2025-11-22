# Tasks: Base Game - CritteRL

**Input**: Design documents from `/specs/001-base-game/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, class-diagram-core.md

**Tests**: Tests are OPTIONAL - not explicitly requested in spec.md, so test tasks are excluded for MVP focus.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Static web front-end only**: `src/`, `public/`, `tests/` at repository root (no backend directory)
- All source code in TypeScript
- React components in `src/components/`
- Game logic in `src/game/`
- Physics in `src/physics/`
- Rendering in `src/rendering/`
- Services in `src/services/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan in plan.md
- [x] T002 Initialize TypeScript project with Vite, React, and dependencies (package.json, tsconfig.json, vite.config.ts)
- [x] T003 [P] Configure ESLint and Prettier for TypeScript in .eslintrc.json and .prettierrc
- [x] T004 [P] Setup Vitest for unit testing in vitest.config.ts
- [x] T005 [P] Create public/index.html with React root element
- [x] T006 [P] Setup basic React app structure in src/main.tsx and src/App.tsx
- [x] T007 [P] Install and configure Planck.js (planck-js) and TypeScript definitions
- [x] T008 [P] Verify MimicRL library exists in src/MimicRL/ and is accessible

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create base TypeScript types and interfaces in src/utils/types.ts (Position, Size, ValidationResult, etc.)
- [x] T010 [P] Implement StorageService in src/services/StorageService.ts (localStorage and IndexedDB abstraction)
- [x] T011 [P] Implement GameConstants in src/utils/constants.ts (gravity, timestep, storage thresholds)
- [x] T012 [P] Create validation utilities in src/utils/validation.ts (ValidationResult, base validators)
- [x] T013 [P] Setup IndexedDB database schema in src/services/StorageService.ts (critterl_db with object stores)
- [x] T014 Create base data model classes in src/utils/types.ts (Bone, Joint, Muscle, CreatureDesign interfaces)
- [x] T015 [P] Implement PlanckAdapter wrapper in src/physics/PlanckAdapter.ts (createWorld, createGround, step)
- [x] T016 [P] Create CanvasRenderer base class in src/rendering/CanvasRenderer.ts (canvas management, clear, resize)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Design a Creature (Priority: P1) 🎯 MVP

**Goal**: Players can create creatures using a visual editor, place bones, connect them with joints, attach muscles, and save/load creature designs.

**Independent Test**: Open the game, use the visual editor to create a simple creature with at least 2 bones connected by 1 joint, and verify the creature design is saved and can be loaded.

### Implementation for User Story 1

#### Data Models
- [x] T017 [P] [US1] Implement Bone class in src/utils/types.ts (id, position, size, angle, density, getPosition, setPosition, getSize, setSize, validate)
- [x] T018 [P] [US1] Implement Joint class in src/utils/types.ts (id, boneAId, boneBId, anchorA, anchorB, lowerAngle, upperAngle, enableLimit, validate)
- [x] T019 [P] [US1] Implement Muscle class in src/utils/types.ts (id, boneAId, boneBId, maxForce, restLength, validate)
- [x] T020 [US1] Implement CreatureDesign class in src/utils/types.ts (id, name, createdAt, updatedAt, bones, joints, muscles, addBone, removeBone, addJoint, removeJoint, addMuscle, removeMuscle, getMeanJointPosition, validate, toJSON, fromJSON)

#### Validation
- [x] T021 [US1] Implement CreatureDesignValidator in src/utils/validation.ts (validates bones, joints, muscles, references)

#### Storage
- [x] T022 [US1] Implement CreatureService in src/services/CreatureService.ts (createCreature, saveCreature, loadCreature, listCreatures, deleteCreature, validateCreature)
- [x] T023 [US1] Integrate CreatureService with StorageService for localStorage persistence in src/services/CreatureService.ts

#### Creature Entity
- [x] T024 [US1] Implement Creature class in src/game/Creature.ts (constructor from CreatureDesign, getBones, getJoints, getMuscles, getBone, getJoint, getMuscle, getMeanJointPosition, validate)

#### UI Components
- [x] T025 [US1] Create CreatureEditor component structure in src/components/CreatureEditor/CreatureEditor.tsx (props, ref interface)
- [x] T026 [US1] Implement canvas-based bone placement in src/components/CreatureEditor/CreatureEditor.tsx (click to add bone, drag to move)
- [x] T027 [US1] Implement joint connection UI in src/components/CreatureEditor/CreatureEditor.tsx (click two bones to connect)
- [x] T028 [US1] Implement muscle attachment UI in src/components/CreatureEditor/CreatureEditor.tsx (click two bones to attach muscle)
- [x] T029 [US1] Add save/load functionality to CreatureEditor in src/components/CreatureEditor/CreatureEditor.tsx (save button, load from list)
- [x] T030 [US1] Implement creature list view in src/components/CreatureEditor/CreatureList.tsx (display saved creatures, load on click)

#### Pages
- [x] T031 [US1] Create EditorPage component in src/pages/EditorPage.tsx (container for CreatureEditor)
- [x] T032 [US1] Create HomePage component in src/pages/HomePage.tsx (navigation to editor, creature list)

#### Error Handling
- [x] T033 [US1] Add error handling for storage quota exceeded in src/services/CreatureService.ts (StorageQuotaExceededError)
- [x] T034 [US1] Add error handling for invalid creature designs in src/services/CreatureService.ts (InvalidCreatureError)
- [x] T035 [US1] Add error handling for corrupted data on load in src/services/CreatureService.ts (graceful error messages)

**Checkpoint**: At this point, User Story 1 should be fully functional - players can create, save, and load creature designs independently

---

## Phase 4: User Story 2 - Train Creature with Reinforcement Learning (Priority: P2)

**Goal**: Players can start training sessions where creatures learn to perform tasks (Reach Target) through RL, with real-time visualization and progress metrics.

**Independent Test**: Load a saved creature, start a training session for "Reach Target" task, observe the creature attempt the task multiple times, and verify that performance metrics improve over time.

### Implementation for User Story 2

#### Physics Layer
- [x] T036 [P] [US2] Implement CreaturePhysics class in src/physics/CreaturePhysics.ts (createPhysicsBodies from CreatureDesign, getBodies, getJoints, getBodyForBone, getJointForConnection, getJointPositions, reset, destroy)
- [x] T037 [P] [US2] Implement ForceApplication class in src/physics/ForceApplication.ts (applyMuscleForces, calculateMuscleForce, getMuscleLength)
- [x] T038 [US2] Implement PhysicsWorld class in src/game/PhysicsWorld.ts (createWorld, createCreature, step, applyMuscleForces, getCreatureState, resetCreature, createGround, destroy)

#### Game Layer
- [x] T039 [US2] Implement TaskEnvironment class in src/game/TaskEnvironment.ts (constructor from TaskConfig, reset, step, getDistanceToTarget, isCompleted, getReward, getTargetPosition, getStartPosition)
- [x] T040 [US2] Implement RewardCalculator class in src/game/RewardCalculator.ts (constructor from RewardFunctionConfig, calculateStepReward, calculateCompletionBonus, calculateStabilityPenalty, reset)
- [x] T041 [US2] Implement ObservationBuilder class in src/game/ObservationBuilder.ts (constructor from TaskEnvironment, buildObservation, normalizePosition, getObservationSize, reset)
- [x] T042 [US2] Implement CreatureGameCore class in src/game/CreatureGameCore.ts (implements GameCore interface, reset, step, getNumPlayers, getObservationSize, getActionSize, getActionSpaces)

#### Task Definition
- [x] T043 [US2] Create Task entity and TaskConfig in src/utils/types.ts (Task, TaskConfig, EnvironmentConfig, RewardFunctionConfig)
- [x] T044 [US2] Implement "Reach Target" task definition in src/game/TaskEnvironment.ts (target position, start position, completion radius, max episode time)

#### Training Service
- [x] T045 [US2] Implement TrainingService in src/services/TrainingService.ts (startTraining, pauseTraining, resumeTraining, stopTraining, saveTrainedModel, getMetrics, getProgress)
- [x] T046 [US2] Implement TrainingSession entity in src/utils/types.ts (id, creatureDesignId, taskId, status, currentEpisode, startedAt, pausedAt, config, metrics, checkpoint)
- [x] T047 [US2] Implement TrainedModel entity in src/utils/types.ts (id, creatureDesignId, name, createdAt, trainedAt, episodes, policyWeights, valueWeights, hyperparameters, performanceMetrics)
- [x] T048 [US2] Integrate TrainingService with IndexedDB for model storage in src/services/TrainingService.ts

#### MimicRL Integration
- [x] T049 [US2] Integrate CreatureGameCore with MimicRL training in src/services/TrainingService.ts (use MimicRL's PPO trainer)
- [x] T050 [US2] Setup Web Worker for training computation in src/services/TrainingWorker.ts (prevent UI freeze)
- [x] T051 [US2] Implement training checkpoint saving in src/services/TrainingService.ts (periodic saves to IndexedDB)

#### Rendering
- [x] T052 [US2] Implement CreatureRenderer class in src/rendering/CreatureRenderer.ts (render creature with bones, joints, muscles)
- [x] T053 [US2] Implement EnvironmentRenderer class in src/rendering/EnvironmentRenderer.ts (render ground, target waypoint, boundaries)
- [x] T054 [US2] Integrate rendering with training view in src/components/TrainingView/TrainingView.tsx (real-time creature visualization)

#### UI Components
- [x] T055 [US2] Create TrainingView component in src/components/TrainingView/TrainingView.tsx (start, pause, resume, stop, getMetrics)
- [x] T056 [US2] Implement training metrics display in src/components/TrainingView/TrainingMetrics.tsx (episode rewards, completion rate, average distance)
- [x] T057 [US2] Implement training controls UI in src/components/TrainingView/TrainingControls.tsx (start/pause/stop buttons)
- [x] T058 [US2] Create TrainingPage component in src/pages/TrainingPage.tsx (container for TrainingView)

#### Task Service
- [x] T059 [US2] Implement TaskService in src/services/TaskService.ts (getAvailableTasks, getTask)
- [x] T060 [US2] Create default "Reach Target" task in src/services/TaskService.ts (task definition with config)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - players can create creatures and train them with RL

---

## Phase 5: User Story 3 - Test Creature in Different Tasks (Priority: P3)

**Goal**: Players can test trained creatures on tasks to see performance results and metrics.

**Independent Test**: Load a trained creature, select a task from available options, run the creature through the task, and view the results.

### Implementation for User Story 3

#### Task Testing
- [x] T061 [US3] Implement testCreature method in TaskService in src/services/TaskService.ts (load creature, load model, run task, return TaskResult)
- [x] T062 [US3] Implement TaskResult entity in src/utils/types.ts (taskId, creatureDesignId, trainedModelId, completed, distanceToTarget, timeToComplete, score, timestamp)
- [x] T063 [US3] Implement getTaskHistory method in TaskService in src/services/TaskService.ts (retrieve performance history from IndexedDB)

#### UI Components
- [x] T064 [US3] Create TaskView component in src/components/TaskView/TaskView.tsx (startTest, stopTest, getResult)
- [x] T065 [US3] Implement task selection UI in src/components/TaskView/TaskSelector.tsx (list available tasks, select task)
- [x] T066 [US3] Implement test results display in src/components/TaskView/TaskResults.tsx (show score, completion status, distance, time)
- [x] T067 [US3] Integrate TaskView with training page or create separate test page

#### Model Loading
- [x] T068 [US3] Implement model loading from IndexedDB in TrainingService in src/services/TrainingService.ts (loadTrainedModel, listTrainedModels)
- [x] T069 [US3] Create model selection UI in src/components/TaskView/ModelSelector.tsx (list trained models, select model)

#### Performance History
- [x] T070 [US3] Implement performance history storage in TaskService in src/services/TaskService.ts (save TaskResult to IndexedDB)
- [x] T071 [US3] Create performance history view in src/components/TaskView/PerformanceHistory.tsx (display past test results)

**Checkpoint**: All user stories should now be independently functional - players can create, train, and test creatures

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T072 [P] Implement StorageManager component in src/components/StorageManager/StorageManager.tsx (display storage usage, quota warnings, delete UI)
- [ ] T073 [P] Add storage quota monitoring and warnings in StorageService in src/services/StorageService.ts (warn at 80% capacity)
- [ ] T074 [P] Implement error boundaries in React components in src/components/ErrorBoundary.tsx
- [ ] T075 [P] Add loading states and spinners throughout UI components
- [ ] T076 [P] Implement responsive design for mobile/tablet in CSS/styling
- [ ] T077 [P] Add keyboard shortcuts for editor in CreatureEditor component
- [ ] T078 [P] Optimize physics simulation performance (fixed timestep, object pooling) in PhysicsWorld
- [ ] T079 [P] Optimize rendering performance (batch draw calls, dirty rectangles) in CanvasRenderer
- [ ] T080 [P] Add memory leak prevention (cleanup on component unmount) across all components
- [ ] T081 [P] Implement offline detection and messaging in src/utils/offline.ts
- [ ] T082 [P] Add comprehensive error messages and user feedback throughout application
- [ ] T083 [P] Run quickstart.md validation scenarios and fix any issues
- [ ] T084 [P] Code cleanup and refactoring (remove unused code, improve naming)
- [ ] T085 [P] Documentation updates (README.md, code comments)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for CreatureDesign/Creature entities
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 (creatures) and US2 (trained models)

### Within Each User Story

- Data models before services
- Services before UI components
- Core game logic before rendering
- Physics layer before game layer
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T008)
- All Foundational tasks marked [P] can run in parallel (T010-T013, T015-T016)
- Within US1: Data model tasks (T017-T020) can run in parallel
- Within US2: Physics layer tasks (T036-T037) can run in parallel
- Different user stories can be worked on in parallel by different team members (after dependencies met)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all data model tasks for User Story 1 together:
Task: "Implement Bone class in src/utils/types.ts"
Task: "Implement Joint class in src/utils/types.ts"
Task: "Implement Muscle class in src/utils/types.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch physics layer tasks together:
Task: "Implement CreaturePhysics class in src/physics/CreaturePhysics.ts"
Task: "Implement ForceApplication class in src/physics/ForceApplication.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (create, save, load creature)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - creature creation!)
3. Add User Story 2 → Test independently → Deploy/Demo (RL training!)
4. Add User Story 3 → Test independently → Deploy/Demo (task testing!)
5. Add Polish → Final polish and optimization

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (creature creation)
   - Developer B: Prepares for User Story 2 (after US1 dependencies)
   - Developer C: Prepares for User Story 3 (after US1/US2 dependencies)
3. Stories complete and integrate sequentially (US1 → US2 → US3)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All source code must be TypeScript
- Physics simulation must maintain 60fps
- Training computation must use Web Workers to prevent UI freeze
- Storage quota warnings at 80% capacity
- All functionality must work offline after initial load

---

## Task Summary

- **Total Tasks**: 85
- **Setup Tasks**: 8 (Phase 1)
- **Foundational Tasks**: 8 (Phase 2)
- **User Story 1 Tasks**: 19 (Phase 3)
- **User Story 2 Tasks**: 25 (Phase 4)
- **User Story 3 Tasks**: 11 (Phase 5)
- **Polish Tasks**: 14 (Phase 6)
- **Parallel Opportunities**: Many tasks marked [P] can run simultaneously
- **Suggested MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1)

