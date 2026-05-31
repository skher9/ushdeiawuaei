"use client";
// ISLAND COUNT                   [ISLANDS FOUND: X / Y]
// MARK ALL ISLANDS — CLICK ANY LAND CELL TO DFS-FLOOD THE ISLAND · WATER CELLS ARE IMPASSABLE
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 8;
const COLS = 8;
const CELL_SIZE = 44;
const GAP = 2;

const ISLAND_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#ef4444",
];

// Generate grid with ~35% land density + 1 pass of cellular automaton smoothing
function generateGrid(): boolean[][] {
  // Initial random pass
  const raw: boolean[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.random() < 0.35)
  );

  // One pass of cellular automaton: cell becomes land if ≥3 of 4-neighbors are land, stays water if ≤1
  const smoothed: boolean[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      const neighbors4 = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      const landNeighbors = neighbors4.filter(
        ([nr, nc]) =>
          nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && raw[nr][nc]
      ).length;
      if (raw[r][c]) {
        // Land: stay land unless very isolated
        return landNeighbors >= 1;
      } else {
        // Water: become land if surrounded by enough land
        return landNeighbors >= 3;
      }
    })
  );

  return smoothed;
}

// Count actual islands in a grid using DFS (to compute totalIslands)
function countIslands(grid: boolean[][]): number {
  const visited = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => false)
  );
  let count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && !visited[r][c]) {
        count++;
        // DFS
        const stack: [number, number][] = [[r, c]];
        while (stack.length > 0) {
          const [cr, cc] = stack.pop()!;
          if (visited[cr][cc]) continue;
          visited[cr][cc] = true;
          for (const [dr, dc] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (
              nr >= 0 &&
              nr < ROWS &&
              nc >= 0 &&
              nc < COLS &&
              grid[nr][nc] &&
              !visited[nr][nc]
            ) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  return count;
}

// Count total land cells
function countLand(grid: boolean[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c]) n++;
  return n;
}

// BFS from (startR, startC) — returns levels array for animation
function bfsIsland(
  grid: boolean[][],
  visited: number[][],
  startR: number,
  startC: number
): [number, number][][] {
  const levels: [number, number][][] = [];
  let queue: [number, number][] = [[startR, startC]];
  const inQueue = new Set<string>();
  inQueue.add(`${startR},${startC}`);

  while (queue.length > 0) {
    levels.push([...queue]);
    const next: [number, number][] = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 &&
          nr < ROWS &&
          nc >= 0 &&
          nc < COLS &&
          grid[nr][nc] &&
          visited[nr][nc] === 0 &&
          !inQueue.has(key)
        ) {
          inQueue.add(key);
          next.push([nr, nc]);
        }
      }
    }
    queue = next;
  }

  return levels;
}

