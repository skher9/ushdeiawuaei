"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const ARR = [4, 5, 6, 7, 0, 1, 2];
const TARGET = 0;
// Rotation point is between index 3 and 4 (7 → 0)
const ROTATE_AFTER = 3; // visual marker between idx 3 and 4

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

function playFlip()   { playTone(350, "sine", 0.1); }
function playElim()   { playTone(280, "triangle", 0.15); }
function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 100));
}

const KEYFRAMES = `
@keyframes cardFlip {
  0%   { transform: rotateY(0deg); }
  50%  { transform: rotateY(90deg) scale(1.1); }
  100% { transform: rotateY(0deg); }
}
@keyframes eliminate {
  0%   { opacity:1; transform:scale(1); }
  100% { opacity:0.15; transform:scale(0.85); }
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 transparent; transform:scale(1); }
  50%      { box-shadow: 0 0 14px 4px currentColor; transform:scale(1.06); }
}
@keyframes winBurst {
  0%   { transform:scale(0.7); opacity:0; }
  60%  { transform:scale(1.2); opacity:1; }
  100% { transform:scale(1); opacity:1; }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes shake {
  0%,100% { transform:translateX(0); }
  25% { transform:translateX(-5px); }
  75% { transform:translateX(5px); }
}
`;

type Phase = "search" | "found" | "notfound";

