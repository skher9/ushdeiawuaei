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

interface PrefixCheck {
  prefix: string;
  exists: boolean;
  path: string[];
  breakAt?: { nodeId: string; missingChar: string };
}

interface RoundData {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  nodes: TNode[];
  edges: [string, string][];
  checks: PrefixCheck[];
}

// Round 1: 'team','tea','ten'
// Check 'te' → YES, 'ta' → NO
const R1: RoundData = {
  difficulty: "EASY",
  nodes: [
    { id: "root", char: "·", x: 50, y:  7, isEnd: false },
    { id: "t",    char: "t", x: 50, y: 25, isEnd: false },
    { id: "te",   char: "e", x: 50, y: 44, isEnd: false },
    { id: "tea",  char: "a", x: 35, y: 63, isEnd: true  },
    { id: "team", char: "m", x: 35, y: 82, isEnd: true  },
    { id: "ten",  char: "n", x: 65, y: 63, isEnd: true  },
  ],
  edges: [["root","t"],["t","te"],["te","tea"],["tea","team"],["te","ten"]],
  checks: [
    { prefix: "te", exists: true,  path: ["root","t","te"] },
    { prefix: "ta", exists: false, path: ["root","t"], breakAt: { nodeId: "t", missingChar: "a" } },
  ],
};

// Round 2: 'search','sea','see','set'
// Check 'sea' → YES, 'sec' → NO
const R2: RoundData = {
  difficulty: "MEDIUM",
  nodes: [
    { id: "root",  char: "·", x: 50, y:  5, isEnd: false },
    { id: "s",     char: "s", x: 50, y: 22, isEnd: false },
    { id: "se",    char: "e", x: 50, y: 39, isEnd: false },
    { id: "sea_n", char: "a", x: 27, y: 57, isEnd: true  },
    { id: "sear",  char: "r", x: 18, y: 74, isEnd: false },
    { id: "searc", char: "c", x: 18, y: 91, isEnd: false },
    { id: "see_n", char: "e", x: 50, y: 57, isEnd: true  },
    { id: "set_n", char: "t", x: 73, y: 57, isEnd: true  },
  ],
  edges: [
    ["root","s"],["s","se"],["se","sea_n"],["se","see_n"],["se","set_n"],
    ["sea_n","sear"],["sear","searc"],
  ],
  checks: [
    { prefix: "sea", exists: true,  path: ["root","s","se","sea_n"] },
    { prefix: "sec", exists: false, path: ["root","s","se"], breakAt: { nodeId: "se", missingChar: "c" } },
  ],
};

// Round 3: 'interview','inter','internal','internet'
// Check 'inter' → YES, 'intern' → YES
const R3: RoundData = {
  difficulty: "HARD",
  nodes: [
    { id: "root",       char: "·", x: 50, y:  4, isEnd: false },
    { id: "i",          char: "i", x: 50, y: 16, isEnd: false },
    { id: "in",         char: "n", x: 50, y: 28, isEnd: false },
    { id: "int",        char: "t", x: 50, y: 40, isEnd: false },
    { id: "inte",       char: "e", x: 50, y: 52, isEnd: false },
    { id: "inter",      char: "r", x: 50, y: 64, isEnd: true  },
    { id: "intern",     char: "n", x: 30, y: 76, isEnd: true  },
    { id: "interna",    char: "a", x: 20, y: 88, isEnd: false },
    { id: "internal",   char: "l", x: 10, y: 96, isEnd: true  },
    { id: "interv",     char: "v", x: 70, y: 76, isEnd: false },
    { id: "intervi",    char: "i", x: 80, y: 88, isEnd: false },
    { id: "internet_n", char: "t", x: 30, y: 96, isEnd: true  },
  ],
  edges: [
    ["root","i"],["i","in"],["in","int"],["int","inte"],["inte","inter"],
    ["inter","intern"],["inter","interv"],
    ["intern","interna"],["interna","internal"],["interna","internet_n"],
    ["interv","intervi"],
  ],
  checks: [
    { prefix: "inter",  exists: true, path: ["root","i","in","int","inte","inter"] },
    { prefix: "intern", exists: true, path: ["root","i","in","int","inte","inter","intern"] },
  ],
};

