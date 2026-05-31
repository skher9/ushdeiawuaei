"use client";
// THE ESCAPE                [OPTIMAL: X steps · YOUR STEPS: Y]
// NAVIGATE TO THE EXIT — CLICK ADJACENT CELLS TO MOVE · BFS GUARANTEES SHORTEST PATH
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 10;
const COLS = 10;
const CELL_SIZE = 44;
const GAP = 2;

// true = open, false = wall
function generateMaze(): boolean[][] {
  while (true) {
    const maze: boolean[][] = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        // start and exit always open
        if (r === 0 && c === 0) return true;
        if (r === ROWS - 1 && c === COLS - 1) return true;
        return Math.random() > 0.25; // ~75% open
      })
    );

    // Verify path exists via BFS
    if (bfsDistance(maze, 0, 0, ROWS - 1, COLS - 1) !== -1) {
      return maze;
    }
    // else regenerate
  }
}

function bfsDistance(
  maze: boolean[][],
  sr: number,
  sc: number,
  er: number,
  ec: number
): number {
  if (!maze[sr][sc] || !maze[er][ec]) return -1;
  const dist: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(-1)
  );
  dist[sr][sc] = 0;
  const queue: [number, number][] = [[sr, sc]];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    if (r === er && c === ec) return dist[r][c];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < ROWS &&
        nc >= 0 &&
        nc < COLS &&
        maze[nr][nc] &&
        dist[nr][nc] === -1
      ) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return -1;
}

function initGame() {
  const maze = generateMaze();
  const optimal = bfsDistance(maze, 0, 0, ROWS - 1, COLS - 1);
  return { maze, optimal };
}

const GRID_WIDTH = COLS * CELL_SIZE + (COLS - 1) * GAP;

