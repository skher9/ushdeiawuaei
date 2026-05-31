"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const N = 5;
const CELL = 64;

const PUZZLES: [number, number][][] = [
  [[0,2],[1,4],[3,1],[4,3]],   // 4 blocked cells
  [[0,0],[2,2],[4,4],[1,3]],   // diagonal pattern
  [[0,4],[1,0],[3,3],[4,1]],   // symmetric
  [[2,0],[2,4],[0,2],[4,2]],   // cross pattern
  [[1,1],[1,3],[3,1],[3,3]],   // corners of inner 3x3
];

// Returns set of attacked cell keys for a queen at (r, c) — excludes own cell
function getAttacked(row: number, col: number, blocked: Set<string>): Set<string> {
  const attacked = new Set<string>();
  for (let i = 0; i < N; i++) {
    const rk = `${row},${i}`;
    const ck = `${i},${col}`;
    if (!blocked.has(rk)) attacked.add(rk);
    if (!blocked.has(ck)) attacked.add(ck);
  }
  for (let d = -(N - 1); d < N; d++) {
    const r1 = row + d, c1 = col + d; // main diagonal
    const r2 = row + d, c2 = col - d; // anti-diagonal
    if (r1 >= 0 && r1 < N && c1 >= 0 && c1 < N) {
      const k = `${r1},${c1}`;
      if (!blocked.has(k)) attacked.add(k);
    }
    if (r2 >= 0 && r2 < N && c2 >= 0 && c2 < N) {
      const k = `${r2},${c2}`;
      if (!blocked.has(k)) attacked.add(k);
    }
  }
  attacked.delete(`${row},${col}`);
  return attacked;
}

function isValid(queens: [number, number][]): boolean {
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const [r1, c1] = queens[i];
      const [r2, c2] = queens[j];
      if (r1 === r2 || c1 === c2) return false;
      if (Math.abs(r1 - r2) === Math.abs(c1 - c2)) return false;
    }
  }
  return true;
}

function getConflictingQueens(queens: [number, number][]): Set<string> {
  const conflicting = new Set<string>();
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const [r1, c1] = queens[i];
      const [r2, c2] = queens[j];
      if (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
        conflicting.add(`${r1},${c1}`);
        conflicting.add(`${r2},${c2}`);
      }
    }
  }
  return conflicting;
}

function pickPuzzle(exclude?: number): number {
  let idx = Math.floor(Math.random() * PUZZLES.length);
  if (exclude !== undefined && PUZZLES.length > 1) {
    while (idx === exclude) idx = Math.floor(Math.random() * PUZZLES.length);
  }
  return idx;
}

