"use client";
import { useState, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ARRAY = [2, 7, 11, 15, 22, 30];
const TARGET = 26;
const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const MAX_CHECKS = (ARRAY.length * (ARRAY.length - 1)) / 2; // 15

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
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes burst {
  0% { transform: scale(0.7); opacity: 1; }
  60% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes particleFly {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
}
@keyframes botTick {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
`;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

export default function CollisionCourse({ onSolve, onAttempt }: GameProps) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(ARRAY.length - 1);
  const [checks, setChecks] = useState(0);
  const [solved, setSolved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [botChecks, setBotChecks] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const solvedRef = useRef(false);
  const particleId = useRef(0);

  const currentSum = ARRAY[left] + ARRAY[right];

  // Brute-force ghost counter
  useEffect(() => {
    if (solved) return;
    const interval = setInterval(() => {
      setBotChecks((prev) => {
        if (prev >= MAX_CHECKS) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [solved]);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 1200);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) {
      setAttempted(true);
      onAttempt();
    }
  }

  function spawnParticles() {
    const colors = ["#f43f5e", "#3b82f6", "#fbbf24", "#22c55e", "#a78bfa"];
    const newParticles: Particle[] = Array.from({ length: 18 }, (_, i) => ({
      id: particleId.current++,
      x: 50 + Math.random() * 200 - 100,
      y: 50 + Math.random() * 200 - 100,
      color: colors[i % colors.length],
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 700);
  }

  function handleTokenClick(idx: number) {
    if (solved || idx === left || idx === right) return;
    doAttempt();

    const sum = ARRAY[left] + ARRAY[right];
    const isValidBlueTarget = sum < TARGET && idx > left && idx < right;
    const isValidRedTarget = sum > TARGET && idx > left && idx < right;

    if (isValidBlueTarget) {
      playTone(440);
      const newLeft = idx;
      const newChecks = checks + 1;
      setLeft(newLeft);
      setChecks(newChecks);
      const newSum = ARRAY[newLeft] + ARRAY[right];
      if (newSum === TARGET) {
        playWin();
        spawnParticles();
        setSolved(true);
      }
    } else if (isValidRedTarget) {
      playTone(440);
      const newRight = idx;
      const newChecks = checks + 1;
      setRight(newRight);
      setChecks(newChecks);
      const newSum = ARRAY[left] + ARRAY[newRight];
      if (newSum === TARGET) {
        playWin();
        spawnParticles();
        setSolved(true);
      }
    } else {
      // Invalid click — shake
      playTone(180, "sawtooth", 0.08);
      setShakeIdx(idx);
      setTimeout(() => setShakeIdx(null), 400);
    }
  }

  function getTokenStyle(idx: number): React.CSSProperties {
    const isLeft = idx === left;
    const isRight = idx === right;
    const isBetween = idx > left && idx < right;
    const sum = ARRAY[left] + ARRAY[right];

    const isGlowBlue = !solved && sum < TARGET && isBetween;
    const isGlowRed = !solved && sum > TARGET && isBetween;
    const isShaking = shakeIdx === idx;
    const isBurst = solved && (isLeft || isRight);

    let bg = "#0f0f0f";
    let border = "1px solid #1e1e1e";
    let color = "#2a2a2a";
    let cursor = "default";
    let animation = "";
    let boxShadow = "none";

    if (solved && (isLeft || isRight)) {
      bg = "rgba(34,197,94,0.15)";
      border = "2px solid rgba(34,197,94,0.6)";
      color = "#22c55e";
      animation = "burst 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards";
      boxShadow = "0 0 16px rgba(34,197,94,0.3)";
    } else if (isLeft) {
      bg = "rgba(59,130,246,0.15)";
      border = "2px solid rgba(59,130,246,0.6)";
      color = "#3b82f6";
      boxShadow = "0 0 12px rgba(59,130,246,0.2)";
    } else if (isRight) {
      bg = "rgba(239,68,68,0.15)";
      border = "2px solid rgba(239,68,68,0.6)";
      color = "#ef4444";
      boxShadow = "0 0 12px rgba(239,68,68,0.2)";
    } else if (isGlowBlue) {
      bg = "rgba(59,130,246,0.08)";
      border = "1px solid rgba(59,130,246,0.45)";
      color = "#60a5fa";
      cursor = "pointer";
      animation = "pulse 1s ease-in-out infinite";
      boxShadow = "0 0 8px rgba(59,130,246,0.25)";
    } else if (isGlowRed) {
      bg = "rgba(239,68,68,0.08)";
      border = "1px solid rgba(239,68,68,0.45)";
      color = "#f87171";
      cursor = "pointer";
      animation = "pulse 1s ease-in-out infinite";
      boxShadow = "0 0 8px rgba(239,68,68,0.25)";
    } else if (isBetween) {
      // Between but not clickable right now
      cursor = "not-allowed";
    }

    if (isShaking) {
      animation = "shake 0.35s ease";
    }
    if (isBurst) {
      animation = "burst 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards";
    }

    return {
      width: 56,
      height: 56,
      borderRadius: "50%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      border,
      color,
      cursor,
      animation,
      boxShadow,
      transition: "background 0.2s, border 0.2s, box-shadow 0.2s",
      position: "relative",
      flexShrink: 0,
    };
  }

  const sum = ARRAY[left] + ARRAY[right];

  const mission = getMission("two-pointers", 1);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "CHECKS", value: checks }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Particle burst */}
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: p.color,
          pointerEvents: "none",
          zIndex: 999,
          // @ts-ignore css custom properties
          "--px": `${p.x}px`,
          "--py": `${p.y}px`,
          animation: "particleFly 0.65s ease-out forwards",
        } as React.CSSProperties} />
      ))}

      {/* Target */}
      <div style={{
        marginBottom: 32,
        padding: "12px 28px",
        background: "rgba(244,63,94,0.07)",
        border: "1px solid rgba(244,63,94,0.25)",
        borderRadius: 8,
        fontSize: 22,
        fontWeight: 700,
        color: "#f43f5e",
        letterSpacing: "0.08em",
      }}>
        TARGET: {TARGET}
      </div>

      {/* Race track */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        {/* Track line */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, #1a1a1a, #2a2a2a, #1a1a1a)",
          borderRadius: 1,
          transform: "translateY(-50%)",
          zIndex: 0,
        }} />

        {/* Tokens */}
        <div style={{ display: "flex", gap: 12, position: "relative", zIndex: 1 }}>
          {ARRAY.map((val, i) => {
            const isLeft = i === left;
            const isRight = i === right;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {/* Pointer label above */}
                <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isLeft && (
                    <span style={{
                      fontSize: 10,
                      color: solved ? "#22c55e" : "#3b82f6",
                      letterSpacing: "0.06em",
                      fontWeight: 700,
                      transition: "color 0.3s",
                    }}>L</span>
                  )}
                  {isRight && (
                    <span style={{
                      fontSize: 10,
                      color: solved ? "#22c55e" : "#ef4444",
                      letterSpacing: "0.06em",
                      fontWeight: 700,
                      transition: "color 0.3s",
                    }}>R</span>
                  )}
                </div>

                {/* Token circle */}
                <div
                  style={getTokenStyle(i)}
                  onClick={() => handleTokenClick(i)}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{val}</span>
                  <span style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>[{i}]</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current sum display */}
      <div style={{
        marginBottom: 20,
        padding: "8px 20px",
        background: solved
          ? "rgba(34,197,94,0.07)"
          : sum === TARGET
          ? "rgba(34,197,94,0.07)"
          : sum < TARGET
          ? "rgba(59,130,246,0.05)"
          : "rgba(239,68,68,0.05)",
        border: `1px solid ${
          solved || sum === TARGET
            ? "rgba(34,197,94,0.3)"
            : sum < TARGET
            ? "rgba(59,130,246,0.2)"
            : "rgba(239,68,68,0.2)"
        }`,
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
        color: solved || sum === TARGET ? "#22c55e" : sum < TARGET ? "#3b82f6" : "#ef4444",
        letterSpacing: "0.08em",
      }}>
        {ARRAY[left]} + {ARRAY[right]} = {sum}
        {solved && <span style={{ marginLeft: 10, fontSize: 11 }}>✓ COLLISION!</span>}
        {!solved && sum < TARGET && <span style={{ marginLeft: 10, fontSize: 10, opacity: 0.7 }}>TOO SMALL</span>}
        {!solved && sum > TARGET && <span style={{ marginLeft: 10, fontSize: 10, opacity: 0.7 }}>TOO BIG</span>}
      </div>

      {/* Interaction hint */}
      {!solved && (
        <div style={{
          marginBottom: 20,
          padding: "7px 14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid #181818",
          borderRadius: 4,
          fontSize: 10,
          color: sum < TARGET ? "#1d4ed8" : sum > TARGET ? "#991b1b" : "#374151",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}>
          {sum < TARGET && "CLICK A GLOWING BLUE TOKEN TO ADVANCE L →"}
          {sum > TARGET && "CLICK A GLOWING RED TOKEN TO RETREAT R ←"}
          {sum === TARGET && ""}
        </div>
      )}

      {/* Bot counter */}
      <div style={{
        marginBottom: 20,
        padding: "7px 16px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{
          fontSize: 9,
          color: "#2a2a2a",
          letterSpacing: "0.06em",
          animation: solved ? "none" : "botTick 1.2s ease-in-out infinite",
        }}>
          BOT CHECKS: {botChecks}/{MAX_CHECKS} pairs
        </span>
        {!solved && (
          <span style={{ fontSize: 8, color: "#1a1a1a", letterSpacing: "0.04em" }}>
            (brute force O(n²))
          </span>
        )}
      </div>

      {/* Win result */}
      {solved && (
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
          boxShadow: "0 0 24px rgba(34,197,94,0.08)",
        }}>
          FOUND IN {checks} CHECKS — BRUTE FORCE NEEDED {MAX_CHECKS}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            PAIR: {ARRAY[left]} + {ARRAY[right]} = {TARGET} ✓ O(n) vs O(n²)
          </span>
        </div>
      )}

      {/* Footer insight */}
      <div style={{
        marginTop: 24,
        width: "100%",
        maxWidth: 500,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9,
        color: "#374151",
        lineHeight: 1.7,
        letterSpacing: "0.04em",
      }}>
        SORTED → SUM TOO SMALL: ONLY LEFT++ CAN INCREASE IT · SUM TOO BIG: ONLY RIGHT-- CAN DECREASE IT
      </div>
    </div>
    </GameShell>
  );
}
