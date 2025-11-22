/**
 * TrainingView - Displays training session UI, shows real-time metrics, and provides training controls
 */

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { TrainingService } from '../../services/TrainingService';
import { StorageService } from '../../services/StorageService';
import { TaskService } from '../../services/TaskService';
import { CreatureService } from '../../services/CreatureService';
import { TrainingMetrics, TrainingProgress, TrainedModel } from '../../utils/types';
import { CanvasRenderer } from '../../rendering/CanvasRenderer';
import { CreatureRenderer } from '../../rendering/CreatureRenderer';
import { EnvironmentRenderer } from '../../rendering/EnvironmentRenderer';
import { Viewport } from '../../rendering/Viewport';
import { GameConstants } from '../../utils/constants';
import { Creature } from '../../game/Creature';
import { CreatureGameCore } from '../../game/CreatureGameCore';
import { PhysicsWorld } from '../../game/PhysicsWorld';
import { CreaturePhysics } from '../../physics/CreaturePhysics';
import { PolicyController } from '../../MimicRL/controllers/PolicyController';
import TrainingControls from './TrainingControls';
import { TrainingVisualizer } from '../../MimicRL/visualization/TrainingVisualizer.js';
import ModelSelector from '../TaskView/ModelSelector';

export interface TrainingViewProps {
  creatureDesignId: string;
  taskId: string;
  onTrainingComplete?: (modelId: string) => void;
  onTrainingPaused?: (sessionId: string) => void;
}

export interface TrainingViewRef {
  start(): void;
  getMetrics(): TrainingMetrics | null;
}

