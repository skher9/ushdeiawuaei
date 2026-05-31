"use client";
// ROTTEN ORANGES — MULTI-SOURCE BFS
// CLICK ORANGES TO MARK ROTTEN · CLICK START · WATCH BFS SPREAD FROM ALL SOURCES SIMULTANEOUSLY
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 6;
const COLS = 6;
const CELL_SIZE = 60;
const GAP = 4;

type CellState = "empty" | "fresh" | "rotten" | "spreading" | "done";

function generateGrid(): CellState[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): CellState =>
      Math.random() < 0.3 ? "empty" : "fresh"
    )
  );
}

// Multi-source BFS: returns levels (each level = 1 minute)
// Each level is a list of [r, c] cells that rot that minute
function multiBFS(grid: CellState[][]): [number, number][][] {
  const levels: [number, number][][] = [];
  // Copy state so we can track which are still fresh
  const state: CellState[][] = grid.map((row) => row.map((c) => c));

  // Seed queue with all initial rotten
  let queue: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state[r][c] === "rotten") queue.push([r, c]);

  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const next: [number, number][] = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && state[nr][nc] === "fresh") {
          state[nr][nc] = "rotten";
          next.push([nr, nc]);
        }
      }
    }
    if (next.length > 0) levels.push(next);
    queue = next;
  }

  return levels;
}

function hasUnreachable(grid: CellState[][]): boolean {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === "fresh") return true;
  return false;
}

function freshCount(grid: CellState[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === "fresh") n++;
  return n;
}

function rottenCount(grid: CellState[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === "rotten") n++;
  return n;
}

type Phase = "setup" | "running" | "result";

