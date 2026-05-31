"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Star, Bolt, Crown, Shield, Mountain, Trophy, Sparkle, Lock, Play } from "@/components/Glyphs";

/* ── CursorAurora ────────────────────────────────────────── */
export function CursorAurora() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="cursor-aurora"
      aria-hidden
      style={{ left: "-999px", top: "-999px" }}
    />
  );
}

/* ── Constellation ───────────────────────────────────────── */
interface Star { x: number; y: number; r: number; op: number; }

export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.2 + 0.3,
        op: Math.random() * 0.5 + 0.1,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const LINK_DIST = 0.12;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const mx = mouse.current.x;
      const my = mouse.current.y;
      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current.map((s) => ({
        ...s,
        px: (s.x + (mx - 0.5) * 0.03) * w,
        py: (s.y + (my - 0.5) * 0.03) * h,
      }));

      // Draw lines
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].px - stars[j].px;
          const dy = stars[i].py - stars[j].py;
          const d = Math.sqrt(dx * dx + dy * dy) / w;
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.08;
            ctx.beginPath();
            ctx.moveTo(stars[i].px, stars[i].py);
            ctx.lineTo(stars[j].px, stars[j].py);
            ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      // Draw dots
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.px, s.py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${s.op})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="constellation"
      aria-hidden
    />
  );
}

/* ── Toast system ────────────────────────────────────────── */
export type ToastType = "xp" | "achievement" | "streak" | "level";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  body?: string;
}

let toastId = 0;
let toastDispatch: ((t: ToastItem) => void) | null = null;

export function fireToast(type: ToastType, title: string, body?: string) {
  if (!toastDispatch) return;
  toastDispatch({ id: ++toastId, type, title, body });
}

const TOAST_STYLES: Record<ToastType, { border: string; icon: string; accent: string }> = {
  xp:          { border: "border-[var(--gold)]/40",    icon: "⚡", accent: "text-[var(--gold)]" },
  achievement: { border: "border-violet-500/40",        icon: "🏆", accent: "text-violet-400" },
  streak:      { border: "border-orange-500/40",        icon: "🔥", accent: "text-orange-400" },
  level:       { border: "border-cyan-500/40",          icon: "✦",  accent: "text-cyan-400" },
};

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastDispatch = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 3200);
    };
    return () => { toastDispatch = null; };
  }, []);

  return (
    <div className="toast-host">
      <AnimatePresence>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`relative hud-panel border ${s.border} rounded-xl px-4 py-3 flex items-start gap-3 min-w-[200px] max-w-[260px] pointer-events-auto overflow-hidden`}
            >
              <Corners size={8} thickness={1} opacity={0.4} />
              <span className="text-lg leading-none mt-0.5">{s.icon}</span>
              <div>
                <p className={`font-black text-xs ${s.accent}`}>{t.title}</p>
                {t.body && <p className="text-white/40 text-[11px] mt-0.5">{t.body}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Import Corners here to avoid circular dependency
function Corners({ size = 14, thickness = 1.5, opacity = 0.5 }: { size?: number; thickness?: number; opacity?: number }) {
  const s = size;
  const t = thickness;
  const color = "var(--gold)";
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span style={{ position:"absolute", top:4, left:4, width:s, height:s, borderTop:`${t}px solid ${color}`, borderLeft:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", top:4, right:4, width:s, height:s, borderTop:`${t}px solid ${color}`, borderRight:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", bottom:4, left:4, width:s, height:s, borderBottom:`${t}px solid ${color}`, borderLeft:`${t}px solid ${color}`, opacity }} />
      <span style={{ position:"absolute", bottom:4, right:4, width:s, height:s, borderBottom:`${t}px solid ${color}`, borderRight:`${t}px solid ${color}`, opacity }} />
    </span>
  );
}

