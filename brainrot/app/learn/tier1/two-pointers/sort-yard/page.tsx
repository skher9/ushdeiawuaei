"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HarborSkyline, StarBar } from "@/components/games/tier1/two-pointers/dock/DockLayout";
import { DOCK, type StarCount } from "@/components/games/tier1/two-pointers/dock/types";
import { SORT_LEVELS } from "@/components/games/tier1/two-pointers/dock/sort-yard/levels";

function getMaxCompleted(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("pd_sort-yard_levels") ?? "0", 10);
}

function getLevelStars(level: number): StarCount {
  if (typeof window === "undefined") return 0;
  return Math.min(3, Math.max(0, parseInt(localStorage.getItem(`pd_sort-yard_level_${level}_stars`) ?? "0", 10))) as StarCount;
}

function LevelCard({ levelNum, title, stars, xpBase, playable, completed, onPlay }: {
  levelNum: number; title: string; stars: StarCount; xpBase: number;
  playable: boolean; completed: boolean; onPlay: () => void;
}) {
  const isLocked = !playable && !completed;
  const isCurrent = playable && !completed;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: levelNum * 0.04, duration: 0.3 }}
      onClick={!isLocked ? onPlay : undefined}
      style={{
        padding: "16px 18px",
        background: isCurrent ? "rgba(0,180,200,0.07)" : completed ? "rgba(0,120,100,0.05)" : "rgba(10,16,32,0.7)",
        border: `1px solid ${isCurrent ? `rgba(0,180,200,0.5)` : completed ? "rgba(0,180,120,0.3)" : DOCK.border}`,
        boxShadow: isCurrent ? `0 0 20px rgba(0,180,200,0.1)` : "none",
        borderRadius: 10, cursor: isLocked ? "default" : "pointer",
        opacity: isLocked ? 0.38 : 1, position: "relative", overflow: "hidden", userSelect: "none",
      }}
      whileHover={!isLocked ? { y: -2, boxShadow: `0 6px 24px rgba(0,0,0,0.4)` } as never : undefined}
      whileTap={!isLocked ? { scale: 0.98 } as never : undefined}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, width: 0, height: 0,
        borderStyle: "solid", borderWidth: "0 20px 20px 0",
        borderColor: `transparent ${isCurrent ? "rgba(0,180,200,0.2)" : completed ? "rgba(0,180,120,0.2)" : "rgba(255,255,255,0.04)"} transparent transparent`,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: DOCK.textFaint, marginBottom: 4 }}>
            MANIFEST {levelNum.toString().padStart(2, "0")}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: isLocked ? DOCK.textFaint : DOCK.text }}>
            {title}
          </div>
        </div>
        {isLocked && <div style={{ fontSize: 16, opacity: 0.3, marginTop: 2 }}>🔒</div>}
        {isCurrent && (
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, letterSpacing: "0.18em", color: DOCK.cyan, border: `1.5px solid ${DOCK.cyan}`, padding: "2px 6px", borderRadius: 3, marginTop: 2 }}
          >
            PLAY
          </motion.div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <StarBar stars={stars} size={14} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.amber }}>+{xpBase} XP</div>
      </div>
    </motion.div>
  );
}

export default function SortYardSelectPage() {
  const router = useRouter();
  const [maxCompleted, setMaxCompleted] = useState(0);
  const [starsByLevel, setStarsByLevel] = useState<StarCount[]>(Array(8).fill(0));

  useEffect(() => {
    setMaxCompleted(getMaxCompleted());
    setStarsByLevel(Array.from({ length: 8 }, (_, i) => getLevelStars(i + 1)));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ minHeight: "100vh", background: DOCK.bg, color: DOCK.text, position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 260, zIndex: 0, pointerEvents: "none" }}>
        <HarborSkyline />
      </div>

      <div style={{
        position: "sticky", top: 0, zIndex: 50, height: 52,
        display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(5,10,20,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${DOCK.border}`,
      }}>
        <button onClick={() => router.push("/learn/tier1/two-pointers")}
          style={{ background: "none", border: "none", cursor: "pointer", color: DOCK.textDim, fontSize: 13, fontFamily: "var(--font-tac)", display: "flex", alignItems: "center", gap: 6 }}>
          ← Pointer Docks
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: DOCK.textFaint }}>
          MANIFEST 002 · THE SORT YARD
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber }}>{maxCompleted}/8</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "28px 20px 140px" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.3em", color: DOCK.cyan, marginBottom: 8 }}>
            ◆ MEDIUM · IN-PLACE SORTING
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: DOCK.text, marginBottom: 6 }}>
            THE SORT YARD
          </h1>
          <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: DOCK.textDim, maxWidth: 400, margin: "0 auto" }}>
            Two workers, opposite ends. Swap mismatched crates until the yard is sorted.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {SORT_LEVELS.map((lvl, i) => {
            const n = i + 1;
            return (
              <LevelCard
                key={n} levelNum={n} title={lvl.caseTitle}
                stars={starsByLevel[i]} xpBase={lvl.xpBase}
                completed={n <= maxCompleted} playable={n <= maxCompleted + 1}
                onPlay={() => router.push(`/learn/tier1/two-pointers/sort-yard/${n}`)}
              />
            );
          })}
        </div>

        {maxCompleted >= 8 && (
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: 24, padding: "20px", textAlign: "center", background: "rgba(0,100,80,0.08)", border: `1px solid ${DOCK.cyan}`, borderRadius: 12 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: DOCK.cyan, marginBottom: 6 }}>
              YARD SORTED ✓
            </div>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 13, color: DOCK.textDim }}>
              All 8 manifests sorted. In-place, two pointers.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
