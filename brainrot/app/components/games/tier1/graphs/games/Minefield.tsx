"use client";
// MINEFIELD                      [CELLS LEFT: X]
// CLICK TO REVEAL — SAFE CELLS AUTO-EXPAND VIA BFS FLOOD FILL
// ZERO NEIGHBORS = WAVE EXPANDS  ·  RIGHT-CLICK TO FLAG  ·  CLEAR THE FIELD TO WIN
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 10;
const COLS = 10;
const MINES = 15;

type CellState = {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
  animDelay: number; // ms delay for BFS reveal animation
};

type GameStatus = "idle" | "playing" | "won" | "lost";

// Number colors per minesweeper convention
const NUM_COLORS: Record<number, string> = {
  1: "#4a9eff",
  2: "#22c55e",
  3: "#ef4444",
  4: "#1e3a8a",
  5: "#7f1d1d",
  6: "#0d9488",
  7: "#111827",
  8: "#6b7280",
};

function buildEmptyGrid(): CellState[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
      animDelay: 0,
    }))
  );
}

function placeMines(grid: CellState[][], avoidR: number, avoidC: number): CellState[][] {
  const next = grid.map(row => row.map(cell => ({ ...cell })));
  const forbidden = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = avoidR + dr;
      const nc = avoidC + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        forbidden.add(`${nr},${nc}`);
      }
    }
  }

  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const key = `${r},${c}`;
    if (!forbidden.has(key) && !next[r][c].isMine) {
      next[r][c].isMine = true;
      placed++;
    }
  }

  // Compute adjacent mine counts
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r][c].isMine) continue;
      let count = 0;
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && next[nr][nc].isMine) {
          count++;
        }
      }
      next[r][c].adjacentMines = count;
    }
  }

  return next;
}

// Returns array of BFS levels: [[cells in level 0], [cells in level 1], ...]
function floodFill(grid: CellState[][], startR: number, startC: number): [number, number][][] {
  const visited = new Set<string>();
  const levels: [number, number][][] = [];
  let queue: [number, number][] = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    levels.push([...queue]);
    const next: [number, number][] = [];
    for (const [r, c] of queue) {
      if (grid[r][c].adjacentMines === 0) {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          const nr = r + dr;
          const nc = c + dc;
          const key = `${nr},${nc}`;
          if (
            nr >= 0 && nr < ROWS &&
            nc >= 0 && nc < COLS &&
            !visited.has(key) &&
            !grid[nr][nc].isMine &&
            !grid[nr][nc].revealed
          ) {
            visited.add(key);
            next.push([nr, nc]);
          }
        }
      }
    }
    queue = next;
  }

  return levels;
}

function countRevealedNonMines(grid: CellState[][]): number {
  let count = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!grid[r][c].isMine && grid[r][c].revealed) count++;
  return count;
}

const TOTAL_SAFE = ROWS * COLS - MINES;

