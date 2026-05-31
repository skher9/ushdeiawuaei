"use client";
import { useState, useCallback, useEffect } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FIGHTERS = ["ALPHA", "BETA", "GAMMA", "DELTA"];
const COLORS = ["#3b82f6", "#f97316", "#a855f7", "#22c55e"];

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomTarget(): number[] {
  const base = [0, 1, 2, 3];
  let t = shuffle(base);
  while (t.every((v, i) => v === base[i])) {
    t = shuffle(base);
  }
  return t;
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.every((v, i) => v === b[i]);
}

export default function TheLineup({ onSolve, onAttempt }: GameProps) {
  const [target, setTarget] = useState<number[]>(() => randomTarget());
  const [current, setCurrent] = useState<number[]>([0, 1, 2, 3]);
  const [selected, setSelected] = useState<number | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const newChallenge = useCallback(() => {
    setTarget(randomTarget());
    setCurrent([0, 1, 2, 3]);
    setSelected(null);
    setSwapCount(0);
    setSolved(false);
    setHasAttempted(false);
  }, []);

  const handleCardClick = useCallback(
    (index: number) => {
      if (solved) return;

      if (selected === null) {
        setSelected(index);
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      // Execute swap
      const next = [...current];
      [next[selected], next[index]] = [next[index], next[selected]];
      setCurrent(next);
      setSelected(null);
      const newCount = swapCount + 1;
      setSwapCount(newCount);

      if (!hasAttempted) {
        onAttempt();
        setHasAttempted(true);
      }

      if (arraysEqual(next, target)) {
        setSolved(true);
        setTimeout(() => onSolve(), 800);
      }
    },
    [solved, selected, current, swapCount, hasAttempted, target, onAttempt, onSolve]
  );

  const pluralS = swapCount === 1 ? "" : "S";

  const mission = getMission("backtracking", 6);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [{ label: "SWAPS", value: swapCount }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Target row */}
      <div style={{ marginTop: 28, width: "100%", maxWidth: 440 }}>
        <div
          style={{
            fontSize: 10,
            color: "#eab308",
            letterSpacing: 2,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          TARGET:
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {target.map((fighterIdx, pos) => (
            <FighterCard
              key={pos}
              name={FIGHTERS[fighterIdx]}
              color={COLORS[fighterIdx]}
              variant="target"
              selected={false}
              solved={false}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 32 }} />

      {/* Current row */}
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            letterSpacing: 2,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          CURRENT:
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {current.map((fighterIdx, pos) => (
            <FighterCard
              key={pos}
              name={FIGHTERS[fighterIdx]}
              color={COLORS[fighterIdx]}
              variant="current"
              selected={selected === pos}
              solved={solved}
              onClick={() => handleCardClick(pos)}
            />
          ))}
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          marginTop: 28,
          width: "100%",
          maxWidth: 440,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: "#475569" }}>
          {solved ? (
            <span style={{ color: "#22c55e", fontWeight: 600, letterSpacing: 1 }}>
              ARRANGEMENT MATCHED — {swapCount} SWAP{pluralS}
            </span>
          ) : (
            <span style={{ color: "#64748b" }}>SWAPS: {swapCount}</span>
          )}
        </div>
        <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1 }}>
          PERMUTATION SPACE: 4! = 24
        </div>
      </div>

      {/* New Challenge button */}
      {solved && (
        <button
          onClick={newChallenge}
          style={{
            marginTop: 20,
            padding: "9px 24px",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            color: "#22c55e",
            fontFamily: "inherit",
            letterSpacing: 2,
            fontWeight: 600,
          }}
        >
          [ NEW CHALLENGE ]
        </button>
      )}

      {/* Hint when nothing selected */}
      {!solved && selected === null && swapCount === 0 && (
        <div style={{ marginTop: 16, fontSize: 9, color: "#1e293b", letterSpacing: 1 }}>
          CLICK A FIGHTER TO SELECT, THEN CLICK ANOTHER TO SWAP
        </div>
      )}
      {!solved && selected !== null && (
        <div style={{ marginTop: 16, fontSize: 9, color: "#22d3ee", letterSpacing: 1 }}>
          {FIGHTERS[current[selected]]} SELECTED — CLICK ANOTHER FIGHTER TO SWAP
        </div>
      )}
    </div>
    </GameShell>
  );
}

interface FighterCardProps {
  name: string;
  color: string;
  variant: "target" | "current";
  selected: boolean;
  solved: boolean;
  onClick: () => void;
}

function FighterCard({ name, color, variant, selected, solved, onClick }: FighterCardProps) {
  const isTarget = variant === "target";

  let borderColor: string;
  let bgColor: string;

  if (isTarget) {
    borderColor = "#eab308";
    bgColor = "rgba(234,179,8,0.06)";
  } else if (solved) {
    borderColor = "#22c55e";
    bgColor = "rgba(34,197,94,0.08)";
  } else if (selected) {
    borderColor = "#22d3ee";
    bgColor = "rgba(34,211,238,0.1)";
  } else {
    borderColor = "rgba(255,255,255,0.08)";
    bgColor = "rgba(255,255,255,0.03)";
  }

  return (
    <div
      onClick={isTarget ? undefined : onClick}
      style={{
        width: 80,
        height: 88,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 6,
        background: bgColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: isTarget ? "default" : "pointer",
        transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
        boxShadow: selected
          ? `0 0 12px rgba(34,211,238,0.25)`
          : solved
          ? `0 0 12px rgba(34,197,94,0.2)`
          : "none",
        flexShrink: 0,
        animation: solved ? "pulse-green 1s ease-in-out" : "none",
      }}
    >
      {/* Fighter icon (colored square) */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          background: color,
          opacity: 0.85,
          marginBottom: 8,
        }}
      />
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: selected ? "#22d3ee" : isTarget ? "#eab308" : "#94a3b8",
          fontFamily: "inherit",
        }}
      >
        {name}
      </div>
    </div>
  );
}
