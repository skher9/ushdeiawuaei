import type { SoundState } from './EventBus';
import { EventBus } from './EventBus';

type ToneType = typeof import('tone');

let Tone: ToneType | null = null;
let initialized = false;

// Global transport & instruments
let masterVol: InstanceType<ToneType['Volume']>;
let pad: InstanceType<ToneType['PolySynth']>;
let bass: InstanceType<ToneType['Synth']>;
let kick: InstanceType<ToneType['MembraneSynth']>;
let snare: InstanceType<ToneType['NoiseSynth']>;
let lead: InstanceType<ToneType['Synth']>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let padPattern: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let drumSeq: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let leadSeq: any;
let currentState: SoundState = 'IDLE';

export async function initAudio(): Promise<void> {
  if (initialized) return;
  Tone = await import('tone');
  await Tone.start();
  initialized = true;

  masterVol = new Tone.Volume(-6).toDestination();

  // Pad synth (ambient layer)
  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2.0 },
    volume: -18,
  }).connect(new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(masterVol));

  // Bass synth
  bass = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.5 },
    volume: -20,
  }).connect(masterVol);

  // Kick
  kick = new Tone.MembraneSynth({ volume: -14 }).connect(masterVol);

  // Snare
  snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
    volume: -16,
  }).connect(masterVol);

  // Lead
  lead = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
    volume: -22,
  }).connect(new Tone.Filter(2000, 'lowpass').connect(
    new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0.2 }).connect(masterVol)
  ));

  // Ambient pad pattern (Am7)
  const AM7 = ['A3', 'C4', 'E4', 'G4'];
  let padIdx = 0;
  padPattern = new Tone.Pattern(
    (time, note) => { pad.triggerAttackRelease(note as string, '2n', time); },
    AM7, 'up'
  );
  padPattern.interval = '2n';

  // Drum sequence
  const drumPat = [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  const snarePat = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  drumSeq = new Tone.Sequence(
    (time, v) => { if (v) kick.triggerAttackRelease('C1', '8n', time); },
    drumPat, '16n'
  );
  const snareSeq = new Tone.Sequence(
    (time, v) => { if (v) snare.triggerAttackRelease('16n', time); },
    snarePat, '16n'
  );

  // Lead sequence (pentatonic run)
  const PENTA = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5'];
  leadSeq = new Tone.Sequence(
    (time, note) => { lead.triggerAttackRelease(note as string, '8n', time); },
    PENTA, '8n'
  );

  Tone.Transport.bpm.value = 60;
  Tone.Transport.start();
  try { padPattern.start(); } catch { /* ignore */ }

  setState('AMBIENT');
}

export function setState(state: SoundState): void {
  if (!Tone || !initialized) return;
  if (state === currentState) return;
  currentState = state;

  switch (state) {
    case 'AMBIENT':
      Tone.Transport.bpm.rampTo(60, 2);
      try { padPattern?.start(); } catch { /* already running */ }
      drumSeq?.stop();
      leadSeq?.stop();
      masterVol.volume.rampTo(-6, 1);
      break;

    case 'SCANNING':
      Tone.Transport.bpm.rampTo(80, 1.5);
      try { padPattern?.start(); } catch { /* already running */ }
      try { leadSeq?.start(); } catch { /* already running */ }
      drumSeq?.stop();
      masterVol.volume.rampTo(-4, 0.5);
      break;

    case 'TENSION':
      Tone.Transport.bpm.rampTo(110, 1);
      try { drumSeq?.start(); } catch { /* already running */ }
      try { leadSeq?.start(); } catch { /* already running */ }
      masterVol.volume.rampTo(-2, 0.3);
      break;

    case 'CRITICAL':
      Tone.Transport.bpm.rampTo(140, 0.5);
      try { drumSeq?.start(); } catch { /* already running */ }
      try { leadSeq?.start(); } catch { /* already running */ }
      masterVol.volume.rampTo(0, 0.2);
      break;

    case 'VICTORY':
      drumSeq?.stop();
      leadSeq?.stop();
      Tone.Transport.bpm.rampTo(120, 0.1);
      // Victory chord stab
      const now = Tone.now();
      pad.triggerAttackRelease(['A4', 'C5', 'E5', 'G5'], '2n', now);
      pad.triggerAttackRelease(['C5', 'E5', 'G5', 'B5'], '2n', now + 0.5);
      pad.triggerAttackRelease(['E5', 'G5', 'B5', 'D6'], '1n', now + 1);
      masterVol.volume.rampTo(0, 0.1);
      break;

    case 'DEATH':
      drumSeq?.stop();
      leadSeq?.stop();
      padPattern?.stop();
      masterVol.volume.rampTo(-60, 0.3);
      setTimeout(() => {
        if (Tone && initialized) {
          masterVol.volume.rampTo(-12, 0.5);
          Tone.Transport.bpm.value = 60;
          try { padPattern?.start(); } catch { /* ignore */ }
          currentState = 'IDLE'; // allow setState to run
          setState('AMBIENT');
        }
      }, 2000);
      break;

    case 'IDLE':
      masterVol.volume.rampTo(-60, 1);
      break;
  }
}

