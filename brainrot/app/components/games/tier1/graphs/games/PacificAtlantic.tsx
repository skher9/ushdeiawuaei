"use client";
// PACIFIC ATLANTIC
// DFS UPHILL FROM BOTH OCEANS — CELLS IN BOTH SETS DRAIN TO BOTH · REVERSE FLOW = CLEANER SOLUTION
import { useState, useRef, useCallback } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const ROWS = 8;
const COLS = 8;
const CELL_SIZE = 50;
const GAP = 2;
const STAGGER_MS = 40;

// ─── helpers ────────────────────────────────────────────────────────────────

function makeHeights(): number[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.floor(Math.random() * 9) + 1)
  );
}

// DFS uphill from a set of border cells.
// Returns cells in DFS visit order (for animation).
function dfsFromBorder(
  heights: number[][],
  startCells: [number, number][]
): [number, number][] {
  const visited = new Set<string>();
  const order: [number, number][] = [];

  const stack: [number, number][] = [];
  for (const [r, c] of startCells) {
    const key = `${r},${c}`;
    if (!visited.has(key)) {
      visited.add(key);
      stack.push([r, c]);
      order.push([r, c]);
    }
  }

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      // uphill: neighbor height must be >= current height
      if (heights[nr][nc] >= heights[r][c]) {
        visited.add(key);
        stack.push([nr, nc]);
        order.push([nr, nc]);
      }
    }
  }

  return order;
}

// Pacific borders: top row + left column
function pacificStarts(): [number, number][] {
  const starts: [number, number][] = [];
  for (let c = 0; c < COLS; c++) starts.push([0, c]);
  for (let r = 1; r < ROWS; r++) starts.push([r, 0]);
  return starts;
}

// Atlantic borders: bottom row + right column
function atlanticStarts(): [number, number][] {
  const starts: [number, number][] = [];
  for (let c = 0; c < COLS; c++) starts.push([ROWS - 1, c]);
  for (let r = 0; r < ROWS - 1; r++) starts.push([r, COLS - 1]);
  return starts;
}

function isPacificBorder(r: number, c: number): boolean {
  return r === 0 || c === 0;
}

function isAtlanticBorder(r: number, c: number): boolean {
  return r === ROWS - 1 || c === COLS - 1;
}

// ─── types ───────────────────────────────────────────────────────────────────

type Phase =
  | "IDLE"
  | "PACIFIC_RUNNING"
  | "PACIFIC_DONE"
  | "ATLANTIC_RUNNING"
  | "ATLANTIC_DONE"
  | "BOTH_DONE"
  | "CONFIRMED";

// ─── component ───────────────────────────────────────────────────────────────

