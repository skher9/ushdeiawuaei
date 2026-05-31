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

const S1 = "ACE";
const S2 = "BED";
const ROWS = S1.length + 1;
const COLS = S2.length + 1;

type CellOp = "match" | "replace" | "insert" | "delete" | null;

function initGrid(): (number | null)[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      if (r === 0) return c;
      if (c === 0) return r;
      return null;
    })
  );
}

function computeOp(grid: (number | null)[][], r: number, c: number): CellOp {
  if (grid[r][c] === null) return null;
  if (r === 0 || c === 0) return null;
  const val = grid[r][c] as number;
  const ch1 = S1[r - 1];
  const ch2 = S2[c - 1];
  if (ch1 === ch2 && val === (grid[r - 1][c - 1] as number)) return "match";
  const fromDiag = grid[r - 1][c - 1] as number;
  if (val === fromDiag + 1) {
    if (ch1 !== ch2) return "replace";
  }
  if (val === (grid[r - 1][c] as number) + 1) return "delete";
  if (val === (grid[r][c - 1] as number) + 1) return "insert";
  return "replace";
}

function isClickable(grid: (number | null)[][], r: number, c: number): boolean {
  if (grid[r][c] !== null) return false;
  if (r === 0 || c === 0) return false;
  return grid[r - 1][c] !== null && grid[r][c - 1] !== null && grid[r - 1][c - 1] !== null;
}

const OP_COLORS: Record<string, string> = {
  match: "#4ade80",
  replace: "#f87171",
  insert: "#fbbf24",
  delete: "#fb923c",
};

const OP_LABELS: Record<string, string> = {
  match: "=",
  replace: "~",
  insert: "↑",
  delete: "←",
};

