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

interface TNode {
  id: string;
  char: string;
  x: number;
  y: number;
  isEnd: boolean;
}

interface RoundData {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  nodes: TNode[];
  edges: [string, string][];
  searchWord: string;
  path: string[];
}

// Round 1: 'cat','car','dog' → search 'cat'
const R1: RoundData = {
  difficulty: "EASY",
  searchWord: "cat",
  path: ["root", "c", "ca", "cat_n"],
  nodes: [
    { id: "root",  char: "·", x: 50, y:  7, isEnd: false },
    { id: "c",     char: "c", x: 30, y: 26, isEnd: false },
    { id: "ca",    char: "a", x: 22, y: 46, isEnd: false },
    { id: "cat_n", char: "t", x: 14, y: 66, isEnd: true  },
    { id: "car_n", char: "r", x: 30, y: 66, isEnd: true  },
    { id: "d",     char: "d", x: 70, y: 26, isEnd: false },
    { id: "do_n",  char: "o", x: 70, y: 46, isEnd: false },
    { id: "dog_n", char: "g", x: 70, y: 66, isEnd: true  },
  ],
  edges: [
    ["root","c"],["root","d"],
    ["c","ca"],["ca","cat_n"],["ca","car_n"],
    ["d","do_n"],["do_n","dog_n"],
  ],
};

// Round 2: 'apple','app','apt' → search 'app' (isEnd node)
const R2: RoundData = {
  difficulty: "MEDIUM",
  searchWord: "app",
  path: ["root", "a", "ap", "app_n"],
  nodes: [
    { id: "root",    char: "·", x: 50, y:  6, isEnd: false },
    { id: "a",       char: "a", x: 50, y: 23, isEnd: false },
    { id: "ap",      char: "p", x: 50, y: 40, isEnd: false },
    { id: "app_n",   char: "p", x: 34, y: 57, isEnd: true  },
    { id: "appl",    char: "l", x: 34, y: 74, isEnd: false },
    { id: "apple_n", char: "e", x: 34, y: 91, isEnd: true  },
    { id: "apt_n",   char: "t", x: 66, y: 57, isEnd: true  },
  ],
  edges: [
    ["root","a"],["a","ap"],
    ["ap","app_n"],["app_n","appl"],["appl","apple_n"],
    ["ap","apt_n"],
  ],
};

// Round 3: 'ball','bat','ban','bar' → search 'bat'
const R3: RoundData = {
  difficulty: "HARD",
  searchWord: "bat",
  path: ["root", "b", "ba", "bat_n"],
  nodes: [
    { id: "root",   char: "·", x: 50, y:  6, isEnd: false },
    { id: "b",      char: "b", x: 50, y: 23, isEnd: false },
    { id: "ba",     char: "a", x: 50, y: 40, isEnd: false },
    { id: "bal",    char: "l", x: 20, y: 57, isEnd: false },
    { id: "ball_n", char: "l", x: 20, y: 74, isEnd: true  },
    { id: "bat_n",  char: "t", x: 40, y: 57, isEnd: true  },
    { id: "ban_n",  char: "n", x: 60, y: 57, isEnd: true  },
    { id: "bar_n",  char: "r", x: 80, y: 57, isEnd: true  },
  ],
  edges: [
    ["root","b"],["b","ba"],
    ["ba","bal"],["bal","ball_n"],
    ["ba","bat_n"],["ba","ban_n"],["ba","bar_n"],
  ],
};

const ROUNDS: RoundData[] = [R1, R2, R3];