export default function PacificAtlantic({ onSolve, onAttempt }: GameProps) {
  const [heights] = useState<number[][]>(() => makeHeights());
  const [phase, setPhase] = useState<Phase>("IDLE");

  // Sets of revealed cells per ocean (accumulated during animation)
  const [pacificRevealed, setPacificRevealed] = useState<Set<string>>(
    () => new Set()
  );
  const [atlanticRevealed, setAtlanticRevealed] = useState<Set<string>>(
    () => new Set()
  );

  const attemptedRef = useRef(false);
  const solvedRef = useRef(false);

  const gridWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;

  // ── animation helper ──────────────────────────────────────────────────────

  const animateCells = useCallback(
    (
      cells: [number, number][],
      setter: React.Dispatch<React.SetStateAction<Set<string>>>,
      onDone: () => void
    ) => {
      cells.forEach(([r, c], i) => {
        setTimeout(() => {
          setter((prev) => {
            const next = new Set(prev);
            next.add(`${r},${c}`);
            return next;
          });
          if (i === cells.length - 1) {
            setTimeout(onDone, 80);
          }
        }, i * STAGGER_MS);
      });
    },
    []
  );

  // ── handlers ──────────────────────────────────────────────────────────────

  function runPacificDFS() {
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      onAttempt();
    }
    setPhase("PACIFIC_RUNNING");
    const cells = dfsFromBorder(heights, pacificStarts());
    animateCells(cells, setPacificRevealed, () => {
      setPhase((prev) =>
        prev === "PACIFIC_RUNNING"
          ? "PACIFIC_DONE"
          : // Atlantic might already be done
            "BOTH_DONE"
      );
    });
  }

  function runAtlanticDFS() {
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      onAttempt();
    }
    setPhase((prev) =>
      prev === "IDLE" || prev === "PACIFIC_DONE" ? "ATLANTIC_RUNNING" : prev
    );
    const cells = dfsFromBorder(heights, atlanticStarts());
    animateCells(cells, setAtlanticRevealed, () => {
      setPhase("BOTH_DONE");
    });
  }

  function handleConfirm() {
    if (solvedRef.current) return;
    solvedRef.current = true;
    setPhase("CONFIRMED");
    onSolve();
  }

  // ── derived state ─────────────────────────────────────────────────────────

  const pacificDone =
    phase === "PACIFIC_DONE" ||
    phase === "ATLANTIC_RUNNING" ||
    phase === "ATLANTIC_DONE" ||
    phase === "BOTH_DONE" ||
    phase === "CONFIRMED";

  const atlanticDone =
    phase === "ATLANTIC_DONE" ||
    phase === "BOTH_DONE" ||
    phase === "CONFIRMED";

  const bothDone = phase === "BOTH_DONE" || phase === "CONFIRMED";
  const confirmed = phase === "CONFIRMED";

  const pacificRunning = phase === "PACIFIC_RUNNING";
  const atlanticRunning = phase === "ATLANTIC_RUNNING";
  const anyRunning = pacificRunning || atlanticRunning;

  // ── cell color logic ──────────────────────────────────────────────────────

  function getCellStyle(r: number, c: number): React.CSSProperties {
    const key = `${r},${c}`;
    const inPacific = pacificRevealed.has(key);
    const inAtlantic = atlanticRevealed.has(key);
    const inBoth = inPacific && inAtlantic;

    const isBorderPac = isPacificBorder(r, c);
    const isBorderAtl = isAtlanticBorder(r, c);

    let bg = "#111827";
    let border = "1px solid #1f2937";
    let color = "#e2e8f0";
    let fontWeight: React.CSSProperties["fontWeight"] = 400;

    if (inBoth) {
      bg = "#2d2200";
      border = "1px solid #eab308";
      color = "#eab308";
      fontWeight = 700;
    } else if (inPacific) {
      bg = "#0c1f3f";
      border = "1px solid #3b82f6";
      color = "#93c5fd";
    } else if (inAtlantic) {
      bg = "#2d1500";
      border = "1px solid #f97316";
      color = "#fdba74";
    } else if (isBorderPac && isBorderAtl) {
      // Corner cells (top-right is Atlantic, bottom-left is Pacific, etc — handled above in border logic)
      // top-left is Pacific only, bottom-right is Atlantic only
      bg = "#111827";
      border = "1px solid #4b5563";
    } else if (isBorderPac) {
      // Pacific border glow
      bg = "#0a1929";
      border = "1px solid #1d4ed8";
    } else if (isBorderAtl) {
      // Atlantic border glow
      bg = "#1c0f00";
      border = "1px solid #c2410c";
    }

    return {
      width: CELL_SIZE,
      height: CELL_SIZE,
      background: bg,
      border,
      borderRadius: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight,
      color,
      userSelect: "none",
      transition: "background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out",
      flexShrink: 0,
      position: "relative",
    } as React.CSSProperties;
  }

  // ── status text ───────────────────────────────────────────────────────────

  function getStatusText(): { text: string; color: string } {
    if (phase === "IDLE")
      return { text: "RUN BOTH DFS TO FIND ANSWER", color: "#374151" };
    if (phase === "PACIFIC_RUNNING")
      return { text: "RUNNING PACIFIC DFS...", color: "#3b82f6" };
    if (phase === "PACIFIC_DONE")
      return { text: "PACIFIC DONE — NOW RUN ATLANTIC", color: "#60a5fa" };
    if (phase === "ATLANTIC_RUNNING")
      return { text: "RUNNING ATLANTIC DFS...", color: "#f97316" };
    if (phase === "BOTH_DONE")
      return { text: "GOLD CELLS DRAIN TO BOTH OCEANS — CONFIRM?", color: "#eab308" };
    if (phase === "CONFIRMED")
      return { text: "CONFIRMED — REVERSE DFS COMPLETE ✓", color: "#22c55e" };
    return { text: "", color: "#374151" };
  }

  const status = getStatusText();

  // count answer cells
  const answerCount = (() => {
    let n = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (pacificRevealed.has(`${r},${c}`) && atlanticRevealed.has(`${r},${c}`)) n++;
    return n;
  })();

  // ── render ────────────────────────────────────────────────────────────────

  const mission = getMission("graphs", 6);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "PACIFIC", value: pacificRevealed.size }, { label: "ATLANTIC", value: atlanticRevealed.size }];

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
            fontSize: 10,
            color: status.color,
            letterSpacing: "0.07em",
            transition: "color 0.3s",
          }}
        >
          {status.text}
        </span>
        {bothDone && (
          <span style={{ fontSize: 10, color: "#eab308", letterSpacing: "0.07em" }}>
            {answerCount} CELLS
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: GAP,
          flexShrink: 0,
          outline: confirmed ? "2px solid rgba(34,197,94,0.35)" : "none",
          borderRadius: 4,
          transition: "outline 0.3s",
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => (
            <div key={`${r},${c}`} style={getCellStyle(r, c)}>
              {heights[r][c]}
            </div>
          ))
        )}
      </div>

      {/* Control buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexShrink: 0,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Pacific button */}
        {!pacificDone && !atlanticRunning && (
          <button
            onClick={runPacificDFS}
            disabled={anyRunning}
            style={{
              padding: "8px 16px",
              background: pacificRunning
                ? "rgba(59,130,246,0.15)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${pacificRunning ? "#3b82f6" : "#1d4ed8"}`,
              borderRadius: 4,
              cursor: anyRunning ? "not-allowed" : "pointer",
              fontSize: 10,
              color: pacificRunning ? "#93c5fd" : "#3b82f6",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              opacity: anyRunning && !pacificRunning ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            {pacificRunning ? "RUNNING..." : "RUN PACIFIC DFS"}
          </button>
        )}

        {/* Pacific done badge */}
        {pacificDone && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid #1d4ed8",
              borderRadius: 4,
              fontSize: 10,
              color: "#3b82f6",
              letterSpacing: "0.1em",
            }}
          >
            PACIFIC ✓
          </div>
        )}

        {/* Atlantic button */}
        {!atlanticDone && (
          <button
            onClick={runAtlanticDFS}
            disabled={anyRunning}
            style={{
              padding: "8px 16px",
              background: atlanticRunning
                ? "rgba(249,115,22,0.15)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${atlanticRunning ? "#f97316" : "#c2410c"}`,
              borderRadius: 4,
              cursor: anyRunning ? "not-allowed" : "pointer",
              fontSize: 10,
              color: atlanticRunning ? "#fdba74" : "#f97316",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              opacity: anyRunning && !atlanticRunning ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            {atlanticRunning ? "RUNNING..." : "RUN ATLANTIC DFS"}
          </button>
        )}

        {/* Atlantic done badge */}
        {atlanticDone && !bothDone && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(249,115,22,0.08)",
              border: "1px solid #c2410c",
              borderRadius: 4,
              fontSize: 10,
              color: "#f97316",
              letterSpacing: "0.1em",
            }}
          >
            ATLANTIC ✓
          </div>
        )}

        {/* Confirm button */}
        {bothDone && !confirmed && (
          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 20px",
              background: "rgba(234,179,8,0.12)",
              border: "1px solid #eab308",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: "#eab308",
              fontFamily: "inherit",
              letterSpacing: "0.12em",
              animation: "pulse-gold 1.2s ease-in-out infinite",
            }}
          >
            CONFIRM
          </button>
        )}

        {confirmed && (
          <div
            style={{
              padding: "8px 20px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid #22c55e",
              borderRadius: 4,
              fontSize: 11,
              color: "#22c55e",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            SOLVED ✓
          </div>
        )}
      </div>

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
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            { bg: "#0a1929", border: "#1d4ed8", label: "PACIFIC BORDER" },
            { bg: "#1c0f00", border: "#c2410c", label: "ATLANTIC BORDER" },
            { bg: "#0c1f3f", border: "#3b82f6", label: "PACIFIC REACH" },
            { bg: "#2d1500", border: "#f97316", label: "ATLANTIC REACH" },
            { bg: "#2d2200", border: "#eab308", label: "BOTH (ANSWER)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 7, color: "#1f2937", letterSpacing: "0.04em" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe for CONFIRM pulse */}
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(234,179,8,0); }
        }
      `}</style>
    </div>
    </GameShell>
  );
}