export function playEffect(name: string): void {
  if (!Tone || !initialized) return;
  const now = Tone.now();

  switch (name) {
    case 'beam_fire': {
      const s = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }, volume: -10 }).toDestination();
      s.triggerAttackRelease(800, 0.08, now);
      s.frequency.rampTo(1400, 0.08);
      setTimeout(() => s.dispose(), 500);
      break;
    }
    case 'explosion_small': {
      const n = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, volume: -8 }).toDestination();
      const m = new Tone.MembraneSynth({ volume: -6 }).toDestination();
      n.triggerAttackRelease('16n', now);
      m.triggerAttackRelease('G1', '8n', now);
      setTimeout(() => { n.dispose(); m.dispose(); }, 800);
      break;
    }
    case 'explosion_large': {
      const n = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.01, decay: 1.0, sustain: 0.1, release: 0.5 }, volume: -4 }).connect(new Tone.Reverb({ decay: 3, wet: 0.6 }).toDestination());
      const m = new Tone.MembraneSynth({ volume: -4 }).toDestination();
      n.triggerAttackRelease('4n', now);
      m.triggerAttackRelease('C1', '4n', now);
      setTimeout(() => { n.dispose(); m.dispose(); }, 3000);
      break;
    }
    case 'error_buzz': {
      const s = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.1 }, volume: -8 }).toDestination();
      s.triggerAttackRelease('Bb3', 0.15, now);
      s.triggerAttackRelease('Ab3', 0.15, now + 0.15);
      s.triggerAttackRelease('F3', 0.3, now + 0.3);
      setTimeout(() => s.dispose(), 1000);
      break;
    }
    case 'door_open': {
      const s = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.4 }, volume: -10 }).toDestination();
      s.triggerAttackRelease('D4', 0.4, now);
      s.frequency.rampTo(880, 0.4);
      setTimeout(() => s.dispose(), 1000);
      break;
    }
    case 'crowd_roar': {
      const n = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.5, decay: 0, sustain: 1.0, release: 1.0 }, volume: -12 }).connect(new Tone.Filter(800, 'lowpass').toDestination());
      n.triggerAttack(now);
      setTimeout(() => { n.triggerRelease(); setTimeout(() => n.dispose(), 1500); }, 1500);
      break;
    }
    case 'drone_buzz': {
      const s = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0, sustain: 1.0, release: 0.5 }, volume: -16 }).connect(new Tone.Vibrato({ frequency: 8, depth: 0.3, wet: 0.8 }).toDestination());
      s.triggerAttack('Bb2', now);
      setTimeout(() => { s.triggerRelease(); setTimeout(() => s.dispose(), 1000); }, 1000);
      break;
    }
    case 'damage': {
      const s = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }, volume: -6 }).toDestination();
      s.triggerAttackRelease('C3', 0.1, now);
      s.triggerAttackRelease('A2', 0.1, now + 0.1);
      setTimeout(() => s.dispose(), 600);
      break;
    }
    case 'victory_sting': {
      const s = new Tone.PolySynth(Tone.Synth, { volume: -8 }).toDestination();
      s.triggerAttackRelease(['E5', 'G5', 'B5'], '4n', now);
      s.triggerAttackRelease(['F5', 'A5', 'C6'], '4n', now + 0.2);
      s.triggerAttackRelease(['G5', 'B5', 'D6'], '2n', now + 0.4);
      setTimeout(() => s.dispose(), 2000);
      break;
    }
  }
}

export function tempoForTimer(secondsLeft: number, total: number): void {
  if (!Tone || !initialized) return;
  const ratio = secondsLeft / total;
  if (ratio > 0.5) return;
  const bpm = 80 + Math.round((1 - ratio) * 60);
  Tone.Transport.bpm.rampTo(Math.min(bpm, 140), 2);
}

let soundUnsubs: (() => void)[] = [];

export async function initSound(): Promise<{ destroy: () => void }> {
  await initAudio();

  soundUnsubs = [
    EventBus.on('sound:state', ({ state }) => setState(state as SoundState)),
    EventBus.on('sound:effect', ({ name }) => playEffect(name as Parameters<typeof playEffect>[0])),
  ];

  return {
    destroy: () => {
      soundUnsubs.forEach(u => u());
      soundUnsubs = [];
      if (Tone && initialized) {
        masterVol?.volume.rampTo(-60, 0.3);
        setTimeout(() => {
          try { Tone!.Transport.stop(); } catch { /* ignore */ }
        }, 400);
      }
      initialized = false;
      Tone = null;
    },
  };
}

export function destroySound(): void {
  soundUnsubs.forEach(u => u());
  soundUnsubs = [];
}
