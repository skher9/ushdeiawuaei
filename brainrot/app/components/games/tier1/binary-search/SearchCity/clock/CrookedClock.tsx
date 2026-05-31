"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { CLOCK_LEVELS } from "./levels";
import NoirLayout, { AhaMoment, StarBar } from "../NoirLayout";
import { NOIR, calcStars, calcXP, type StarCount } from "../types";

/* ── Array Cell ──────────────────────────────────────────── */
function ArrayCell({
  value, index, role, onClick, disabled,
}: {
  value: number; index: number;
  role: "lo" | "hi" | "mid" | "eliminated" | "target" | "found" | "normal";
  onClick?: () => void; disabled?: boolean;
}) {
  const colors: Record<typeof role, { bg: string; border: string; color: string }> = {
    lo:         { bg: "rgba(0,229,255,0.12)", border: "rgba(0,229,255,0.6)", color: "#00e5ff" },
    hi:         { bg: "rgba(0,229,255,0.12)", border: "rgba(0,229,255,0.6)", color: "#00e5ff" },
    mid:        { bg: "rgba(240,165,0,0.18)", border: NOIR.borderStrong, color: NOIR.amber },
    eliminated: { bg: "rgba(6,8,16,0.4)", border: "rgba(255,255,255,0.04)", color: NOIR.textFaint },
    target:     { bg: "rgba(42,157,143,0.2)", border: NOIR.teal, color: NOIR.teal },
    found:      { bg: "rgba(42,157,143,0.3)", border: NOIR.teal, color: NOIR.teal },
    normal:     { bg: "rgba(12,18,32,0.8)", border: NOIR.border, color: NOIR.textDim },
  };
  const c = colors[role];
  return (
    <motion.div
      animate={{ opacity: role === "eliminated" ? 0.3 : 1, scale: role === "found" ? [1.2, 1] : 1 }}
      transition={{ duration: 0.25 }}
      onClick={!disabled && onClick ? onClick : undefined}
      style={{
        width: 52, height: 52, borderRadius: 8, flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: c.bg, border: `1.5px solid ${c.border}`,
        cursor: onClick && !disabled ? "pointer" : "default",
        fontFamily: "var(--font-mono)", position: "relative",
        boxShadow: role === "mid" ? `0 0 14px rgba(240,165,0,0.35)` : role === "found" ? `0 0 14px rgba(42,157,143,0.5)` : "none",
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{value}</span>
      <span style={{ fontSize: 8, color: NOIR.textFaint, letterSpacing: "0.1em" }}>[{index}]</span>
      {(role === "lo") && <div style={{ position: "absolute", bottom: -14, fontSize: 8, color: "#00e5ff", letterSpacing: "0.08em" }}>LO</div>}
      {(role === "hi") && <div style={{ position: "absolute", bottom: -14, fontSize: 8, color: "#00e5ff", letterSpacing: "0.08em" }}>HI</div>}
      {(role === "mid") && <div style={{ position: "absolute", bottom: -14, fontSize: 8, color: NOIR.amber, letterSpacing: "0.08em" }}>MID</div>}
    </motion.div>
  );
}

/* ── Binary search state for one problem ─────────────────── */
interface BSState {
  lo: number; hi: number;
  guesses: number;
  done: boolean;
  found: boolean; // false = not found
  steps: { lo: number; hi: number; mid: number; decision: "left" | "right" | "found" }[];
}

function initBS(len: number): BSState {
  return { lo: 0, hi: len - 1, guesses: 0, done: false, found: false, steps: [] };
}

/* ── Main CrookedClock ───────────────────────────────────── */
interface Props {
  levelNum: number;
  onComplete: (result: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function CrookedClock({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = CLOCK_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/binary-search"); return null; }

  const [phase, setPhase] = useState<"playing" | "aha">("playing");
  const [stars, setStars] = useState<StarCount>(3);

  // Multi-problem state
  const [probIdx, setProbIdx] = useState(0);
  const [bsState, setBsState] = useState<BSState>(() => initBS(cfg.problems[0].array.length));
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Time attack
  const [timeLeft, setTimeLeft] = useState(cfg.timePerProblem ?? 8);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Boss: combo digits
  const [bossDigits, setBossDigits] = useState<number[]>([]);

  const prob = cfg.problems[Math.min(probIdx, cfg.problems.length - 1)];
  const arr = prob.array;
  const target = cfg.mode === "find_pivot"
    ? Math.min(...prob.array)  // target = minimum element
    : prob.target;

  const mid = Math.floor((bsState.lo + bsState.hi) / 2);
  const optG = Math.ceil(Math.log2(arr.length)) + 1;

  const getRole = (i: number): "lo" | "hi" | "mid" | "eliminated" | "target" | "found" | "normal" => {
    if (bsState.done && arr[i] === target) return "found";
    if (i < bsState.lo || i > bsState.hi) return "eliminated";
    if (i === mid) return "mid";
    if (i === bsState.lo) return "lo";
    if (i === bsState.hi) return "hi";
    if (arr[i] === target) return "target";
    return "normal";
  };

  const finalize = useCallback((totalG: number) => {
    const s = calcStars(totalG, optG * cfg.problems.length);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
  }, [optG, cfg, addXP, onComplete]);

  const advanceProb = useCallback((g: number) => {
    const newTotal = totalGuesses + g;
    setTotalGuesses(newTotal);
    const next = probIdx + 1;
    if (next >= cfg.problems.length) {
      finalize(newTotal);
      setTimeout(() => setPhase("aha"), 800);
    } else {
      setProbIdx(next);
      setBsState(initBS(cfg.problems[next].array.length));
      setFeedback(null);
      if (cfg.timePerProblem) setTimeLeft(cfg.timePerProblem);
    }
  }, [probIdx, cfg, totalGuesses, finalize]);

  // Timer (time_attack)
  useEffect(() => {
    if (cfg.mode !== "time_attack" || phase !== "playing") return;
    setTimeLeft(cfg.timePerProblem!);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { advanceProb(bsState.guesses + 3); return cfg.timePerProblem!; }
        return t - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [probIdx, phase]);

  const decide = useCallback((direction: "left" | "right") => {
    if (bsState.done) return;
    const arr = cfg.problems[probIdx].array;
    const target = cfg.mode === "find_pivot" ? Math.min(...arr) : cfg.problems[probIdx].target;
    const newGuesses = bsState.guesses + 1;
    const newSteps = [...bsState.steps, { lo: bsState.lo, hi: bsState.hi, mid, decision: direction }];

    // Check if mid is the answer
    const midVal = arr[mid];
    if (midVal === target) {
      setBsState(s => ({ ...s, done: true, found: true, guesses: newGuesses, steps: newSteps }));
      setFeedback("✓ FOUND IT");
      if (cfg.mode === "boss") setBossDigits(d => [...d, mid]);
      setTimeout(() => advanceProb(newGuesses), 900);
      return;
    }

    let newLo = bsState.lo, newHi = bsState.hi;

    if (cfg.mode === "find_pivot") {
      // Find minimum — check if right half has the minimum
      if (arr[mid] > arr[bsState.hi]) { newLo = mid + 1; }
      else { newHi = mid; }
      // auto advance
      if (newLo === newHi) {
        setBsState(s => ({ ...s, lo: newLo, hi: newHi, done: true, found: true, guesses: newGuesses, steps: newSteps }));
        setFeedback("✓ PIVOT FOUND");
        setTimeout(() => advanceProb(newGuesses), 900);
        return;
      }
      setBsState(s => ({ ...s, lo: newLo, hi: newHi, guesses: newGuesses, steps: newSteps }));
      setFeedback(null);
      return;
    }

    if (cfg.mode === "duplicates" && arr[mid] === arr[bsState.lo]) {
      // Can't decide — shrink
      newLo = bsState.lo + 1;
      setBsState(s => ({ ...s, lo: newLo, guesses: newGuesses, steps: newSteps }));
      setFeedback("⚠ DUPLICATE — SHRINK WINDOW");
      return;
    }

    // Standard rotated binary search decision
    if (direction === "left") newHi = mid - 1;
    else newLo = mid + 1;

    if (newLo > newHi) {
      setBsState(s => ({ ...s, done: true, found: false, guesses: newGuesses, steps: newSteps }));
      setFeedback("✗ NOT FOUND");
      setTimeout(() => advanceProb(newGuesses + 3), 800);
      return;
    }
    setBsState(s => ({ ...s, lo: newLo, hi: newHi, guesses: newGuesses, steps: newSteps }));
    setFeedback(null);

    // Degrade stars
    const isCorrectDecision = checkCorrectDecision(arr, bsState.lo, bsState.hi, mid, target, direction);
    if (!isCorrectDecision) {
      setFeedback("✗ WRONG HALF — BACKTRACKING COSTS YOU");
      setStars(s => Math.max(0, s - 1) as StarCount);
    }
  }, [bsState, mid, probIdx, cfg, advanceProb]);

  function checkCorrectDecision(arr: number[], lo: number, hi: number, mid: number, target: number, dir: "left" | "right"): boolean {
    // Left half sorted?
    if (arr[mid] >= arr[lo]) {
      const leftContainsTarget = target >= arr[lo] && target < arr[mid];
      return leftContainsTarget ? dir === "left" : dir === "right";
    } else {
      const rightContainsTarget = target > arr[mid] && target <= arr[hi];
      return rightContainsTarget ? dir === "right" : dir === "left";
    }
  }

  // Guided hint (level 1)
  const isGuided = cfg.mode === "guided_find";
  const leftSorted = arr[mid] >= arr[bsState.lo];
  const hintDir: "left" | "right" | null = isGuided
    ? (target < arr[mid] && target >= arr[bsState.lo] && leftSorted ? "left"
      : target > arr[mid] && target <= arr[bsState.hi] && !leftSorted ? "right"
      : arr[mid] > target ? "left" : "right")
    : null;

  const isFindPivot = cfg.mode === "find_pivot";
  const isDuplicates = cfg.mode === "duplicates";
  const isBoss = cfg.mode === "boss";
  const isTimeAttack = cfg.mode === "time_attack";

  return (
    <NoirLayout gameName="THE CROOKED CLOCK" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 760, margin: "0 auto" }}>
        {/* Level header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: NOIR.amberDim, marginBottom: 6 }}>
            CASE {levelNum} OF 8 {cfg.problems.length > 1 ? `· CLOCK ${probIdx + 1}/${cfg.problems.length}` : ""}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: NOIR.text, marginBottom: 6 }}>
            {cfg.caseTitle.toUpperCase()}
          </h2>
          <StarBar stars={stars} />
        </div>

        {/* Story */}
        <p style={{ color: NOIR.textDim, textAlign: "center", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6, fontSize: 14 }}>
          {cfg.storyBeat}
        </p>

        {/* Target display */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
          {!isFindPivot && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(42,157,143,0.08)", border: `1px solid rgba(42,157,143,0.3)`, borderRadius: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", color: NOIR.textFaint }}>TARGET HOUR</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: NOIR.teal }}>{target}</span>
            </div>
          )}
          {isFindPivot && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: NOIR.textDim, letterSpacing: "0.12em" }}>
              FIND THE MINIMUM ELEMENT (ROTATION POINT)
            </div>
          )}
          {isTimeAttack && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: timeLeft <= 3 ? "#e84a5f" : NOIR.amber }}>
              {timeLeft}s
            </div>
          )}
        </div>

        {/* Array visualization */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
          {arr.map((v, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ArrayCell
                value={v} index={i}
                role={getRole(i)}
                onClick={isFindPivot && !bsState.done ? () => {
                  // Auto-play find_pivot: just show the step
                  decide("left");
                } : undefined}
              />
            </div>
          ))}
        </div>

        {/* Info row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint }}>
          <span>lo={bsState.lo} · hi={bsState.hi} · mid={mid}</span>
          <span>arr[mid]={arr[mid]}</span>
          {!isFindPivot && (
            <span style={{ color: leftSorted ? NOIR.teal : NOIR.amber }}>
              {leftSorted ? "← LEFT HALF SORTED" : "→ RIGHT HALF SORTED"}
            </span>
          )}
          <span>GUESSES: {bsState.guesses}</span>
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em",
                color: feedback.startsWith("✓") ? NOIR.teal : feedback.startsWith("⚠") ? NOIR.amber : "#e84a5f",
                marginBottom: 12 }}>
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decision buttons */}
        {!bsState.done && phase === "playing" && !isFindPivot && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {isDuplicates && arr[mid] === arr[bsState.lo] ? (
              <button
                onClick={() => decide("left")}
                style={{
                  padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(240,165,0,0.12)", border: `1px solid ${NOIR.borderStrong}`,
                  color: NOIR.amber, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
                }}>
                SHRINK WINDOW (lo++)
              </button>
            ) : (
              ["LEFT HALF", "RIGHT HALF"].map((label, i) => {
                const dir = i === 0 ? "left" : "right";
                const isHinted = hintDir === dir;
                return (
                  <motion.button
                    key={dir}
                    onClick={() => decide(dir)}
                    whileHover={{ scale: 1.03 }}
                    style={{
                      padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                      background: isHinted ? "rgba(240,165,0,0.18)" : "rgba(12,18,32,0.8)",
                      border: `1px solid ${isHinted ? NOIR.borderStrong : NOIR.border}`,
                      color: isHinted ? NOIR.amber : NOIR.textDim,
                      fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
                      letterSpacing: "0.06em",
                      boxShadow: isHinted ? `0 0 20px rgba(240,165,0,0.25)` : "none",
                    }}
                  >
                    {isGuided && isHinted && "→ "}{label}
                  </motion.button>
                );
              })
            )}
          </div>
        )}

        {/* Find pivot: auto-step button */}
        {isFindPivot && !bsState.done && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={() => decide("left")} style={{
              padding: "12px 28px", borderRadius: 8, cursor: "pointer",
              background: "rgba(240,165,0,0.12)", border: `1px solid ${NOIR.borderStrong}`,
              color: NOIR.amber, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
            }}>NEXT STEP →</button>
          </div>
        )}

        {/* Boss digits */}
        {isBoss && bossDigits.length > 0 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                width: 36, height: 44, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: i < bossDigits.length ? "rgba(42,157,143,0.2)" : "rgba(12,18,32,0.6)",
                border: `1px solid ${i < bossDigits.length ? NOIR.teal : NOIR.border}`,
                fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800,
                color: i < bossDigits.length ? NOIR.teal : NOIR.textFaint,
              }}>
                {i < bossDigits.length ? bossDigits[i] : "?"}
              </div>
            ))}
          </div>
        )}

        {/* Step log */}
        {bsState.steps.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {bsState.steps.slice(-3).map((s, i) => (
              <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.textFaint, display: "flex", gap: 12 }}>
                <span>lo={s.lo} hi={s.hi} mid={s.mid}</span>
                <span style={{ color: s.decision === "left" ? "#00e5ff" : NOIR.amber }}>→ {s.decision.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {phase === "aha" && (
          <AhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(log n)"
            onContinue={() => {
              const next = levelNum + 1;
              router.push(next <= 8 ? `/learn/tier1/binary-search/clock/${next}` : "/learn/tier1/binary-search");
            }}
          />
        )}
      </AnimatePresence>
    </NoirLayout>
  );
}
