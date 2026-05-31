export type ParticleType =
  | 'EXPLOSION_DATA'
  | 'EXPLOSION_CORRUPT'
  | 'SPARKS'
  | 'OOZE_SPREAD'
  | 'CROWD_CONFETTI'
  | 'GOLD_BURST'
  | 'DATA_STREAM';

export type SoundState = 'IDLE' | 'AMBIENT' | 'SCANNING' | 'TENSION' | 'CRITICAL' | 'VICTORY' | 'DEATH';
export type SoundEffect =
  | 'beam_fire' | 'explosion_small' | 'explosion_large'
  | 'error_buzz' | 'door_open' | 'crowd_roar'
  | 'drone_buzz' | 'victory_sting' | 'damage';

interface EventMap {
  'reaction:burst':    { x: number; y: number; text: string; color?: string };
  'reaction:slide':    { text: string; color?: string };
  'reaction:danger':   { text: string };
  'reaction:insight':  { text: string };
  'reaction:combo':    { text?: string; multiplier?: number; count?: number };
  'scene:stats': {
    mission: number; checks: number; optimal: number;
    title?: string; insight: string[];
    timeLeft?: number;
    extra?: Record<string, string | number>;
  };
  'scene:death': { mission: number };
  'scene:cutscene': { index: number };
  'scene:worldmap':    undefined;
  'overlay:clear':     undefined;
  'particle:explosion': { x: number; y: number; type: ParticleType; intensity: number };
  'particle:continuous': { x: number; y: number; type: ParticleType; duration: number };
  'sound:state':  { state: SoundState };
  'sound:effect': { name: SoundEffect | string };
  'game:retry':         undefined;
  'game:continue':      undefined;
  'game:startmission':  { mission: number };
  'game:skipCutscene':  undefined;
  'audio:init':         undefined;
}

type K = keyof EventMap;

class Bus {
  private map = new Map<K, Set<(d: unknown) => void>>();

  on<E extends K>(event: E, cb: (d: EventMap[E]) => void): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    const fn = cb as (d: unknown) => void;
    this.map.get(event)!.add(fn);
    return () => this.map.get(event)?.delete(fn);
  }

  emit<E extends K>(event: E, data?: EventMap[E]): void {
    this.map.get(event)?.forEach(fn => fn(data));
  }
}

export const EventBus = new Bus();
