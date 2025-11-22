/**
 * PlanckAdapter - Wrapper for Planck.js physics engine
 */

import * as planck from 'planck';
import { Position } from '../utils/types';
import { GameConstants } from '../utils/constants';

export class PlanckAdapter {
  /**
   * Create a physics world
   */
  createWorld(gravity: Position): planck.World {
    return planck.World({
      gravity: planck.Vec2(gravity.x, gravity.y),
    });
  }

  /**
   * Create a ground plane
   * Note: In Planck.js, Box(halfWidth, halfHeight) creates a box with:
   * - Width = 2 * halfWidth
   * - Height = 2 * halfHeight
   * - Center at body position
   * 
   * To have the top surface at 'level':
   * - If box has halfHeight = 0.5, then full height = 1.0
   * - Top of box = centerY + 0.5
   * - To have top at level: centerY = level - 0.5
   */
  createGround(world: planck.World, level: number, width: number): planck.Body {
    console.log(`[PlanckAdapter] Creating ground at level=${level}, width=${width}`);
    
    // Position ground so its top surface is at 'level'
    // Box(halfWidth, halfHeight) with halfHeight=0.5 means full height is 1.0
    // Top of box = centerY + halfHeight = centerY + 0.5
    // To have top at 'level': centerY + 0.5 = level, so centerY = level - 0.5
    const groundCenterY = level - 0.5;
    // Center ground at world center (width/2) instead of X=0
    const groundCenterX = width / 2;
    const ground = world.createBody({
      type: 'static',
      position: planck.Vec2(groundCenterX, groundCenterY),
    });

    // Create a wide, thin box for the ground
    // Box(halfWidth, halfHeight) - so width/2 gives us full width
    const halfHeight = 0.5; // Full height will be 1.0
    const groundShape = planck.Box(width / 2, halfHeight);
    const fixture = ground.createFixture(groundShape, {
      density: 0.0,
      friction: GameConstants.GROUND_FRICTION,
      restitution: GameConstants.GROUND_RESTITUTION,
    });
    
    // Set collision filter: environment collides with bones
    fixture.setFilterData({
      groupIndex: 0,
      categoryBits: GameConstants.COLLISION_CATEGORY_ENVIRONMENT,
      maskBits: GameConstants.COLLISION_MASK_ENVIRONMENT,
    });
    
    // Verify fixture was created
    const fixtureCount = ground.getFixtureList() ? 1 : 0;
    const groundPos = ground.getPosition();
    const topY = groundPos.y + halfHeight;
    const bottomY = groundPos.y - halfHeight;
    
    console.log(`[PlanckAdapter] Ground created:`);
    console.log(`  - Center: (${groundPos.x.toFixed(2)}, ${groundPos.y.toFixed(2)})`);
    console.log(`  - Top surface: Y=${topY.toFixed(2)} (target: ${level})`);
    console.log(`  - Bottom surface: Y=${bottomY.toFixed(2)}`);
    console.log(`  - Width: ${width}, Height: ${halfHeight * 2}`);
    console.log(`  - Fixtures: ${fixtureCount}`);
    console.log(`  - Body type: ${ground.getType()}`);

    return ground;
  }

  /**
   * Create a wall (vertical or horizontal barrier)
   * @param world - Physics world
   * @param x - X position of wall center
   * @param y - Y position of wall center
   * @param width - Width of wall (for horizontal walls) or thickness (for vertical walls)
   * @param height - Height of wall (for vertical walls) or thickness (for horizontal walls)
   */
  createWall(
    world: planck.World,
    x: number,
    y: number,
    width: number,
    height: number
  ): planck.Body {
    const wall = world.createBody({
      type: 'static',
      position: planck.Vec2(x, y),
    });

    // Create a box for the wall
    // Box(halfWidth, halfHeight)
    const wallShape = planck.Box(width / 2, height / 2);
    const fixture = wall.createFixture(wallShape, {
      density: 0.0,
      friction: GameConstants.WALL_FRICTION,
      restitution: GameConstants.WALL_RESTITUTION,
    });
    
    // Set collision filter: environment collides with bones
    fixture.setFilterData({
      groupIndex: 0,
      categoryBits: GameConstants.COLLISION_CATEGORY_ENVIRONMENT,
      maskBits: GameConstants.COLLISION_MASK_ENVIRONMENT,
    });

    return wall;
  }

  /**
   * Create walls around the environment boundaries
   * @param world - Physics world
   * @param width - Environment width in meters
   * @param height - Environment height in meters
   * @param groundLevel - Y position of ground level
   * @param wallThickness - Thickness of walls (default 0.5m)
   */
  createWalls(
    world: planck.World,
    width: number,
    height: number,
    groundLevel: number,
    wallThickness: number = 0.5
  ): planck.Body[] {
    const walls: planck.Body[] = [];

    // Left wall: vertical wall at x = 0
    // Center at (wallThickness/2, groundLevel + height/2)
    const leftWallX = wallThickness / 2;
    const leftWallY = groundLevel + height / 2;
    const leftWall = this.createWall(world, leftWallX, leftWallY, wallThickness, height);
    walls.push(leftWall);

    // Right wall: vertical wall at x = width
    // Center at (width - wallThickness/2, groundLevel + height/2)
    const rightWallX = width - wallThickness / 2;
    const rightWallY = groundLevel + height / 2;
    const rightWall = this.createWall(world, rightWallX, rightWallY, wallThickness, height);
    walls.push(rightWall);

    // Top wall: horizontal wall at y = groundLevel + height
    // Center at (width/2, groundLevel + height - wallThickness/2)
    const topWallX = width / 2;
    const topWallY = groundLevel + height - wallThickness / 2;
    const topWall = this.createWall(world, topWallX, topWallY, width, wallThickness);
    walls.push(topWall);

    console.log(`[PlanckAdapter] Created ${walls.length} walls around environment (${width}m × ${height}m)`);

    return walls;
  }

  /**
   * Step the physics world
   * Planck.js step signature: step(dt, velocityIterations?, positionIterations?)
   * Default iterations: velocity=8, position=3 (Box2D standard)
   * Increased position iterations for better joint stability
   */
  step(world: planck.World, deltaTime: number): void {
    // Use standard Box2D/Planck.js iteration counts for stability
    // Higher iterations = more accurate but slower
    // Increased positionIterations from 3 to 10 for better joint constraint resolution
    const velocityIterations = 8;
    const positionIterations = 10; // Increased for better joint stability
    
    // Ensure deltaTime is reasonable (prevent large jumps)
    const clampedDeltaTime = Math.max(0, Math.min(deltaTime, 0.1));
    
    if (clampedDeltaTime > 0) {
      world.step(clampedDeltaTime, velocityIterations, positionIterations);
    }
  }

  /**
   * Destroy the physics world
   */
  destroyWorld(world: planck.World): void {
    // Planck.js doesn't have an explicit destroy method
    // Bodies and joints are cleaned up when world goes out of scope
    // This is a placeholder for any cleanup needed
  }
}

