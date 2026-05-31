"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const WORDS = ["STACK", "QUEUE", "GRAPH", "ARRAY", "INDEX", "MERGE", "PIVOT", "PROBE", "SPLIT", "TRACE", "DEPTH", "LIMIT"];
const ROWS = 6;
const COLS = 6;
const CELL_SIZE = 52;

function randomLetter(exclude: string[] = []): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => !exclude.includes(l));
  return letters[Math.floor(Math.random() * letters.length)];
}

function isAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && !(a[0] === b[0] && a[1] === b[1]);
}

function placeWord(
  word: string,
  rows: number,
  cols: number
): { grid: string[][]; path: [number, number][] } {
  const wordLetters = word.split("");

  for (let attempt = 0; attempt < 200; attempt++) {
    const path: [number, number][] = [];
    const visited = new Set<string>();

    let r = Math.floor(Math.random() * rows);
    let c = Math.floor(Math.random() * cols);
    path.push([r, c]);
    visited.add(`${r},${c}`);

    let success = true;
    for (let i = 1; i < word.length; i++) {
      // Collect valid neighbors
      const neighbors: [number, number][] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
            neighbors.push([nr, nc]);
          }
        }
      }
      if (neighbors.length === 0) { success = false; break; }
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      r = next[0];
      c = next[1];
      path.push([r, c]);
      visited.add(`${r},${c}`);
    }

    if (!success) continue;

    // Build grid
    const grid: string[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => randomLetter())
    );

    // Place word letters along path
    for (let i = 0; i < word.length; i++) {
      grid[path[i][0]][path[i][1]] = wordLetters[i];
    }

    return { grid, path };
  }

  // Fallback: place horizontally at row 0
  const path: [number, number][] = word.split("").map((_, i) => [0, i] as [number, number]);
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randomLetter())
  );
  for (let i = 0; i < word.length; i++) {
    grid[path[i][0]][path[i][1]] = word[i];
  }
  return { grid, path };
}

function initGame(): { word: string; grid: string[][]; path: [number, number][] } {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const { grid, path } = placeWord(word, ROWS, COLS);
  return { word, grid, path };
}

type CellState = "default" | "selected" | "error" | "solved";