const TrainingView = forwardRef<TrainingViewRef, TrainingViewProps>(
  ({ creatureDesignId, taskId }, ref) => {
    const [isRunning, setIsRunning] = useState(false);
    const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
    const [progress, setProgress] = useState<TrainingProgress | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [canSaveBrain, setCanSaveBrain] = useState<boolean>(false);
    const [selectedModel, setSelectedModel] = useState<TrainedModel | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const cumulativeRewardRef = useRef<number>(0);

    const trainingServiceRef = useRef<TrainingService | null>(null);
    const renderingFrameRef = useRef<number | null>(null);
    const updateFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRendererRef = useRef<CanvasRenderer | null>(null);
    const creatureRendererRef = useRef<CreatureRenderer | null>(null);
    const environmentRendererRef = useRef<EnvironmentRenderer | null>(null);
    const gameCoreRef = useRef<CreatureGameCore | null>(null);
    const physicsWorldRef = useRef<PhysicsWorld | null>(null);
    const creaturePhysicsRef = useRef<CreaturePhysics | null>(null);
    const policyControllerRef = useRef<PolicyController | null>(null);
    const vizGameStateRef = useRef<any>(null);
    const lastVizUpdateRef = useRef<number>(0);
    const lastActionUpdateRef = useRef<number>(0); // Track when last action was decided
    const currentActionRef = useRef<number[]>([]); // Store current action to reuse
    const timeTillActionRef = useRef<number>(0); // Track remaining time for current action
    const isRunningRef = useRef<boolean>(false);
    const trainingVisualizerRef = useRef<any>(null);
    const visualizerContainerRef = useRef<HTMLDivElement>(null);
    
    // Keep refs in sync with state
    useEffect(() => {
      isRunningRef.current = isRunning;
    }, [isRunning]);

    useEffect(() => {
      const init = async () => {
        try {
          console.log('[TrainingView] Initializing services...');
          const storage = new StorageService();
          await storage.initialize();
          const taskService = new TaskService();
          const creatureService = new CreatureService(storage);
          trainingServiceRef.current = new TrainingService(storage, taskService, creatureService);
          console.log('[TrainingView] Services initialized');
          setIsInitialized(true);

        // Initialize rendering
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          
          // Set canvas size to match world aspect ratio (20m × 15m = 4:3)
          // Use container size but maintain aspect ratio
          const container = canvas.parentElement;
          const worldAspectRatio = GameConstants.DEFAULT_VIEWPORT_WIDTH / GameConstants.DEFAULT_VIEWPORT_HEIGHT; // 20/15 = 4/3
          
          let canvasWidth: number;
          let canvasHeight: number;
          
          if (container) {
            const rect = container.getBoundingClientRect();
            const containerWidth = rect.width || 800;
            const containerHeight = rect.height || 600;
            const containerAspectRatio = containerWidth / containerHeight;
            
            // Fit canvas to container while maintaining world aspect ratio
            if (containerAspectRatio > worldAspectRatio) {
              // Container is wider - fit to height
              canvasHeight = containerHeight;
              canvasWidth = canvasHeight * worldAspectRatio;
            } else {
              // Container is taller - fit to width
              canvasWidth = containerWidth;
              canvasHeight = canvasWidth / worldAspectRatio;
            }
          } else {
            // Fallback: use world aspect ratio with reasonable size
            canvasWidth = 800;
            canvasHeight = canvasWidth / worldAspectRatio; // 600
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          const canvasRenderer = new CanvasRenderer(canvas);
          canvasRenderer.initialize();
          
          // Create viewport for coordinate transformation
          const viewport = new Viewport(
            canvas.width,
            canvas.height,
            GameConstants.DEFAULT_VIEWPORT_WIDTH,
            GameConstants.DEFAULT_VIEWPORT_HEIGHT
          );
          canvasRenderer.setViewport(viewport);
          
          canvasRendererRef.current = canvasRenderer;
          
          canvasRendererRef.current = canvasRenderer;
          creatureRendererRef.current = new CreatureRenderer(canvasRenderer);
          environmentRendererRef.current = new EnvironmentRenderer(canvasRenderer);
          
          // Handle window resize
          const handleResize = () => {
            if (canvasRef.current && canvasRendererRef.current) {
              const canvas = canvasRef.current;
              const container = canvas.parentElement;
              const worldAspectRatio = GameConstants.DEFAULT_VIEWPORT_WIDTH / GameConstants.DEFAULT_VIEWPORT_HEIGHT;
              
              let canvasWidth: number;
              let canvasHeight: number;
              
              if (container) {
                const rect = container.getBoundingClientRect();
                const containerWidth = rect.width || 800;
                const containerHeight = rect.height || 600;
                const containerAspectRatio = containerWidth / containerHeight;
                
                if (containerAspectRatio > worldAspectRatio) {
                  canvasHeight = containerHeight;
                  canvasWidth = canvasHeight * worldAspectRatio;
                } else {
                  canvasWidth = containerWidth;
                  canvasHeight = canvasWidth / worldAspectRatio;
                }
              } else {
                canvasWidth = 800;
                canvasHeight = canvasWidth / worldAspectRatio;
              }
              
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;
              
              // Update viewport
              const viewport = canvasRendererRef.current.getViewport();
              if (viewport) {
                viewport.resize(canvas.width, canvas.height);
              }
            }
          };
          
          window.addEventListener('resize', handleResize);
          
          // Cleanup
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        }
        } catch (error) {
          console.error('[TrainingView] Failed to initialize:', error);
          setIsInitialized(true); // Still set to true so UI doesn't hang
        }
      };
      init();

      return () => {
        if (renderingFrameRef.current) {
          cancelAnimationFrame(renderingFrameRef.current);
        }
        if (updateFrameRef.current) {
          cancelAnimationFrame(updateFrameRef.current);
        }
        if (gameCoreRef.current) {
          gameCoreRef.current.destroy();
        }
        if (physicsWorldRef.current) {
          physicsWorldRef.current.destroy();
        }
      };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        // Clean up visualizer on unmount
        if (trainingVisualizerRef.current) {
          trainingVisualizerRef.current.dispose();
          trainingVisualizerRef.current = null;
        }
        // Clean up animation frames
        if (renderingFrameRef.current) {
          cancelAnimationFrame(renderingFrameRef.current);
        }
        if (updateFrameRef.current) {
          cancelAnimationFrame(updateFrameRef.current);
        }
      };
    }, []);

    useImperativeHandle(ref, () => ({
      start: () => handleStart(),
      getMetrics: () => metrics,
    }));

    const handleStart = async () => {
      if (!trainingServiceRef.current || !canvasRendererRef.current) return;

      try {
        // Load creature design
        const storage = new StorageService();
        await storage.initialize();
        const creatureService = new CreatureService(storage);
        const creatureDesign = await creatureService.loadCreature(creatureDesignId);
        if (!creatureDesign) {
          throw new Error('Creature not found');
        }

        // Validate creature has bones
        if (!creatureDesign.bones || creatureDesign.bones.length === 0) {
          throw new Error('Creature must have at least one bone');
        }

        // Get task
        const taskService = new TaskService();
        const task = await taskService.getTask(taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Get default training config
        const config = {
          task: task.config,
          hyperparameters: {
            learningRate: GameConstants.RL_LEARNING_RATE,
            gamma: GameConstants.RL_GAMMA,
            lambda: GameConstants.RL_LAMBDA,
            clipEpsilon: GameConstants.RL_CLIP_EPSILON,
            valueCoeff: GameConstants.RL_VALUE_COEFF,
            entropyCoeff: GameConstants.RL_ENTROPY_COEFF,
            maxEpisodeLength: Math.ceil(GameConstants.DEFAULT_EPISODE_TIME / GameConstants.PHYSICS_TIMESTEP), // Calculate from episode time
            batchSize: GameConstants.RL_MINI_BATCH_SIZE,
          },
          maxEpisodes: GameConstants.RL_MAX_EPISODES,
          autoSaveInterval: GameConstants.RL_AUTO_SAVE_INTERVAL,
        };

        // Start training (runs headlessly - TrainingService creates its own game core)
        const session = await trainingServiceRef.current.startTraining(
          creatureDesignId,
          taskId,
          config
        );
        setSessionId(session.id);
        setIsRunning(true);

        // If a model was selected, load it into the training session
        if (selectedModel && selectedModel.id) {
          try {
            await trainingServiceRef.current.loadModelIntoSession(session.id, selectedModel.id);
            console.log('Loaded model into training session:', selectedModel.name);
          } catch (error) {
            console.error('Failed to load model into session:', error);
            alert('Failed to load selected model: ' + (error instanceof Error ? error.message : String(error)));
          }
        }

        // Create a separate visualization game core for rendering
        // This uses the trained agent to show current performance
        const vizGameCore = new CreatureGameCore(
          creatureDesign,
          task.config,
          task.rewardFunction
        );
        gameCoreRef.current = vizGameCore;
        physicsWorldRef.current = vizGameCore.physicsWorld;
        creaturePhysicsRef.current = vizGameCore.creaturePhysics;

        // Reset the visualization game core to ensure proper positioning
        vizGameStateRef.current = vizGameCore.reset();
        lastActionUpdateRef.current = Date.now(); // Reset action timer
        currentActionRef.current = []; // Clear current action
        timeTillActionRef.current = 0; // Reset action time
        cumulativeRewardRef.current = 0; // Reset reward for new episode
        lastVizUpdateRef.current = Date.now();
        

        // Get the trained PolicyAgent from the training session
        // Try immediately, then retry if not ready
        const tryGetAgent = () => {
          const policyAgent = trainingServiceRef.current?.getPolicyAgent(session.id);
          if (policyAgent) {
            policyControllerRef.current = new PolicyController(policyAgent);
            setCanSaveBrain(true);
          } else {
            // Retry after a short delay if agent not ready yet
            setTimeout(tryGetAgent, 200);
          }
        };
        tryGetAgent();

        // Start rendering loop (shows trained agent performance)
        if (canvasRef.current && canvasRendererRef.current) {
          startRenderingLoop();
        } else {
          console.error('[TrainingView] Cannot start render loop - canvas or renderer not ready');
          // Try again after a short delay
          setTimeout(() => {
            if (canvasRef.current && canvasRendererRef.current) {
              startRenderingLoop();
            }
          }, 100);
        }

        // Start update loop to get metrics from training
        startUpdateLoop(session.id);

        // Initialize and attach TrainingVisualizer
        if (visualizerContainerRef.current) {
          try {
            // Get MimicRL session for visualizer
            const mimicRLSession = trainingServiceRef.current.getMimicRLSession(session.id);
            if (mimicRLSession) {
              // Create visualizer if not already created
              if (!trainingVisualizerRef.current) {
                trainingVisualizerRef.current = new TrainingVisualizer(visualizerContainerRef.current, {
                  maxDataPoints: 100,
                  episodeLengthUnit: 'seconds',
                  actionIntervalSeconds: GameConstants.RL_ROLLOUT_ACTION_INTERVAL,
                });
              }
              // Attach to session
              trainingVisualizerRef.current.attachToSession(mimicRLSession);
              trainingVisualizerRef.current.show();
            } else {
              console.warn('[TrainingView] MimicRL session not available for visualizer');
            }
          } catch (error) {
            console.error('[TrainingView] Failed to initialize TrainingVisualizer:', error);
          }
        }
      } catch (error) {
        console.error('Failed to start training:', error);
        alert('Failed to start training: ' + (error instanceof Error ? error.message : String(error)));
      }
    };


    const handleSaveBrain = async () => {
      if (!trainingServiceRef.current || !sessionId) {
        alert('No active training session to save');
        return;
      }

      try {
        // Check if there's a trained model available
        const policyAgent = trainingServiceRef.current.getPolicyAgent(sessionId);
        if (!policyAgent) {
          alert('No trained model available yet. Please wait for training to progress.');
          return;
        }

        // Save the trained model (the creature design is already saved separately in the editor)
        const model = await trainingServiceRef.current.saveTrainedModel(
          sessionId,
          `Brain for ${creatureDesignId} - ${new Date().toLocaleString()}`
        );

        alert(`Brain saved successfully!\nModel ID: ${model.id}\nEpisodes: ${model.episodes}`);
      } catch (error) {
        console.error('Failed to save brain:', error);
        alert('Failed to save brain: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    const startRenderingLoop = () => {
      const render = () => {
        if (
          !canvasRendererRef.current ||
          !creatureRendererRef.current ||
          !environmentRendererRef.current ||
          !gameCoreRef.current
        ) {
          renderingFrameRef.current = requestAnimationFrame(render);
          return;
        }
        
        // IMPORTANT: Access current state values via refs (not closure values)
        const currentlyRunning = isRunningRef.current;

        const canvasRenderer = canvasRendererRef.current;
        const creatureRenderer = creatureRendererRef.current;
        const environmentRenderer = environmentRendererRef.current;
        const gameCore = gameCoreRef.current;

        // Get creature physics from game core
        const creaturePhysics = gameCore.creaturePhysics;
        if (!creaturePhysics) {
          // If no creature physics yet, just render environment
          const task = gameCore.taskEnvironment;
          const envConfig = task.config.environment;
          const targetPos = task.getTargetPosition();
          canvasRenderer.clear();
          environmentRenderer.renderEnvironment(envConfig, targetPos);
          
          // Always continue render loop
          renderingFrameRef.current = requestAnimationFrame(render);
          return;
        }

        // Update visualization game with trained agent if available
        // Always step physics, even if agent isn't ready (so gravity works)
        const shouldStep = vizGameStateRef.current && currentlyRunning;
        
        if (shouldStep) {
          const now = Date.now();
          // Use fixed physics timestep to match headless training
          const physicsDeltaTime = GameConstants.RL_ROLLOUT_DELTA_TIME;
          const actionInterval = GameConstants.RL_ROLLOUT_ACTION_INTERVAL;
          
          // Check if we need to get a new action (match training action interval)
          const timeSinceLastAction = (now - lastActionUpdateRef.current) / 1000;
          let action: number[] = currentActionRef.current;
          
          // Get new action if enough time has passed OR if we've exhausted the current action
          if (timeSinceLastAction >= actionInterval || action.length === 0 || timeTillActionRef.current <= 0) {
            // Get action from trained agent if available
            if (policyControllerRef.current) {
              try {
                const observation = vizGameStateRef.current.observations[0];
                if (observation && observation.length > 0) {
                  action = policyControllerRef.current.decide(observation);
                  currentActionRef.current = action;
                  lastActionUpdateRef.current = now;
                  timeTillActionRef.current = actionInterval; // Reset timer for new action
                } else {
                  // If observation is invalid, use zero actions
                  action = new Array(gameCore.actionSize).fill(0);
                  currentActionRef.current = action;
                  timeTillActionRef.current = actionInterval;
                }
              } catch (error) {
                console.error('[TrainingView] Error getting action from agent:', error);
                // Fallback to zero actions
                action = new Array(gameCore.actionSize).fill(0);
                currentActionRef.current = action;
                timeTillActionRef.current = actionInterval;
              }
            } else {
              // Agent not ready yet, use zero actions (creature will just fall/rest)
              action = new Array(gameCore.actionSize).fill(0);
              currentActionRef.current = action;
              timeTillActionRef.current = actionInterval;
            }
          }
          // Otherwise, reuse the current action (matches training behavior where action persists for actionInterval)

          // Step the visualization game - match headless training exactly
          // Step once per render frame (or until action time is exhausted)
          try {
            if (!vizGameStateRef.current) {
              vizGameStateRef.current = gameCore.reset();
            }
            
            // Step once per render frame while we have time left for this action
            if (timeTillActionRef.current > 0 && !vizGameStateRef.current.done) {
              vizGameStateRef.current = gameCore.step([action], physicsDeltaTime);
              
              // Update cumulative reward (matches headless training)
              if (vizGameStateRef.current && vizGameStateRef.current.rewards.length > 0) {
                cumulativeRewardRef.current += vizGameStateRef.current.rewards[0];
              }
              
              // Decrement time remaining for this action
              timeTillActionRef.current -= physicsDeltaTime;
              
              // Update last viz update time
              lastVizUpdateRef.current = now;
            }

            // Reset episode if done (to show continuous performance)
            if (vizGameStateRef.current.done) {
              // Reset cumulative reward for new episode
              cumulativeRewardRef.current = 0;
              
              // Update policy controller to latest trained agent (in case weights changed)
              if (sessionId && trainingServiceRef.current) {
                const latestAgent = trainingServiceRef.current.getPolicyAgent(sessionId);
                if (latestAgent) {
                  policyControllerRef.current = new PolicyController(latestAgent);
                }
              }
              // Reset for new episode
              vizGameStateRef.current = gameCore.reset();
              lastActionUpdateRef.current = Date.now(); // Reset action timer
              currentActionRef.current = []; // Clear current action
              timeTillActionRef.current = 0; // Reset action time
            }
          } catch (error) {
            console.error('[TrainingView] Error stepping game:', error);
          }
        }

        // Clear canvas
        canvasRenderer.clear();

        // Get task environment for rendering
        const task = gameCore.taskEnvironment;
        const envConfig = task.config.environment;
        const targetPos = task.getTargetPosition();

        // Render environment
        environmentRenderer.renderEnvironment(envConfig, targetPos);

        // Get creature state
        const state = gameCore.physicsWorld.getCreatureState(creaturePhysics);
        const creature = new Creature(creaturePhysics.creature.design);

        // Render creature
        creatureRenderer.render(creature, creaturePhysics, state);

        // Render reward in upper left corner
        const ctx = canvasRenderer.getContext();
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 20px monospace';
        const rewardText = `Reward: ${cumulativeRewardRef.current.toFixed(2)}`;
        const textMetrics = ctx.measureText(rewardText);
        const padding = 10;
        const textX = padding;
        const textY = padding + 20;
        
        // Draw background rectangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
          textX - padding / 2,
          textY - 20 + padding / 2,
          textMetrics.width + padding,
          25
        );
        
        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(rewardText, textX, textY);
        ctx.restore();

        // Continue rendering loop - ALWAYS continue to keep rendering smooth
        // The stepping logic inside handles isRunning/isPaused
        renderingFrameRef.current = requestAnimationFrame(render);
      };

      renderingFrameRef.current = requestAnimationFrame(render);
    };

    const startUpdateLoop = (sid: string) => {
      const update = async () => {
        if (!trainingServiceRef.current) return;

        try {
          const currentMetrics = await trainingServiceRef.current.getMetrics(sid);
          const currentProgress = await trainingServiceRef.current.getProgress(sid);

          setMetrics(currentMetrics);
          setProgress(currentProgress);

          // Update policy controller to latest trained agent (weights may have changed)
          if (policyControllerRef.current && currentProgress.isRunning) {
            const latestAgent = trainingServiceRef.current.getPolicyAgent(sid);
            if (latestAgent) {
              policyControllerRef.current = new PolicyController(latestAgent);
            }
          }

          // Check if we can save brain (if there's a trained model)
          const hasTrainedModel = trainingServiceRef.current.getPolicyAgent(sid) !== null;
          setCanSaveBrain(hasTrainedModel);

          if (currentProgress.isRunning) {
            // Update every ~500ms (not every frame)
            setTimeout(() => {
              updateFrameRef.current = requestAnimationFrame(update);
            }, 500);
          } else {
            updateFrameRef.current = null;
          }
        } catch (error) {
          console.error('Failed to update metrics:', error);
          updateFrameRef.current = null;
        }
      };

      updateFrameRef.current = requestAnimationFrame(update);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h2>Training Session</h2>
        {!isRunning && isInitialized && trainingServiceRef.current && (
          <div style={{ marginBottom: '20px' }}>
            <ModelSelector
              creatureDesignId={creatureDesignId}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
              trainingService={trainingServiceRef.current}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              {selectedModel 
                ? `Will continue training from: ${selectedModel.name} (${selectedModel.episodes} episodes)`
                : 'No model selected - will start fresh training'}
            </p>
          </div>
        )}
        {!isRunning && !isInitialized && (
          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <p>Initializing...</p>
          </div>
        )}
        <TrainingControls
          isRunning={isRunning}
          onStart={handleStart}
          onSaveBrain={handleSaveBrain}
          canSaveBrain={canSaveBrain}
        />
        <div style={{ marginTop: '20px', marginBottom: '10px' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            fontStyle: 'italic',
            margin: 0 
          }}>
            Visualization: Shows current trained agent performance (updates as training progresses)
          </p>
        </div>
        <canvas
          ref={canvasRef}
          style={{ border: '1px solid #ccc', marginTop: '10px', marginBottom: '20px', display: 'block' }}
        />
        <div style={{ marginTop: '20px' }}>
          <p>Status: {isRunning ? 'Running' : 'Not Started'}</p>
          {progress && (
            <p>
              Episode: {progress.currentEpisode} /{' '}
              {progress.totalEpisodes || '∞'}
            </p>
          )}
        </div>
        <div style={{ marginTop: '30px' }}>
          <h3>Training Charts</h3>
          <div ref={visualizerContainerRef} style={{ marginTop: '10px' }} />
        </div>
      </div>
    );
  }
);

TrainingView.displayName = 'TrainingView';

export default TrainingView;

