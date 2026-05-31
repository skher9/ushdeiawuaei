"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const HEIGHTS = [1, 8, 6, 2, 5, 4, 8, 3];
const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const BAR_W = 40;
const GAP = 6;
const BAR_SCALE = 22; // px per unit height

function computeArea(l: number, r: number): number {
  return Math.min(HEIGHTS[l], HEIGHTS[r]) * (r - l);
}

function globalMax(): number {
  let best = 0;
  for (let l = 0; l < HEIGHTS.length - 1; l++) {
    for (let r = l + 1; r < HEIGHTS.length; r++) {
      best = Math.max(best, computeArea(l, r));
    }
  }
  return best;
}

const GLOBAL_MAX = globalMax();

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playWin() {
  playTone(523);
  setTimeout(() => playTone(659), 100);
  setTimeout(() => playTone(784), 200);
}

const KEYFRAMES = `
@keyframes ripple {
  0% { opacity: 0.5; transform: scaleX(1); }
  50% { opacity: 0.8; transform: scaleX(1.01); }
  100% { opacity: 0.5; transform: scaleX(1); }
}
@keyframes waterWave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes handlePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
}
@keyframes handlePulseR {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
}
@keyframes winPop {
  0% { transform: scale(0.95); opacity: 0; }
  60% { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

export default function ContainerCraft({ onSolve, onAttempt }: GameProps) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(HEIGHTS.length - 1);
  const [maxArea, setMaxArea] = useState(computeArea(0, HEIGHTS.length - 1));
  const [dragging, setDragging] = useState<"L" | "R" | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockResult, setLockResult] = useState<"correct" | "wrong" | null>(null);
  const [solved, setSolved] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const solvedRef = useRef(false);
  const lastSoundTime = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentArea = computeArea(left, right);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 1000);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) {
      setAttempted(true);
      onAttempt();
    }
  }

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const col = Math.round(x / (BAR_W + GAP));
    const clamped = Math.max(0, Math.min(HEIGHTS.length - 1, col));

    let newL = left;
    let newR = right;

    if (dragging === "L" && clamped < right) {
      newL = clamped;
      setLeft(clamped);
    }
    if (dragging === "R" && clamped > left) {
      newR = clamped;
      setRight(clamped);
    }

    const area = computeArea(newL, newR);
    setMaxArea((prev) => {
      const next = Math.max(prev, area);
      if (next > prev) {
        playTone(600, "sine", 0.15);
      }
      return next;
    });

    // Throttled drag sound
    const now = Date.now();
    if (now - lastSoundTime.current > 200) {
      lastSoundTime.current = now;
      const a = computeArea(newL, newR);
      playTone(300 + a * 2, "sine", 0.05);
    }
  }, [dragging, left, right]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      handleDragMove(clientX);
    };
    const onUp = () => {
      setDragging(null);
      setIsDraggingActive(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [dragging, handleDragMove]);

  function startDrag(which: "L" | "R") {
    if (locked) return;
    doAttempt();
    setDragging(which);
    setIsDraggingActive(true);
  }

  function handleLockIn() {
    if (locked) return;
    doAttempt();
    setLocked(true);
    if (maxArea === GLOBAL_MAX) {
      setLockResult("correct");
      setSolved(true);
      playWin();
    } else {
      setLockResult("wrong");
      playTone(200, "sawtooth", 0.2);
    }
  }

  function handleReset() {
    setLeft(0);
    setRight(HEIGHTS.length - 1);
    setMaxArea(computeArea(0, HEIGHTS.length - 1));
    setLocked(false);
    setLockResult(null);
    setDragging(null);
  }

  const maxH = Math.max(...HEIGHTS);
  const boardH = maxH * BAR_SCALE;

  // Water geometry
  const waterMinH = Math.min(HEIGHTS[left], HEIGHTS[right]) * BAR_SCALE;
  const colWidth = BAR_W + GAP;
  const waterLeft = left * colWidth;
  const waterWidth = (right - left) * colWidth + BAR_W;

  const mission = getMission("two-pointers", 2);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "MAX AREA", value: maxArea }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        <div style={{
          padding: "9px 18px",
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 700,
          color: "#60a5fa",
          letterSpacing: "0.08em",
        }}>
          AREA: {currentArea}
        </div>
        <div style={{
          padding: "9px 18px",
          background: maxArea === GLOBAL_MAX
            ? "rgba(34,197,94,0.07)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${maxArea === GLOBAL_MAX ? "rgba(34,197,94,0.3)" : "#1e1e1e"}`,
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 700,
          color: maxArea === GLOBAL_MAX ? "#22c55e" : "#475569",
          letterSpacing: "0.08em",
          transition: "all 0.2s",
        }}>
          BEST: {maxArea}
        </div>
      </div>

      {/* Bar chart + water visualization */}
      <div style={{ position: "relative", marginBottom: 0 }}>
        {/* Water pool background */}
        <div
          ref={trackRef}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: GAP,
            height: boardH,
            position: "relative",
          }}
        >
          {/* Water fill layer — behind bars */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: waterLeft,
            width: waterWidth,
            height: waterMinH,
            background: isDraggingActive
              ? "rgba(59,130,246,0.22)"
              : "rgba(59,130,246,0.16)",
            borderTop: "2px solid rgba(59,130,246,0.5)",
            borderRadius: "2px 2px 0 0",
            transition: "all 0.15s ease",
            animation: isDraggingActive ? "ripple 0.6s ease-in-out infinite" : "waterWave 3s ease-in-out infinite",
            zIndex: 0,
            pointerEvents: "none",
          }} />

          {HEIGHTS.map((h, i) => {
            const isLeft = i === left;
            const isRight = i === right;
            const barH = h * BAR_SCALE;

            let barBg = "#141414";
            let barBorder = "1px solid #1e1e1e";
            if (solved && (isLeft || isRight)) {
              barBg = "rgba(34,197,94,0.2)";
              barBorder = "2px solid rgba(34,197,94,0.5)";
            } else if (isLeft) {
              barBg = "rgba(59,130,246,0.2)";
              barBorder = "2px solid rgba(59,130,246,0.55)";
            } else if (isRight) {
              barBg = "rgba(239,68,68,0.2)";
              barBorder = "2px solid rgba(239,68,68,0.55)";
            }

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  zIndex: 1,
                  position: "relative",
                }}
              >
                {/* Height label */}
                <span style={{
                  fontSize: 9,
                  color: isLeft ? "#3b82f6" : isRight ? "#ef4444" : "#2a2a2a",
                  marginBottom: 3,
                  position: "absolute",
                  top: boardH - barH - 16,
                }}>
                  {h}
                </span>
                {/* Bar */}
                <div style={{
                  width: BAR_W,
                  height: barH,
                  background: barBg,
                  border: barBorder,
                  borderRadius: "3px 3px 0 0",
                  transition: "background 0.15s, border 0.15s",
                  marginTop: boardH - barH,
                  position: "relative",
                }}>
                  {isLeft && (
                    <span style={{
                      position: "absolute",
                      top: 4,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#3b82f6",
                      fontWeight: 700,
                    }}>L</span>
                  )}
                  {isRight && (
                    <span style={{
                      position: "absolute",
                      top: 4,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      fontSize: 9,
                      color: "#ef4444",
                      fontWeight: 700,
                    }}>R</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drag handle row */}
        <div style={{
          display: "flex",
          gap: GAP,
          marginTop: 8,
          paddingBottom: 4,
          position: "relative",
        }}>
          {HEIGHTS.map((_, i) => {
            const isLeft = i === left;
            const isRight = i === right;
            const isHandle = isLeft || isRight;

            if (!isHandle) {
              return (
                <div
                  key={i}
                  style={{
                    width: BAR_W,
                    height: 28,
                    flexShrink: 0,
                  }}
                />
              );
            }

            const isL = isLeft;
            const handleColor = isL ? "#3b82f6" : "#ef4444";
            const handleBg = isL ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)";
            const handleBorder = isL
              ? "2px solid rgba(59,130,246,0.6)"
              : "2px solid rgba(239,68,68,0.6)";
            const pulseAnim = dragging === (isL ? "L" : "R")
              ? "none"
              : isL
              ? "handlePulse 1.5s ease-in-out infinite"
              : "handlePulseR 1.5s ease-in-out infinite";

            return (
              <div
                key={i}
                style={{
                  width: BAR_W,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  onMouseDown={() => startDrag(isL ? "L" : "R")}
                  onTouchStart={() => startDrag(isL ? "L" : "R")}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: handleBg,
                    border: handleBorder,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: locked ? "default" : "grab",
                    fontSize: 10,
                    fontWeight: 700,
                    color: handleColor,
                    animation: locked ? "none" : pulseAnim,
                    transition: "background 0.15s",
                    touchAction: "none",
                  }}
                >
                  {isL ? "L" : "R"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Index row */}
        <div style={{ display: "flex", gap: GAP }}>
          {HEIGHTS.map((_, i) => (
            <div key={i} style={{ width: BAR_W, textAlign: "center", fontSize: 8, color: "#1e1e1e", flexShrink: 0 }}>
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* Pointer info */}
      <div style={{
        display: "flex",
        gap: 20,
        marginTop: 16,
        marginBottom: 18,
        fontSize: 10,
        color: "#374151",
        letterSpacing: "0.05em",
      }}>
        <span style={{ color: "#3b82f6" }}>L[{left}]={HEIGHTS[left]}</span>
        <span style={{ color: "#2a2a2a" }}>width={right - left}</span>
        <span>min height={Math.min(HEIGHTS[left], HEIGHTS[right])}</span>
        <span style={{ color: "#ef4444" }}>R[{right}]={HEIGHTS[right]}</span>
      </div>

      {/* Lock in button */}
      {!locked && (
        <button
          onClick={handleLockIn}
          style={{
            marginBottom: 16,
            padding: "10px 24px",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.4)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "#fbbf24",
            fontFamily: MONO,
            letterSpacing: "0.08em",
            transition: "background 0.15s",
          }}
        >
          LOCK IN MAX={maxArea}
        </button>
      )}

      {/* Lock results */}
      {lockResult === "correct" && (
        <div style={{
          padding: "18px 26px",
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderLeft: "3px solid rgba(34,197,94,0.7)",
          borderRadius: 6,
          fontSize: 12,
          color: "#22c55e",
          letterSpacing: "0.08em",
          textAlign: "center",
          lineHeight: 2,
          animation: "winPop 0.4s ease-out forwards",
          boxShadow: "0 0 30px rgba(34,197,94,0.07)",
        }}>
          MAXIMUM CONTAINER FOUND — AREA {GLOBAL_MAX}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            GREEDY: MOVE THE SHORTER WALL — IT CAN ONLY GET WORSE KEEPING IT
          </span>
        </div>
      )}

      {lockResult === "wrong" && (
        <div style={{
          padding: "16px 22px",
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 6,
          fontSize: 11,
          color: "#ef4444",
          letterSpacing: "0.08em",
          textAlign: "center",
          lineHeight: 1.9,
        }}>
          NOT QUITE — YOU FOUND {maxArea}, MAX IS {GLOBAL_MAX}
          <br />
          <span style={{ fontSize: 9, color: "#fca5a5", opacity: 0.7 }}>
            TIP: ALWAYS MOVE THE SHORTER WALL INWARD
          </span>
          <br />
          <button
            onClick={handleReset}
            style={{
              marginTop: 10,
              padding: "7px 16px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 10,
              color: "#ef4444",
              fontFamily: MONO,
              letterSpacing: "0.06em",
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Footer insight */}
      <div style={{
        marginTop: 24,
        width: "100%",
        maxWidth: 520,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9,
        color: "#374151",
        lineHeight: 1.7,
        letterSpacing: "0.04em",
      }}>
        AREA = MIN(H[L], H[R]) × (R−L) · SHORTER WALL IS THE BOTTLENECK — MOVE IT INWARD TO POSSIBLY IMPROVE
      </div>
    </div>
    </GameShell>
  );
}
