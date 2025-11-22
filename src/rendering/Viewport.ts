/**
 * Viewport - Handles coordinate transformation between world units and screen pixels
 * World coordinates: meters (physics units)
 * Screen coordinates: pixels (canvas units)
 */

export class Viewport {
  private canvasWidth: number;
  private canvasHeight: number;
  private worldWidth: number; // World width in meters
  private worldHeight: number; // World height in meters
  private pixelsPerMeter: number;

  constructor(canvasWidth: number, canvasHeight: number, worldWidth: number, worldHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    // Calculate pixels per meter (scale to fit world in canvas)
    const scaleX = canvasWidth / worldWidth;
    const scaleY = canvasHeight / worldHeight;
    this.pixelsPerMeter = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions
  }

  /**
   * Convert world X coordinate to screen X coordinate
   */
  worldToScreenX(worldX: number): number {
    // Center world at canvas center
    const worldCenterX = this.worldWidth / 2;
    const offsetX = worldX - worldCenterX;
    return this.canvasWidth / 2 + offsetX * this.pixelsPerMeter;
  }

  /**
   * Convert world Y coordinate to screen Y coordinate
   * Physics: Y=0 at bottom, Y increases upward
   * Screen: Y=0 at top, Y increases downward
   */
  worldToScreenY(worldY: number): number {
    // Center world at canvas center
    const worldCenterY = this.worldHeight / 2;
    const offsetY = worldY - worldCenterY;
    // Flip Y axis (physics Y up = screen Y down)
    return this.canvasHeight / 2 - offsetY * this.pixelsPerMeter;
  }

  /**
   * Convert screen X coordinate to world X coordinate
   */
  screenToWorldX(screenX: number): number {
    const worldCenterX = this.worldWidth / 2;
    const offsetX = (screenX - this.canvasWidth / 2) / this.pixelsPerMeter;
    return worldCenterX + offsetX;
  }

  /**
   * Convert screen Y coordinate to world Y coordinate
   */
  screenToWorldY(screenY: number): number {
    const worldCenterY = this.worldHeight / 2;
    const offsetY = (this.canvasHeight / 2 - screenY) / this.pixelsPerMeter;
    return worldCenterY + offsetY;
  }

  /**
   * Convert world distance to screen distance (pixels)
   */
  worldToScreenDistance(worldDistance: number): number {
    return worldDistance * this.pixelsPerMeter;
  }

  /**
   * Convert screen distance to world distance (meters)
   */
  screenToWorldDistance(screenDistance: number): number {
    return screenDistance / this.pixelsPerMeter;
  }

  /**
   * Get pixels per meter ratio
   */
  getPixelsPerMeter(): number {
    return this.pixelsPerMeter;
  }

  /**
   * Update canvas size (call when canvas is resized)
   */
  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Recalculate pixels per meter
    const scaleX = canvasWidth / this.worldWidth;
    const scaleY = canvasHeight / this.worldHeight;
    this.pixelsPerMeter = Math.min(scaleX, scaleY);
  }

  /**
   * Get world dimensions
   */
  getWorldWidth(): number {
    return this.worldWidth;
  }

  getWorldHeight(): number {
    return this.worldHeight;
  }

  /**
   * Get canvas dimensions
   */
  getCanvasWidth(): number {
    return this.canvasWidth;
  }

  getCanvasHeight(): number {
    return this.canvasHeight;
  }
}

