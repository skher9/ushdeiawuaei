"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

function makeRound(): { pool: number[]; target: number } {
  const pool = [2, 3, 5, 7, 4, 6, 8, 9];
  const target = 20 + Math.floor(Math.random() * 12);
  return { pool, target };
}

export default function TreasureCombos({ onSolve, onAttempt }: GameProps) {
  const [round, setRound] = useState(() => makeRound());
  const [selection, setSelection] = useState<number[]>([]);
  const [backtracks, setBacktracks] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);

  const currentSum = selection.reduce((a, b) => a + b, 0);
  const { pool, target } = round;

  const addNumber = useCallback(
    (n: number) => {
      if (solved) return;

      if (!hasAttempted.current) {
        hasAttempted.current = true;
        onAttempt();
      }

      const newSelection = [...selection, n];
      const newSum = newSelection.reduce((a, b) => a + b, 0);

      if (newSum > target) {
        setSelection(newSelection);
        setShaking(true);
        setTimeout(() => {
          setSelection([]);
          setShaking(false);
          setBacktracks((b) => b + 1);
        }, 500);
      } else if (newSum === target) {
        setSelection(newSelection);
        setSolved(true);
        setTimeout(() => {
          onSolve();
        }, 800);
      } else {
        setSelection(newSelection);
      }
    },
    [selection, solved, target, onAttempt, onSolve]
  );

  const removeAt = useCallback(
    (index: number) => {
      if (solved || shaking) return;
      const newSelection = selection.filter((_, i) => i !== index);
      setSelection(newSelection);
      setBacktracks((b) => b + 1);
    },
    [selection, solved, shaking]
  );

  const clearSelection = useCallback(() => {
    if (solved) return;
    setSelection([]);
  }, [solved]);

  const newRound = useCallback(() => {
    setRound(makeRound());
    setSelection([]);
    setSolved(false);
    setBacktracks(0);
    hasAttempted.current = false;
  }, []);

  const fillRatio = Math.min(currentSum / target, 1);
  const barColor =
    currentSum > target
      ? "#ef4444"
      : fillRatio > 0.85
      ? "#eab308"
      : "#22c55e";

  let statusMsg = "PICK NUMBERS — REUSE ALLOWED";
  if (shaking) statusMsg = "OVERSHOT — BACKTRACK!";
  else if (solved) statusMsg = "COMBINATION FOUND!";
  else if (currentSum > 0 && currentSum < target)
    statusMsg = `${target - currentSum} MORE NEEDED`;

  const mission = getMission("backtracking", 7);
  const tools = getTools("backtracking");
  const stats: ShellStat[] = [{ label: "SUM", value: currentSum }, { label: "TARGET", value: target }, { label: "BACKTRACKS", value: backtracks, danger: backtracks > 3 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }
        @keyframes pulseGreen {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        .tc-pool-card:hover {
          border-color: #fbbf24 !important;
          box-shadow: 0 0 8px rgba(251,191,36,0.35);
        }
        .tc-chip:hover .tc-chip-x {
          opacity: 1 !important;
        }
        .tc-new-round:hover {
          background: rgba(34,197,94,0.2) !important;
          border-color: rgba(34,197,94,0.6) !important;
        }
        .tc-clear:hover {
          background: rgba(239,68,68,0.12) !important;
          border-color: rgba(239,68,68,0.5) !important;
        }
      `}</style>

        {/* Pool */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {pool.map((n, i) => (
            <button
              key={i}
              className="tc-pool-card"
              onClick={() => addNumber(n)}
              disabled={solved || shaking}
              style={{
                width: 56,
                height: 52,
                background: "#111111",
                border: "1px solid #1e1e1e",
                borderRadius: 6,
                color: "#e5e7eb",
                fontSize: 20,
                fontWeight: 600,
                cursor: solved || shaking ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s, box-shadow 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: solved || shaking ? 0.5 : 1,
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Selection row */}
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: 2, marginBottom: 8 }}>
            YOUR SELECTION
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              background: "#0f0f0f",
              border: "1px solid #1e1e1e",
              borderRadius: 8,
              padding: "8px 12px",
              animation: shaking ? "shake 0.5s ease" : "none",
              borderColor: solved ? "#22c55e" : shaking ? "#ef4444" : "#1e1e1e",
              transition: "border-color 0.2s",
            }}
          >
            {selection.length === 0 && (
              <span style={{ fontSize: 11, color: "#374151", fontStyle: "italic" }}>
                empty — click pool numbers above
              </span>
            )}
            {selection.map((n, i) => (
              <button
                key={i}
                className="tc-chip"
                onClick={() => removeAt(i)}
                disabled={solved || shaking}
                style={{
                  position: "relative",
                  padding: "4px 10px",
                  background: solved
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(251,191,36,0.08)",
                  border: `1px solid ${solved ? "rgba(34,197,94,0.4)" : "rgba(251,191,36,0.25)"}`,
                  borderRadius: 4,
                  color: solved ? "#22c55e" : "#fbbf24",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: solved || shaking ? "default" : "pointer",
                  fontFamily: "inherit",
                  animation: solved ? "pulseGreen 1.2s ease infinite" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {n}
                {!solved && (
                  <span
                    className="tc-chip-x"
                    style={{
                      fontSize: 9,
                      color: "#ef4444",
                      opacity: 0,
                      transition: "opacity 0.15s",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {selection.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 13,
                  color: solved ? "#22c55e" : shaking ? "#ef4444" : "#9ca3af",
                  fontWeight: 600,
                }}
              >
                = {currentSum} / {target}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div
            style={{
              height: 4,
              background: "#1e1e1e",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${fillRatio * 100}%`,
                background: barColor,
                transition: "width 0.2s, background 0.2s",
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              fontSize: 9,
              color: "#4b5563",
            }}
          >
            <span>0</span>
            <span>{target}</span>
          </div>
        </div>

        {/* Controls + status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 520,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: 1 }}>
            BACKTRACKS: {backtracks}
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 2,
              color: solved
                ? "#22c55e"
                : shaking
                ? "#ef4444"
                : "#9ca3af",
            }}
          >
            {statusMsg}
          </div>

          {!solved && (
            <button
              className="tc-clear"
              onClick={clearSelection}
              disabled={selection.length === 0 || shaking}
              style={{
                padding: "4px 12px",
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 4,
                color: "#ef4444",
                fontSize: 9,
                letterSpacing: 2,
                cursor: selection.length === 0 || shaking ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: selection.length === 0 ? 0.4 : 1,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Solved overlay */}
        {solved && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#22c55e",
                letterSpacing: 3,
                animation: "pulseGreen 1.2s ease infinite",
                marginBottom: 14,
              }}
            >
              COMBINATION FOUND
            </div>
            <button
              className="tc-new-round"
              onClick={newRound}
              style={{
                padding: "8px 24px",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 6,
                color: "#22c55e",
                fontSize: 11,
                letterSpacing: 2,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              [ NEW ROUND ]
            </button>
          </div>
        )}
    </div>
    </GameShell>
  );
}
