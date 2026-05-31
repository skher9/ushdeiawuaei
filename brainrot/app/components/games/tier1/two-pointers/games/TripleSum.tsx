"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const ARR = [-4, -2, -2, 0, 1, 2, 3, 5];

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
@keyframes thud {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.25); }
  60%  { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes pulse {
  0%,100% { transform: scale(1); opacity:0.85; }
  50%      { transform: scale(1.1); opacity:1; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes winBurst {
  0%   { transform: scale(0.8); opacity:0; }
  60%  { transform: scale(1.15); opacity:1; }
  100% { transform: scale(1); opacity:1; }
}
@keyframes fadeIn {
  from { opacity:0; transform:translateY(4px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

type Phase = "anchor" | "twoptr" | "solved";

export default function TripleSum({ onSolve, onAttempt }: GameProps) {
  const [phase, setPhase] = useState<Phase>("anchor");
  const [anchorIdx, setAnchorIdx] = useState<number | null>(null);
  const [L, setL] = useState(0);
  const [R, setR] = useState(ARR.length - 1);
  const [solved, setSolved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [shakingIdx, setShakingIdx] = useState<number | null>(null);
  const [exhaustedAnchors, setExhaustedAnchors] = useState<number[]>([]);
  const [winIndices, setWinIndices] = useState<number[]>([]);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1000);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  const anchor = anchorIdx !== null ? anchorIdx : -1;
  const sum = anchorIdx !== null ? ARR[anchorIdx] + ARR[L] + ARR[R] : null;

  function handleAnchorClick(idx: number) {
    if (phase !== "anchor" || exhaustedAnchors.includes(idx)) return;
    doAttempt();
    playTone(220, "triangle", 0.15);
    setAnchorIdx(idx);
    const nL = idx + 1;
    const nR = ARR.length - 1;
    setL(nL);
    setR(nR);
    setPhase("twoptr");
  }

  function handleTokenClick(idx: number) {
    if (phase !== "twoptr" || anchorIdx === null) return;
    if (idx === anchorIdx || idx === L || idx === R) return;
    doAttempt();

    const s = ARR[anchorIdx] + ARR[L] + ARR[R];

    // Only valid pulsing targets
    if (s < 0) {
      // Must advance L — only tokens between L and R (exclusive) can be clicked as new L
      if (idx > L && idx < R) {
        playTone(440);
        setL(idx);
        const ns = ARR[anchorIdx] + ARR[idx] + ARR[R];
        if (ns === 0) { celebrate(anchorIdx, idx, R); }
        else if (idx >= R) exhaustAnchor();
      } else {
        shake(idx);
      }
    } else if (s > 0) {
      // Must retreat R — only tokens between L and R (exclusive) can be clicked as new R
      if (idx > L && idx < R) {
        playTone(440);
        setR(idx);
        const ns = ARR[anchorIdx] + ARR[L] + ARR[idx];
        if (ns === 0) { celebrate(anchorIdx, L, idx); }
        else if (L >= idx) exhaustAnchor();
      } else {
        shake(idx);
      }
    }
  }

  function celebrate(i: number, l: number, r: number) {
    playWin();
    setWinIndices([i, l, r]);
    setPhase("solved");
    setSolved(true);
  }

  function exhaustAnchor() {
    if (anchorIdx === null) return;
    setExhaustedAnchors(prev => [...prev, anchorIdx!]);
    setPhase("anchor");
    setAnchorIdx(null);
  }

  function shake(idx: number) {
    playTone(200, "sawtooth", 0.08);
    setShakingIdx(idx);
    setTimeout(() => setShakingIdx(null), 380);
  }

  // For the two-pointer phase, tokens that can be clicked
  function isPulsingBlue(idx: number) {
    if (phase !== "twoptr" || anchorIdx === null) return false;
    if (sum === null || sum >= 0) return false;
    return idx > L && idx < R;
  }
  function isPulsingRed(idx: number) {
    if (phase !== "twoptr" || anchorIdx === null) return false;
    if (sum === null || sum <= 0) return false;
    return idx > L && idx < R;
  }

  const currentSumDisplay = anchorIdx !== null
    ? `${ARR[anchorIdx]} + ${ARR[L]} + ${ARR[R]} = ${sum}`
    : "";

  const mission = getMission("two-pointers", 5);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "L PTR", value: L }, { label: "R PTR", value: R }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Target */}
      <div style={{
        marginBottom: 20, padding: "10px 24px",
        background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.22)",
        borderRadius: 6, fontSize: 20, color: "#f43f5e", fontWeight: 700, letterSpacing: "0.1em",
      }}>
        TARGET SUM: 0
      </div>

      {/* Sum display (twoptr phase) */}
      {phase === "twoptr" && anchorIdx !== null && (
        <div style={{
          marginBottom: 16, padding: "8px 20px",
          background: sum === 0 ? "rgba(34,197,94,0.08)" : sum! < 0 ? "rgba(59,130,246,0.07)" : "rgba(239,68,68,0.07)",
          border: `1px solid ${sum === 0 ? "rgba(34,197,94,0.35)" : sum! < 0 ? "rgba(59,130,246,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 6, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
          color: sum === 0 ? "#22c55e" : sum! < 0 ? "#3b82f6" : "#ef4444",
          animation: "fadeIn 0.25s ease",
        }}>
          {currentSumDisplay}
          {sum! < 0 && <span style={{ marginLeft: 10, fontSize: 10, opacity: 0.75 }}>TOO SMALL</span>}
          {sum! > 0 && <span style={{ marginLeft: 10, fontSize: 10, opacity: 0.75 }}>TOO BIG</span>}
        </div>
      )}

      {/* Number line */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        {/* Track */}
        <div style={{
          position: "absolute", top: "calc(50% - 6px)", left: 16, right: 16, height: 2,
          background: "linear-gradient(90deg, #111, #222, #111)", borderRadius: 1,
          transform: "translateY(-50%)", zIndex: 0,
        }} />
        <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1 }}>
          {ARR.map((val, i) => {
            const isAnchor = i === anchorIdx;
            const isL = phase === "twoptr" && i === L;
            const isR = phase === "twoptr" && i === R;
            const isExhausted = exhaustedAnchors.includes(i);
            const isWin = winIndices.includes(i);
            const isGreyedOut = anchorIdx !== null && i <= anchorIdx && !isAnchor;
            const pBlue = isPulsingBlue(i);
            const pRed = isPulsingRed(i);
            const isShaking = shakingIdx === i;

            let bg = "#111"; let border = "2px solid #1e1e1e"; let color = "#2a2a2a";
            let cursor = "default"; let anim = ""; let shadow = "none";

            if (isWin) {
              bg = "rgba(34,197,94,0.2)"; border = "2px solid rgba(34,197,94,0.8)";
              color = "#22c55e"; shadow = "0 0 16px 4px rgba(34,197,94,0.4)";
              anim = "winBurst 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards";
            } else if (isAnchor) {
              bg = "rgba(244,63,94,0.18)"; border = "2px solid rgba(244,63,94,0.7)";
              color = "#f43f5e"; shadow = "0 0 14px 4px rgba(244,63,94,0.3)";
              anim = "thud 0.35s ease";
            } else if (isL) {
              bg = "rgba(59,130,246,0.15)"; border = "2px solid rgba(59,130,246,0.7)";
              color = "#3b82f6"; shadow = "0 0 10px 3px rgba(59,130,246,0.3)";
            } else if (isR) {
              bg = "rgba(239,68,68,0.15)"; border = "2px solid rgba(239,68,68,0.7)";
              color = "#ef4444"; shadow = "0 0 10px 3px rgba(239,68,68,0.3)";
            } else if (pBlue) {
              bg = "rgba(59,130,246,0.08)"; border = "1px solid rgba(59,130,246,0.5)";
              color = "#60a5fa"; cursor = "pointer"; anim = "pulse 1s ease-in-out infinite";
              shadow = "0 0 8px 2px rgba(59,130,246,0.25)";
            } else if (pRed) {
              bg = "rgba(239,68,68,0.08)"; border = "1px solid rgba(239,68,68,0.5)";
              color = "#f87171"; cursor = "pointer"; anim = "pulse 1s ease-in-out infinite";
              shadow = "0 0 8px 2px rgba(239,68,68,0.25)";
            } else if (isExhausted) {
              bg = "#0d0d0d"; border = "1px solid #161616"; color = "#1e1e1e";
            } else if (phase === "anchor" && !isExhausted) {
              bg = "rgba(255,255,255,0.04)"; border = "1px solid #2a2a2a";
              color = "#64748b"; cursor = "pointer";
            } else if (isGreyedOut) {
              bg = "#0d0d0d"; border = "1px solid #151515"; color = "#1a1a1a";
            }

            if (isShaking) anim = "shake 0.38s ease";

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                {/* Pointer labels above */}
                <div style={{ height: 14, display: "flex", gap: 2, alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>
                  {isAnchor && <span style={{ color: "#f43f5e" }}>i</span>}
                  {isL && !isAnchor && <span style={{ color: "#3b82f6" }}>L</span>}
                  {isR && !isAnchor && <span style={{ color: "#ef4444" }}>R</span>}
                </div>
                <div
                  onClick={() => {
                    if (phase === "anchor") handleAnchorClick(i);
                    else handleTokenClick(i);
                  }}
                  style={{
                    width: 50, height: 50, borderRadius: 8,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: bg, border, boxShadow: shadow, color, cursor, animation: anim,
                    transition: "background 0.2s, border 0.2s, box-shadow 0.2s",
                    fontSize: 14, fontWeight: 700,
                  }}
                >
                  {val}
                </div>
                <div style={{ fontSize: 8, color: "#1e1e1e" }}>[{i}]</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instruction */}
      {phase === "twoptr" && sum !== null && sum !== 0 && (
        <div style={{
          marginBottom: 14, padding: "6px 14px",
          background: "rgba(255,255,255,0.02)", border: "1px solid #181818", borderRadius: 4,
          fontSize: 10, letterSpacing: "0.06em", textAlign: "center",
          color: sum < 0 ? "#1d4ed8" : "#991b1b",
        }}>
          {sum < 0 ? "CLICK A GLOWING BLUE TOKEN TO ADVANCE L →" : "CLICK A GLOWING RED TOKEN TO RETREAT R ←"}
        </div>
      )}

      {/* Exhausted anchor message */}
      {phase === "anchor" && exhaustedAnchors.length > 0 && (
        <div style={{
          marginBottom: 14, padding: "10px 18px",
          background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.25)",
          borderRadius: 6, fontSize: 11, color: "#fb923c", letterSpacing: "0.06em",
          textAlign: "center", animation: "fadeIn 0.3s ease",
        }}>
          NO TRIPLET WITH i={ARR[exhaustedAnchors[exhaustedAnchors.length - 1]]} — TRY ANOTHER ANCHOR
        </div>
      )}

      {/* Win */}
      {phase === "solved" && (
        <div style={{
          padding: "16px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)", borderLeft: "3px solid rgba(34,197,94,0.7)",
          borderRadius: 6, fontSize: 12, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 2, animation: "winBurst 0.4s ease",
        }}>
          FOUND: [{winIndices.map(i => ARR[i]).join(", ")}] = 0 ✓
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            {winIndices.map(i => ARR[i]).join(" + ")} = 0
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 16, width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        FIX i, TWO-POINTER L=i+1 R=END · SUM&lt;0→L↑ SUM&gt;0→R↓ · O(n²) vs O(n³) BRUTE
      </div>
    </div>
    </GameShell>
  );
}
