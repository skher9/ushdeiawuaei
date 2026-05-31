"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NOIR, type StarCount } from "./types";

/* ── City skyline SVG background ──────────────────────────── */
export function CitySkyline({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 1440 280"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, ...style }}
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0e16" />
          <stop offset="100%" stopColor="#0d1824" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="0%" r="40%">
          <stop offset="0%" stopColor="rgba(240,165,0,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="1440" height="280" fill="url(#skyGrad)" />
      <rect width="1440" height="280" fill="url(#moonGlow)" />

      {/* Moon */}
      <circle cx="200" cy="40" r="22" fill="#1a2030" stroke="rgba(240,165,0,0.4)" strokeWidth="1" />
      <circle cx="200" cy="40" r="18" fill="#0f1520" />

      {/* Buildings - back layer */}
      <rect x="0"   y="160" width="80"  height="120" fill="#0a0f18" />
      <rect x="90"  y="120" width="60"  height="160" fill="#0b1020" />
      <rect x="160" y="90"  width="100" height="190" fill="#091018" />
      <rect x="270" y="140" width="70"  height="140" fill="#0a1019" />
      <rect x="350" y="100" width="90"  height="180" fill="#080e16" />
      <rect x="450" y="80"  width="80"  height="200" fill="#0b1220" />
      <rect x="540" y="110" width="110" height="170" fill="#090f18" />
      <rect x="660" y="70"  width="100" height="210" fill="#0a1120" />
      <rect x="770" y="130" width="80"  height="150" fill="#080e16" />
      <rect x="860" y="90"  width="120" height="190" fill="#0c1322" />
      <rect x="990" y="60"  width="90"  height="220" fill="#09101a" />
      <rect x="1090" y="100" width="80" height="180" fill="#0b1220" />
      <rect x="1180" y="120" width="100" height="160" fill="#091018" />
      <rect x="1290" y="80"  width="150" height="200" fill="#0a1120" />

      {/* Building windows — teal glow */}
      {[
        [110,130],[115,145],[115,160],[95,145],
        [180,100],[185,115],[180,130],
        [370,110],[375,125],[370,140],[380,110],
        [470,90],[475,105],[470,120],[480,95],
        [670,80],[675,95],[670,110],[680,85],
        [880,100],[885,115],[890,100],[880,130],
        [1000,70],[1005,85],[1010,70],[1000,100],
        [1200,130],[1205,145],[1210,130],
      ].map(([wx, wy], i) => (
        <rect key={i} x={wx} y={wy} width="5" height="4" fill="rgba(42,157,143,0.7)" />
      ))}

      {/* Amber windows */}
      {[
        [92,135],[165,95],[355,145],[455,110],[545,120],[550,140],[665,75],[870,135],[995,65],[1100,110],
      ].map(([wx, wy], i) => (
        <rect key={i} x={wx} y={wy} width="5" height="4" fill="rgba(240,165,0,0.65)" />
      ))}

      {/* Antenna / spire details */}
      <line x1="710" y1="70" x2="710" y2="40" stroke="rgba(240,165,0,0.4)" strokeWidth="1" />
      <circle cx="710" cy="38" r="2" fill="rgba(240,165,0,0.8)" />
      <line x1="1035" y1="60" x2="1035" y2="30" stroke="rgba(42,157,143,0.5)" strokeWidth="1" />
      <circle cx="1035" cy="28" r="2" fill="rgba(42,157,143,0.8)" />

      {/* Ground shadow */}
      <rect x="0" y="270" width="1440" height="10" fill="#060a10" />
    </svg>
  );
}

/* ── Star rating display ───────────────────────────────────── */
export function StarBar({
  stars, maxStars = 3, size = 20,
}: { stars: StarCount; maxStars?: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: maxStars }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i < stars ? [1.3, 1] : 1,
            filter: i < stars ? `drop-shadow(0 0 6px ${NOIR.amber})` : "none",
          }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={i < stars ? NOIR.amber : "none"}
              stroke={i < stars ? NOIR.amber : NOIR.textFaint}
              strokeWidth="1.5"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Aha moment slide-up panel ─────────────────────────────── */
export function AhaMoment({
  title, body, complexity, onContinue,
}: {
  title: string;
  body: string;
  complexity: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: NOIR.bgPanel,
        borderTop: `1px solid ${NOIR.borderStrong}`,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: "24px 28px 32px",
        boxShadow: `0 -20px 60px rgba(0,0,0,0.7)`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: NOIR.amber, marginBottom: 8 }}>
          ◆ AHA MOMENT
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: NOIR.text, marginBottom: 10 }}>
          {title}
        </h3>
        <p style={{ fontSize: 15, color: NOIR.textDim, lineHeight: 1.7, marginBottom: 16 }}>
          {body}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint, letterSpacing: "0.14em" }}>COMPLEXITY</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: NOIR.teal }}>{complexity}</span>
          </div>
          <button
            onClick={onContinue}
            style={{
              padding: "10px 24px", borderRadius: 8, cursor: "pointer",
              background: `rgba(240,165,0,0.14)`,
              border: `1px solid ${NOIR.borderStrong}`,
              color: NOIR.amber,
              fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.08em",
            }}
          >
            CONTINUE →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Noir game layout wrapper ──────────────────────────────── */
interface NoirLayoutProps {
  gameName: string;
  levelNum: number;
  totalLevels?: number;
  xpReward: number;
  stars: StarCount;
  onBack?: () => void;
  children: React.ReactNode;
  showSkyline?: boolean;
}

