# Research: Base Game - CritteRL

**Date**: 2025-01-27  
**Feature**: Base Game Implementation

## Technology Decisions

### Front-End Framework

**Decision**: Use React with TypeScript

**Rationale**: 
- React has excellent TypeScript support and large ecosystem
- Component-based architecture fits well with game UI (editor, training view, etc.)
- Strong community and documentation
- Good performance for interactive applications
- Easy integration with Canvas/WebGL for rendering

**Alternatives Considered**:
- **Vue**: Good TypeScript support, simpler learning curve, but smaller ecosystem
- **Svelte**: Excellent performance, but newer and less mature tooling
- **Vanilla JS**: No framework overhead, but more boilerplate and harder to maintain

**Implementation Notes**: Use React 18+ with TypeScript, Vite for build tooling.

---

### Physics Engine

**Decision**: Use Planck.js for 2D physics simulation

**Rationale**:
- Modern rewrite of Box2D, optimized for JavaScript
- Excellent TypeScript support with type definitions
- Strong joint/constraint support (critical for bones and muscles)
- Good performance for 2D simulations
- Well-suited for creature physics (joints, forces, collisions)
- Browser-compatible, no WebAssembly required (though can use it for performance)

**Alternatives Considered**:
- **Box2D.js**: Original port, more mature but less performant and older codebase
- **Matter.js**: Easier to use but ~40% slower than Box2D and weaker joint support
- **Custom physics**: Too complex, would delay MVP significantly

**Implementation Notes**: Use planck-js npm package with TypeScript definitions. Wrap in adapter layer for game-specific needs.

---

### Rendering Engine

**Decision**: Use HTML5 Canvas 2D API (with option to upgrade to WebGL later)

**Rationale**:
- Simple 2D rendering sufficient for MVP
- Canvas API is well-supported and performant for 2D
- Easier to implement than WebGL
- Can render creatures, environment, and target waypoint effectively
- Good performance for real-time visualization at 60fps

**Alternatives Considered**:
- **WebGL**: Better performance for complex scenes, but more complex implementation
- **SVG**: Easier manipulation but poor performance for real-time animation
- **DOM elements**: Not suitable for physics-based animation

**Implementation Notes**: Start with Canvas 2D. Can migrate to WebGL (via Three.js or PixiJS) if performance becomes an issue with complex creatures.

---

### Storage Strategy

**Decision**: Use IndexedDB for trained models, localStorage for creature designs and preferences

**Rationale**:
- **IndexedDB**: 
  - Large storage capacity (much larger than localStorage)
  - Needed for neural network weights (can be several MB per model)
  - Structured storage for complex data
  - Async API suitable for large data
- **localStorage**:
  - Simpler API for small data
  - Synchronous, good for creature designs (typically <100KB)
  - Faster for frequent reads/writes
  - Sufficient for creature metadata and preferences

**Alternatives Considered**:
- **IndexedDB only**: More complex API, overkill for small creature designs
- **localStorage only**: 5-10MB limit too small for multiple trained models
- **SessionStorage**: Data doesn't persist across sessions (violates requirements)

**Implementation Notes**: 
- Create StorageService abstraction to handle both storage types
- Monitor quota usage and warn at 80% capacity
- Implement graceful error handling for quota exceeded

---

### RL Training Architecture

**Decision**: Use MimicRL library (existing) with Web Workers for training computation

**Rationale**:
- MimicRL already provides PPO implementation with TensorFlow.js
- Game-agnostic design fits perfectly (implement GameCore interface)
- Web Workers prevent UI freezing during intensive training
- TensorFlow.js runs in browser, no server needed

**Alternatives Considered**:
- **Custom RL implementation**: Too complex, would delay MVP significantly
- **Training on main thread**: Would freeze UI, violates performance requirements
- **External RL service**: Violates static web front-end only principle

**Implementation Notes**:
- Implement CreatureGameCore that extends MimicRL's GameCore interface
- Use TrainingWorker (already in MimicRL) or create custom worker for training
- Ensure training can be paused/resumed (save state periodically)

---

### Build Tool

**Decision**: Use Vite

**Rationale**:
- Fast development server with HMR
- Excellent TypeScript support
- Optimized production builds
- Modern tooling with minimal configuration
- Good for static site generation

**Alternatives Considered**:
- **Webpack**: More mature but slower and more complex configuration
- **Parcel**: Simpler but less flexible
- **esbuild**: Fast but less feature-rich

**Implementation Notes**: Use Vite with TypeScript plugin. Configure for static site output suitable for GitHub Pages deployment.

