/**
 * Game-wide constants
 */

import { Position } from './types';

export class GameConstants {
  // Physics
  static readonly DEFAULT_GRAVITY: Position = { x: 0, y: -9.8 };
  static readonly PHYSICS_TIMESTEP = 1 / 60; // seconds (60Hz)
  static readonly DEFAULT_FPS = 60;

  // Episode settings
  static readonly DEFAULT_EPISODE_TIME = 5; // seconds
  static readonly DEFAULT_COMPLETION_RADIUS = 0.5; // meters

  // Storage
  static readonly STORAGE_WARNING_THRESHOLD = 0.8; // 80% capacity

  // Environment
  static readonly DEFAULT_ENVIRONMENT_WIDTH = 50; // meters
  static readonly DEFAULT_ENVIRONMENT_HEIGHT = 30; // meters
  static readonly DEFAULT_GROUND_LEVEL = 0; // meters
  
  // Viewport
  static readonly DEFAULT_VIEWPORT_WIDTH = 50; // meters (for game/training view)
  static readonly DEFAULT_VIEWPORT_HEIGHT = 30; // meters (for game/training view)
  
  // Editor viewport (creature creation window)
  static readonly EDITOR_VIEWPORT_WIDTH = 6; // meters
  static readonly EDITOR_VIEWPORT_HEIGHT = 4; // meters

  // Creature design defaults
  static readonly DEFAULT_BONE_THICKNESS = 0.1; // meters (thickness perpendicular to bone length)
  static readonly DEFAULT_BONE_DENSITY = 10.0; // kg/m² (density used to calculate bone mass = density × area)
  static readonly DEFAULT_MUSCLE_MAX_FORCE = 500.0; // Newtons (maximum force a muscle can apply)
  
  // Debug force test (for CreatureDebugPage)
  static readonly DEBUG_FORCE_MAGNITUDE = 100.0; // Newtons (constant force applied when arrow keys pressed)

  // Physics material properties
  static readonly GROUND_FRICTION = 0.6; // Friction coefficient for ground
  static readonly WALL_FRICTION = 0.6; // Friction coefficient for walls
  static readonly BONE_FRICTION = 0.6; // Friction coefficient for creature bones
  static readonly GROUND_RESTITUTION = 0.0; // Restitution (bounciness) for ground
  static readonly WALL_RESTITUTION = 0.0; // Restitution (bounciness) for walls
  static readonly BONE_RESTITUTION = 0.1; // Restitution (bounciness) for creature bones

  // Body damping (reduces oscillations and instability)
  static readonly BONE_LINEAR_DAMPING = 0.5; // Linear velocity damping (0 = no damping, higher = more damping)
  static readonly BONE_ANGULAR_DAMPING = 0.5; // Angular velocity damping (0 = no damping, higher = more damping)

  // Collision filtering categories (bit flags)
  static readonly COLLISION_CATEGORY_BONE = 0x0001; // Category for creature bones
  static readonly COLLISION_CATEGORY_ENVIRONMENT = 0x0002; // Category for ground and walls
  
  // Collision masks (what each category can collide with)
  static readonly COLLISION_MASK_BONE = GameConstants.COLLISION_CATEGORY_ENVIRONMENT; // Bones collide with environment only
  static readonly COLLISION_MASK_ENVIRONMENT = GameConstants.COLLISION_CATEGORY_BONE | GameConstants.COLLISION_CATEGORY_ENVIRONMENT; // Environment collides with bones and itself

  // Joint angle limits (in radians, relative to original position at 0°)
  static readonly JOINT_LOWER_ANGLE = -Math.PI / 4; // -45 degrees (minimum rotation)
  static readonly JOINT_UPPER_ANGLE = Math.PI / 4; // +45 degrees (maximum rotation)
  // static readonly JOINT_LOWER_ANGLE = -Math.PI;
  // static readonly JOINT_UPPER_ANGLE = Math.PI;

  // Physics/Muscle force defaults
  static readonly MUSCLE_SPRING_CONSTANT = 400.0; // Spring constant for muscle force calculation
  static readonly MUSCLE_ACTION_MIN = -0.5; // Minimum action value (full contraction)
  static readonly MUSCLE_ACTION_MAX = 0.5; // Maximum action value (full expansion)

  // Reward defaults
  static readonly DEFAULT_DISTANCE_PROGRESS_REWARD_FACTOR = 0.1; // reward per meter closer to the target
  static readonly DEFAULT_DISTANCE_PENALTY_FACTOR = 0.01; // penalty per meter of absolute distance per second
  static readonly DEFAULT_TIME_PENALTY_FACTOR = 0.01; // time penalty per second
  static readonly DEFAULT_COMPLETION_BONUS = 1.0;