export default function RottenOranges({ onSolve, onAttempt }: GameProps) {
  const [baseGrid, setBaseGrid] = useState<CellState[][]>(() => generateGrid());
  const [displayGrid, setDisplayGrid] = useState<CellState[][]>(() => []);
  const [phase, setPhase] = useState<Phase>("setup");
  const [minutes, setMinutes] = useState(0);
  const [success, setSuccess] = useState(false);
  const [pulseGreen, setPulseGreen] = useState(false);

  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);

  // Sync displayGrid to baseGrid during setup
  useEffect(() => {
    if (phase === "setup") {
      setDisplayGrid(baseGrid.map((row) => [...row]));
    }
  }, [baseGrid, phase]);

  function clearTimers() {
    for (const t of animTimers.current) clearTimeout(t);
    animTimers.current = [];
  }

  function resetGame() {
    clearTimers();
    const g = generateGrid();
    setBaseGrid(g);
    setDisplayGrid(g.map((row) => [...row]));
    setPhase("setup");
    setMinutes(0);
    setSuccess(false);
    setPulseGreen(false);
    solvedRef.current = false;
    attemptedRef.current = false;
  }

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (phase !== "setup") return;
      const cell = baseGrid[r][c];
      if (cell === "empty") return;
      // Toggle: fresh → rotten, rotten → fresh
      setBaseGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = cell === "fresh" ? "rotten" : "fresh";
        return next;
      });
    },
    [phase, baseGrid]
  );

  const handleStart = useCallback(() => {
    if (phase !== "setup") return;
    const rc = rottenCount(baseGrid);
    if (rc === 0) return;

    if (!attemptedRef.current) {
      attemptedRef.current = true;
      onAttempt();
    }

    setPhase("running");

    // Compute BFS levels from baseGrid snapshot
    const snapshot = baseGrid.map((row) => [...row]);
    const levels = multiBFS(snapshot);

    // Apply BFS to snapshot so we can check final state
    const finalGrid = snapshot.map((row) => [...row]);
    for (const level of levels)
      for (const [r, c] of level)
        finalGrid[r][c] = "done";

    // Also mark initial rotten as done at end
    // but keep them as "rotten" visually until animation finishes

    // Build animation steps
    // Each BFS level: mark cells as "spreading" then "done"
    // Time: level * 400ms for spreading, level * 400ms + 200ms for done

    // Start display with current grid (has rotten cells)
    setDisplayGrid(snapshot.map((row) => [...row]));

    const LEVEL_DELAY = 400;
    let maxTime = 0;

    levels.forEach((level, i) => {
      const tSpread = i * LEVEL_DELAY;
      const tDone = tSpread + 200;
      maxTime = Math.max(maxTime, tDone);

      const t1 = setTimeout(() => {
        setDisplayGrid((prev) => {
          const next = prev.map((row) => [...row]);
          for (const [r, c] of level) next[r][c] = "spreading";
          return next;
        });
        setMinutes(i + 1);
      }, tSpread);

      const t2 = setTimeout(() => {
        setDisplayGrid((prev) => {
          const next = prev.map((row) => [...row]);
          for (const [r, c] of level) next[r][c] = "done";
          return next;
        });
      }, tDone);

      animTimers.current.push(t1, t2);
    });

    // Also mark initial rotten as "done" after animation
    const tFinalize = maxTime + 50;
    const t3 = setTimeout(() => {
      setDisplayGrid((prev) => {
        const next = prev.map((row) => [...row]);
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            if (next[r][c] === "rotten") next[r][c] = "done";
        return next;
      });
    }, tFinalize);
    animTimers.current.push(t3);

    // Show result after animation
    const tResult = tFinalize + 100;
    const t4 = setTimeout(() => {
      setPhase("result");
      const unreachable = hasUnreachable(finalGrid);
      setSuccess(!unreachable);
      if (!unreachable && !solvedRef.current) {
        solvedRef.current = true;
        setPulseGreen(true);
        setTimeout(() => {
          onSolve();
        }, 600);
      }
    }, tResult);
    animTimers.current.push(t4);
  }, [phase, baseGrid, onAttempt, onSolve]);

  // Cell renderer
  function renderCell(r: number, c: number) {
    const cell = displayGrid[r]?.[c] ?? baseGrid[r][c];
    let bg: string;
    let border: string;
    let cursor: string = "default";
    let content: React.ReactNode = null;
    let boxShadow: string | undefined;

    switch (cell) {
      case "empty":
        bg = "#0d0d0d";
        border = "1px solid #111";
        break;
      case "fresh":
        bg = "#92400e";
        border = "1px solid #f97316";
        cursor = phase === "setup" ? "pointer" : "default";
        content = <span style={{ fontSize: 24, lineHeight: 1 }}>🍊</span>;
        break;
      case "rotten":
        bg = "#1a0800";
        border = "1px solid #7f1d1d";
        cursor = phase === "setup" ? "pointer" : "default";
        content = (
          <span style={{ fontSize: 20, lineHeight: 1, position: "relative" }}>
            <span style={{ opacity: 0.6 }}>🍊</span>
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-52%)",
                fontSize: 14,
                color: "#ef4444",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              ✕
            </span>
          </span>
        );
        break;
      case "spreading":
        bg = "#3a1500";
        border = "1px solid #f97316";
        boxShadow = "0 0 8px 2px rgba(249,115,22,0.5)";
        content = <span style={{ fontSize: 18, lineHeight: 1, opacity: 0.8 }}>💀</span>;
        break;
      case "done":
        bg = "#0d0500";
        border = "1px solid #2a1000";
        content = <span style={{ fontSize: 16, lineHeight: 1, opacity: 0.35 }}>🍂</span>;
        break;
    }

    return (
      <div
        key={`${r},${c}`}
        onClick={() => handleCellClick(r, c)}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          background: bg,
          border,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor,
          userSelect: "none",
          transition: "background 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out",
          boxShadow,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {content}
      </div>
    );
  }

  const rc = rottenCount(baseGrid);
  const fc = freshCount(baseGrid);
  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;

  const mission = getMission("graphs", 4);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "MINUTE", value: minutes }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Status row */}
      <div
        style={{
          width: "100%",
          maxWidth: gridWidth,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#e2e8f0",
            letterSpacing: "0.08em",
          }}
        >
          {phase === "setup" && `ROTTEN: ${rc} · FRESH: ${fc}`}
          {phase === "running" && `MINUTE: ${minutes}`}
          {phase === "result" && (
            <span style={{ color: success ? "#22c55e" : "#ef4444" }}>
              {success ? `DONE IN ${minutes} MINUTE${minutes !== 1 ? "S" : ""}` : `${minutes} MINUTE${minutes !== 1 ? "S" : ""} · FAILED`}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 9,
            color:
              phase === "running"
                ? "#eab308"
                : phase === "result"
                ? success
                  ? "#22c55e"
                  : "#ef4444"
                : "#374151",
            letterSpacing: "0.06em",
          }}
        >
          {phase === "setup" && rc === 0 && "MARK ≥1 ROTTEN SOURCE"}
          {phase === "setup" && rc > 0 && "READY — CLICK START"}
          {phase === "running" && "SPREADING..."}
          {phase === "result" && success && "ALL ORANGES ROTTED ✓"}
          {phase === "result" && !success && "UNREACHABLE ORANGES"}
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: GAP,
          flexShrink: 0,
          outline: pulseGreen ? "2px solid rgba(34,197,94,0.4)" : "none",
          borderRadius: 4,
          transition: "outline 0.3s",
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => renderCell(r, c))
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexShrink: 0,
          alignItems: "center",
        }}
      >
        {phase === "setup" && (
          <button
            onClick={handleStart}
            disabled={rc === 0}
            style={{
              padding: "8px 28px",
              background: rc > 0 ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${rc > 0 ? "rgba(34,197,94,0.5)" : "#1f2937"}`,
              borderRadius: 4,
              cursor: rc > 0 ? "pointer" : "not-allowed",
              fontSize: 11,
              color: rc > 0 ? "#22c55e" : "#374151",
              fontFamily: "inherit",
              letterSpacing: "0.12em",
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            [ START ]
          </button>
        )}
        <button
          onClick={resetGame}
          style={{
            padding: "8px 24px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid #1f2937",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            color: "#374151",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
          }}
        >
          [ RESET ]
        </button>
      </div>

      {/* Result message */}
      {phase === "result" && !success && (
        <div
          style={{
            fontSize: 10,
            color: "#ef4444",
            letterSpacing: "0.07em",
            textAlign: "center",
            lineHeight: 1.7,
            maxWidth: gridWidth,
            flexShrink: 0,
          }}
        >
          SOME ORANGES UNREACHABLE — ADD MORE ROTTEN SOURCES AND RETRY
        </div>
      )}

      {phase === "result" && success && (
        <div
          style={{
            fontSize: 10,
            color: "#22c55e",
            letterSpacing: "0.07em",
            textAlign: "center",
            lineHeight: 1.7,
            flexShrink: 0,
          }}
        >
          BFS SPREAD COMPLETE — ALL ORANGES ROTTED IN {minutes} MINUTE{minutes !== 1 ? "S" : ""}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          width: "100%",
          maxWidth: gridWidth,
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid #111",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { bg: "#0d0d0d", border: "#111", label: "EMPTY" },
            { bg: "#92400e", border: "#f97316", label: "FRESH 🍊" },
            { bg: "#1a0800", border: "#7f1d1d", label: "ROTTEN" },
            { bg: "#3a1500", border: "#f97316", label: "SPREADING", glow: true },
            { bg: "#0d0500", border: "#2a1000", label: "DONE" },
          ].map(({ bg, border, label, glow }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 2,
                  boxShadow: glow ? "0 0 4px rgba(249,115,22,0.5)" : undefined,
                }}
              />
              <span style={{ fontSize: 7, color: "#1f2937", letterSpacing: "0.05em" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