---

## Integration Patterns

### MimicRL Integration

**Pattern**: Implement GameCore interface for creature game

**Key Components**:
- `CreatureGameCore`: Implements GameCore interface
  - `reset()`: Initialize creature and environment
  - `step(actions, deltaTime)`: Advance physics, apply actions, compute rewards
  - `getObservationSize()`: Return observation vector size (creature state + target position)
  - `getActionSize()`: Return action vector size (muscle activations)
  - `getActionSpaces()`: Define continuous action spaces for muscles

**Observation Space**: 
- Joint positions (current frame): [x, y] coordinates for each joint, normalized to [-1, 1]
- Target position (current frame): [x, y] coordinates of target waypoint, normalized to [-1, 1]
- Joint positions (previous frame): [x, y] coordinates for each joint from previous step, normalized to [-1, 1]
- Target position (previous frame): [x, y] coordinates of target from previous step, normalized to [-1, 1]

**Note**: By including both current and previous frame positions, the network can infer velocity from the difference. This reduces the observation space size while maintaining necessary information for learning.

**Action Space**:
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

**Reward Structure**:
- **Distance-based reward** (per step): `distanceRewardFactor × deltaDistance`
  - Distance to target = distance from mean of all joint positions to target position
  - `meanJointPosition = average of all joint (x, y) coordinates`
  - `distanceToTarget = ||meanJointPosition - targetPosition||`
  - `deltaDistance = previousDistance - currentDistance` (positive when getting closer)
  - Rewards progress toward target (getting closer = positive reward)
  - Given at each simulation step
- **Time-based penalty** (per step): `-timePenaltyFactor × deltaTime`
  - `deltaTime` = time elapsed since last step
  - Penalizes time spent (encourages faster completion)
  - Given at each simulation step
- **Completion bonus**: `+completionBonus` when target reached
  - One-time bonus when creature reaches target (within completionRadius)
  - Episode ends early on completion
- **Stability penalty**: `-stabilityPenaltyFactor × instability_metric` (optional)
  - Penalty for excessive joint forces or unstable physics
  - Prevents unrealistic behaviors

---

### Physics Integration

**Pattern**: Adapter layer between game logic and Planck.js

**Key Components**:
- `PlanckAdapter`: Wraps Planck.js world
- `CreaturePhysics`: Creates physics bodies from creature design
  - Bones → dynamic bodies
  - Joints → revolute joints with limits
  - Muscles → force application between bodies
- `ForceApplication`: Applies muscle forces based on RL actions

**Physics Setup**:
- 2D world in side view (side-scroller orientation)
  - X-axis: horizontal (left-right)
  - Y-axis: vertical (up-down)
  - Gravity: along Y-axis, default `{0, -9.8}` (downward, negative Y)
- Ground plane (static body) at groundLevel Y coordinate for creatures to interact with
- Collision detection between creature and ground
- Joint limits to prevent unrealistic rotations
- **Muscle attachments**: Muscles always attach at the center point of bones (simplifies design, no attachment coordinates needed)

---

## Performance Optimization Strategies

1. **Physics**: 
   - Use fixed timestep for physics (60Hz = 16.67ms)
   - Limit physics iterations per frame
   - Use object pooling for temporary physics objects

2. **Rendering**:
   - Only render visible creatures
   - Use dirty rectangles for partial updates (if needed)
   - Batch draw calls

3. **RL Training**:
   - Use Web Workers to offload training computation
   - Batch neural network updates
   - Limit rollout length to prevent memory issues

4. **Storage**:
   - Compress trained models before saving (if possible)
   - Lazy load creature designs
   - Clean up old training data periodically

---

## Testing Strategy

1. **Unit Tests**: 
   - Physics calculations
   - Reward computation
   - Storage operations
   - Creature design validation

2. **Integration Tests**:
   - Creature creation → save → load cycle
   - Training session start → pause → resume
   - Physics simulation stability

3. **E2E Tests**:
   - Full user flows (create creature, train, test)
   - Browser storage quota handling
   - Performance benchmarks (60fps, memory usage)

---

## Open Questions / Future Research

1. **WebGL Migration**: Evaluate if Canvas 2D performance is sufficient or if WebGL migration is needed
2. **Model Compression**: Research compression techniques for neural network weights to reduce storage
3. **Parallel Training**: Investigate if multiple creatures can train in parallel using Web Workers
4. **Advanced Tasks**: Research additional tasks beyond "Reach Target" (jumping, climbing, etc.)

