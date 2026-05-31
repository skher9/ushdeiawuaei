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

const COINS = [1, 5, 7];
const AMOUNT = 11;
const OPTIMAL_DP = [0, 1, 2, 3, 4, 1, 2, 1, 2, 3, 2, 3];

function computeOptimalDp(): number[] {
  const dp = new Array(AMOUNT + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= AMOUNT; a++) {
    for (const c of COINS) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;
      }
    }
  }
  return dp;
}

const REAL_DP = computeOptimalDp();

export default function CoinForge({ onSolve, onAttempt }: GameProps) {
  const [dp, setDp] = useState<(number | null)[]>(() => {
    const arr: (number | null)[] = new Array(AMOUNT + 1).fill(null);
    arr[0] = 0;
    return arr;
  });
  const [current, setCurrent] = useState(1);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [lastCoinUsed, setLastCoinUsed] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const useCoin = useCallback((coin: number) => {
    if (solved || current > AMOUNT) return;
    if (coin > current) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    const prevDp = dp[current - coin];
    if (prevDp === null) {
      playTone(180, "sawtooth", 0.2);
      setShakeSlot(current);
      setTimeout(() => setShakeSlot(null), 400);
      return;
    }

    const candidateVal = prevDp + 1;
    const optimalVal = REAL_DP[current];

    if (candidateVal !== optimalVal) {
      playTone(220, "sawtooth", 0.25);
      setShakeSlot(current);
      setTimeout(() => setShakeSlot(null), 500);
      return;
    }

    playTone(300 + current * 40, "sine", 0.14);
    setLastCoinUsed(coin);
    setTimeout(() => setLastCoinUsed(null), 350);

    const newDp = [...dp];
    newDp[current] = candidateVal;
    setDp(newDp);

    const next = current + 1;
    setCurrent(next);

    if (next > AMOUNT && !solvedRef.current) {
      solvedRef.current = true;
      setSolved(true);
      setTimeout(() => {
        playTone(660, "sine", 0.2);
        setTimeout(() => playTone(880, "sine", 0.25), 160);
        setTimeout(() => playTone(1100, "sine", 0.3), 320);
      }, 100);
      setTimeout(() => onSolve(), 1000);
    }
  }, [current, dp, solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    const arr: (number | null)[] = new Array(AMOUNT + 1).fill(null);
    arr[0] = 0;
    setDp(arr);
    setCurrent(1);
    setShakeSlot(null);
    setLastCoinUsed(null);
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const progress = current - 1;

  const mission = getMission("dynamic-programming", 3);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "FILLED", value: (current ?? 1) - 1 }];

  return (
    <>
      <style>{`
        @keyframes cf-slot-fill {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes cf-shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-5px); }
          40%,80% { transform: translateX(5px); }
        }
        @keyframes cf-coin-press {
          0% { transform: scale(1); }
          40% { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        @keyframes cf-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(129,140,248,0); }
        }
        @keyframes cf-win-glow {
          0%,100% { text-shadow: 0 0 8px rgba(129,140,248,0.4); }
          50% { text-shadow: 0 0 20px rgba(129,140,248,0.9); }
        }
        .cf-coin:hover { border-color: rgba(129,140,248,0.8) !important; background: rgba(129,140,248,0.15) !important; transform: scale(1.04); }
        .cf-coin { transition: border-color 0.15s, background 0.15s, transform 0.1s; }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>
            COIN FORGE
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#818cf8",
            letterSpacing: 2,
            lineHeight: 1,
          }}>
            TARGET: {AMOUNT}
          </div>
          <div style={{ fontSize: 10, color: "#4b5563", marginTop: 6, letterSpacing: 1 }}>
            CLICK THE OPTIMAL COIN FOR EACH AMOUNT — FEWEST COINS WINS
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          alignItems: "center",
        }}>
          {COINS.map((coin) => {
            const isUsable = coin <= current && !solved;
            const isJustUsed = lastCoinUsed === coin;
            return (
              <button
                key={coin}
                className="cf-coin"
                onClick={() => useCoin(coin)}
                disabled={!isUsable}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: isUsable
                    ? "rgba(129,140,248,0.08)"
                    : "rgba(30,30,30,0.5)",
                  border: `2px solid ${isUsable ? "rgba(129,140,248,0.4)" : "#1e1e1e"}`,
                  color: isUsable ? "#a5b4fc" : "#374151",
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: isUsable ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  opacity: isUsable ? 1 : 0.4,
                  animation: isJustUsed ? "cf-coin-press 0.2s ease" : "none",
                  boxShadow: isUsable ? "0 0 0 0 rgba(129,140,248,0.3)" : "none",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🪙</span>
                <span style={{ fontSize: 12, lineHeight: 1 }}>{coin}¢</span>
              </button>
            );
          })}
        </div>

        {!solved && current <= AMOUNT && (
          <div style={{
            fontSize: 13,
            color: "#818cf8",
            background: "rgba(129,140,248,0.06)",
            border: "1px solid rgba(129,140,248,0.2)",
            borderRadius: 8,
            padding: "8px 20px",
            animation: "cf-pulse 1.4s ease-in-out infinite",
            letterSpacing: 1,
          }}>
            FILLING: dp[{current}] = ? coins
          </div>
        )}

        <div style={{
          width: "100%",
          maxWidth: 560,
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: 10,
          padding: "16px 12px",
        }}>
          <div style={{
            fontSize: 9,
            color: "#4b5563",
            letterSpacing: 2,
            marginBottom: 10,
          }}>
            DP TABLE — AMOUNT 0 TO {AMOUNT}
          </div>
          <div style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            {Array.from({ length: AMOUNT + 1 }, (_, a) => {
              const val = dp[a];
              const isCurrentSlot = a === current && !solved;
              const isFilled = val !== null;
              const isShaking = shakeSlot === a;

              return (
                <div
                  key={a}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 6,
                    background: isCurrentSlot
                      ? "rgba(129,140,248,0.1)"
                      : isFilled
                      ? "rgba(129,140,248,0.06)"
                      : "#0a0a0a",
                    border: `1px solid ${
                      isShaking ? "#ef4444"
                      : isCurrentSlot ? "rgba(129,140,248,0.6)"
                      : isFilled ? "rgba(129,140,248,0.25)"
                      : "#1a1a1a"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: isFilled ? "#a5b4fc" : "#2a2a2a",
                    animation: isShaking
                      ? "cf-shake 0.4s ease"
                      : isFilled && a === current - 1 && a > 0
                      ? "cf-slot-fill 0.35s ease"
                      : "none",
                    transition: "border-color 0.2s, background 0.2s",
                  }}>
                    {val !== null ? val : "·"}
                  </div>
                  <div style={{ fontSize: 8, color: "#374151" }}>{a}</div>
                </div>
              );
            })}
          </div>
        </div>

        {!solved && current > 1 && (
          <div style={{
            fontSize: 10,
            color: "#6b7280",
            letterSpacing: 1,
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: 6,
            padding: "6px 14px",
          }}>
            {COINS.filter(c => c <= current).map(c => {
              const prev = dp[current - c];
              return prev !== null
                ? `dp[${current}-${c}]=${prev} → ${prev + 1} coins`
                : null;
            }).filter(Boolean).join("  ·  ")}
          </div>
        )}

        <div style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          fontSize: 11,
          color: "#6b7280",
        }}>
          <div>FILLED: {progress}/{AMOUNT}</div>
          <div style={{
            width: 120,
            height: 4,
            background: "#1a1a1a",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(progress / AMOUNT) * 100}%`,
              background: "#818cf8",
              borderRadius: 2,
              transition: "width 0.3s",
            }} />
          </div>
          {solved && (
            <div style={{
              color: "#818cf8",
              fontWeight: 700,
              animation: "cf-win-glow 1.5s ease infinite",
            }}>
              dp[{AMOUNT}] = {dp[AMOUNT]}
            </div>
          )}
        </div>

        {solved && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#818cf8",
              letterSpacing: 3,
              marginBottom: 6,
              animation: "cf-win-glow 1.5s ease-in-out infinite",
            }}>
              FORGED IN {dp[AMOUNT]} COINS
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 12, letterSpacing: 1 }}>
              COINS [1,5,7] · AMOUNT {AMOUNT} · MINIMUM: {REAL_DP[AMOUNT]}
            </div>
            <button
              onClick={reset}
              style={{
                padding: "6px 20px",
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.4)",
                borderRadius: 6,
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