function makeVisited(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function initState() {
  const grid = generateGrid();
  const total = countIslands(grid);
  return { grid, total };
}

export default function IslandCount({ onSolve, onAttempt }: GameProps) {
  const [grid, setGrid] = useState<boolean[][]>(() => generateGrid());
  const [visited, setVisited] = useState<number[][]>(() => makeVisited());
  const [islandCount, setIslandCount] = useState(0);
  const [totalIslands, setTotalIslands] = useState(() => {
    // will be recomputed on first render via effect
    return 0;
  });
  const [totalLand, setTotalLand] = useState(0);
  const [visitedLandCount, setVisitedLandCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [solved, setSolved] = useState(false);
  const [pulseGreen, setPulseGreen] = useState(false);

  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Initialize totalIslands and totalLand when grid changes
  useEffect(() => {
    setTotalIslands(countIslands(grid));
    setTotalLand(countLand(grid));
  }, [grid]);

  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;

  function restartGame() {
    const newGrid = generateGrid();
    setGrid(newGrid);
    setVisited(makeVisited());
    setIslandCount(0);
    setTotalIslands(countIslands(newGrid));
    setTotalLand(countLand(newGrid));
    setVisitedLandCount(0);
    setAnimating(false);
    setSolved(false);
    setPulseGreen(false);
    solvedRef.current = false;
    attemptedRef.current = false;
  }

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (animating || solved) return;
      if (!grid[r][c]) return; // water
      if (visited[r][c] !== 0) return; // already visited

      if (!attemptedRef.current) {
        attemptedRef.current = true;
        onAttempt();
      }

      setAnimating(true);

      const islandNum = islandCount + 1;
      const levels = bfsIsland(grid, visited, r, c);

      // Flatten all cells in this island
      const allCells: [number, number][] = levels.flat();

      // Apply all BFS cells to visited state immediately, then animate reveal
      setVisited((prev) => {
        const next = prev.map((row) => [...row]);
        for (const [cr, cc] of allCells) {
          next[cr][cc] = islandNum;
        }
        return next;
      });

      const newVisitedCount = visitedLandCount + allCells.length;
      setIslandCount(islandNum);

      // Stagger visual transitions: each BFS level appears 60ms after the previous
      levels.forEach((level, levelIdx) => {
        const delay = levelIdx * 60;
        setTimeout(() => {
          // Touch state to trigger re-render so CSS transitions apply per level
          setVisited((prev) => prev.map((row) => [...row]));
        }, delay);
      });

      const totalDelay = (levels.length - 1) * 60 + 100;

      setTimeout(() => {
        setAnimating(false);
        setVisitedLandCount(newVisitedCount);

        if (newVisitedCount >= totalLand && !solvedRef.current) {
          solvedRef.current = true;
          setSolved(true);
          setPulseGreen(true);
          setTimeout(() => {
            onSolve();
          }, 800);
        }
      }, totalDelay);
    },
    [
      animating,
      solved,
      grid,
      visited,
      islandCount,
      visitedLandCount,
      totalLand,
      onAttempt,
      onSolve,
    ]
  );

  function renderCell(r: number, c: number) {
    const isLand = grid[r][c];
    const islandNum = visited[r][c];
    const isVisited = islandNum > 0;

    let bg: string;
    let border: string;
    let cursor: string;
    let content: React.ReactNode = null;
    let color = "#e2e8f0";

    if (!isLand) {
      // Water
      bg = "#0d1117";
      border = "1px solid #0d1f2d";
      cursor = "default";
    } else if (!isVisited) {
      // Unvisited land
      bg = "#1a3a1a";
      border = "1px solid #2a5a2a";
      cursor = animating || solved ? "default" : "pointer";
    } else {
      // Visited land — color by island number
      const colorIdx = (islandNum - 1) % ISLAND_COLORS.length;
      bg = ISLAND_COLORS[colorIdx];
      border = `1px solid ${ISLAND_COLORS[colorIdx]}`;
      cursor = "default";
      color = "#0a0a0a";
      content = islandNum;
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
          fontSize: 11,
          fontWeight: 700,
          color,
          userSelect: "none",
          transition: "background 0.15s ease-out, border-color 0.15s ease-out",
          flexShrink: 0,
        }}
      >
        {content}
      </div>
    );
  }

  const allFound = totalIslands > 0 && islandCount === totalIslands;

  const mission = getMission("graphs", 2);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "FOUND", value: `${islandCount}/${totalIslands}` }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Counter row */}
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
            fontSize: 12,
            fontWeight: 700,
            color: pulseGreen ? "#22c55e" : "#e2e8f0",
            letterSpacing: "0.08em",
            transition: "color 0.3s",
          }}
        >
          ISLANDS FOUND: {islandCount} / {totalIslands}
        </span>
        <span
          style={{
            fontSize: 10,
            color: animating
              ? "#eab308"
              : solved
              ? "#22c55e"
              : "#374151",
            letterSpacing: "0.06em",
          }}
        >
          {animating && "FLOODING..."}
          {!animating && !solved && islandCount === 0 && "CLICK A LAND CELL"}
          {!animating && !solved && islandCount > 0 && islandCount < totalIslands && "FIND MORE ISLANDS"}
          {!animating && solved && "ALL ISLANDS MARKED ✓"}
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

      {/* Win message + restart */}
      {solved && (
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
              color: "#22c55e",
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {totalIslands} ISLAND{totalIslands !== 1 ? "S" : ""} FOUND — DFS FLOOD FILL COMPLETE
          </div>
          <button
            onClick={restartGame}
            style={{
              padding: "8px 24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: "#22c55e",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
          >
            [ PLAY AGAIN ]
          </button>
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
        <div
          style={{
            fontSize: 8,
            color: "#1f2937",
            letterSpacing: "0.06em",
            lineHeight: 2,
          }}
        >
          DFS FLOOD: click unvisited land → DFS visits all 4-connected land cells
          · each island gets a unique color + number · water blocks traversal
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 4,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: "#0d1117",
                border: "1px solid #0d1f2d",
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 8, color: "#1f2937" }}>WATER</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: "#1a3a1a",
                border: "1px solid #2a5a2a",
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 8, color: "#1f2937" }}>UNVISITED LAND</span>
          </div>
          {ISLAND_COLORS.slice(0, 4).map((col, i) => (
            <div key={col} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: col,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 8, color: "#1f2937" }}>
                ISLAND {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