export default function BrokenPalace({ onSolve, onAttempt }: GameProps) {
  const [puzzleIdx, setPuzzleIdx] = useState<number>(() => pickPuzzle());
  const [queens, setQueens] = useState<[number, number][]>([]);
  const [backtracks, setBacktracks] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shakingCell, setShakingCell] = useState<string | null>(null);
  const solvedCalledRef = useRef(false);

  const blockedList = PUZZLES[puzzleIdx];
  const blockedSet = new Set(blockedList.map(([r, c]) => `${r},${c}`));

  // All attacked cells (union across all placed queens), never includes blocked cells
  const allAttacked = useCallback((): Set<string> => {
    const result = new Set<string>();
    for (const [r, c] of queens) {
      for (const k of getAttacked(r, c, blockedSet)) result.add(k);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queens, puzzleIdx]);

  const attackedCells = allAttacked();
  const conflictingQueens = getConflictingQueens(queens);
  const queenCells = new Set(queens.map(([r, c]) => `${r},${c}`));

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      const key = `${row},${col}`;

      // Blocked cell — ignore entirely
      if (blockedSet.has(key)) return;

      // Click on existing queen — remove it (backtrack)
      if (queenCells.has(key)) {
        setQueens((prev) => prev.filter(([r, c]) => !(r === row && c === col)));
        setBacktracks((b) => b + 1);
        return;
      }

      // Click on attacked cell — shake and reject
      if (attackedCells.has(key)) {
        setShakingCell(key);
        setTimeout(() => setShakingCell(null), 400);
        return;
      }

      // Place queen
      onAttempt();
      const next: [number, number][] = [...queens, [row, col]];
      setQueens(next);

      if (next.length === N && isValid(next)) {
        setSolved(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queens, attackedCells, queenCells, blockedSet, solved, onAttempt]
  );

  // Fire onSolve after a brief pulse delay
  useEffect(() => {
    if (solved && !solvedCalledRef.current) {
      solvedCalledRef.current = true;
      const t = setTimeout(() => onSolve(), 1200);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  const handleNewPuzzle = () => {
    const next = pickPuzzle(puzzleIdx);
    setPuzzleIdx(next);
    setQueens([]);
    setBacktracks(0);
    setSolved(false);
    solvedCalledRef.current = false;
    setShakingCell(null);
  };

  const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
  const mission = getMission("backtracking", 2);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [
    { label: "PLACED", value: `${queens.length}/${N}` },
    { label: "BACKTRACKS", value: backtracks, danger: backtracks > 4 },
  ];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        height: "100%", fontFamily: MONO, userSelect: "none",
        overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box",
      }}
    >

      {/* ── Board ── */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${N}, ${CELL}px)`,
          gridTemplateRows: `repeat(${N}, ${CELL}px)`,
          gap: 3,
          padding: 6,
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
        }}
      >
        {Array.from({ length: N }, (_, row) =>
          Array.from({ length: N }, (_, col) => {
            const key = `${row},${col}`;
            const hasQueen = queenCells.has(key);
            const isAttacked = attackedCells.has(key);
            const isConflicting = conflictingQueens.has(key);
            const isShaking = shakingCell === key;
            const isBlocked = blockedSet.has(key);

            let bg = "#111";
            let border = "1px solid #222";
            let boxShadow = "none";

            if (isBlocked) {
              bg = "#1a1a1a";
              border = "1px solid #2a2a2a";
            } else if (solved && hasQueen) {
              bg = "rgba(34,197,94,0.12)";
              border = "1px solid rgba(34,197,94,0.5)";
              boxShadow = "0 0 12px rgba(34,197,94,0.2)";
            } else if (isConflicting) {
              bg = "rgba(239,68,68,0.22)";
              border = "1px solid rgba(239,68,68,0.6)";
            } else if (hasQueen) {
              bg = "rgba(251,191,36,0.08)";
              border = "1px solid rgba(251,191,36,0.3)";
            } else if (isAttacked) {
              bg = "rgba(239,68,68,0.09)";
              border = "1px solid rgba(239,68,68,0.25)";
            }

            return (
              <Cell
                key={key}
                row={row}
                col={col}
                hasQueen={hasQueen}
                isAttacked={isAttacked}
                isConflicting={isConflicting}
                isSolved={solved}
                isShaking={isShaking}
                isBlocked={isBlocked}
                bg={bg}
                border={border}
                boxShadow={boxShadow}
                cellSize={CELL}
                onClick={handleCellClick}
              />
            );
          })
        )}
      </div>

      {/* ── Status bar ── */}
      <div
        style={{
          marginTop: 18,
          width: N * CELL + 18,
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
          QUEENS:{" "}
          <span style={{ color: "#64748b", fontWeight: 700 }}>
            {queens.length} / {N}
          </span>
        </span>
        <span>
          BACKTRACKS:{" "}
          <span
            style={{
              color: backtracks > 0 ? "#f97316" : "#475569",
              fontWeight: 700,
            }}
          >
            {backtracks}
          </span>
        </span>
        {queens.length > 0 && !solved && conflictingQueens.size > 0 && (
          <span style={{ color: "#ef4444" }}>CONFLICT</span>
        )}
        {solved && (
          <span style={{ color: "#22c55e", letterSpacing: "0.1em" }}>
            SOLVED ✓
          </span>
        )}
      </div>

      {/* ── Hint row ── */}
      {backtracks === 0 && queens.length >= 2 && !solved && (
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
            maxWidth: N * CELL + 18,
            width: "100%",
          }}
        >
          HIT A DEAD END? CLICK A ♛ TO REMOVE IT — THAT IS BACKTRACKING
        </div>
      )}

      {backtracks > 0 && !solved && (
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
            maxWidth: N * CELL + 18,
            width: "100%",
          }}
        >
          BACKTRACK #{backtracks} — UNDO THAT CHOICE AND TRY ANOTHER PATH
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
            maxWidth: N * CELL + 18,
            width: "100%",
            lineHeight: 1.8,
          }}
        >
          BOARD SOLVED IN {backtracks} BACKTRACK{backtracks !== 1 ? "S" : ""}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            BLOCKED CELLS PRUNED INVALID BRANCHES EARLY
          </span>
          <br />
          <button
            onClick={handleNewPuzzle}
            style={{
              marginTop: 10,
              padding: "6px 18px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 9,
              color: "#22c55e",
              fontFamily: MONO,
              letterSpacing: "0.1em",
            }}
          >
            [ NEW PUZZLE ]
          </button>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-5px); }
          40%  { transform: translateX(5px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        @keyframes queenPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.85; }
        }
        @keyframes solvedGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.25); }
          50%       { box-shadow: 0 0 22px rgba(34,197,94,0.55); }
        }
      `}</style>
    </div>
    </GameShell>
  );
}