export default function WordHunt({ onSolve, onAttempt }: GameProps) {
  const [game, setGame] = useState(() => initGame());
  const [selected, setSelected] = useState<[number, number][]>([]);
  const [backtracks, setBacktracks] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [solveAnim, setSolveAnim] = useState(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build a key->selectionOrder map for quick lookup
  const selectionMap = useCallback((): Map<string, number> => {
    const m = new Map<string, number>();
    selected.forEach(([r, c], i) => m.set(`${r},${c}`, i));
    return m;
  }, [selected]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (solved || shaking) return;

      const key = `${r},${c}`;
      const selMap = selectionMap();
      const isAlreadySelected = selMap.has(key);

      if (isAlreadySelected) return;

      const { word } = game;

      if (selected.length === 0) {
        // Starting a new path
        if (!attemptStarted) {
          onAttempt();
          setAttemptStarted(true);
        }
        // Any cell can be first — but only if it matches word[0]
        if (game.grid[r][c] !== word[0]) {
          // Trigger shake for wrong start letter
          setShaking(true);
          if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
          shakeTimeout.current = setTimeout(() => {
            setShaking(false);
            setSelected([]);
            setBacktracks(bt => bt + 1);
          }, 500);
          return;
        }
        setSelected([[r, c]]);
        return;
      }

      // Check adjacency to last selected
      const last = selected[selected.length - 1];
      if (!isAdjacent(last, [r, c])) {
        // Not adjacent — shake & reset
        setShaking(true);
        if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => {
          setShaking(false);
          setSelected([]);
          setBacktracks(bt => bt + 1);
        }, 500);
        return;
      }

      // Check if it's the correct letter for this position
      const nextPos = selected.length;
      if (game.grid[r][c] !== word[nextPos]) {
        // Wrong letter — shake & reset
        setShaking(true);
        if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => {
          setShaking(false);
          setSelected([]);
          setBacktracks(bt => bt + 1);
        }, 500);
        return;
      }

      // Correct letter
      const newSelected: [number, number][] = [...selected, [r, c]];
      setSelected(newSelected);

      if (newSelected.length === word.length) {
        // Solved!
        setSolveAnim(true);
        setSolved(true);
        setTimeout(() => {
          onSolve();
        }, 1000);
      }
    },
    [solved, shaking, selected, game, selectionMap, attemptStarted, onAttempt, onSolve]
  );

  const getCellState = useCallback(
    (r: number, c: number): CellState => {
      const key = `${r},${c}`;
      const selMap = selectionMap();
      if (solveAnim && selMap.has(key)) return "solved";
      if (shaking && selMap.has(key)) return "error";
      if (selMap.has(key)) return "selected";
      return "default";
    },
    [selectionMap, shaking, solveAnim]
  );

  const isDisabled = useCallback(
    (r: number, c: number): boolean => {
      if (solved || shaking) return true;
      if (selected.length === 0) return false;
      const key = `${r},${c}`;
      const selMap = selectionMap();
      if (selMap.has(key)) return true;
      const last = selected[selected.length - 1];
      if (!isAdjacent(last, [r, c])) return true;
      return false;
    },
    [solved, shaking, selected, selectionMap]
  );

  const handleReset = useCallback(() => {
    setGame(initGame());
    setSelected([]);
    setBacktracks(0);
    setSolved(false);
    setSolveAnim(false);
    setShaking(false);
    setAttemptStarted(false);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    };
  }, []);

  const { word, grid } = game;
  const selMap = selectionMap();

  const mission = getMission("backtracking", 8);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [{ label: "TRACED", value: `${selected.length}/${game.word.length}` }, { label: "BACKTRACKS", value: backtracks, danger: backtracks > 3 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes pulse-green {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); border-color: #22c55e; }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); border-color: #4ade80; }
        }
        @keyframes cell-shake {
          0%,100% { transform: translateX(0) scale(1); }
          25% { transform: translateX(-3px) scale(0.97); }
          75% { transform: translateX(3px) scale(0.97); }
        }
      `}</style>

      {/* Target word boxes */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em", marginRight: 4 }}>
          TARGET:
        </span>
        {word.split("").map((letter, i) => {
          const revealed = i < selected.length;
          return (
            <div
              key={i}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: revealed
                  ? "1px solid #f59e0b"
                  : "1px solid #374151",
                borderRadius: 3,
                background: revealed ? "rgba(245,158,11,0.15)" : "#111",
                color: revealed ? "#f59e0b" : "#374151",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
            >
              {revealed ? letter : "?"}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: 4,
          animation: shaking ? "shake 0.5s ease" : undefined,
        }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const state = getCellState(r, c);
            const disabled = isDisabled(r, c);
            const order = selMap.get(`${r},${c}`);

            let bg = "#111";
            let border = "1px solid #1e293b";
            let color = "#94a3b8";
            let cursor = "pointer";
            let opacity = 1;
            let animation: string | undefined;

            if (state === "selected") {
              bg = "rgba(245,158,11,0.15)";
              border = "1px solid #f59e0b";
              color = "#f59e0b";
            } else if (state === "error") {
              bg = "rgba(239,68,68,0.2)";
              border = "1px solid #ef4444";
              color = "#ef4444";
              animation = "cell-shake 0.5s ease";
            } else if (state === "solved") {
              bg = "rgba(34,197,94,0.15)";
              border = "1px solid #22c55e";
              color = "#22c55e";
              animation = "pulse-green 0.8s ease infinite";
            } else if (disabled) {
              opacity = 0.35;
              cursor = "not-allowed";
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  background: bg,
                  border,
                  borderRadius: 4,
                  color,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor,
                  opacity,
                  transition: "background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s",
                  userSelect: "none",
                  animation,
                  boxSizing: "border-box",
                }}
              >
                {order !== undefined && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: 4,
                      fontSize: 8,
                      color: state === "solved" ? "#4ade80" : state === "error" ? "#fca5a5" : "#fbbf24",
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    {order + 1}
                  </span>
                )}
                {letter}
              </div>
            );
          })
        )}
      </div>

      {/* Status / controls */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {solved && (
          <div
            style={{
              fontSize: 13,
              color: "#22c55e",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            WORD FOUND! +{backtracks === 0 ? " PERFECT" : ` ${backtracks} BACKTRACKS`}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setSelected([]);
              setShaking(false);
              if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
            }}
            disabled={solved || selected.length === 0}
            style={{
              padding: "6px 14px",
              background: "rgba(71,85,105,0.15)",
              border: "1px solid #334155",
              borderRadius: 4,
              cursor: solved || selected.length === 0 ? "not-allowed" : "pointer",
              fontSize: 10,
              color: "#64748b",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              opacity: solved || selected.length === 0 ? 0.5 : 1,
            }}
          >
            CLEAR
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: "6px 14px",
              background: "rgba(71,85,105,0.15)",
              border: "1px solid #334155",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 10,
              color: "#64748b",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            NEW WORD
          </button>
        </div>
      </div>
    </div>
    </GameShell>
  );
}
