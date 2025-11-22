/**
 * PhysicsTestPage - Simple test to verify physics engine works
 * Drops a ball and checks if it bounces on the ground
 */

import { useEffect, useRef, useState } from 'react';
import * as planck from 'planck';
import { Viewport } from '../rendering/Viewport';

export default function PhysicsTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<planck.World | null>(null);
  const ballRef = useRef<planck.Body | null>(null);
  const groundRef = useRef<planck.Body | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const runningRef = useRef<boolean>(false);
  const viewportRef = useRef<Viewport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [ballVelocity, setBallVelocity] = useState({ x: 0, y: 0 });
  
  // World dimensions in meters
  const WORLD_WIDTH = 20; // 20 meters wide
  const WORLD_HEIGHT = 15; // 15 meters tall

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (will be scaled by viewport)
    // Use a reasonable default, but viewport will scale to world units
    const defaultWidth = 800;
    const defaultHeight = 600;
    canvas.width = defaultWidth;
    canvas.height = defaultHeight;

    // Create viewport for coordinate transformation
    const viewport = new Viewport(defaultWidth, defaultHeight, WORLD_WIDTH, WORLD_HEIGHT);
    viewportRef.current = viewport;
    console.log(`[PhysicsTest] Viewport created: ${viewport.getPixelsPerMeter().toFixed(2)} pixels/meter`);

    // Create physics world with gravity pointing down (negative Y)
    const world = planck.World({
      gravity: planck.Vec2(0, -9.8), // Gravity pulls down (negative Y in physics = down)
    });
    worldRef.current = world;

    // Create ground at Y=0 (bottom of physics world)
    // Ground is a static box, 20m wide, 0.5m thick
    const groundWidth = WORLD_WIDTH; // 20 meters
    const groundThickness = 0.5; // 0.5 meters
    const ground = world.createBody({
      type: 'static',
      position: planck.Vec2(WORLD_WIDTH / 2, groundThickness / 2), // Center X, bottom at Y=0
    });

    // Ground box: Box(halfWidth, halfHeight) in meters
    const groundShape = planck.Box(groundWidth / 2, groundThickness / 2);
    ground.createFixture(groundShape, {
      density: 0.0,
      friction: 0.6,
      restitution: 0.3, // Some bounce
    });
    groundRef.current = ground;

    const groundPos = ground.getPosition();
    console.log(`[PhysicsTest] Ground created at: (${groundPos.x.toFixed(2)}m, ${groundPos.y.toFixed(2)}m)`);

    // Create ball at top of world
    // Ball starts at 12 meters high (near top of 15m world)
    const ballRadius = 0.2; // 20cm radius
    const ball = world.createBody({
      type: 'dynamic',
      position: planck.Vec2(WORLD_WIDTH / 2, 12), // Center X, high Y (in meters)
    });

    // Ball is a circle with radius in meters
    const ballShape = planck.Circle(ballRadius);
    ball.createFixture(ballShape, {
      density: 1.0,
      friction: 0.3,
      restitution: 0.8, // Bouncy ball
    });
    ballRef.current = ball;

    const ballPos = ball.getPosition();
    console.log(`[PhysicsTest] Ball created at: (${ballPos.x.toFixed(2)}m, ${ballPos.y.toFixed(2)}m)`);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const start = () => {
    if (!worldRef.current || !ballRef.current || !groundRef.current) {
      console.error('[PhysicsTest] World or bodies not initialized');
      return;
    }

    setIsRunning(true);
    runningRef.current = true;
    const world = worldRef.current;
    const ball = ballRef.current;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    let lastTime = performance.now();

    const step = () => {
      if (!runningRef.current) {
        animationFrameRef.current = null;
        return;
      }

      const now = performance.now();
      const deltaTime = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms
      lastTime = now;

      // Step physics
      world.step(deltaTime, 8, 3);

      // Get ball position and velocity
      const pos = ball.getPosition();
      const vel = ball.getLinearVelocity();
      setBallPosition({ x: pos.x, y: pos.y });
      setBallVelocity({ x: vel.x, y: vel.y });

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const viewport = viewportRef.current!;

      // Draw ground
      const groundPos = groundRef.current!.getPosition();
      const groundScreenX = viewport.worldToScreenX(groundPos.x);
      const groundScreenY = viewport.worldToScreenY(groundPos.y);
      const groundWidthPx = viewport.worldToScreenDistance(WORLD_WIDTH);
      const groundThicknessPx = viewport.worldToScreenDistance(0.5);
      
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(
        groundScreenX - groundWidthPx / 2,
        groundScreenY - groundThicknessPx / 2,
        groundWidthPx,
        groundThicknessPx
      );

      // Draw ground outline
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(groundScreenX - groundWidthPx / 2, groundScreenY);
      ctx.lineTo(groundScreenX + groundWidthPx / 2, groundScreenY);
      ctx.stroke();

      // Draw ball
      const ballScreenX = viewport.worldToScreenX(pos.x);
      const ballScreenY = viewport.worldToScreenY(pos.y);
      const ballRadiusPx = viewport.worldToScreenDistance(0.2); // 20cm radius
      
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(ballScreenX, ballScreenY, ballRadiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#CC0000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw info text
      ctx.fillStyle = '#000000';
      ctx.font = '14px monospace';
      ctx.fillText(`Ball World: (${pos.x.toFixed(2)}m, ${pos.y.toFixed(2)}m)`, 10, 20);
      ctx.fillText(`Ball Screen: (${ballScreenX.toFixed(0)}px, ${ballScreenY.toFixed(0)}px)`, 10, 40);
      ctx.fillText(`Ball Velocity: (${vel.x.toFixed(2)}m/s, ${vel.y.toFixed(2)}m/s)`, 10, 60);
      ctx.fillText(`Ground World: (${groundPos.x.toFixed(2)}m, ${groundPos.y.toFixed(2)}m)`, 10, 80);
      ctx.fillText(`Distance to ground: ${(pos.y - groundPos.y).toFixed(2)}m`, 10, 100);
      ctx.fillText(`Viewport: ${viewport.getPixelsPerMeter().toFixed(2)} px/m`, 10, 120);

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const stop = () => {
    setIsRunning(false);
    runningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const reset = () => {
    if (ballRef.current) {
      // Reset to 12 meters high (in world coordinates)
      ballRef.current.setPosition(planck.Vec2(WORLD_WIDTH / 2, 12));
      ballRef.current.setLinearVelocity(planck.Vec2(0, 0));
      ballRef.current.setAngularVelocity(0);
      const pos = ballRef.current.getPosition();
      console.log(`[PhysicsTest] Ball reset to: (${pos.x.toFixed(2)}m, ${pos.y.toFixed(2)}m)`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Physics Test - Ball Drop</h1>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={start} disabled={isRunning}>
          Start
        </button>
        <button onClick={stop} disabled={!isRunning} style={{ marginLeft: '10px' }}>
          Stop
        </button>
        <button onClick={reset} style={{ marginLeft: '10px' }}>
          Reset
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid #000',
          display: 'block',
          backgroundColor: '#87CEEB',
        }}
      />
      <div style={{ marginTop: '10px', fontFamily: 'monospace' }}>
        <div>Ball Position: ({ballPosition.x.toFixed(2)}, {ballPosition.y.toFixed(2)})</div>
        <div>Ball Velocity: ({ballVelocity.x.toFixed(2)}, {ballVelocity.y.toFixed(2)})</div>
      </div>
    </div>
  );
}

