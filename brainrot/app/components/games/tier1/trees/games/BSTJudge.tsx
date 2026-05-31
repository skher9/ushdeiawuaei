"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

type NodeId = "root" | "L" | "R" | "LL" | "LR" | "RR" | "LRL" | "LRR" | "RRL";

interface NodeDef {
  id: NodeId;
  x: number;
  y: number;
  lo: number;
  hi: number;
}

const BASE_NODES: NodeDef[] = [
  { id: "root", x: 50, y: 8,  lo: -Infinity, hi: Infinity  },
  { id: "L",    x: 25, y: 28, lo: -Infinity, hi: 8         },
  { id: "R",    x: 75, y: 28, lo: 8,         hi: Infinity  },
  { id: "LL",   x: 12, y: 52, lo: -Infinity, hi: 3         },
  { id: "LR",   x: 38, y: 52, lo: 3,         hi: 8         },
  { id: "RR",   x: 88, y: 52, lo: 10,        hi: Infinity  },
  { id: "LRL",  x: 30, y: 76, lo: 3,         hi: 6         },
  { id: "LRR",  x: 46, y: 76, lo: 6,         hi: 8         },
  { id: "RRL",  x: 82, y: 76, lo: 10,        hi: 14        },
];

const EDGES: [NodeId, NodeId][] = [
  ["root","L"], ["root","R"], ["L","LL"], ["L","LR"], ["R","RR"],
  ["LR","LRL"], ["LR","LRR"], ["RR","RRL"],
];

interface Problem {
  values: Record<NodeId, number>;
  invalid: NodeId;
  loStr: string;
  hiStr: string;
}

const PROBLEMS: Problem[] = [
  {
    values: { root:8, L:3, R:10, LL:1, LR:6, RR:14, LRL:9, LRR:7, RRL:13 },
    invalid: "LRL",
    loStr: "3", hiStr: "6",
  },
  {
    values: { root:8, L:3, R:10, LL:5, LR:6, RR:14, LRL:4, LRR:7, RRL:13 },
    invalid: "LL",
    loStr: "-∞", hiStr: "3",
  },
  {
    values: { root:8, L:3, R:10, LL:1, LR:6, RR:14, LRL:4, LRR:2, RRL:13 },
    invalid: "LRR",
    loStr: "6", hiStr: "8",
  },
];

export default function BSTJudge({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [shakeNode, setShakeNode] = useState<NodeId | null>(null);
  const [flashNode, setFlashNode] = useState<NodeId | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const problem = PROBLEMS[round];

  const handleClick = useCallback((nodeId: NodeId) => {
    if (transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    if (nodeId === problem.invalid) {
      playTone(660, "sine", 0.15);
      playTone(440, "sine", 0.15);
      const val = problem.values[nodeId];
      setFlashNode(nodeId);
      setMessage({ text: `INVALID: ${val} not in range (${problem.loStr}, ${problem.hiStr})`, ok: true });
      setTransitioning(true);
      setTimeout(() => {
        setFlashNode(null);
        setMessage(null);
        setTransitioning(false);
        if (round + 1 >= PROBLEMS.length) {
          solvedRef.current = true;
          setTimeout(() => onSolve(), 1000);
        } else {
          setRound(r => r + 1);
        }
      }, 1800);
    } else {
      playTone(180, "sawtooth", 0.15);
      setShakeNode(nodeId);
      setTimeout(() => setShakeNode(null), 420);
      const nd = BASE_NODES.find(n => n.id === nodeId)!;
      const lo = nd.lo === -Infinity ? "-∞" : String(nd.lo);
      const hi = nd.hi === Infinity ? "∞" : String(nd.hi);
      const val = problem.values[nodeId];
      setMessage({ text: `${val} is valid in range (${lo}, ${hi})`, ok: false });
      setTimeout(() => setMessage(null), 1800);
    }
  }, [problem, round, transitioning, onAttempt, onSolve]);

  const mission = getMission("trees", 6);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "ROUND", value: round + 1 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes bst-shake { 0%,100%{transform:translate(-50%,-50%)} 20%{transform:translate(-55%,-50%)} 40%{transform:translate(-45%,-50%)} 60%{transform:translate(-54%,-50%)} 80%{transform:translate(-46%,-50%)} }
        @keyframes bst-flash { 0%,100%{background:#1a0808;border-color:#ef4444} 50%{background:#3a0a0a;border-color:#f87171} }
      `}</style>

      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
        BST JUDGE — ROUND {round + 1}/{PROBLEMS.length}
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
        click the node with an invalid value
      </div>

      <div style={{ position: "relative", width: 400, height: 280 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([a, b]) => {
            const na = BASE_NODES.find(n => n.id === a)!;
            const nb = BASE_NODES.find(n => n.id === b)!;
            return (
              <line
                key={`${a}-${b}`}
                x1={`${na.x}%`} y1={`${na.y}%`}
                x2={`${nb.x}%`} y2={`${nb.y}%`}
                stroke="#2a2a2a" strokeWidth={1.5}
              />
            );
          })}
        </svg>

        {BASE_NODES.map(({ id, x, y }) => {
          const val = problem.values[id];
          const isFlash = flashNode === id;
          const isShaking = shakeNode === id;
          return (
            <div
              key={id}
              onClick={() => handleClick(id)}
              style={{
                position: "absolute",
                left: `${x}%`, top: `${y}%`,
                transform: "translate(-50%,-50%)",
                width: 36, height: 36,
                borderRadius: "50%",
                background: isFlash ? "#1a0808" : "#111111",
                border: `2px solid ${isFlash ? "#ef4444" : "#2a2a2a"}`,
                color: isFlash ? "#ef4444" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                animation: isShaking
                  ? "bst-shake 0.42s ease-in-out"
                  : isFlash
                  ? "bst-flash 0.4s ease-in-out 3"
                  : "none",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
                zIndex: 2,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {message && (
          <div style={{
            fontSize: 12, padding: "6px 14px", borderRadius: 6,
            background: message.ok ? "#0d2a0d" : "#1a0a0a",
            border: `1px solid ${message.ok ? "#22c55e" : "#ef4444"}`,
            color: message.ok ? "#22c55e" : "#ef4444",
          }}>
            {message.text}
          </div>
        )}
      </div>

      {solvedRef.current && (
        <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
          ALL 3 VIOLATIONS FOUND
        </div>
      )}
    </div>
    </GameShell>
  );
}
