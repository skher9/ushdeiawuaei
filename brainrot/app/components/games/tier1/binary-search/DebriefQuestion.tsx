'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { COMPLEXITY_COLOR } from './missionConfigs';

const OPTIONS = [
  { id: 'A', text: 'Because the array is sorted' },
  { id: 'B', text: 'Because we can eliminate half with each comparison' },
  { id: 'C', text: "Because it's faster than linear search" },
  { id: 'D', text: 'Because the search space has monotonic structure' },
];

const EXPLANATIONS: Record<string, string> = {
  A: 'Partial. Sorting enables binary search but does not explain WHY it works. An unsorted random-access structure could use the same idea if it has monotonic structure.',
  B: 'Close — but WHY can we eliminate half? The real reason is that the property we test (less than / greater than) is monotonic: all false on one side, all true on the other.',
  C: 'True but not WHY. O(log n) is the consequence of the structure, not the cause.',
  D: 'Correct. Monotonic structure means the predicate flips exactly once across the range — which guarantees that checking the midpoint always eliminates a half. Binary search works on ANY such space, sorted or not.',
};

interface Props {
  visible: boolean;
  toolsUsed: { name: string; complexity: string }[];
  finalComplexity: string;
  optimalComplexity: string;
  score: number;
  onContinue: (bonusPoints: number) => void;
}

export default function DebriefQuestion({ visible, toolsUsed, finalComplexity, optimalComplexity, score, onContinue }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [phase, setPhase] = useState<'question' | 'result'>('question');

  function pick(id: string) {
    if (chosen) return;
    setChosen(id);
    setTimeout(() => setPhase('result'), 400);
  }

  function handleContinue() {
    const bonus = chosen === 'D' ? 10 : 0;
    setChosen(null);
    setPhase('question');
    onContinue(bonus);
  }

  const isOptimal = finalComplexity === optimalComplexity;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#07090c',
            border: '1px solid #0d1e30',
            borderBottom: 'none',
            borderTopLeftRadius: 10, borderTopRightRadius: 10,
            padding: '20px 24px 24px',
            zIndex: 50,
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {phase === 'question' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560, margin: '0 auto' }}>
              <div style={{ fontSize: 9, color: '#1a3a5a', letterSpacing: '0.14em' }}>DEBRIEF — SENIOR DEV FILTER</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                WHY does binary search work here?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {OPTIONS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => pick(o.id)}
                    style={{
                      background: chosen === o.id
                        ? o.id === 'D' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${chosen === o.id
                        ? o.id === 'D' ? '#22c55e' : '#ef4444'
                        : '#1a2a3a'}`,
                      borderRadius: 4, padding: '8px 12px',
                      cursor: chosen ? 'default' : 'pointer',
                      fontFamily: 'inherit', fontSize: 11,
                      color: chosen === o.id
                        ? o.id === 'D' ? '#22c55e' : '#ef4444'
                        : '#475569',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ color: '#1a3a5a', marginRight: 10 }}>[{o.id}]</span>
                    {o.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && chosen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560, margin: '0 auto' }}>
              {/* Explanation */}
              <div style={{
                fontSize: 12, color: chosen === 'D' ? '#22c55e' : '#6b8fa0',
                lineHeight: 1.7, padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${chosen === 'D' ? '#0d2a1a' : '#0d1e30'}`,
                borderLeft: `3px solid ${chosen === 'D' ? '#22c55e' : '#374151'}`,
                borderRadius: 4,
              }}>
                {chosen !== 'D' && <span style={{ color: '#ef4444', marginRight: 8 }}>✗</span>}
                {chosen === 'D' && <span style={{ color: '#22c55e', marginRight: 8 }}>✓</span>}
                {EXPLANATIONS[chosen]}
              </div>

              {/* Complexity debrief */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 9, color: '#1a3a5a', letterSpacing: '0.12em', marginBottom: 4 }}>YOUR RUN</div>
                <DebriefRow label="APPROACH" value={toolsUsed.map(t => t.name).join(' + ')} color="#475569" />
                <DebriefRow label="YOUR COMPLEXITY" value={finalComplexity} color={COMPLEXITY_COLOR[finalComplexity] ?? '#eab308'} />
                <DebriefRow label="OPTIMAL" value={optimalComplexity} color="#22c55e" />
                <DebriefRow
                  label="SCORE"
                  value={`${score + (chosen === 'D' ? 10 : 0)}/100${chosen === 'D' ? '  (+10 insight bonus)' : chosen !== null ? '  (−0, wrong answer)' : ''}`}
                  color={score >= 90 ? '#22c55e' : score >= 60 ? '#3b82f6' : '#eab308'}
                />
              </div>

              {!isOptimal && (
                <div style={{ fontSize: 11, color: '#374151', borderTop: '1px solid #0d1e30', paddingTop: 10 }}>
                  A senior engineer using{' '}
                  <span style={{ color: '#22c55e' }}>{optimalComplexity}</span>{' '}
                  would have used significantly fewer operations.
                </div>
              )}
              {isOptimal && (
                <div style={{ fontSize: 11, color: '#22c55e', borderTop: '1px solid #0d1e30', paddingTop: 10 }}>
                  Optimal solution. This is how production systems work.
                </div>
              )}

              <button
                onClick={handleContinue}
                style={{
                  padding: '9px 0', background: 'rgba(59,130,246,0.08)',
                  border: '1px solid #1d4ed8', borderRadius: 4,
                  color: '#3b82f6', fontFamily: 'inherit', fontSize: 10,
                  cursor: 'pointer', letterSpacing: '0.1em',
                }}
              >
                CONTINUE →
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DebriefRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 10 }}>
      <span style={{ color: '#1a3a5a', width: 140 }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
