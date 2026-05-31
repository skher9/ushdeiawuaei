"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import { SMUGGLER_LEVELS, type SmugglerLevel } from "./levels";
import NoirLayout, { AhaMoment, StarBar } from "../NoirLayout";
import { NOIR, calcStars, calcXP, type StarCount, type GuessRecord } from "../types";

/* ── Warehouse grid ──────────────────────────────────────── */
function WarehouseGrid({
  range, lo, hi, lastGuess, result, onGuess, disabled, fogMode,
}: {
  range: number; lo: number; hi: number;
  lastGuess: number | null; result: "high" | "low" | "found" | null;
  onGuess: (n: number) => void; disabled: boolean; fogMode?: boolean;
}) {
  if (fogMode) {
    // No visual grid — just a number input
    const [input, setInput] = useState("");
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: NOIR.textDim, letterSpacing: "0.14em" }}>
          RANGE: 1 – {range}  ·  ENTER WAREHOUSE NUMBER
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="number" min={1} max={range} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !disabled) { const n = parseInt(input); if (n >= 1 && n <= range) { onGuess(n); setInput(""); } } }}
            disabled={disabled}
            style={{
              width: 100, padding: "12px 16px",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${NOIR.border}`,
              borderRadius: 8, color: NOIR.text, fontFamily: "var(--font-mono)", fontSize: 20,
              textAlign: "center", outline: "none",
            }}
            placeholder="?"
            autoFocus
          />
          <button
            onClick={() => { const n = parseInt(input); if (n >= 1 && n <= range && !disabled) { onGuess(n); setInput(""); } }}
            disabled={disabled}
            style={{
              padding: "12px 24px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
              background: `rgba(240,165,0,0.14)`, border: `1px solid ${NOIR.borderStrong}`,
              color: NOIR.amber, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 14,
            }}
          >
            GUESS
          </button>
        </div>
      </div>
    );
  }

  const cols = Math.min(range, 16);
  const rows = Math.ceil(range / cols);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 4,
      width: "100%",
      maxWidth: cols * 52 + (cols - 1) * 4,
      margin: "0 auto",
    }}>
      {Array.from({ length: range }, (_, i) => {
        const n = i + 1;
        const isElim = n < lo || n > hi;
        const isLast = n === lastGuess;
        const isMid = n === Math.floor((lo + hi) / 2) + (lo > 1 || hi < range ? 0 : 0);
        const hint = lo <= n && n <= hi
          ? n === Math.ceil((lo + hi) / 2)
          : false;

        let bg = "rgba(12,18,32,0.8)";
        let border = `1px solid ${NOIR.border}`;
        let textColor = NOIR.textDim;
        let opacity = 1;

        if (isElim) {
          bg = "rgba(6,8,16,0.5)"; opacity = 0.3;
          textColor = NOIR.textFaint;
          border = `1px solid rgba(255,255,255,0.04)`;
        } else if (isLast && result === "found") {
          bg = `rgba(42,157,143,0.25)`; border = `2px solid ${NOIR.teal}`;
          textColor = NOIR.teal;
        } else if (isLast) {
          bg = `rgba(232,74,95,0.15)`; border = `2px solid rgba(232,74,95,0.6)`;
          textColor = "#e84a5f";
        } else if (hint && !disabled) {
          // subtle mid-point hint
          border = `1px solid rgba(240,165,0,0.35)`;
        }

        return (
          <motion.button
            key={n}
            onClick={() => !disabled && !isElim && onGuess(n)}
            disabled={disabled || isElim}
            whileHover={!disabled && !isElim ? { scale: 1.08 } : {}}
            animate={{
              opacity,
              scale: isLast ? [1.2, 1] : 1,
            }}
            transition={{ duration: 0.25 }}
            style={{
              aspectRatio: "1", background: bg, border, borderRadius: 6,
              cursor: disabled || isElim ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontSize: range > 32 ? 10 : 13,
              fontWeight: 700, color: textColor,
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            {isElim ? "✕" : n}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Guess history ───────────────────────────────────────── */
function GuessHistory({ history }: { history: GuessRecord[] }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: NOIR.textFaint, fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        {open ? "▼" : "▶"} CASE LOG ({history.length} GUESSES)
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              marginTop: 8, padding: "10px 12px",
              background: "rgba(12,18,32,0.6)",
              border: `1px solid ${NOIR.border}`,
              borderRadius: 8,
              display: "flex", flexDirection: "column", gap: 4,
              maxHeight: 160, overflowY: "auto",
            }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  <span style={{ color: NOIR.textFaint, width: 20 }}>#{i + 1}</span>
                  <span style={{ color: NOIR.amber, width: 40 }}>{h.guess}</span>
                  <span style={{
                    color: h.result === "found" ? NOIR.teal : h.result === "lie" ? "#f59e0b" : "#e84a5f",
                    flex: 1,
                  }}>
                    {h.result === "high" ? "↓ TOO HIGH" : h.result === "low" ? "↑ TOO LOW" : h.result === "found" ? "✓ FOUND" : "LIE DETECTED"}
                  </span>
                  <span style={{ color: NOIR.textFaint }}>{h.remaining} left</span>
                  {!h.wasOptimal && <span style={{ color: "#e84a5f", fontSize: 9 }}>!OPT</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Timer arc ───────────────────────────────────────────── */
function TimerArc({ seconds, max }: { seconds: number; max: number }) {
  const pct = seconds / max;
  const r = 28;
  const c = 2 * Math.PI * r;
  const color = pct > 0.5 ? NOIR.teal : pct > 0.25 ? NOIR.amber : "#e84a5f";
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <motion.circle
          cx={36} cy={36} r={r} fill="none"
          stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 18,
        fontWeight: 800, color,
      }}>
        {seconds}
      </div>
    </div>
  );
}

/* ── AI move animation ───────────────────────────────────── */
function AIStep({ guess, lo, hi, result }: { guess: number; lo: number; hi: number; result: "high" | "low" | "found" | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "12px 16px",
        background: "rgba(12,18,32,0.8)",
        border: `1px solid ${NOIR.border}`,
        borderRadius: 10,
        fontFamily: "var(--font-mono)", fontSize: 13,
        display: "flex", gap: 16, alignItems: "center",
      }}
    >
      <span style={{ color: NOIR.textFaint }}>AI guesses:</span>
      <span style={{ color: NOIR.amber, fontWeight: 800, fontSize: 18 }}>{guess}</span>
      <span style={{ color: NOIR.textFaint }}>mid of [{lo}, {hi}]</span>
      {result && (
        <span style={{ color: result === "found" ? NOIR.teal : "#e84a5f", marginLeft: "auto" }}>
          {result === "high" ? "↓ TOO HIGH" : result === "low" ? "↑ TOO LOW" : "✓ FOUND IT"}
        </span>
      )}
    </motion.div>
  );
}

/* ── Parallel panel (3 searches) ────────────────────────── */
interface ParallelState {
  target: number; lo: number; hi: number;
  done: boolean; guesses: number; history: GuessRecord[];
}

/* ═══════════════════════════════════════════════════════════
   Main NumberSmuggler component
═══════════════════════════════════════════════════════════ */
interface Props {
  levelNum: number;
  onComplete: (result: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function NumberSmuggler({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = SMUGGLER_LEVELS[levelNum - 1];
  if (!cfg) {
    router.push("/learn/tier1/binary-search");
    return null;
  }

  const [phase, setPhase] = useState<"playing" | "won" | "aha">("playing");
  const [stars, setStars] = useState<StarCount>(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [history, setHistory] = useState<GuessRecord[]>([]);

  // Standard game state
  const [target] = useState(() => Math.ceil(Math.random() * cfg.range));
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(cfg.range);
  const [guesses, setGuesses] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  // Timer mode
  const [timeLeft, setTimeLeft] = useState(cfg.timerPerGuess ?? 10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reverse mode (AI plays)
  const [playerTarget, setPlayerTarget] = useState<number | null>(null);
  const [aiLo, setAiLo] = useState(1);
  const [aiHi, setAiHi] = useState(cfg.range);
  const [aiHistory, setAiHistory] = useState<{ guess: number; lo: number; hi: number; result: "high" | "low" | "found" | null }[]>([]);
  const [aiDone, setAiDone] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Corrupt clue mode
  const [lieIndex] = useState(() => Math.floor(Math.random() * (cfg.optimalGuesses - 1)) + 1);
  const [lieUsed, setLieUsed] = useState(false);

  // Parallel mode
  const [activePanel, setActivePanel] = useState(0);
  const [parallels] = useState<ParallelState[]>(() =>
    [0, 1, 2].map(() => ({
      target: Math.ceil(Math.random() * cfg.range),
      lo: 1, hi: cfg.range,
      done: false, guesses: 0, history: [],
    }))
  );
  const [parallelStates, setParallelStates] = useState(parallels);
  const [parallelTimer, setParallelTimer] = useState(45);

  // Boss mode
  const [escapeTimer, setEscapeTimer] = useState(cfg.bossEscapeTimer ?? 90);
  const [penaltyTimer, setPenaltyTimer] = useState(0);
  const bossTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const penaltyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isParallel = cfg.mode === "parallel";
  const isReverse = cfg.mode === "reverse";
  const isFog = cfg.mode === "fog";
  const isTimer = cfg.mode === "timer";
  const isCorrupt = cfg.mode === "corrupt_clue";
  const isBoss = cfg.mode === "boss";

  // Timer per guess (timer + boss modes)
  useEffect(() => {
    if (!isTimer || phase !== "playing" || solved) return;
    setTimeLeft(cfg.timerPerGuess!);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time out — auto-guess wrong (count as suboptimal)
          handleGuess(lo - 1); // invalid guess = penalized
          clearInterval(id);
          return cfg.timerPerGuess!;
        }
        return t - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [guesses, phase, isTimer, solved]);

  // Boss timers
  useEffect(() => {
    if (!isBoss || phase !== "playing") return;
    const id = setInterval(() => {
      setEscapeTimer(t => {
        if (t <= 1) {
          // Time's up — boss escape
          setPhase("won");
          finalizeGame(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    bossTimerRef.current = id;
    return () => clearInterval(id);
  }, [isBoss, phase]);

  // Parallel timer
  useEffect(() => {
    if (!isParallel || phase !== "playing") return;
    const id = setInterval(() => {
      setParallelTimer(t => {
        if (t <= 0) { setPhase("won"); finalizeGame(0); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isParallel, phase]);

  // AI step (reverse mode)
  useEffect(() => {
    if (!isReverse || playerTarget === null || aiDone) return;
    const step = () => {
      const mid = Math.ceil((aiLo + aiHi) / 2);
      if (mid === playerTarget) {
        setAiHistory(h => [...h, { guess: mid, lo: aiLo, hi: aiHi, result: "found" }]);
        setAiDone(true);
        setPhase("won");
        finalizeGame(aiHistory.length + 1);
        return;
      }
      const res = mid > playerTarget ? "high" : "low";
      setAiHistory(h => [...h, { guess: mid, lo: aiLo, hi: aiHi, result: res }]);
      if (res === "high") setAiHi(mid - 1);
      else setAiLo(mid + 1);
    };
    aiTimerRef.current = setTimeout(step, 1200);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [isReverse, playerTarget, aiLo, aiHi, aiDone]);

  const finalizeGame = (totalGuesses: number) => {
    const s = calcStars(totalGuesses, cfg.optimalGuesses);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s);
    setXpEarned(xp);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
  };

  const handleGuess = useCallback((n: number) => {
    if (phase !== "playing" || solved) return;
    if (n < 1 || n > cfg.range) return;

    const newGuesses = guesses + 1;
    setGuesses(newGuesses);

    if (isTimer && timerRef.current) {
      clearInterval(timerRef.current);
      setTimeLeft(cfg.timerPerGuess!);
    }

    // Is this guess the optimal midpoint?
    const mid = Math.ceil((lo + hi) / 2);
    const wasOptimal = n === mid;

    // Boss penalty
    if (isBoss && !wasOptimal) {
      setPenaltyTimer(p => p + (cfg.penaltyPerBadGuess ?? 8));
    }

    // Determine actual result
    let actualResult: "high" | "low" | "found";
    if (n === target) actualResult = "found";
    else if (n > target) actualResult = "high";
    else actualResult = "low";

    // Corrupt clue: lie on a specific guess
    let displayResult = actualResult;
    let isLie = false;
    if (isCorrupt && !lieUsed && newGuesses === lieIndex && actualResult !== "found") {
      displayResult = actualResult === "high" ? "low" : "high";
      isLie = true;
      setLieUsed(true);
    }

    const remaining = hi - lo + 1;
    setHistory(h => [...h, { guess: n, result: displayResult, remaining: Math.floor(remaining / 2), wasOptimal }]);

    if (actualResult === "found") {
      setSolved(true);
      setFeedback("✓ FOUND THE SMUGGLER");
      if (bossTimerRef.current) clearInterval(bossTimerRef.current);
      setTimeout(() => { setPhase("aha"); finalizeGame(newGuesses); }, 1200);
      return;
    }

    // Update bounds
    if (displayResult === "high") {
      setHi(n - 1);
      setFeedback("↓ TOO HIGH, DETECTIVE");
    } else {
      setLo(n + 1);
      setFeedback("↑ TOO LOW, DETECTIVE");
    }
    if (isLie) setFeedback(feedback => feedback + " [one informant lied…]");

    // Star degradation
    const s = calcStars(newGuesses + (cfg.optimalGuesses - 1), cfg.optimalGuesses);
    setStars(s);
  }, [phase, solved, guesses, lo, hi, target, cfg, isTimer, isCorrupt, lieUsed, lieIndex, isBoss]);

  const handleParallelGuess = (panelIdx: number, n: number) => {
    setParallelStates(prev => {
      const next = [...prev];
      const p = { ...next[panelIdx] };
      if (p.done || n < p.lo || n > p.hi) return prev;
      p.guesses++;
      const wasOptimal = n === Math.ceil((p.lo + p.hi) / 2);
      if (n === p.target) {
        p.done = true;
        p.history = [...p.history, { guess: n, result: "found", remaining: 0, wasOptimal }];
        // Check if all done
        const allDone = next.every((x, i) => i === panelIdx ? true : x.done);
        if (allDone) {
          const totalG = next.reduce((s, x) => s + x.guesses, 0) + 1;
          setTimeout(() => { setPhase("aha"); finalizeGame(Math.max(...next.map(x => x.guesses), p.guesses)); }, 800);
        }
      } else if (n > p.target) {
        p.hi = n - 1;
        p.history = [...p.history, { guess: n, result: "high", remaining: p.hi - p.lo, wasOptimal }];
      } else {
        p.lo = n + 1;
        p.history = [...p.history, { guess: n, result: "low", remaining: p.hi - p.lo, wasOptimal }];
      }
      next[panelIdx] = p;
      return next;
    });
  };

  /* Render game content */
  let content: React.ReactNode;

  if (isReverse) {
    if (playerTarget === null) {
      content = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <p style={{ color: NOIR.textDim, textAlign: "center", maxWidth: 440, lineHeight: 1.7 }}>
            {cfg.storyBeat}
          </p>
          <p style={{ color: NOIR.textDim, fontSize: 13, textAlign: "center" }}>
            Pick a hiding spot. The AI detective will find you.
          </p>
          <WarehouseGrid
            range={cfg.range} lo={1} hi={cfg.range}
            lastGuess={null} result={null}
            onGuess={n => { setPlayerTarget(n); }}
            disabled={false}
          />
        </div>
      );
    } else {
      content = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: NOIR.textDim, textAlign: "center", letterSpacing: "0.12em" }}>
            YOU CHOSE WAREHOUSE {playerTarget} · AI IS SEARCHING…
          </div>
          {aiHistory.map((step, i) => (
            <AIStep key={i} guess={step.guess} lo={step.lo} hi={step.hi} result={step.result} />
          ))}
          {aiDone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: "14px 18px", background: "rgba(42,157,143,0.12)", border: `1px solid ${NOIR.teal}`, borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: NOIR.teal }}>
                FOUND IN {aiHistory.length} GUESSES
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textDim, marginTop: 4 }}>
                Linear search would need up to {cfg.range} guesses
              </div>
            </motion.div>
          )}
        </div>
      );
    }
  } else if (isParallel) {
    const tabs = ["Case A", "Case B", "Case C"];
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActivePanel(i)} style={{
                padding: "6px 16px", borderRadius: 6, cursor: "pointer",
                background: activePanel === i ? `rgba(240,165,0,0.14)` : "rgba(12,18,32,0.6)",
                border: `1px solid ${activePanel === i ? NOIR.borderStrong : NOIR.border}`,
                color: parallelStates[i].done ? NOIR.teal : activePanel === i ? NOIR.amber : NOIR.textDim,
                fontFamily: "var(--font-mono)", fontSize: 11,
              }}>
                {parallelStates[i].done ? "✓ " : ""}{tab}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: parallelTimer <= 10 ? "#e84a5f" : NOIR.amber, fontWeight: 700 }}>
            {parallelTimer}s
          </div>
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: activePanel === i ? "block" : "none" }}>
            <WarehouseGrid
              range={cfg.range}
              lo={parallelStates[i].lo} hi={parallelStates[i].hi}
              lastGuess={parallelStates[i].history.at(-1)?.guess ?? null}
              result={(() => { const r = parallelStates[i].history.at(-1)?.result ?? null; return r === "lie" ? null : r; })()}
              onGuess={n => handleParallelGuess(i, n)}
              disabled={parallelStates[i].done}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          {parallelStates.map((p, i) => (
            <div key={i} style={{ flex: 1, padding: "8px 10px", background: "rgba(12,18,32,0.6)", border: `1px solid ${p.done ? "rgba(42,157,143,0.3)" : NOIR.border}`, borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: p.done ? NOIR.teal : NOIR.textFaint }}>
                {p.done ? `✓ ${p.guesses}g` : `${p.guesses}g · [${p.lo}-${p.hi}]`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // Standard / timer / corrupt / fog / boss
    content = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        {/* Story */}
        <p style={{ color: NOIR.textDim, textAlign: "center", maxWidth: 480, lineHeight: 1.6, fontSize: 14 }}>
          {cfg.storyBeat}
        </p>

        {/* Status row */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {isTimer && phase === "playing" && !solved && (
            <TimerArc seconds={timeLeft} max={cfg.timerPerGuess!} />
          )}
          {isBoss && (
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: NOIR.amber }}>
                ESCAPE: {escapeTimer}s
              </div>
              {penaltyTimer > 0 && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#e84a5f" }}>
                  PENALTY: +{penaltyTimer}s
                </div>
              )}
            </div>
          )}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: NOIR.textDim }}>
            GUESSES: {guesses} / {cfg.optimalGuesses} OPTIMAL
            {guesses > 0 && (
              <span style={{ marginLeft: 8 }}>
                · RANGE [{lo}–{hi}] ({hi - lo + 1} warehouses)
              </span>
            )}
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
                letterSpacing: "0.12em",
                color: solved ? NOIR.teal : "#e84a5f",
              }}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boss alarm flash */}
        {isBoss && penaltyTimer > 0 && (
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.4 }}
            style={{ position: "fixed", inset: 0, background: "rgba(232,74,95,0.08)", pointerEvents: "none", zIndex: 99 }}
          />
        )}

        {/* Warehouse grid */}
        <WarehouseGrid
          range={cfg.range} lo={lo} hi={hi}
          lastGuess={history.at(-1)?.guess ?? null}
          result={(() => { const r = history.at(-1)?.result ?? null; return r === "lie" ? null : r; })()}
          onGuess={handleGuess}
          disabled={solved || phase !== "playing"}
          fogMode={isFog}
        />

        {/* Eliminated count */}
        {guesses === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.teal, letterSpacing: "0.12em" }}>
            ◆ ELIMINATED {Math.floor(cfg.range / 2)} WAREHOUSES IN ONE GUESS
          </motion.div>
        )}

        <GuessHistory history={history} />
      </div>
    );
  }

  return (
    <NoirLayout
      gameName="THE NUMBER SMUGGLER"
      levelNum={levelNum}
      xpReward={cfg.xpBase}
      stars={stars}
      onBack={onBack}
    >
      <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
        {/* Level header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: NOIR.amberDim, marginBottom: 6 }}>
            CASE {levelNum} OF 8
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: NOIR.text, marginBottom: 4 }}>
            {cfg.caseTitle.toUpperCase()}
          </h2>
          <StarBar stars={stars} />
        </div>

        {content}
      </div>

      {/* Aha moment */}
      <AnimatePresence>
        {phase === "aha" && (
          <AhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(log n)"
            onContinue={() => {
              const next = levelNum + 1;
              if (next <= 8) {
                router.push(`/learn/tier1/binary-search/smuggler/${next}`);
              } else {
                router.push("/learn/tier1/binary-search");
              }
            }}
          />
        )}
      </AnimatePresence>
    </NoirLayout>
  );
}
