/**
 * RandomController - Random action controller for non-trainable players
 */

import { PlayerController } from '../../MimicRL/controllers/PlayerController';
import { Action, ActionSpace } from '../../MimicRL/core/GameCore';

export class RandomController implements PlayerController {
  private actionSpaces: ActionSpace[];

  constructor(actionSpaces: ActionSpace[]) {
    this.actionSpaces = actionSpaces;
  }

  /**
   * Decide on a random action
   */
  decide(observation: number[]): Action {
    return this.actionSpaces.map((space) => {
      if (space.type === 'discrete') {
        return Math.random() < 0.5 ? 0 : 1;
      } else {
        // Continuous: random value in [-1, 1]
        return (Math.random() - 0.5) * 2;
      }
    });
  }
}

