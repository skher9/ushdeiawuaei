"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

// ── Constants ────────────────────────────────────────────────────────────────

const ROWS = 7;
const COLS = 7;
const TOTAL = ROWS * COLS; // 49
const CELL = 54; // px per cell
const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";

// ── Types ────────────────────────────────────────────────────────────────────

type CellState = "unvisited" | "visited" | "current" | "deadend";

interface Wall {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

// ── Init helpers ─────────────────────────────────────────────────────────────

function initWalls(): Wall[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
    }))
  );
}

function initCellStates(): CellState[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      r === 0 && c === 0 ? "current" : "unvisited"
    )
  );
}

// ── Sound ────────────────────────────────────────────────────────────────────

function playTone(
  freq: number,
  type: OscillatorType = "sine",
  dur = 0.12
): void {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
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
  } catch {
    // silently ignore audio errors
  }
}

function playWin(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, "sine", 0.18), i * 120);
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MazeCaver({ onSolve, onAttempt }: GameProps) {
  const [walls, setWalls] = useState<Wall[][]>(() => initWalls());
  const [cellStates, setCellStates] = useState<CellState[][]>(() =>
    initCellStates()
  );
  const [current, setCurrent] = useState<[number, number]>([0, 0]);
  const [stack, setStack] = useState<[number, number][]>([[0, 0]]);
  const [backtracks, setBacktracks] = useState(0);
  const [solved, setSolved] = useState(false);
  const [visitedCount, setVisitedCount] = useState(1);
  const [deadEnd, setDeadEnd] = useState(false);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [attemptFired, setAttemptFired] = useState(false);
  const solvedCalledRef = useRef(false);

  // Derive which cells are valid move targets from current
  const getValidMoves = useCallback(
    (r: number, c: number, states: CellState[][]): [number, number][] => {
      const dirs: [number, number, keyof Wall, keyof Wall][] = [
        [-1, 0, "top", "bottom"],
        [1, 0, "bottom", "top"],
        [0, 1, "right", "left"],
        [0, -1, "left", "right"],
      ];
      return dirs
        .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
        .filter(
          ([nr, nc]) =>
            nr >= 0 &&
            nr < ROWS &&
            nc >= 0 &&
            nc < COLS &&
            states[nr][nc] === "unvisited"
        );
    },
    []
  );

  // Recompute dead-end whenever current or cellStates changes
  useEffect(() => {
    if (solved) return;
    const moves = getValidMoves(current[0], current[1], cellStates);
    setDeadEnd(moves.length === 0 && stack.length > 1);
  }, [current, cellStates, stack, solved, getValidMoves]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved) return;

      const [cr, cc] = current;

      // ── Backtrack: player clicks the cell directly below top of stack ──
      // On dead end, allow clicking the previous cell (stack[-2]) to backtrack
      if (deadEnd) {
        if (stack.length < 2) return;
        const [pr, pc] = stack[stack.length - 2];
        if (row === pr && col === pc) {
          // Backtrack
          playTone(300, "triangle", 0.1);
          setBacktracks((b) => b + 1);
          const newStack = stack.slice(0, -1);
          setStack(newStack);
          setCurrent([pr, pc]);
          setCellStates((prev) => {
            const next = prev.map((row_) => [...row_]) as CellState[][];
            next[cr][cc] = "visited"; // demote dead-end cell to visited
            next[pr][pc] = "current";
            return next;
          });
          setDeadEnd(false);
          // Flash the backtracked-to cell
          setFlashCell(`${pr},${pc}`);
          setTimeout(() => setFlashCell(null), 400);
        }
        return; // on dead end, only the backtrack click is accepted
      }

      // ── Move: must be adjacent unvisited cell ──
      const dr = row - cr;
      const dc = col - cc;
      const isAdjacent =
        (Math.abs(dr) === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
      if (!isAdjacent) return;
      if (cellStates[row][col] !== "unvisited") return;

      // Fire onAttempt on first move
      if (!attemptFired) {
        onAttempt();
        setAttemptFired(true);
      }

      // Determine wall direction
      type WallKey = keyof Wall;
      let fromWall: WallKey = "top";
      let toWall: WallKey = "bottom";
      if (dr === -1) {
        fromWall = "top";
        toWall = "bottom";
      } else if (dr === 1) {
        fromWall = "bottom";
        toWall = "top";
      } else if (dc === 1) {
        fromWall = "right";
        toWall = "left";
      } else {
        fromWall = "left";
        toWall = "right";
      }

      // Carve walls
      setWalls((prev) => {
        const next = prev.map((row_) => row_.map((w) => ({ ...w })));
        next[cr][cc][fromWall] = false;
        next[row][col][toWall] = false;
        return next;
      });

      const newVisitedCount = visitedCount + 1;
      setVisitedCount(newVisitedCount);

      // Update cell states
      setCellStates((prev) => {
        const next = prev.map((row_) => [...row_]) as CellState[][];
        next[cr][cc] = "visited";
        next[row][col] = "current";
        return next;
      });

      const newStack: [number, number][] = [...stack, [row, col]];
      setStack(newStack);
      setCurrent([row, col]);

      // Rising pitch as maze fills
      playTone(400 + newVisitedCount * 8);

      // Check win
      if (newVisitedCount === TOTAL) {
        setSolved(true);
        playWin();
      }
    },
    [
      current,
      cellStates,
      stack,
      visitedCount,
      solved,
      deadEnd,
      attemptFired,
      onAttempt,
    ]
  );

  // Dead-end sound
  useEffect(() => {
    if (deadEnd && !solved) {
      playTone(200, "sawtooth", 0.15);
    }
  }, [deadEnd, solved]);

  // Fire onSolve after delay
  useEffect(() => {
    if (solved && !solvedCalledRef.current) {
      solvedCalledRef.current = true;
      const t = setTimeout(() => onSolve(), 1000);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  // Compute valid moves for highlighting
  const validMoves = solved
    ? new Set<string>()
    : new Set(
        deadEnd
          ? [] // on dead end, highlight only the backtrack target
          : getValidMoves(current[0], current[1], cellStates).map(
              ([r, c]) => `${r},${c}`
            )
      );

  // On dead end, mark the previous cell as the backtrack target
  const backtrackTarget =
    deadEnd && stack.length >= 2
      ? `${stack[stack.length - 2][0]},${stack[stack.length - 2][1]}`
      : null;

  const mazeWidth = COLS * CELL;

  const mission = getMission("backtracking", 4);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [{ label: "VISITED", value: `${visitedCount}/${TOTAL}` }, { label: "BACKTRACKS", value: backtracks, danger: backtracks > 4 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* ── Main area: maze + side panel ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* ── Maze grid ── */}
        <div
          style={{
            position: "relative",
            width: mazeWidth,
            height: ROWS * CELL,
            background: "#0d0d0d",
            border: "2px solid #1e1e1e",
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const key = `${row},${col}`;
              const state = cellStates[row][col];
              const w = walls[row][col];
              const isCurrent = state === "current";
              const isVisited = state === "visited";
              const isUnvisited = state === "unvisited";
              const isValid = validMoves.has(key);
              const isBacktrackTarget = backtrackTarget === key;
              const isFlashing = flashCell === key;

              let bg = "#0d0d0d"; // unvisited
              let boxShadow = "none";

              if (solved) {
                bg = "rgba(34,197,94,0.10)";
              } else if (isCurrent && deadEnd) {
                bg = "rgba(239,68,68,0.25)";
                boxShadow = "inset 0 0 12px rgba(239,68,68,0.3)";
              } else if (isCurrent) {
                bg = "rgba(251,191,36,0.12)";
                boxShadow = "0 0 12px rgba(251,191,36,0.6)";
              } else if (isFlashing || isBacktrackTarget) {
                bg = "rgba(251,191,36,0.10)";
                boxShadow = "0 0 10px rgba(251,191,36,0.4)";
              } else if (isVisited) {
                bg = "rgba(251,191,36,0.05)";
              } else if (isValid) {
                bg = "rgba(34,197,94,0.07)";
              }

              // Wall borders — wall present = thick dark border, no wall = transparent
              const borderTop = w.top
                ? "2px solid #2a2a2a"
                : "2px solid transparent";
              const borderRight = w.right
                ? "2px solid #2a2a2a"
                : "2px solid transparent";
              const borderBottom = w.bottom
                ? "2px solid #2a2a2a"
                : "2px solid transparent";
              const borderLeft = w.left
                ? "2px solid #2a2a2a"
                : "2px solid transparent";

              const animName = solved
                ? `mazeWin`
                : isCurrent && deadEnd
                ? "deadEndFlash"
                : isCurrent
                ? "currentPulse"
                : isValid
                ? "validPulse"
                : isBacktrackTarget
                ? "backtrackPulse"
                : "none";

              const animDur = solved
                ? `${0.3 + (row * COLS + col) * 0.015}s`
                : isCurrent && deadEnd
                ? "0.5s"
                : isCurrent
                ? "1.4s"
                : isValid
                ? "1.2s"
                : isBacktrackTarget
                ? "0.6s"
                : "0s";

              return (
                <div
                  key={key}
                  onClick={() => handleCellClick(row, col)}
                  style={{
                    position: "absolute",
                    top: row * CELL,
                    left: col * CELL,
                    width: CELL,
                    height: CELL,
                    background: bg,
                    borderTop,
                    borderRight,
                    borderBottom,
                    borderLeft,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      isCurrent || isUnvisited ? "pointer" : "default",
                    transition:
                      "background 0.15s, box-shadow 0.15s, border-color 0.2s",
                    boxShadow,
                    animation:
                      animName !== "none"
                        ? `${animName} ${animDur} ease infinite`
                        : "none",
                  }}
                >
                  {/* Current position marker */}
                  {isCurrent && !solved && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: deadEnd ? "#ef4444" : "#fbbf24",
                        boxShadow: deadEnd
                          ? "0 0 10px rgba(239,68,68,0.7)"
                          : "0 0 10px rgba(251,191,36,0.7)",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Visited trail dot */}
                  {isVisited && !solved && (
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "rgba(251,191,36,0.3)",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Backtrack arrow */}
                  {isBacktrackTarget && !solved && (
                    <span
                      style={{
                        fontSize: 16,
                        color: "#fbbf24",
                        opacity: 0.85,
                        lineHeight: 1,
                      }}
                    >
                      ↩
                    </span>
                  )}

                  {/* Valid move pulse ring */}
                  {isValid && !solved && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "2px solid rgba(34,197,94,0.55)",
                        flexShrink: 0,
                        animation: "validPulse 1.2s ease infinite",
                      }}
                    />
                  )}

                  {/* Win fill */}
                  {solved && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(34,197,94,0.45)",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Start cell label */}
                  {row === 0 && col === 0 && !isCurrent && (
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: 4,
                        fontSize: 7,
                        color: "rgba(251,191,36,0.4)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      S
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Side panel ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 80,
          }}
        >
          {/* Depth indicator */}
          <div
            style={{
              padding: "10px 12px",
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: "#475569",
                letterSpacing: "0.1em",
                marginBottom: 5,
              }}
            >
              DEPTH
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#fbbf24",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {stack.length - 1}
            </div>
          </div>

          {/* Visited counter */}
          <div
            style={{
              padding: "10px 12px",
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: "#475569",
                letterSpacing: "0.1em",
                marginBottom: 5,
              }}
            >
              VISITED
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#64748b",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {visitedCount}
              <span style={{ fontSize: 10, color: "#374151" }}>/49</span>
            </div>
          </div>

          {/* Stack depth bar */}
          <div
            style={{
              padding: "10px 12px",
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: "#475569",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              STACK
            </div>
            <div
              style={{
                width: 10,
                height: 60,
                background: "#0d0d0d",
                border: "1px solid #222",
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.min(100, (stack.length / TOTAL) * 100)}%`,
                  background: deadEnd
                    ? "rgba(239,68,68,0.6)"
                    : "rgba(251,191,36,0.6)",
                  transition: "height 0.2s, background 0.2s",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        style={{
          marginTop: 12,
          width: mazeWidth + 8 + 80 + 16,
          maxWidth: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "#374151",
        }}
      >
        <span>
          CELLS:{" "}
          <span style={{ color: "#64748b", fontWeight: 700 }}>
            {visitedCount} / {TOTAL}
          </span>
        </span>
        {deadEnd && !solved && (
          <span
            style={{
              color: "#ef4444",
              animation: "blink 0.8s step-end infinite",
            }}
          >
            DEAD END — CLICK ↩ TO BACKTRACK
          </span>
        )}
        {!deadEnd && !solved && visitedCount > 1 && (
          <span style={{ color: "#4b5563" }}>DFS DEPTH: {stack.length - 1}</span>
        )}
        {solved && (
          <span style={{ color: "#22c55e", letterSpacing: "0.1em" }}>
            MAZE COMPLETE ✓
          </span>
        )}
      </div>

      {/* ── Hint / message row ── */}
      {visitedCount === 1 && !solved && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "rgba(251,191,36,0.04)",
            border: "1px solid rgba(251,191,36,0.12)",
            borderRadius: 4,
            fontSize: 9,
            color: "#78716c",
            letterSpacing: "0.06em",
            maxWidth: mazeWidth + 96 + 16,
            width: "100%",
          }}
        >
          YOU ARE THE DFS ALGORITHM — CLICK A GLOWING GREEN NEIGHBOUR TO CARVE
        </div>
      )}

      {deadEnd && !solved && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: 4,
            fontSize: 9,
            color: "#7f1d1d",
            letterSpacing: "0.06em",
            maxWidth: mazeWidth + 96 + 16,
            width: "100%",
          }}
        >
          DEAD END — ALL NEIGHBOURS ALREADY VISITED. CLICK ↩ TO BACKTRACK TO
          PREVIOUS CELL.
        </div>
      )}

      {backtracks > 0 && !deadEnd && !solved && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "rgba(249,115,22,0.04)",
            border: "1px solid rgba(249,115,22,0.1)",
            borderRadius: 4,
            fontSize: 9,
            color: "#78716c",
            letterSpacing: "0.06em",
            maxWidth: mazeWidth + 96 + 16,
            width: "100%",
          }}
        >
          BACKTRACK #{backtracks} — RETURNED TO LAST FORK, TRYING ANOTHER BRANCH
        </div>
      )}

      {solved && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 20px",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 6,
            fontSize: 10,
            color: "#22c55e",
            letterSpacing: "0.08em",
            textAlign: "center",
            maxWidth: mazeWidth + 96 + 16,
            width: "100%",
            lineHeight: 1.8,
          }}
        >
          ALL 49 CELLS CARVED — {backtracks} BACKTRACK
          {backtracks !== 1 ? "S" : ""}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            YOU JUST SIMULATED RECURSIVE DFS BACKTRACKING
          </span>
        </div>
      )}

      <style>{`
        @keyframes currentPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.5); }
          50%       { box-shadow: 0 0 18px rgba(251,191,36,0.9); }
        }
        @keyframes deadEndFlash {
          0%, 100% { background: rgba(239,68,68,0.18); }
          50%       { background: rgba(239,68,68,0.38); }
        }
        @keyframes validPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes backtrackPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(251,191,36,0.3); }
          50%       { box-shadow: 0 0 14px rgba(251,191,36,0.7); }
        }
        @keyframes mazeWin {
          0%, 100% { background: rgba(34,197,94,0.07); }
          50%       { background: rgba(34,197,94,0.18); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
    </GameShell>
  );
}
