let ctx: AudioContext | null = null;
let _enabled = false;

export function setSoundEnabled(v: boolean) {
  _enabled = v;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || !_enabled) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.2
) {
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  } catch {
    /* audio not available */
  }
}

export const sound = {
  swap: () => tone(330, 0.1, "square", 0.12),
  compare: () => tone(440, 0.05, "sine", 0.06),
  correct: () => {
    tone(523, 0.1, "sine", 0.25);
    setTimeout(() => tone(659, 0.1, "sine", 0.25), 80);
    setTimeout(() => tone(784, 0.15, "sine", 0.25), 160);
  },
  wrong: () => {
    tone(220, 0.12, "sawtooth", 0.18);
    setTimeout(() => tone(165, 0.2, "sawtooth", 0.14), 100);
  },
  ding: () => tone(880, 0.12, "sine", 0.3),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.25, "sine", 0.3), i * 90)
    );
  },
  tick: () => tone(700, 0.04, "square", 0.08),
  xp: () => {
    tone(1000, 0.04, "sine", 0.12);
    setTimeout(() => tone(1300, 0.08, "sine", 0.12), 40);
  },
  place: () => tone(600, 0.08, "sine", 0.18),
  bigWin: () => {
    const seq = [523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => setTimeout(() => tone(f, 0.2, "sine", 0.3), i * 80));
  },
  chord: () => {
    // Boss level complete — dramatic, full, held chord
    [261, 329, 392, 523, 659].forEach((f) => tone(f, 2.0, "sine", 0.2));
  },
};
