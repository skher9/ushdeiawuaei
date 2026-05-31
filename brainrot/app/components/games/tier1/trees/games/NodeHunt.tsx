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

function playFoundChord() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.2), i * 70));
}

function playWrongTone() {
  playTone(160, "sawtooth", 0.18);
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

const TARGETS = [4, 13, 7];

const EDGES: Array<[number, number]> = [
  [8, 3], [8, 10], [3, 1], [3, 6], [10, 14], [6, 4], [6, 7], [14, 13],
];

export default function NodeHunt({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [targetQueue, setTargetQueue] = useState<number[]>([...TARGETS]);
  const [currentNode, setCurrentNode] = useState<number>(8);
  const [visited, setVisited] = useState<Set<number>>(new Set([8]));
  const [foundNodes, setFoundNodes] = useState<number[]>([]);
  const [shakeNode, setShakeNode] = useState<number | null>(null);
  const [flashNode, setFlashNode] = useState<number | null>(null);
  const [comparisons, setComparisons] = useState(0);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [totalComparisons, setTotalComparisons] = useState(0);

  const target = targetQueue[0] ?? null;

  function triggerAttempt() {
    if (!attemptRef.current) {
      attemptRef.current = true;
      onAttempt();
    }
  }

  function shakeNode_(val: number) {
    setShakeNode(val);
    setTimeout(() => setShakeNode(null), 400);
  }

  function handleNodeClick(val: number) {
    if (won || target === null) return;
    triggerAttempt();

    const node = TREE[currentNode];
    if (!node) return;

    setComparisons(c => c + 1);

    if (val === currentNode) {
      if (val === target) {
        setFlashNode(val);
        setTimeout(() => setFlashNode(null), 600);
        playFoundChord();
        setFoundNodes(prev => [...prev, val]);
        setTotalComparisons(tc => tc + comparisons + 1);
        setComparisons(0);
        const newQueue = targetQueue.slice(1);
        setTargetQueue(newQueue);
        if (newQueue.length > 0) {
          setCurrentNode(8);
          setVisited(new Set([8]));
        }
        if (newQueue.length === 0) {
          setTimeout(() => {
            if (!solvedRef.current) {
              solvedRef.current = true;
              setWon(true);
              onSolve();
            }
          }, 1000);
        }
        return;
      } else {
        shakeNode_(val);
        playWrongTone();
        const dir = target < val ? "<" : ">";
        setWrongMsg(`target ${target} ${dir} ${val} — go ${target < val ? "left" : "right"}`);
        setTimeout(() => setWrongMsg(null), 1800);
        return;
      }
    }

    if (val !== node.left && val !== node.right) {
      shakeNode_(val);
      playWrongTone();
      setWrongMsg(`can only move to children of ${currentNode}`);
      setTimeout(() => setWrongMsg(null), 1800);
      return;
    }

    if (target < node.val && val === node.right) {
      shakeNode_(val);
      playWrongTone();
      setWrongMsg(`NO — target ${target} < ${node.val}, go left`);
      setTimeout(() => setWrongMsg(null), 1800);
      return;
    }

    if (target > node.val && val === node.left) {
      shakeNode_(val);
      playWrongTone();
      setWrongMsg(`NO — target ${target} > ${node.val}, go right`);
      setTimeout(() => setWrongMsg(null), 1800);
      return;
    }

    playTone(480 + comparisons * 40, "sine", 0.1);
    setCurrentNode(val);
    setVisited(prev => new Set([...prev, val]));
    setWrongMsg(null);
  }

  const W = 400;
  const H = 280;

  function nodeStyle(val: number) {
    if (foundNodes.includes(val)) return { bg: "rgba(34,197,94,0.12)", border: GREEN, color: GREEN };
    if (flashNode === val) return { bg: "rgba(34,197,94,0.3)", border: GREEN, color: GREEN };
    if (val === currentNode) return { bg: "rgba(245,158,11,0.2)", border: AMBER, color: AMBER };
    if (visited.has(val)) return { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.3)", color: "#94a3b8" };
    return { bg: "#1a1a1a", border: "#2a2a2a", color: "#94a3b8" };
  }

  const mission = getMission("trees", 2);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "COMPARES", value: comparisons }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(-50%) translateY(-50%)} 25%{transform:translateX(calc(-50% - 4px)) translateY(-50%)} 75%{transform:translateX(calc(-50% + 4px)) translateY(-50%)} }
        @keyframes flash { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 16px 4px rgba(34,197,94,0.5)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)} 50%{box-shadow:0 0 0 8px rgba(245,158,11,0)} }
      `}</style>

      {won ? (
        <div style={{ textAlign: "center", padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>ALL FOUND</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total comparisons: {totalComparisons}</div>
          <div style={{ fontSize: 11, color: "#475569" }}>BST search: O(log n) average</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>BST SEARCH</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: AMBER, letterSpacing: "0.06em" }}>
            FIND: <span style={{ color: "#e2e8f0" }}>{target}</span>
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            comparisons: {comparisons} &nbsp;·&nbsp; remaining: {targetQueue.slice(1).join(", ") || "—"} &nbsp;·&nbsp; found: {foundNodes.join(", ") || "—"}
          </div>
        </div>
      )}

      {wrongMsg && (
        <div style={{ fontSize: 11, color: RED, letterSpacing: "0.04em", minHeight: 16 }}>{wrongMsg}</div>
      )}

      <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([from, to]) => {
            const a = TREE[from];
            const b = TREE[to];
            const inPath = visited.has(from) && visited.has(to);
            return (
              <line
                key={`${from}-${to}`}
                x1={`${a.x}%`} y1={`${a.y}%`}
                x2={`${b.x}%`} y2={`${b.y}%`}
                stroke={inPath ? AMBER : "#2a2a2a"}
                strokeWidth={inPath ? 1.5 : 1}
              />
            );
          })}
        </svg>

        {Object.values(TREE).map(n => {
          const s = nodeStyle(n.val);
          const isShaking = shakeNode === n.val;
          const isFlashing = flashNode === n.val;
          const isCurrent = n.val === currentNode;
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
                cursor: "pointer",
                animation: isShaking ? "shake 0.4s ease" : isFlashing ? "flash 0.6s ease" : isCurrent ? "pulse 1.4s ease-in-out infinite" : "none",
                transition: "background 0.15s, border-color 0.15s",
                zIndex: 2,
              }}
            >
              {n.val}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>
        PATH: {Array.from(visited).join(" → ")}
      </div>

      <div style={{ fontSize: 10, color: "#475569", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
        click the current node if it matches · click left/right child to navigate
      </div>
    </div>
    </GameShell>
  );
}