  // Task defaults
  static readonly DEFAULT_TASK_ID = 'reach_target';
  static readonly DEFAULT_TASK_NAME = 'Reach Target';
  static readonly DEFAULT_TASK_DESCRIPTION = 'Navigate to the target waypoint on a flat 2D plane';
  static readonly DEFAULT_TASK_TYPE = 'reach_target' as const;
  
  // Running task defaults
  static readonly DEFAULT_RUNNING_TASK_ID = 'running_task';
  static readonly DEFAULT_RUNNING_TASK_NAME = 'Running';
  static readonly DEFAULT_RUNNING_REWARD_FACTOR = 0.1; // Reward per unit distance moved in direction
  // static readonly DEFAULT_RUNNING_TIME_PENALTY = 0.01; // Optional time penalty
  static readonly DEFAULT_RUNNING_TIME_PENALTY = 0.0; // Optional time penalty
  
  // Task position defaults
  static readonly DEFAULT_TARGET_POSITION: Position = { x: 35, y: 1 }; // Center horizontally, 5m above ground
  static readonly DEFAULT_START_POSITION: Position = { x: 25, y: 2 }; // Center horizontally, 5m above ground
  
  // Task testing defaults
  static readonly DEFAULT_TEST_MAX_STEPS = 1000;
  static readonly DEFAULT_TEST_TIMESTEP = 1 / 60; // 60 FPS

  // RL Training hyperparameters
  static readonly RL_LEARNING_RATE = 0.005;
  static readonly RL_GAMMA = 0.99; // Discount factor
  static readonly RL_LAMBDA = 0.95; // GAE lambda
  static readonly RL_CLIP_EPSILON = 0.2; // PPO clip ratio
  static readonly RL_VALUE_COEFF = 0.5; // Value loss coefficient
  // static readonly RL_ENTROPY_COEFF = 0.003; // Entropy coefficient
  static readonly RL_ENTROPY_COEFF = 0.0; // Entropy coefficient
  static readonly RL_MAX_GRAD_NORM = 0.5; // Gradient clipping
  static readonly RL_EPOCHS = 4; // Training epochs per update
  static readonly RL_MINI_BATCH_SIZE = 128; // Mini-batch size for PPO training

  // RL Training session defaults
  static readonly RL_MAX_EPISODES = 1000000; // Maximum training episodes
  static readonly RL_AUTO_SAVE_INTERVAL = 100; // Auto-save every N episodes
  static readonly RL_PARALLEL_GAMES = 1; // Number of parallel rollouts

  // RL Network architecture
  // static readonly RL_HIDDEN_LAYERS = [64, 32]; // Policy and value network hidden layers
  static readonly RL_HIDDEN_LAYERS = [10]; // Policy and value network hidden layers
  static readonly RL_ACTIVATION = 'relu'; // Activation function
  static readonly RL_INITIAL_LOG_STD = 0.0; // Initial log standard deviation for continuous actions (std = exp(0) = 1.0)

  // RL Rollout configuration
  static readonly RL_ROLLOUT_MAX_LENGTH = 4096; // Maximum steps per rollout
  static readonly RL_ROLLOUT_DELTA_TIME = 1 / 32; // Physics timestep (60 FPS)
  static readonly RL_ROLLOUT_ACTION_INTERVAL = 1 / 16; // Action interval in seconds
  static readonly RL_ROLLOUT_YIELD_INTERVAL = 20; // Yield every N steps for UI responsiveness

  // Aquarium defaults
  static readonly AQUARIUM_ENVIRONMENT_WIDTH = 50; // meters
  static readonly AQUARIUM_ENVIRONMENT_HEIGHT = 30; // meters
  static readonly AQUARIUM_DIRECTION_CHANGE_INTERVAL = 10000; // 10 seconds (ms)
  static readonly AQUARIUM_MAX_CREATURES = 100; // Maximum creatures in aquarium
  static readonly AQUARIUM_DEFAULT_COUNT = 1; // Default number of instances to add
  
  // Aquarium spawn area (creatures spawn randomly within this box)
  static readonly AQUARIUM_SPAWN_MIN_X = 5; // meters (minimum X position)
  static readonly AQUARIUM_SPAWN_MAX_X = 45; // meters (maximum X position)
  static readonly AQUARIUM_SPAWN_MIN_Y = 2; // meters (minimum Y position above ground)
  static readonly AQUARIUM_SPAWN_MAX_Y = 8; // meters (maximum Y position above ground)

  // Aquarium food balls
  static readonly AQUARIUM_FOOD_RADIUS = 0.3; // meters
  static readonly AQUARIUM_FOOD_DRAG_LINEAR = 1.0;
  static readonly AQUARIUM_FOOD_EAT_RADIUS = 0.5; // meters
  static readonly AQUARIUM_FOOD_MAX_COUNT = 20;
}

