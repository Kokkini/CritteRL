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
    this.environmentRenderer.renderEnvironment(env, dummyTarget, 'running');

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

        // Get running direction for visualization
        const aquariumEnv = gameCore.taskEnvironment as any;
        const runningDirection = aquariumEnv.getRunningDirection?.() || { x: 1, y: 0 };
        
        // Calculate creature center for direction arrow
        const jointPositions = creaturePhysics.getJointPositions();
        if (jointPositions.length > 0) {
          const sum = jointPositions.reduce((acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }), { x: 0, y: 0 });
          const creatureCenter = { x: sum.x / jointPositions.length, y: sum.y / jointPositions.length };
          
          // Render direction arrow (pass viewport and ctx)
          const viewport = this.canvasRenderer.getViewport();
          if (viewport) {
            this.environmentRenderer.renderRunningDirection(runningDirection, creatureCenter, viewport, ctx);
          }
        }

        // Render creature (no actions passed - will use default coloring)
        this.creatureRenderer.render(creature, creaturePhysics, state);
      } catch (error) {
        console.error(`[AquariumRenderer] Error rendering creature ${id}:`, error);
      }
    }
  }
}