export default function WordSeeker({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [pathProgress, setPathProgress] = useState(0);
  const [flashNode, setFlashNode] = useState<string | null>(null);
  const [flashColor, setFlashColor] = useState(GREEN);
  const [shakeNode, setShakeNode] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const round = ROUNDS[roundIdx];
  const expectedNodeId = round.path[pathProgress] ?? null;
  const nodeMap = new Map(round.nodes.map(n => [n.id, n]));

  function triggerAttempt() {
    if (!attemptRef.current) { attemptRef.current = true; onAttempt(); }
  }

  function flash(id: string, color: string) {
    setFlashNode(id); setFlashColor(color);
    setTimeout(() => setFlashNode(null), 350);
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    if (done || !expectedNodeId) return;
    triggerAttempt();

    if (nodeId === expectedNodeId) {
      playCorrect();
      flash(nodeId, GREEN);
      const nextProgress = pathProgress + 1;

      if (nextProgress >= round.path.length) {
        playRoundComplete();
        setBanner(roundIdx < 2 ? "ROUND COMPLETE" : "SOLVED!");
        setTimeout(() => {
          setBanner(null);
          if (roundIdx < 2) {
            setRoundIdx(roundIdx + 1);
            setPathProgress(0);
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
        setPathProgress(nextProgress);
      }
    } else {
      playWrong();
      setShakeNode(nodeId);
      setTimeout(() => setShakeNode(null), 400);
      setPathProgress(0);
    }
  }, [done, expectedNodeId, pathProgress, roundIdx, round]);

  const svgW = 380;
  const svgH = 290;
  function nx(p: number) { return (p / 100) * svgW; }
  function ny(p: number) { return (p / 100) * svgH; }

  const completedPath = new Set(round.path.slice(0, pathProgress));

  const mission = getMission("tries", 3);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: roundIdx + 1 }, { label: "PROGRESS", value: pathProgress }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes ws-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes ws-banner { 0%{opacity:0;transform:translateY(-8px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0} }
        @keyframes ws-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      {/* Search word */}
      <div style={{ padding: "8px 16px", background: "rgba(6,182,212,0.04)", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Search:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {round.searchWord.split("").map((ch, i) => {
            const nodeIdx = i + 1;
            const done_ch = pathProgress > nodeIdx;
            const active_ch = pathProgress === nodeIdx;
            return (
              <span key={i} style={{
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4, fontSize: 14, fontWeight: 700,
                background: done_ch ? "rgba(34,197,94,0.15)" : active_ch ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${done_ch ? "rgba(34,197,94,0.4)" : active_ch ? "rgba(6,182,212,0.5)" : "#2a2a2a"}`,
                color: done_ch ? GREEN : active_ch ? CYAN : "#475569",
              }}>{ch}</span>
            );
          })}
        </div>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {expectedNodeId && pathProgress === 0 ? "Start at root ·" :
           expectedNodeId ? `Next: click '${nodeMap.get(expectedNodeId)?.char ?? "?"}'` :
           ""}
        </span>
      </div>

      {/* SVG */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
        {banner && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 10, padding: "10px 28px",
            background: banner === "SOLVED!" ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.12)",
            border: `1px solid ${banner === "SOLVED!" ? "rgba(34,197,94,0.4)" : "rgba(6,182,212,0.35)"}`,
            borderRadius: 8, fontSize: 16, fontWeight: 700,
            color: banner === "SOLVED!" ? GREEN : CYAN,
            letterSpacing: "0.12em", animation: "ws-banner 1.2s ease forwards",
          }}>{banner}</div>
        )}

        <svg width={svgW} height={svgH} style={{ overflow: "visible" }}>
          {/* Edges */}
          {round.edges.map(([fId, tId]) => {
            const f = nodeMap.get(fId);
            const t = nodeMap.get(tId);
            if (!f || !t) return null;
            const onPath = completedPath.has(fId) && completedPath.has(tId);
            return (
              <line key={`${fId}-${tId}`}
                x1={nx(f.x)} y1={ny(f.y)} x2={nx(t.x)} y2={ny(t.y)}
                stroke={onPath ? CYAN : "#2a2a2a"} strokeWidth={onPath ? 2.5 : 1.5}
                style={{ transition: "stroke 0.25s" }}
              />
            );
          })}

          {/* Nodes */}
          {round.nodes.map(node => {
            const cx = nx(node.x);
            const cy = ny(node.y);
            const isFlashing = flashNode === node.id;
            const isShaking = shakeNode === node.id;
            const isExpected = expectedNodeId === node.id && !done;
            const isOnPath = completedPath.has(node.id);
            const r = node.id === "root" ? 15 : 17;

            return (
              <g key={node.id}
                style={{
                  cursor: isExpected ? "pointer" : "default",
                  animation: isShaking ? "ws-shake 0.4s ease" : undefined,
                }}
                onClick={() => handleNodeClick(node.id)}
              >
                {isExpected && (
                  <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={CYAN}
                    strokeWidth={1.5} opacity={0.3} strokeDasharray="4 3"
                    style={{ animation: "ws-pulse 1.2s ease infinite" }}
                  />
                )}
                <circle cx={cx} cy={cy} r={r}
                  fill={
                    isFlashing ? (flashColor === GREEN ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)")
                    : isOnPath ? "rgba(6,182,212,0.18)"
                    : isExpected ? "rgba(6,182,212,0.1)"
                    : "rgba(255,255,255,0.04)"
                  }
                  stroke={
                    isFlashing ? flashColor
                    : isOnPath ? CYAN
                    : isExpected ? "rgba(6,182,212,0.7)"
                    : node.isEnd ? GOLD
                    : "#3a3a3a"
                  }
                  strokeWidth={isOnPath || isExpected || node.isEnd ? 2 : 1.5}
                  style={{ transition: "fill 0.2s, stroke 0.2s" }}
                />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={node.id === "root" ? 11 : 13} fontWeight={700}
                  fill={isOnPath ? CYAN : isExpected ? "rgba(6,182,212,0.9)" : node.isEnd ? GOLD : "#94a3b8"}
                  fontFamily={FONT} style={{ pointerEvents: "none" }}
                >{node.char}</text>
                {node.isEnd && (
                  <text x={cx + r - 3} y={cy - r + 3} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill={GOLD} style={{ pointerEvents: "none" }}>★</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer legend */}
      <div style={{ padding: "6px 16px 10px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px dashed ${CYAN}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>NEXT NODE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${GOLD}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>WORD END ★</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 22, height: 2, background: CYAN, borderRadius: 1 }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>PATH WALKED</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#374151" }}>
          {pathProgress}/{round.path.length} steps
        </div>
      </div>
    </div>
    </GameShell>
  );
}
