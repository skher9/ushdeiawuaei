"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

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

const ITEMS = [
  { name: "GEM",    emoji: "💎", w: 2, v: 3 },
  { name: "SWORD",  emoji: "⚔️",  w: 4, v: 5 },
  { name: "CROWN",  emoji: "👑", w: 3, v: 4 },
  { name: "POTION", emoji: "🧪", w: 1, v: 2 },
  { name: "MAP",    emoji: "🗺️",  w: 5, v: 7 },
  { name: "RING",   emoji: "💍", w: 3, v: 6 },
];

const CAPACITY = 10;
const OPTIMAL = 16;

function computeKnapsack(): number {
  const n = ITEMS.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(CAPACITY + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= CAPACITY; w++) {
      dp[i][w] = dp[i - 1][w];
      if (ITEMS[i - 1].w <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - ITEMS[i - 1].w] + ITEMS[i - 1].v);
      }
    }
  }
  return dp[n][CAPACITY];
}

export default function LootPack({ onSolve, onAttempt }: GameProps) {
  const [packed, setPacked] = useState<Set<number>>(() => new Set());
  const [bestValue, setBestValue] = useState(0);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [flyIdx, setFlyIdx] = useState<number | null>(null);
  const [revealOptimal, setRevealOptimal] = useState(false);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const currentWeight = Array.from(packed).reduce((s, i) => s + ITEMS[i].w, 0);
  const currentValue = Array.from(packed).reduce((s, i) => s + ITEMS[i].v, 0);
  const weightPct = Math.min(currentWeight / CAPACITY, 1);
  const overCapacity = currentWeight > CAPACITY;

  const toggle = useCallback((idx: number) => {
    if (solved) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    setPacked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        playTone(300, "sine", 0.1);
        setFlyIdx(null);
      } else {
        const projWeight = Array.from(next).reduce((s, i) => s + ITEMS[i].w, 0) + ITEMS[idx].w;
        if (projWeight > CAPACITY) {
          playTone(120, "sawtooth", 0.18);
          setShakeIdx(idx);
          setTimeout(() => setShakeIdx(null), 400);
          return prev;
        }
        next.add(idx);
        playTone(440 + idx * 55, "sine", 0.15);
        setFlyIdx(idx);
        setTimeout(() => setFlyIdx(null), 500);
      }

      const val = Array.from(next).reduce((s, i) => s + ITEMS[i].v, 0);
      setBestValue(b => Math.max(b, val));

      if (next.size > 0) setRevealOptimal(true);

      if (val === OPTIMAL && !solvedRef.current) {
        const wt = Array.from(next).reduce((s, i) => s + ITEMS[i].w, 0);
        if (wt <= CAPACITY) {
          solvedRef.current = true;
          setSolved(true);
          playTone(660, "sine", 0.2);
          setTimeout(() => playTone(880, "sine", 0.25), 160);
          setTimeout(() => playTone(1100, "sine", 0.35), 320);
          setTimeout(() => onSolve(), 1000);
        }
      }

      return next;
    });
  }, [solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setPacked(new Set());
    setBestValue(0);
    setSolved(false);
    setRevealOptimal(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const mission = getMission("dynamic-programming", 5);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "VALUE", value: bestValue ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes lp-fly {
          0% { transform: scale(1) translateX(0); opacity: 1; }
          50% { transform: scale(1.3) translateX(30px); opacity: 0.7; }
          100% { transform: scale(0.8) translateX(80px); opacity: 0; }
        }
        @keyframes lp-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes lp-pack-shake {
          0%,100% { transform: rotate(0deg); }
          25% { transform: rotate(-4deg); }
          75% { transform: rotate(4deg); }
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(129,140,248,0.15); }
        }
        @keyframes lp-win {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 32px 10px rgba(129,140,248,0.25); }
        }
        @keyframes lp-pop-in {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lp-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>LOOT PACK</div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>0/1 KNAPSACK — CLICK ITEMS TO PACK / UNPACK</div>
        </div>

        <div style={{
          display: "flex",
          gap: 12,
          fontSize: 11,
          color: "#6b7280",
          letterSpacing: 1,
        }}>
          <span style={{ color: currentValue > 0 ? "#818cf8" : "#4b5563" }}>
            VALUE: <span style={{ color: "#a5b4fc", fontWeight: 700 }}>{currentValue}</span>
          </span>
          <span>|</span>
          <span style={{ color: revealOptimal ? "#6b7280" : "#2a2a2a" }}>
            OPTIMAL: <span style={{ color: revealOptimal ? "#4ade80" : "#2a2a2a", fontWeight: 700 }}>
              {revealOptimal ? OPTIMAL : "??"}
            </span>
          </span>
          <span>|</span>
          <span>BEST: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{bestValue}</span></span>
        </div>

        <div style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}>
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ fontSize: 9, color: "#374151", letterSpacing: 2, marginBottom: 2 }}>DUNGEON HAUL</div>
            {ITEMS.map((item, idx) => {
              const isPacked = packed.has(idx);
              const isShaking = shakeIdx === idx;
              const isFlying = flyIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => toggle(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: isPacked
                      ? "rgba(129,140,248,0.1)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isPacked ? "rgba(129,140,248,0.4)" : "#1e1e1e"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                    animation: isShaking
                      ? "lp-shake 0.4s ease"
                      : isFlying && isPacked
                      ? "lp-bounce 0.5s ease"
                      : isPacked
                      ? "lp-pulse 2s ease-in-out infinite"
                      : "none",
                    opacity: isFlying && !isPacked ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: 22 }}>{item.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isPacked ? "#a5b4fc" : "#9ca3af",
                      letterSpacing: 1,
                    }}>
                      {item.name}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: "#6b7280" }}>⚖ {item.w}kg</span>
                      <span style={{ fontSize: 10, color: "#f59e0b" }}>✦ {item.v}gp</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    color: isPacked ? "#818cf8" : "#374151",
                    padding: "2px 6px",
                    border: `1px solid ${isPacked ? "rgba(129,140,248,0.3)" : "#2a2a2a"}`,
                    borderRadius: 3,
                  }}>
                    {isPacked ? "PACKED" : "CLICK"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            width: 130,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            paddingTop: 22,
          }}>
            <div style={{
              width: 110,
              height: 130,
              background: "rgba(129,140,248,0.05)",
              border: `2px solid ${overCapacity ? "#ef4444" : packed.size > 0 ? "rgba(129,140,248,0.5)" : "#1e1e1e"}`,
              borderRadius: "8px 8px 20px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "8px 8px 12px",
              position: "relative",
              animation: overCapacity
                ? "lp-pack-shake 0.3s ease-in-out infinite"
                : solved
                ? "lp-win 1.5s ease-in-out infinite"
                : "none",
              transition: "border-color 0.2s",
            }}>
              <div style={{
                fontSize: 36,
                position: "absolute",
                top: 10,
                animation: packed.size > 0 ? "lp-bounce 1.5s ease-in-out infinite" : "none",
              }}>
                🎒
              </div>
              <div style={{
                width: "100%",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 3,
                marginTop: 52,
              }}>
                {Array.from(packed).map(i => (
                  <div
                    key={i}
                    style={{
                      fontSize: 14,
                      animation: "lp-pop-in 0.3s ease",
                    }}
                  >
                    {ITEMS[i].emoji}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                color: overCapacity ? "#ef4444" : "#6b7280",
                letterSpacing: 1,
              }}>
                <span>WEIGHT</span>
                <span style={{ fontWeight: 700 }}>{currentWeight}/{CAPACITY}</span>
              </div>
              <div style={{
                width: "100%",
                height: 8,
                background: "#111",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid #1e1e1e",
              }}>
                <div style={{
                  height: "100%",
                  width: `${weightPct * 100}%`,
                  background: overCapacity
                    ? "#ef4444"
                    : weightPct > 0.8
                    ? "#f59e0b"
                    : "#818cf8",
                  borderRadius: 4,
                  transition: "width 0.2s, background 0.2s",
                }} />
              </div>
              <div style={{ height: 4 }} />
              {Array.from(packed).map(i => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "#4b5563",
                }}>
                  <span>{ITEMS[i].name}</span>
                  <span style={{ color: "#f59e0b" }}>+{ITEMS[i].v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {solved && (
          <div style={{
            textAlign: "center",
            animation: "lp-win 1.5s ease-in-out infinite",
            padding: "12px 24px",
            border: "1px solid rgba(129,140,248,0.3)",
            borderRadius: 8,
            background: "rgba(129,140,248,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", letterSpacing: 3, marginBottom: 8 }}>
              OPTIMAL LOOT — {OPTIMAL} GOLD
            </div>
            <button
              onClick={reset}
              style={{
                padding: "5px 18px",
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.35)",
                borderRadius: 5,
                color: "#818cf8",
                fontSize: 10,
                letterSpacing: 2,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              [ RESET ]
            </button>
          </div>
        )}
      </div>
    </GameShell>
    </>
  );
}
