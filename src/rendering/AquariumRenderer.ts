/**
 * AquariumRenderer - Renders multiple creatures in aquarium
 */

import { CanvasRenderer } from './CanvasRenderer';
import { CreatureRenderer } from './CreatureRenderer';
import { EnvironmentRenderer } from './EnvironmentRenderer';
import { AquariumState } from '../utils/types';
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
    creatureInstances: Map<string, {
      gameCore: any;
      creatureDesign: any;
    }>
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
      } catch (error) {
        console.error(`[AquariumRenderer] Error rendering creature ${id}:`, error);
      }
    }
  }
}

