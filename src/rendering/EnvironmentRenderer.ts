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
    target: Position,
    taskType?: 'reach_target' | 'running',
    runningDirection?: { x: number; y: number },
    creatureCenter?: Position
  ): void {
    // Render grid first (background)
    this.renderGrid(environment.width, environment.height, environment.groundLevel);
    // Then render other elements
    this.renderGround(environment.groundLevel, environment.width);
    // Walls removed - not rendering walls
    
    // Render task-specific elements
    if (taskType === 'running' && runningDirection) {
      // Don't render target for running task
      // Render running direction arrow
      if (creatureCenter) {
        this.renderRunningDirection(runningDirection, creatureCenter);
      }
    } else {
      // Render target for reach_target task
    this.renderTarget(target, 0.5); // 0.5 meter radius
    }
    
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

    // Draw number markers along axes
    const canvasWidth = this.renderer.width;
    const canvasHeight = this.renderer.height;
    
    ctx.fillStyle = '#FFFFFF'; // White text for better visibility
    ctx.strokeStyle = '#000000'; // Black outline
    ctx.lineWidth = 2;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // X-axis markers (along bottom, at ground level)
    for (let x = 0; x <= width; x += 1.0) {
      const screenX = viewport.worldToScreenX(x);
      const screenY = viewport.worldToScreenY(groundLevel);
      
      // Only draw if within canvas bounds
      if (screenX >= 0 && screenX <= canvasWidth) {
        // Draw number slightly below ground line, but ensure it's within canvas
        const textY = Math.min(screenY + 15, canvasHeight - 5);
        const text = Math.round(x).toString();
        
        // Draw text with outline for visibility
        ctx.strokeText(text, screenX, textY);
        ctx.fillText(text, screenX, textY);
      }
    }

    // Y-axis markers (along left edge)
    ctx.textAlign = 'right';
    for (let y = groundLevel; y <= groundLevel + height; y += 1.0) {
      const screenX = viewport.worldToScreenX(0);
      const screenY = viewport.worldToScreenY(y);
      
      // Only draw if within canvas bounds
      if (screenY >= 0 && screenY <= canvasHeight) {
        // Draw number slightly to the left of the left edge, but ensure it's within canvas
        const textX = Math.max(screenX - 10, 30); // At least 30px from left edge
        const text = Math.round(y).toString();
        
        // Draw text with outline for visibility
        ctx.strokeText(text, textX, screenY);
        ctx.fillText(text, textX, screenY);
      }
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
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

  /**
   * Render running direction arrow
   * @param direction - Unit vector (x, y) for running direction
   * @param centerPosition - Center position of creature (where to draw arrow)
   */
  renderRunningDirection(
    direction: { x: number; y: number },
    centerPosition: Position
  ): void {
    const ctx = this.renderer.getContext();
    const viewport = this.renderer.getViewport();
    
    if (!viewport) {
      console.warn('[EnvironmentRenderer] No viewport available for direction arrow');
      return;
    }

    // Convert world coordinates to screen coordinates
    const centerScreenX = viewport.worldToScreenX(centerPosition.x);
    const centerScreenY = viewport.worldToScreenY(centerPosition.y);

    // Arrow parameters
    const arrowLength = 2.0; // 2 meters in world units
    const arrowHeadSize = 0.5; // 0.5 meters
    const arrowOffsetY = 1.5; // 1.5 meters above creature center

    // Calculate arrow end position
    const arrowEndX = centerPosition.x + direction.x * arrowLength;
    const arrowEndY = centerPosition.y + direction.y * arrowLength + arrowOffsetY;
    const arrowEndScreenX = viewport.worldToScreenX(arrowEndX);
    const arrowEndScreenY = viewport.worldToScreenY(arrowEndY);

    // Arrow start position (above creature)
    const arrowStartY = centerPosition.y + arrowOffsetY;
    const arrowStartScreenX = centerScreenX;
    const arrowStartScreenY = viewport.worldToScreenY(arrowStartY);

    // Color based on direction (green for positive X, red for negative X)
    const arrowColor = direction.x > 0 ? '#00FF00' : '#FF0000';

    // Draw arrow line
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arrowStartScreenX, arrowStartScreenY);
    ctx.lineTo(arrowEndScreenX, arrowEndScreenY);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(direction.y, direction.x);
    const headSizePx = viewport.worldToScreenDistance(arrowHeadSize);
    
    ctx.beginPath();
    ctx.moveTo(arrowEndScreenX, arrowEndScreenY);
    ctx.lineTo(
      arrowEndScreenX - headSizePx * Math.cos(angle - Math.PI / 6),
      arrowEndScreenY - headSizePx * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEndScreenX - headSizePx * Math.cos(angle + Math.PI / 6),
      arrowEndScreenY - headSizePx * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Draw direction label
    ctx.fillStyle = arrowColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const labelY = arrowStartScreenY - 10;
    const labelText = direction.x > 0 ? '→' : '←';
    ctx.strokeText(labelText, arrowStartScreenX, labelY);
    ctx.fillText(labelText, arrowStartScreenX, labelY);
  }
}

