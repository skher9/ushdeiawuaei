"use client";
// WALLS AND GATES — LC 286 · Multi-source BFS wave stepping
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 8;
const COLS = 8;
const CELL_SIZE = 52;
const GAP = 3;
const INF = 999;

type CellType = "wall" | "gate" | "empty";

// Generate a fixed-seed-like but random grid each call
function generateGrid(): { types: CellType[][]; dist: number[][] } {
  const types: CellType[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): CellType => "empty")
  );
  const dist: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(INF)
  );

  // Place 3 gates — avoid the 4 corners
  const gatePositions: [number, number][] = [];
  const forbidden = new Set<string>(["0,0", `0,${COLS - 1}`, `${ROWS - 1},0`, `${ROWS - 1},${COLS - 1}`]);
  let attempts = 0;
  while (gatePositions.length < 3 && attempts < 200) {
    attempts++;
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const key = `${r},${c}`;
    if (!forbidden.has(key)) {
      forbidden.add(key);
      gatePositions.push([r, c]);
      types[r][c] = "gate";
      dist[r][c] = 0;
    }
  }

  // Scatter walls at ~18% of remaining cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (types[r][c] === "empty" && Math.random() < 0.18) {
        types[r][c] = "wall";
        dist[r][c] = -1; // sentinel
      }
    }
  }

  return { types, dist };
}

// Compute full BFS and return each wave as array of [r,c] with their distance
function computeBfsWaves(
  types: CellType[][],
  initialDist: number[][]
): { waves: Array<Array<[number, number]>>; finalDist: number[][] } {
  const dist = initialDist.map((row) => [...row]);
  const waves: Array<Array<[number, number]>> = [];

  // Seed queue with all gates
  let queue: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (types[r][c] === "gate") queue.push([r, c]);

  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const nextQueue: [number, number][] = [];
    const waveCells: [number, number][] = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < ROWS &&
          nc >= 0 && nc < COLS &&
          types[nr][nc] === "empty" &&
          dist[nr][nc] === INF
        ) {
          dist[nr][nc] = dist[r][c] + 1;
          nextQueue.push([nr, nc]);
          waveCells.push([nr, nc]);
        }
      }
    }
    if (waveCells.length > 0) waves.push(waveCells);
    queue = nextQueue;
  }

  return { waves, finalDist: dist };
}

function getDistColor(d: number): { bg: string; text: string } {
  if (d === 1) return { bg: "#14532d", text: "#22c55e" };
  if (d === 2) return { bg: "#1a4a1a", text: "#16a34a" };
  if (d === 3 || d === 4) return { bg: "#1a3a1a", text: "#15803d" };
  return { bg: "#1a2a1a", text: "#166534" };
}

