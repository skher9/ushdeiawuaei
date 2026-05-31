'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export type ReactionKind = 'BURST' | 'SLIDE_LEFT' | 'SLIDE_RIGHT' | 'DANGER' | 'INSIGHT';

interface Reaction {
  id: number;
  kind: ReactionKind;
  text: string;
  x: number;
  y: number;
}

export function emitReaction(kind: ReactionKind, text: string, x: number, y: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bs-reaction', { detail: { kind, text, x, y } }));
  }
}

const COLORS: Record<ReactionKind, string> = {
  BURST: '#ffcc00',
  SLIDE_LEFT: '#3b82f6',
  SLIDE_RIGHT: '#22c55e',
  DANGER: '#ef4444',
  INSIGHT: '#a855f7',
};

function ReactionEl({ r }: { r: Reaction }) {
  const c = COLORS[r.kind];
  const base = { position: 'absolute' as const, left: r.x, top: r.y, transform: 'translate(-50%,-50%)', pointerEvents: 'none' as const, fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' as const, color: c, textShadow: `0 0 8px ${c}`, fontSize: r.kind === 'BURST' ? 20 : 13 };

  if (r.kind === 'BURST') return (
    <motion.div style={base} initial={{ opacity: 0, scale: 0.5, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.4, 1.2, 0.8], y: -60 }} transition={{ duration: 1.0 }} exit={{ opacity: 0 }}>
      {r.text}
    </motion.div>
  );
  if (r.kind === 'SLIDE_LEFT') return (
    <motion.div style={base} initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 1, 1, 0], x: -80 }} transition={{ duration: 0.9 }} exit={{ opacity: 0 }}>
      {r.text}
    </motion.div>
  );
  if (r.kind === 'SLIDE_RIGHT') return (
    <motion.div style={base} initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 1, 1, 0], x: 80 }} transition={{ duration: 0.9 }} exit={{ opacity: 0 }}>
      {r.text}
    </motion.div>
  );
  if (r.kind === 'DANGER') return (
    <motion.div style={base} initial={{ opacity: 0, scale: 1 }} animate={{ opacity: [0, 1, 0.8, 1, 0], scale: [1, 1.3, 1.1, 1.2, 0.9] }} transition={{ duration: 1.0 }} exit={{ opacity: 0 }}>
      {r.text}
    </motion.div>
  );
  // INSIGHT
  return (
    <motion.div style={{ ...base, fontSize: 11, letterSpacing: '0.1em' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 1, 0], y: -40 }} transition={{ duration: 1.2 }} exit={{ opacity: 0 }}>
      {r.text}
    </motion.div>
  );
}

export function FloatingReactions() {
  const [items, setItems] = useState<Reaction[]>([]);

  useEffect(() => {
    let id = 0;
    function handler(e: Event) {
      const d = (e as CustomEvent).detail as { kind: ReactionKind; text: string; x: number; y: number };
      const rid = ++id;
      setItems(p => [...p.slice(-8), { id: rid, ...d }]);
      setTimeout(() => setItems(p => p.filter(r => r.id !== rid)), 1500);
    }
    window.addEventListener('bs-reaction', handler);
    return () => window.removeEventListener('bs-reaction', handler);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 30 }}>
      <AnimatePresence>
        {items.map(r => <ReactionEl key={r.id} r={r} />)}
      </AnimatePresence>
    </div>
  );
}