export default function Minefield({ onSolve, onAttempt }: GameProps) {
  const [grid, setGrid] = useState<CellState[][]>(() => buildEmptyGrid());
  const [status, setStatus] = useState<GameStatus>("idle");
  const [minesReady, setMinesReady] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  // animating cells: key -> true (shows pop animation)
  const [animating, setAnimating] = useState<Set<string>>(() => new Set());
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);

  const cellsLeft = TOTAL_SAFE - revealedCount;

  function restartGame() {
    setGrid(buildEmptyGrid());
    setStatus("idle");
    setMinesReady(false);
    setRevealedCount(0);
    setAnimating(new Set());
    solvedRef.current = false;
    attemptedRef.current = false;
  }

  const handleReveal = useCallback((r: number, c: number) => {
    if (status === "lost" || status === "won") return;

    setGrid(prev => {
      const cell = prev[r][c];
      if (cell.revealed || cell.flagged) return prev;

      if (!attemptedRef.current) {
        attemptedRef.current = true;
        onAttempt();
      }

      // First click: place mines
      let workingGrid = prev;
      let isReady = minesReady;
      if (!isReady) {
        workingGrid = placeMines(prev, r, c);
        setMinesReady(true);
        isReady = true;
      }

      const clickedCell = workingGrid[r][c];

      if (clickedCell.isMine) {
        // Game over — reveal all mines
        const next = workingGrid.map(row => row.map(cell => ({
          ...cell,
          revealed: cell.isMine ? true : cell.revealed,
        })));
        setStatus("lost");
        return next;
      }

      // Safe cell
      if (clickedCell.adjacentMines > 0) {
        // Just reveal this cell
        const next = workingGrid.map(row => row.map(cell => ({ ...cell })));
        next[r][c].revealed = true;
        const newRevealed = countRevealedNonMines(next);
        setRevealedCount(newRevealed);
        if (newRevealed >= TOTAL_SAFE && !solvedRef.current) {
          solvedRef.current = true;
          setStatus("won");
          onSolve();
        } else {
          setStatus("playing");
        }
        return next;
      }

      // Zero adjacents: BFS flood fill
      const levels = floodFill(workingGrid, r, c);
      const next = workingGrid.map(row => row.map(cell => ({ ...cell })));

      // Apply all reveals immediately (state-wise), but schedule animation delays
      const newAnimating = new Set<string>();
      const revealSchedule: Array<{ key: string; delay: number }> = [];

      levels.forEach((level, levelIdx) => {
        const delay = levelIdx * 80;
        for (const [lr, lc] of level) {
          next[lr][lc].revealed = true;
          next[lr][lc].animDelay = delay;
          const key = `${lr},${lc}`;
          newAnimating.add(key);
          revealSchedule.push({ key, delay });
        }
      });

      const newRevealed = countRevealedNonMines(next);
      setRevealedCount(newRevealed);
      setStatus("playing");

      // Trigger pop animations with delays
      // We stagger clearing animating set to allow each cell to pop
      revealSchedule.forEach(({ key, delay }) => {
        setTimeout(() => {
          setAnimating(prev2 => {
            const s = new Set(prev2);
            // Add key first to trigger animation
            s.add(key);
            return s;
          });
          setTimeout(() => {
            setAnimating(prev2 => {
              const s = new Set(prev2);
              s.delete(key);
              return s;
            });
          }, 200);
        }, delay);
      });

      if (newRevealed >= TOTAL_SAFE && !solvedRef.current) {
        const totalDelay = (levels.length - 1) * 80 + 300;
        setTimeout(() => {
          if (!solvedRef.current) {
            solvedRef.current = true;
            setStatus("won");
            onSolve();
          }
        }, totalDelay);
      }

      return next;
    });
  }, [status, minesReady, onAttempt, onSolve]);

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === "lost" || status === "won") return;
    setGrid(prev => {
      const cell = prev[r][c];
      if (cell.revealed) return prev;
      const next = prev.map(row => row.map(c2 => ({ ...c2 })));
      next[r][c].flagged = !next[r][c].flagged;
      return next;
    });
  }, [status]);

  // Cell size: aim for ~44px on typical screen, with a container of ~480px max
  const CELL_SIZE = 44;
  const GAP = 2;
  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;

  function renderCell(cell: CellState, r: number, c: number) {
    const key = `${r},${c}`;
    const isAnimating = animating.has(key);

    let bg = "#1a1a1a";
    let border = "1px solid #2a2a2a";
    let content: React.ReactNode = null;
    let cursor = "pointer";
    let color = "#e2e8f0";
    let transform = isAnimating ? "scale(0.85)" : "scale(1)";
    const transition = "transform 0.15s ease-out, background 0.1s";

    if (cell.revealed) {
      if (cell.isMine) {
        bg = "#7f1d1d";
        border = "1px solid #ef4444";
        content = "💣";
        cursor = "default";
      } else if (cell.adjacentMines === 0) {
        bg = "#0d1117";
        border = "1px solid #161b22";
        cursor = "default";
      } else {
        bg = "#111827";
        border = "1px solid #1f2937";
        content = cell.adjacentMines;
        color = NUM_COLORS[cell.adjacentMines] ?? "#e2e8f0";
        cursor = "default";
      }
    } else if (cell.flagged) {
      bg = "#1a1a1a";
      border = "1px solid #374151";
      content = "🚩";
    } else {
      // Hidden
      bg = "#1a1a1a";
      border = "1px solid #2a2a2a";
    }

    return (
      <div
        key={key}
        onClick={() => handleReveal(r, c)}
        onContextMenu={(e) => handleFlag(e, r, c)}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          background: bg,
          border,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor,
          fontSize: cell.revealed && cell.adjacentMines > 0 && !cell.isMine ? 15 : 18,
          fontWeight: 700,
          color,
          userSelect: "none",
          transform,
          transition,
          flexShrink: 0,
        }}
      >
        {content}
      </div>
    );
  }

  const flagCount = grid.flat().filter(c => c.flagged).length;

  const mission = getMission("graphs", 1);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "REVEALED", value: revealedCount }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Stats row */}
      <div style={{
        width: "100%",
        maxWidth: gridWidth,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontSize: 10, color: "#374151" }}>
            💣 {MINES - flagCount} left
          </span>
          <span style={{ fontSize: 10, color: "#374151" }}>
            🚩 {flagCount} flagged
          </span>
        </div>
        <div style={{ fontSize: 10, color: status === "won" ? "#22c55e" : status === "lost" ? "#ef4444" : "#374151" }}>
          {status === "idle" && "CLICK TO START"}
          {status === "playing" && "SWEEPING..."}
          {status === "won" && "FIELD CLEARED ✓"}
          {status === "lost" && "MINE HIT — RETRY"}
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: GAP,
          flexShrink: 0,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => renderCell(cell, r, c))
        )}
      </div>

      {/* Win/Lose overlay messages + retry */}
      {(status === "won" || status === "lost") && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          marginTop: 4,
        }}>
          {status === "won" && (
            <div style={{
              fontSize: 12,
              color: "#22c55e",
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              BFS FLOOD FILL CLEARED ALL SAFE CELLS
            </div>
          )}
          {status === "lost" && (
            <div style={{
              fontSize: 11,
              color: "#ef4444",
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              MINE DETONATED — BFS STOPS AT MINES
            </div>
          )}
          <button
            onClick={restartGame}
            style={{
              padding: "8px 24px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${status === "won" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: status === "won" ? "#22c55e" : "#ef4444",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
          >
            {status === "won" ? "[ PLAY AGAIN ]" : "[ RETRY ]"}
          </button>
        </div>
      )}

      {/* BFS legend */}
      <div style={{
        width: "100%",
        maxWidth: gridWidth,
        marginTop: "auto",
        paddingTop: 8,
        borderTop: "1px solid #111",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 8, color: "#1f2937", letterSpacing: "0.06em", lineHeight: 2 }}>
          BFS WAVE: QUEUE starts with clicked cell · Each level dequeues cells,
          enqueues safe neighbors · 80ms per BFS ring · Stops at mines &amp; borders
        </div>
      </div>
    </div>
    </GameShell>
  );
}
