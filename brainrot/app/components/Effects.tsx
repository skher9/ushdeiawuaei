"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── AmbientStage: scanlines + grain + dust particles ────── */
const DUST_PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: Math.round((i / 26) * 100 + Math.random() * 4),
  top: Math.round(20 + Math.random() * 80),
  dur: (6 + Math.random() * 6).toFixed(1),
  delay: (Math.random() * 8).toFixed(1),
  dx: Math.round((Math.random() - 0.5) * 40),
  dy: Math.round(-60 - Math.random() * 60),
  isViolet: i % 5 === 0,
}));

export function AmbientStage() {
  return (
    <>
      <div className="stage-ambient" aria-hidden />
      <div className="stage-vignette" aria-hidden />
      {/* Dust particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3 }} aria-hidden>
        {DUST_PARTICLES.map((p) => (
          <div
            key={p.id}
            className={`dust${p.isViolet ? " dust-violet" : ""}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              ["--dur" as string]: `${p.dur}s`,
              ["--delay" as string]: `${p.delay}s`,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
            }}
          />
        ))}
        {/* Slow vertical scan beam */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.12), transparent)",
          animation: "scan-vertical 18s linear infinite",
          top: 0,
        }} />
      </div>
    </>
  );
}

/* ── Corner brackets (HUD decoration) ───────────────────── */
interface CornersProps {
  color?: string;
  size?: number;
  thickness?: number;
  opacity?: number;
  className?: string;
}
export function Corners({
  color = "var(--gold)",
  size = 14,
  thickness = 1.5,
  opacity = 0.5,
  className = "",
}: CornersProps) {
  const s = size;
  const t = thickness;
  return (
    <span className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {/* top-left */}
      <span
        style={{
          position: "absolute", top: 5, left: 5,
          width: s, height: s,
          borderTop: `${t}px solid ${color}`,
          borderLeft: `${t}px solid ${color}`,
          opacity,
        }}
      />
      {/* top-right */}
      <span
        style={{
          position: "absolute", top: 5, right: 5,
          width: s, height: s,
          borderTop: `${t}px solid ${color}`,
          borderRight: `${t}px solid ${color}`,
          opacity,
        }}
      />
      {/* bottom-left */}
      <span
        style={{
          position: "absolute", bottom: 5, left: 5,
          width: s, height: s,
          borderBottom: `${t}px solid ${color}`,
          borderLeft: `${t}px solid ${color}`,
          opacity,
        }}
      />
      {/* bottom-right */}
      <span
        style={{
          position: "absolute", bottom: 5, right: 5,
          width: s, height: s,
          borderBottom: `${t}px solid ${color}`,
          borderRight: `${t}px solid ${color}`,
          opacity,
        }}
      />
    </span>
  );
}

/* ── XP Burst: fire particles at click point ─────────────── */
interface BurstParticle {
  id: number;
  x: number;
  y: number;
  label: string;
}

let burstId = 0;
let burstDispatch: ((p: BurstParticle) => void) | null = null;

export function fireBurst(e: { clientX: number; clientY: number } | null, amount: number, label?: string) {
  if (!burstDispatch) return;
  const x = e?.clientX ?? window.innerWidth / 2;
  const y = e?.clientY ?? window.innerHeight * 0.6;
  burstDispatch({ id: ++burstId, x, y, label: label ?? `+${amount} XP` });
}

export function BurstHost() {
  const [particles, setParticles] = useState<BurstParticle[]>([]);

  useEffect(() => {
    burstDispatch = (p) => setParticles((prev) => [...prev, p]);
    return () => { burstDispatch = null; };
  }, []);

  const remove = (id: number) =>
    setParticles((prev) => prev.filter((p) => p.id !== id));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          animate={{ opacity: 0, y: -52, scale: 0.85, x: (Math.random() - 0.5) * 24 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onAnimationComplete={() => remove(p.id)}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            color: "var(--gold)",
            textShadow: "0 0 8px var(--gold)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {p.label}
        </motion.span>
      ))}
    </div>
  );
}

/* ── Magnetic: hover repulsion effect ────────────────────── */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [delta, setDelta] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setDelta({
      x: (e.clientX - cx) * strength,
      y: (e.clientY - cy) * strength,
    });
  };
  const onLeave = () => setDelta({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={{ x: delta.x, y: delta.y }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.div>
  );
}

/* ── TickNumber: animated rolling number ─────────────────── */
export function TickNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = Math.min(Math.abs(diff), 20);
    const step = diff / steps;
    let current = prev.current;
    let i = 0;
    const t = setInterval(() => {
      i++;
      current += step;
      setDisplay(Math.round(current));
      if (i >= steps) {
        setDisplay(value);
        clearInterval(t);
      }
    }, 30);
    prev.current = value;
    return () => clearInterval(t);
  }, [value]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={display}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 6, opacity: 0 }}
        transition={{ duration: 0.1 }}
        className={className}
      >
        {display}
      </motion.span>
    </AnimatePresence>
  );
}
