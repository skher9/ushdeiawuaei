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

type NodeKey = "r5" | "r4" | "r8" | "r11" | "r13" | "r4b" | "r7" | "r2" | "r1b";

interface NodeDef {
  key: NodeKey;
  val: number;
  x: number;
  y: number;
  children: NodeKey[];
  isLeaf: boolean;
}

const NODES: NodeDef[] = [
  { key: "r5",  val: 5,  x: 50, y: 8,  children: ["r4","r8"],  isLeaf: false },
  { key: "r4",  val: 4,  x: 25, y: 28, children: ["r11"],       isLeaf: false },
  { key: "r8",  val: 8,  x: 75, y: 28, children: ["r13","r4b"], isLeaf: false },
  { key: "r11", val: 11, x: 15, y: 52, children: ["r7","r2"],   isLeaf: false },
  { key: "r13", val: 13, x: 62, y: 52, children: [],            isLeaf: true  },
  { key: "r4b", val: 4,  x: 88, y: 52, children: ["r1b"],       isLeaf: false },
  { key: "r7",  val: 7,  x: 8,  y: 76, children: [],            isLeaf: true  },
  { key: "r2",  val: 2,  x: 22, y: 76, children: [],            isLeaf: true  },
  { key: "r1b", val: 1,  x: 94, y: 76, children: [],            isLeaf: true  },
];

const EDGES: [NodeKey, NodeKey][] = [
  ["r5","r4"], ["r5","r8"], ["r4","r11"], ["r8","r13"], ["r8","r4b"],
  ["r11","r7"], ["r11","r2"], ["r4b","r1b"],
];

const TARGET = 22;
const ROOT_KEY: NodeKey = "r5";
const WIN_KEY: NodeKey = "r2";

function getNode(key: NodeKey): NodeDef {
  return NODES.find(n => n.key === key)!;
}

function parentOf(key: NodeKey): NodeKey | null {
  for (const n of NODES) {
    if (n.children.includes(key)) return n.key;
  }
  return null;
}

export default function PathTracer({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [path, setPath] = useState<NodeKey[]>([ROOT_KEY]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [won, setWon] = useState(false);
  const [resetting, setResetting] = useState(false);

  const currentKey = path[path.length - 1];
  const runningSum = path.reduce((s, k) => s + getNode(k).val, 0);
  const currentNode = getNode(currentKey);
  const childKeys = currentNode.children;

  const resetPath = useCallback((msg: { text: string; ok: boolean }) => {
    setMessage(msg);
    setResetting(true);
    setTimeout(() => {
      setPath([ROOT_KEY]);
      setResetting(false);
      setMessage(null);
    }, 1600);
  }, []);

  const handleClick = useCallback((key: NodeKey) => {
    if (won || solvedRef.current || resetting) return;
    if (!childKeys.includes(key)) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const node = getNode(key);
    const newSum = runningSum + node.val;
    const newPath = [...path, key];

    playTone(440 + newPath.length * 40, "sine", 0.1);

    if (node.isLeaf) {
      if (newSum === TARGET) {
        setPath(newPath);
        setWon(true);
        solvedRef.current = true;
        setMessage({ text: `PATH FOUND: 5→4→11→2 = 22`, ok: true });
        setTimeout(() => onSolve(), 1000);
      } else if (newSum > TARGET) {
        playTone(180, "sawtooth", 0.15);
        resetPath({ text: `TOO HIGH: ${newSum} > ${TARGET} — reset to root`, ok: false });
      } else {
        playTone(220, "sawtooth", 0.15);
        resetPath({ text: `WRONG LEAF: sum=${newSum}, need ${TARGET} — reset`, ok: false });
      }
    } else {
      if (newSum > TARGET) {
        playTone(180, "sawtooth", 0.15);
        resetPath({ text: `TOO HIGH: ${newSum} > ${TARGET} — reset to root`, ok: false });
      } else {
        setPath(newPath);
      }
    }
  }, [won, resetting, childKeys, runningSum, path, resetPath, onAttempt, onSolve]);

  const mission = getMission("trees", 8);
  const tools = getTools("trees");
  const stats: ShellStat[] = [{ label: "PATH LEN", value: path.length }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes pt-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.6)} 50%{box-shadow:0 0 0 8px rgba(245,158,11,0)} }
        @keyframes pt-child-glow { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
        @keyframes pt-win { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.8)} 50%{box-shadow:0 0 0 10px rgba(245,158,11,0)} }
      `}</style>

      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>
        PATH TRACER — LC 112
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: "#f59e0b", fontWeight: 700 }}>TARGET: {TARGET}</span>
        <span style={{ color: resetting ? "#ef4444" : "#9ca3af" }}>
          SUM SO FAR: {resetting ? "—" : runningSum}
        </span>
      </div>

      <div style={{ position: "relative", width: 400, height: 280 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {EDGES.map(([a, b]) => {
            const na = NODES.find(n => n.key === a)!;
            const nb = NODES.find(n => n.key === b)!;
            const inPath = path.includes(a) && path.includes(b) &&
              path.indexOf(b) === path.indexOf(a) + 1;
            return (
              <line
                key={`${a}-${b}`}
                x1={`${na.x}%`} y1={`${na.y}%`}
                x2={`${nb.x}%`} y2={`${nb.y}%`}
                stroke={inPath ? "#f59e0b" : "#2a2a2a"}
                strokeWidth={inPath ? 2.5 : 1.5}
              />
            );
          })}
        </svg>

        {NODES.map(({ key, val, x, y }) => {
          const isCurrent = key === currentKey && !resetting;
          const isInPath = path.includes(key);
          const isChild = !resetting && childKeys.includes(key);
          const isWon = won && key === WIN_KEY;
          let bg = "#111111";
          let border = "#2a2a2a";
          let color = "#9ca3af";
          let anim = "none";

          if (isWon) {
            bg = "#1a1200"; border = "#f59e0b"; color = "#f59e0b";
            anim = "pt-win 0.8s ease-in-out infinite";
          } else if (isCurrent) {
            bg = "#1a1200"; border = "#f59e0b"; color = "#f59e0b";
            anim = "pt-pulse 1.4s ease-in-out infinite";
          } else if (isInPath) {
            bg = "#12100a"; border = "#78350f"; color = "#d97706";
          } else if (isChild) {
            bg = "#0a130a"; border = "#22c55e"; color = "#22c55e";
            anim = "pt-child-glow 1.4s ease-in-out infinite";
          }

          const isClickable = isChild && !won && !resetting;

          return (
            <div
              key={key}
              onClick={() => handleClick(key)}
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
                cursor: isClickable ? "pointer" : "default",
                animation: anim,
                transition: "background 0.2s, border-color 0.2s",
                zIndex: 2,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      <div style={{
        fontSize: 11, color: "#4b5563", marginTop: 6,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        {path.map((k, i) => (
          <span key={k} style={{ color: "#6b7280" }}>
            {i > 0 && <span style={{ color: "#374151" }}>→</span>}
            {getNode(k).val}
          </span>
        ))}
      </div>

      <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        {message && (
          <div style={{
            fontSize: 12, padding: "5px 14px", borderRadius: 6,
            background: message.ok ? "#0d2a0d" : "#1a0a0a",
            border: `1px solid ${message.ok ? "#22c55e" : "#ef4444"}`,
            color: message.ok ? "#22c55e" : "#ef4444",
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
    </GameShell>
  );
}
