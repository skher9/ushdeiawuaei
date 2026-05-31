"use client";
import { useState, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FONT = "var(--font-mono,'JetBrains Mono',monospace)";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "#60a5fa";

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

function playLevelDone() {
  [440, 554, 659].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 70));
}

function playWinChord() {
  [392, 494, 587, 698].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.22), i * 80));
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

const LEVELS: number[][] = [[8], [3, 10], [1, 6, 14], [4, 7, 13]];

const LEVEL_TONES = [
  [330, 370],
  [392, 440, 494],
  [262, 294, 330, 370],
];

export default function LevelRain({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [clickedInLevel, setClickedInLevel] = useState<number[]>([]);
  const [completedLevels, setCompletedLevels] = useState<number[][]>([]);
  const [processedNodes, setProcessedNodes] = useState<number[]>([]);
  const [shakeNode, setShakeNode] = useState<number | null>(null);
  const [dropNode, setDropNode] = useState<number | null>(null);
  const [levelBanner, setLevelBanner] = useState<string | null>(null);
  const [won, setWon] = useState(false);

  const currentLevel = LEVELS[currentLevelIdx] ?? [];
  const nextExpected = currentLevel[clickedInLevel.length] ?? null;

  function triggerAttempt() {
    if (!attemptRef.current) {
      attemptRef.current = true;
      onAttempt();
    }
  }

  function handleNodeClick(val: number) {
    if (won) return;
    triggerAttempt();

    if (processedNodes.includes(val)) return;

    if (!currentLevel.includes(val)) {
      setShakeNode(val);
      setTimeout(() => setShakeNode(null), 400);
      playWrongTone();
      return;
    }

    if (val !== nextExpected) {
      setShakeNode(val);
      setTimeout(() => setShakeNode(null), 400);
      playWrongTone();
      return;
    }

    const toneIndex = clickedInLevel.length;
    const levelTones = LEVEL_TONES[currentLevelIdx];
    if (levelTones && toneIndex < levelTones.length) {
      playTone(levelTones[toneIndex], "sine", 0.14);
    } else {
      playTone(440 + toneIndex * 40, "sine", 0.14);
    }

    setDropNode(val);
    setTimeout(() => setDropNode(null), 500);

    const newClickedInLevel = [...clickedInLevel, val];
    setClickedInLevel(newClickedInLevel);

    if (newClickedInLevel.length === currentLevel.length) {
      const newProcessed = [...processedNodes, ...currentLevel];
      setProcessedNodes(newProcessed);
      const newCompleted = [...completedLevels, currentLevel];
      setCompletedLevels(newCompleted);

      const nextLevelIdx = currentLevelIdx + 1;

      if (nextLevelIdx >= LEVELS.length) {
        playWinChord();
        setLevelBanner(`LEVEL ${currentLevelIdx + 1} COMPLETE`);
        setTimeout(() => {
          setLevelBanner(null);
          if (!solvedRef.current) {
            solvedRef.current = true;
            setWon(true);
            onSolve();
          }
        }, 1200);
      } else {
        playLevelDone();
        setLevelBanner(`LEVEL ${currentLevelIdx + 1} COMPLETE`);
        setTimeout(() => {
          setLevelBanner(null);
          setCurrentLevelIdx(nextLevelIdx);
          setClickedInLevel([]);
        }, 1000);
      }
    }
  }

  const W = 400;
  const H = 280;

  function nodeStyle(val: number): { bg: string; border: string; color: string } {
    if (processedNodes.includes(val)) return { bg: "rgba(34,197,94,0.12)", border: GREEN, color: GREEN };
    if (clickedInLevel.includes(val)) return { bg: "rgba(34,197,94,0.2)", border: GREEN, color: GREEN };
    if (currentLevel.includes(val)) return { bg: "rgba(245,158,11,0.12)", border: AMBER, color: AMBER };
    return { bg: "#1a1a1a", border: "#2a2a2a", color: "#94a3b8" };
  }

  const queue = currentLevel.filter(v => !clickedInLevel.includes(v));

  const mission = getMission("trees", 4);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "LEVEL", value: currentLevelIdx }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(-50%) translateY(-50%)} 25%{transform:translateX(calc(-50% - 4px)) translateY(-50%)} 75%{transform:translateX(calc(-50% + 4px)) translateY(-50%)} }
        @keyframes dropOff { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(20px);opacity:0} }
        @keyframes glow { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)} 50%{box-shadow:0 0 0 8px rgba(245,158,11,0)} }
        @keyframes bannerIn { 0%{opacity:0;transform:translateY(-8px)} 100%{opacity:1;transform:translateY(0)} }
      `}</style>

      {won ? (
        <div style={{ textAlign: "center", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>BFS COMPLETE</div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em", marginBottom: 4 }}>BFS ORDER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {LEVELS.map((lvl, i) => (
              <div key={i} style={{ fontSize: 12, color: AMBER }}>
                [{lvl.join(", ")}]
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>LEVEL-ORDER BFS</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            LEVEL <span style={{ color: AMBER }}>{currentLevelIdx + 1}</span> / {LEVELS.length}
            &nbsp;·&nbsp; click left to right
          </div>
        </div>
      )}

      {levelBanner && (
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, letterSpacing: "0.1em", animation: "bannerIn 0.3s ease" }}>
          {levelBanner}
        </div>
      )}

      <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([from, to]) => {
            const bothDone = processedNodes.includes(from) || processedNodes.includes(to);
            return (
              <line
                key={`${from}-${to}`}
                x1={`${TREE[from].x}%`} y1={`${TREE[from].y}%`}
                x2={`${TREE[to].x}%`} y2={`${TREE[to].y}%`}
                stroke={bothDone ? "rgba(34,197,94,0.25)" : "#2a2a2a"}
                strokeWidth={1}
              />
            );
          })}
        </svg>

        {Object.values(TREE).map(n => {
          const s = nodeStyle(n.val);
          const isShaking = shakeNode === n.val;
          const isActive = currentLevel.includes(n.val) && !clickedInLevel.includes(n.val) && !processedNodes.includes(n.val);
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
                cursor: processedNodes.includes(n.val) ? "default" : "pointer",
                animation: isShaking ? "shake 0.4s ease" : isActive ? "glow 1.4s ease-in-out infinite" : "none",
                transition: "background 0.15s, border-color 0.15s",
                zIndex: 2,
                opacity: processedNodes.includes(n.val) ? 0.6 : 1,
              }}
            >
              {n.val}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.06em" }}>QUEUE</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minHeight: 32 }}>
          {queue.length > 0 ? queue.map(v => (
            <div key={v} style={{ width: 30, height: 30, borderRadius: 4, background: "rgba(245,158,11,0.1)", border: `1px solid ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: AMBER }}>
              {v}
            </div>
          )) : (
            <div style={{ fontSize: 11, color: "#374151" }}>—</div>
          )}
        </div>
      </div>

      {!won && completedLevels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.06em" }}>BFS ORDER</div>
          <div style={{ display: "flex", gap: 8 }}>
            {completedLevels.map((lvl, i) => (
              <div key={i} style={{ fontSize: 11, color: GREEN }}>
                [{lvl.join(",")}]
              </div>
            ))}
          </div>
        </div>
      )}

      {!won && (
        <div style={{ fontSize: 10, color: "#475569", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
          glowing nodes = current level · click them left to right
        </div>
      )}
    </div>
    </GameShell>
  );
}
