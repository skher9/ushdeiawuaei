'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventBus } from '../engine/EventBus';

interface StatsPayload {
  mission: number;
  checks: number;
  optimal: number;
  timeLeft?: number;
  insight: string[];
}

const MISSION_TITLES: Record<number, string> = {
  1: 'THE VAULT HEIST',
  2: 'OUTBREAK',
  3: 'THE TOURNAMENT',
  4: 'DEAD SIGNAL',
};

export function StatsScreen() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [insightIdx, setInsightIdx] = useState(0);

  useEffect(() => {
    const unsub = EventBus.on('scene:stats', (payload: StatsPayload) => {
      setData(payload);
      setInsightIdx(0);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!data) return;
    if (insightIdx >= data.insight.length) return;
    const t = setTimeout(() => setInsightIdx(i => i + 1), 320);
    return () => clearTimeout(t);
  }, [data, insightIdx]);

  const efficiency = data ? Math.min(100, Math.round((data.optimal / data.checks) * 100)) : 0;
  const grade = efficiency >= 100 ? 'S' : efficiency >= 80 ? 'A' : efficiency >= 60 ? 'B' : 'C';
  const gradeColor = grade === 'S' ? '#ffcc00' : grade === 'A' ? '#00ffaa' : grade === 'B' ? '#4488ff' : '#888888';

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(2, 4, 10, 0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 40,
          }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              width: 'min(480px, 92vw)',
              background: 'rgba(4, 10, 22, 0.97)',
              border: '1px solid #0d2a4a',
              borderRadius: 6,
              padding: '28px 32px',
              fontFamily: 'monospace',
            }}
          >
            {/* Header */}
            <div style={{ fontSize: 10, color: '#1a3a5a', letterSpacing: '0.14em', marginBottom: 4 }}>
              MISSION {data.mission} COMPLETE
            </div>
            <div style={{ fontSize: 18, color: '#3b82f6', marginBottom: 20, letterSpacing: '0.06em' }}>
              {MISSION_TITLES[data.mission] ?? 'MISSION'}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <StatBox label="CHECKS" value={`${data.checks}`} sub={`optimal ${data.optimal}`} color="#3b82f6" />
              <StatBox label="GRADE" value={grade} color={gradeColor} sub={`${efficiency}% efficiency`} />
              {data.timeLeft !== undefined && (
                <StatBox label="TIME LEFT" value={`${data.timeLeft}s`} color="#00cc88" />
              )}
            </div>

            {/* Efficiency bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: '#1a3a5a', marginBottom: 6 }}>EFFICIENCY</div>
              <div style={{ height: 6, background: '#0a1020', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${efficiency}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  style={{ height: '100%', background: gradeColor, borderRadius: 3 }}
                />
              </div>
            </div>

            {/* Insight lines */}
            <div style={{ borderTop: '1px solid #0d1a2a', paddingTop: 14, marginBottom: 22 }}>
              <div style={{ fontSize: 9, color: '#1a3a5a', marginBottom: 8 }}>PATTERN INSIGHT</div>
              {data.insight.slice(0, insightIdx).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: 11, color: '#4a7a9a', marginBottom: 5, paddingLeft: 8, borderLeft: '2px solid #0d2a4a' }}
                >
                  {line}
                </motion.div>
              ))}
            </div>

            {/* Continue / Next */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  // Trigger Phaser scene transition first, then unmount overlay after brief delay
                  // so canvas is not revealed bare during the transition
                  EventBus.emit('game:continue', undefined);
                  setTimeout(() => setData(null), 350);
                }}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid #1d4ed8',
                  color: '#3b82f6', fontFamily: 'monospace', fontSize: 11,
                  cursor: 'pointer', borderRadius: 3, letterSpacing: '0.1em',
                }}
              >
                CONTINUE →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: '#1a3a5a', marginBottom: 4, letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: 26, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: '#1a2a3a', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