export default function TheEscape({ onSolve, onAttempt }: GameProps) {
  const [{ maze, optimal }, setGame] = useState(() => initGame());
  // visited: set of "r,c" strings for trail
  const [visited, setVisited] = useState<Set<string>>(() => new Set(["0,0"]));
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 0]);
  const [steps, setSteps] = useState(0);
  const [escaped, setEscaped] = useState(false);

  const attemptedRef = useRef(false);
  const solvedRef = useRef(false);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (escaped) return;
      if (!maze[r][c]) return; // wall

      const [pr, pc] = playerPos;
      // Must be 4-directionally adjacent
      const dr = Math.abs(r - pr);
      const dc = Math.abs(c - pc);
      if (dr + dc !== 1) return; // not adjacent

      // Fire onAttempt on first move
      if (!attemptedRef.current) {
        attemptedRef.current = true;
        onAttempt();
      }

      const newSteps = steps + 1;
      const newPos: [number, number] = [r, c];
      const newVisited = new Set(visited);
      newVisited.add(`${r},${c}`);

      setPlayerPos(newPos);
      setSteps(newSteps);
      setVisited(newVisited);

      // Check exit
      if (r === ROWS - 1 && c === COLS - 1) {
        setEscaped(true);
        if (!solvedRef.current) {
          solvedRef.current = true;
          onSolve();
        }
      }
    },
    [escaped, maze, playerPos, steps, visited, onAttempt, onSolve]
  );

  function newMaze() {
    const game = initGame();
    setGame(game);
    setVisited(new Set(["0,0"]));
    setPlayerPos([0, 0]);
    setSteps(0);
    setEscaped(false);
    attemptedRef.current = false;
    solvedRef.current = false;
  }

  function renderCell(r: number, c: number) {
    const isOpen = maze[r][c];
    const isPlayer = playerPos[0] === r && playerPos[1] === c;
    const isExit = r === ROWS - 1 && c === COLS - 1;
    const isTrail = visited.has(`${r},${c}`) && !isPlayer;

    // Is this cell adjacent to player and movable?
    const [pr, pc] = playerPos;
    const adjacent =
      !escaped &&
      isOpen &&
      !isPlayer &&
      Math.abs(r - pr) + Math.abs(c - pc) === 1;

    let bg: string;
    let border: string;
    let cursor: string;
    let content: React.ReactNode = null;

    if (!isOpen) {
      bg = "#0d1117";
      border = "1px solid #161b22";
      cursor = "default";
    } else if (isPlayer) {
      bg = "#3b82f6";
      border = "1px solid #60a5fa";
      cursor = "default";
      content = <span style={{ fontSize: 16, lineHeight: 1 }}>◉</span>;
    } else if (isExit) {
      bg = "#22c55e";
      border = "1px solid #4ade80";
      cursor = escaped ? "default" : "pointer";
      content = <span style={{ fontSize: 16, lineHeight: 1 }}>▣</span>;
    } else if (isTrail) {
      bg = "#1a2a1a";
      border = adjacent ? "1px solid #2a2a4a" : "1px solid #1a2a1a";
      cursor = adjacent ? "pointer" : "default";
    } else {
      // open, unvisited
      bg = "#111827";
      border = adjacent ? "1px solid #2a2a4a" : "1px solid #111827";
      cursor = adjacent ? "pointer" : "default";
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
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor,
          userSelect: "none",
          transition: "background 0.1s ease-out, border-color 0.1s ease-out",
          flexShrink: 0,
          color: "#ffffff",
        }}
      >
        {content}
      </div>
    );
  }

  const isPerfect = escaped && steps === optimal;

  const mission = getMission("graphs", 3);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "OPTIMAL", value: optimal }, { label: "STEPS", value: steps }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Step counter row */}
      <div
        style={{
          width: "100%",
          maxWidth: GRID_WIDTH,
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
            letterSpacing: "0.07em",
          }}
        >
          OPTIMAL:{" "}
          <span style={{ color: "#22c55e" }}>{optimal}</span>
          {" "}steps
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: steps > optimal ? "#f97316" : steps > 0 ? "#e2e8f0" : "#374151",
            letterSpacing: "0.07em",
          }}
        >
          YOUR STEPS:{" "}
          <span style={{ color: steps === optimal && steps > 0 ? "#22c55e" : "inherit" }}>
            {steps}
          </span>
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
          outline: escaped
            ? isPerfect
              ? "2px solid rgba(34,197,94,0.4)"
              : "2px solid rgba(249,115,22,0.4)"
            : "none",
          borderRadius: 4,
          transition: "outline 0.3s",
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => renderCell(r, c))
        )}
      </div>

      {/* Result message */}
      {escaped && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: isPerfect ? "#22c55e" : "#f97316",
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {isPerfect
              ? "PERFECT — YOU FOUND THE BFS OPTIMAL PATH!"
              : `ESCAPED IN ${steps} STEPS · OPTIMAL WAS ${optimal}`}
          </div>
          <button
            onClick={newMaze}
            style={{
              padding: "8px 24px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${isPerfect ? "rgba(34,197,94,0.4)" : "rgba(249,115,22,0.4)"}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: isPerfect ? "#22c55e" : "#f97316",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
          >
            [ NEW MAZE ]
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          width: "100%",
          maxWidth: GRID_WIDTH,
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid #111",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 8,
            color: "#1f2937",
            letterSpacing: "0.06em",
            lineHeight: 2,
          }}
        >
          BFS FINDS SHORTEST PATH · CLICK 4-ADJACENT OPEN CELLS TO MOVE
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          {[
            { bg: "#3b82f6", label: "PLAYER ◉" },
            { bg: "#22c55e", label: "EXIT ▣" },
            { bg: "#111827", label: "OPEN" },
            { bg: "#1a2a1a", label: "TRAIL" },
            { bg: "#0d1117", label: "WALL █" },
          ].map(({ bg, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: bg,
                  border: "1px solid #2a2a2a",
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 8, color: "#1f2937" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