// ── Cell sub-component ──────────────────────────────────────────────────────

interface CellProps {
  row: number;
  col: number;
  hasQueen: boolean;
  isAttacked: boolean;
  isConflicting: boolean;
  isSolved: boolean;
  isShaking: boolean;
  isBlocked: boolean;
  bg: string;
  border: string;
  boxShadow: string;
  cellSize: number;
  onClick: (r: number, c: number) => void;
}

function Cell({
  row,
  col,
  hasQueen,
  isAttacked,
  isConflicting,
  isSolved,
  isShaking,
  isBlocked,
  bg,
  border,
  boxShadow,
  cellSize,
  onClick,
}: CellProps) {
  const canPlace = !hasQueen && !isAttacked && !isBlocked;

  const animStyle: React.CSSProperties = isShaking
    ? { animation: "shake 0.35s ease" }
    : isSolved && hasQueen
    ? { animation: "solvedGlow 1.1s ease infinite, queenPulse 1.1s ease infinite" }
    : isConflicting
    ? { animation: "shake 0.6s ease infinite" }
    : {};

  return (
    <div
      onClick={() => onClick(row, col)}
      style={{
        width: cellSize,
        height: cellSize,
        background: bg,
        border,
        borderRadius: 4,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isBlocked
          ? "not-allowed"
          : hasQueen
          ? "pointer"
          : canPlace
          ? "pointer"
          : "not-allowed",
        transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
        position: "relative",
        boxShadow,
        ...animStyle,
      }}
    >
      {isBlocked && (
        <span
          style={{
            fontSize: Math.round(cellSize * 0.38),
            lineHeight: 1,
            color: "#374151",
            fontWeight: 700,
          }}
        >
          ✕
        </span>
      )}
      {!isBlocked && hasQueen && (
        <span
          style={{
            fontSize: Math.round(cellSize * 0.5),
            lineHeight: 1,
            color: isConflicting
              ? "#ef4444"
              : isSolved
              ? "#4ade80"
              : "#fbbf24",
            textShadow: isConflicting
              ? "0 0 10px rgba(239,68,68,0.5)"
              : isSolved
              ? "0 0 14px rgba(74,222,128,0.6)"
              : "0 0 10px rgba(251,191,36,0.4)",
            transition: "color 0.2s",
          }}
        >
          ♛
        </span>
      )}
      {!isBlocked && !hasQueen && isAttacked && (
        <span
          style={{
            fontSize: Math.round(cellSize * 0.22),
            color: "rgba(239,68,68,0.3)",
            lineHeight: 1,
          }}
        >
          ×
        </span>
      )}
    </div>
  );
}