const ROUNDS: RoundData[] = [R1, R2, R3];

type Phase = "walking" | "result";

export default function PrefixScout({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [checkIdx, setCheckIdx] = useState(0);
  const [pathProgress, setPathProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("walking");
  const [checkResult, setCheckResult] = useState<"found" | "missing" | null>(null);
  const [flashNode, setFlashNode] = useState<string | null>(null);
  const [flashColor, setFlashColor] = useState(GREEN);
  const [shakeNode, setShakeNode] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const round = ROUNDS[roundIdx];
  const check = round.checks[checkIdx];
  const nodeMap = new Map(round.nodes.map(n => [n.id, n]));

  const expectedNodeId = check.path[pathProgress] ?? null;
  const completedPath = new Set(check.path.slice(0, pathProgress));

  function triggerAttempt() {
    if (!attemptRef.current) { attemptRef.current = true; onAttempt(); }
  }

  function flash(id: string, color: string) {
    setFlashNode(id); setFlashColor(color);
    setTimeout(() => setFlashNode(null), 350);
  }

  function advanceToNextCheck() {
    const nextCheckIdx = checkIdx + 1;
    if (nextCheckIdx >= round.checks.length) {
      playRoundComplete();
      setBanner(roundIdx < 2 ? "ROUND COMPLETE" : "SOLVED!");
      setTimeout(() => {
        setBanner(null);
        if (roundIdx < 2) {
          const next = roundIdx + 1;
          setRoundIdx(next);
          setCheckIdx(0);
          setPathProgress(0);
          setPhase("walking");
          setCheckResult(null);
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
      setCheckIdx(nextCheckIdx);
      setPathProgress(0);
      setPhase("walking");
      setCheckResult(null);
    }
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    if (done || phase !== "walking" || !expectedNodeId) return;
    triggerAttempt();

    if (nodeId === expectedNodeId) {
      playCorrect();
      flash(nodeId, GREEN);
      const nextProgress = pathProgress + 1;

      if (check.breakAt && nodeId === check.breakAt.nodeId) {
        setPathProgress(nextProgress);
        setPhase("result");
        setCheckResult("missing");
        playWrong();
        setTimeout(advanceToNextCheck, 1400);
      } else if (nextProgress >= check.path.length) {
        setPathProgress(nextProgress);
        setPhase("result");
        setCheckResult("found");
        playRoundComplete();
        setTimeout(advanceToNextCheck, 1400);
      } else {
        setPathProgress(nextProgress);
      }
    } else {
      playWrong();
      setShakeNode(nodeId);
      setTimeout(() => setShakeNode(null), 400);
      setPathProgress(0);
    }
  }, [done, phase, expectedNodeId, pathProgress, check, checkIdx, roundIdx]);

  const svgW = 380;
  const svgH = 285;
  function nx(p: number) { return (p / 100) * svgW; }
  function ny(p: number) { return (p / 100) * svgH; }

  const prefixChars = check.prefix.split("");

  const mission = getMission("tries", 2);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: roundIdx + 1 }, { label: "STEP", value: checkIdx }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes ps-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes ps-banner { 0%{opacity:0;transform:translateY(-8px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0} }
        @keyframes ps-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes ps-result-in { 0%{opacity:0;transform:scale(0.85)} 100%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Check indicator */}
      <div style={{ padding: "8px 16px", background: "rgba(6,182,212,0.04)", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Prefix:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {prefixChars.map((ch, i) => {
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
        {phase === "result" && checkResult && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
            borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
            background: checkResult === "found" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${checkResult === "found" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: checkResult === "found" ? GREEN : RED,
            animation: "ps-result-in 0.3s ease",
          }}>
            {checkResult === "found" ? "✓ EXISTS" : "✗ NOT FOUND"}
          </div>
        )}
        {phase === "walking" && (
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Check {checkIdx + 1}/{round.checks.length}
          </span>
        )}
      </div>

      {/* SVG */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
        {banner && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 10, padding: "10px 28px",
            background: banner === "SOLVED!" ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.12)",
            border: `1px solid ${banner === "SOLVED!" ? "rgba(34,197,94,0.4)" : "rgba(6,182,212,0.35)"}`,
            borderRadius: 8, fontSize: 16, fontWeight: 700,
            color: banner === "SOLVED!" ? GREEN : CYAN,
            letterSpacing: "0.12em", animation: "ps-banner 1.2s ease forwards",
          }}>{banner}</div>
        )}

        <svg width={svgW} height={svgH} style={{ overflow: "visible" }}>
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

          {round.nodes.map(node => {
            const cx = nx(node.x);
            const cy = ny(node.y);
            const isFlashing = flashNode === node.id;
            const isShaking = shakeNode === node.id;
            const isExpected = expectedNodeId === node.id && phase === "walking" && !done;
            const isOnPath = completedPath.has(node.id);
            const r = node.id === "root" ? 13 : 14;
            const isBreakNode = phase === "result" && checkResult === "missing" && check.breakAt?.nodeId === node.id;

            return (
              <g key={node.id}
                style={{
                  cursor: isExpected ? "pointer" : "default",
                  animation: isShaking ? "ps-shake 0.4s ease" : undefined,
                }}
                onClick={() => handleNodeClick(node.id)}
              >
                {isExpected && (
                  <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke={CYAN}
                    strokeWidth={1.5} opacity={0.3} strokeDasharray="4 3"
                    style={{ animation: "ps-pulse 1.2s ease infinite" }}
                  />
                )}
                {isBreakNode && (
                  <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={RED}
                    strokeWidth={1.5} opacity={0.4}
                  />
                )}
                <circle cx={cx} cy={cy} r={r}
                  fill={
                    isFlashing ? (flashColor === GREEN ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)")
                    : isBreakNode ? "rgba(239,68,68,0.1)"
                    : isOnPath ? "rgba(6,182,212,0.18)"
                    : isExpected ? "rgba(6,182,212,0.1)"
                    : "rgba(255,255,255,0.04)"
                  }
                  stroke={
                    isFlashing ? flashColor
                    : isBreakNode ? RED
                    : isOnPath ? CYAN
                    : isExpected ? "rgba(6,182,212,0.7)"
                    : node.isEnd ? GOLD
                    : "#3a3a3a"
                  }
                  strokeWidth={isOnPath || isExpected || node.isEnd || isBreakNode ? 2 : 1.5}
                  style={{ transition: "fill 0.2s, stroke 0.2s" }}
                />
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={node.id === "root" ? 10 : 11} fontWeight={700}
                  fill={isOnPath ? CYAN : isExpected ? "rgba(6,182,212,0.9)" : node.isEnd ? GOLD : "#94a3b8"}
                  fontFamily={FONT} style={{ pointerEvents: "none" }}
                >{node.char}</text>
                {node.isEnd && (
                  <text x={cx + r - 2} y={cy - r + 2} textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fill={GOLD} style={{ pointerEvents: "none" }}>★</text>
                )}
                {isBreakNode && check.breakAt && (
                  <text x={cx + r + 8} y={cy} textAnchor="start" dominantBaseline="middle"
                    fontSize={10} fill={RED} fontFamily={FONT} style={{ pointerEvents: "none" }}
                  >no '{check.breakAt.missingChar}'</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer */}
      <div style={{ padding: "6px 16px 10px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px dashed ${CYAN}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>NEXT CLICK</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 22, height: 2, background: CYAN, borderRadius: 1 }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>PATH TRACED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${RED}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>MISSING CHILD</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#374151" }}>
          step {pathProgress}/{check.path.length}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
