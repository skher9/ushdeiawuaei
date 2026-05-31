"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const NUMS1 = [1, 3, 5, 7, 9];
const NUMS2 = [2, 4, 6, 8, 10];
const TOTAL = NUMS1.length + NUMS2.length;

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

function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 100));
}

const KEYFRAMES = `
@keyframes cardFly {
  0%   { transform: scale(1) translateY(0); opacity:1; }
  35%  { transform: scale(1.15) translateY(-14px); opacity:1; }
  100% { transform: scale(0.7) translateY(80px); opacity:0; }
}
@keyframes cardLand {
  0%   { transform: scale(0.5) translateY(-20px); opacity:0; }
  60%  { transform: scale(1.1) translateY(4px); opacity:1; }
  100% { transform: scale(1) translateY(0); opacity:1; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@keyframes pulse {
  0%,100% { transform: scale(1); box-shadow: 0 0 8px 2px currentColor; }
  50%      { transform: scale(1.05); box-shadow: 0 0 18px 6px currentColor; }
}
@keyframes winPop {
  0%   { transform: scale(0.5); opacity:0; }
  65%  { transform: scale(1.12); opacity:1; }
  100% { transform: scale(1); opacity:1; }
}
@keyframes autoMerge {
  0%   { opacity:1; transform:translateX(0); }
  100% { opacity:0; transform:translateX(0) scale(0.5); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

export default function MergeStreams({ onSolve, onAttempt }: GameProps) {
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(0);
  const [merged, setMerged] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [shakingSide, setShakingSide] = useState<"left" | "right" | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [flyingSide, setFlyingSide] = useState<"left" | "right" | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
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

  const done1 = i1 >= NUMS1.length;
  const done2 = i2 >= NUMS2.length;
  const bothDone = done1 && done2;
  const onlyOne = !bothDone && (done1 || done2);

  // When one array exhausted, auto-merge the rest
  useEffect(() => {
    if (onlyOne && !solved && !autoRunning) {
      setAutoRunning(true);
      autoMergeRemainder();
    }
  }, [i1, i2]);

  function autoMergeRemainder() {
    const doStep = (ci1: number, ci2: number, acc: number[]) => {
      const d1 = ci1 >= NUMS1.length;
      const d2 = ci2 >= NUMS2.length;
      if (d1 && d2) {
        setMerged(acc);
        playWin();
        setSolved(true);
        return;
      }
      const val = !d1 ? NUMS1[ci1] : NUMS2[ci2];
      const newAcc = [...acc, val];
      const ni1 = !d1 ? ci1 + 1 : ci1;
      const ni2 = !d2 ? ci2 + 1 : ci2;
      playTone(300 + newAcc.length * 20);
      setMerged(newAcc);
      setI1(ni1); setI2(ni2);
      setTimeout(() => doStep(ni1, ni2, newAcc), 280);
    };
    // peek current state via closure won't work — use refs
    setI1(ci1 => {
      setI2(ci2 => {
        setMerged(cm => {
          setTimeout(() => doStep(ci1, ci2, cm), 300);
          return cm;
        });
        return ci2;
      });
      return ci1;
    });
  }

  function handlePick(side: "left" | "right") {
    if (solved || autoRunning || done1 || done2) return;
    doAttempt();

    const v1 = NUMS1[i1];
    const v2 = NUMS2[i2];
    const smaller = v1 <= v2 ? "left" : "right";

    if (side !== smaller) {
      playTone(200, "sawtooth", 0.12);
      setShakingSide(side);
      setTimeout(() => setShakingSide(null), 400);
      return;
    }

    playTone(300 + merged.length * 25);
    setFlyingSide(side);
    setTimeout(() => {
      setFlyingSide(null);
      const val = side === "left" ? v1 : v2;
      const newMerged = [...merged, val];
      setMerged(newMerged);
      if (side === "left") setI1(i1 + 1); else setI2(i2 + 1);
    }, 350);
  }

  const cand1 = !done1 ? NUMS1[i1] : null;
  const cand2 = !done2 ? NUMS2[i2] : null;
  const smaller = cand1 !== null && cand2 !== null
    ? (cand1 <= cand2 ? "left" : "right")
    : null;

  const mission = getMission("two-pointers", 7);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "MERGED", value: merged.length }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Progress */}
      <div style={{ marginBottom: 16, fontSize: 11, color: "#475569", letterSpacing: "0.08em" }}>
        MERGED: {merged.length} / {TOTAL}
        <span style={{ marginLeft: 12, fontSize: 9, color: "#374151" }}>
          {solved ? "✓ DONE" : `i1=${i1} · i2=${i2}`}
        </span>
      </div>

      {/* Source arrays */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, width: "100%", maxWidth: 480 }}>
        {[
          { label: "ARRAY 1", nums: NUMS1, idx: i1, color: "#3b82f6" },
          { label: "ARRAY 2", nums: NUMS2, idx: i2, color: "#ef4444" },
        ].map(({ label, nums, idx, color }, row) => (
          <div key={row} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", width: 60, flexShrink: 0 }}>{label}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {nums.map((v, j) => {
                const isHead = j === idx;
                const isPast = j < idx;
                return (
                  <div key={j} style={{
                    width: 38, height: 38, borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isPast ? "#0d0d0d" : isHead ? `${color}22` : "rgba(255,255,255,0.03)",
                    border: isPast ? "1px solid #141414" : isHead ? `2px solid ${color}` : `1px solid ${color}44`,
                    color: isPast ? "#1a1a1a" : isHead ? color : `${color}88`,
                    fontSize: 13, fontWeight: 700,
                    opacity: isPast ? 0.2 : 1,
                    boxShadow: isHead ? `0 0 10px 2px ${color}33` : "none",
                    transition: "all 0.2s",
                  }}>
                    {v}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Candidate cards */}
      {!solved && !autoRunning && !done1 && !done2 && (
        <div style={{ display: "flex", gap: 32, marginBottom: 24, alignItems: "center" }}>
          {/* Left candidate */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "#3b82f6", letterSpacing: "0.08em" }}>ARRAY 1</span>
            <div
              onClick={() => handlePick("left")}
              style={{
                width: 72, height: 72, borderRadius: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(59,130,246,0.12)",
                border: smaller === "left" ? "2px solid #3b82f6" : "1px solid rgba(59,130,246,0.3)",
                color: "#3b82f6", fontSize: 26, fontWeight: 700,
                boxShadow: smaller === "left" ? "0 0 20px 4px rgba(59,130,246,0.35)" : "none",
                animation: shakingSide === "left"
                  ? "shake 0.38s ease"
                  : flyingSide === "left"
                  ? "cardFly 0.35s ease forwards"
                  : smaller === "left"
                  ? "pulse 1.2s ease-in-out infinite"
                  : "none",
              }}
            >
              {cand1}
            </div>
            {smaller === "left" && (
              <span style={{ fontSize: 8, color: "#3b82f6", letterSpacing: "0.08em" }}>SMALLER ↓</span>
            )}
          </div>

          <span style={{ fontSize: 9, color: "#374151" }}>VS</span>

          {/* Right candidate */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "#ef4444", letterSpacing: "0.08em" }}>ARRAY 2</span>
            <div
              onClick={() => handlePick("right")}
              style={{
                width: 72, height: 72, borderRadius: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(239,68,68,0.12)",
                border: smaller === "right" ? "2px solid #ef4444" : "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444", fontSize: 26, fontWeight: 700,
                boxShadow: smaller === "right" ? "0 0 20px 4px rgba(239,68,68,0.35)" : "none",
                animation: shakingSide === "right"
                  ? "shake 0.38s ease"
                  : flyingSide === "right"
                  ? "cardFly 0.35s ease forwards"
                  : smaller === "right"
                  ? "pulse 1.2s ease-in-out infinite"
                  : "none",
              }}
            >
              {cand2}
            </div>
            {smaller === "right" && (
              <span style={{ fontSize: 8, color: "#ef4444", letterSpacing: "0.08em" }}>SMALLER ↓</span>
            )}
          </div>
        </div>
      )}

      {/* Auto-merge running indicator */}
      {autoRunning && !solved && (
        <div style={{ marginBottom: 20, fontSize: 10, color: "#fbbf24", letterSpacing: "0.08em", animation: "fadeUp 0.3s ease" }}>
          ONE ARRAY EXHAUSTED — AUTO-MERGING REMAINDER...
        </div>
      )}

      {/* Merged output */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.08em", marginBottom: 8 }}>MERGED OUTPUT</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 44, padding: "8px 10px", background: "rgba(255,255,255,0.01)", border: "1px solid #1a1a1a", borderRadius: 8 }}>
          {merged.map((v, k) => {
            const fromArr1 = NUMS1.includes(v) && NUMS2.includes(v) ? (k % 2 === 0) : NUMS1.includes(v);
            const color = NUMS1.indexOf(v) >= 0 && !NUMS2.includes(v) ? "#3b82f6"
              : NUMS2.indexOf(v) >= 0 && !NUMS1.includes(v) ? "#ef4444"
              : k % 2 === 0 ? "#3b82f6" : "#ef4444";
            return (
              <div key={k} style={{
                width: 34, height: 34, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}18`, border: `1px solid ${color}55`,
                color, fontSize: 12, fontWeight: 700,
                animation: "cardLand 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                {v}
              </div>
            );
          })}
          {merged.length === 0 && (
            <span style={{ fontSize: 9, color: "#1e1e1e", alignSelf: "center" }}>empty</span>
          )}
        </div>
      </div>

      {/* Win */}
      {solved && (
        <div style={{
          padding: "16px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)", borderLeft: "3px solid rgba(34,197,94,0.7)",
          borderRadius: 6, fontSize: 12, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 2, animation: "winPop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          MERGED: [{merged.join(", ")}] ✓
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            TWO POINTERS · O(m+n) TIME
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 16, width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        ALWAYS PICK THE SMALLER FRONT CARD · GREEDY MERGE · WHEN ONE EXHAUSTED, APPEND REST
      </div>
    </div>
    </GameShell>
  );
}
