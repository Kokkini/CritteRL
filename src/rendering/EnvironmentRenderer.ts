/**
 * EnvironmentRenderer - Renders environment elements (ground, target waypoint, boundaries)
 */

import { CanvasRenderer } from './CanvasRenderer';
import { EnvironmentConfig, Position } from '../utils/types';

export class EnvironmentRenderer {
  private renderer: CanvasRenderer;

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer;
  }

  /**
   * Render environment
   */
  renderEnvironment(
    environment: EnvironmentConfig,
    target: Position
  ): void {
    // Render grid first (background)
    this.renderGrid(environment.width, environment.height, environment.groundLevel);
    // Then render other elements
    this.renderGround(environment.groundLevel, environment.width);
    this.renderWalls(environment.groundLevel, environment.width, environment.height);
    this.renderTarget(target, 0.5); // 0.5 meter radius
    this.renderBoundaries(environment.width, environment.height);
  }

  /**
   * Render grid with 1-meter ticks
   * @param width - Environment width in meters
   * @param height - Environment height in meters
   * @param groundLevel - Y position of ground level in meters
   */
  renderGrid(width: number, height: number, groundLevel: number): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available for grid rendering');
      return;
    }

    ctx.strokeStyle = '#606060'; // Gray
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]); // Dashed lines

    // Draw vertical lines (every 1 meter)
    const startX = 0;
    const endX = width;
    const startY = groundLevel;
    const endY = groundLevel + height;

    // Convert world coordinates to screen
    const startScreenX = viewport.worldToScreenX(startX);
    const endScreenX = viewport.worldToScreenX(endX);
    const startScreenY = viewport.worldToScreenY(startY);
    const endScreenY = viewport.worldToScreenY(endY);

    // Vertical lines
    for (let x = 0; x <= width; x += 1.0) {
      const screenX = viewport.worldToScreenX(x);
      ctx.beginPath();
      ctx.moveTo(screenX, startScreenY);
      ctx.lineTo(screenX, endScreenY);
      ctx.stroke();
    }

    // Horizontal lines (every 1 meter)
    for (let y = groundLevel; y <= groundLevel + height; y += 1.0) {
      const screenY = viewport.worldToScreenY(y);
      ctx.beginPath();
      ctx.moveTo(startScreenX, screenY);
      ctx.lineTo(endScreenX, screenY);
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash
  }

  /**
   * Render ground plane
   * width and groundLevel are in meters (world units)
   */
  renderGround(groundLevel: number, width: number): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available, using fallback rendering');
      return;
    }

    // Get ground body position from physics (if available)
    // Ground is centered at (width/2, groundLevel - 0.5)
    const groundCenterX = width / 2;
    const groundCenterY = groundLevel - 0.5;
    const groundThickness = 0.5; // 0.5 meters thick

    // Convert to screen coordinates
    const groundScreenX = viewport.worldToScreenX(groundCenterX);
    const groundScreenY = viewport.worldToScreenY(groundCenterY);
    const groundWidthPx = viewport.worldToScreenDistance(width);
    const groundThicknessPx = viewport.worldToScreenDistance(groundThickness);

    ctx.fillStyle = '#8B4513'; // Brown ground
    ctx.fillRect(
      groundScreenX - groundWidthPx / 2,
      groundScreenY - groundThicknessPx / 2,
      groundWidthPx,
      groundThicknessPx
    );

    // Draw ground line (top surface)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const groundTopY = viewport.worldToScreenY(groundLevel);
    ctx.moveTo(groundScreenX - groundWidthPx / 2, groundTopY);
    ctx.lineTo(groundScreenX + groundWidthPx / 2, groundTopY);
    ctx.stroke();
  }

  /**
   * Render target waypoint
   * position and radius are in meters (world units)
   */
  renderTarget(position: Position, radius: number): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available, using fallback rendering');
      return;
    }

    // Convert world coordinates to screen coordinates
    const targetScreenX = viewport.worldToScreenX(position.x);
    const targetScreenY = viewport.worldToScreenY(position.y);
    const radiusPx = viewport.worldToScreenDistance(radius);

    // Draw target circle
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetScreenX, targetScreenY, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw target marker (cross)
    const markerSize = radiusPx * 0.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetScreenX - markerSize, targetScreenY);
    ctx.lineTo(targetScreenX + markerSize, targetScreenY);
    ctx.moveTo(targetScreenX, targetScreenY - markerSize);
    ctx.lineTo(targetScreenX, targetScreenY + markerSize);
    ctx.stroke();
  }

  /**
   * Render environment boundaries
   * width and height are in meters (world units)
   */
  renderBoundaries(width: number, height: number): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available, skipping boundaries');
      return;
    }

    // Convert world boundaries to screen coordinates
    const leftX = viewport.worldToScreenX(0);
    const rightX = viewport.worldToScreenX(width);
    const bottomY = viewport.worldToScreenY(0);
    const topY = viewport.worldToScreenY(height);

    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Draw boundaries
    ctx.beginPath();
    // Left boundary
    ctx.moveTo(leftX, bottomY);
    ctx.lineTo(leftX, topY);
    // Right boundary
    ctx.moveTo(rightX, bottomY);
    ctx.lineTo(rightX, topY);
    // Top boundary
    ctx.moveTo(leftX, topY);
    ctx.lineTo(rightX, topY);
    // Bottom boundary
    ctx.moveTo(leftX, bottomY);
    ctx.lineTo(rightX, bottomY);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Render walls around environment boundaries
   * @param groundLevel - Y position of ground level in meters
   * @param width - Environment width in meters
   * @param height - Environment height in meters
   * @param wallThickness - Thickness of walls in meters (default 0.5m)
   */
  renderWalls(
    groundLevel: number,
    width: number,
    height: number,
    wallThickness: number = 0.5
  ): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available for wall rendering');
      return;
    }

    ctx.fillStyle = '#8B4513'; // Brown (same as ground)
    ctx.strokeStyle = '#654321'; // Darker brown for borders
    ctx.lineWidth = 2;

    // Left wall: at x = 0, extends from groundLevel to groundLevel + height
    const leftWallX = 0;
    const leftWallScreenX = viewport.worldToScreenX(leftWallX);
    const leftWallScreenY = viewport.worldToScreenY(groundLevel);
    const leftWallHeightPx = viewport.worldToScreenDistance(height);
    const leftWallThicknessPx = viewport.worldToScreenDistance(wallThickness);
    ctx.fillRect(
      leftWallScreenX - leftWallThicknessPx / 2,
      leftWallScreenY - leftWallHeightPx,
      leftWallThicknessPx,
      leftWallHeightPx
    );
    ctx.strokeRect(
      leftWallScreenX - leftWallThicknessPx / 2,
      leftWallScreenY - leftWallHeightPx,
      leftWallThicknessPx,
      leftWallHeightPx
    );

    // Right wall: at x = width, extends from groundLevel to groundLevel + height
    const rightWallX = width;
    const rightWallScreenX = viewport.worldToScreenX(rightWallX);
    const rightWallScreenY = viewport.worldToScreenY(groundLevel);
    const rightWallHeightPx = viewport.worldToScreenDistance(height);
    const rightWallThicknessPx = viewport.worldToScreenDistance(wallThickness);
    ctx.fillRect(
      rightWallScreenX - rightWallThicknessPx / 2,
      rightWallScreenY - rightWallHeightPx,
      rightWallThicknessPx,
      rightWallHeightPx
    );
    ctx.strokeRect(
      rightWallScreenX - rightWallThicknessPx / 2,
      rightWallScreenY - rightWallHeightPx,
      rightWallThicknessPx,
      rightWallHeightPx
    );

    // Top wall: at y = groundLevel + height, extends from x = 0 to x = width
    const topWallY = groundLevel + height;
    const topWallScreenX = viewport.worldToScreenX(0);
    const topWallScreenY = viewport.worldToScreenY(topWallY);
    const topWallWidthPx = viewport.worldToScreenDistance(width);
    const topWallThicknessPx = viewport.worldToScreenDistance(wallThickness);
    ctx.fillRect(
      topWallScreenX,
      topWallScreenY - topWallThicknessPx / 2,
      topWallWidthPx,
      topWallThicknessPx
    );
    ctx.strokeRect(
      topWallScreenX,
      topWallScreenY - topWallThicknessPx / 2,
      topWallWidthPx,
      topWallThicknessPx
    );
  }
}