export default function NoirLayout({
  gameName, levelNum, totalLevels = 8,
  xpReward, stars, onBack, children, showSkyline = true,
}: NoirLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/learn/tier1/binary-search"));

  return (
    <div style={{
      minHeight: "100vh",
      background: NOIR.bg,
      color: NOIR.text,
      fontFamily: "var(--font-tac)",
      position: "relative",
      overflow: "hidden",
    }}>
      {showSkyline && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 280, zIndex: 0, pointerEvents: "none" }}>
          <CitySkyline />
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(7,11,18,0.92)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${NOIR.border}`,
      }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: NOIR.textDim, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-tac)" }}
        >
          ← Search City
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: NOIR.textFaint }}>
            {gameName} · CASE {levelNum}/{totalLevels}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StarBar stars={stars} size={16} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.amber, letterSpacing: "0.1em" }}>
            +{xpReward} XP
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 120 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Case file card (for select screen) ────────────────────── */
export interface CaseCardProps {
  caseNum: string;
  title: string;
  difficulty: string;
  description?: string;
  levelsComplete: number;
  totalLevels: number;
  status: "available" | "active" | "completed" | "locked";
  lockTooltip?: string;
  onClick?: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  ENTRY: "#34d399",
  EASY: "#34d399",
  INTERMEDIATE: NOIR.amber,
  MEDIUM: NOIR.amber,
  ADVANCED: "#ff5a7a",
  HARD: "#ff5a7a",
};

export function CaseCard({ caseNum, title, difficulty, description, levelsComplete, totalLevels, status, lockTooltip, onClick }: CaseCardProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const diffKey = difficulty.toUpperCase();
  const diffColor = DIFFICULTY_COLORS[diffKey] ?? NOIR.textDim;

  return (
    <motion.button
      onClick={!isLocked ? onClick : undefined}
      whileHover={!isLocked ? { y: -3, boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px ${NOIR.borderStrong}` } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      title={isLocked ? lockTooltip : undefined}
      style={{
        width: "100%", textAlign: "left",
        background: isLocked
          ? "rgba(12,18,32,0.5)"
          : isCompleted
          ? "rgba(42,157,143,0.06)"
          : isActive
          ? "rgba(240,165,0,0.06)"
          : "rgba(12,18,32,0.85)",
        border: isActive
          ? `1px solid ${NOIR.borderStrong}`
          : `1px solid ${isCompleted ? "rgba(42,157,143,0.35)" : NOIR.border}`,
        boxShadow: isActive ? `0 0 18px rgba(240,165,0,0.12), inset 0 0 0 1px rgba(240,165,0,0.08)` : "none",
        borderRadius: 12,
        padding: "18px 22px 16px",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.42 : 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Case file corner fold */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 0, height: 0,
        borderStyle: "solid",
        borderWidth: "0 32px 32px 0",
        borderColor: `transparent ${isCompleted ? "rgba(42,157,143,0.3)" : "rgba(240,165,0,0.15)"} transparent transparent`,
      }} />

      {/* Difficulty stamp — top right */}
      {!isLocked && !isCompleted && !isActive && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
          letterSpacing: "0.22em", color: diffColor,
          border: `1.5px solid ${diffColor}`,
          padding: "2px 6px", borderRadius: 3,
          opacity: 0.7,
        }}>
          {difficulty.toUpperCase()}
        </div>
      )}

      {/* CASE CLOSED stamp */}
      {isCompleted && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.18em", color: "#e84a5f",
          border: `2px solid #e84a5f`,
          padding: "2px 7px", borderRadius: 3,
          transform: "rotate(-6deg)",
          opacity: 0.85,
        }}>
          CASE CLOSED
        </div>
      )}

      {/* ACTIVE CASE badge */}
      {isActive && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: "absolute", top: 10, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
            letterSpacing: "0.16em", color: NOIR.teal,
            border: `1.5px solid ${NOIR.teal}`,
            padding: "2px 7px", borderRadius: 3,
          }}
        >
          ACTIVE CASE
        </motion.div>
      )}

      {/* Lock icon */}
      {isLocked && (
        <div style={{ position: "absolute", top: 50, right: 22, fontSize: 22, opacity: 0.35 }}>🔒</div>
      )}

      {/* Header row */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.24em", color: NOIR.textFaint, marginBottom: 7 }}>
        CASE #{caseNum}
      </div>

      {/* Title */}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: isLocked ? NOIR.textFaint : NOIR.text, marginBottom: description ? 6 : 12, letterSpacing: "-0.01em" }}>
        {title}
      </div>

      {/* Description */}
      {description && (
        <div style={{ fontFamily: "var(--font-tac)", fontSize: 12, color: NOIR.textDim, marginBottom: 12, lineHeight: 1.5 }}>
          {description}
        </div>
      )}

      {/* 8 level dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: totalLevels }).map((_, i) => {
            const filled = i < levelsComplete;
            return (
              <div
                key={i}
                style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: filled
                    ? (isCompleted ? NOIR.teal : NOIR.amber)
                    : "rgba(255,255,255,0.08)",
                  border: `1px solid ${filled ? (isCompleted ? NOIR.teal : NOIR.amber) : "rgba(255,255,255,0.12)"}`,
                  boxShadow: filled ? `0 0 4px ${isCompleted ? NOIR.teal : NOIR.amber}` : "none",
                  transition: "background 0.3s",
                }}
              />
            );
          })}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.textFaint, marginLeft: 4 }}>
          {levelsComplete}/{totalLevels}
        </span>
      </div>
    </motion.button>
  );
}
