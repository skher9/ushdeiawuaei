"use client";
// CRITICAL LINES · TARJAN'S BRIDGE ALGORITHM
// IDENTIFY BRIDGE EDGES — REMOVING A BRIDGE DISCONNECTS THE NETWORK · CLICK EDGES TO MARK
import { useState, useRef, useCallback } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

type Graph = {
  nodes: { id: number; x: number; y: number }[];
  edges: [number, number][];
  bridges: [number, number][];
};

const GRAPHS: Graph[] = [
  {
    nodes: [
      { id: 0, x: 100, y: 120 }, { id: 1, x: 220, y: 60 }, { id: 2, x: 340, y: 120 },
      { id: 3, x: 340, y: 240 }, { id: 4, x: 220, y: 300 }, { id: 5, x: 100, y: 240 },
      { id: 6, x: 500, y: 180 }, { id: 7, x: 620, y: 120 }, { id: 8, x: 620, y: 240 },
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], // left cycle
      [2, 6],                                            // bridge: 2-6
      [6, 7], [7, 8], [8, 6],                           // right cycle
    ],
    bridges: [[2, 6]],
  },
  {
    nodes: [
      { id: 0, x: 80, y: 200 }, { id: 1, x: 200, y: 100 }, { id: 2, x: 320, y: 200 },
      { id: 3, x: 200, y: 300 }, { id: 4, x: 480, y: 200 }, { id: 5, x: 600, y: 100 },
      { id: 6, x: 600, y: 300 },
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0], // left cycle
      [2, 4],                           // bridge: 2-4
      [4, 5], [5, 6], [6, 4],          // right cycle
    ],
    bridges: [[2, 4]],
  },
  {
    nodes: [
      { id: 0, x: 100, y: 150 }, { id: 1, x: 240, y: 80 }, { id: 2, x: 380, y: 150 },
      { id: 3, x: 240, y: 220 }, { id: 4, x: 240, y: 320 }, { id: 5, x: 520, y: 80 },
      { id: 6, x: 520, y: 220 },
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0], [1, 3], // left cluster
      [2, 5],                                   // bridge: 2-5
      [5, 6],                                   // bridge: 5-6
    ],
    bridges: [[2, 5], [5, 6]],
  },
];

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function isBridgeEdge(bridges: [number, number][], a: number, b: number): boolean {
  return bridges.some(([ba, bb]) => edgeKey(ba, bb) === edgeKey(a, b));
}

type SubmitState = "idle" | "correct" | "wrong";