/* ── LevelUpFlash ────────────────────────────────────────── */
export function LevelUpFlash({ level, onDone }: { level: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="level-up-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-black/85" />
      {/* Radial rays SVG */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="ray-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f6c453" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f6c453" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x2 = 400 + Math.cos(angle) * 500;
          const y2 = 300 + Math.sin(angle) * 500;
          return (
            <motion.line
              key={i}
              x1="400" y1="300"
              x2={x2} y2={y2}
              stroke="#f6c453"
              strokeWidth="1"
              strokeOpacity="0"
              initial={{ strokeOpacity: 0 }}
              animate={{ strokeOpacity: [0, 0.25, 0] }}
              transition={{ duration: 1.2, delay: i * 0.04, ease: "easeOut" }}
            />
          );
        })}
        <motion.circle
          cx="400" cy="300" r="0"
          fill="url(#ray-grad)"
          initial={{ r: 0 }}
          animate={{ r: 320 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        />
      </svg>

      <motion.div
        className="relative text-center px-10"
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.15, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.35em", color: "rgba(246,196,83,0.7)",
          marginBottom: 10,
        }}>
          ◆ ASCENT ◆
        </p>
        <p style={{
          fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1,
          background: "linear-gradient(180deg, #fde68a 0%, #f6c453 60%, #e3a93f 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 10,
        }}>
          {level}
        </p>
        <p style={{ color: "rgba(235,233,227,0.3)", fontSize: 13 }}>Keep rotting.</p>
      </motion.div>
    </motion.div>
  );
}

/* ── LiveFeed ────────────────────────────────────────────── */
const ACTIVITY_NAMES = [
  "kira_dev", "morsecode", "sapphire", "neon.rune", "obi.k", "wreckless",
  "vivienne", "hekate", "argent01", "patchwork", "axiom", "nyx",
];
type ActivityVerb = { v: string; Icon: typeof Check; c: string };
const ACTIVITY_VERBS: ActivityVerb[] = [
  { v: "cleared Bubble Sort",      Icon: Check,    c: "#6ee7b7" },
  { v: "hit a ×7 combo",           Icon: Flame,    c: "#f6c453" },
  { v: "unlocked Selection Sort",  Icon: Star,     c: "#a78bfa" },
  { v: "beat the Daily in 1:12",   Icon: Bolt,     c: "#f6c453" },
  { v: "reached Level 5",          Icon: Crown,    c: "#f6c453" },
  { v: "earned the Sorter badge",  Icon: Shield,   c: "#67e8f9" },
  { v: "started Search Mountains", Icon: Mountain, c: "#67e8f9" },
  { v: "took down Bubble Boss",    Icon: Trophy,   c: "#fb7185" },
];

interface FeedItem { id: string; name: string; action: ActivityVerb; }

function makeFeedItem(): FeedItem {
  return {
    id: Math.random().toString(36).slice(2),
    name: ACTIVITY_NAMES[Math.floor(Math.random() * ACTIVITY_NAMES.length)],
    action: ACTIVITY_VERBS[Math.floor(Math.random() * ACTIVITY_VERBS.length)],
  };
}

