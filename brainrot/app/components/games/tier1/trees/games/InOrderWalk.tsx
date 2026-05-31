"use client";
import { useState, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FONT = "var(--font-mono,'JetBrains Mono',monospace)";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const RED = "#ef4444";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playWrongTone() {
  playTone(160, "sawtooth", 0.18);
}

function playWinChord() {
  [392, 523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.22), i * 80));
}

interface TreeNode {
  val: number;
  x: number;
  y: number;
  left: number | null;
  right: number | null;
}

const TREE: Record<number, TreeNode> = {
  8:  { val: 8,  x: 50, y: 10, left: 3,    right: 10   },
  3:  { val: 3,  x: 25, y: 30, left: 1,    right: 6    },
  10: { val: 10, x: 75, y: 30, left: null, right: 14   },
  1:  { val: 1,  x: 12, y: 55, left: null, right: null },
  6:  { val: 6,  x: 38, y: 55, left: 4,    right: 7    },
  14: { val: 14, x: 88, y: 55, left: 13,   right: null },
  4:  { val: 4,  x: 30, y: 78, left: null, right: null },
  7:  { val: 7,  x: 46, y: 78, left: null, right: null },
  13: { val: 13, x: 82, y: 78, left: null, right: null },
};

const EDGES: Array<[number, number]> = [
  [8, 3], [8, 10], [3, 1], [3, 6], [10, 14], [6, 4], [6, 7], [14, 13],
];

const INORDER = [1, 3, 4, 6, 7, 8, 10, 13, 14];
const TONES = [262, 294, 330, 349, 392, 440, 494, 523, 587];

export default function InOrderWalk({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [visited, setVisited] = useState<number[]>([]);
  const [shakeNode, setShakeNode] = useState<number | null>(null);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [won, setWon] = useState(false);
  const [riseNode, setRiseNode] = useState<number | null>(null);

  const expectedIndex = visited.length;
  const expectedNext = INORDER[expectedIndex] ?? null;

  function triggerAttempt() {
    if (!attemptRef.current) {
      attemptRef.current = true;
      onAttempt();
    }
  }

  function handleNodeClick(val: number) {
    if (won) return;
    triggerAttempt();

    if (visited.includes(val)) return;

    if (val === expectedNext) {
      playTone(TONES[visited.length] ?? 440, "sine", 0.15);
      setRiseNode(val);
      setTimeout(() => setRiseNode(null), 500);
      setWrongStreak(0);

      const newVisited = [...visited, val];
      setVisited(newVisited);

      if (newVisited.length === INORDER.length) {
        playWinChord();
        setTimeout(() => {
          if (!solvedRef.current) {
            solvedRef.current = true;
            setWon(true);
            onSolve();
          }
        }, 1000);
      }
    } else {
      setShakeNode(val);
      setTimeout(() => setShakeNode(null), 400);
      playWrongTone();
      setWrongStreak(s => s + 1);
    }
  }

  const showHint = wrongStreak >= 3 && expectedNext !== null;

  const W = 400;
  const H = 280;

  function nodeStyle(val: number): { bg: string; border: string; color: string } {
    if (visited.includes(val)) return { bg: "rgba(34,197,94,0.12)", border: GREEN, color: GREEN };
    if (showHint && val === expectedNext) return { bg: "rgba(245,158,11,0.18)", border: AMBER, color: AMBER };
    return { bg: "#1a1a1a", border: "#2a2a2a", color: "#94a3b8" };
  }

  const mission = getMission("trees", 3);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "VISITED", value: visited.length }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(-50%) translateY(-50%)} 25%{transform:translateX(calc(-50% - 4px)) translateY(-50%)} 75%{transform:translateX(calc(-50% + 4px)) translateY(-50%)} }
        @keyframes rise { 0%{transform:translateX(-50%) translateY(-50%)} 50%{transform:translateX(-50%) translateY(calc(-50% - 6px)) scale(1.15)} 100%{transform:translateX(-50%) translateY(-50%)} }
        @keyframes hintPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)} 50%{box-shadow:0 0 0 8px rgba(245,158,11,0)} }
      `}</style>

      {won ? (
        <div style={{ textAlign: "center", padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>INORDER = BST SORTED OUTPUT</div>
          <div style={{ fontSize: 13, color: AMBER, letterSpacing: "0.08em" }}>[ {INORDER.join(", ")} ]</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Left → Root → Right gives ascending order in a BST</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>INORDER TRAVERSAL</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            VISITED: <span style={{ color: AMBER }}>{visited.length}</span> / 9
            &nbsp;·&nbsp;
            NEXT: click the smallest unvisited
          </div>
          {showHint && (
            <div style={{ fontSize: 10, color: AMBER, letterSpacing: "0.06em" }}>HINT: try the pulsing node</div>
          )}
        </div>
      )}

      <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              x1={`${TREE[from].x}%`} y1={`${TREE[from].y}%`}
              x2={`${TREE[to].x}%`} y2={`${TREE[to].y}%`}
              stroke="#2a2a2a"
              strokeWidth={1}
            />
          ))}
        </svg>

        {Object.values(TREE).map(n => {
          const s = nodeStyle(n.val);
          const isShaking = shakeNode === n.val;
          const isRising = riseNode === n.val;
          const isPulsing = showHint && n.val === expectedNext && !isShaking && !isRising;
          return (
            <div
              key={n.val}
              onClick={() => handleNodeClick(n.val)}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: "translateX(-50%) translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: s.bg,
                border: `2px solid ${s.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: s.color,
                cursor: visited.includes(n.val) ? "default" : "pointer",
                animation: isShaking ? "shake 0.4s ease" : isRising ? "rise 0.5s ease" : isPulsing ? "hintPulse 1.2s ease-in-out infinite" : "none",
                transition: "background 0.15s, border-color 0.15s",
                zIndex: 2,
                opacity: visited.includes(n.val) ? 0.7 : 1,
              }}
            >
              {n.val}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.06em" }}>RESULT</div>
        <div style={{ fontSize: 12, color: "#e2e8f0", letterSpacing: "0.06em", minHeight: 20 }}>
          [ {visited.length > 0 ? visited.join(", ") : "..."} ]
        </div>
      </div>

      {!won && (
        <div style={{ fontSize: 10, color: "#475569", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
          left subtree first · then root · then right subtree
        </div>
      )}
    </div>
    </GameShell>
  );
}
