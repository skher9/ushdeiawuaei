"use client";
import { useState, useCallback, useRef } from "react";
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

function playSlice() { playTone(600, "sine", 0.1); }
function playRemove() { playTone(400, "triangle", 0.1); }
function playCorrect() { playTone(880, "sine", 0.15); }
function playWrong() { playTone(200, "sawtooth", 0.2); }
function playRoundDone() {
  playTone(660, "sine", 0.12);
  setTimeout(() => playTone(880, "sine", 0.15), 130);
}
function playSolved() {
  playTone(440, "sine", 0.12);
  setTimeout(() => playTone(660, "sine", 0.12), 140);
  setTimeout(() => playTone(880, "sine", 0.2), 280);
}

interface RoundDef {
  dict: string[];
  str: string;
  solution: number[];
  isImpossible: boolean;
  difficulty: string;
  hint: string;
  minWrongCuts: number;
}

const ROUNDS: RoundDef[] = [
  {
    dict: ["leet", "code"],
    str: "leetcode",
    solution: [3],
    isImpossible: false,
    difficulty: "EASY",
    hint: 'Cut between "t" and "c" → "leet" | "code"',
    minWrongCuts: 0,
  },
  {
    dict: ["apple", "pen", "pineapple", "applepen"],
    str: "applepenapple",
    solution: [4, 7],
    isImpossible: false,
    difficulty: "MEDIUM",
    hint: '"apple" | "pen" | "apple" — find both cut points!',
    minWrongCuts: 0,
  },
  {
    dict: ["cat", "cats", "and", "sand", "dog"],
    str: "catsandog",
    solution: [],
    isImpossible: true,
    difficulty: "HARD",
    hint: 'Try all combinations… none work! Click "NO SOLUTION" to prove it.',
    minWrongCuts: 2,
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "#22c55e", MEDIUM: "#eab308", HARD: "#ef4444",
};

function getSegments(str: string, cuts: number[]): string[] {
  const sorted = [...new Set(cuts)].sort((a, b) => a - b);
  const segs: string[] = [];
  let prev = 0;
  for (const cut of sorted) {
    segs.push(str.slice(prev, cut + 1));
    prev = cut + 1;
  }
  segs.push(str.slice(prev));
  return segs;
}

function validateSegments(segs: string[], dict: Set<string>): boolean[] {
  return segs.map(s => dict.has(s));
}

export default function SentenceSlicer({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [cuts, setCuts] = useState<number[]>([]);
  const [shakeSegs, setShakeSegs] = useState<boolean[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showNoSolution, setShowNoSolution] = useState(false);
  const [successSegs, setSuccessSegs] = useState<boolean[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [validated, setValidated] = useState(false);

  const r = ROUNDS[round];
  const dictSet = new Set(r.dict);
  const segs = getSegments(r.str, cuts);
  const segValidity = validateSegments(segs, dictSet);

  const handleCutClick = useCallback((afterIdx: number) => {
    if (transitioning || validated || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    setCuts(prev => {
      if (prev.includes(afterIdx)) {
        playRemove();
        return prev.filter(c => c !== afterIdx);
      } else {
        playSlice();
        return [...prev, afterIdx];
      }
    });
  }, [transitioning, validated, onAttempt]);

  const handleCheck = useCallback(() => {
    if (transitioning || solvedRef.current || r.isImpossible) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const sortedCuts = [...cuts].sort((a, b) => a - b);
    const sortedSol = [...r.solution].sort((a, b) => a - b);
    const correct = JSON.stringify(sortedCuts) === JSON.stringify(sortedSol);

    if (correct) {
      playCorrect();
      setSuccessSegs(segs.map(() => true));
      setValidated(true);
      setTransitioning(true);
      playRoundDone();
      setBanner("CORRECT SEGMENTATION!");
      setTimeout(() => {
        setBanner(null);
        setSuccessSegs([]);
        setValidated(false);
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
          setCuts([]);
          setWrongAttempts(0);
          setShowNoSolution(false);
        }
      }, 1300);
    } else {
      playWrong();
      setShakeSegs(segValidity.map(v => !v));
      const newWrong = wrongAttempts + 1;
      setWrongAttempts(newWrong);
      setTimeout(() => setShakeSegs([]), 500);
    }
  }, [transitioning, r, cuts, segs, segValidity, wrongAttempts, round, onSolve, onAttempt]);

  const handleTryCuts = useCallback(() => {
    if (transitioning || validated || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    playWrong();
    setShakeSegs(segValidity.map(v => !v));
    const newWrong = wrongAttempts + 1;
    setWrongAttempts(newWrong);
    if (newWrong >= r.minWrongCuts) {
      setShowNoSolution(true);
    }
    setTimeout(() => setShakeSegs([]), 500);
  }, [transitioning, validated, segValidity, wrongAttempts, r.minWrongCuts, onAttempt]);

  const handleNoSolution = useCallback(() => {
    if (!r.isImpossible || transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    playCorrect();
    setValidated(true);
    setTransitioning(true);
    playRoundDone();
    setBanner("CORRECT — NO VALID SEGMENTATION!");
    setTimeout(() => {
      setBanner(null);
      setValidated(false);
      setTransitioning(false);
      if (!solvedRef.current) {
        solvedRef.current = true;
        playSolved();
        setBanner("SOLVED!");
        setTimeout(() => onSolve(), 1000);
      }
    }, 1400);
  }, [r.isImpossible, transitioning, onSolve, onAttempt]);

  const mission = getMission("tries", 7);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "CUTS", value: cuts.length }, { label: "ROUND", value: round + 1 }];

  return (
    <>
      <style>{`
        @keyframes ss-shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)} 40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        @keyframes ss-success {
          0%{background:#14532d} 50%{background:#15803d} 100%{background:#14532d}
        }
        @keyframes ss-banner {
          0%{opacity:0;transform:translate(-50%,-50%) scale(0.85)}
          15%{opacity:1;transform:translate(-50%,-50%) scale(1)}
          80%{opacity:1}
          100%{opacity:0;transform:translate(-50%,-50%) scale(0.95)}
        }
        @keyframes ss-cut-pulse {
          0%,100%{opacity:0.5;transform:scaleY(0.9)} 50%{opacity:1;transform:scaleY(1.05)}
        }
        @keyframes ss-glow {
          0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,0.4)} 50%{box-shadow:0 0 0 5px rgba(6,182,212,0)}
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
            background: banner.includes("SOLVED") ? "#eab308" : banner.includes("NO VALID") ? "#22c55e" : "#06b6d4",
            color: "#0a0a0f", padding: "10px 24px", borderRadius: 10,
            fontWeight: 700, fontSize: 18, zIndex: 10, letterSpacing: 1,
            animation: "ss-banner 1.4s ease forwards",
            whiteSpace: "nowrap", textAlign: "center",
          }}>{banner}</div>
        )}

        {/* Dictionary */}
        <div style={{ background: "#111827", borderRadius: 7, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>DICTIONARY</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {r.dict.map(w => (
              <div key={w} style={{
                padding: "3px 10px", borderRadius: 4, fontSize: 13, fontWeight: 700,
                background: "#0e7490", color: "#67e8f9",
              }}>{w}</div>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div style={{ fontSize: 10, color: "#64748b", background: "#111827", padding: "5px 10px", borderRadius: 5 }}>
          {r.hint}
        </div>

        {/* Letter tiles with cut zones */}
        <div style={{ background: "#111827", borderRadius: 8, padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>
            Click between letters to add a cut · Click again to remove
          </div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
            {Array.from(r.str).map((ch, i) => {
              const sortedCuts = [...cuts].sort((a, b) => a - b);
              let segIdx = 0;
              for (const cut of sortedCuts) {
                if (i > cut) segIdx++;
                else break;
              }
              const isValid = segValidity[segIdx];
              const isSuccess = successSegs[segIdx];
              const isShaking = shakeSegs[segIdx];

              return (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {/* Letter tile */}
                  <div style={{
                    width: 32, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 5, fontSize: 18, fontWeight: 700,
                    background: isSuccess ? "#14532d" : "#1e293b",
                    color: isSuccess ? "#22c55e" : "#e2e8f0",
                    border: `2px solid ${isSuccess ? "#22c55e" : "#374151"}`,
                    animation: isShaking ? "ss-shake 0.4s ease" : isSuccess ? "ss-success 0.6s ease" : "none",
                    transition: "background 0.2s, border-color 0.2s",
                  }}>{ch}</div>

                  {/* Cut zone (between tiles, not after last) */}
                  {i < r.str.length - 1 && (
                    <div
                      onClick={() => handleCutClick(i)}
                      style={{
                        width: 18, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", position: "relative",
                      }}
                    >
                      {cuts.includes(i) ? (
                        <div style={{
                          width: 3, height: 44, background: "#06b6d4", borderRadius: 2,
                          boxShadow: "0 0 8px #06b6d4",
                          animation: "ss-cut-pulse 1.5s infinite",
                        }} />
                      ) : (
                        <div style={{
                          width: 2, height: 30, background: "#1e293b", borderRadius: 1,
                          transition: "background 0.15s",
                        }} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Segment preview */}
          {cuts.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {segs.map((seg, i) => {
                const valid = segValidity[i];
                const isShaking = shakeSegs[i];
                const isSuccess = successSegs[i];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{
                      padding: "3px 10px", borderRadius: 5, fontSize: 13, fontWeight: 700,
                      background: isSuccess ? "#14532d" : "#1e293b",
                      color: isSuccess ? "#22c55e" : "#cbd5e1",
                      border: `1.5px solid ${isSuccess ? "#22c55e" : "#374151"}`,
                      animation: isShaking ? "ss-shake 0.4s ease" : "none",
                    }}>{seg}</div>
                    <div style={{
                      fontSize: 11,
                      color: isSuccess ? "#22c55e" : valid ? "#22c55e" : "#ef4444",
                    }}>
                      {isSuccess ? "✓" : valid ? "✓" : "✗"}
                    </div>
                    {i < segs.length - 1 && (
                      <div style={{ color: "#06b6d4", fontSize: 16, fontWeight: 700 }}>|</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {!r.isImpossible && (
            <button
              onClick={handleCheck}
              disabled={cuts.length === 0 || transitioning}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                cursor: cuts.length === 0 || transitioning ? "not-allowed" : "pointer",
                background: cuts.length > 0 && !transitioning ? "#06b6d4" : "#1e293b",
                color: cuts.length > 0 && !transitioning ? "#0a0a0f" : "#374151",
                fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: 1,
                transition: "background 0.2s",
              }}
            >CHECK CUTS</button>
          )}

          {r.isImpossible && (
            <>
              <button
                onClick={handleTryCuts}
                disabled={transitioning || validated}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                  cursor: transitioning || validated ? "not-allowed" : "pointer",
                  background: !transitioning && !validated ? "#1e3a5f" : "#1e293b",
                  color: !transitioning && !validated ? "#93c5fd" : "#374151",
                  fontFamily: "monospace", fontWeight: 700, fontSize: 13, letterSpacing: 1,
                  transition: "background 0.2s",
                }}
              >TRY CUTS</button>

              <button
                onClick={handleNoSolution}
                disabled={!showNoSolution || transitioning || validated}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                  cursor: showNoSolution && !transitioning && !validated ? "pointer" : "not-allowed",
                  background: showNoSolution && !transitioning && !validated ? "#ef4444" : "#1e293b",
                  color: showNoSolution && !transitioning && !validated ? "#fff" : "#374151",
                  fontFamily: "monospace", fontWeight: 700, fontSize: 13, letterSpacing: 1,
                  transition: "background 0.2s",
                  animation: showNoSolution && !validated ? "ss-glow 1.5s infinite" : "none",
                }}
              >
                {showNoSolution ? "NO SOLUTION" : `TRY ${Math.max(0, r.minWrongCuts - wrongAttempts)} MORE...`}
              </button>
            </>
          )}

          {cuts.length > 0 && !validated && (
            <button
              onClick={() => { setCuts([]); playRemove(); }}
              disabled={transitioning}
              style={{
                padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#1e293b", color: "#64748b",
                fontFamily: "monospace", fontWeight: 700, fontSize: 13,
              }}
            >CLEAR</button>
          )}
        </div>

        {r.isImpossible && (
          <div style={{ fontSize: 10, color: "#64748b", textAlign: "center" }}>
            {wrongAttempts < r.minWrongCuts
              ? `Try at least ${r.minWrongCuts - wrongAttempts} more cut attempt${r.minWrongCuts - wrongAttempts !== 1 ? "s" : ""} to unlock NO SOLUTION`
              : "NO SOLUTION is now available — does any valid segmentation exist?"}
          </div>
        )}
      </div>
    </GameShell>
    </>
  );
}
