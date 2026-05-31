"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono,'JetBrains Mono',monospace)";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

const PROBLEMS = [
  { str: "AABABBA", k: 1 },
  { str: "ABAB", k: 2 },
  { str: "AABCCBB", k: 2 },
];

const LETTER_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#ef4444", C: "#22c55e", D: "#f59e0b", E: "#a855f7",
};

function getColor(c: string) { return LETTER_COLORS[c] ?? "#94a3b8"; }

function computeAnswer(str: string, k: number): number {
  const freq = new Map<string, number>();
  let l = 0, maxFreq = 0, best = 0;
  for (let r = 0; r < str.length; r++) {
    const c = str[r];
    freq.set(c, (freq.get(c) ?? 0) + 1);
    maxFreq = Math.max(maxFreq, freq.get(c)!);
    while (r - l + 1 - maxFreq > k) {
      const lc = str[l];
      freq.set(lc, freq.get(lc)! - 1);
      l++;
      maxFreq = Math.max(...freq.values());
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}

export default function KSwaps({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const { str, k } = PROBLEMS[probIdx];
  const answer = computeAnswer(str, k);

  const [L, setL] = useState(0);
  const [R, setR] = useState(-1);
  const [freq, setFreq] = useState<Map<string, number>>(new Map());
  const [maxFreq, setMaxFreq] = useState(0);
  const [longest, setLongest] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [paintDrops, setPaintDrops] = useState<number[]>([]);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1200);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  const windowSize = R >= L ? R - L + 1 : 0;
  const swapsNeeded = windowSize - maxFreq;
  const isValid = swapsNeeded <= k;

  function expandRight() {
    if (solved || R >= str.length - 1 || !isValid) return;
    doAttempt();
    const newR = R + 1;
    const c = str[newR];
    const newFreq = new Map(freq);
    newFreq.set(c, (newFreq.get(c) ?? 0) + 1);
    const newMaxFreq = Math.max(maxFreq, newFreq.get(c)!);
    const newSize = newR - L + 1;
    const newSwaps = newSize - newMaxFreq;

    setR(newR);
    setFreq(newFreq);
    setMaxFreq(newMaxFreq);

    if (newSwaps <= k) {
      const newLongest = Math.max(longest, newSize);
      setLongest(newLongest);
      playTone(500, "sine", 0.09);
      // Compute paint drops (minority positions)
      const minority: number[] = [];
      const dominantChar = [...newFreq.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
      for (let i = L; i <= newR; i++) {
        if (str[i] !== dominantChar) minority.push(i);
      }
      setPaintDrops(minority);
      if (newR === str.length - 1) {
        if (newLongest === answer) setSolved(true);
      }
    } else {
      // Invalid — need to advance L
      setInvalidFlash(true);
      setTimeout(() => setInvalidFlash(false), 500);
      playTone(180, "sawtooth", 0.15);
    }
  }

  function advanceL() {
    if (solved || L > R) return;
    doAttempt();
    const c = str[L];
    const newFreq = new Map(freq);
    const cnt = newFreq.get(c)! - 1;
    if (cnt === 0) newFreq.delete(c); else newFreq.set(c, cnt);
    const newL = L + 1;
    const newMaxFreq = newFreq.size > 0 ? Math.max(...newFreq.values()) : 0;
    setL(newL);
    setFreq(newFreq);
    setMaxFreq(newMaxFreq);
    playTone(300, "triangle", 0.08);

    // Recompute paint drops
    const newR = R;
    const newSize = newR - newL + 1;
    if (newSize > 0 && newFreq.size > 0) {
      const dominantChar = [...newFreq.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
      const minority: number[] = [];
      for (let i = newL; i <= newR; i++) {
        if (str[i] !== dominantChar) minority.push(i);
      }
      setPaintDrops(minority);
    }

    if (R === str.length - 1) {
      if (longest === answer) setSolved(true);
    }
  }

  function handleTileClick(i: number) {
    if (i === R + 1) expandRight();
    else if (i === L && !isValid) advanceL();
  }

  const bucketsUsed = Math.max(0, swapsNeeded);
  const bucketsFull = bucketsUsed > k;

  const mission = getMission("sliding-window", 6);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "LONGEST", value: longest }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes paintDrip {
          0% { transform: scaleY(0); opacity: 0; transform-origin: top; }
          60% { transform: scaleY(1.1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes invalidPulse {
          0%,100% { border-color: rgba(239,68,68,0.4); }
          50% { border-color: rgba(239,68,68,1); }
        }
        @keyframes bucketShake {
          0%,100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes winGlow {
          0%,100% { box-shadow: 0 0 0 rgba(16,185,129,0); }
          50% { box-shadow: 0 0 16px 4px rgba(16,185,129,0.4); }
        }
      `}</style>

      {/* Header */}
{/* Stats row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>
        <span>WINDOW: <strong style={{ color: "#eab308" }}>{windowSize}</strong></span>
        <span>MAX_FREQ: <strong style={{ color: "#3b82f6" }}>{maxFreq}</strong></span>
        <span>SWAPS: <strong style={{ color: bucketsFull ? "#ef4444" : swapsNeeded > 0 ? "#f59e0b" : "#22c55e" }}>{swapsNeeded}</strong></span>
        <span>LONGEST: <strong style={{ color: "#10b981" }}>{longest}</strong></span>
      </div>

      {/* String tiles */}
      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {str.split("").map((c, i) => {
          const inWindow = i >= L && i <= R && R >= L;
          const isPaintTarget = paintDrops.includes(i) && inWindow;
          const isNextExpand = i === R + 1;
          const isCurrentL = i === L && !isValid && R >= L;
          const col = getColor(c);

          return (
            <div key={i}
              onClick={() => handleTileClick(i)}
              style={{
                width: 38, height: 52,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: inWindow
                  ? (invalidFlash ? "rgba(239,68,68,0.1)" : isValid ? `${col}18` : "rgba(239,68,68,0.06)")
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${inWindow
                  ? (invalidFlash ? "rgba(239,68,68,0.5)" : isValid ? `${col}55` : "rgba(239,68,68,0.3)")
                  : isNextExpand ? `${col}55` : "#1a1a1a"
                }`,
                borderRadius: 5,
                cursor: (isNextExpand || isCurrentL) ? "pointer" : "default",
                transition: "all 0.15s",
                animation: invalidFlash && inWindow ? "invalidPulse 0.3s infinite" : solved && inWindow ? "winGlow 1.5s infinite" : "none",
                position: "relative",
              }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{c}</span>
              <span style={{ fontSize: 7, color: "#374151" }}>{i}</span>
              {isPaintTarget && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(168,85,247,0.2)",
                  borderRadius: 5, pointerEvents: "none",
                  animation: "paintDrip 0.3s ease-out",
                }} />
              )}
              {isNextExpand && (
                <span style={{ position: "absolute", top: -14, fontSize: 8, color: col }}>+</span>
              )}
              {isCurrentL && !isValid && (
                <span style={{ position: "absolute", top: -14, fontSize: 8, color: "#f59e0b" }}>→L</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Paint buckets */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-end" }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em" }}>PAINT BUCKETS:</span>
        {Array.from({ length: k }).map((_, bi) => {
          const used = bi < bucketsUsed;
          return (
            <div key={bi} style={{
              width: 32, height: 38,
              background: used ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${used ? "#a855f7" : "#1a1a1a"}`,
              borderRadius: "4px 4px 6px 6px",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: bucketsFull ? "bucketShake 0.4s infinite" : "none",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 9, color: used ? "#a855f7" : "#2d2d2d" }}>
                {used ? "✓" : "○"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Validity indicator */}
      <div style={{
        marginBottom: 12, padding: "8px 18px",
        background: invalidFlash ? "rgba(239,68,68,0.08)" : isValid ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${invalidFlash ? "rgba(239,68,68,0.6)" : isValid ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        borderRadius: 5, fontSize: 10,
        color: invalidFlash ? "#ef4444" : isValid ? "#10b981" : "#ef4444",
        letterSpacing: "0.08em", textAlign: "center",
      }}>
        {R < L
          ? "CLICK A TILE TO START EXPANDING"
          : invalidFlash
            ? `INVALID! ${windowSize} - ${maxFreq} = ${swapsNeeded} > k=${k} — CLICK L TILE TO ADVANCE`
            : isValid
              ? `VALID: ${windowSize} - ${maxFreq} = ${swapsNeeded} ≤ k=${k}`
              : `INVALID: ${windowSize} - ${maxFreq} = ${swapsNeeded} > k=${k} — ADVANCE L`
        }
      </div>

      {/* Freq breakdown */}
      {freq.size > 0 && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c, cnt]) => (
            <div key={c} style={{
              padding: "4px 10px",
              background: `${getColor(c)}18`,
              border: `1px solid ${getColor(c)}44`,
              borderRadius: 4, fontSize: 11, fontWeight: 700,
              color: getColor(c),
            }}>{c}: {cnt}</div>
          ))}
        </div>
      )}

      {!solved && R < str.length - 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button onClick={expandRight} style={{
            padding: "8px 16px",
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 4, cursor: "pointer", fontSize: 10,
            color: "#10b981", fontFamily: MONO, letterSpacing: "0.06em",
          }}>EXPAND → (or click tile)</button>
          {!isValid && (
            <button onClick={advanceL} style={{
              padding: "8px 16px",
              background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)",
              borderRadius: 4, cursor: "pointer", fontSize: 10,
              color: "#eab308", fontFamily: MONO, letterSpacing: "0.06em",
            }}>ADVANCE L →</button>
          )}
        </div>
      )}

      {solved && (
        <div style={{
          padding: "14px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6,
          fontSize: 11, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 1.8, marginBottom: 12,
        }}>
          LONGEST VALID WINDOW: {answer}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            VALID IF (SIZE - MAX_FREQ) ≤ k · PAINT MINORITY CHARS · O(n) TOTAL
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        RULE: WINDOW VALID IF (SIZE - MAX_FREQ) ≤ k · EXPAND FREELY · INVALID = ADVANCE LEFT
      </div>
    </div>
    </GameShell>
  );
}
