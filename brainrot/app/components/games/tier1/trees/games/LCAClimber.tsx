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

type NodeId = 8 | 3 | 10 | 1 | 6 | 14 | 4 | 7 | 13;

const NODES: { id: NodeId; x: number; y: number }[] = [
  { id: 8,  x: 50, y: 8  },
  { id: 3,  x: 25, y: 28 },
  { id: 10, x: 75, y: 28 },
  { id: 1,  x: 12, y: 52 },
  { id: 6,  x: 38, y: 52 },
  { id: 14, x: 88, y: 52 },
  { id: 4,  x: 30, y: 76 },
  { id: 7,  x: 46, y: 76 },
  { id: 13, x: 82, y: 76 },
];

const EDGES: [NodeId, NodeId][] = [
  [8, 3], [8, 10], [3, 1], [3, 6], [10, 14], [6, 4], [6, 7], [14, 13],
];

const CHILDREN: Record<NodeId, NodeId[]> = {
  8: [3, 10], 3: [1, 6], 10: [14], 1: [], 6: [4, 7], 14: [13], 4: [], 7: [], 13: [],
};

function subtreeOf(node: NodeId): Set<NodeId> {
  const s = new Set<NodeId>();
  const stack: NodeId[] = [node];
  while (stack.length) {
    const n = stack.pop()!;
    s.add(n);
    CHILDREN[n].forEach(c => stack.push(c));
  }
  return s;
}

const SUBTREES: Record<NodeId, Set<NodeId>> = {} as any;
NODES.forEach(n => { SUBTREES[n.id] = subtreeOf(n.id); });

const PROBLEMS: { p: NodeId; q: NodeId; lca: NodeId }[] = [
  { p: 4,  q: 7,  lca: 6 },
  { p: 1,  q: 7,  lca: 3 },
  { p: 4,  q: 13, lca: 8 },
];

function pathToNode(target: NodeId): NodeId[] {
  function dfs(node: NodeId, path: NodeId[]): NodeId[] | null {
    const current = [...path, node];
    if (node === target) return current;
    for (const c of CHILDREN[node]) {
      const r = dfs(c, current);
      if (r) return r;
    }
    return null;
  }
  return dfs(8, []) || [];
}

export default function LCAClimber({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [shakeNode, setShakeNode] = useState<NodeId | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [litPaths, setLitPaths] = useState<Set<NodeId>>(new Set());
  const [showingCorrect, setShowingCorrect] = useState(false);

  const problem = PROBLEMS[round];

  const handleClick = useCallback((nodeId: NodeId) => {
    if (showingCorrect || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const { p, q, lca } = problem;
    const sub = SUBTREES[nodeId];

    if (nodeId === lca) {
      playTone(660, "sine", 0.18);
      playTone(880, "sine", 0.18);
      const pathP = new Set(pathToNode(p));
      const pathQ = new Set(pathToNode(q));
      const lit = new Set<NodeId>();
      pathP.forEach(n => lit.add(n));
      pathQ.forEach(n => lit.add(n));
      setLitPaths(lit);
      setShowingCorrect(true);
      setMessage({ text: `LCA(${p},${q}) = ${lca}`, ok: true });

      setTimeout(() => {
        setLitPaths(new Set());
        setShowingCorrect(false);
        setMessage(null);
        if (round + 1 >= PROBLEMS.length) {
          solvedRef.current = true;
          setTimeout(() => onSolve(), 1000);
        } else {
          setRound(r => r + 1);
        }
      }, 1800);
    } else {
      playTone(200, "sawtooth", 0.15);
      setShakeNode(nodeId);
      setTimeout(() => setShakeNode(null), 420);
      const hasBoth = sub.has(p) && sub.has(q);
      if (!hasBoth) {
        setMessage({ text: `both targets aren't under this node`, ok: false });
      } else {
        setMessage({ text: `a deeper ancestor exists`, ok: false });
      }
      setTimeout(() => setMessage(null), 1800);
    }
  }, [problem, round, showingCorrect, onAttempt, onSolve]);

  const pos = (x: number, y: number) => ({ left: `${x}%`, top: `${y}%` });

  const mission = getMission("trees", 5);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "LIT PATH", value: litPaths.size }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes lca-shake { 0%,100%{transform:translate(-50%,-50%)} 20%{transform:translate(-54%,-50%)} 40%{transform:translate(-46%,-50%)} 60%{transform:translate(-53%,-50%)} 80%{transform:translate(-47%,-50%)} }
        @keyframes lca-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.6)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
      `}</style>

      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
        LCA CLIMBER — ROUND {round + 1}/{PROBLEMS.length}
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: "#f59e0b", fontWeight: 700 }}>P = {problem.p}</span>
        <span style={{ color: "#60a5fa", fontWeight: 700 }}>Q = {problem.q}</span>
        <span style={{ color: "#6b7280" }}>find LCA</span>
      </div>

      <div style={{ position: "relative", width: 400, height: 280 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([a, b]) => {
            const na = NODES.find(n => n.id === a)!;
            const nb = NODES.find(n => n.id === b)!;
            const isLit = litPaths.has(a) && litPaths.has(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={`${na.x}%`} y1={`${na.y}%`}
                x2={`${nb.x}%`} y2={`${nb.y}%`}
                stroke={isLit ? "#f59e0b" : "#2a2a2a"}
                strokeWidth={isLit ? 2.5 : 1.5}
              />
            );
          })}
        </svg>

        {NODES.map(({ id, x, y }) => {
          const isP = id === problem.p;
          const isQ = id === problem.q;
          const isLit = litPaths.has(id);
          const isShaking = shakeNode === id;
          let bg = "#111111";
          let border = "#2a2a2a";
          let color = "#9ca3af";
          if (isP) { bg = "#2a1f00"; border = "#f59e0b"; color = "#f59e0b"; }
          if (isQ) { bg = "#0d1a2e"; border = "#60a5fa"; color = "#60a5fa"; }
          if (isLit && !isP && !isQ) { bg = "#1a1200"; border = "#f59e0b"; color = "#fbbf24"; }
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
                background: bg,
                border: `2px solid ${border}`,
                color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                animation: isShaking ? "lca-shake 0.42s ease-in-out" : (isP || isQ ? "lca-pulse 1.6s ease-in-out infinite" : "none"),
                transition: "background 0.2s, border-color 0.2s",
                zIndex: 2,
              }}
            >
              {id}
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
          ALL 3 LCAs FOUND
        </div>
      )}
    </div>
    </GameShell>
  );
}
