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

const S1 = "ABCD";
const S2 = "ACBD";
const ROWS = S2.length + 1;
const COLS = S1.length + 1;

const LETTER_COLORS: Record<string, string> = {
  A: "#f87171",
  B: "#fb923c",
  C: "#facc15",
  D: "#4ade80",
};

function buildOptimalGrid(): number[][] {
  const g: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (let i = 1; i < ROWS; i++) {
    for (let j = 1; j < COLS; j++) {
      if (S2[i - 1] === S1[j - 1]) {
        g[i][j] = g[i - 1][j - 1] + 1;
      } else {
        g[i][j] = Math.max(g[i - 1][j], g[i][j - 1]);
      }
    }
  }
  return g;
}

const OPTIMAL_GRID = buildOptimalGrid();

function isFillable(filled: boolean[][], i: number, j: number): boolean {
  if (i === 0 || j === 0) return false;
  return filled[i - 1][j] && filled[i][j - 1] && filled[i - 1][j - 1];
}

function initFilled(): boolean[][] {
  return Array.from({ length: ROWS }, (_, i) =>
    Array.from({ length: COLS }, (_, j) => i === 0 || j === 0)
  );
}

export default function GeneSplice({ onSolve, onAttempt }: GameProps) {
  const [filled, setFilled] = useState<boolean[][]>(initFilled);
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, (_, i) =>
      Array.from({ length: COLS }, (_, j) => (i === 0 || j === 0 ? 0 : -1))
    )
  );
  const [justFilled, setJustFilled] = useState<[number, number] | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const fillCell = useCallback((i: number, j: number) => {
    if (solved) return;
    if (!isFillable(filled, i, j)) {
      playTone(180, "sawtooth", 0.15);
      return;
    }
    if (filled[i][j]) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    const isMatch = S2[i - 1] === S1[j - 1];
    const val = OPTIMAL_GRID[i][j];

    if (isMatch) {
      playTone(550 + val * 80, "sine", 0.2);
    } else {
      playTone(330 + val * 50, "triangle", 0.15);
    }

    const newFilled = filled.map(row => [...row]);
    newFilled[i][j] = true;
    const newGrid = grid.map(row => [...row]);
    newGrid[i][j] = val;

    setFilled(newFilled);
    setGrid(newGrid);
    setJustFilled([i, j]);
    setTimeout(() => setJustFilled(null), 400);

    if (i === ROWS - 1 && j === COLS - 1 && !solvedRef.current) {
      solvedRef.current = true;
      setSolved(true);
      setTimeout(() => {
        playTone(660, "sine", 0.2);
        setTimeout(() => playTone(880, "sine", 0.25), 140);
        setTimeout(() => playTone(1100, "sine", 0.3), 280);
      }, 150);
      setTimeout(() => onSolve(), 1000);
    }
  }, [filled, grid, solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setFilled(initFilled());
    setGrid(Array.from({ length: ROWS }, (_, i) =>
      Array.from({ length: COLS }, (_, j) => (i === 0 || j === 0 ? 0 : -1))
    ));
    setJustFilled(null);
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const totalCells = (ROWS - 1) * (COLS - 1);
  const filledCount = filled.flat().filter(Boolean).length - ROWS - COLS + 1;
  const lcsValue = grid[ROWS - 1][COLS - 1];

  const mission = getMission("dynamic-programming", 4);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "CELLS", value: filled?.flat().filter(Boolean).length ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes gs-cell-pop {
          0% { transform: scale(0.6); opacity: 0; }
          55% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes gs-cell-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(129,140,248,0); }
        }
        @keyframes gs-match-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.5); }
          50% { box-shadow: 0 0 8px 2px rgba(250,204,21,0.15); }
        }
        @keyframes gs-win-pulse {
          0%,100% { text-shadow: 0 0 8px rgba(129,140,248,0.5); }
          50% { text-shadow: 0 0 22px rgba(129,140,248,1); }
        }
        @keyframes gs-letter-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .gs-cell-clickable:hover {
          border-color: rgba(129,140,248,0.7) !important;
          background: rgba(129,140,248,0.12) !important;
          cursor: pointer;
        }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>
            GENE SPLICE
          </div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>
            LONGEST COMMON SUBSEQUENCE — CLICK CELLS TO COMPUTE
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: 2, marginBottom: 2 }}>STRAND 1</div>
            <div style={{ display: "flex", gap: 5 }}>
              {S1.split("").map((ch, i) => (
                <div key={i} style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: `${LETTER_COLORS[ch]}18`,
                  border: `2px solid ${LETTER_COLORS[ch]}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: LETTER_COLORS[ch],
                  animation: solved ? `gs-letter-bounce ${0.4 + i * 0.1}s ease-in-out infinite` : "none",
                }}>
                  {ch}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: 2, marginBottom: 2 }}>STRAND 2</div>
            <div style={{ display: "flex", gap: 5 }}>
              {S2.split("").map((ch, i) => (
                <div key={i} style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: `${LETTER_COLORS[ch]}18`,
                  border: `2px solid ${LETTER_COLORS[ch]}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: LETTER_COLORS[ch],
                  animation: solved ? `gs-letter-bounce ${0.4 + i * 0.1}s ease-in-out infinite` : "none",
                }}>
                  {ch}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: 12,
          padding: "14px",
          overflowX: "auto",
        }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4 }}>
            <thead>
              <tr>
                <td style={{ width: 32, height: 32 }} />
                <td style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "#4b5563",
                  fontWeight: 700,
                  width: 36,
                  height: 28,
                }}>ε</td>
                {S1.split("").map((ch, j) => (
                  <td key={j} style={{
                    textAlign: "center",
                    width: 36,
                    height: 28,
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: LETTER_COLORS[ch],
                    }}>{ch}</span>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", width: 28, height: 36 }}>
                    {i === 0 ? (
                      <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 700 }}>ε</span>
                    ) : (
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: LETTER_COLORS[S2[i - 1]],
                      }}>{S2[i - 1]}</span>
                    )}
                  </td>
                  {Array.from({ length: COLS }, (_, j) => {
                    const isFilled = filled[i][j];
                    const val = grid[i][j];
                    const isBase = i === 0 || j === 0;
                    const canFill = !isBase && !isFilled && isFillable(filled, i, j);
                    const isJF = justFilled && justFilled[0] === i && justFilled[1] === j;
                    const isMatch = !isBase && i > 0 && j > 0 && S2[i - 1] === S1[j - 1];
                    const isCorner = i === ROWS - 1 && j === COLS - 1;

                    let bg = "#0a0a0a";
                    let borderColor = "#1a1a1a";
                    let textColor = "#374151";

                    if (isBase) {
                      bg = "#0d0d0d";
                      borderColor = "#1e1e1e";
                      textColor = "#4b5563";
                    } else if (isFilled) {
                      if (isMatch && val > 0) {
                        bg = "rgba(250,204,21,0.07)";
                        borderColor = "rgba(250,204,21,0.35)";
                        textColor = "#facc15";
                      } else {
                        bg = "rgba(129,140,248,0.06)";
                        borderColor = "rgba(129,140,248,0.22)";
                        textColor = "#a5b4fc";
                      }
                      if (isCorner && solved) {
                        bg = "rgba(129,140,248,0.18)";
                        borderColor = "#818cf8";
                        textColor = "#c4b5fd";
                      }
                    } else if (canFill) {
                      bg = "rgba(129,140,248,0.04)";
                      borderColor = "rgba(129,140,248,0.3)";
                      textColor = "#4b5563";
                    }

                    return (
                      <td key={j}>
                        <div
                          className={canFill ? "gs-cell-clickable" : ""}
                          onClick={() => fillCell(i, j)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: bg,
                            border: `1px solid ${borderColor}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 700,
                            color: textColor,
                            cursor: canFill ? "pointer" : "default",
                            transition: "border-color 0.15s, background 0.15s",
                            animation: isJF
                              ? "gs-cell-pop 0.35s ease"
                              : canFill
                              ? "gs-cell-pulse 1.6s ease-in-out infinite"
                              : isFilled && isMatch && val > 0
                              ? "gs-match-glow 2s ease-in-out infinite"
                              : "none",
                          }}
                        >
                          {isFilled ? val : canFill ? "·" : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          fontSize: 10,
          color: "#6b7280",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "rgba(250,204,21,0.15)",
              border: "1px solid rgba(250,204,21,0.5)",
            }} />
            <span>MATCH</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "rgba(129,140,248,0.1)",
              border: "1px solid rgba(129,140,248,0.4)",
            }} />
            <span>NO MATCH</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "rgba(129,140,248,0.04)",
              border: "1px dashed rgba(129,140,248,0.3)",
            }} />
            <span>CLICKABLE</span>
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          fontSize: 11,
        }}>
          <div style={{ color: "#6b7280" }}>
            CELLS: {Math.max(0, filledCount)}/{totalCells}
          </div>
          <div style={{
            width: 100,
            height: 4,
            background: "#1a1a1a",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(Math.max(0, filledCount) / totalCells) * 100}%`,
              background: "#818cf8",
              borderRadius: 2,
              transition: "width 0.3s",
            }} />
          </div>
          {lcsValue > 0 && (
            <div style={{
              color: "#818cf8",
              fontWeight: 700,
              animation: solved ? "gs-win-pulse 1.5s ease infinite" : "none",
            }}>
              LCS = {lcsValue}
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
              marginBottom: 4,
              animation: "gs-win-pulse 1.5s ease-in-out infinite",
            }}>
              LCS LENGTH: {lcsValue}
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 12, letterSpacing: 1 }}>
              "{S1}" ∩ "{S2}" — COMMON SUBSEQUENCE OF LENGTH {lcsValue}
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
