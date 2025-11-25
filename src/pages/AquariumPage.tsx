/**
 * AquariumPage - Main aquarium view where creatures roam
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/StorageService';
import { AquariumService } from '../services/AquariumService';
import { CreatureService } from '../services/CreatureService';
import { TrainingService } from '../services/TrainingService';
import { AquariumState } from '../utils/types';
import { AquariumSimulator } from '../game/AquariumSimulator';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { AquariumRenderer } from '../rendering/AquariumRenderer';
import { Viewport } from '../rendering/Viewport';
import { GameConstants } from '../utils/constants';

export default function AquariumPage() {
  const navigate = useNavigate();
  const [aquariumState, setAquariumState] = useState<AquariumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [creatureCount, setCreatureCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const aquariumRendererRef = useRef<AquariumRenderer | null>(null);
  const simulatorRef = useRef<AquariumSimulator | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const aquariumStateRef = useRef<AquariumState | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    aquariumStateRef.current = aquariumState;
  }, [aquariumState]);

  const startSimulationLoop = () => {
    const simulate = (timestamp: number) => {
      if (!simulatorRef.current || !aquariumRendererRef.current || !aquariumStateRef.current) {
        animationFrameRef.current = requestAnimationFrame(simulate);
        return;
      }

      if (isPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(simulate);
        return;
      }

      const deltaTime = Math.min((timestamp - lastUpdateRef.current) / 1000, 0.1); // Cap at 100ms
      lastUpdateRef.current = timestamp;

      if (deltaTime > 0) {
        // Step simulation (only if there are creatures)
        const creatureInstances = simulatorRef.current.getCreatureInstances();
        if (creatureInstances.size > 0) {
          simulatorRef.current.step(deltaTime);
        }

        // Always render (environment + creatures if any)
        if (aquariumStateRef.current) {
          aquariumRendererRef.current.renderAquarium(aquariumStateRef.current, creatureInstances);
        }
      }

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    lastUpdateRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(simulate);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const storageService = new StorageService();
        await storageService.initialize();
        const aquariumService = new AquariumService(storageService);
        const creatureService = new CreatureService(storageService);
        const taskService = {} as any; // TaskService not needed for aquarium
        const trainingService = new TrainingService(storageService, taskService, creatureService);

        // Load aquarium state
        let state = await aquariumService.loadAquariumState();
        if (!state) {
          // Create empty aquarium state
          state = {
            creatures: [],
            environment: {
              type: 'flat_plane',
              groundLevel: GameConstants.DEFAULT_GROUND_LEVEL,
              width: GameConstants.AQUARIUM_ENVIRONMENT_WIDTH,
              height: GameConstants.AQUARIUM_ENVIRONMENT_HEIGHT,
              gravity: GameConstants.DEFAULT_GRAVITY,
            },
            lastUpdated: new Date(),
          };
          await aquariumService.saveAquariumState(state);
        }

        setAquariumState(state);
        setCreatureCount(state.creatures.length);

        // Initialize canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const container = canvas.parentElement;
          const worldAspectRatio = state.environment.width / state.environment.height;

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
            canvasHeight = 600;
          }

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          const viewport = new Viewport(
            canvasWidth,
            canvasHeight,
            state.environment.width,
            state.environment.height
          );

          const canvasRenderer = new CanvasRenderer(canvas);
          canvasRenderer.initialize();
          canvasRenderer.setViewport(viewport);
          canvasRendererRef.current = canvasRenderer;
          aquariumRendererRef.current = new AquariumRenderer(canvasRenderer);

          // Create simulator
          const simulator = new AquariumSimulator(state, creatureService, trainingService);
          await simulator.initialize();
          simulatorRef.current = simulator;

          console.log('[AquariumPage] Initialized with', state.creatures.length, 'creatures');
          console.log('[AquariumPage] Canvas size:', canvasWidth, 'x', canvasHeight);
          console.log('[AquariumPage] Viewport world size:', state.environment.width, 'x', state.environment.height);

          // Start simulation loop
          startSimulationLoop();
        }
      } catch (error) {
        console.error('Failed to initialize aquarium:', error);
        alert('Failed to load aquarium: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (simulatorRef.current) {
        simulatorRef.current.destroy();
      }
    };
  }, []);

  const handleClearAquarium = async () => {
    if (!window.confirm('Clear all creatures from aquarium?')) {
      return;
    }

    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const aquariumService = new AquariumService(storageService);
      await aquariumService.clearAquarium();

      // Reload page to refresh
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear aquarium:', error);
      alert('Failed to clear aquarium: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Aquarium</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Aquarium</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isPaused ? '#4CAF50' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleClearAquarium}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear Aquarium
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Creatures: {creatureCount} | {isPaused ? 'Paused' : 'Running'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '1200px', marginTop: '10px' }}>
        <canvas
          ref={canvasRef}
          style={{ border: '1px solid #ccc', display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}