export default function SqueezePlay({ onSolve, onAttempt }: GameProps) {
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(ARR.length - 1);
  const [solved, setSolved] = useState(false);
  const [phase, setPhase] = useState<Phase>("search");
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [shakingIdx, setShakingIdx] = useState<number | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (phase === "found" && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1000);
    }
  }, [phase, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  const mid = Math.floor((lo + hi) / 2);

  // Determine which half is sorted
  const leftSorted  = ARR[lo] <= ARR[mid];
  const rightSorted = ARR[mid] <= ARR[hi];

  // Is target in left sorted half?
  const targetInLeft  = leftSorted  && TARGET >= ARR[lo]  && TARGET <= ARR[mid];
  const targetInRight = rightSorted && TARGET >  ARR[mid] && TARGET <= ARR[hi];

  function handleCardClick(idx: number) {
    if (phase !== "search") return;
    if (idx < lo || idx > hi) return; // already eliminated
    doAttempt();

    // If player clicks the mid card — inspect it
    if (idx === mid) {
      playFlip();
      if (ARR[mid] === TARGET) {
        playWin();
        setPhase("found");
        setSolved(true);
        return;
      }
      // Show feedback — shake
      setShakingIdx(idx);
      setTimeout(() => setShakingIdx(null), 380);
      return;
    }

    // Player is choosing which half to KEEP by clicking a card in that half
    // Clicking left half (lo..mid-1) = "keep left half"
    // Clicking right half (mid+1..hi) = "keep right half"
    const clickedLeft = idx < mid;
    const clickedRight = idx > mid;

    // Correct decision based on where target actually is
    const shouldKeepLeft  = targetInLeft;
    const shouldKeepRight = targetInRight || !targetInLeft;

    if (clickedLeft && shouldKeepLeft) {
      // Eliminate right half
      playElim();
      const elim: number[] = [];
      for (let k = mid + 1; k <= hi; k++) elim.push(k);
      setEliminated(prev => [...prev, ...elim]);
      const nHi = mid; // keep lo..mid
      setHi(nHi);
      setStepCount(s => s + 1);
      if (lo === nHi) checkSingle(lo);
    } else if (clickedRight && !shouldKeepLeft) {
      // Eliminate left half
      playElim();
      const elim: number[] = [];
      for (let k = lo; k <= mid; k++) elim.push(k);
      setEliminated(prev => [...prev, ...elim]);
      const nLo = mid + 1; // keep mid+1..hi
      setLo(nLo);
      setStepCount(s => s + 1);
      if (nLo === hi) checkSingle(nLo);
    } else {
      // Wrong half — shake the clicked card
      playTone(200, "sawtooth", 0.1);
      setShakingIdx(idx);
      setTimeout(() => setShakingIdx(null), 380);
    }
  }

  function checkSingle(idx: number) {
    if (ARR[idx] === TARGET) {
      setTimeout(() => { playWin(); setPhase("found"); setSolved(true); }, 150);
    } else {
      setTimeout(() => setPhase("notfound"), 150);
    }
  }

  const activeRange = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
  const newMid = Math.floor((lo + hi) / 2);

  const mission = getMission("two-pointers", 8);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "LO PTR", value: lo }, { label: "HI PTR", value: hi }];

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
        marginBottom: 20, padding: "10px 28px",
        background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.22)",
        borderRadius: 6, fontSize: 20, color: "#f43f5e", fontWeight: 700, letterSpacing: "0.1em",
      }}>
        FIND: {TARGET}
      </div>

      {/* Pointers display */}
      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
        {[["lo", lo, "#22c55e"], ["mid", mid, "#fbbf24"], ["hi", hi, "#a78bfa"]].map(([lbl, val, col]) => (
          <div key={lbl as string} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#374151", letterSpacing: "0.08em" }}>{lbl as string}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: col as string }}>
              {lbl === "mid" ? `${val} → ${ARR[val as number]}` : val as number}
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 8, color: "#374151" }}>STEPS</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>{stepCount}</div>
        </div>
      </div>

      {/* Card strip */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, position: "relative" }}>
        {ARR.map((val, i) => {
          const isMid = i === mid && phase === "search";
          const isLo  = i === lo  && phase === "search";
          const isHi  = i === hi  && phase === "search";
          const isElim = eliminated.includes(i) || (phase === "search" && (i < lo || i > hi) && !eliminated.includes(i));
          const isFound = phase === "found" && val === TARGET && i >= lo && i <= hi;
          const isShaking = shakingIdx === i;

          // Rotation gap marker
          const showRotMark = i === ROTATE_AFTER && !isElim;

          let bg = "rgba(255,255,255,0.04)";
          let border = "1px solid #222";
          let color = "#555";
          let shadow = "none";
          let cursor = "default";
          let anim = "";

          if (isFound) {
            bg = "rgba(34,197,94,0.2)"; border = "2px solid rgba(34,197,94,0.8)";
            color = "#22c55e"; shadow = "0 0 20px 6px rgba(34,197,94,0.4)";
            anim = "winBurst 0.4s cubic-bezier(0.34,1.56,0.64,1)";
          } else if (isElim) {
            bg = "#0c0c0c"; border = "1px solid #141414"; color = "#1a1a1a";
            anim = "eliminate 0.3s ease forwards";
          } else if (isMid) {
            bg = "rgba(251,191,36,0.18)"; border = "2px solid rgba(251,191,36,0.8)";
            color = "#fbbf24"; shadow = "0 0 16px 4px rgba(251,191,36,0.35)";
            cursor = "pointer"; anim = isShaking ? "shake 0.38s ease" : "pulse 1.5s ease-in-out infinite";
          } else if (i < mid && !isElim && phase === "search") {
            // Left half — clickable if target is in left half
            bg = leftSorted && targetInLeft ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)";
            border = leftSorted && targetInLeft ? "1px solid rgba(59,130,246,0.35)" : "1px solid #1e1e1e";
            color = leftSorted && targetInLeft ? "#60a5fa" : "#2e2e2e";
            cursor = "pointer";
          } else if (i > mid && !isElim && phase === "search") {
            // Right half
            bg = !leftSorted || !targetInLeft ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.02)";
            border = !leftSorted || !targetInLeft ? "1px solid rgba(239,68,68,0.35)" : "1px solid #1e1e1e";
            color = !leftSorted || !targetInLeft ? "#f87171" : "#2e2e2e";
            cursor = "pointer";
          }

          if (isShaking && !isMid) anim = "shake 0.38s ease";

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              {/* Pointer label above */}
              <div style={{ height: 14, display: "flex", gap: 2, alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>
                {isLo  && <span style={{ color: "#22c55e" }}>lo</span>}
                {isMid && <span style={{ color: "#fbbf24" }}>mid</span>}
                {isHi  && <span style={{ color: "#a78bfa" }}>hi</span>}
              </div>

              <div style={{ position: "relative" }}>
                {/* Rotation marker */}
                {showRotMark && (
                  <div style={{
                    position: "absolute", right: -10, top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 10, color: "#374151", zIndex: 5,
                    userSelect: "none",
                  }}>⟳</div>
                )}
                <div
                  onClick={() => handleCardClick(i)}
                  style={{
                    width: 52, height: 60, borderRadius: 8,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: bg, border, boxShadow: shadow, color, cursor,
                    animation: anim, fontSize: 16, fontWeight: 700,
                    transition: "background 0.2s, border 0.2s",
                    opacity: isElim ? 0.15 : 1,
                  }}
                >
                  {val}
                  <span style={{ fontSize: 8, opacity: 0.5, marginTop: 2 }}>[{i}]</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint panel */}
      {phase === "search" && hi > lo && (
        <div style={{
          marginBottom: 14, padding: "10px 16px",
          background: "rgba(255,255,255,0.01)", border: "1px solid #181818", borderRadius: 6,
          fontSize: 10, color: "#475569", letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.8,
          animation: "fadeUp 0.2s ease",
        }}>
          {leftSorted
            ? `LEFT HALF [${lo}..${mid}] IS SORTED (${ARR[lo]}→${ARR[mid]})`
            : `RIGHT HALF [${mid}..${hi}] IS SORTED (${ARR[mid]}→${ARR[hi]})`}
          <br />
          <span style={{ color: targetInLeft ? "#3b82f6" : "#ef4444", fontSize: 9 }}>
            {targetInLeft
              ? `TARGET ${TARGET} IS IN LEFT HALF → CLICK LEFT`
              : `TARGET ${TARGET} IS IN RIGHT HALF → CLICK RIGHT`}
          </span>
        </div>
      )}

      {/* Not found */}
      {phase === "notfound" && (
        <div style={{
          padding: "14px 22px", background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.3)", borderLeft: "3px solid rgba(239,68,68,0.6)",
          borderRadius: 6, fontSize: 12, color: "#ef4444", letterSpacing: "0.08em",
          textAlign: "center", animation: "fadeUp 0.3s ease",
        }}>
          NOT FOUND — {TARGET} NOT IN ARRAY
        </div>
      )}

      {/* Found */}
      {phase === "found" && (
        <div style={{
          padding: "16px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)", borderLeft: "3px solid rgba(34,197,94,0.7)",
          borderRadius: 6, fontSize: 12, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 2, animation: "winBurst 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          FOUND {TARGET} AT INDEX {ARR.indexOf(TARGET)} IN {stepCount + 1} STEPS ✓
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            BINARY SEARCH ON ROTATED ARRAY · O(log n)
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 16, width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        ONE HALF IS ALWAYS SORTED · CHECK IF TARGET IN SORTED HALF → ELIMINATE OTHER · O(log n)
      </div>
    </div>
    </GameShell>
  );
}
