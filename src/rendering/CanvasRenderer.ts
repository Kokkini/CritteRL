/**
 * CanvasRenderer - HTML5 Canvas rendering management
 */

import { Viewport } from './Viewport';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private _width: number;
  private _height: number;
  private viewport: Viewport | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.context = ctx;
    this._width = canvas.width;
    this._height = canvas.height;
  }

  /**
   * Initialize the renderer
   */
  initialize(): void {
    // Set up canvas defaults
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.context.clearRect(0, 0, this._width, this._height);
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    // Re-initialize after resize
    this.initialize();
    // Update viewport if it exists
    if (this.viewport) {
      this.viewport.resize(width, height);
    }
  }

  /**
   * Set viewport for coordinate transformation
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }

  /**
   * Get viewport
   */
  getViewport(): Viewport | null {
    return this.viewport;
  }

  /**
   * Get the canvas rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  /**
   * Get canvas width
   */
  get width(): number {
    return this._width;
  }

  /**
   * Get canvas height
   */
  get height(): number {
    return this._height;
  }

  /**
   * Convert physics Y coordinate to screen Y coordinate
   * Uses viewport if available, otherwise falls back to simple conversion
   */
  physicsToScreenY(physicsY: number): number {
    if (this.viewport) {
      return this.viewport.worldToScreenY(physicsY);
    }
    // Fallback: simple conversion (legacy)
    return this._height - physicsY;
  }

  /**
   * Convert world X coordinate to screen X coordinate
   */
  worldToScreenX(worldX: number): number {
    if (this.viewport) {
      return this.viewport.worldToScreenX(worldX);
    }
    // Fallback: direct mapping
    return worldX;
  }

  /**
   * Convert world Y coordinate to screen Y coordinate
   */
  worldToScreenY(worldY: number): number {
    if (this.viewport) {
      return this.viewport.worldToScreenY(worldY);
    }
    // Fallback: simple conversion
    return this._height - worldY;
  }

  /**
   * Convert world distance to screen distance
   */
  worldToScreenDistance(worldDistance: number): number {
    if (this.viewport) {
      return this.viewport.worldToScreenDistance(worldDistance);
    }
    // Fallback: direct mapping
    return worldDistance;
  }

  /**
   * Convert screen Y coordinate to physics Y coordinate
   */
  screenToPhysicsY(screenY: number): number {
    if (this.viewport) {
      return this.viewport.screenToWorldY(screenY);
    }
    // Fallback: simple conversion
    return this._height - screenY;
  }

  /**
   * Destroy the renderer (cleanup)
   */
  destroy(): void {
    // Clear canvas
    this.clear();
    // Context will be cleaned up when canvas is removed from DOM
  }
}

