'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventBus } from '../engine/EventBus';

interface Reaction {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

let nextId = 0;

export function FloatingReactions() {
  const [items, setItems] = useState<Reaction[]>([]);

  useEffect(() => {
    const unsubs = [
      EventBus.on('reaction:burst', ({ text, x, y }) => {
        const id = nextId++;
        setItems(prev => [...prev, { id, text, color: '#aaff00', x, y }]);
        setTimeout(() => setItems(prev => prev.filter(r => r.id !== id)), 1200);
      }),
      EventBus.on('reaction:slide', ({ text, color }) => {
        const id = nextId++;
        setItems(prev => [...prev, { id, text, color: color ?? '#00ffff', x: 50, y: 80 }]);
        setTimeout(() => setItems(prev => prev.filter(r => r.id !== id)), 1800);
      }),
      EventBus.on('reaction:danger', ({ text }) => {
        const id = nextId++;
        setItems(prev => [...prev, { id, text, color: '#ff2200', x: 50, y: 50 }]);
        setTimeout(() => setItems(prev => prev.filter(r => r.id !== id)), 2000);
      }),
      EventBus.on('reaction:insight', ({ text }) => {
        const id = nextId++;
        setItems(prev => [...prev, { id, text, color: '#ffcc00', x: 50, y: 70 }]);
        setTimeout(() => setItems(prev => prev.filter(r => r.id !== id)), 2200);
      }),
      EventBus.on('reaction:combo', ({ text, multiplier }) => {
        const id = nextId++;
        const label = multiplier ? `${text ?? 'COMBO'} x${multiplier}` : (text ?? 'COMBO');
        setItems(prev => [...prev, { id, text: label, color: '#ff88ff', x: 50, y: 60 }]);
        setTimeout(() => setItems(prev => prev.filter(r => r.id !== id)), 1500);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 20 }}>
      <AnimatePresence>
        {items.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.9 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'absolute',
              left: `${r.x}%`,
              top: `${r.y}%`,
              transform: 'translateX(-50%)',
              color: r.color,
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 700,
              textShadow: `0 0 8px ${r.color}88`,
              whiteSpace: 'nowrap',
            }}
          >
            {r.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