export default function WallsAndGates({ onSolve, onAttempt }: GameProps) {
  // Grid data (stable across interactions)
  const [types, setTypes] = useState<CellType[][]>(() => generateGrid().types);
  const [finalDist, setFinalDist] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(INF))
  );
  const [waves, setWaves] = useState<Array<Array<[number, number]>>>([]);

  // BFS state
  const [currentWave, setCurrentWave] = useState(0); // how many waves have been applied
  const [visibleDist, setVisibleDist] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(INF))
  );
  const [frontier, setFrontier] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState(false);
  const [started, setStarted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [pulseGreen, setPulseGreen] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);

  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const autoRef = useRef(false);

  // Compute initial gate distances and BFS waves on mount/restart
  const initGrid = useCallback(() => {
    const { types: t, dist: initDist } = generateGrid();
    const { waves: w, finalDist: fd } = computeBfsWaves(t, initDist);
    setTypes(t);
    setFinalDist(fd);
    setWaves(w);
    setCurrentWave(0);
    const blank = Array.from({ length: ROWS }, () => Array(COLS).fill(INF));
    // Pre-fill gates with 0 in visibleDist
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (t[r][c] === "gate") blank[r][c] = 0;
    setVisibleDist(blank);
    setFrontier(new Set());
    setAnimating(false);
    setStarted(false);
    setSolved(false);
    setPulseGreen(false);
    setAutoRunning(false);
    solvedRef.current = false;
    attemptedRef.current = false;
    autoRef.current = false;
  }, []);

  useEffect(() => {
    initGrid();
  }, [initGrid]);

  const applyNextWave = useCallback(
    (
      waveIdx: number,
      wavesArr: Array<Array<[number, number]>>,
      fd: number[][],
      vd: number[][]
    ): { newVd: number[][]; newFrontier: Set<string>; done: boolean } => {
      if (waveIdx >= wavesArr.length) {
        return { newVd: vd, newFrontier: new Set(), done: true };
      }
      const cells = wavesArr[waveIdx];
      const newVd = vd.map((row) => [...row]);
      const newFrontier = new Set<string>();
      for (const [r, c] of cells) {
        newVd[r][c] = fd[r][c];
        newFrontier.add(`${r},${c}`);
      }
      const done = waveIdx + 1 >= wavesArr.length;
      return { newVd, newFrontier: done ? new Set() : newFrontier, done };
    },
    []
  );

  const stepWave = useCallback(() => {
    if (animating || solved) return;

    if (!attemptedRef.current) {
      attemptedRef.current = true;
      onAttempt();
    }
    if (!started) setStarted(true);

    setAnimating(true);

    const { newVd, newFrontier, done } = applyNextWave(
      currentWave,
      waves,
      finalDist,
      visibleDist
    );

    // Remove old frontier highlight after a moment then set new state
    setFrontier(new Set()); // clear old
    setTimeout(() => {
      setVisibleDist(newVd);
      setFrontier(newFrontier);
      setCurrentWave((w) => w + 1);
      setAnimating(false);

      if (done && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        setPulseGreen(true);
        setTimeout(() => onSolve(), 600);
      }
    }, 120);
  }, [
    animating,
    solved,
    started,
    currentWave,
    waves,
    finalDist,
    visibleDist,
    applyNextWave,
    onAttempt,
    onSolve,
  ]);

  // Auto-run: step every 400ms
  const runAuto = useCallback(() => {
    if (solved || autoRunning) return;
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      onAttempt();
    }
    if (!started) setStarted(true);
    setAutoRunning(true);
    autoRef.current = true;
  }, [solved, autoRunning, started, onAttempt]);

  // Drive auto-run via effect
  useEffect(() => {
    if (!autoRunning || solved) return;

    const id = setTimeout(() => {
      if (!autoRef.current) return;
      if (currentWave >= waves.length) {
        setAutoRunning(false);
        autoRef.current = false;
        return;
      }
      const { newVd, newFrontier, done } = applyNextWave(
        currentWave,
        waves,
        finalDist,
        visibleDist
      );
      setFrontier(new Set());
      setTimeout(() => {
        setVisibleDist(newVd);
        setFrontier(newFrontier);
        setCurrentWave((w) => w + 1);

        if (done && !solvedRef.current) {
          solvedRef.current = true;
          setSolved(true);
          setPulseGreen(true);
          setAutoRunning(false);
          autoRef.current = false;
          setTimeout(() => onSolve(), 600);
        }
      }, 100);
    }, 380);

    return () => clearTimeout(id);
  }, [autoRunning, solved, currentWave, waves, finalDist, visibleDist, applyNextWave, onSolve]);

  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;
  const totalEmpty = types.flat().filter((t) => t === "empty").length;
  const reachedCount = Object.values(
    visibleDist.flat().filter((d, i) => types.flat()[i] === "empty" && d !== INF)
  ).length;
  // Count reachable empty cells
  const reachableCount = finalDist.flat().filter((d, i) => types.flat()[i] === "empty" && d !== INF).length;

  function renderCell(r: number, c: number) {
    const cellType = types[r][c];
    const d = visibleDist[r][c];
    const isFrontier = frontier.has(`${r},${c}`);

    if (cellType === "wall") {
      return (
        <div
          key={`${r},${c}`}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: "#0d1117",
            border: "1px solid #131820",
            borderRadius: 3,
            flexShrink: 0,
          }}
        />
      );
    }

    if (cellType === "gate") {
      return (
        <div
          key={`${r},${c}`}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: "#0d2a0d",
            border: "2px solid #22c55e",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>🚪</span>
          <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, letterSpacing: "0.05em" }}>0</span>
        </div>
      );
    }

    // Empty cell
    if (d === INF) {
      return (
        <div
          key={`${r},${c}`}
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            background: "#111",
            border: isFrontier ? "2px solid #eab308" : "1px solid #1e1e1e",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: isFrontier ? "0 0 6px rgba(234,179,8,0.5)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <span style={{ fontSize: 13, color: "#2a2a2a", fontWeight: 700 }}>∞</span>
        </div>
      );
    }

    // Reached cell
    const { bg, text } = getDistColor(d);
    return (
      <div
        key={`${r},${c}`}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          background: bg,
          border: isFrontier ? "2px solid #eab308" : `1px solid ${text}44`,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: isFrontier ? "0 0 8px rgba(234,179,8,0.6)" : "none",
          transition: "background 0.18s ease-out, border-color 0.18s, box-shadow 0.18s",
        }}
      >
        <span style={{ fontSize: 14, color: text, fontWeight: 700, letterSpacing: "0.02em" }}>
          {d}
        </span>
      </div>
    );
  }

  const wavesDone = waves.length > 0 && currentWave >= waves.length;
  const noWaves = waves.length === 0; // all empty cells unreachable (edge case)

  const mission = getMission("graphs", 5);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "WAVE", value: `${currentWave}/${waves.length}` }];

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
            fontSize: 12,
            fontWeight: 700,
            color: pulseGreen ? "#22c55e" : "#e2e8f0",
            letterSpacing: "0.08em",
            transition: "color 0.3s",
          }}
        >
          WAVE: {currentWave} {waves.length > 0 ? `/ ${waves.length}` : ""}
        </span>
        <span
          style={{
            fontSize: 10,
            color: animating || autoRunning
              ? "#eab308"
              : solved
              ? "#22c55e"
              : "#374151",
            letterSpacing: "0.06em",
          }}
        >
          {!started && "PRESS NEXT WAVE TO BEGIN"}
          {started && !solved && (autoRunning ? "AUTO RUNNING..." : animating ? "EXPANDING..." : "READY")}
          {solved && "BFS COMPLETE ✓"}
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
          outline: pulseGreen ? "2px solid rgba(34,197,94,0.35)" : "none",
          borderRadius: 4,
          transition: "outline 0.3s",
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => renderCell(r, c))
        )}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <button
          onClick={stepWave}
          disabled={animating || solved || wavesDone || noWaves || autoRunning}
          style={{
            padding: "9px 20px",
            background:
              animating || solved || wavesDone || noWaves || autoRunning
                ? "rgba(255,255,255,0.02)"
                : "rgba(234,179,8,0.08)",
            border:
              animating || solved || wavesDone || noWaves || autoRunning
                ? "1px solid #1f2937"
                : "1px solid rgba(234,179,8,0.5)",
            borderRadius: 4,
            cursor:
              animating || solved || wavesDone || noWaves || autoRunning
                ? "not-allowed"
                : "pointer",
            fontSize: 11,
            color:
              animating || solved || wavesDone || noWaves || autoRunning
                ? "#374151"
                : "#eab308",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
        >
          NEXT WAVE
        </button>

        <button
          onClick={runAuto}
          disabled={solved || autoRunning || wavesDone || noWaves}
          style={{
            padding: "9px 20px",
            background:
              solved || autoRunning || wavesDone || noWaves
                ? "rgba(255,255,255,0.02)"
                : "rgba(59,130,246,0.08)",
            border:
              solved || autoRunning || wavesDone || noWaves
                ? "1px solid #1f2937"
                : "1px solid rgba(59,130,246,0.4)",
            borderRadius: 4,
            cursor:
              solved || autoRunning || wavesDone || noWaves ? "not-allowed" : "pointer",
            fontSize: 11,
            color:
              solved || autoRunning || wavesDone || noWaves ? "#374151" : "#3b82f6",
            fontFamily: "inherit",
            letterSpacing: "0.1em",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
        >
          AUTO
        </button>

        <button
          onClick={initGrid}
          style={{
            padding: "9px 20px",
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
          RESET
        </button>
      </div>

      {/* Solved message */}
      {solved && (
        <div
          style={{
            fontSize: 11,
            color: "#22c55e",
            letterSpacing: "0.08em",
            textAlign: "center",
            lineHeight: 1.7,
            flexShrink: 0,
          }}
        >
          {reachableCount} ROOMS FILLED — MULTI-SOURCE BFS FROM {types.flat().filter((t) => t === "gate").length} GATES
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
            letterSpacing: "0.05em",
            lineHeight: 2,
          }}
        >
          MULTI-SOURCE BFS: all gates enqueue simultaneously · each wave = cells 1 step further · walls block propagation
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          {[
            { bg: "#0d2a0d", border: "#22c55e", label: "GATE (0)" },
            { bg: "#0d1117", border: "#131820", label: "WALL" },
            { bg: "#111", border: "#1e1e1e", label: "UNDISCOVERED" },
            { bg: "#14532d", border: "#22c55e", label: "DIST 1" },
            { bg: "#1a3a1a", border: "#15803d", label: "DIST 3+" },
          ].map(({ bg, border, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 8, color: "#1f2937" }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 10,
                height: 10,
                background: "#111",
                border: "1px solid #eab308",
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 8, color: "#1f2937" }}>FRONTIER</span>
          </div>
        </div>
      </div>
    </div>
    </GameShell>
  );
}
