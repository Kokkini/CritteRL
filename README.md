# CritteRL

A browser-based sandbox game where players design 2D creatures and watch them learn through reinforcement learning.

## 🎮 Overview

CritteRL is an interactive simulation game that runs entirely in your web browser. Design creatures using bones, joints, and muscles, then train them using Proximal Policy Optimization (PPO) to perform tasks like reaching targets, locomotion, and more. Watch your creatures learn and improve in real-time!

### Key Differences from Evolution

- **Learning Method**: Uses Reinforcement Learning (PPO) instead of genetic algorithms
- **Individual Learning**: Each creature learns through trial and error, not population evolution
- **Real-Time Training**: Watch creatures improve episode by episode
- **Browser-Based**: Runs entirely in the browser with no backend required

## ✨ Features

### 🎨 Creature Design
- **Visual Editor**: Intuitive interface for building creatures
- **Modular Construction**: Design with bones, joints, and muscles
- **Real-Time Preview**: See your creature as you build it
- **Save & Load**: Store unlimited creature designs in browser storage

### 🤖 Reinforcement Learning
- **PPO Algorithm**: State-of-the-art policy gradient method
- **Neural Network Control**: Each creature's behavior controlled by a deep neural network
- **Real-Time Training**: Watch training progress with live metrics
- **Model Management**: Save and load trained "brains" for your creatures
- **Resume Training**: Continue training from saved checkpoints

### 🎯 Tasks & Challenges
- **Reach Target**: Navigate to waypoints (primary task)
- **Extensible**: Framework supports adding new tasks (locomotion, jumping, climbing, etc.)

### 📊 Training Features
- **Headless Training**: Fast training without rendering overhead
- **Parallel Rollouts**: Collect experiences from multiple episodes simultaneously
- **Live Metrics**: Track rewards, entropy, policy loss, and more
- **Experience Tracking**: Monitor total experiences collected
- **Performance History**: View training progress over time

### 💾 Storage
- **Browser Storage**: All data stored locally (IndexedDB for models, localStorage for designs)
- **No Backend**: Fully client-side application
- **Unlimited Storage**: Until browser quota reached (with warnings)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge) with WebAssembly support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CritteRL
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📁 Project Structure

```
CritteRL/
├── src/
│   ├── components/          # React UI components
│   │   ├── CreatureEditor/ # Creature design interface
│   │   ├── TrainingView/    # Training interface
│   │   └── TaskView/        # Task testing interface
│   ├── game/                # Game logic and core
│   │   ├── CreatureGameCore.ts  # Main game implementation
│   │   ├── ObservationBuilder.ts # Observation construction
│   │   └── RewardCalculator.ts   # Reward computation
│   ├── MimicRL/             # RL library (game-agnostic)
│   │   ├── agents/          # PolicyAgent implementation
│   │   ├── training/        # PPO trainer and training session
│   │   └── core/            # GameCore interface
│   ├── physics/              # Physics engine integration
│   │   └── CreaturePhysics.ts
│   ├── rendering/           # Canvas rendering
│   │   ├── CreatureRenderer.ts
│   │   └── EnvironmentRenderer.ts
│   ├── services/            # Business logic services
│   │   ├── TrainingService.ts
│   │   ├── CreatureService.ts
│   │   └── StorageService.ts
│   └── utils/               # Utilities and types
├── public/                  # Static assets
├── specs/                   # Design specifications
└── tests/                   # Test files
```

## 🎯 Usage Guide

### Creating a Creature

1. Navigate to the **Editor** page
2. Click **"Create New Creature"**
3. Add bones by clicking on the canvas
4. Connect bones with joints
5. Add muscles between bones to enable movement
6. Save your creature design

### Training a Creature

1. Navigate to the **Training** page
2. Select your creature design
3. (Optional) Select a previously trained model to continue training
4. Click **"Start Training"**
5. Watch the creature learn in real-time
6. Click **"Save Brain"** to save the trained model

### Testing a Creature

1. Navigate to the **Test** page
2. Select your creature design
3. Select a trained model (brain)
4. Click **"Start Test"**
5. Watch your creature perform the task

## 🏗️ Architecture

### Core Components

- **CreatureGameCore**: Implements the `GameCore` interface for MimicRL
- **MimicRL**: Game-agnostic RL library with PPO training
- **Planck.js**: 2D physics engine for realistic simulation
- **TensorFlow.js**: Neural network computation in the browser
- **React**: UI framework

### Training Architecture

Training runs **headlessly** (without rendering) for maximum performance:

1. `TrainingService` creates a headless `CreatureGameCore` instance
2. `TrainingSession` manages the RL training loop
3. `RolloutCollector` collects experiences from parallel episodes
4. `PPOTrainer` updates the policy network using PPO
5. Visualization runs separately and doesn't affect training speed

See [TRAINING_ARCHITECTURE.md](./TRAINING_ARCHITECTURE.md) for detailed architecture documentation.

## 🔧 Technical Details

### Technology Stack

- **TypeScript**: Type-safe development
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Planck.js**: 2D physics engine (Box2D port)
- **TensorFlow.js**: Neural network computation
- **IndexedDB**: Large data storage (trained models)
- **localStorage**: Small data storage (creature designs)

### Action Space

- **Continuous Actions**: Muscle activations in range `[-0.5, 0.5]`
  - `-0.5`: Full contraction
  - `0.0`: Rest length
  - `+0.5`: Full expansion

### Observation Space

- Current center of mass position (normalized)
- Current joint positions relative to COM (normalized)
- Current target position relative to COM (normalized)
- Previous frame center of mass position (normalized)
- Previous frame joint positions relative to previous COM (normalized)
- Previous frame target position relative to previous COM (normalized)

### Reward Function

- **Distance Progress Reward**: Reward for getting closer to target
- **Distance Penalty**: Penalty based on absolute distance
- **Time Penalty**: Encourages faster completion
- **Completion Bonus**: One-time bonus when target is reached

### RL Hyperparameters

Default values (configurable in `src/utils/constants.ts`):
- Learning Rate: `0.0005`
- Discount Factor (γ): `0.99`
- GAE Lambda (λ): `0.95`
- PPO Clip Ratio: `0.2`
- Entropy Coefficient: `0.01`
- Value Loss Coefficient: `0.5`
- Epochs per Update: `4`
- Mini-batch Size: `128`

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

## 🧪 Testing

The project uses Vitest for testing. Tests are organized in the `tests/` directory:
- `unit/` - Unit tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
