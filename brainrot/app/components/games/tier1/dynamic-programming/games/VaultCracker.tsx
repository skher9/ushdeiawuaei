"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

const HOUSE_VALUES = [2, 7, 9, 3, 1, 6, 4];

function computeOptimal(vals: number[]): number {
  if (vals.length === 0) return 0;
  if (vals.length === 1) return vals[0];
  let prev2 = vals[0];
  let prev1 = Math.max(vals[0], vals[1]);
  for (let i = 2; i < vals.length; i++) {
    const cur = Math.max(prev1, prev2 + vals[i]);
    prev2 = prev1;
    prev1 = cur;
  }
  return prev1;
}

const OPTIMAL = computeOptimal(HOUSE_VALUES);

type Decision = "rob" | "skip" | null;

export default function VaultCracker({ onSolve, onAttempt }: GameProps) {
  const [decisions, setDecisions] = useState<Decision[]>(new Array(HOUSE_VALUES.length).fill(null));
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastRobbed, setLastRobbed] = useState(-2);
  const [alarmIdx, setAlarmIdx] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const decide = useCallback((action: "rob" | "skip") => {
    if (finished || current >= HOUSE_VALUES.length) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    if (action === "rob" && current === lastRobbed + 1) {
      setAlarmIdx(current);
      playTone(110, "sawtooth", 0.3);
      setTimeout(() => setAlarmIdx(null), 600);
      return;
    }

    const newDecisions = [...decisions];
    newDecisions[current] = action;
    setDecisions(newDecisions);

    let newTotal = total;
    let newLastRobbed = lastRobbed;

    if (action === "rob") {
      newTotal = total + HOUSE_VALUES[current];
      newLastRobbed = current;
      playTone(440 + current * 40, "sine", 0.15);
    } else {
      playTone(220, "sine", 0.08);
    }

    setTotal(newTotal);
    setLastRobbed(newLastRobbed);

    const nextIdx = current + 1;
    setCurrent(nextIdx);

    if (nextIdx >= HOUSE_VALUES.length) {
      setFinished(true);
      if (newTotal === OPTIMAL && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        playTone(660, "sine", 0.25);
        setTimeout(() => playTone(880, "sine", 0.3), 180);
        setTimeout(() => onSolve(), 1000);
      } else {
        playTone(180, "sawtooth", 0.35);
      }
    }
  }, [current, decisions, finished, lastRobbed, total, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setDecisions(new Array(HOUSE_VALUES.length).fill(null));
    setCurrent(0);
    setTotal(0);
    setLastRobbed(-2);
    setAlarmIdx(null);
    setFinished(false);
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const dpRow: number[] = [];
  {
    let p2 = -1, p1 = -1;
    for (let i = 0; i < HOUSE_VALUES.length; i++) {
      if (decisions[i] === null) break;
      const v = HOUSE_VALUES[i];
      let cur: number;
      if (i === 0) cur = decisions[0] === "rob" ? v : 0;
      else if (i === 1) cur = Math.max(decisions[0] === "rob" ? HOUSE_VALUES[0] : 0, decisions[1] === "rob" ? v : (decisions[0] === "rob" ? HOUSE_VALUES[0] : 0));
      else cur = Math.max(p1, p2 + (decisions[i] === "rob" ? v : 0));
      p2 = p1;
      p1 = cur;
      dpRow.push(cur);
    }
  }

  const mission = getMission("dynamic-programming", 2);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "TOTAL", value: total }];

  return (
    <>
      <style>{`
        @keyframes vc-alarm {
          0%,100% { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }
          25%,75% { background: rgba(239,68,68,0.3); border-color: #ef4444; }
        }
        @keyframes vc-rob-pop {
          0% { transform: scale(1); }
          35% { transform: scale(1.12) translateY(-4px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes vc-coin-fly {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.7); }
        }
        @keyframes vc-pulse-win {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); }
          50% { box-shadow: 0 0 16px 4px rgba(129,140,248,0.2); }
        }
        @keyframes vc-shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-5px); }
          40%,80% { transform: translateX(5px); }
        }
        .vc-rob-btn:hover { background: rgba(234,179,8,0.18) !important; border-color: rgba(234,179,8,0.7) !important; }
        .vc-skip-btn:hover { background: rgba(100,116,139,0.25) !important; border-color: rgba(100,116,139,0.6) !important; }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>
            VAULT CRACKER
          </div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>
            ROB HOUSES — NO TWO ADJACENT · REACH OPTIMAL: ${OPTIMAL}
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
          width: "100%",
          maxWidth: 580,
        }}>
          {HOUSE_VALUES.map((val, i) => {
            const dec = decisions[i];
            const isActive = i === current && !finished;
            const isAlarm = alarmIdx === i;
            const isRobbed = dec === "rob";
            const isSkipped = dec === "skip";
            const isFuture = i > current;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  opacity: isFuture ? 0.45 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{
                  width: 68,
                  minHeight: 88,
                  borderRadius: 8,
                  background: isAlarm
                    ? "rgba(239,68,68,0.2)"
                    : isRobbed
                    ? "rgba(234,179,8,0.1)"
                    : isSkipped
                    ? "rgba(55,65,81,0.3)"
                    : isActive
                    ? "rgba(129,140,248,0.08)"
                    : "#0e0e0e",
                  border: `1px solid ${
                    isAlarm ? "#ef4444"
                    : isRobbed ? "rgba(234,179,8,0.5)"
                    : isSkipped ? "#374151"
                    : isActive ? "rgba(129,140,248,0.5)"
                    : "#1e1e1e"
                  }`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 4px",
                  position: "relative",
                  animation: isAlarm
                    ? "vc-alarm 0.3s ease infinite, vc-shake 0.3s ease"
                    : isRobbed
                    ? "vc-rob-pop 0.35s ease"
                    : "none",
                  transition: "background 0.2s, border-color 0.2s",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 2 }}>
                    {isRobbed ? "💰" : isSkipped ? "🏠" : isActive ? "👁️" : "🏠"}
                  </div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isRobbed ? "#eab308" : isSkipped ? "#4b5563" : isActive ? "#818cf8" : "#6b7280",
                  }}>
                    ${val}
                  </div>
                  {isActive && !finished && (
                    <div style={{
                      position: "absolute",
                      top: -10,
                      fontSize: 8,
                      color: "#818cf8",
                      letterSpacing: 1,
                      background: "#0a0a0a",
                      padding: "1px 4px",
                      borderRadius: 2,
                    }}>
                      NOW
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: 9,
                  color: dec !== null ? "#818cf8" : "#2a2a2a",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  minHeight: 13,
                }}>
                  {dpRow[i] !== undefined ? `best:$${dpRow[i]}` : ""}
                </div>

                <div style={{ fontSize: 8, color: "#374151" }}>{i}</div>
              </div>
            );
          })}
        </div>

        {!finished && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            background: "#0e0e0e",
            border: "1px solid #1e1e1e",
            borderRadius: 10,
            padding: "14px 24px",
            width: "100%",
            maxWidth: 360,
          }}>
            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: 2 }}>
              HOUSE {current}: ${HOUSE_VALUES[current]} — YOUR CALL
            </div>
            {alarmIdx !== null && (
              <div style={{ fontSize: 10, color: "#ef4444", letterSpacing: 1, animation: "vc-alarm 0.3s ease infinite" }}>
                ⚠ ADJACENT ROB — ALARM TRIGGERED
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="vc-rob-btn"
                onClick={() => decide("rob")}
                style={{
                  padding: "10px 20px",
                  background: "rgba(234,179,8,0.08)",
                  border: "1px solid rgba(234,179,8,0.35)",
                  borderRadius: 6,
                  color: "#eab308",
                  fontSize: 11,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                💰 ROB
              </button>
              <button
                className="vc-skip-btn"
                onClick={() => decide("skip")}
                style={{
                  padding: "10px 20px",
                  background: "rgba(55,65,81,0.15)",
                  border: "1px solid rgba(55,65,81,0.4)",
                  borderRadius: 6,
                  color: "#9ca3af",
                  fontSize: 11,
                  letterSpacing: 2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                🚶 SKIP
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 24, fontSize: 12, fontWeight: 600 }}>
          <div style={{ color: "#9ca3af" }}>
            YOUR TOTAL: <span style={{ color: "#eab308" }}>${total}</span>
          </div>
          <div style={{ color: "#6b7280" }}>
            OPTIMAL: <span style={{ color: finished ? "#818cf8" : "#374151" }}>
              {finished ? `$${OPTIMAL}` : "?"}
            </span>
          </div>
        </div>

        {finished && (
          <div style={{ textAlign: "center" }}>
            {solved ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#818cf8",
                  letterSpacing: 3,
                  marginBottom: 4,
                  animation: "vc-pulse-win 1.5s ease-in-out infinite",
                }}>
                  OPTIMAL HAUL — ${total}
                </div>
                <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1 }}>
                  dp CONFIRMS: {OPTIMAL}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", letterSpacing: 2, marginBottom: 4 }}>
                  SUBOPTIMAL — GOT ${total}, DP SAYS ${OPTIMAL}
                </div>
                <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: 1 }}>
                  TRY AGAIN — OPTIMAL PATH: ROB HOUSES WITH MAX NON-ADJACENT SUM
                </div>
              </div>
            )}
            <button
              onClick={reset}
              style={{
                padding: "6px 20px",
                background: solved ? "rgba(129,140,248,0.1)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${solved ? "rgba(129,140,248,0.4)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 6,
                color: solved ? "#818cf8" : "#ef4444",
                fontSize: 10,
                letterSpacing: 2,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              [ RESET ]
            </button>
          </div>
        )}
      </div>
    </GameShell>
    </>
  );
}
