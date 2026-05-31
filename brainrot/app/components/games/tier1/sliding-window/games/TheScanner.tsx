"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const K = 3;
const ARR = [2, 4, 1, 7, 3, 5, 8, 6, 3, 2];
const N = ARR.length;
const MAX_POS = N - K;

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

function playWinArpeggio() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 110));
}

function computeMaxSum(arr: number[], k: number): { maxSum: number; maxPos: number } {
  let sum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = sum;
  let maxPos = 0;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > maxSum) { maxSum = sum; maxPos = i - k + 1; }
  }
  return { maxSum, maxPos };
}

const { maxSum: CORRECT_MAX, maxPos: CORRECT_POS } = computeMaxSum(ARR, K);

// Bar heights: proportional to value, min 32px, max 110px
function barHeight(val: number): number {
  const minV = Math.min(...ARR), maxV = Math.max(...ARR);
  return 32 + ((val - minV) / (maxV - minV)) * 78;
}

export default function TheScanner({ onSolve, onAttempt }: GameProps) {
  const [pos, setPos] = useState(0);
  const [bestSum, setBestSum] = useState(() => ARR.slice(0, K).reduce((a, b) => a + b, 0));
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [flash, setFlash] = useState<"none" | "newmax" | "error" | "win">("none");
  const [showWrongMsg, setShowWrongMsg] = useState(false);
  const [lockError, setLockError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const solvedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const particleId = useRef(0);

  const currentSum = ARR.slice(pos, pos + K).reduce((a, b) => a + b, 0);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function moveTo(newPos: number) {
    const clamped = Math.max(0, Math.min(MAX_POS, newPos));
    if (clamped === pos) return;
    doAttempt();
    setPos(clamped);
    const newSum = ARR.slice(clamped, clamped + K).reduce((a, b) => a + b, 0);
    playTone(200 + newSum * 8, "sine", 0.08);
    if (newSum > bestSum) {
      setBestSum(newSum);
      setFlash("newmax");
      playTone(700, "sine", 0.2);
      setTimeout(() => setFlash("none"), 900);
    }
  }

  // Drag logic
  const handleHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartX.current = e.clientX;
    dragStartPos.current = pos;
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!barsRef.current) return;
      const rect = barsRef.current.getBoundingClientRect();
      const barW = rect.width / N;
      const dx = e.clientX - dragStartX.current;
      const dBars = Math.round(dx / barW);
      moveTo(dragStartPos.current + dBars);
    }
    function onUp() { setDragging(false); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging]); // eslint-disable-line

  function handleBarClick(i: number) {
    if (solved) return;
    const newPos = Math.min(i, MAX_POS);
    moveTo(newPos);
  }

  function spawnParticles() {
    if (!barsRef.current) return;
    const rect = barsRef.current.getBoundingClientRect();
    const newPs = Array.from({ length: 12 }, (_, i) => ({
      id: particleId.current++,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));
    setParticles(prev => [...prev, ...newPs]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newPs.find(n => n.id === p.id))), 1000);
  }

  function lockIn() {
    doAttempt();
    if (pos === CORRECT_POS) {
      setSolved(true);
      setFlash("win");
      spawnParticles();
      playWinArpeggio();
    } else {
      setLockError(true);
      setFlash("error");
      setShowWrongMsg(true);
      playTone(180, "sawtooth", 0.15);
      setTimeout(() => { setFlash("none"); setLockError(false); }, 700);
    }
  }

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 1200);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  const spotlightColor = flash === "win"
    ? "rgba(34,197,94,0.18)"
    : flash === "error"
    ? "rgba(239,68,68,0.18)"
    : flash === "newmax"
    ? "rgba(251,191,36,0.28)"
    : "rgba(251,191,36,0.13)";

  const spotlightBorder = flash === "win"
    ? "rgba(34,197,94,0.8)"
    : flash === "error"
    ? "rgba(239,68,68,0.7)"
    : flash === "newmax"
    ? "rgba(251,191,36,0.9)"
    : "rgba(251,191,36,0.5)";

  const handleColor = flash === "newmax" || flash === "win" ? "#fbbf24" : "#d97706";

  const mission = getMission("sliding-window", 2);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "MAX SUM", value: bestSum }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes scanner-pulse {
          0%, 100% { box-shadow: 0 0 18px rgba(251,191,36,0.4), 0 0 40px rgba(251,191,36,0.15); }
          50% { box-shadow: 0 0 32px rgba(251,191,36,0.7), 0 0 70px rgba(251,191,36,0.3); }
        }
        @keyframes scanner-win-pulse {
          0%, 100% { box-shadow: 0 0 18px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2); }
          50% { box-shadow: 0 0 36px rgba(34,197,94,0.85), 0 0 80px rgba(34,197,94,0.4); }
        }
        @keyframes scanner-error-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes scanner-newmax-flash {
          0% { opacity: 0; transform: scale(0.8) translateY(4px); }
          30% { opacity: 1; transform: scale(1.05) translateY(0); }
          70% { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        @keyframes scanner-bar-light {
          0% { opacity: 0.35; }
          100% { opacity: 1; }
        }
        @keyframes scanner-particle {
          0% { transform: translate(0,0) scale(1); opacity: 0.9; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes scanner-handle-pulse {
          0%, 100% { transform: translateX(-50%) scale(1); box-shadow: 0 0 6px rgba(251,191,36,0.6); }
          50% { transform: translateX(-50%) scale(1.35); box-shadow: 0 0 18px rgba(251,191,36,1); }
        }
        @keyframes scanner-sum-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes scanner-title-glow {
          0%, 100% { text-shadow: 0 0 6px rgba(251,191,36,0.3); }
          50% { text-shadow: 0 0 14px rgba(251,191,36,0.7); }
        }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 580, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{
            fontSize: 11, color: "#fbbf24", letterSpacing: "0.14em", fontWeight: 700,
            animation: "scanner-title-glow 2.5s ease-in-out infinite",
          }}>
            THE SCANNER · FIXED WINDOW k={K}
          </span>
          <span style={{
            fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: "0.1em",
            padding: "3px 10px",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 4,
          }}>
            BEST: {bestSum}
          </span>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.6 }}>
          DRAG THE SPOTLIGHT HANDLE · OR CLICK ANY BAR · FIND THE MAX SUM WINDOW
        </div>
      </div>

      {/* Bars + spotlight */}
      <div
        ref={barsRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
          width: "100%",
          maxWidth: 580,
          height: 160,
          marginBottom: 8,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 10,
          border: "1px solid #1a1a1a",
          padding: "0 10px",
          boxSizing: "border-box",
          cursor: dragging ? "grabbing" : "default",
        }}
      >
        {/* Spotlight overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `calc(10px + ${pos} * (100% - 20px) / ${N})`,
            width: `calc(${K} * (100% - 20px) / ${N})`,
            background: spotlightColor,
            border: `1.5px solid ${spotlightBorder}`,
            borderRadius: 8,
            transition: dragging ? "none" : "left 0.15s cubic-bezier(.4,0,.2,1), background 0.2s, border-color 0.2s",
            animation: flash === "win"
              ? "scanner-win-pulse 0.8s ease-in-out infinite"
              : flash === "error"
              ? "scanner-error-shake 0.4s ease"
              : "scanner-pulse 2.2s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleHandleMouseDown}
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: handleColor,
              border: "2px solid #fef3c7",
              cursor: dragging ? "grabbing" : "grab",
              zIndex: 10,
              pointerEvents: "auto",
              animation: flash === "newmax"
                ? "scanner-handle-pulse 0.5s ease-in-out 2"
                : "none",
              boxShadow: `0 0 10px ${handleColor}`,
              transition: "background 0.2s",
            }}
          />
          {/* Current sum inside spotlight */}
          <div style={{
            position: "absolute",
            bottom: 6,
            left: 0, right: 0,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 700,
            color: flash === "win" ? "#22c55e" : flash === "error" ? "#ef4444" : "#fbbf24",
            letterSpacing: "0.05em",
            fontFamily: MONO,
            animation: "scanner-sum-pop 0.2s ease",
            textShadow: "0 0 10px currentColor",
          }}>
            {currentSum}
          </div>
        </div>

        {/* Bars */}
        {ARR.map((val, i) => {
          const inWindow = i >= pos && i < pos + K;
          const h = barHeight(val);
          return (
            <div
              key={i}
              onClick={() => handleBarClick(i)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
                cursor: "pointer",
                zIndex: inWindow ? 3 : 1,
                padding: "0 2px",
                position: "relative",
              }}
            >
              {/* Bar itself */}
              <div style={{
                width: "100%",
                height: h,
                background: inWindow
                  ? (flash === "win" ? "rgba(34,197,94,0.55)" : flash === "error" ? "rgba(239,68,68,0.4)" : "rgba(251,191,36,0.4)")
                  : "rgba(255,255,255,0.06)",
                borderRadius: "4px 4px 0 0",
                transition: "background 0.18s, height 0.18s",
                animation: inWindow ? "scanner-bar-light 0.15s ease forwards" : "none",
                border: inWindow ? `1px solid ${flash === "win" ? "rgba(34,197,94,0.5)" : flash === "error" ? "rgba(239,68,68,0.4)" : "rgba(251,191,36,0.3)"}` : "1px solid rgba(255,255,255,0.04)",
                borderBottom: "none",
                boxSizing: "border-box",
              }} />
              {/* Value label */}
              <div style={{
                fontSize: 9,
                color: inWindow
                  ? (flash === "win" ? "#22c55e" : flash === "error" ? "#ef4444" : "#fbbf24")
                  : "#374151",
                marginTop: 2,
                fontWeight: inWindow ? 700 : 400,
                transition: "color 0.18s",
                position: "absolute",
                bottom: -18,
              }}>
                {val}
              </div>
            </div>
          );
        })}
      </div>

      {/* Index row */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 580,
        padding: "0 10px",
        boxSizing: "border-box",
        marginBottom: 20,
        marginTop: 20,
      }}>
        {ARR.map((_, i) => {
          const inWindow = i >= pos && i < pos + K;
          return (
            <div key={i} style={{
              flex: 1,
              textAlign: "center",
              fontSize: 8,
              color: inWindow ? "rgba(251,191,36,0.6)" : "#1f2937",
              fontFamily: MONO,
            }}>
              [{i}]
            </div>
          );
        })}
      </div>

      {/* NEW MAX flash text */}
      {flash === "newmax" && (
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#fbbf24",
          letterSpacing: "0.12em",
          marginBottom: 10,
          animation: "scanner-newmax-flash 0.9s ease forwards",
        }}>
          NEW MAX!
        </div>
      )}

      {/* Sum formula */}
      <div style={{
        marginBottom: 16,
        padding: "10px 20px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid #1a1a1a",
        borderRadius: 6,
        fontSize: 11,
        color: "#64748b",
        letterSpacing: "0.05em",
        textAlign: "center",
        lineHeight: 1.9,
        width: "100%",
        maxWidth: 580,
        boxSizing: "border-box",
      }}>
        <span style={{ color: "#475569" }}>
          [{ARR.slice(pos, pos + K).join(" + ")}] = {" "}
        </span>
        <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>
          {currentSum}
        </span>
        {pos > 0 && (
          <span style={{ color: "#374151", fontSize: 9, marginLeft: 10 }}>
            (−{ARR[pos - 1]} +{ARR[pos + K - 1]})
          </span>
        )}
      </div>

      {/* Lock In / Win */}
      {!solved && (
        <button
          onClick={lockIn}
          style={{
            padding: "11px 36px",
            background: lockError
              ? "rgba(239,68,68,0.12)"
              : "rgba(251,191,36,0.1)",
            border: `1.5px solid ${lockError ? "rgba(239,68,68,0.5)" : "rgba(251,191,36,0.4)"}`,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            color: lockError ? "#ef4444" : "#fbbf24",
            fontFamily: MONO,
            letterSpacing: "0.12em",
            fontWeight: 700,
            transition: "all 0.15s",
            marginBottom: 10,
          }}
        >
          LOCK IN
        </button>
      )}

      {showWrongMsg && !solved && (
        <div style={{
          padding: "8px 16px",
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 4,
          fontSize: 9,
          color: "#ef4444",
          letterSpacing: "0.06em",
          textAlign: "center",
          marginBottom: 10,
        }}>
          NOT THE MAX — KEEP SCANNING
          <span style={{ color: "#7f1d1d", marginLeft: 8 }}>MAX = {CORRECT_MAX}</span>
        </div>
      )}

      {solved && (
        <div style={{
          padding: "16px 28px",
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 8,
          fontSize: 12,
          color: "#22c55e",
          letterSpacing: "0.08em",
          textAlign: "center",
          lineHeight: 2,
          marginBottom: 12,
        }}>
          MAXIMUM SUM {CORRECT_MAX} AT POSITION [{CORRECT_POS}..{CORRECT_POS + K - 1}]
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            [{ARR.slice(CORRECT_POS, CORRECT_POS + K).join(", ")}]
          </span>
        </div>
      )}

      {/* Particles */}
      {particles.map((p, idx) => {
        const angle = (idx / 12) * 2 * Math.PI;
        const dist = 60 + Math.random() * 60;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 40;
        const colors = ["#fbbf24", "#22c55e", "#10b981", "#fde68a", "#86efac"];
        return (
          <div
            key={p.id}
            style={{
              position: "fixed",
              left: p.x,
              top: p.y,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: colors[idx % colors.length],
              pointerEvents: "none",
              zIndex: 9999,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              animation: "scanner-particle 0.9s ease forwards",
            } as React.CSSProperties}
          />
        );
      })}

      {/* Footer hint */}
      <div style={{
        marginTop: 16,
        width: "100%",
        maxWidth: 580,
        padding: "9px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9,
        color: "#374151",
        lineHeight: 1.7,
        letterSpacing: "0.04em",
      }}>
        FIXED WINDOW: SUBTRACT LEFT ELEMENT, ADD RIGHT ELEMENT → O(n) NOT O(n·k)
      </div>
    </div>
    </GameShell>
  );
}
