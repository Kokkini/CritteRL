# Implementation Plan: Base Game - CritteRL

**Branch**: `001-base-game` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-base-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a browser-based sandbox game where players design 2D creatures (bones, joints, muscles) and watch them learn to perform tasks through reinforcement learning. The game runs entirely in the browser with no backend, using TypeScript, a 2D physics engine (Planck.js), and the existing MimicRL library for PPO-based training. Players can create creatures, train them to reach target waypoints, and test their performance. The 2D world uses a side-view orientation (side-scroller style) with gravity along the Y-axis pointing downward.

## Technical Context

**Language/Version**: TypeScript 5.x (latest stable)  
**Primary Dependencies**: 
- MimicRL (existing in src/MimicRL) - RL training library using TensorFlow.js
- Planck.js - 2D physics engine for creature simulation
- TensorFlow.js - Neural network computation for RL
- React/Vue/Svelte (TBD) - Front-end framework for UI
- Vite - Build tool and dev server
- Canvas API or WebGL - Rendering engine for 2D graphics

**Storage**: Browser storage only (IndexedDB for large data like trained models, localStorage for creature designs and preferences)  
**Testing**: 
- Vitest or Jest - Unit testing
- Playwright or Puppeteer - Browser-based integration/E2E testing
- Manual testing in browser for visual/performance validation

**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge) with WebAssembly and Web Workers support  
**Project Type**: Static web front-end only (no backend)  
**Performance Goals**: 
- 60fps physics simulation for creatures up to 10 bones
- <3s initial page load on 3G
- <100ms UI freeze during training computation
- Support 100+ training episodes without memory issues

**Constraints**: 
- Must run entirely in browser (no server)
- Must work offline after initial load
- Must use TypeScript for all source code
- Must maintain 60fps for smooth visualization
- Must handle browser storage quota gracefully
- Must not freeze UI during RL training (use Web Workers)

**Scale/Scope**: 
- Single-player game
- Unlimited creature designs (until browser quota)
- Unlimited trained models (until browser quota)
- Creatures with up to 10 bones for MVP (expandable)
- One primary task initially (Reach Target)

**Observation Space Design**:
- Joint positions (current frame): [x, y] for each joint, normalized to [-1, 1]
- Target position (current frame): [x, y] of target waypoint, normalized to [-1, 1]
- Joint positions (previous frame): [x, y] for each joint from previous step
- Target position (previous frame): [x, y] of target from previous step
- Observation size: (num_joints * 2 * 2) + (2 * 2) = (num_joints * 4) + 4
- Velocity is inferred by the network from frame-to-frame differences

**Action Space Design**:
- Continuous values [-1, 1] for each muscle activation
- Number of actions = number of muscles in creature
- Action interpretation:
  - `+1.0` = muscle fully expanded (pushes bones apart, target length = restLength × 2.0)
  - `0.0` = muscle at rest (target length = restLength, neutral)
  - `-1.0` = muscle fully contracted (pulls bones together, target length = restLength × 0.0)
- Target length formula: `targetLength = restLength × (1 + action)`
- Force calculation: Muscle applies spring-like force to move current length toward target length
  - Force magnitude = `k × (currentLength - targetLength)` where k is spring constant
  - Force direction: positive (expansion) pushes bones apart, negative (contraction) pulls bones together

**Reward Design**:
- **Distance reward** (per step): `distanceRewardFactor × deltaDistance`
  - Distance to target = distance from mean of all joint positions to target position
  - `meanJointPosition = average of all joint (x, y) coordinates`
  - `distanceToTarget = ||meanJointPosition - targetPosition||`
  - `deltaDistance = previousDistance - currentDistance` (positive when getting closer)
  - Rewards progress toward target at each simulation step
- **Time penalty** (per step): `-timePenaltyFactor × deltaTime`
  - `deltaTime` = time elapsed since last step
  - Penalizes time spent, encouraging faster completion
- **Completion bonus**: `+completionBonus` when target reached (one-time, episode ends)
- **Stability penalty**: `-stabilityPenaltyFactor × instability_metric` (optional, prevents unstable physics)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Static Web Front-End Only ✓
- **Status**: PASS
- **Compliance**: All functionality runs in browser, no backend required
- **Storage**: Browser storage (IndexedDB/localStorage) only
- **Deployment**: Static files to GitHub Pages

