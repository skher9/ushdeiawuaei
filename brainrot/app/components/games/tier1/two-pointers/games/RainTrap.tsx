"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const HEIGHTS = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
const N = HEIGHTS.length;
const MAX_H = Math.max(...HEIGHTS);

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

function playDrip() {
  playTone(600, "sine", 0.08);
  setTimeout(() => playTone(400, "sine", 0.08), 90);
}

function playWin() {
  [400, 500, 600, 700, 900].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.15), i * 80));
}

// Pre-compute answer for reference: 6 units

const KEYFRAMES = `
@keyframes rainFall {
  0%   { transform: translateY(-10px); opacity:0.7; }
  80%  { opacity:0.5; }
  100% { transform: translateY(52px); opacity:0; }
}
@keyframes waterRise {
  from { transform: scaleY(0); opacity:0; }
  to   { transform: scaleY(1); opacity:1; }
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 0 currentColor; opacity:1; }
  50%      { box-shadow: 0 0 0 4px transparent; opacity:0.85; }
}
@keyframes pulseBorder {
  0%,100% { border-color: currentColor; }
  50%      { border-color: transparent; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
@keyframes winGlow {
  0%,100% { box-shadow: 0 0 6px 2px rgba(59,130,246,0.5); }
  50%      { box-shadow: 0 0 18px 6px rgba(59,130,246,0.8); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

// Raindrop positions (stable, computed once)
const RAIN_DROPS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 8.1 + 3) % 96}%`,
  delay: `${(i * 0.18) % 1.5}s`,
  dur: `${0.7 + (i % 5) * 0.12}s`,
}));

