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

type Case = "leaf" | "one-child" | "two-children";

interface Problem {
  target: number;
  caseType: Case;
  phase2Target: number | null;
  label: string;
  instruction: string;
}

const PROBLEMS: Problem[] = [
  {
    target: 1,
    caseType: "leaf",
    phase2Target: null,
    label: "CASE: LEAF",
    instruction: "LEAF — click 1 again to confirm removal",
  },
  {
    target: 10,
    caseType: "one-child",
    phase2Target: 14,
    label: "CASE: ONE CHILD",
    instruction: "ONE CHILD — click the child (14) to promote it",
  },
  {
    target: 3,
    caseType: "two-children",
    phase2Target: 4,
    label: "CASE: TWO CHILDREN",
    instruction: "TWO CHILDREN — click inorder successor (4) to replace",
  },
];

interface NodePos {
  val: number;
  x: number;
  y: number;
  key: string;
}

function buildNodes(round: number, fadingNode: number | null): NodePos[] {
  if (round === 0) {
    return [
      { val: 8,  x: 50, y: 8,  key: "8"  },
      { val: 3,  x: 25, y: 28, key: "3"  },
      { val: 10, x: 75, y: 28, key: "10" },
      { val: 1,  x: 12, y: 52, key: "1"  },
      { val: 6,  x: 38, y: 52, key: "6"  },
      { val: 14, x: 88, y: 52, key: "14" },
      { val: 4,  x: 30, y: 76, key: "4"  },
      { val: 7,  x: 46, y: 76, key: "7"  },
      { val: 13, x: 82, y: 76, key: "13" },
    ].filter(n => fadingNode === null || n.val !== fadingNode);
  }
  if (round === 1) {
    return [
      { val: 8,  x: 50, y: 8,  key: "8"  },
      { val: 3,  x: 25, y: 28, key: "3"  },
      { val: 10, x: 75, y: 28, key: "10" },
      { val: 6,  x: 38, y: 52, key: "6"  },
      { val: 14, x: 88, y: 52, key: "14" },
      { val: 4,  x: 30, y: 76, key: "4"  },
      { val: 7,  x: 46, y: 76, key: "7"  },
      { val: 13, x: 82, y: 76, key: "13" },
    ].filter(n => fadingNode === null || n.val !== fadingNode);
  }
  if (round === 2) {
    return [
      { val: 8,  x: 50, y: 8,  key: "8"  },
      { val: 3,  x: 25, y: 28, key: "3"  },
      { val: 14, x: 75, y: 28, key: "14" },
      { val: 6,  x: 38, y: 52, key: "6"  },
      { val: 13, x: 88, y: 52, key: "13" },
      { val: 4,  x: 30, y: 76, key: "4"  },
      { val: 7,  x: 46, y: 76, key: "7"  },
    ].filter(n => fadingNode === null || n.val !== fadingNode);
  }
  return [];
}

function buildEdges(round: number, fadingNode: number | null): [number, number][] {
  const allEdges: [number, number][][] = [
    [[8,3],[8,10],[3,1],[3,6],[10,14],[6,4],[6,7],[14,13]],
    [[8,3],[8,10],[3,6],[10,14],[6,4],[6,7],[14,13]],
    [[8,3],[8,14],[3,6],[14,13],[6,4],[6,7]],
  ];
  const base = allEdges[round] || [];
  if (fadingNode === null) return base;
  return base.filter(([a, b]) => a !== fadingNode && b !== fadingNode);
}

