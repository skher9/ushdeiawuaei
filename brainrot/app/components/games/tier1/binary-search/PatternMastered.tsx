'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  visible: boolean;
  onContinue: () => void;
}

const INSIGHT_LINES = [
  'Every click was O(log n).',
  'You never searched both halves.',
  'The pattern works on any sorted space.',
  '4 problems. Same principle. Different worlds.',
];

export default function PatternMastered({ visible, onContinue }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    if (!visible) { setLineIdx(0); return; }

    // particle burst
    const ps = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      color: ['#3b82f6', '#22c55e', '#a855f7', '#ffcc00', '#ff6644'][i % 5],
    }));
    setParticles(ps);
    setTimeout(() => setParticles([]), 2000);

    // stagger insight lines
    let n = 0;
    const id = setInterval(() => {
      n++;
      setLineIdx(n);
      if (n >= INSIGHT_LINES.length) clearInterval(id);
    }, 700);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(2, 4, 8, 0.97)',
            zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {/* Particle burst */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <AnimatePresence>
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, left: `${p.x}%`, top: `${p.y}%`, scale: 1 }}
                  animate={{ opacity: 0, top: `${p.y - 30}%`, scale: 0 }}
                  transition={{ duration: 1.2 + Math.random() * 0.8 }}
                  style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: p.color }}
                />
              ))}
            </AnimatePresence>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* Main title */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 180 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
              <div style={{ fontSize: 10, color: '#1a3a5a', letterSpacing: '0.2em' }}>
                TIER 1 · PATTERN 1
              </div>
              <div style={{ fontSize: 38, color: '#3b82f6', fontWeight: 800, letterSpacing: '-0.02em' }}>
                BINARY SEARCH
              </div>
              <div style={{ fontSize: 14, color: '#22c55e', letterSpacing: '0.16em' }}>
                MASTERED
              </div>
            </motion.div>

            {/* Insight lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {INSIGHT_LINES.slice(0, lineIdx).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: 12,
                    color: i === lineIdx - 1 ? '#94a3b8' : '#2a4a6a',
                    textAlign: 'center',
                    letterSpacing: '0.04em',
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </div>

            {/* Complexity badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2 }}
              style={{
                marginTop: 8, padding: '10px 28px',
                border: '1px solid #0d2a4a',
                borderRadius: 4,
                fontSize: 16, color: '#1d4ed8',
                letterSpacing: '0.12em',
              }}
            >
              O(log n)
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.0 }}
              onClick={onContinue}
              style={{
                marginTop: 8, padding: '10px 36px',
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid #1d4ed8',
                color: '#3b82f6', fontFamily: 'inherit', fontSize: 11,
                cursor: 'pointer', borderRadius: 4, letterSpacing: '0.12em',
              }}
            >
              CONTINUE →
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
