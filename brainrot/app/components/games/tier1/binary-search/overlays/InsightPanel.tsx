'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventBus } from '../engine/EventBus';

interface CutscenePayload {
  index: number;
}

const CUTSCENE_SCRIPTS: Record<number, { title: string; lines: string[] }> = {
  0: {
    title: 'KAI AWAKENS',
    lines: [
      'SYSTEM BOOT... CONSCIOUSNESS RESTORED.',
      'Location: Server Farm Megacity — Sector 7G.',
      'Status: Trapped. Corruption spreading fast.',
      'Only path out: master the binary protocols.',
      'Binary Search District — first checkpoint.',
      'The data vaults are yours to crack.',
    ],
  },
  1: {
    title: 'DISTRICT UNLOCKED',
    lines: [
      'Vault breached. Pattern recognized.',
      'Binary Search: halve the problem every step.',
      'N items → log₂(N) steps. No waste.',
      'Next district awaits. Stay sharp.',
    ],
  },
};

export function InsightPanel() {
  const [scene, setScene] = useState<{ title: string; lines: string[]; typed: string[] } | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const unsub = EventBus.on('scene:cutscene', ({ index }: CutscenePayload) => {
      const script = CUTSCENE_SCRIPTS[index] ?? CUTSCENE_SCRIPTS[0];
      setScene({ ...script, typed: [] });
      setLineIndex(0);
      setCharIndex(0);
    });
    const clearUnsub = EventBus.on('overlay:clear', () => setScene(null));
    return () => { unsub(); clearUnsub(); };
  }, []);

  // Typewriter
  useEffect(() => {
    if (!scene) return;
    const currentLine = scene.lines[lineIndex];
    if (!currentLine) return;
    if (charIndex < currentLine.length) {
      const t = setTimeout(() => setCharIndex(c => c + 1), 32);
      return () => clearTimeout(t);
    }
    // Line complete — advance after delay
    const t = setTimeout(() => {
      setScene(s => s ? { ...s, typed: [...s.typed, currentLine] } : s);
      setLineIndex(l => l + 1);
      setCharIndex(0);
    }, 600);
    return () => clearTimeout(t);
  }, [scene, lineIndex, charIndex]);

  return (
    <AnimatePresence>
      {scene && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(560px, 90vw)',
            background: 'rgba(4, 8, 18, 0.92)',
            border: '1px solid #0d2a4a',
            borderRadius: 4,
            padding: '18px 24px',
            zIndex: 30,
          }}
        >
          <div style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#1a4a8a',
            letterSpacing: '0.12em',
            marginBottom: 10,
          }}>
            // {scene.title}
          </div>
          {scene.typed.map((line, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '13px', color: '#4a8aaa', marginBottom: 6 }}>
              &gt; {line}
            </div>
          ))}
          {lineIndex < scene.lines.length && (
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6aaaca' }}>
              &gt; {scene.lines[lineIndex].slice(0, charIndex)}
              <span style={{ opacity: Math.sin(Date.now() / 300) > 0 ? 1 : 0 }}>█</span>
            </div>
          )}
          <div
            style={{
              fontFamily: 'monospace', fontSize: '9px', color: '#0d2a3a',
              marginTop: 14, textAlign: 'right', cursor: 'pointer',
            }}
            onClick={() => EventBus.emit('game:skipCutscene', undefined)}
          >
            [SPACE / TAP TO SKIP]
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
