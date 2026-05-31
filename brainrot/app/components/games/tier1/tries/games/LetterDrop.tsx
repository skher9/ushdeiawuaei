"use client";
import { useState, useRef, useCallback } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FONT = "var(--font-mono,'JetBrains Mono',monospace)";
const CYAN = "#06b6d4";
const GREEN = "#22c55e";
const RED = "#ef4444";
const GOLD = "#f59e0b";

function playTone(freq: number, type: OscillatorType, dur: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playCorrect() { playTone(880, "sine", 0.15); }
function playWrong() { playTone(200, "sawtooth", 0.2); }
function playRoundComplete() {
  setTimeout(() => playTone(660, "sine", 0.15), 0);
  setTimeout(() => playTone(880, "sine", 0.15), 160);
}
function playSolved() {
  setTimeout(() => playTone(440, "sine", 0.18), 0);
  setTimeout(() => playTone(660, "sine", 0.18), 180);
  setTimeout(() => playTone(880, "sine", 0.22), 360);
}

interface TrieNode {
  id: string;
  char: string;
  x: number;
  y: number;
  isEnd: boolean;
  parentId: string | null;
}

interface RoundDef {
  label: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  initialNodes: TrieNode[];
  initialEdges: [string, string][];
  insertWord: string;
  steps: { parentId: string; char: string; newNodeId: string; newX: number; newY: number; isEnd: boolean }[];
}

const ROUND1: RoundDef = {
  label: 'Insert "cat"',
  difficulty: "EASY",
  initialNodes: [
    { id: "root", char: "·", x: 50, y: 8, isEnd: false, parentId: null },
  ],
  initialEdges: [],
  insertWord: "cat",
  steps: [
    { parentId: "root", char: "c", newNodeId: "c",   newX: 50, newY: 35, isEnd: false },
    { parentId: "c",    char: "a", newNodeId: "ca",  newX: 50, newY: 58, isEnd: false },
    { parentId: "ca",   char: "t", newNodeId: "cat", newX: 50, newY: 81, isEnd: true  },
  ],
};

const ROUND2: RoundDef = {
  label: 'Insert "car"',
  difficulty: "MEDIUM",
  initialNodes: [
    { id: "root", char: "·", x: 50, y: 8,  isEnd: false, parentId: null },
    { id: "c",    char: "c", x: 50, y: 33, isEnd: false, parentId: "root" },
    { id: "ca",   char: "a", x: 50, y: 56, isEnd: false, parentId: "c" },
    { id: "cat",  char: "t", x: 37, y: 79, isEnd: true,  parentId: "ca" },
  ],
  initialEdges: [["root","c"],["c","ca"],["ca","cat"]],
  insertWord: "car",
  steps: [
    { parentId: "ca", char: "r", newNodeId: "car", newX: 63, newY: 79, isEnd: true },
  ],
};

const ROUND3: RoundDef = {
  label: 'Insert "do"',
  difficulty: "HARD",
  initialNodes: [
    { id: "root", char: "·", x: 50, y: 6,  isEnd: false, parentId: null },
    { id: "c",    char: "c", x: 28, y: 26, isEnd: false, parentId: "root" },
    { id: "ca",   char: "a", x: 28, y: 46, isEnd: false, parentId: "c" },
    { id: "cat",  char: "t", x: 16, y: 66, isEnd: true,  parentId: "ca" },
    { id: "car",  char: "r", x: 40, y: 66, isEnd: true,  parentId: "ca" },
  ],
  initialEdges: [["root","c"],["c","ca"],["ca","cat"],["ca","car"]],
  insertWord: "do",
  steps: [
    { parentId: "root", char: "d", newNodeId: "d",  newX: 72, newY: 26, isEnd: false },
    { parentId: "d",    char: "o", newNodeId: "do", newX: 72, newY: 46, isEnd: true  },
  ],
};

const ROUNDS: RoundDef[] = [ROUND1, ROUND2, ROUND3];

export default function LetterDrop({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [nodes, setNodes] = useState<TrieNode[]>([...ROUND1.initialNodes]);
  const [edges, setEdges] = useState<[string, string][]>([...ROUND1.initialEdges]);
  const [stepIdx, setStepIdx] = useState(0);
  const [flashNode, setFlashNode] = useState<string | null>(null);
  const [flashColor, setFlashColor] = useState<string>(GREEN);
  const [shakeNode, setShakeNode] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const round = ROUNDS[roundIdx];
  const currentStep = round.steps[stepIdx] ?? null;

  function triggerAttempt() {
    if (!attemptRef.current) { attemptRef.current = true; onAttempt(); }
  }

  function flash(id: string, color: string) {
    setFlashNode(id); setFlashColor(color);
    setTimeout(() => setFlashNode(null), 350);
  }

  function shake(id: string) {
    setShakeNode(id);
    setTimeout(() => setShakeNode(null), 400);
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    if (done || !currentStep) return;
    triggerAttempt();

    if (nodeId === currentStep.parentId) {
      playCorrect();
      flash(nodeId, GREEN);
      const newNode: TrieNode = {
        id: currentStep.newNodeId,
        char: currentStep.char,
        x: currentStep.newX,
        y: currentStep.newY,
        isEnd: currentStep.isEnd,
        parentId: currentStep.parentId,
      };
      const nextStepIdx = stepIdx + 1;

      setNodes(prev => [...prev, newNode]);
      setEdges(prev => [...prev, [currentStep.parentId, currentStep.newNodeId]]);
      setTimeout(() => flash(currentStep.newNodeId, GREEN), 80);

      if (nextStepIdx >= round.steps.length) {
        playRoundComplete();
        setBanner(roundIdx < 2 ? "ROUND COMPLETE" : "SOLVED!");
        setTimeout(() => {
          setBanner(null);
          if (roundIdx < 2) {
            const next = roundIdx + 1;
            setRoundIdx(next);
            setNodes([...ROUNDS[next].initialNodes]);
            setEdges([...ROUNDS[next].initialEdges]);
            setStepIdx(0);
          } else {
            setDone(true);
            playSolved();
            if (!solvedRef.current) {
              solvedRef.current = true;
              setTimeout(() => onSolve(), 1000);
            }
          }
        }, 1200);
      } else {
        setStepIdx(nextStepIdx);
      }
    } else {
      playWrong();
      shake(nodeId);
    }
  }, [done, currentStep, stepIdx, roundIdx, round]);

  const svgW = 380;
  const svgH = 280;

  function nx(pct: number) { return (pct / 100) * svgW; }
  function ny(pct: number) { return (pct / 100) * svgH; }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const mission = getMission("tries", 1);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: roundIdx + 1 }, { label: "STEP", value: stepIdx }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes ld-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes ld-pop { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
        @keyframes ld-banner { 0%{opacity:0;transform:translateY(-8px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0} }
      `}</style>

      {/* Instruction row */}
      <div style={{ padding: "8px 16px", background: "rgba(6,182,212,0.04)", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Insert:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {round.insertWord.split("").map((ch, i) => (
            <span key={i} style={{
              width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 0,
              background: i < stepIdx ? "rgba(34,197,94,0.15)" : i === stepIdx ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i < stepIdx ? "rgba(34,197,94,0.3)" : i === stepIdx ? "rgba(6,182,212,0.5)" : "#2a2a2a"}`,
              color: i < stepIdx ? GREEN : i === stepIdx ? CYAN : "#475569",
            }}>{ch}</span>
          ))}
        </div>
        {currentStep && (
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>
            Click <span style={{ color: CYAN }}>'{currentStep.parentId === "root" ? "·" : nodes.find(n => n.id === currentStep.parentId)?.char ?? "?"}'</span> to place <span style={{ color: CYAN }}>'{currentStep.char}'</span>
          </span>
        )}
      </div>

      {/* SVG trie */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
        {banner && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 10, padding: "10px 28px",
            background: banner === "SOLVED!" ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.12)",
            border: `1px solid ${banner === "SOLVED!" ? "rgba(34,197,94,0.4)" : "rgba(6,182,212,0.35)"}`,
            borderRadius: 8, fontSize: 16, fontWeight: 700,
            color: banner === "SOLVED!" ? GREEN : CYAN,
            letterSpacing: "0.12em", animation: "ld-banner 1.2s ease forwards",
          }}>{banner}</div>
        )}

        <svg width={svgW} height={svgH} style={{ overflow: "visible" }}>
          {/* Edges */}
          {edges.map(([fromId, toId]) => {
            const from = nodeMap.get(fromId);
            const to = nodeMap.get(toId);
            if (!from || !to) return null;
            return (
              <line key={`${fromId}-${toId}`}
                x1={nx(from.x)} y1={ny(from.y)}
                x2={nx(to.x)}   y2={ny(to.y)}
                stroke="#2a2a2a" strokeWidth={2}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const cx = nx(node.x);
            const cy = ny(node.y);
            const isFlashing = flashNode === node.id;
            const isShaking = shakeNode === node.id;
            const isTarget = currentStep?.parentId === node.id && !done;
            const r = node.id === "root" ? 16 : 18;

            return (
              <g key={node.id}
                style={{
                  cursor: isTarget ? "pointer" : "default",
                  animation: isShaking ? "ld-shake 0.4s ease" : undefined,
                }}
                onClick={() => handleNodeClick(node.id)}
              >
                {isTarget && (
                  <circle cx={cx} cy={cy} r={r + 7}
                    fill="none" stroke={CYAN} strokeWidth={1.5} opacity={0.35} strokeDasharray="4 3"
                  />
                )}
                <circle cx={cx} cy={cy} r={r}
                  fill={
                    isFlashing ? (flashColor === GREEN ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)")
                    : isTarget ? "rgba(6,182,212,0.12)"
                    : "rgba(255,255,255,0.04)"
                  }
                  stroke={
                    isFlashing ? flashColor
                    : isTarget ? CYAN
                    : node.isEnd ? GOLD
                    : "#3a3a3a"
                  }
                  strokeWidth={isTarget || node.isEnd ? 2 : 1.5}
                  style={{ transition: "fill 0.2s, stroke 0.2s" }}
                />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={node.id === "root" ? 11 : 13} fontWeight={700}
                  fill={isTarget ? CYAN : node.isEnd ? GOLD : "#94a3b8"}
                  fontFamily={FONT}
                  style={{ pointerEvents: "none" }}
                >{node.char}</text>
                {node.isEnd && (
                  <text x={cx + r - 4} y={cy - r + 4} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill={GOLD} style={{ pointerEvents: "none" }}>★</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ padding: "6px 16px 10px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${CYAN}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>CLICK TO INSERT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${GOLD}`, background: "rgba(245,158,11,0.1)" }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>WORD END ★</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#374151", letterSpacing: "0.06em" }}>
          {round.label}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
