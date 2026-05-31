"use client";
import { useState, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FONT = "var(--font-mono,'JetBrains Mono',monospace)";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";

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

function playWrongTone() { playTone(180, "sawtooth", 0.18); }
function playStepTone(step: number) { playTone(440 + step * 60, "sine", 0.1); }
function playInsertChord() {
  [440, 554, 659].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 80));
}

interface TNode {
  val: number; x: number; y: number;
  left: number | null; right: number | null;
}

const BASE: Record<number, TNode> = {
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

const QUEUE = [5, 11, 2];

interface InsertPath {
  navNodes: number[];
  parentVal: number;
  dir: "left" | "right";
  x: number; y: number;
}

const PATHS: Record<number, InsertPath> = {
  5:  { navNodes: [8, 3, 6, 4], parentVal: 4,  dir: "right", x: 36, y: 94 },
  11: { navNodes: [8, 10, 14],  parentVal: 14, dir: "left",  x: 77, y: 95 },
  2:  { navNodes: [8, 3, 1],    parentVal: 1,  dir: "right", x: 20, y: 95 },
};

function getEdges(nodes: Record<number, TNode>): [number, number][] {
  const out: [number, number][] = [];
  for (const n of Object.values(nodes)) {
    if (n.left !== null && nodes[n.left]) out.push([n.val, n.left]);
    if (n.right !== null && nodes[n.right]) out.push([n.val, n.right]);
  }
  return out;
}

export default function SeedPlanter({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [nodes, setNodes] = useState<Record<number, TNode>>({ ...BASE });
  const [queue, setQueue] = useState<number[]>([...QUEUE]);
  const [navIndex, setNavIndex] = useState(0);
  const [inserted, setInserted] = useState<number[]>([]);
  const [shaking, setShaking] = useState<number | null>(null);
  const [dropping, setDropping] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  const curVal = queue[0] ?? null;
  const path = curVal !== null ? PATHS[curVal] : null;
  const visitedPath = path ? path.navNodes.slice(0, navIndex) : [];
  const currentNavNode = path ? path.navNodes[navIndex] ?? null : null;
  const atSlot = path !== null && navIndex >= path.navNodes.length;

  function attempt() {
    if (!attemptRef.current) { attemptRef.current = true; onAttempt(); }
  }

  function shake(v: number) {
    setShaking(v); setTimeout(() => setShaking(null), 400);
  }

  function doInsert() {
    if (!path || curVal === null) return;
    playInsertChord();
    const { parentVal, dir, x, y } = path;
    const newNode: TNode = { val: curVal, x, y, left: null, right: null };
    setDropping(curVal);
    setTimeout(() => setDropping(null), 600);
    setNodes(prev => {
      const u = { ...prev, [curVal]: newNode };
      u[parentVal] = {
        ...u[parentVal],
        left: dir === "left" ? curVal : u[parentVal].left,
        right: dir === "right" ? curVal : u[parentVal].right,
      };
      return u;
    });
    setInserted(prev => [...prev, curVal]);
    const newQ = queue.slice(1);
    setQueue(newQ);
    setNavIndex(0);
    if (newQ.length === 0) {
      setTimeout(() => {
        if (!solvedRef.current) { solvedRef.current = true; setWon(true); onSolve(); }
      }, 1000);
    }
  }

  function handleNodeClick(val: number) {
    if (won || curVal === null || path === null) return;
    attempt();

    if (atSlot) { shake(val); playWrongTone(); return; }

    if (val !== currentNavNode) { shake(val); playWrongTone(); return; }

    const nextNavIndex = navIndex + 1;
    if (nextNavIndex >= path.navNodes.length) {
      playStepTone(navIndex);
      setNavIndex(nextNavIndex);
    } else {
      playStepTone(navIndex);
      setNavIndex(nextNavIndex);
    }
  }

  function handleSlotClick() {
    if (won || curVal === null || path === null || !atSlot) return;
    attempt();
    doInsert();
  }

  const edges = getEdges(nodes);
  const W = 400, H = 280;

  function nc(val: number): { bg: string; border: string; color: string } {
    if (inserted.includes(val)) return { bg: "rgba(34,197,94,0.12)", border: GREEN, color: GREEN };
    if (visitedPath.includes(val)) return { bg: "rgba(245,158,11,0.18)", border: AMBER, color: AMBER };
    if (val === currentNavNode) return { bg: "rgba(245,158,11,0.22)", border: AMBER, color: "#e2e8f0" };
    return { bg: "#1a1a1a", border: "#2a2a2a", color: "#94a3b8" };
  }

  const hint = path && !atSlot && currentNavNode !== null
    ? `navigate: click ${currentNavNode} (${curVal} ${curVal! < currentNavNode ? "<" : ">"} ${currentNavNode})`
    : atSlot ? "click the dashed slot to insert!" : "";

  const mission = getMission("trees", 1);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "INSERTED", value: inserted.length }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(-50%) translateY(-50%)}25%{transform:translateX(calc(-50% - 4px)) translateY(-50%)}75%{transform:translateX(calc(-50% + 4px)) translateY(-50%)}}
        @keyframes drop{0%{opacity:0;transform:translateX(-50%) translateY(calc(-50% - 18px))}100%{opacity:1;transform:translateX(-50%) translateY(-50%)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)}50%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}
        @keyframes slotPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.6)}50%{box-shadow:0 0 0 10px rgba(245,158,11,0)}}
      `}</style>

      {won ? (
        <div style={{ textAlign: "center", padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: GREEN, letterSpacing: "0.1em" }}>BST UPDATED</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Inserted: {QUEUE.map(v => `+${v}`).join(", ")} — all values placed correctly</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>BST INSERT</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: AMBER, letterSpacing: "0.06em" }}>
            INSERT: <span style={{ color: "#e2e8f0" }}>{curVal}</span>
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            remaining: {queue.slice(1).join(", ") || "—"} · inserted: {inserted.join(", ") || "—"}
          </div>
        </div>
      )}

      <div style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {edges.map(([a, b]) => {
            const na = nodes[a], nb = nodes[b];
            if (!na || !nb) return null;
            const inTrail = visitedPath.includes(a) && visitedPath.includes(b);
            return <line key={`${a}-${b}`} x1={`${na.x}%`} y1={`${na.y}%`} x2={`${nb.x}%`} y2={`${nb.y}%`} stroke={inTrail ? AMBER : "#2a2a2a"} strokeWidth={inTrail ? 1.5 : 1} />;
          })}
          {atSlot && path && nodes[path.parentVal] && (
            <line x1={`${nodes[path.parentVal].x}%`} y1={`${nodes[path.parentVal].y}%`} x2={`${path.x}%`} y2={`${path.y}%`} stroke={AMBER} strokeWidth={1} strokeDasharray="4,3" />
          )}
        </svg>

        {Object.values(nodes).map(n => {
          const c = nc(n.val);
          const isShake = shaking === n.val;
          const isDrop = dropping === n.val;
          const isCurrent = n.val === currentNavNode && !atSlot;
          return (
            <div key={n.val} onClick={() => handleNodeClick(n.val)} style={{
              position: "absolute", left: `${n.x}%`, top: `${n.y}%`,
              transform: "translateX(-50%) translateY(-50%)",
              width: 36, height: 36, borderRadius: "50%",
              background: c.bg, border: `2px solid ${c.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: c.color, cursor: "pointer",
              animation: isShake ? "shake 0.4s ease" : isDrop ? "drop 0.5s ease" : isCurrent ? "pulse 1.4s ease-in-out infinite" : "none",
              transition: "background 0.15s, border-color 0.15s", zIndex: 2,
            }}>{n.val}</div>
          );
        })}

        {atSlot && path && curVal !== null && (
          <div onClick={handleSlotClick} style={{
            position: "absolute", left: `${path.x}%`, top: `${path.y}%`,
            transform: "translateX(-50%) translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(245,158,11,0.1)", border: `2px dashed ${AMBER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: AMBER, cursor: "pointer",
            animation: "slotPulse 1s ease-in-out infinite", zIndex: 2,
          }}>{curVal}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 10, color: "#374151", letterSpacing: "0.06em" }}>
          PATH: {visitedPath.join(" → ")}{atSlot ? " → [?]" : currentNavNode !== null ? ` → ${currentNavNode}` : ""}
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>{hint}</div>
      </div>
    </div>
    </GameShell>
  );
}
