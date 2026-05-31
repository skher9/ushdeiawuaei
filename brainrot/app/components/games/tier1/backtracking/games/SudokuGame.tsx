"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const PUZZLES: number[][][] = [
  // Easy puzzle 1
  [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],
    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],
    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
  ],
  // Easy puzzle 2
  [
    [0,0,0, 2,6,0, 7,0,1],
    [6,8,0, 0,7,0, 0,9,0],
    [1,9,0, 0,0,4, 5,0,0],
    [8,2,0, 1,0,0, 0,4,0],
    [0,0,4, 6,0,2, 9,0,0],
    [0,5,0, 0,0,3, 0,2,8],
    [0,0,9, 3,0,0, 0,7,4],
    [0,4,0, 0,5,0, 0,3,6],
    [7,0,3, 0,1,8, 0,0,0],
  ],
];

function isValidPlacement(board: number[][], r: number, c: number, val: number): boolean {
  // Check row
  for (let col = 0; col < 9; col++) {
    if (col !== c && board[r][col] === val) return false;
  }
  // Check column
  for (let row = 0; row < 9; row++) {
    if (row !== r && board[row][c] === val) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(r / 3) * 3;
  const boxCol = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const nr = boxRow + dr;
      const nc = boxCol + dc;
      if ((nr !== r || nc !== c) && board[nr][nc] === val) return false;
    }
  }
  return true;
}

function isSolved(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
      if (!isValidPlacement(board, r, c, board[r][c])) return false;
    }
  }
  return true;
}

function getConflictCells(board: number[][]): Set<string> {
  const conflicts = new Set<string>();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val === 0) continue;
      if (!isValidPlacement(board, r, c, val)) {
        conflicts.add(`${r},${c}`);
        // Also mark the peers that conflict
        // Row peers
        for (let col = 0; col < 9; col++) {
          if (col !== c && board[r][col] === val) {
            conflicts.add(`${r},${col}`);
          }
        }
        // Col peers
        for (let row = 0; row < 9; row++) {
          if (row !== r && board[row][c] === val) {
            conflicts.add(`${row},${c}`);
          }
        }
        // Box peers
        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const nr = boxRow + dr;
            const nc = boxCol + dc;
            if ((nr !== r || nc !== c) && board[nr][nc] === val) {
              conflicts.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }
  return conflicts;
}

function copyBoard(board: number[][]): number[][] {
  return board.map(row => [...row]);
}

function initGame(puzzleIndex: number) {
  const puzzle = PUZZLES[puzzleIndex];
  const given: boolean[][] = puzzle.map(row => row.map(v => v !== 0));
  const board: number[][] = copyBoard(puzzle);
  return { given, board };
}

const CELL_SIZE = 44;

