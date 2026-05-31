"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playCorrect() { playTone(880, "sine", 0.15); }
function playWrong() { playTone(200, "sawtooth", 0.2); }
function playStep() { playTone(440 + Math.random() * 200, "sine", 0.1); }
function playRoundDone() {
  playTone(660, "sine", 0.12);
  setTimeout(() => playTone(880, "sine", 0.15), 130);
}
function playSolved() {
  playTone(440, "sine", 0.12);
  setTimeout(() => playTone(660, "sine", 0.12), 140);
  setTimeout(() => playTone(880, "sine", 0.2), 280);
}

interface TrieNode {
  char: string;
  children: TrieNode[];
  isEnd: boolean;
  id: string;
}

function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { char: "·", children: [], isEnd: false, id: "root" };
  for (const word of words) {
    let node = root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      let child = node.children.find(c => c.char === ch);
      if (!child) {
        child = { char: ch, children: [], isEnd: false, id: `${node.id}-${ch}` };
        node.children.push(child);
      }
      if (i === word.length - 1) child.isEnd = true;
      node = child;
    }
  }
  return root;
}

interface RoundDef {
  words: string[];
  lcp: string;
  stopReason: string;
  difficulty: string;
  hint: string;
}

const ROUNDS: RoundDef[] = [
  {
    words: ["flow", "flower", "flight"],
    lcp: "fl",
    stopReason: "fork",
    difficulty: "EASY",
    hint: "Navigate root→f→l, then STOP at the fork (o vs i).",
  },
  {
    words: ["interview", "inter", "internal"],
    lcp: "inter",
    stopReason: "end-or-fork",
    difficulty: "MEDIUM",
    hint: "Go all the way to 'r', then STOP — 'inter' ends here AND there's a fork.",
  },
  {
    words: ["a", "ab", "abc"],
    lcp: "a",
    stopReason: "is_end",
    difficulty: "HARD",
    hint: "Stop at the FIRST is_end node — 'a' itself is a complete word!",
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "#22c55e", MEDIUM: "#eab308", HARD: "#ef4444",
};

interface LayoutNode {
  node: TrieNode;
  x: number;
  y: number;
  depth: number;
  path: string;
}

function layoutTrie(root: TrieNode, svgW: number, svgH: number): LayoutNode[] {
  const result: LayoutNode[] = [];
  const levelHeight = Math.min(50, (svgH - 40) / 8);
  const startY = 30;

  function measure(node: TrieNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((s, c) => s + measure(c), 0);
  }

  function place(node: TrieNode, depth: number, xMin: number, xMax: number, path: string) {
    const x = (xMin + xMax) / 2;
    const y = startY + depth * levelHeight;
    result.push({ node, x, y, depth, path });
    if (node.children.length === 0) return;
    const total = measure(node);
    let cur = xMin;
    for (const child of node.children) {
      const fraction = measure(child) / total;
      const childW = (xMax - xMin) * fraction;
      place(child, depth + 1, cur, cur + childW, path + child.char);
      cur += childW;
    }
  }

  place(root, 0, 20, svgW - 20, "");
  return result;
}

export default function CommonFork({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"build" | "navigate">("build");
  const [buildIdx, setBuildIdx] = useState(0);
  const [playerPath, setPlayerPath] = useState<string[]>(["root"]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [svgSize] = useState({ w: 420, h: 220 });

  const r = ROUNDS[round];
  const buildCount = buildIdx + 1 > r.words.length ? r.words.length : buildIdx + 1 <= 0 ? 0 : buildIdx + 1;
  const trie = buildTrie(r.words.slice(0, buildCount));
  const fullTrie = buildTrie(r.words);
  const layout = layoutTrie(phase === "navigate" ? fullTrie : trie, svgSize.w, svgSize.h);

  useEffect(() => {
    if (phase !== "build") return;
    if (buildIdx >= r.words.length) {
      setTimeout(() => setPhase("navigate"), 600);
      return;
    }
    const t = setTimeout(() => setBuildIdx(i => i + 1), 700);
    return () => clearTimeout(t);
  }, [phase, buildIdx, r.words.length]);

  useEffect(() => {
    setPhase("build");
    setBuildIdx(0);
    setPlayerPath(["root"]);
    setWrongId(null);
  }, [round]);

  const currentNodeId = playerPath[playerPath.length - 1];
  const currentLayoutNode = layout.find(n => n.node.id === currentNodeId);

  const handleNodeClick = useCallback((ln: LayoutNode) => {
    if (phase !== "navigate" || transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const node = ln.node;
    if (node.id === currentNodeId) return;
    if (!currentLayoutNode) return;

    const currentNode = currentLayoutNode.node;
    const isDirectChild = currentNode.children.some(c => c.id === node.id);
    if (!isDirectChild) {
      playWrong();
      setWrongId(node.id);
      setTimeout(() => setWrongId(null), 500);
      return;
    }

    playStep();
    setPlayerPath(prev => [...prev, node.id]);
  }, [phase, transitioning, currentNodeId, currentLayoutNode, onAttempt]);

  const handleStop = useCallback(() => {
    if (phase !== "navigate" || transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const pathChars = playerPath
      .filter(id => id !== "root")
      .map(id => {
        const found = layout.find(n => n.node.id === id);
        return found ? found.node.char : "";
      })
      .join("");

    if (pathChars === r.lcp) {
      playCorrect();
      setBanner(`LCP = "${r.lcp}" ✓`);
      setTransitioning(true);
      playRoundDone();
      setTimeout(() => {
        setBanner(null);
        setTransitioning(false);
        if (round + 1 >= ROUNDS.length) {
          if (!solvedRef.current) {
            solvedRef.current = true;
            playSolved();
            setBanner("SOLVED!");
            setTimeout(() => onSolve(), 1000);
          }
        } else {
          setRound(r2 => r2 + 1);
        }
      }, 1400);
    } else {
      playWrong();
      setWrongId("stop-btn");
      setTimeout(() => setWrongId(null), 500);
    }
  }, [phase, transitioning, playerPath, layout, r.lcp, round, onSolve, onAttempt]);

  const navigatedChars = playerPath
    .filter(id => id !== "root")
    .map(id => {
      const found = layout.find(n => n.node.id === id);
      return found ? found.node.char : "";
    })
    .join("");

  const mission = getMission("tries", 5);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: round + 1 }];

  return (
    <>
      <style>{`
        @keyframes cf-shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-3px)} 80%{transform:translateX(3px)}
        }
        @keyframes cf-pop {
          0%{transform:scale(1)} 40%{transform:scale(1.3)} 100%{transform:scale(1)}
        }
        @keyframes cf-banner {
          0%{opacity:0;transform:translate(-50%,-50%) scale(0.85)}
          15%{opacity:1;transform:translate(-50%,-50%) scale(1)}
          80%{opacity:1}
          100%{opacity:0;transform:translate(-50%,-50%) scale(0.95)}
        }
        @keyframes cf-build-in {
          from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)}
        }
      `}</style>
      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
        {banner && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            background: banner.includes("SOLVED") ? "#eab308" : "#06b6d4",
            color: "#0a0a0f", padding: "10px 24px", borderRadius: 10,
            fontWeight: 700, fontSize: 20, zIndex: 10, letterSpacing: 2,
            animation: "cf-banner 1.4s ease forwards",
            whiteSpace: "nowrap",
          }}>{banner}</div>
        )}

        {/* Words being inserted */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.words.map((w, i) => (
            <div key={w} style={{
              padding: "3px 10px", borderRadius: 5, fontSize: 13, fontWeight: 700,
              background: phase === "build" && i < buildIdx ? "#0e7490"
                : phase === "navigate" ? "#0e7490"
                : i === buildIdx ? "#164e63"
                : "#1e293b",
              color: (phase === "build" && i < buildIdx) || phase === "navigate" ? "#67e8f9" : i === buildIdx ? "#a5f3fc" : "#475569",
              transition: "background 0.3s",
            }}>{w}</div>
          ))}
        </div>

        {/* Hint */}
        <div style={{ fontSize: 10, color: "#64748b", background: "#111827", padding: "5px 10px", borderRadius: 5 }}>
          {phase === "build" ? `Building trie… inserting "${r.words[Math.min(buildIdx, r.words.length - 1)]}"` : r.hint}
        </div>

        {/* SVG Trie */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <svg
            width="100%" height="100%"
            viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
            style={{ overflow: "visible" }}
          >
            {/* Edges */}
            {layout.map(ln => {
              const node = ln.node;
              return node.children.map(child => {
                const childLayout = layout.find(l => l.node.id === child.id);
                if (!childLayout) return null;
                const inPath = playerPath.includes(ln.node.id) && playerPath.includes(child.id);
                return (
                  <line
                    key={`${node.id}-${child.id}`}
                    x1={ln.x} y1={ln.y} x2={childLayout.x} y2={childLayout.y}
                    stroke={inPath ? "#06b6d4" : "#1e293b"}
                    strokeWidth={inPath ? 2.5 : 1.5}
                    style={{ transition: "stroke 0.3s" }}
                  />
                );
              });
            })}

            {/* Nodes */}
            {layout.map(ln => {
              const isInPath = playerPath.includes(ln.node.id);
              const isCurrent = ln.node.id === currentNodeId && phase === "navigate";
              const isWrong = wrongId === ln.node.id;
              const isClickable = phase === "navigate" && !transitioning
                && currentLayoutNode?.node.children.some(c => c.id === ln.node.id);
              const isRoot = ln.node.id === "root";

              let fill = "#1e293b";
              if (isInPath) fill = "#0e7490";
              if (isCurrent) fill = "#06b6d4";
              if (isWrong) fill = "#ef4444";

              return (
                <g
                  key={ln.node.id}
                  onClick={() => isClickable ? handleNodeClick(ln) : undefined}
                  style={{
                    cursor: isClickable ? "pointer" : "default",
                    animation: isWrong ? "cf-shake 0.4s ease" : isCurrent && phase === "navigate" ? "cf-pop 0.3s ease" : "none",
                  }}
                >
                  <circle
                    cx={ln.x} cy={ln.y} r={isRoot ? 13 : 14}
                    fill={fill}
                    stroke={isCurrent ? "#67e8f9" : isClickable ? "#06b6d4" : isInPath ? "#0284c7" : "#374151"}
                    strokeWidth={isCurrent ? 2.5 : isClickable ? 2 : 1.5}
                    style={{ transition: "fill 0.2s, stroke 0.2s" }}
                  />
                  <text
                    x={ln.x} y={ln.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isInPath || isCurrent ? "#e2e8f0" : "#64748b"}
                    fontSize={isRoot ? 10 : 13}
                    fontFamily="monospace"
                    fontWeight="700"
                  >{ln.node.char}</text>
                  {ln.node.isEnd && (
                    <circle cx={ln.x + 10} cy={ln.y - 10} r={4} fill="#eab308" />
                  )}
                  {isClickable && (
                    <circle cx={ln.x} cy={ln.y} r={18} fill="none" stroke="#06b6d4" strokeWidth={1} opacity={0.4} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Navigation status + STOP button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>Path: </span>
            <span style={{ color: "#06b6d4", fontWeight: 700, letterSpacing: 2 }}>
              root{navigatedChars ? " → " + navigatedChars.split("").join(" → ") : ""}
            </span>
          </div>
          {phase === "navigate" && (
            <button
              onClick={handleStop}
              style={{
                padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer",
                background: wrongId === "stop-btn" ? "#ef4444" : "#eab308",
                color: "#0a0a0f", fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                animation: wrongId === "stop-btn" ? "cf-shake 0.4s ease" : "none",
                letterSpacing: 1,
              }}
            >STOP HERE</button>
          )}
        </div>

        {phase === "navigate" && (
          <div style={{ fontSize: 10, color: "#475569", textAlign: "center" }}>
            Click nodes downward · Hit STOP when you reach the fork or first word-end
            {r.words[0] === "a" ? " · Gold dot = is_end" : ""}
          </div>
        )}
      </div>
    </GameShell>
    </>
  );
}