export default function CriticalLines({ onSolve, onAttempt }: GameProps) {
  const [graphIdx, setGraphIdx] = useState(0);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [solved, setSolved] = useState(false);

  const attemptedRef = useRef(false);
  const solvedRef = useRef(false);

  const graph = GRAPHS[graphIdx];

  const handleEdgeClick = useCallback(
    (a: number, b: number) => {
      if (solved) return;
      if (!attemptedRef.current) {
        attemptedRef.current = true;
        onAttempt();
      }
      const key = edgeKey(a, b);
      setMarked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      // Reset submit feedback on change
      setSubmitState("idle");
    },
    [solved, onAttempt]
  );

  function handleSubmit() {
    if (solved) return;
    const correctKeys = new Set(graph.bridges.map(([a, b]) => edgeKey(a, b)));

    const markedArray = Array.from(marked);
    const allCorrect =
      markedArray.length === correctKeys.size &&
      markedArray.every((k) => correctKeys.has(k));

    if (allCorrect) {
      setSubmitState("correct");
      setSolved(true);
      if (!solvedRef.current) {
        solvedRef.current = true;
        setTimeout(() => onSolve(), 800);
      }
    } else {
      setSubmitState("wrong");
    }
  }

  function handleRestart() {
    const next = (graphIdx + 1) % GRAPHS.length;
    setGraphIdx(next);
    setMarked(new Set());
    setSubmitState("idle");
    setSolved(false);
    solvedRef.current = false;
    attemptedRef.current = false;
  }

  const correctKeys = new Set(graph.bridges.map(([a, b]) => edgeKey(a, b)));

  function getEdgeStyle(a: number, b: number): {
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
  } {
    const key = edgeKey(a, b);
    const isMarked = marked.has(key);
    const isBridge = correctKeys.has(key);

    if (submitState === "correct") {
      // All correct: show bridges green
      if (isBridge) {
        return { stroke: "#22c55e", strokeWidth: 3, strokeDasharray: "none" };
      }
      return { stroke: "#1e3a5f", strokeWidth: 2, strokeDasharray: "none" };
    }

    if (submitState === "wrong") {
      if (isMarked && isBridge) {
        // Correctly marked bridge
        return { stroke: "#22c55e", strokeWidth: 3, strokeDasharray: "none" };
      }
      if (isMarked && !isBridge) {
        // Wrong marking
        return { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6,4" };
      }
      if (!isMarked && isBridge) {
        // Missed bridge
        return { stroke: "#eab308", strokeWidth: 3, strokeDasharray: "6,4" };
      }
      return { stroke: "#1e3a5f", strokeWidth: 2, strokeDasharray: "none" };
    }

    // idle state
    if (isMarked) {
      return { stroke: "#ef4444", strokeWidth: 3, strokeDasharray: "6,4" };
    }
    return { stroke: "#1e3a5f", strokeWidth: 2, strokeDasharray: "none" };
  }

  const SVG_W = 720;
  const SVG_H = 400;

  const mission = getMission("graphs", 8);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "MARKED", value: marked.size }];

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
          maxWidth: SVG_W,
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
            color:
              submitState === "correct"
                ? "#22c55e"
                : submitState === "wrong"
                ? "#ef4444"
                : "#e2e8f0",
            letterSpacing: "0.08em",
            transition: "color 0.2s",
          }}
        >
          {submitState === "correct" && "CORRECT — ALL BRIDGES IDENTIFIED"}
          {submitState === "wrong" && "INCORRECT — CHECK YOUR MARKINGS"}
          {submitState === "idle" &&
            (marked.size === 0
              ? "CLICK EDGES TO MARK AS BRIDGES"
              : `${marked.size} EDGE${marked.size !== 1 ? "S" : ""} MARKED`)}
        </span>
        <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.06em" }}>
          GRAPH {graphIdx + 1} / {GRAPHS.length}
        </span>
      </div>

      {/* SVG canvas */}
      <div style={{ flexShrink: 0, position: "relative" }}>
        <svg
          width={SVG_W}
          height={SVG_H}
          style={{
            display: "block",
            background: "#0d1117",
            borderRadius: 6,
            border: solved
              ? "1px solid rgba(34,197,94,0.3)"
              : "1px solid #1a2a3a",
            transition: "border-color 0.3s",
          }}
        >
          {/* Edges */}
          {graph.edges.map(([a, b]) => {
            const na = graph.nodes[a];
            const nb = graph.nodes[b];
            const style = getEdgeStyle(a, b);
            const key = edgeKey(a, b);
            return (
              <g key={key}>
                {/* Visible edge */}
                <line
                  x1={na.x}
                  y1={na.y}
                  x2={nb.x}
                  y2={nb.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={
                    style.strokeDasharray === "none"
                      ? undefined
                      : style.strokeDasharray
                  }
                  style={{ transition: "stroke 0.2s, stroke-width 0.2s", pointerEvents: "none" }}
                />
                {/* Wide invisible hit area */}
                <line
                  x1={na.x}
                  y1={na.y}
                  x2={nb.x}
                  y2={nb.y}
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: solved ? "default" : "pointer" }}
                  onClick={() => handleEdgeClick(a, b)}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={18}
                fill="#0d1f3c"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={11}
                fontWeight={700}
                fontFamily="var(--font-mono, 'JetBrains Mono', monospace)"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {!solved && (
          <button
            onClick={handleSubmit}
            disabled={marked.size === 0}
            style={{
              padding: "8px 28px",
              background:
                marked.size === 0
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(59,130,246,0.1)",
              border:
                marked.size === 0
                  ? "1px solid #1a2a3a"
                  : "1px solid rgba(59,130,246,0.5)",
              borderRadius: 4,
              cursor: marked.size === 0 ? "not-allowed" : "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: marked.size === 0 ? "#374151" : "#3b82f6",
              fontFamily: "inherit",
              letterSpacing: "0.12em",
              transition: "all 0.2s",
            }}
          >
            [ SUBMIT ]
          </button>
        )}
        {(solved || submitState === "wrong") && (
          <button
            onClick={handleRestart}
            style={{
              padding: "8px 24px",
              background: solved
                ? "rgba(34,197,94,0.08)"
                : "rgba(255,255,255,0.04)",
              border: solved
                ? "1px solid rgba(34,197,94,0.4)"
                : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: solved ? "#22c55e" : "#e2e8f0",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
          >
            {solved ? "[ NEXT GRAPH ]" : "[ TRY AGAIN ]"}
          </button>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          width: "100%",
          maxWidth: SVG_W,
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid #111",
          flexShrink: 0,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#1e3a5f", label: "NORMAL EDGE", dash: false },
          { color: "#ef4444", label: "MARKED BRIDGE", dash: true },
          { color: "#22c55e", label: "CORRECT BRIDGE", dash: false },
          { color: "#eab308", label: "MISSED BRIDGE", dash: true },
        ].map(({ color, label, dash }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={24} height={10}>
              <line
                x1={0}
                y1={5}
                x2={24}
                y2={5}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dash ? "4,3" : undefined}
              />
            </svg>
            <span style={{ fontSize: 8, color: "#374151", letterSpacing: "0.06em" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
    </GameShell>
  );
}
