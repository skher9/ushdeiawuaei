"use client";

import {
  useEffect, useRef, useState, useCallback, useMemo
} from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { REGIONS, CONNECTIONS, WORLD_W, WORLD_H, type RegionDef } from "./regionData";

/* ── Types ───────────────────────────────────────────────── */
export type RegionStatus = "mastered" | "active" | "new" | "locked";

export interface RegionProgress {
  [id: string]: { done: number; total: number };
}

interface Props {
  progress: RegionProgress;
  xp: number;
  streak: number;
  level: string;
  initials: string;
  email: string;
  onSettings: () => void;
  onLogout: () => void;
}

/* ── Constants ───────────────────────────────────────────── */
const BUBBLE_R = 90; // bubble radius in world px
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.8;
const DEFAULT_ZOOM = 0.85;

/* ── Decorative floating code fragments ─────────────────── */
const CODE_FRAGMENTS = [
  { text: "O(log n)", x: 820, y: 320 },
  { text: "while l < r", x: 1350, y: 280 },
  { text: "visited = {}", x: 1850, y: 350 },
  { text: "dp[i] = ∞", x: 1400, y: 1350 },
  { text: "queue.pop()", x: 900, y: 750 },
  { text: "mid = (l+r)>>1", x: 350, y: 700 },
  { text: "root.left", x: 800, y: 1100 },
  { text: "backtrack()", x: 1300, y: 1200 },
  { text: "trie.insert(w)", x: 1900, y: 800 },
  { text: "graph[u].push(v)", x: 2300, y: 650 },
  { text: "O(n!)", x: 2000, y: 1100 },
  { text: "memo[i][j]", x: 1800, y: 1700 },
  { text: "prefix[i]", x: 1200, y: 620 },
  { text: "stack = []", x: 700, y: 1300 },
  { text: "node.next", x: 2400, y: 950 },
];

/* ── Nebula blobs (decorative radial gradients) ──────────── */
const NEBULAS = [
  { x: 900, y: 700, w: 600, h: 400, color: "rgba(0,229,255,0.06)" },
  { x: 1800, y: 200, w: 800, h: 500, color: "rgba(167,139,250,0.05)" },
  { x: 2300, y: 1100, w: 700, h: 500, color: "rgba(0,229,255,0.04)" },
  { x: 1400, y: 1400, w: 900, h: 600, color: "rgba(99,102,241,0.05)" },
];

/* ── Landmark icons per region ───────────────────────────── */
const LANDMARKS: Record<string, { icon: string; dx: number; dy: number }> = {
  "binary-search":       { icon: "🔍", dx: 80,  dy: -80 },
  "two-pointers":        { icon: "⇄",  dx: -80, dy: 70  },
  "sliding-window":      { icon: "▭",  dx: 90,  dy: 60  },
  "graphs":              { icon: "◎",  dx: -70, dy: -70 },
  "trees":               { icon: "⟁",  dx: 80,  dy: 80  },
  "backtracking":        { icon: "↺",  dx: -90, dy: 60  },
  "tries":               { icon: "⌥",  dx: 75,  dy: -75 },
  "dynamic-programming": { icon: "▦",  dx: -80, dy: -80 },
  "arena":               { icon: "⚔",  dx: 0,   dy: -100},
};

/* ═══════════════════════════════════════════════════════════
   StarfieldCanvas — parallax background
═══════════════════════════════════════════════════════════ */
interface Star { x: number; y: number; r: number; opacity: number; twinkle: boolean }

