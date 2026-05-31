"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DOCK, type StarCount } from "./types";

/* ── Harbor skyline SVG ──────────────────────────────────── */
export function HarborSkyline({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 1440 320"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", ...style }}
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050a14" />
          <stop offset="100%" stopColor="#040d1e" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#041020" />
          <stop offset="100%" stopColor="#020810" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="50%" cy="10%" r="35%">
          <stop offset="0%" stopColor="rgba(0,180,200,0.07)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="1440" height="320" fill="url(#skyGrad)" />
      <rect width="1440" height="320" fill="url(#moonGlow)" />

      {/* Stars */}
      {[[120,20],[340,35],[560,15],[780,40],[1000,22],[1200,38],[1380,18],[240,55],[680,48],[1100,60]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1" fill="rgba(200,230,255,0.5)" />
      ))}

      {/* Industrial buildings — back layer */}
      <rect x="300"  y="190" width="60"  height="80"  fill="#050e1a" />
      <rect x="370"  y="170" width="80"  height="100" fill="#060f1c" />
      <rect x="460"  y="150" width="120" height="120" fill="#040c18" />
      <rect x="590"  y="180" width="70"  height="90"  fill="#050e1a" />
      <rect x="670"  y="155" width="100" height="115" fill="#040d1b" />
      <rect x="780"  y="175" width="80"  height="95"  fill="#060e1c" />
      <rect x="870"  y="145" width="130" height="125" fill="#040c18" />
      <rect x="1010" y="185" width="75"  height="85"  fill="#050f1a" />
      <rect x="1090" y="160" width="90"  height="110" fill="#060e1c" />

      {/* Building lights */}
      {[[315,200],[315,215],[320,230],[380,180],[385,195],[475,160],[480,175],[480,190],[600,190],[685,165],[695,165],[690,180],[795,185],[885,155],[890,170],[895,155],[1020,195],[1100,170],[1105,185]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="5" height="4" fill={i%3===0 ? "rgba(0,180,200,0.65)" : "rgba(240,165,0,0.55)"} />
      ))}

      {/* Dock platform */}
      <rect x="0" y="265" width="1440" height="25" fill="#061018" />
      <rect x="0" y="265" width="1440" height="3"  fill="rgba(0,180,200,0.15)" />

      {/* ── LEFT CRANE (blue) ── */}
      {/* Main mast */}
      <rect x="120" y="60" width="12" height="205" fill="#0a1828" stroke="rgba(68,136,255,0.4)" strokeWidth="1" />
      {/* Horizontal jib extending right */}
      <rect x="120" y="60" width="200" height="8" fill="#0a1828" stroke="rgba(68,136,255,0.35)" strokeWidth="1" />
      {/* Counter-jib left */}
      <rect x="80"  y="60" width="42"  height="6"  fill="#0a1828" stroke="rgba(68,136,255,0.25)" strokeWidth="1" />
      {/* Cab box */}
      <rect x="118" y="80" width="28" height="22" fill="#0c1e2e" stroke="rgba(68,136,255,0.5)" strokeWidth="1" />
      <rect x="122" y="84" width="8"  height="6"  fill="rgba(68,136,255,0.7)" /> {/* cab window */}
      {/* Cable from jib tip */}
      <line x1="316" y1="68" x2="316" y2="200" stroke="rgba(68,136,255,0.5)" strokeWidth="1.5" strokeDasharray="3,2" />
      {/* Hook */}
      <rect x="310" y="200" width="12" height="8" rx="2" fill="#0c1e2e" stroke="rgba(68,136,255,0.8)" strokeWidth="1.5" />
      {/* Legs */}
      <line x1="126" y1="265" x2="100" y2="290" stroke="#061018" strokeWidth="4" />
      <line x1="126" y1="265" x2="152" y2="290" stroke="#061018" strokeWidth="4" />
      {/* Crane glow */}
      <ellipse cx="130" cy="170" rx="40" ry="120" fill="rgba(41,121,255,0.04)" />

      {/* ── RIGHT CRANE (red) ── */}
      {/* Main mast */}
      <rect x="1308" y="55" width="12" height="210" fill="#0a1828" stroke="rgba(255,61,90,0.4)" strokeWidth="1" />
      {/* Horizontal jib extending left */}
      <rect x="1120" y="55" width="200" height="8" fill="#0a1828" stroke="rgba(255,61,90,0.35)" strokeWidth="1" />
      {/* Counter-jib right */}
      <rect x="1318" y="55" width="42" height="6" fill="#0a1828" stroke="rgba(255,61,90,0.25)" strokeWidth="1" />
      {/* Cab */}
      <rect x="1306" y="75" width="28" height="22" fill="#1e0c12" stroke="rgba(255,61,90,0.5)" strokeWidth="1" />
      <rect x="1308" y="79" width="8"  height="6"  fill="rgba(255,61,90,0.7)" />
      {/* Cable */}
      <line x1="1124" y1="63" x2="1124" y2="195" stroke="rgba(255,61,90,0.5)" strokeWidth="1.5" strokeDasharray="3,2" />
      {/* Hook */}
      <rect x="1118" y="195" width="12" height="8" rx="2" fill="#1e0c12" stroke="rgba(255,61,90,0.8)" strokeWidth="1.5" />
      {/* Legs */}
      <line x1="1314" y1="265" x2="1288" y2="290" stroke="#061018" strokeWidth="4" />
      <line x1="1314" y1="265" x2="1340" y2="290" stroke="#061018" strokeWidth="4" />
      {/* Crane glow */}
      <ellipse cx="1310" cy="165" rx="40" ry="120" fill="rgba(255,61,90,0.04)" />

      {/* Dock bollards */}
      {[200,400,600,800,1000,1200].map((x, i) => (
        <rect key={i} x={x} y="258" width="10" height="14" rx="2" fill="#081420" stroke="rgba(0,180,200,0.2)" strokeWidth="1" />
      ))}

      {/* Water */}
      <rect x="0" y="290" width="1440" height="30" fill="url(#waterGrad)" />
      <rect x="0" y="290" width="1440" height="3"  fill="rgba(0,180,200,0.1)" />

      {/* Water reflection ripples */}
      {[200,500,800,1100,1350].map((x, i) => (
        <ellipse key={i} cx={x} cy={300} rx={30+i*10} ry={3} fill="none" stroke="rgba(0,180,200,0.08)" strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ── Star bar ────────────────────────────────────────────── */
export function StarBar({ stars, size = 20 }: { stars: StarCount; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div key={i} initial={false}
          animate={{ scale: i < stars ? [1.3, 1] : 1, filter: i < stars ? `drop-shadow(0 0 5px ${DOCK.amber})` : "none" }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={i < stars ? DOCK.amber : "none"}
              stroke={i < stars ? DOCK.amber : DOCK.textFaint} strokeWidth="1.5" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Aha moment panel ────────────────────────────────────── */
export function AhaMoment({ title, body, complexity, onContinue }: {
  title: string; body: string; complexity: string; onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: DOCK.bgPanel,
        borderTop: `1px solid ${DOCK.borderBlue}`,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: "24px 28px 32px",
        boxShadow: `0 -20px 60px rgba(0,0,0,0.7)`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: DOCK.cyan, marginBottom: 8 }}>
          ◆ AHA MOMENT
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: DOCK.text, marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 14, color: DOCK.textDim, lineHeight: 1.7, marginBottom: 16 }}>{body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.textFaint, letterSpacing: "0.14em" }}>COMPLEXITY</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: DOCK.cyan }}>{complexity}</span>
          </div>
          <button
            onClick={onContinue}
            style={{
              padding: "10px 24px", borderRadius: 8, cursor: "pointer",
              background: "rgba(0,180,200,0.1)", border: `1px solid ${DOCK.borderBlue}`,
              color: DOCK.cyan, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
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

/* ── Dock game layout wrapper ────────────────────────────── */
interface DockLayoutProps {
  gameName: string;
  levelNum: number;
  totalLevels?: number;
  xpReward: number;
  stars: StarCount;
  onBack?: () => void;
  children: React.ReactNode;
  showSkyline?: boolean;
}

export default function DockLayout({
  gameName, levelNum, totalLevels = 8,
  xpReward, stars, onBack, children, showSkyline = true,
}: DockLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/learn/tier1/two-pointers"));

  return (
    <div style={{ minHeight: "100vh", background: DOCK.bg, color: DOCK.text, fontFamily: "var(--font-tac)", position: "relative", overflow: "hidden" }}>
      {showSkyline && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 320, zIndex: 0, pointerEvents: "none" }}>
          <HarborSkyline />
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(5,10,20,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${DOCK.border}`,
      }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: DOCK.textDim, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-tac)" }}
        >
          ← Pointer Docks
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: DOCK.textFaint }}>
            {gameName} · MANIFEST {levelNum}/{totalLevels}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StarBar stars={stars} size={16} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber, letterSpacing: "0.1em" }}>
            +{xpReward} XP
          </div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 120 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Manifest card (for game select) ────────────────────── */
export interface ManifestCardProps {
  manifestNum: string;
  title: string;
  description: string;
  levelsComplete: number;
  totalLevels: number;
  status: "available" | "active" | "completed" | "locked";
  lockTooltip?: string;
  onClick?: () => void;
}

export function ManifestCard({
  manifestNum, title, description, levelsComplete, totalLevels,
  status, lockTooltip, onClick,
}: ManifestCardProps) {
  const isLocked    = status === "locked";
  const isCompleted = status === "completed";
  const isActive    = status === "active";

  return (
    <motion.button
      onClick={!isLocked ? onClick : undefined}
      whileHover={!isLocked ? { y: -3, boxShadow: `0 8px 28px rgba(0,0,0,0.5)` } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      title={isLocked ? lockTooltip : undefined}
      style={{
        width: "100%", textAlign: "left",
        background: isLocked
          ? "rgba(8,14,26,0.6)"
          : isCompleted
          ? "rgba(0,100,80,0.08)"
          : isActive
          ? "rgba(0,100,160,0.07)"
          : "rgba(10,16,32,0.85)",
        border: `1px solid ${isCompleted ? "rgba(52,211,153,0.35)" : isActive ? DOCK.borderBlue : DOCK.border}`,
        boxShadow: isActive ? `0 0 18px rgba(0,100,200,0.12)` : "none",
        borderRadius: 10,
        padding: "18px 20px 15px",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.42 : 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Corner fold */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 0, height: 0,
        borderStyle: "solid", borderWidth: "0 28px 28px 0",
        borderColor: `transparent ${isCompleted ? "rgba(52,211,153,0.25)" : "rgba(0,180,200,0.12)"} transparent transparent`,
      }} />

      {/* SHIPPED stamp */}
      {isCompleted && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.2em", color: DOCK.green,
          border: `2px solid ${DOCK.green}`,
          padding: "2px 6px", borderRadius: 3,
          transform: "rotate(-7deg)", opacity: 0.9,
        }}>
          SHIPPED
        </div>
      )}

      {/* IN PROGRESS badge */}
      {isActive && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: "absolute", top: 10, right: 10,
            fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800,
            letterSpacing: "0.16em", color: DOCK.blue,
            border: `1.5px solid ${DOCK.blue}`,
            padding: "2px 6px", borderRadius: 3,
          }}
        >
          IN PROGRESS
        </motion.div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 4px, transparent 4px, transparent 8px)",
          borderRadius: 10,
        }} />
      )}
      {isLocked && (
        <div style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.35 }}>🔒</div>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: DOCK.textFaint, marginBottom: 6 }}>
        MANIFEST #{manifestNum}
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800,
        color: isLocked ? DOCK.textFaint : DOCK.text, marginBottom: 6,
        filter: isLocked ? "blur(2px)" : "none",
        letterSpacing: "-0.01em",
      }}>
        {isLocked ? "██████ ████████" : title}
      </div>
      {!isLocked && (
        <div style={{ fontFamily: "var(--font-tac)", fontSize: 12, color: DOCK.textDim, marginBottom: 12, lineHeight: 1.5 }}>
          {description}
        </div>
      )}

      {/* Level dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: totalLevels }).map((_, i) => {
            const filled = i < levelsComplete;
            return (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: filled ? (isCompleted ? DOCK.green : DOCK.blue) : "rgba(255,255,255,0.07)",
                border: `1px solid ${filled ? (isCompleted ? DOCK.green : DOCK.blue) : "rgba(255,255,255,0.1)"}`,
                boxShadow: filled ? `0 0 4px ${isCompleted ? DOCK.green : DOCK.blue}` : "none",
              }} />
            );
          })}
        </div>
        {!isLocked && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint, marginLeft: 2 }}>
            {levelsComplete}/{totalLevels}
          </span>
        )}
      </div>
    </motion.button>
  );
}