export default function WordWarp({ onSolve, onAttempt }: GameProps) {
  const [grid, setGrid] = useState<(number | null)[][]>(initGrid);
  const [ops, setOps] = useState<(CellOp)[][]>(
    () => Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
  );
  const [justFilled, setJustFilled] = useState<[number, number] | null>(null);
  const [shakeCell, setShakeCell] = useState<[number, number] | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const handleClick = useCallback((r: number, c: number) => {
    if (solved) return;
    if (r === 0 || c === 0) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    setGrid(prev => {
      if (!isClickable(prev, r, c)) {
        playTone(110, "sawtooth", 0.15);
        setShakeCell([r, c]);
        setTimeout(() => setShakeCell(null), 350);
        return prev;
      }

      const ch1 = S1[r - 1];
      const ch2 = S2[c - 1];
      const diag = prev[r - 1][c - 1] as number;
      const top = prev[r - 1][c] as number;
      const left = prev[r][c - 1] as number;

      let val: number;
      let op: CellOp;
      if (ch1 === ch2) {
        val = diag;
        op = "match";
      } else {
        val = Math.min(diag + 1, top + 1, left + 1);
        if (val === diag + 1) op = "replace";
        else if (val === top + 1) op = "delete";
        else op = "insert";
      }

      const next = prev.map(row => [...row]);
      next[r][c] = val;

      setOps(prevOps => {
        const nextOps = prevOps.map(row => [...row]);
        nextOps[r][c] = op;
        return nextOps;
      });

      const pitch = op === "match" ? 660 : op === "replace" ? 330 : 440;
      playTone(pitch, "sine", 0.14);
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
    setOps(Array.from({ length: ROWS }, () => new Array(COLS).fill(null)));
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const editDist = grid[ROWS - 1][COLS - 1];

  const mission = getMission("dynamic-programming", 7);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "DISTANCE", value: editDist ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes ww-pop {
          0% { transform: scale(0.4); opacity: 0; }
          65% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ww-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes ww-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.4); }
          50% { box-shadow: 0 0 8px 2px rgba(129,140,248,0.15); }
        }
        @keyframes ww-win {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 28px 8px rgba(129,140,248,0.2); }
        }
        @keyframes ww-letter-bob {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>WORD WARP</div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>EDIT DISTANCE — FILL THE DP TABLE BY CLICKING CELLS</div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {S1.split("").map((ch, i) => (
              <div key={i} style={{
                width: 32,
                height: 32,
                background: "rgba(129,140,248,0.1)",
                border: "1.5px solid rgba(129,140,248,0.4)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#a5b4fc",
                animation: `ww-letter-bob ${1 + i * 0.15}s ease-in-out infinite`,
              }}>{ch}</div>
            ))}
          </div>
          <div style={{ fontSize: 14, color: "#374151" }}>→</div>
          <div style={{ display: "flex", gap: 4 }}>
            {S2.split("").map((ch, i) => (
              <div key={i} style={{
                width: 32,
                height: 32,
                background: "rgba(74,222,128,0.08)",
                border: "1.5px solid rgba(74,222,128,0.3)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#86efac",
                animation: `ww-letter-bob ${1 + i * 0.15}s ease-in-out infinite`,
              }}>{ch}</div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(129,140,248,0.03)", border: "1px solid #111", borderRadius: 10, padding: 16 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `28px repeat(${COLS}, 52px)`,
            gridTemplateRows: `28px repeat(${ROWS}, 52px)`,
            gap: 3,
          }}>
            <div />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#374151" }}>ε</div>
            {S2.split("").map((ch, c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#86efac" }}>{ch}</div>
            ))}

            {Array.from({ length: ROWS }, (_, r) => (
              <>
                <div key={`label-${r}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: r === 0 ? 10 : 12, fontWeight: 700, color: r === 0 ? "#374151" : "#a5b4fc" }}>
                  {r === 0 ? "ε" : S1[r - 1]}
                </div>
                {Array.from({ length: COLS }, (_, c) => {
                  const val = grid[r][c];
                  const op = ops[r][c];
                  const clickable = isClickable(grid, r, c);
                  const isJust = justFilled?.[0] === r && justFilled?.[1] === c;
                  const isShaking = shakeCell?.[0] === r && shakeCell?.[1] === c;
                  const isBorder = r === 0 || c === 0;
                  const isWinCell = r === ROWS - 1 && c === COLS - 1 && solved;

                  let bg = "#0d0d0d";
                  let borderColor = "#1a1a1a";
                  let numColor = "#4b5563";

                  if (isWinCell) {
                    bg = "rgba(129,140,248,0.15)";
                    borderColor = "#818cf8";
                    numColor = "#818cf8";
                  } else if (isBorder && val !== null) {
                    bg = "rgba(255,255,255,0.03)";
                    borderColor = "#2a2a2a";
                    numColor = "#6b7280";
                  } else if (op && val !== null) {
                    const c2 = OP_COLORS[op];
                    bg = `${c2}14`;
                    borderColor = `${c2}55`;
                    numColor = c2;
                  } else if (clickable) {
                    bg = "rgba(129,140,248,0.04)";
                    borderColor = "rgba(129,140,248,0.45)";
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleClick(r, c)}
                      style={{
                        width: 52,
                        height: 52,
                        background: bg,
                        border: `1.5px solid ${borderColor}`,
                        borderRadius: 5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: clickable && !solved ? "pointer" : "default",
                        position: "relative",
                        transition: "background 0.15s, border-color 0.15s",
                        animation: isShaking
                          ? "ww-shake 0.35s ease"
                          : clickable && !solved
                          ? "ww-pulse 1.5s ease-in-out infinite"
                          : "none",
                      }}
                    >
                      {val !== null && (
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: numColor,
                          animation: isJust ? "ww-pop 0.35s ease" : "none",
                        }}>
                          {val}
                        </div>
                      )}
                      {op && (
                        <div style={{
                          fontSize: 9,
                          color: numColor,
                          opacity: 0.75,
                          letterSpacing: 0.5,
                        }}>
                          {OP_LABELS[op]}
                        </div>
                      )}
                      {val === null && clickable && (
                        <div style={{ fontSize: 16, color: "rgba(129,140,248,0.4)" }}>+</div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {Object.entries(OP_COLORS).map(([op, color]) => (
            <span key={op} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#4b5563", letterSpacing: 1 }}>
              <span style={{ width: 10, height: 10, background: `${color}30`, border: `1px solid ${color}60`, borderRadius: 2, display: "inline-block" }} />
              {op.toUpperCase()} {OP_LABELS[op]}
            </span>
          ))}
        </div>

        {editDist !== null && (
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>
            EDIT DISTANCE: <span style={{ color: "#818cf8", fontWeight: 700 }}>{editDist}</span>
          </div>
        )}

        {solved && (
          <div style={{
            textAlign: "center",
            animation: "ww-win 1.5s ease-in-out infinite",
            padding: "12px 24px",
            border: "1px solid rgba(129,140,248,0.3)",
            borderRadius: 8,
            background: "rgba(129,140,248,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", letterSpacing: 3, marginBottom: 4 }}>
              {S1} → {S2} IN {editDist} OPS
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