function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate stars
    const stars: Star[] = Array.from({ length: 400 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() < 0.05 ? 1.8 : Math.random() < 0.2 ? 1.2 : 0.6,
      opacity: 0.15 + Math.random() * 0.65,
      twinkle: Math.random() < 0.15,
    }));

    let frame = 0;
    let animId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        let op = s.opacity;
        if (s.twinkle) {
          op = s.opacity * (0.5 + 0.5 * Math.sin(frame * 0.03 + s.x));
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,235,255,${op.toFixed(3)})`;
        ctx.fill();
      }
      frame++;
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [canvasRef]);
}

/* ═══════════════════════════════════════════════════════════
   PathLines — SVG connections between regions
═══════════════════════════════════════════════════════════ */
interface PathLinesProps {
  statuses: Record<string, RegionStatus>;
}

function PathLines({ statuses }: PathLinesProps) {
  return (
    <svg
      width={WORLD_W}
      height={WORLD_H}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <defs>
        <filter id="path-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <style>{`
          @keyframes dashflow {
            to { stroke-dashoffset: -40; }
          }
          .path-active {
            animation: dashflow 2s linear infinite;
          }
        `}</style>
      </defs>
      {CONNECTIONS.map(([fromId, toId]) => {
        const from = REGIONS.find(r => r.id === fromId);
        const to = REGIONS.find(r => r.id === toId);
        if (!from || !to) return null;

        const fromStatus = statuses[fromId] ?? "locked";
        const toStatus = statuses[toId] ?? "locked";
        const isActive = fromStatus !== "locked" || toStatus !== "locked";
        const isCompleted = fromStatus === "mastered" && toStatus !== "locked";

        // Quadratic bezier control point: midpoint offset
        const mx = (from.wx + to.wx) / 2;
        const my = (from.wy + to.wy) / 2;
        const dx = to.wx - from.wx;
        const dy = to.wy - from.wy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const cx = mx - (dy / len) * 60;
        const cy = my + (dx / len) * 60;

        const d = `M ${from.wx} ${from.wy} Q ${cx} ${cy} ${to.wx} ${to.wy}`;

        if (!isActive) {
          return (
            <path
              key={`${fromId}-${toId}`}
              d={d}
              fill="none"
              stroke="rgba(0,229,255,0.10)"
              strokeWidth={1}
              strokeDasharray="6 8"
            />
          );
        }

        if (isCompleted) {
          return (
            <path
              key={`${fromId}-${toId}`}
              d={d}
              fill="none"
              stroke="rgba(0,229,255,0.6)"
              strokeWidth={1.5}
              filter="url(#path-glow)"
            />
          );
        }

        // Active but not completed — animated dashes
        return (
          <path
            key={`${fromId}-${toId}`}
            d={d}
            fill="none"
            stroke="rgba(0,229,255,0.4)"
            strokeWidth={1.5}
            strokeDasharray="8 10"
            strokeDashoffset={0}
            className="path-active"
            filter="url(#path-glow)"
          />
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   RegionTooltip
═══════════════════════════════════════════════════════════ */
interface TooltipData {
  region: RegionDef;
  status: RegionStatus;
  done: number;
  screenX: number;
  screenY: number;
}

function RegionTooltip({ data, onEnter }: { data: TooltipData; onEnter: () => void }) {
  const { region, status, done, screenX, screenY } = data;
  const locked = status === "locked";
  const mastered = status === "mastered";

  // Position tooltip: prefer right of bubble, avoid edge
  const tipW = 260;
  const tipH = 180;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  let left = screenX + BUBBLE_R * 1.1;
  let top = screenY - tipH / 2;
  if (left + tipW > vw - 20) left = screenX - BUBBLE_R * 1.1 - tipW;
  top = Math.max(16, Math.min(top, vh - tipH - 16));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed",
        left, top,
        width: tipW,
        pointerEvents: "auto",
        zIndex: 200,
        background: "rgba(6,8,20,0.92)",
        border: `1px solid ${mastered ? "rgba(52,211,153,0.45)" : locked ? "rgba(255,255,255,0.08)" : "rgba(0,229,255,0.3)"}`,
        borderRadius: 14,
        padding: "14px 16px",
        backdropFilter: "blur(16px)",
        boxShadow: locked ? "none" : "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.08)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-4)" }}>
          REGION {region.roman}
        </div>
        {mastered && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#34d399", letterSpacing: "0.1em" }}>
            ✓ MASTERED
          </span>
        )}
        {locked && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
            LOCKED
          </span>
        )}
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em", marginBottom: 4 }}>
        {region.name}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 12 }}>
        {region.description}
      </div>

      {/* Progress */}
      {region.totalLevels > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {Array.from({ length: region.totalLevels }).map((_, i) => (
              <div key={i} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i < done ? (mastered ? "#34d399" : "var(--cyan)") : "rgba(255,255,255,0.1)",
                boxShadow: i < done && !mastered ? "0 0 6px rgba(0,229,255,0.5)" : "none",
              }} />
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>
            {done}/{region.totalLevels} levels · +{region.xp} XP
          </div>
        </div>
      )}

      {!locked && region.id !== "arena" && (
        <button
          onClick={onEnter}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 8, cursor: "pointer",
            background: mastered ? "rgba(52,211,153,0.12)" : "rgba(0,229,255,0.12)",
            border: `1px solid ${mastered ? "rgba(52,211,153,0.4)" : "rgba(0,229,255,0.4)"}`,
            color: mastered ? "#34d399" : "var(--cyan)",
            fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 13,
            letterSpacing: "0.06em",
          }}
        >
          {mastered ? "REPLAY" : status === "active" ? "CONTINUE →" : "ENTER →"}
        </button>
      )}

      {region.id === "arena" && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", textAlign: "center", letterSpacing: "0.1em" }}>
          REQUIRES 3+ COMPLETED REGIONS
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RegionBubble
═══════════════════════════════════════════════════════════ */
interface BubbleProps {
  region: RegionDef;
  status: RegionStatus;
  done: number;
  isCurrent: boolean;
  transform: { x: number; y: number; k: number };
  onHover: (data: TooltipData | null) => void;
  onEnter: () => void;
}

function RegionBubble({ region, status, done, isCurrent, transform, onHover, onEnter }: BubbleProps) {
  const locked = status === "locked";
  const mastered = status === "mastered";
  const isArena = region.id === "arena";
  const [hovered, setHovered] = useState(false);

  const borderColor = mastered
    ? "rgba(52,211,153,0.8)"
    : locked ? "rgba(255,255,255,0.12)"
    : isCurrent ? "transparent"
    : "rgba(0,229,255,0.45)";

  const bgColor = mastered
    ? "rgba(52,211,153,0.08)"
    : locked ? "rgba(10,12,24,0.9)"
    : isArena ? "rgba(255,46,147,0.05)"
    : "rgba(6,8,20,0.88)";

  const glowColor = mastered
    ? "rgba(52,211,153,0.25)"
    : isCurrent ? "rgba(0,229,255,0.35)"
    : "rgba(0,229,255,0.18)";

  const D = BUBBLE_R * 2;

  // Convert world coords to screen coords for tooltip
  const toScreen = useCallback(() => {
    const sx = region.wx * transform.k + transform.x;
    const sy = region.wy * transform.k + transform.y;
    return { screenX: sx, screenY: sy };
  }, [region.wx, region.wy, transform]);

  const handleEnter = () => {
    const { screenX, screenY } = toScreen();
    onHover({
      region, status, done,
      screenX: screenX / transform.k * transform.k, // screen coords
      screenY: screenY / transform.k * transform.k,
    });
    setHovered(true);
  };

  const handleLeave = () => {
    setHovered(false);
    // Delay so mouse can move into tooltip
    setTimeout(() => onHover(null), 300);
  };

  return (
    <motion.div
      animate={{
        scale: isCurrent ? 1.05 : hovered && !locked ? 1.04 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        position: "absolute",
        left: region.wx - BUBBLE_R,
        top: region.wy - BUBBLE_R,
        width: D,
        height: D,
        cursor: locked ? "not-allowed" : "pointer",
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => !locked && region.id !== "arena" && onEnter()}
    >
      {/* Glow ring */}
      {!locked && (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: isCurrent ? 1.8 : 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: region.blobRadius,
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Rotating gradient border for current region */}
      {isCurrent && !locked && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: region.blobRadius,
            background: "conic-gradient(from 0deg, rgba(0,229,255,0.8), rgba(167,139,250,0.8), rgba(0,229,255,0), rgba(0,229,255,0.8))",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main bubble */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: region.blobRadius,
        background: bgColor,
        border: isCurrent ? "none" : `1.5px solid ${borderColor}`,
        opacity: locked ? 0.45 : 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "14px 10px 10px",
        gap: 2,
      }}>
        {/* Roman numeral + tier */}
        <div style={{
          position: "absolute", top: 10, left: 12,
          fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.16em",
          color: locked ? "var(--ink-4)" : mastered ? "#34d399" : "var(--cyan)",
        }}>
          {region.roman}
        </div>

        {/* Mastered checkmark */}
        {mastered && (
          <div style={{ position: "absolute", top: 10, right: 12, fontSize: 14 }}>✓</div>
        )}

        {/* Lock icon */}
        {locked && (
          <div style={{ position: "absolute", top: 10, right: 12, color: "var(--ink-4)", fontSize: 14 }}>
            🔒
          </div>
        )}

        {/* Icon */}
        {!isArena && (
          <div style={{ fontSize: 20, marginBottom: 2, opacity: locked ? 0.4 : 0.8 }}>
            {region.icon}
          </div>
        )}

        {/* Name */}
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: isArena ? 11 : 13,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          color: locked ? "rgba(232,244,255,0.3)" : "var(--ink)",
          textAlign: "center",
          lineHeight: 1.2,
        }}>
          {region.name}
        </div>

        {/* Subname */}
        <div style={{
          fontFamily: "var(--font-tac)",
          fontSize: 10,
          fontStyle: "italic",
          color: locked ? "rgba(232,244,255,0.18)" : "var(--ink-4)",
          marginBottom: region.totalLevels > 0 ? 4 : 0,
        }}>
          {region.subname}
        </div>

        {/* Progress dots */}
        {region.totalLevels > 0 && !locked && (
          <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
            {Array.from({ length: region.totalLevels }).map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: i < done
                  ? (mastered ? "#34d399" : "var(--cyan)")
                  : "rgba(255,255,255,0.12)",
                boxShadow: i < done && !mastered ? "0 0 5px rgba(0,229,255,0.6)" : "none",
              }} />
            ))}
          </div>
        )}

        {/* Arena special label */}
        {isArena && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(255,46,147,0.6)" }}>
            LOCKED · 3 REQUIRED
          </div>
        )}
      </div>

      {/* YOU ARE HERE label */}
      {isCurrent && !locked && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: -28, left: "50%", transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            color: "var(--cyan)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          ◆ YOU ARE HERE
        </motion.div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Minimap
═══════════════════════════════════════════════════════════ */
const MINI_W = 200;
const MINI_H = 150;
const MINI_SX = MINI_W / WORLD_W;
const MINI_SY = MINI_H / WORLD_H;

interface MinimapProps {
  transform: { x: number; y: number; k: number };
  statuses: Record<string, RegionStatus>;
  onJump: (wx: number, wy: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}

function Minimap({ transform, statuses, onJump, collapsed, onToggle }: MinimapProps) {
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vpH = typeof window !== "undefined" ? window.innerHeight : 900;

  // Viewport rect in world coords
  const wx0 = -transform.x / transform.k;
  const wy0 = -transform.y / transform.k;
  const ww = vpW / transform.k;
  const wh = vpH / transform.k;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / MINI_SX;
    const my = (e.clientY - rect.top) / MINI_SY;
    onJump(mx, my);
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 24, right: 24,
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 6,
    }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          padding: "4px 10px",
          background: "rgba(6,8,20,0.8)",
          border: "1px solid rgba(0,229,255,0.2)",
          borderRadius: 6,
          color: "var(--ink-4)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.12em",
          cursor: "pointer",
        }}
      >
        {collapsed ? "MINIMAP ▲" : "▼ HIDE"}
      </button>

      {!collapsed && (
        <div
          onClick={handleClick}
          style={{
            width: MINI_W, height: MINI_H,
            background: "rgba(4,6,16,0.88)",
            border: "1px solid rgba(0,229,255,0.18)",
            borderRadius: 8,
            position: "relative",
            overflow: "hidden",
            cursor: "crosshair",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Grid dot */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(0,229,255,0.25) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            opacity: 0.3,
          }} />

          {/* Region dots */}
          {REGIONS.map(r => {
            const s = statuses[r.id] ?? "locked";
            const color = s === "mastered" ? "#34d399"
              : s === "locked" ? "rgba(255,255,255,0.2)"
              : s === "active" ? "var(--cyan)"
              : "rgba(0,229,255,0.45)";
            return (
              <div key={r.id} style={{
                position: "absolute",
                left: r.wx * MINI_SX - 3,
                top: r.wy * MINI_SY - 3,
                width: r.id === "arena" ? 8 : 6,
                height: r.id === "arena" ? 8 : 6,
                borderRadius: "50%",
                background: color,
                boxShadow: s !== "locked" ? `0 0 6px ${color}` : "none",
              }} />
            );
          })}

          {/* Viewport rect */}
          <div style={{
            position: "absolute",
            left: Math.max(0, wx0 * MINI_SX),
            top: Math.max(0, wy0 * MINI_SY),
            width: Math.min(ww * MINI_SX, MINI_W),
            height: Math.min(wh * MINI_SY, MINI_H),
            border: "1px solid rgba(0,229,255,0.6)",
            background: "rgba(0,229,255,0.06)",
            borderRadius: 2,
            pointerEvents: "none",
          }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HUD Bar
═══════════════════════════════════════════════════════════ */
interface HUDProps {
  xp: number;
  streak: number;
  level: string;
  initials: string;
  onSettings: () => void;
  onLogout: () => void;
}

function HUDBar({ xp, streak, level, initials, onSettings, onLogout }: HUDProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 150,
      height: 56, display: "flex", alignItems: "center", padding: "0 24px",
      background: "rgba(6,8,20,0.85)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(0,229,255,0.1)",
      fontFamily: "var(--font-tac)",
    }}>
      {/* Logo */}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
        <span style={{ color: "var(--cyan)", textShadow: "0 0 14px rgba(0,229,255,0.4)" }}>brain</span>
        <span style={{ color: "var(--ink)" }}>rot</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-4)", marginLeft: 5, letterSpacing: "0.1em" }}>v.7</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {/* XP */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.22)", color: "var(--gold)" }}>
          <span style={{ fontSize: 11 }}>⚡</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{xp.toLocaleString()}</span>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.22)", color: "var(--gold)" }}>
            <span style={{ fontSize: 11 }}>🔥</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{streak}</span>
          </div>
        )}

        {/* Avatar */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: menuOpen ? "rgba(0,229,255,0.3)" : "rgba(0,229,255,0.15)",
              border: `1.5px solid ${menuOpen ? "rgba(0,229,255,0.7)" : "rgba(0,229,255,0.4)"}`,
              cursor: "pointer", fontFamily: "var(--font-display)",
              fontSize: 13, fontWeight: 700,
              color: menuOpen ? "var(--cyan)" : "var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {initials}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -3, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  minWidth: 160, background: "rgba(10,12,28,0.98)",
                  border: "1px solid rgba(0,229,255,0.18)", borderRadius: 10,
                  overflow: "hidden", boxShadow: "0 12px 36px rgba(0,0,0,0.6)", zIndex: 200,
                }}
              >
                <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", color: "var(--ink-4)", padding: "4px 4px 2px" }}>{level}</div>
                </div>
                <div style={{ padding: "4px" }}>
                  <button onClick={() => { setMenuOpen(false); onSettings(); }} style={menuItemStyle}>Settings</button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "2px 0" }} />
                  <button onClick={onLogout} style={{ ...menuItemStyle, color: "rgba(255,120,160,0.75)" }}>Sign out</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: 8,
  padding: "8px 10px", borderRadius: 6, background: "transparent",
  border: "none", cursor: "pointer", color: "rgba(232,244,255,0.75)",
  fontFamily: "var(--font-tac)", fontSize: 13, textAlign: "left",
};

/* ═══════════════════════════════════════════════════════════
   Daily Run Banner
═══════════════════════════════════════════════════════════ */
function DailyRunBanner({ streak, onBegin }: { streak: number; onBegin: () => void }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "12px 20px",
      background: "rgba(6,8,20,0.88)",
      border: "1px solid rgba(0,229,255,0.22)",
      borderRadius: 999,
      backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 16 }}>🔥</span>
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--gold)", marginBottom: 2 }}>
          DAILY RUN
        </div>
        <div style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: "var(--ink-2)" }}>
          {streak}-day streak · 5-min pattern sprint
        </div>
      </div>
      <button
        onClick={onBegin}
        style={{
          padding: "8px 18px", borderRadius: 8, cursor: "pointer",
          background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.45)",
          color: "var(--cyan)", fontFamily: "var(--font-tac)", fontWeight: 700,
          fontSize: 13, letterSpacing: "0.06em",
        }}
      >
        BEGIN
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WorldMap — main component
═══════════════════════════════════════════════════════════ */
export default function WorldMap({
  progress, xp, streak, level, initials, email: _email,
  onSettings, onLogout,
}: Props) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: DEFAULT_ZOOM });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [minimapCollapsed, setMinimapCollapsed] = useState(false);

  useStarfield(starfieldRef as React.RefObject<HTMLCanvasElement | null>);

  /* Compute statuses */
  const statuses = useMemo<Record<string, RegionStatus>>(() => {
    const result: Record<string, RegionStatus> = {};
    const masteredCount = Object.values(progress).filter(p => p.done >= p.total && p.total > 0).length;

    for (const r of REGIONS) {
      const p = progress[r.id];
      const done = p?.done ?? 0;
      const total = p?.total ?? r.totalLevels;

      if (r.id === "arena") {
        result[r.id] = masteredCount >= 3 ? "new" : "locked";
        continue;
      }

      if (r.unlockRequires) {
        const req = progress[r.unlockRequires];
        const reqDone = req?.done ?? 0;
        if (reqDone === 0) {
          result[r.id] = "locked";
          continue;
        }
      }

      if (done >= total && total > 0) result[r.id] = "mastered";
      else if (done > 0) result[r.id] = "active";
      else result[r.id] = "new";
    }
    return result;
  }, [progress]);

  /* Current region: the first active one, else first new */
  const currentRegionId = useMemo(() => {
    const active = REGIONS.find(r => statuses[r.id] === "active");
    if (active) return active.id;
    const next = REGIONS.find(r => statuses[r.id] === "new");
    return next?.id ?? "binary-search";
  }, [statuses]);

  /* Jump camera to world coordinates */
  const jumpTo = useCallback((wx: number, wy: number, scale?: number) => {
    if (!viewportRef.current || !zoomRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const k = scale ?? transformRef.current.k;
    const tx = vw / 2 - wx * k;
    const ty = vh / 2 - wy * k;
    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
    d3.select(viewportRef.current)
      .transition()
      .duration(600)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, newTransform);
  }, []);

  /* Minimap click */
  const handleMinimapJump = useCallback((wx: number, wy: number) => {
    jumpTo(wx, wy);
  }, [jumpTo]);

  /* Region enter */
  const handleEnterRegion = useCallback((href: string, rx: number, ry: number) => {
    setTooltip(null);
    // Camera zoom in then navigate
    if (viewportRef.current && zoomRef.current) {
      const vw = viewportRef.current.clientWidth;
      const vh = viewportRef.current.clientHeight;
      const k = 1.4;
      const tx = vw / 2 - rx * k;
      const ty = vh / 2 - ry * k;
      const newT = d3.zoomIdentity.translate(tx, ty).scale(k);
      d3.select(viewportRef.current)
        .transition()
        .duration(400)
        .ease(d3.easeCubicIn)
        .call(zoomRef.current.transform, newT)
        .on("end", () => router.push(href));
    } else {
      router.push(href);
    }
  }, [router]);

  /* d3 zoom setup */
  useEffect(() => {
    if (!viewportRef.current || !worldRef.current) return;
    const viewport = viewportRef.current;
    const world = worldRef.current;
    const starfield = starfieldRef.current;

    const updateTransform = (t: d3.ZoomTransform) => {
      transformRef.current = t;
      world.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
      world.style.transformOrigin = "0 0";
      if (starfield) {
        starfield.style.transform = `translate(${t.x * 0.82}px,${t.y * 0.82}px)`;
      }
      setTransform({ x: t.x, y: t.y, k: t.k });
    };

    const z = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", ({ transform: t }) => updateTransform(t));

    d3.select(viewport).call(z);
    zoomRef.current = z;

    // Initial position
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const hasSeenIntro = typeof localStorage !== "undefined" && localStorage.getItem("brainrot_map_intro_seen");

    if (!hasSeenIntro) {
      localStorage.setItem("brainrot_map_intro_seen", "1");
      // Start zoomed out showing full world
      const k0 = Math.min(vw / WORLD_W, vh / WORLD_H) * 0.9;
      const tx0 = (vw - WORLD_W * k0) / 2;
      const ty0 = (vh - WORLD_H * k0) / 2;
      const startTransform = d3.zoomIdentity.translate(tx0, ty0).scale(k0);
      d3.select(viewport).call(z.transform, startTransform);
      updateTransform(startTransform);

      // Zoom to Region I after 2s
      setTimeout(() => {
        const regionI = REGIONS[0];
        const k = DEFAULT_ZOOM;
        const tx = vw / 2 - regionI.wx * k;
        const ty = vh / 2 - regionI.wy * k;
        const target = d3.zoomIdentity.translate(tx, ty).scale(k);
        d3.select(viewport)
          .transition()
          .duration(1600)
          .ease(d3.easeCubicInOut)
          .call(z.transform, target);
      }, 2000);
    } else {
      // Jump directly to current region
      const regionI = REGIONS[0];
      const k = DEFAULT_ZOOM;
      const tx = vw / 2 - regionI.wx * k;
      const ty = vh / 2 - regionI.wy * k;
      const init = d3.zoomIdentity.translate(tx, ty).scale(k);
      d3.select(viewport).call(z.transform, init);
      updateTransform(init);
    }

    return () => {
      d3.select(viewport).on(".zoom", null);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#020612", userSelect: "none" }}>
      {/* Starfield canvas (parallax, viewport-sized) */}
      <canvas
        ref={starfieldRef}
        style={{
          position: "absolute", inset: 0,
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* Viewport: captures pan/zoom events */}
      <div
        ref={viewportRef}
        style={{
          position: "absolute", inset: 0,
          overflow: "hidden",
          cursor: "grab",
          zIndex: 1,
        }}
      >
        {/* World canvas: 4000×3000 */}
        <div
          ref={worldRef}
          style={{
            position: "absolute",
            width: WORLD_W,
            height: WORLD_H,
            willChange: "transform",
          }}
        >
          {/* Dot grid background */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(0,229,255,0.18) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.04,
            pointerEvents: "none",
          }} />

          {/* Nebula blobs */}
          {NEBULAS.map((n, i) => (
            <div key={i} style={{
              position: "absolute",
              left: n.x - n.w / 2, top: n.y - n.h / 2,
              width: n.w, height: n.h,
              background: `radial-gradient(ellipse, ${n.color}, transparent 70%)`,
              pointerEvents: "none",
              borderRadius: "50%",
              filter: "blur(40px)",
            }} />
          ))}

          {/* Path lines SVG */}
          <PathLines statuses={statuses} />

          {/* Floating code fragments */}
          {CODE_FRAGMENTS.map((f, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -30, 0] }}
              transition={{
                duration: 12 + i * 2.3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 1.1,
              }}
              style={{
                position: "absolute",
                left: f.x, top: f.y,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "rgba(0,229,255,0.55)",
                opacity: 0.09 + (i % 3) * 0.02,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                letterSpacing: "0.04em",
              }}
            >
              {f.text}
            </motion.div>
          ))}

          {/* Landmark icons */}
          {REGIONS.map(r => {
            const lm = LANDMARKS[r.id];
            if (!lm) return null;
            return (
              <div key={r.id + "-lm"} style={{
                position: "absolute",
                left: r.wx + lm.dx - 10,
                top: r.wy + lm.dy - 10,
                fontSize: 18,
                opacity: 0.18,
                pointerEvents: "none",
                filter: "grayscale(0.5)",
              }}>
                {lm.icon}
              </div>
            );
          })}

          {/* Region bubbles */}
          {REGIONS.map(r => {
            const status = statuses[r.id] ?? "locked";
            const prog = progress[r.id];
            const done = prog?.done ?? 0;
            return (
              <RegionBubble
                key={r.id}
                region={r}
                status={status}
                done={done}
                isCurrent={r.id === currentRegionId}
                transform={transform}
                onHover={(data) => {
                  if (data) {
                    // recalculate screen position
                    const sx = r.wx * transform.k + transform.x;
                    const sy = r.wy * transform.k + transform.y;
                    setTooltip({ ...data, screenX: sx, screenY: sy });
                  } else {
                    setTooltip(null);
                  }
                }}
                onEnter={() => handleEnterRegion(r.href, r.wx, r.wy)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Fixed overlays ── */}
      <HUDBar
        xp={xp} streak={streak} level={level}
        initials={initials}
        onSettings={onSettings} onLogout={onLogout}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <RegionTooltip
            data={tooltip}
            onEnter={() => {
              const r = REGIONS.find(x => x.id === tooltip.region.id);
              if (r) handleEnterRegion(r.href, r.wx, r.wy);
            }}
          />
        )}
      </AnimatePresence>

      {/* Minimap */}
      <Minimap
        transform={transform}
        statuses={statuses}
        onJump={handleMinimapJump}
        collapsed={minimapCollapsed}
        onToggle={() => setMinimapCollapsed(c => !c)}
      />

      {/* Daily Run Banner */}
      <DailyRunBanner
        streak={streak}
        onBegin={() => {
          const r = REGIONS.find(x => x.id === currentRegionId);
          if (r) router.push(r.href);
        }}
      />
    </div>
  );
}
