'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventBus } from '../engine/EventBus';

interface DeathPayload {
  mission: number;
}

const DEATH_LINES: Record<number, string[]> = {
  1: ['VAULT ALARM TRIGGERED', 'KAI CAPTURED', 'Try a more optimal search pattern'],
  2: ['OOZE REACHED KAI', 'SYSTEM CORRUPTED', 'Next time — narrow faster'],
  3: ['CROWD WENT WILD', 'TOURNAMENT CHAOS', 'Binary search the gaps, not every fighter'],
  4: ['POWER CELLS DEPLETED', 'SIGNAL DEAD', 'Use the slope — climb toward the peak'],
};

export function DeathScreen() {
  const [data, setData] = useState<DeathPayload | null>(null);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const unsub = EventBus.on('scene:death', (payload: DeathPayload) => {
      setData(payload);
      // Glitch flicker
      let count = 0;
      const iv = setInterval(() => {
        setGlitch(g => !g);
        count++;
        if (count > 8) clearInterval(iv);
      }, 80);
    });
    return () => unsub();
  }, []);

  const lines = data ? (DEATH_LINES[data.mission] ?? ['MISSION FAILED', '', 'Try again']) : [];

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(8, 0, 0, 0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 40,
            fontFamily: 'monospace',
          }}
        >
          {/* Glitch scanlines */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
          }} />

          <motion.div
            initial={{ scale: 1.1, filter: 'blur(4px)' }}
            animate={{ scale: 1, filter: 'blur(0)' }}
            transition={{ duration: 0.35 }}
            style={{ textAlign: 'center', padding: '0 24px' }}
          >
            {/* Main death header */}
            <motion.div
              animate={glitch ? { x: [-3, 3, -2, 2, 0], skewX: [-2, 2, -1, 0] } : {}}
              transition={{ duration: 0.05 }}
              style={{ fontSize: 48, color: '#cc0000', letterSpacing: '0.08em', marginBottom: 8 }}
            >
              KAI.EXE
            </motion.div>
            <div style={{
              fontSize: 14, color: '#440000', letterSpacing: '0.2em', marginBottom: 28,
            }}>
              PROCESS TERMINATED
            </div>

            {/* Mission-specific lines */}
            <div style={{ marginBottom: 30 }}>
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  style={{
                    fontSize: i === 0 ? 13 : i === 1 ? 11 : 11,
                    color: i === 0 ? '#882222' : i === 1 ? '#441111' : '#334455',
                    marginBottom: 6,
                    letterSpacing: i < 2 ? '0.1em' : 0,
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </div>

            {/* Retry button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={() => {
                EventBus.emit('game:retry', undefined);
                setTimeout(() => setData(null), 350);
              }}
              style={{
                padding: '10px 40px',
                background: 'rgba(120, 0, 0, 0.2)',
                border: '1px solid #440000',
                color: '#882222',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
                borderRadius: 3,
                letterSpacing: '0.14em',
                marginRight: 12,
              }}
            >
              ↺ RETRY
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              onClick={() => {
                EventBus.emit('game:continue', undefined);
                setTimeout(() => setData(null), 350);
              }}
              style={{
                padding: '10px 40px',
                background: 'transparent',
                border: '1px solid #1a1a2a',
                color: '#223344',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
                borderRadius: 3,
                letterSpacing: '0.14em',
              }}
            >
              ← MAP
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