export default function RainTrap({ onSolve, onAttempt }: GameProps) {
  const [L, setL] = useState(0);
  const [R, setR] = useState(N - 1);
  const [maxL, setMaxL] = useState(0);
  const [maxR, setMaxR] = useState(0);
  const [water, setWater] = useState<number[]>(Array(N).fill(0));
  const [total, setTotal] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shakingCol, setShakingCol] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [newFill, setNewFill] = useState<number | null>(null); // column with fresh fill
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

  // Which side should be processed?
  const processLeft = HEIGHTS[L] <= HEIGHTS[R];

  function handleColClick(idx: number) {
    if (solved) return;
    doAttempt();

    const shouldBeL = processLeft;
    const isCorrect = shouldBeL ? idx === L : idx === R;

    if (!isCorrect) {
      playTone(200, "sawtooth", 0.1);
      setShakingCol(idx);
      setTimeout(() => setShakingCol(null), 380);
      return;
    }

    if (shouldBeL) {
      // Process left
      const newMaxL = Math.max(maxL, HEIGHTS[L]);
      const fill = Math.max(0, newMaxL - HEIGHTS[L]);
      const newWater = [...water];
      newWater[L] = fill;
      const newTotal = total + fill;

      if (fill > 0) playDrip();
      else playTone(350, "sine", 0.08);

      setNewFill(fill > 0 ? L : null);
      setTimeout(() => setNewFill(null), 500);

      setMaxL(newMaxL);
      setWater(newWater);
      setTotal(newTotal);
      const nL = L + 1;
      setL(nL);
      if (nL >= R) { playWin(); setSolved(true); }
    } else {
      // Process right
      const newMaxR = Math.max(maxR, HEIGHTS[R]);
      const fill = Math.max(0, newMaxR - HEIGHTS[R]);
      const newWater = [...water];
      newWater[R] = fill;
      const newTotal = total + fill;

      if (fill > 0) playDrip();
      else playTone(350, "sine", 0.08);

      setNewFill(fill > 0 ? R : null);
      setTimeout(() => setNewFill(null), 500);

      setMaxR(newMaxR);
      setWater(newWater);
      setTotal(newTotal);
      const nR = R - 1;
      setR(nR);
      if (L >= nR) { playWin(); setSolved(true); }
    }
  }

  const BAR_W = 36;
  const BAR_GAP = 6;
  const CELL_H = 24; // pixels per unit height
  const GRID_H = (MAX_H + 1) * CELL_H;

  const mission = getMission("two-pointers", 6);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "TRAPPED", value: total }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {[
          ["TRAPPED", `${total} units`, "#3b82f6"],
          ["maxL", `${maxL}`, "#22c55e"],
          ["maxR", `${maxR}`, "#a78bfa"],
          ["L", `${L}`, "#3b82f6"],
          ["R", `${R}`, "#ef4444"],
        ].map(([lbl, val, col]) => (
          <div key={lbl as string} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#374151", letterSpacing: "0.08em" }}>{lbl}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: col as string }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Cityscape + rain */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        {/* Rain drops */}
        {!solved && RAIN_DROPS.map((d, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, left: d.left,
            width: 2, height: 10, borderRadius: 1,
            background: "rgba(147,197,253,0.55)",
            animation: `rainFall ${d.dur} ${d.delay} linear infinite`,
            pointerEvents: "none", zIndex: 10,
          }} />
        ))}

        <div style={{ display: "flex", gap: BAR_GAP, alignItems: "flex-end", height: GRID_H + 20 }}>
          {HEIGHTS.map((h, i) => {
            const isL = i === L && !solved;
            const isR = i === R && !solved;
            const isProcessed = i < L || i > R;
            const shouldHighlightL = processLeft && isL;
            const shouldHighlightR = !processLeft && isR;
            const isHighlighted = shouldHighlightL || shouldHighlightR;
            const wUnits = water[i];
            const isShaking = shakingCol === i;
            const isFresh = newFill === i;

            const barPx = h * CELL_H;
            const waterPx = wUnits * CELL_H;
            const totalPx = barPx + waterPx;

            let buildingBg = isHighlighted
              ? "rgba(59,130,246,0.35)"
              : isProcessed ? "#111" : "rgba(100,116,139,0.25)";
            let buildingBorder = isHighlighted
              ? "2px solid rgba(59,130,246,0.7)"
              : isProcessed ? "1px solid #1a1a1a" : "1px solid rgba(100,116,139,0.4)";
            if (isR && !processLeft && !solved) {
              buildingBg = "rgba(239,68,68,0.25)";
              buildingBorder = "2px solid rgba(239,68,68,0.6)";
            }

            return (
              <div
                key={i}
                onClick={() => handleColClick(i)}
                style={{
                  position: "relative",
                  width: BAR_W,
                  height: totalPx > 0 ? totalPx : 4,
                  cursor: isHighlighted ? "pointer" : "default",
                  animation: isShaking ? "shake 0.35s ease" : "none",
                }}
              >
                {/* Water fill */}
                {wUnits > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: barPx,
                    left: 0,
                    right: 0,
                    height: waterPx,
                    background: solved ? "rgba(59,130,246,0.55)" : "rgba(59,130,246,0.45)",
                    borderRadius: "2px 2px 0 0",
                    animation: isFresh ? "waterRise 0.4s ease" : "none",
                    transformOrigin: "bottom",
                    boxShadow: solved ? "0 0 8px rgba(59,130,246,0.4)" : "none",
                    zIndex: 3,
                  }} />
                )}
                {/* Building */}
                {h > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: 0, left: 0, right: 0,
                    height: barPx,
                    background: buildingBg,
                    border: buildingBorder,
                    borderRadius: "2px 2px 0 0",
                    zIndex: 4,
                    transition: "background 0.2s, border 0.2s",
                    animation: isHighlighted ? "pulseBorder 1s ease-in-out infinite" : "none",
                    color: isHighlighted ? (processLeft ? "#3b82f6" : "#ef4444") : "transparent",
                  }} />
                )}
                {/* Pointer arrows */}
                {(isL || isR) && !solved && (
                  <div style={{
                    position: "absolute", bottom: -18, left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 9, fontWeight: 700,
                    color: isL ? "#3b82f6" : "#ef4444",
                  }}>
                    {isL ? "L" : "R"}
                  </div>
                )}
                {/* Height label */}
                <div style={{
                  position: "absolute", top: -(totalPx + 10),
                  left: "50%", transform: "translateX(-50%)",
                  fontSize: 9, color: "#374151",
                }}>
                  {h}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ground line */}
      <div style={{ width: "100%", maxWidth: 500, height: 2, background: "#1e1e1e", borderRadius: 1, marginBottom: 20 }} />

      {/* Instruction */}
      {!solved && (
        <div style={{
          marginBottom: 16, padding: "7px 14px",
          background: processLeft ? "rgba(59,130,246,0.05)" : "rgba(239,68,68,0.05)",
          border: `1px solid ${processLeft ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"}`,
          borderRadius: 4, fontSize: 10, letterSpacing: "0.06em",
          color: processLeft ? "#3b82f6" : "#ef4444",
          textAlign: "center",
        }}>
          {processLeft
            ? `HEIGHTS[L]=${HEIGHTS[L]} ≤ HEIGHTS[R]=${HEIGHTS[R]} → CLICK LEFT COLUMN`
            : `HEIGHTS[L]=${HEIGHTS[L]} > HEIGHTS[R]=${HEIGHTS[R]} → CLICK RIGHT COLUMN`}
        </div>
      )}

      {/* Win */}
      {solved && (
        <div style={{
          padding: "16px 24px", background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.3)", borderLeft: "3px solid rgba(59,130,246,0.7)",
          borderRadius: 6, fontSize: 12, color: "#3b82f6", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 2, animation: "fadeUp 0.4s ease",
        }}>
          TOTAL TRAPPED: {total} UNITS ✓
          <br />
          <span style={{ fontSize: 9, color: "#60a5fa", opacity: 0.8 }}>
            TWO-POINTER SOLUTION · O(n) TIME · O(1) SPACE
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 8, width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        H[L]≤H[R]→PROCESS LEFT: water=maxL-H[L], L++ · ELSE PROCESS RIGHT: water=maxR-H[R], R--
      </div>
    </div>
    </GameShell>
  );
}
