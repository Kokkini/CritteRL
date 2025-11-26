/**
 * AquariumRenderer - Renders multiple creatures in aquarium
 */

import { CanvasRenderer } from './CanvasRenderer';
import { CreatureRenderer } from './CreatureRenderer';
import { EnvironmentRenderer } from './EnvironmentRenderer';
import { AquariumState, AquariumCreature, FoodBall, Position } from '../utils/types';
import { CreaturePhysics } from '../physics/CreaturePhysics';
import { CreatureState } from '../utils/types';
import { Creature } from '../game/Creature';

export class AquariumRenderer {
  private canvasRenderer: CanvasRenderer;
  private creatureRenderer: CreatureRenderer;
  private environmentRenderer: EnvironmentRenderer;

  constructor(canvasRenderer: CanvasRenderer) {
    this.canvasRenderer = canvasRenderer;
    this.creatureRenderer = new CreatureRenderer(canvasRenderer);
    this.environmentRenderer = new EnvironmentRenderer(canvasRenderer);
  }

  /**
   * Render aquarium with all creatures
   */
  renderAquarium(
    aquariumState: AquariumState,
    creatureInstances: Map<
      string,
      {
        gameCore: any;
        creatureDesign: any;
        aquariumCreature: AquariumCreature;
      }
    >,
    foodBalls: FoodBall[] = []
  ): void {
    const ctx = this.canvasRenderer.getContext();
    
    // Clear canvas
    this.canvasRenderer.clear();

    // Always render environment (ground, grid, boundaries) - even if no creatures
    const env = aquariumState.environment;
    // No target for aquarium, but we need a dummy position for renderEnvironment
    const dummyTarget = { x: 0, y: 0 };
    // Do not show numeric axis labels in aquarium view
    this.environmentRenderer.renderEnvironment(env, dummyTarget, 'running', undefined, undefined, false);

    // Render food balls (if any)
    if (foodBalls.length > 0) {
      this.environmentRenderer.renderFoodBalls(foodBalls);
    }

    // Render each creature
    for (const [id, instance] of creatureInstances) {
      const gameCore = instance.gameCore;
      const creaturePhysics = gameCore.creaturePhysics;
      
      if (!creaturePhysics) {
        continue;
      }

      try {
        // Get creature state
        const state = gameCore.physicsWorld.getCreatureState(creaturePhysics);
        const creature = new Creature(instance.creatureDesign);

        // Render creature (no actions passed - will use default coloring)
        this.creatureRenderer.render(creature, creaturePhysics, state);

        // Render food-eaten count near creature
        const jointPositions = creaturePhysics.getJointPositions();
        if (jointPositions.length > 0) {
          const center = this.computeCenter(jointPositions);
          this.renderFoodEatenLabel(center, instance.aquariumCreature.foodEaten || 0);
        }
      } catch (error) {
        console.error(`[AquariumRenderer] Error rendering creature ${id}:`, error);
      }
    }
  }

  private computeCenter(positions: Position[]): Position {
    let sumX = 0;
    let sumY = 0;
    for (const p of positions) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / positions.length, y: sumY / positions.length };
  }

  private renderFoodEatenLabel(center: Position, count: number): void {
    const viewport = this.canvasRenderer.getViewport();
    if (!viewport) return;

    const ctx = this.canvasRenderer.getContext();
    const screenX = viewport.worldToScreenX(center.x);
    const screenY = viewport.worldToScreenY(center.y + 2); // a bit above creature center

    const text = `🍎${count}`;

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, screenX, screenY);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, screenX, screenY);
  }
}

