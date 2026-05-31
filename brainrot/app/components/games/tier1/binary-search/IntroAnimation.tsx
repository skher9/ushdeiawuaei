'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

// Binary search demo: array + target
const ARRAY = [3, 7, 12, 18, 24, 31, 39, 45, 52, 61, 70, 78, 85, 91, 97, 104];
const TARGET = 52; // index 8

// Pre-computed steps for TARGET=52 in ARRAY
const STEPS = [
  { l: 0, r: 15, m: 7, val: 45, dir: 'right' as const, msg: '45 < 52 — SEARCH RIGHT' },
  { l: 8, r: 15, m: 11, val: 78, dir: 'left' as const, msg: '78 > 52 — SEARCH LEFT' },
  { l: 8, r: 10, m: 9, val: 61, dir: 'left' as const, msg: '61 > 52 — SEARCH LEFT' },
  { l: 8, r: 8, m: 8, val: 52, dir: 'found' as const, msg: '52 = 52 — FOUND!' },
];

type Phase = 'boot' | 'array' | 'search' | 'insight' | 'exit';

interface Props {
  onDone: () => void;
}

export default function IntroAnimation({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('boot');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [arrayReady, setArrayReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [showInsight, setShowInsight] = useState(false);
  const skipRef = useRef(false);

  const skip = () => {
    skipRef.current = true;
    onDone();
  };

  // Boot phase
  useEffect(() => {
    if (phase !== 'boot') return;
    const lines = [
      'BRAINROT v1.0 LOADING...',
      'PATTERN: BINARY SEARCH',
      'MODULE: tier1/binary-search',
      '> BOOT SEQUENCE COMPLETE',
    ];
    let i = 0;
    const tid = setInterval(() => {
      if (skipRef.current) return clearInterval(tid);
      setBootLines(l => [...l, lines[i]]);
      i++;
      if (i >= lines.length) {
        clearInterval(tid);
        setTimeout(() => { if (!skipRef.current) setPhase('array'); }, 600);
      }
    }, 420);
    return () => clearInterval(tid);
  }, [phase]);

  // Array phase
  useEffect(() => {
    if (phase !== 'array') return;
    const t = setTimeout(() => {
      if (!skipRef.current) {
        setArrayReady(true);
        setTimeout(() => { if (!skipRef.current) setPhase('search'); }, 1200);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [phase]);

  // Search phase: step through the binary search
  useEffect(() => {
    if (phase !== 'search') return;
    let step = -1;
    function nextStep() {
      if (skipRef.current) return;
      step++;
      if (step < STEPS.length) {
        setStepIdx(step);
        const delay = STEPS[step].dir === 'found' ? 1200 : 1800;
        setTimeout(nextStep, delay);
      } else {
        setTimeout(() => { if (!skipRef.current) setPhase('insight'); }, 800);
      }
    }
    setTimeout(nextStep, 400);
  }, [phase]);

  // Insight phase
  useEffect(() => {
    if (phase !== 'insight') return;
    const t = setTimeout(() => { if (!skipRef.current) setShowInsight(true); }, 200);
    const t2 = setTimeout(() => { if (!skipRef.current) setPhase('exit'); }, 3800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [phase]);

  // Exit phase
  useEffect(() => {
    if (phase !== 'exit') return;
    const t = setTimeout(() => { if (!skipRef.current) onDone(); }, 700);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const step = stepIdx >= 0 ? STEPS[stepIdx] : null;

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, background: '#020408',
            zIndex: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {/* Skip button */}
          <button
            onClick={skip}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'none', border: '1px solid #1a3050',
              color: '#2a5070', fontSize: 10, padding: '4px 12px',
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.1em',
            }}
          >
            SKIP →
          </button>

          {/* Boot phase */}
          {(phase === 'boot') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 340 }}>
              <div style={{ fontSize: 9, color: '#0a2040', letterSpacing: '0.14em', marginBottom: 8 }}>
                SYSTEM INIT
              </div>
              {bootLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: i === bootLines.length - 1 ? 11 : 10,
                    color: i === bootLines.length - 1 ? '#3b82f6' : '#1a3050',
                    letterSpacing: '0.1em',
                  }}
                >
                  {i < bootLines.length - 1 ? '  ' : '▸ '}{line}
                </motion.div>
              ))}
              {bootLines.length > 0 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ fontSize: 12, color: '#3b82f6' }}
                >
                  _
                </motion.span>
              )}
            </div>
          )}

          {/* Array + search phase */}
          {(phase === 'array' || phase === 'search') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '90%', maxWidth: 620 }}>
              <div style={{ fontSize: 10, color: '#1a4060', letterSpacing: '0.14em' }}>
                TARGET: <span style={{ color: '#3b82f6' }}>{TARGET}</span>
                <span style={{ marginLeft: 24, color: '#0a2040' }}>N = {ARRAY.length}</span>
              </div>

              {/* Array row */}
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                {ARRAY.map((v, i) => {
                  const isElim = step && (
                    (step.dir === 'right' && i < step.l && stepIdx >= 0) ||
                    (step.dir === 'left' && i > step.r && stepIdx >= 0) ||
                    (step.dir === 'found' && i !== step.m && !(i >= step.l && i <= step.r))
                  );
                  const isMid = step && i === step.m;
                  const isInRange = !step || (i >= step.l && i <= step.r);
                  const isFound = step?.dir === 'found' && i === step.m;

                  return (
                    <motion.div
                      key={i}
                      initial={arrayReady ? { opacity: 0, y: 10 } : false}
                      animate={arrayReady ? { opacity: isElim ? 0.12 : 1, y: 0 } : {}}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      style={{
                        width: 34, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                        background: isFound ? 'rgba(34,197,94,0.15)' : isMid ? 'rgba(59,130,246,0.1)' : isElim ? 'transparent' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isFound ? '#22c55e' : isMid ? '#3b82f6' : isElim ? '#0a1a2a' : '#0d2040'}`,
                        borderRadius: 3,
                        fontSize: 10,
                        color: isFound ? '#22c55e' : isMid ? '#3b82f6' : isElim ? '#0a1a2a' : isInRange ? '#2a5a7a' : '#0a1a2a',
                        transition: 'all 0.3s',
                        position: 'relative',
                      }}
                    >
                      {v}
                      <div style={{ fontSize: 7, color: isElim ? '#050e18' : '#0a2030', marginTop: 2 }}>{i}</div>
                      {isMid && (
                        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#3b82f6' }}>↓</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Step message */}
              <AnimatePresence mode="wait">
                {step && (
                  <motion.div
                    key={stepIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      fontSize: 12,
                      color: step.dir === 'found' ? '#22c55e' : '#3b82f6',
                      letterSpacing: '0.08em',
                      textAlign: 'center',
                    }}
                  >
                    {step.dir !== 'found' && (
                      <span style={{ marginRight: 12, color: '#0a2040' }}>step {stepIdx + 1}/4</span>
                    )}
                    {step.msg}
                  </motion.div>
                )}
                {!step && phase === 'array' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: 10, color: '#1a3050', letterSpacing: '0.12em' }}
                  >
                    SORTED ARRAY — FIND {TARGET}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Insight phase */}
          {phase === 'insight' && showInsight && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}
            >
              <div style={{ fontSize: 11, color: '#1a3050', letterSpacing: '0.2em' }}>4 STEPS TO FIND 1 VALUE IN 16</div>
              <div style={{ fontSize: 28, color: '#3b82f6', letterSpacing: '-0.01em', fontWeight: 700 }}>
                O(log N)
              </div>
              <div style={{ fontSize: 11, color: '#1a4060', letterSpacing: '0.1em' }}>
                log₂(16) = 4 &nbsp;·&nbsp; log₂(1,000,000) = 20
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#0a2040', letterSpacing: '0.14em' }}>
                4 MISSIONS · PROVE THE PATTERN
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
