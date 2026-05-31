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

const ROWS = 4;
const COLS = 4;
const WIN_VALUE = 20;

function initGrid(): (number | null)[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      if (r === 0 || c === 0) return 1;
      return null;
    })
  );
}

function isClickable(grid: (number | null)[][], r: number, c: number): boolean {
  if (grid[r][c] !== null) return false;
  const aboveFilled = r === 0 || grid[r - 1][c] !== null;
  const leftFilled = c === 0 || grid[r][c - 1] !== null;
  return aboveFilled && leftFilled;
}

export default function PixelPath({ onSolve, onAttempt }: GameProps) {
  const [grid, setGrid] = useState<(number | null)[][]>(initGrid);
  const [justFilled, setJustFilled] = useState<[number, number] | null>(null);
  const [shakeCell, setShakeCell] = useState<[number, number] | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const handleClick = useCallback((r: number, c: number) => {
    if (solved) return;
    if (r === 0 && c === 0) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    setGrid(prev => {
      if (!isClickable(prev, r, c)) {
        playTone(120, "sawtooth", 0.15);
        setShakeCell([r, c]);
        setTimeout(() => setShakeCell(null), 350);
        return prev;
      }

      const val = (prev[r - 1]?.[c] ?? 0) + (prev[r]?.[c - 1] ?? 0);
      const next = prev.map(row => [...row]);
      next[r][c] = val;

      const pitch = Math.min(220 + val * 28, 880);
      playTone(pitch, "sine", 0.16);
      setJustFilled([r, c]);
      setTimeout(() => setJustFilled(null), 400);

      if (r === ROWS - 1 && c === COLS - 1 && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        setTimeout(() => playTone(660, "sine", 0.2), 0);
        setTimeout(() => playTone(880, "sine", 0.25), 180);
        setTimeout(() => playTone(1100, "sine", 0.3), 360);
        setTimeout(() => onSolve(), 1000);
      }

      return next;
    });
  }, [solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setGrid(initGrid());
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const filledCount = grid.flat().filter(v => v !== null).length;
  const totalCells = ROWS * COLS;

  const mission = getMission("dynamic-programming", 6);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "FILLED", value: filledCount ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes pp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); transform: scale(1); }
          50% { box-shadow: 0 0 10px 3px rgba(129,140,248,0.2); transform: scale(1.04); }
        }
        @keyframes pp-pop {
          0% { transform: scale(0.5); opacity: 0; }
          65% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pp-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes pp-win-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 28px 8px rgba(129,140,248,0.2); }
        }
        @keyframes pp-robot {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes pp-flag {
          0%,100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes pp-scan {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>PIXEL PATH</div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>UNIQUE PATHS — CLICK CELLS TO FILL THE DP TABLE</div>
        </div>

        <div style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          fontSize: 10,
          color: "#4b5563",
          letterSpacing: 1,
        }}>
          <span>FILLED: <span style={{ color: "#818cf8", fontWeight: 700 }}>{filledCount}</span>/{totalCells}</span>
          <span>|</span>
          <span>TARGET: <span style={{ color: "#6b7280" }}>dp[3][3] = ?</span></span>
        </div>

        <div style={{
          background: "rgba(129,140,248,0.03)",
          border: "1px solid #0f1a2e",
          borderRadius: 12,
          padding: "20px 20px",
          position: "relative",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 64px)`,
            gridTemplateRows: `repeat(${ROWS}, 64px)`,
            gap: 4,
          }}>
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const val = grid[r][c];
                const clickable = isClickable(grid, r, c);
                const isJustFilled = justFilled?.[0] === r && justFilled?.[1] === c;
                const isShaking = shakeCell?.[0] === r && shakeCell?.[1] === c;
                const isRobot = r === 0 && c === 0;
                const isFlag = r === ROWS - 1 && c === COLS - 1;
                const isBorder = r === 0 || c === 0;
                const isSolvedCell = isFlag && solved;

                let bg = "#0d0d0d";
                let borderColor = "#1a1a1a";
                let textColor = "#374151";

                if (isSolvedCell) {
                  bg = "rgba(74,222,128,0.1)";
                  borderColor = "#4ade80";
                  textColor = "#4ade80";
                } else if (isRobot) {
                  bg = "rgba(129,140,248,0.12)";
                  borderColor = "#818cf8";
                } else if (isBorder && val !== null) {
                  bg = "rgba(129,140,248,0.05)";
                  borderColor = "rgba(129,140,248,0.2)";
                  textColor = "#818cf8";
                } else if (val !== null) {
                  bg = "rgba(129,140,248,0.08)";
                  borderColor = "rgba(129,140,248,0.35)";
                  textColor = "#a5b4fc";
                } else if (clickable) {
                  bg = "rgba(129,140,248,0.04)";
                  borderColor = "rgba(129,140,248,0.5)";
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r, c)}
                    style={{
                      width: 64,
                      height: 64,
                      background: bg,
                      border: `1.5px solid ${borderColor}`,
                      borderRadius: 6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: clickable && !solved ? "pointer" : "default",
                      position: "relative",
                      transition: "background 0.15s, border-color 0.15s",
                      animation: isShaking
                        ? "pp-shake 0.35s ease"
                        : clickable && !solved
                        ? "pp-pulse 1.5s ease-in-out infinite"
                        : "none",
                    }}
                  >
                    {isRobot && (
                      <div style={{
                        fontSize: 22,
                        animation: "pp-robot 1.2s ease-in-out infinite",
                        lineHeight: 1,
                      }}>
                        🤖
                      </div>
                    )}
                    {isFlag && !isRobot && (
                      <div style={{
                        fontSize: solved ? 22 : 16,
                        animation: "pp-flag 1.5s ease-in-out infinite",
                        lineHeight: 1,
                        position: "absolute",
                        top: solved ? 4 : 6,
                      }}>
                        🚩
                      </div>
                    )}
                    {val !== null && !isRobot && (
                      <div style={{
                        fontSize: val >= 10 ? 14 : 16,
                        fontWeight: 700,
                        color: textColor,
                        animation: isJustFilled ? "pp-pop 0.35s ease" : "none",
                        marginTop: isFlag ? 28 : 0,
                      }}>
                        {val}
                      </div>
                    )}
                    {val === null && clickable && (
                      <div style={{
                        fontSize: 18,
                        color: "rgba(129,140,248,0.5)",
                        animation: "pp-scan 1.5s ease-in-out infinite",
                      }}>
                        +
                      </div>
                    )}
                    <div style={{
                      position: "absolute",
                      bottom: 2,
                      right: 4,
                      fontSize: 7,
                      color: "#1f2937",
                      letterSpacing: 0,
                    }}>
                      {r},{c}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 16,
          fontSize: 10,
          color: "#374151",
          letterSpacing: 1,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: "rgba(129,140,248,0.5)", borderRadius: 2, display: "inline-block" }} />
            CLICKABLE
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.35)", borderRadius: 2, display: "inline-block" }} />
            FILLED
          </span>
        </div>

        {solved && (
          <div style={{
            textAlign: "center",
            animation: "pp-win-glow 1.5s ease-in-out infinite",
            padding: "12px 24px",
            border: "1px solid rgba(129,140,248,0.3)",
            borderRadius: 8,
            background: "rgba(129,140,248,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", letterSpacing: 3, marginBottom: 4 }}>
              {WIN_VALUE} UNIQUE PATHS
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1, marginBottom: 10 }}>
              ROBOT REACHED THE FLAG
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
