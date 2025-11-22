/**
 * CreatureDebugPage - Debug scene to view creature physics without actions
 * Simply places the creature in the environment and lets physics affect it
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as planck from 'planck';
import { PhysicsWorld } from '../game/PhysicsWorld';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { Creature } from '../game/Creature';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { CreatureRenderer } from '../rendering/CreatureRenderer';
import { EnvironmentRenderer } from '../rendering/EnvironmentRenderer';
import { Viewport } from '../rendering/Viewport';
import { CreatureService } from '../services/CreatureService';
import { StorageService } from '../services/StorageService';
import { TaskService } from '../services/TaskService';
import { CreatureDesign } from '../utils/types';
import { GameConstants } from '../utils/constants';

export default function CreatureDebugPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsWorldRef = useRef<PhysicsWorld | null>(null);
  const creaturePhysicsRef = useRef<CreaturePhysics | null>(null);
  const creatureRef = useRef<Creature | null>(null);
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const creatureRendererRef = useRef<CreatureRenderer | null>(null);
  const environmentRendererRef = useRef<EnvironmentRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const taskServiceRef = useRef<TaskService | null>(null);
  const defaultTaskRef = useRef<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [creatureDesign, setCreatureDesign] = useState<CreatureDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Load creature
  useEffect(() => {
    const loadCreature = async () => {
      try {
        const storageService = new StorageService();
        await storageService.initialize();
        const creatureService = new CreatureService(storageService);

        // Get creature ID from URL or use the last created one
        const creatureId = searchParams.get('creatureId');
        let creature: CreatureDesign | null = null;

        if (creatureId) {
          creature = await creatureService.loadCreature(creatureId);
        } else {
          // Load the last created creature (most recently updated)
          const creatures = await creatureService.listCreatures();
          if (creatures.length > 0) {
            creature = creatures[0]; // First one is most recent
          }
        }

        if (!creature) {
          setError('No creature found. Please create a creature first.');
          setLoading(false);
          return;
        }

        if (creature.bones.length === 0) {
          setError('Creature has no bones. Please add bones to the creature.');
          setLoading(false);
          return;
        }

        setCreatureDesign(creature);
      } catch (err) {
        console.error('Failed to load creature:', err);
        setError('Failed to load creature: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadCreature();
  }, [searchParams]);

  // Initialize physics and rendering
  useEffect(() => {
    if (!creatureDesign || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match world aspect ratio (20m × 15m = 4:3)
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

    // Create renderers
    const canvasRenderer = new CanvasRenderer(canvas);
    canvasRenderer.initialize();

    // Create viewport
    const viewport = new Viewport(
      canvas.width,
      canvas.height,
      GameConstants.DEFAULT_VIEWPORT_WIDTH,
      GameConstants.DEFAULT_VIEWPORT_HEIGHT
    );
    canvasRenderer.setViewport(viewport);

    const creatureRenderer = new CreatureRenderer(canvasRenderer);
    const environmentRenderer = new EnvironmentRenderer(canvasRenderer);

    canvasRendererRef.current = canvasRenderer;
    creatureRendererRef.current = creatureRenderer;
    environmentRendererRef.current = environmentRenderer;

    // Create physics world
    const physicsWorld = new PhysicsWorld(GameConstants.DEFAULT_GRAVITY);
    physicsWorldRef.current = physicsWorld;

    // Create task environment for ground and target (same as game)
    const taskService = new TaskService(new StorageService());
    taskServiceRef.current = taskService;
    const defaultTask = taskService.getDefaultTask();
    defaultTaskRef.current = defaultTask;

    // Create ground (same as game)
    const ground = physicsWorld.createGround(
      defaultTask.config.environment.groundLevel,
      defaultTask.config.environment.width
    );

    // Create walls around environment boundaries (same as game)
    physicsWorld.createWalls(
      defaultTask.config.environment.width,
      defaultTask.config.environment.height,
      defaultTask.config.environment.groundLevel,
      0.5 // 0.5m thick walls
    );

    // Create creature (same as game)
    const creature = new Creature(creatureDesign);
    const creaturePhysics = physicsWorld.createCreature(creatureDesign);
    creatureRef.current = creature;
    creaturePhysicsRef.current = creaturePhysics;

    // Position creature at start position (same as game - uses task config)
    const startPos = defaultTask.config.startPosition; // { x: 0, y: 5 } from task config
    const bodies = creaturePhysics.getBodies();
    if (bodies.length > 0) {
      const firstBody = bodies[0];
      const currentPos = firstBody.getPosition();
      if (currentPos && typeof currentPos.x === 'number' && typeof currentPos.y === 'number') {
        const offsetX = startPos.x - currentPos.x;
        const offsetY = startPos.y - currentPos.y;

        bodies.forEach((body) => {
          const pos = body.getPosition();
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            const newPos = planck.Vec2(pos.x + offsetX, pos.y + offsetY);
            body.setPosition(newPos);
            body.setLinearVelocity(planck.Vec2(0, 0));
            body.setAngularVelocity(0);
          }
        });
      }
    }

    console.log('[CreatureDebug] Initialized physics world and creature');

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (physicsWorld) {
        physicsWorld.destroy();
      }
    };
  }, [creatureDesign]);

  // Keyboard event handlers for debug force test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressedRef.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keysPressedRef.current.delete(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Render loop
  useEffect(() => {
    if (!isRunning || !canvasRendererRef.current || !creaturePhysicsRef.current) return;

    const render = () => {
      if (!isRunningRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply debug force if arrow keys are pressed
      if (creaturePhysicsRef.current && keysPressedRef.current.size > 0) {
        const bodies = creaturePhysicsRef.current.getBodies();
        const forceMagnitude = GameConstants.DEBUG_FORCE_MAGNITUDE;
        
        bodies.forEach((body) => {
          // Wake up body
          if (body.isAwake() === false) {
            body.setAwake(true);
          }
          
          // Apply force based on key pressed
          if (keysPressedRef.current.has('ArrowRight')) {
            const pos = body.getPosition();
            body.applyForce(planck.Vec2(forceMagnitude, 0), pos);
          }
          if (keysPressedRef.current.has('ArrowLeft')) {
            const pos = body.getPosition();
            body.applyForce(planck.Vec2(-forceMagnitude, 0), pos);
          }
        });
      }

      // Apply zero actions to muscles so they act as springs at rest length
      // This makes muscles behave like springs rather than rigid strings
      if (physicsWorldRef.current && creaturePhysicsRef.current) {
        const muscleCount = creatureRef.current?.design.muscles.length || 0;
        const zeroActions = new Array(muscleCount).fill(0);
        physicsWorldRef.current.applyMuscleForces(creaturePhysicsRef.current, zeroActions);
      }

      // Step physics (gravity, joints, and muscle springs)
      if (physicsWorldRef.current) {
        physicsWorldRef.current.step(GameConstants.PHYSICS_TIMESTEP);
      }

      // Render environment (ground, target, boundaries) - use cached task
      if (environmentRendererRef.current && defaultTaskRef.current) {
        environmentRendererRef.current.renderEnvironment(
          defaultTaskRef.current.config.environment,
          defaultTaskRef.current.config.targetPosition
        );
      }

      // Render creature
      if (creatureRendererRef.current && creaturePhysicsRef.current && creatureRef.current) {
        const bodies = creaturePhysicsRef.current.getBodies();
        const jointPositions = creaturePhysicsRef.current.getJointPositions();
        const creatureState = {
          positions: jointPositions,
          angles: bodies.map(b => b.getAngle()),
          velocities: bodies.map(b => {
            const vel = b.getLinearVelocity();
            return vel && typeof vel.x === 'number' && typeof vel.y === 'number' 
              ? { x: vel.x, y: vel.y } 
              : { x: 0, y: 0 };
          }),
          angularVelocities: bodies.map(b => b.getAngularVelocity()),
        };
        creatureRendererRef.current.render(creatureRef.current, creaturePhysicsRef.current, creatureState);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, creatureDesign]);

  const handleStart = () => {
    isRunningRef.current = true;
    setIsRunning(true);
  };

  const handleStop = () => {
    isRunningRef.current = false;
    setIsRunning(false);
  };

  const handleReset = () => {
    handleStop();
    if (creaturePhysicsRef.current && physicsWorldRef.current) {
      physicsWorldRef.current.resetCreature(creaturePhysicsRef.current);
      
      // Reposition at start
      const startPos = { x: 2, y: 5 };
      const bodies = creaturePhysicsRef.current.getBodies();
      if (bodies.length > 0) {
        const firstBody = bodies[0];
        const currentPos = firstBody.getPosition();
        if (currentPos && typeof currentPos.x === 'number' && typeof currentPos.y === 'number') {
          const offsetX = startPos.x - currentPos.x;
          const offsetY = startPos.y - currentPos.y;

          bodies.forEach((body) => {
            const pos = body.getPosition();
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              const newPos = planck.Vec2(pos.x + offsetX, pos.y + offsetY);
              body.setPosition(newPos);
              body.setLinearVelocity(planck.Vec2(0, 0));
              body.setAngularVelocity(0);
            }
          });
        }
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading creature...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  if (!creatureDesign) {
    return (
      <div style={{ padding: '20px' }}>
        <p>No creature found.</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Creature Physics Debug</h2>
        <p>
          <strong>Creature:</strong> {creatureDesign.name || 'Unnamed'}
        </p>
        <p>
          <small>
            {creatureDesign.bones.length} bones, {creatureDesign.joints.length} joints,{' '}
            {creatureDesign.muscles.length} muscles
          </small>
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          This scene shows the creature affected by physics (gravity, joints) without any muscle actions.
          The creature will fall and joints will hold bones together.
        </p>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            marginRight: '10px',
            backgroundColor: '#F44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Stop
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            marginRight: '10px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '600px' }}
        />
      </div>
    </div>
  );
}

