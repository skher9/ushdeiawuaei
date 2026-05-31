'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { BSProblem } from './problems';

interface Props {
  problem: BSProblem;
  visible: boolean;
  onClose: () => void;
  onNext?: () => void;
  nextLabel?: string;
}

const COMPLEXITY: Record<string, { time: string; space: string; note: string }> = {
  '704': { time: 'O(log n)', space: 'O(1)', note: 'Halve search space each step' },
  '278': { time: 'O(log n)', space: 'O(1)', note: 'Binary search on predicate boundary' },
  '35': { time: 'O(log n)', space: 'O(1)', note: 'Lower bound — first index ≥ target' },
  '162': { time: 'O(log n)', space: 'O(1)', note: 'Slope climbing guarantees peak in range' },
  '33': { time: 'O(log n)', space: 'O(1)', note: 'One half always fully sorted' },
  '875': { time: 'O(n log n)', space: 'O(1)', note: 'Binary search on answer space' },
  '1011': { time: 'O(n log n)', space: 'O(1)', note: 'Binary search on capacity' },
  '4': { time: 'O(log(min(m,n)))', space: 'O(1)', note: 'Binary partition on smaller array' },
};

function ComplexityBar({ label, value }: { label: string; value: string }) {
  const width = value === 'O(1)' ? 8 : value.includes('log') && !value.includes('n log') ? 20 : value.includes('n log') ? 55 : 10;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: '#374151', width: 44, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ flex: 1, height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          style={{ height: '100%', background: '#3b82f6', borderRadius: 2 }}
        />
      </div>
      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', width: 100 }}>{value}</div>
    </div>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    const t = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(id);
      }, 22);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <>{displayed}</>;
}

export default function InsightPanel({ problem, visible, onClose, onNext, nextLabel }: Props) {
  const lc = problem.leetcodeRef ?? '';
  const cx = COMPLEXITY[lc];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#080c10',
            border: '1px solid #0d2040',
            borderBottom: 'none',
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
            padding: '22px 24px 28px',
            zIndex: 50,
            fontFamily: 'var(--font-mono, monospace)',
            maxHeight: '55vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 580, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.12em', marginBottom: 4 }}>
                  ✓ PATTERN UNLOCKED
                </div>
                <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600 }}>
                  {problem.insightTitle}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: '1px solid #1a2a3a',
                  color: '#374151', padding: '4px 10px',
                  borderRadius: 4, cursor: 'pointer',
                  fontSize: 10, fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>

            {/* Insight text */}
            <div style={{
              fontSize: 12, color: '#6b8fa0', lineHeight: 1.85,
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid #0d1e30',
              borderRadius: 6,
              borderLeft: '3px solid #1d4ed8',
            }}>
              <TypewriterText text={problem.insight} delay={100} />
            </div>

            {/* Complexity */}
            {cx && (
              <div>
                <div style={{ fontSize: 9, color: '#1a3a5a', letterSpacing: '0.12em', marginBottom: 10 }}>
                  COMPLEXITY
                </div>
                <ComplexityBar label="TIME" value={cx.time} />
                <ComplexityBar label="SPACE" value={cx.space} />
                <div style={{ fontSize: 10, color: '#1a3a5a', marginTop: 6 }}>{cx.note}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '9px 0',
                  background: 'transparent', border: '1px solid #1a2a3a',
                  color: '#374151', fontFamily: 'inherit', fontSize: 10,
                  cursor: 'pointer', borderRadius: 4, letterSpacing: '0.08em',
                }}
              >
                ← MODULE
              </button>
              {onNext && (
                <button
                  onClick={onNext}
                  style={{
                    flex: 2, padding: '9px 0',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid #1d4ed8',
                    color: '#3b82f6', fontFamily: 'inherit', fontSize: 10,
                    cursor: 'pointer', borderRadius: 4, letterSpacing: '0.08em',
                  }}
                >
                  {nextLabel ?? 'NEXT →'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
