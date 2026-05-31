import { EventBus } from './EventBus';
import { GameState } from './GameState';

export interface GameHandle {
  destroy: () => void;
}

let handle: GameHandle | null = null;

export async function initGame(container: HTMLElement): Promise<GameHandle> {
  if (handle) { handle.destroy(); handle = null; }

  const Phaser = (await import('phaser')).default;
  const { WorldMapScene }  = await import('../scenes/WorldMapScene');
  const { CutsceneScene }  = await import('../scenes/CutsceneScene');
  const { Mission1Scene }  = await import('../scenes/Mission1Scene');
  const { Mission2Scene }  = await import('../scenes/Mission2Scene');
  const { Mission3Scene }  = await import('../scenes/Mission3Scene');
  const { Mission4Scene }  = await import('../scenes/Mission4Scene');

  const W = container.clientWidth  || window.innerWidth;
  const H = container.clientHeight || window.innerHeight;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: W,
    height: H,
    backgroundColor: '#050810',
    scene: [WorldMapScene, CutsceneScene, Mission1Scene, Mission2Scene, Mission3Scene, Mission4Scene],
    physics: {
      default: 'matter',
      matter: { gravity: { x: 0, y: 0.4 }, debug: false },
    },
    render: { antialias: true, pixelArt: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    dom: { createContainer: false },
  });

  // Wire game:startmission → start Cutscene → mission
  const unsubStart = EventBus.on('game:startmission', ({ mission }) => {
    GameState.setCurrentMission(mission);
    game.scene.start('CutsceneScene', { index: 0, nextScene: `Mission${mission}Scene` });
  });

  const MAX_MISSIONS = 4;

  // Wire game:continue → next mission or world map if all done
  const unsubContinue = EventBus.on('game:continue', () => {
    const current = GameState.getCurrentMission();
    const next = current + 1;
    if (next <= MAX_MISSIONS) {
      GameState.setCurrentMission(next);
      game.scene.start(`Mission${next}Scene`);
    } else {
      game.scene.start('WorldMapScene');
    }
  });

  // Wire scene:worldmap → return to WorldMapScene (used from WorldMap district click flow)
  const unsubWorld = EventBus.on('scene:worldmap', () => {
    game.scene.start('WorldMapScene');
  });

  // Wire game:retry → restart current mission (skip cutscene)
  const unsubRetry = EventBus.on('game:retry', () => {
    const mission = GameState.getCurrentMission();
    if (mission > 0) {
      game.scene.start(`Mission${mission}Scene`);
    } else {
      game.scene.start('WorldMapScene');
    }
  });

  handle = {
    destroy: () => {
      unsubStart();
      unsubContinue();
      unsubWorld();
      unsubRetry();
      game.destroy(true);
      handle = null;
    },
  };
  return handle;
}
