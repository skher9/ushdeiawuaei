// Lightweight Tone.js wrapper for binary search games. Fails silently.

type SoundType = 'click' | 'correct' | 'wrong' | 'solve' | 'danger' | 'beep' | 'alarm';

let _muted = false;

export function setMuted(muted: boolean) { _muted = muted; }
export function isMuted() { return _muted; }

export async function playSound(type: SoundType) {
  if (_muted || typeof window === 'undefined') return;
  try {
    const Tone = await import('tone');
    await (Tone as unknown as { start?: () => Promise<void> }).start?.();

    switch (type) {
      case 'click': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
        }).toDestination();
        s.volume.value = -22;
        s.triggerAttackRelease('C4', '32n');
        setTimeout(() => s.dispose(), 400);
        break;
      }
      case 'beep': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.06 },
        }).toDestination();
        s.volume.value = -20;
        s.triggerAttackRelease('A4', '32n');
        setTimeout(() => s.dispose(), 400);
        break;
      }
      case 'correct': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.2 },
        }).toDestination();
        s.volume.value = -14;
        s.triggerAttackRelease('E5', '8n');
        setTimeout(() => s.dispose(), 800);
        break;
      }
      case 'wrong': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
        }).toDestination();
        s.volume.value = -16;
        s.triggerAttackRelease('A2', '16n');
        setTimeout(() => s.dispose(), 500);
        break;
      }
      case 'solve': {
        const ps = new (Tone as any).PolySynth((Tone as any).Synth).toDestination();
        ps.volume.value = -10;
        ps.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n');
        setTimeout(() => ps.dispose(), 2000);
        break;
      }
      case 'danger': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0.6, release: 0.1 },
        }).toDestination();
        s.volume.value = -16;
        s.triggerAttackRelease('D3', '8n');
        setTimeout(() => s.dispose(), 500);
        break;
      }
      case 'alarm': {
        const s = new (Tone as any).Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0.5, release: 0.1 },
        }).toDestination();
        s.volume.value = -14;
        s.triggerAttackRelease('F#3', '4n');
        setTimeout(() => s.dispose(), 600);
        break;
      }
    }
  } catch {
    // fail silently — no audio context, blocked, or Tone unavailable
  }
}
