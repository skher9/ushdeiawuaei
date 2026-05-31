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
  { arr: [3, 1, 3, 1, 2, 6, 4, 8, 7], k: 3 },
  { arr: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
  { arr: [4, 2, 5, 1, 3, 6, 2], k: 3 },
];

function computeMaxWindows(arr: number[], k: number): number[] {
  const deque: number[] = [];
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (deque.length > 0 && deque[0] < i - k + 1) deque.shift();
    while (deque.length > 0 && arr[deque[deque.length - 1]] <= arr[i]) deque.pop();
    deque.push(i);
    if (i >= k - 1) result.push(arr[deque[0]]);
  }
  return result;
}

export default function MaxSlider({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const { arr, k } = PROBLEMS[probIdx];
  const correctResults = computeMaxWindows(arr, k);

  const [step, setStep] = useState(0); // current R index being processed (0-indexed)
  const [deque, setDeque] = useState<number[]>([]); // indices in deque
  const [results, setResults] = useState<number[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [popAnim, setPopAnim] = useState<{ idx: number; dir: "left" | "right" } | null>(null);
  const [pushAnim, setPushAnim] = useState(false);
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

  function processNext() {
    if (solved || step >= arr.length) return;
    doAttempt();

    const i = step;
    let newDeque = [...deque];

    // Remove stale front (out of window)
    if (newDeque.length > 0 && newDeque[0] < i - k + 1) {
      setPopAnim({ idx: newDeque[0], dir: "left" });
      setTimeout(() => setPopAnim(null), 300);
      playTone(200, "sawtooth", 0.08);
      newDeque.shift();
    }

    // Pop dominated back elements
    while (newDeque.length > 0 && arr[newDeque[newDeque.length - 1]] <= arr[i]) {
      setPopAnim({ idx: newDeque[newDeque.length - 1], dir: "right" });
      setTimeout(() => setPopAnim(null), 300);
      playTone(350, "triangle", 0.07);
      newDeque.pop();
    }

    // Push new element
    newDeque.push(i);
    setPushAnim(true);
    setTimeout(() => setPushAnim(false), 300);
    playTone(500, "sine", 0.08);

    setDeque(newDeque);

    // Record result if window full
    const newResults = [...results];
    if (i >= k - 1) {
      const maxVal = arr[newDeque[0]];
      newResults.push(maxVal);
      playTone(660, "sine", 0.15); // new max ding
      setResults(newResults);
    }

    const newStep = step + 1;
    setStep(newStep);

    if (newStep >= arr.length) {
      setSolved(true);
    }
  }

  const maxBarH = Math.max(...arr.map(Math.abs), 1);
  const windowL = Math.max(0, step - k);
  const windowR = step - 1;

  const mission = getMission("sliding-window", 1);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "RESULTS", value: results.length }, { label: "STEP", value: step }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes popLeft {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-40px); opacity: 0; }
        }
        @keyframes popRight {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(40px); opacity: 0; }
        }
        @keyframes slideIn {
          0% { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes barGrow {
          0% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
        @keyframes maxGlow {
          0%,100% { box-shadow: 0 0 4px rgba(234,179,8,0.3); }
          50% { box-shadow: 0 0 16px rgba(234,179,8,0.8); }
        }
      `}</style>

      {/* Header */}
{/* Bar chart */}
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 8, height: 90 }}>
        {arr.map((val, i) => {
          const h = Math.abs(val) / maxBarH * 72 + 8;
          const inWindow = step > 0 && i >= windowL && i <= windowR;
          const isNext = i === step && !solved;
          const isMax = deque.length > 0 && deque[0] === i;
          return (
            <div key={i}
              onClick={isNext ? processNext : undefined}
              style={{
                width: 36, height: h,
                background: isMax
                  ? "rgba(234,179,8,0.6)"
                  : inWindow
                    ? "rgba(16,185,129,0.35)"
                    : isNext
                      ? "rgba(99,102,241,0.5)"
                      : "rgba(255,255,255,0.06)",
                border: `1px solid ${isMax ? "#eab308" : inWindow ? "#10b981" : isNext ? "#6366f1" : "#1a1a1a"}`,
                borderRadius: "3px 3px 0 0",
                cursor: isNext ? "pointer" : "default",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                paddingBottom: 4,
                animation: isMax ? "maxGlow 1.5s infinite" : "none",
                position: "relative",
                transition: "background 0.15s, border 0.15s",
              }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: isMax ? "#eab308" : inWindow ? "#10b981" : isNext ? "#6366f1" : "#475569" }}>
                {val}
              </span>
              <span style={{ fontSize: 7, color: "#374151" }}>{i}</span>
              {isNext && (
                <span style={{ position: "absolute", top: -18, fontSize: 9, color: "#6366f1", letterSpacing: "0.05em" }}>
                  NEXT
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Window bracket */}
      {step > 0 && (
        <div style={{
          display: "flex", gap: 4, alignItems: "center", marginBottom: 12,
          fontSize: 9, color: "#10b981", letterSpacing: "0.06em",
        }}>
          WINDOW [{windowL}..{windowR}] (k={k})
        </div>
      )}

      {/* Deque visualization */}
      <div style={{
        width: "100%", maxWidth: 500, marginBottom: 14,
        padding: "10px 14px", background: "rgba(255,255,255,0.02)",
        border: "1px solid #1a1a1a", borderRadius: 6,
      }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>
          DEQUE (front = max, decreasing order):
        </div>
        <div style={{ display: "flex", gap: 6, minHeight: 48, alignItems: "center" }}>
          {deque.length === 0 ? (
            <span style={{ fontSize: 9, color: "#2d2d2d" }}>EMPTY</span>
          ) : (
            deque.map((idx, pos) => {
              const isFirst = pos === 0;
              const isAnimPop = popAnim?.idx === idx;
              const isAnimPush = pushAnim && pos === deque.length - 1;
              return (
                <div key={idx} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "6px 10px",
                  background: isFirst ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isFirst ? "#eab308" : "#2a2a2a"}`,
                  borderRadius: 5,
                  animation: isAnimPop
                    ? `pop${popAnim?.dir === "left" ? "Left" : "Right"} 0.3s ease-out forwards`
                    : isAnimPush ? "slideIn 0.3s ease-out" : "none",
                  minWidth: 40,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isFirst ? "#eab308" : "#94a3b8" }}>
                    {arr[idx]}
                  </span>
                  <span style={{ fontSize: 7, color: "#374151" }}>i={idx}</span>
                  {isFirst && <span style={{ fontSize: 7, color: "#eab308" }}>MAX</span>}
                </div>
              );
            })
          )}
        </div>
        {deque.length > 0 && (
          <div style={{ fontSize: 8, color: "#374151", marginTop: 6, letterSpacing: "0.04em" }}>
            ← front (max) · back (newest) →
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{
          width: "100%", maxWidth: 500, marginBottom: 14,
          padding: "8px 14px", background: "rgba(16,185,129,0.03)",
          border: "1px solid rgba(16,185,129,0.12)", borderRadius: 5,
        }}>
          <div style={{ fontSize: 9, color: "#10b981", letterSpacing: "0.1em", marginBottom: 6 }}>MAXIMUMS FOUND:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {results.map((v, i) => (
              <div key={i} style={{
                padding: "4px 10px",
                background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)",
                borderRadius: 4, fontSize: 12, fontWeight: 700, color: "#eab308",
              }}>{v}</div>
            ))}
          </div>
        </div>
      )}

      {/* Next button */}
      {!solved && (
        <button onClick={processNext} style={{
          padding: "10px 24px", marginBottom: 12,
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: 5, cursor: "pointer", fontSize: 11,
          color: "#818cf8", fontFamily: MONO, letterSpacing: "0.08em",
          transition: "all 0.12s",
        }}>
          ADVANCE → (or click next bar)
        </button>
      )}

      {solved && (
        <div style={{
          padding: "14px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6,
          fontSize: 11, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 1.8, marginBottom: 12,
        }}>
          MAXIMUMS: [{results.join(", ")}]
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            DEQUE STORES DECREASING INDICES · FRONT = MAX · O(n) TOTAL
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        DEQUE RULE: POP STALE FRONT (out of window) · POP DOMINATED BACK (new ≥ back) · PUSH NEW · FRONT = MAX
      </div>
    </div>
    </GameShell>
  );
}