export default function SudokuGame({ onSolve, onAttempt }: GameProps) {
  const [puzzleIndex] = useState(() => Math.floor(Math.random() * PUZZLES.length));
  const [{ given, board }, setGame] = useState(() => initGame(Math.floor(Math.random() * PUZZLES.length)));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [solved, setSolved] = useState(false);
  const [solveAnim, setSolveAnim] = useState(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const solveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive conflicts
  const conflictSet = getConflictCells(board);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (solved) return;
      if (given[r][c]) return; // pre-filled cells not selectable
      setSelected([r, c]);
    },
    [solved, given]
  );

  const handleNumpad = useCallback(
    (val: number) => {
      if (solved || !selected) return;
      const [r, c] = selected;
      if (given[r][c]) return;

      if (!attemptStarted) {
        onAttempt();
        setAttemptStarted(true);
      }

      setGame(prev => {
        const newBoard = copyBoard(prev.board);
        newBoard[r][c] = val;
        return { given: prev.given, board: newBoard };
      });
    },
    [solved, selected, given, attemptStarted, onAttempt]
  );

  // Check for solve after every board change
  useEffect(() => {
    if (!attemptStarted) return;
    if (solved) return;
    if (isSolved(board)) {
      setSolveAnim(true);
      setSolved(true);
      solveTimeout.current = setTimeout(() => {
        onSolve();
      }, 1000);
    }
  }, [board, attemptStarted, solved, onSolve]);

  useEffect(() => {
    return () => {
      if (solveTimeout.current) clearTimeout(solveTimeout.current);
    };
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (solved || !selected) return;
      const key = e.key;
      if (key >= "1" && key <= "9") {
        handleNumpad(parseInt(key));
      } else if (key === "0" || key === "Backspace" || key === "Delete") {
        handleNumpad(0);
      } else if (key === "ArrowUp" && selected[0] > 0) {
        // navigate to next non-given cell upward
        setSelected([selected[0] - 1, selected[1]]);
      } else if (key === "ArrowDown" && selected[0] < 8) {
        setSelected([selected[0] + 1, selected[1]]);
      } else if (key === "ArrowLeft" && selected[1] > 0) {
        setSelected([selected[0], selected[1] - 1]);
      } else if (key === "ArrowRight" && selected[1] < 8) {
        setSelected([selected[0], selected[1] + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [solved, selected, handleNumpad]);

  const handleReset = useCallback(() => {
    if (solveTimeout.current) clearTimeout(solveTimeout.current);
    const idx = Math.floor(Math.random() * PUZZLES.length);
    setGame(initGame(idx));
    setSelected(null);
    setSolved(false);
    setSolveAnim(false);
    setAttemptStarted(false);
  }, []);

  // Count filled cells
  let filled = 0;
  let total = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!given[r][c]) {
        total++;
        if (board[r][c] !== 0) filled++;
      }
    }
  }

  const mission = getMission("backtracking", 5);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [{ label: "FILLED", value: `${filled}/${total}` }, { label: "CONFLICTS", value: conflictSet.size, danger: conflictSet.size > 0 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes pulse-green-sudoku {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        .sudoku-solved-cell {
          animation: pulse-green-sudoku 0.8s ease infinite;
        }
      `}</style>

      {/* 9x9 Grid */}
      <div
        style={{
          display: "inline-block",
          border: "2px solid #475569",
          borderRadius: 2,
          background: "#0a0a0a",
        }}
      >
        {Array.from({ length: 9 }, (_, r) => (
          <div key={r} style={{ display: "flex" }}>
            {Array.from({ length: 9 }, (_, c) => {
              const val = board[r][c];
              const isGiven = given[r][c];
              const isSelected = selected !== null && selected[0] === r && selected[1] === c;
              const isConflict = conflictSet.has(`${r},${c}`);
              const isEmpty = val === 0;

              // Border thicknesses for 3x3 box separation
              const borderRight = (c + 1) % 3 === 0 && c !== 8 ? "2px solid #475569" : "1px solid #1e293b";
              const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "2px solid #475569" : "1px solid #1e293b";
              const borderLeft = c === 0 ? "none" : undefined;
              const borderTop = r === 0 ? "none" : undefined;

              let bg = isGiven ? "#0d1117" : "#0a0a0a";
              let textColor = isGiven ? "#e2e8f0" : "#3b82f6";
              let cellBorder: string;
              let cursor = isGiven ? "default" : "pointer";

              if (isSelected) {
                bg = "#0c2a3a";
                cellBorder = `2px solid #22d3ee`;
              } else if (isConflict) {
                cellBorder = `2px solid #ef4444`;
                if (!isGiven) bg = "rgba(239,68,68,0.08)";
              } else {
                // use the per-side borders
                cellBorder = "none";
              }

              if (!isGiven && isConflict) {
                textColor = "#ef4444";
              }

              const showSolveAnim = solveAnim && !isEmpty;

              return (
                <div
                  key={c}
                  onClick={() => handleCellClick(r, c)}
                  className={showSolveAnim ? "sudoku-solved-cell" : undefined}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: showSolveAnim ? "rgba(34,197,94,0.1)" : bg,
                    color: showSolveAnim ? "#22c55e" : textColor,
                    fontSize: 17,
                    fontWeight: isGiven ? 600 : 700,
                    cursor,
                    userSelect: "none",
                    boxSizing: "border-box",
                    // Individual borders for grid lines
                    borderRight: isSelected || isConflict ? undefined : borderRight,
                    borderBottom: isSelected || isConflict ? undefined : borderBottom,
                    borderLeft: isSelected || isConflict ? undefined : (borderLeft ?? (c % 3 === 0 && c !== 0 ? "2px solid #475569" : "1px solid #1e293b")),
                    borderTop: isSelected || isConflict ? undefined : (borderTop ?? (r % 3 === 0 && r !== 0 ? "2px solid #475569" : "1px solid #1e293b")),
                    outline: isSelected ? "2px solid #22d3ee" : isConflict ? "2px solid #ef4444" : "none",
                    outlineOffset: isSelected || isConflict ? "-2px" : undefined,
                    transition: "background 0.12s, color 0.12s",
                    position: "relative",
                  }}
                >
                  {val !== 0 ? val : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Numpad — always visible */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 320,
        }}
      >
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button
            key={n}
            onClick={() => handleNumpad(n)}
            disabled={solved || !selected}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: selected && !solved ? "rgba(34,211,238,0.08)" : "rgba(30,41,59,0.4)",
              border: selected && !solved ? "1px solid #22d3ee44" : "1px solid #1e293b",
              borderRadius: 4,
              cursor: selected && !solved ? "pointer" : "not-allowed",
              fontSize: 15,
              fontWeight: 700,
              color: selected && !solved ? "#22d3ee" : "#334155",
              fontFamily: "inherit",
              opacity: selected && !solved ? 1 : 0.45,
              transition: "all 0.1s",
            }}
          >
            {n}
          </button>
        ))}
        {/* Clear button */}
        <button
          onClick={() => handleNumpad(0)}
          disabled={solved || !selected}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: selected && !solved ? "rgba(239,68,68,0.08)" : "rgba(30,41,59,0.4)",
            border: selected && !solved ? "1px solid #ef444444" : "1px solid #1e293b",
            borderRadius: 4,
            cursor: selected && !solved ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 700,
            color: selected && !solved ? "#ef4444" : "#334155",
            fontFamily: "inherit",
            opacity: selected && !solved ? 1 : 0.45,
            transition: "all 0.1s",
          }}
        >
          ×
        </button>
      </div>

      {/* Status + controls */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {solved && (
          <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700, letterSpacing: "0.1em" }}>
            SOLVED! CONSTRAINT SATISFIED
          </div>
        )}
        {!selected && !solved && (
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>
            CLICK A CELL TO SELECT
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setSelected(null);
            }}
            disabled={!selected || solved}
            style={{
              padding: "5px 12px",
              background: "rgba(71,85,105,0.15)",
              border: "1px solid #334155",
              borderRadius: 4,
              cursor: !selected || solved ? "not-allowed" : "pointer",
              fontSize: 9,
              color: "#64748b",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              opacity: !selected || solved ? 0.5 : 1,
            }}
          >
            DESELECT
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: "5px 12px",
              background: "rgba(71,85,105,0.15)",
              border: "1px solid #334155",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 9,
              color: "#64748b",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            NEW PUZZLE
          </button>
        </div>
      </div>
    </div>
    </GameShell>
  );
}