export default function NodeRemover({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [shakeVal, setShakeVal] = useState<number | null>(null);
  const [fadingNode, setFadingNode] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<number | null>(null);

  const problem = PROBLEMS[round];
  const nodes = buildNodes(round, fadingNode);
  const edges = buildEdges(round, fadingNode);

  const advanceRound = useCallback(() => {
    setFadingNode(null);
    setMessage(null);
    setTransitioning(false);
    setHighlightTarget(null);
    if (round + 1 >= PROBLEMS.length) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1000);
    } else {
      setRound(r => r + 1);
      setPhase(1);
    }
  }, [round, onSolve]);

  const handleClick = useCallback((val: number) => {
    if (transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    if (phase === 1) {
      if (val === problem.target) {
        playTone(440, "sine", 0.12);
        setHighlightTarget(val);
        setMessage({ text: problem.label, ok: true });
        setPhase(2);
      } else {
        playTone(180, "sawtooth", 0.14);
        setShakeVal(val);
        setTimeout(() => setShakeVal(null), 420);
        setMessage({ text: "this node doesn't need deletion", ok: false });
        setTimeout(() => setMessage(null), 1500);
      }
    } else {
      const p2t = problem.phase2Target;
      const isLeaf = problem.caseType === "leaf";
      const clickedTarget = val === problem.target;

      if ((isLeaf && clickedTarget) || (!isLeaf && val === p2t)) {
        playTone(660, "sine", 0.15);
        playTone(880, "sine", 0.15);
        setTransitioning(true);
        setFadingNode(problem.target);
        if (problem.caseType === "two-children") {
          setMessage({ text: `4 takes the place of 3`, ok: true });
        } else if (problem.caseType === "one-child") {
          setMessage({ text: `14 promoted to replace 10`, ok: true });
        } else {
          setMessage({ text: `1 removed (leaf)`, ok: true });
        }
        setTimeout(advanceRound, 1600);
      } else {
        playTone(180, "sawtooth", 0.14);
        setShakeVal(val);
        setTimeout(() => setShakeVal(null), 420);
        setMessage({ text: problem.instruction, ok: false });
        setTimeout(() => setMessage(null), 1500);
      }
    }
  }, [phase, problem, transitioning, advanceRound, onAttempt]);

  const mission = getMission("trees", 7);
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
        @keyframes nr-shake { 0%,100%{transform:translate(-50%,-50%)} 20%{transform:translate(-55%,-50%)} 40%{transform:translate(-45%,-50%)} 60%{transform:translate(-54%,-50%)} 80%{transform:translate(-46%,-50%)} }
        @keyframes nr-fade { from{opacity:1;transform:translate(-50%,-50%) scale(1)} to{opacity:0;transform:translate(-50%,-50%) scale(0.4)} }
        @keyframes nr-glow { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
      `}</style>

      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>
        NODE REMOVER — ROUND {round + 1}/{PROBLEMS.length}
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, textAlign: "center" }}>
        {phase === 1
          ? `DELETE: ${problem.target}`
          : problem.instruction}
      </div>

      <div style={{ position: "relative", width: 400, height: 280 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {edges.map(([a, b]) => {
            const na = nodes.find(n => n.val === a);
            const nb = nodes.find(n => n.val === b);
            if (!na || !nb) return null;
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

        {nodes.map(({ val, x, y, key }) => {
          const isTarget = val === problem.target && highlightTarget === val;
          const isPhase2 = phase === 2 && problem.phase2Target === val;
          const isShaking = shakeVal === val;
          const isFading = fadingNode === val;
          let bg = "#111111";
          let border = "#2a2a2a";
          let color = "#9ca3af";
          if (isTarget) { bg = "#1a0808"; border = "#ef4444"; color = "#ef4444"; }
          if (isPhase2) { bg = "#0a1a0a"; border = "#22c55e"; color = "#22c55e"; }

          return (
            <div
              key={key}
              onClick={() => handleClick(val)}
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
                animation: isFading
                  ? "nr-fade 0.5s ease-in-out forwards"
                  : isShaking
                  ? "nr-shake 0.42s ease-in-out"
                  : isTarget
                  ? "nr-glow 1.4s ease-in-out infinite"
                  : "none",
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
          ALL 3 DELETIONS COMPLETE
        </div>
      )}
    </div>
    </GameShell>
  );
}