export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(() =>
    Array.from({ length: 4 }, makeFeedItem)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setItems((p) => [makeFeedItem(), ...p].slice(0, 4));
    }, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        padding: "14px 16px",
        background: "rgba(12,12,20,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#fb7185", flexShrink: 0,
            boxShadow: "0 0 8px #fb7185",
          }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            letterSpacing: "0.22em", color: "rgba(235,233,227,0.55)",
          }}>LIVE FEED</span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            color: "rgba(110,231,183,0.7)", letterSpacing: "0.15em",
          }}>1,247 ONLINE</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence initial={false}>
            {items.map((it, i) => {
              const { Icon } = it.action;
              return (
                <motion.div
                  key={it.id}
                  initial={i === 0 ? { opacity: 0, y: -8 } : false}
                  animate={{ opacity: 1 - i * 0.18, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px",
                    background: i === 0 ? "rgba(167,139,250,0.05)" : "transparent",
                    borderRadius: 6,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${it.action.c}20`,
                    border: `1px solid ${it.action.c}40`,
                    borderRadius: 4,
                  }}>
                    <Icon size={11} color={it.action.c} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 10, color: it.action.c,
                    }}>{it.name}</span>
                    <span style={{
                      fontSize: 11, color: "rgba(235,233,227,0.55)", marginLeft: 6,
                    }}>{it.action.v}</span>
                  </div>
                  {i === 0 && (
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 9,
                      color: "rgba(235,233,227,0.35)", letterSpacing: "0.12em",
                    }}>NOW</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── TrendingRail ────────────────────────────────────────── */
interface TrendingItem {
  id: string; title: string; sub: string; plays: string; delta: string;
  viz: "binary" | "quick" | "graph" | "attention" | "merge";
  accent: string; deep: string; hot?: boolean;
}

const TRENDING_DATA: TrendingItem[] = [
  { id: "binary-search", title: "Binary Search",  sub: "Search Mountains · Tier I",  plays: "12.4k", delta: "+18%", viz: "binary",    accent: "#67e8f9", deep: "#0e7490" },
  { id: "quick-sort",    title: "Quick Sort",     sub: "Sorting Village · Tier II",  plays: "8.9k",  delta: "+24%", viz: "quick",     accent: "#a78bfa", deep: "#5b21b6", hot: true },
  { id: "dijkstra",      title: "Dijkstra",       sub: "Graph Dungeon · Tier II",    plays: "5.2k",  delta: "+9%",  viz: "graph",     accent: "#fb7185", deep: "#9f1239" },
  { id: "transformers",  title: "Transformers",   sub: "AI Realm · Tier IV",         plays: "3.1k",  delta: "+41%", viz: "attention", accent: "#93c5fd", deep: "#1d4ed8", hot: true },
  { id: "merge-sort",    title: "Merge Sort",     sub: "Sorting Village · Tier II",  plays: "7.8k",  delta: "+6%",  viz: "merge",     accent: "#f6c453", deep: "#92400e" },
];

function BinaryViz({ accent }: { accent: string }) {
  const [hi, setHi] = useState(7);
  useEffect(() => {
    const seq = [7, 3, 5, 4, 7, 11, 9, 10, 7];
    let i = 0;
    const t = setInterval(() => { setHi(seq[i % seq.length]); i++; }, 600);
    return () => clearInterval(t);
  }, []);
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%" }}>
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={8 + i * 12} y={40} width="8"
          height={i === hi ? 32 : 20} rx="1"
          fill={i === hi ? accent : `${accent}30`}
          style={{ transition: "all 0.3s" }}
        />
      ))}
      <polygon
        points={`${8 + hi * 12 + 4},28 ${8 + hi * 12},22 ${8 + hi * 12 + 8},22`}
        fill={accent}
        style={{ transition: "all 0.3s cubic-bezier(.16,1,.3,1)" }}
      />
    </svg>
  );
}

function QuickViz({ accent }: { accent: string }) {
  const heights = useMemo(() => Array.from({ length: 12 }, () => 0.2 + Math.random() * 0.8), []);
  const [pivot, setPivot] = useState(5);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { setPivot(i % 12); i++; }, 450);
    return () => clearInterval(t);
  }, []);
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%" }}>
      {heights.map((h, i) => {
        const x = 10 + i * 15;
        const height = h * 60;
        const isPivot = i === pivot;
        const isLeft = i < pivot;
        return (
          <rect key={i} x={x} y={100 - height} width="10" height={height} rx="1"
            fill={isPivot ? accent : isLeft ? `${accent}50` : `${accent}25`}
            style={{ transition: "fill 0.3s" }}
          />
        );
      })}
      {/* pivot line */}
      <line x1={10 + pivot * 15 + 5} y1="5" x2={10 + pivot * 15 + 5} y2="95"
        stroke={accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
    </svg>
  );
}

function GraphViz({ accent }: { accent: string }) {
  const nodes = useMemo(() => [
    { x: 100, y: 50 }, { x: 40, y: 20 }, { x: 160, y: 20 },
    { x: 40, y: 80 }, { x: 160, y: 80 }, { x: 100, y: 90 },
  ], []);
  const edges = [[0,1],[0,2],[0,3],[1,3],[2,4],[3,5],[4,5]];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % nodes.length), 700);
    return () => clearInterval(t);
  }, [nodes.length]);
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%" }}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke={`${accent}40`} strokeWidth="1" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i === active ? 8 : 5}
          fill={i === active ? accent : `${accent}40`}
          style={{ transition: "all 0.3s" }}
        />
      ))}
    </svg>
  );
}

function AttentionViz({ accent }: { accent: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 8), 300);
    return () => clearInterval(t);
  }, []);
  const tokens = 6;
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%" }}>
      {Array.from({ length: tokens }, (_, i) =>
        Array.from({ length: tokens }, (_, j) => {
          const strength = Math.abs(i - j) === step % tokens ? 1 : 0.1;
          return (
            <line key={`${i}-${j}`}
              x1={20 + i * 30} y1={30} x2={20 + j * 30} y2={70}
              stroke={accent} strokeWidth={strength * 1.5} opacity={strength}
              style={{ transition: "opacity 0.3s, stroke-width 0.3s" }}
            />
          );
        })
      )}
      {Array.from({ length: tokens }, (_, i) => (
        <g key={i}>
          <circle cx={20 + i * 30} cy={30} r="5" fill={`${accent}60`} />
          <circle cx={20 + i * 30} cy={70} r="5" fill={`${accent}60`} />
        </g>
      ))}
    </svg>
  );
}

function MergeViz({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 4), 600);
    return () => clearInterval(t);
  }, []);
  const groups = phase === 0 ? [[0],[1],[2],[3],[4],[5],[6],[7]]
    : phase === 1 ? [[0,1],[2,3],[4,5],[6,7]]
    : phase === 2 ? [[0,1,2,3],[4,5,6,7]]
    : [[0,1,2,3,4,5,6,7]];
  return (
    <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%" }}>
      {groups.map((grp, gi) => {
        const w = grp.length * 20;
        const x = gi * (200 / groups.length) + (200 / groups.length - w) / 2;
        return (
          <rect key={gi} x={x} y={35} width={w} height="30" rx="3"
            fill={`${accent}30`} stroke={accent} strokeWidth="1"
            style={{ transition: "all 0.5s cubic-bezier(.16,1,.3,1)" }}
          />
        );
      })}
    </svg>
  );
}

function AnimMiniViz({ kind, accent }: { kind: TrendingItem["viz"]; accent: string }) {
  if (kind === "binary")    return <BinaryViz    accent={accent} />;
  if (kind === "quick")     return <QuickViz     accent={accent} />;
  if (kind === "graph")     return <GraphViz     accent={accent} />;
  if (kind === "attention") return <AttentionViz accent={accent} />;
  if (kind === "merge")     return <MergeViz     accent={accent} />;
  return null;
}

function TrendingCard({ t, index }: { t: TrendingItem; index: number }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -3 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative", textAlign: "left", padding: 0,
        border: `1px solid ${hover ? t.accent + "66" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12,
        background: "rgba(12,12,20,0.5)",
        cursor: "pointer", overflow: "hidden",
        boxShadow: hover ? `0 20px 40px -16px ${t.accent}50` : "0 4px 16px rgba(0,0,0,0.3)",
        transition: "border-color 0.25s, box-shadow 0.25s",
        width: "100%",
      }}
    >
      <div style={{
        height: 100, position: "relative",
        background: `linear-gradient(135deg, ${t.accent}20, ${t.deep}30)`,
        overflow: "hidden",
        borderBottom: `1px solid ${t.accent}30`,
      }}>
        <AnimMiniViz kind={t.viz} accent={t.accent} />
        {t.hot && (
          <span style={{
            position: "absolute", top: 8, right: 8,
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 6px",
            background: "rgba(251,113,133,0.15)",
            border: "1px solid rgba(251,113,133,0.4)",
            borderRadius: 3,
            fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.18em",
            color: "#fb7185",
          }}>
            <Flame size={9} color="#fb7185" /> HOT
          </span>
        )}
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(7,7,13,0.4)",
              }}
            >
              <div style={{
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${t.accent}20`,
                border: `1px solid ${t.accent}`,
                borderRadius: "50%",
                boxShadow: `0 0 20px ${t.accent}`,
              }}>
                <Play size={14} color={t.accent} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#ebe9e3", marginBottom: 3 }}>
          {t.title}
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
          color: "rgba(235,233,227,0.4)", marginBottom: 8,
        }}>
          {t.sub.toUpperCase()}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(235,233,227,0.6)",
          }}>{t.plays} plays</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "#6ee7b7",
            padding: "2px 6px", background: "rgba(110,231,183,0.1)", borderRadius: 3,
          }}>▲ {t.delta}</span>
        </div>
      </div>
    </motion.button>
  );
}

export function TrendingRail() {
  return (
    <section style={{ maxWidth: 1100, margin: "20px auto 0", padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", color: "#f6c453",
          padding: "3px 8px",
          background: "rgba(246,196,83,0.08)",
          border: "1px solid rgba(246,196,83,0.25)",
          borderRadius: 4,
        }}>◆ TRENDING NOW</span>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: 22, color: "#ebe9e3", letterSpacing: "-0.01em",
        }}>
          What the realm is grinding tonight.
        </h3>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)" }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(235,233,227,0.4)", letterSpacing: "0.15em",
        }}>AUTO · LAST HOUR</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
      }}>
        {TRENDING_DATA.map((t, i) => <TrendingCard key={t.id} t={t} index={i} />)}
      </div>
    </section>
  );
}