### TypeScript Requirement ✓
- **Status**: PASS
- **Compliance**: All source code will be written in TypeScript
- **Build**: TypeScript compilation via Vite

### Client-Side RL Training ✓
- **Status**: PASS
- **Compliance**: MimicRL uses TensorFlow.js for browser-based training
- **UI Freeze Prevention**: Web Workers will be used for intensive training computation

### Browser-Based Physics ✓
- **Status**: PASS
- **Compliance**: Planck.js runs entirely in browser (JavaScript/TypeScript)
- **Performance**: 2D physics is less computationally intensive than 3D

### Performance Standards ✓
- **Status**: PASS
- **Compliance**: 
  - 60fps target for physics (Planck.js can achieve this for 2D)
  - <3s load time achievable with code splitting
  - Web Workers prevent UI freeze

**Overall**: All constitution principles satisfied. No violations.

### Post-Design Re-evaluation

After Phase 1 design completion:

- **Static Web Front-End Only**: ✓ Confirmed - All services use browser storage, no backend APIs
- **TypeScript Requirement**: ✓ Confirmed - All interfaces and contracts defined in TypeScript
- **Client-Side RL Training**: ✓ Confirmed - MimicRL integration uses TensorFlow.js, Web Workers for computation
- **Browser-Based Physics**: ✓ Confirmed - Planck.js runs entirely in browser
- **Performance Standards**: ✓ Confirmed - Design supports 60fps, Web Workers prevent UI freeze

**Overall**: All constitution principles remain satisfied after design phase. No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-base-game/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/          # React/Vue/Svelte UI components
│   ├── CreatureEditor/  # Visual editor for creature design
│   ├── TrainingView/    # Training session UI
│   ├── TaskView/        # Task testing UI
│   └── StorageManager/  # Storage quota warnings, delete UI
├── pages/               # Main application pages/routes
│   ├── HomePage.tsx
│   ├── EditorPage.tsx
│   └── TrainingPage.tsx
├── services/            # Business logic
│   ├── CreatureService.ts      # Creature CRUD operations
│   ├── StorageService.ts        # Browser storage abstraction
│   ├── PhysicsService.ts        # Physics world management
│   └── TrainingService.ts      # RL training orchestration
├── game/                # Game-specific implementation
│   ├── CreatureGameCore.ts     # Implements MimicRL GameCore interface
│   ├── Creature.ts              # Creature entity (bones, joints, muscles)
│   ├── PhysicsWorld.ts          # Planck.js world wrapper
│   ├── TaskEnvironment.ts       # Reach Target task implementation
│   ├── RewardCalculator.ts      # Reward computation for RL
│   └── ObservationBuilder.ts    # Builds observation vector from physics state
├── physics/              # Physics engine integration
│   ├── PlanckAdapter.ts         # Wrapper for Planck.js
│   ├── CreaturePhysics.ts       # Physics body creation from creature design
│   └── ForceApplication.ts     # Muscle force application
├── rendering/            # Visual rendering
│   ├── CanvasRenderer.ts        # 2D canvas rendering
│   ├── CreatureRenderer.ts     # Creature visualization
│   └── EnvironmentRenderer.ts  # Environment/target rendering
├── MimicRL/             # RL library (existing, no changes)
│   ├── agents/
│   ├── training/
│   ├── controllers/
│   └── ...
└── utils/               # Shared utilities
    ├── types.ts         # TypeScript type definitions
    ├── constants.ts     # Game constants
    └── validation.ts    # Data validation

public/                  # Static assets
├── index.html
└── assets/              # Images, icons, etc.

tests/
├── unit/                # Unit tests
│   ├── services/
│   ├── game/
│   └── physics/
├── integration/         # Integration tests
│   └── game/
└── e2e/                 # End-to-end tests
    └── user-flows/

dist/                    # Build output (generated)
└── [compiled static files]
```

**Structure Decision**: Static web front-end only structure (Option 2b). The game is a single-page application with no backend. MimicRL already exists in src/MimicRL and will be integrated. The structure separates concerns: UI components, game logic, physics integration, and rendering. This allows for modular development and testing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles satisfied.
