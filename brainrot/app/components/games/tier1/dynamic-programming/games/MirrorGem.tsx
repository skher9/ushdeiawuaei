"use client";
import { useState, useCallback, useRef, useMemo } from "react";
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

const STR = "BBBAB";
const WIN_LEN = 4;

const GEM_COLORS = [
  { base: "#7c3aed", glow: "#a78bfa", dark: "rgba(124,58,237,0.15)" },
  { base: "#0369a1", glow: "#38bdf8", dark: "rgba(3,105,161,0.15)" },
  { base: "#065f46", glow: "#34d399", dark: "rgba(6,95,70,0.15)" },
  { base: "#92400e", glow: "#fbbf24", dark: "rgba(146,64,14,0.15)" },
  { base: "#9f1239", glow: "#fb7185", dark: "rgba(159,18,57,0.15)" },
];

function isPalindrome(chars: string[]): boolean {
  const n = chars.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    if (chars[i] !== chars[n - 1 - i]) return false;
  }
  return true;
}

function computeLPS(s: string): number[][] {
  const n = s.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      if (s[i] === s[j]) {
        dp[i][j] = (len === 2 ? 0 : dp[i + 1][j - 1]) + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

export default function MirrorGem({ onSolve, onAttempt }: GameProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [lastToggled, setLastToggled] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const dpTable = useMemo(() => computeLPS(STR), []);

  const selectedChars = Array.from(selected).sort((a, b) => a - b).map(i => STR[i]);
  const isPalin = selectedChars.length > 0 && isPalindrome(selectedChars);
  const selLen = selectedChars.length;

  const toggle = useCallback((idx: number) => {
    if (solved) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        playTone(300, "sine", 0.1);
      } else {
        next.add(idx);
        const chars = Array.from(next).sort((a, b) => a - b).map(i => STR[i]);
        const palin = isPalindrome(chars);
        playTone(palin ? 550 + idx * 40 : 380 + idx * 30, "sine", 0.14);
      }

      const chars = Array.from(next).sort((a, b) => a - b).map(i => STR[i]);
      const palin = isPalindrome(chars);
      if (palin && chars.length >= WIN_LEN && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        playTone(660, "sine", 0.2);
        setTimeout(() => playTone(880, "sine", 0.25), 180);
        setTimeout(() => playTone(1100, "sine", 0.3), 360);
        setTimeout(() => onSolve(), 1000);
      }

      setLastToggled(idx);
      setTimeout(() => setLastToggled(null), 400);
      return next;
    });
  }, [solved, onAttempt, onSolve]);

  const reset = useCallback(() => {
    setSelected(new Set());
    setSolved(false);
    solvedRef.current = false;
    hasAttempted.current = false;
  }, []);

  const mission = getMission("dynamic-programming", 8);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "LENGTH", value: selLen ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes mg-gem-idle {
          0%,100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.03); }
        }
        @keyframes mg-gem-selected {
          0%,100% { transform: scale(1); filter: brightness(1.2); }
          50% { transform: scale(1.08); filter: brightness(1.5); }
        }
        @keyframes mg-pop {
          0% { transform: scale(0.6); opacity: 0; }
          65% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mg-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes mg-win {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
          50% { box-shadow: 0 0 32px 10px rgba(129,140,248,0.2); }
        }
        @keyframes mg-palin-glow {
          0%,100% { box-shadow: 0 0 4px 1px rgba(74,222,128,0.3); }
          50% { box-shadow: 0 0 14px 4px rgba(74,222,128,0.6); }
        }
        @keyframes mg-dp-fill {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes mg-mirror {
          0%,100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b7280", marginBottom: 4 }}>MIRROR GEM</div>
          <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1 }}>LONGEST PALINDROMIC SUBSEQUENCE — SELECT GEMS</div>
        </div>

        <div style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          fontSize: 10,
          color: "#4b5563",
          letterSpacing: 1,
        }}>
          <span>LENGTH: <span style={{ color: selLen > 0 ? "#818cf8" : "#374151", fontWeight: 700 }}>{selLen}</span></span>
          <span>|</span>
          <span style={{ color: isPalin && selLen > 0 ? "#4ade80" : selLen > 0 ? "#f87171" : "#374151" }}>
            {selLen === 0 ? "SELECT GEMS" : isPalin ? "PALINDROME ✓" : "NOT PALINDROME ✗"}
          </span>
          <span>|</span>
          <span>TARGET: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{WIN_LEN}</span></span>
        </div>

        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "20px 24px",
          background: "rgba(129,140,248,0.03)",
          border: "1px solid #111",
          borderRadius: 12,
        }}>
          {STR.split("").map((ch, idx) => {
            const isSel = selected.has(idx);
            const isLast = lastToggled === idx;
            const color = GEM_COLORS[idx];
            return (
              <div
                key={idx}
                onClick={() => toggle(idx)}
                style={{
                  width: 62,
                  height: 72,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: isSel ? color.dark : "#0d0d0d",
                  border: `2px solid ${isSel ? color.glow : "#1e1e1e"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  color: isSel ? color.glow : "#374151",
                  boxShadow: isSel ? `0 0 12px 2px ${color.glow}55` : "none",
                  animation: isSel
                    ? "mg-gem-selected 1.2s ease-in-out infinite"
                    : isLast
                    ? "mg-pop 0.35s ease"
                    : "mg-gem-idle 2s ease-in-out infinite",
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  animationDelay: `${idx * 0.18}s`,
                }}>
                  {ch}
                </div>
                <div style={{
                  fontSize: 8,
                  color: isSel ? color.glow : "#1f2937",
                  letterSpacing: 1,
                }}>
                  [{idx}]
                </div>
                {isSel && (
                  <div style={{
                    position: "absolute",
                    bottom: -6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color.glow,
                    boxShadow: `0 0 6px 2px ${color.glow}`,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          width: "100%",
          maxWidth: 360,
          minHeight: 52,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "10px 16px",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${isPalin && selLen > 0 ? "rgba(74,222,128,0.3)" : "#111"}`,
          borderRadius: 8,
          animation: isPalin && selLen > 0 ? "mg-palin-glow 1.5s ease-in-out infinite" : "none",
          transition: "border-color 0.2s",
        }}>
          <div style={{ fontSize: 9, color: "#374151", letterSpacing: 2 }}>SELECTED SUBSEQUENCE</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 28 }}>
            {Array.from(selected).sort((a, b) => a - b).map((idx, pos) => {
              const color = GEM_COLORS[idx];
              return (
                <div key={idx} style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  background: color.dark,
                  border: `1.5px solid ${color.glow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: color.glow,
                  animation: "mg-dp-fill 0.25s ease",
                }}>
                  {STR[idx]}
                </div>
              );
            })}
          </div>

          {selLen > 1 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[...selectedChars].reverse().map((ch, pos) => {
                const origIdx = Array.from(selected).sort((a, b) => a - b)[selLen - 1 - pos];
                const color = GEM_COLORS[origIdx];
                return (
                  <div key={pos} style={{
                    width: 26,
                    height: 26,
                    borderRadius: 4,
                    background: color.dark,
                    border: `1.5px solid ${isPalin ? "#4ade8055" : "#f8717155"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: isPalin ? "#4ade80" : "#f87171",
                    animation: "mg-mirror 1.5s ease-in-out infinite",
                  }}>
                    {ch}
                  </div>
                );
              })}
            </div>
          )}
          {selLen > 1 && (
            <div style={{ fontSize: 8, color: "#374151", letterSpacing: 1 }}>↑ REVERSED — {isPalin ? "MATCHES!" : "DOESN'T MATCH"}</div>
          )}
        </div>

        <div style={{
          width: "100%",
          maxWidth: 360,
        }}>
          <div style={{ fontSize: 9, color: "#1f2937", letterSpacing: 2, marginBottom: 6 }}>LPS DP TABLE (BACKGROUND REFERENCE)</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `20px repeat(${STR.length}, 1fr)`,
            gap: 2,
          }}>
            <div />
            {STR.split("").map((ch, c) => (
              <div key={c} style={{ textAlign: "center", fontSize: 9, color: "#2a2a2a", fontWeight: 700 }}>{ch}</div>
            ))}
            {STR.split("").map((ch, r) => (
              <>
                <div key={`row-${r}`} style={{ textAlign: "center", fontSize: 9, color: "#2a2a2a", fontWeight: 700, display: "flex", alignItems: "center" }}>{ch}</div>
                {STR.split("").map((_, c) => {
                  const val = c >= r ? dpTable[r][c] : null;
                  const isWinCell = r === 0 && c === STR.length - 1;
                  return (
                    <div key={`${r}-${c}`} style={{
                      height: 24,
                      background: isWinCell && val !== null ? "rgba(129,140,248,0.12)" : val !== null ? "rgba(255,255,255,0.02)" : "transparent",
                      border: `1px solid ${isWinCell ? "rgba(129,140,248,0.3)" : val !== null ? "#1a1a1a" : "transparent"}`,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: val === WIN_LEN ? 700 : 400,
                      color: val === WIN_LEN ? "#818cf8" : val !== null ? "#2a2a2a" : "transparent",
                      animation: val !== null ? "mg-dp-fill 0.3s ease" : "none",
                    }}>
                      {val ?? ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 9, color: "#1f2937", letterSpacing: 1 }}>
            LPS("BBBAB") = <span style={{ color: "#374151", fontWeight: 700 }}>4</span> ("BBBB")
          </div>
        </div>

        {solved && (
          <div style={{
            textAlign: "center",
            animation: "mg-win 1.5s ease-in-out infinite",
            padding: "12px 24px",
            border: "1px solid rgba(129,140,248,0.3)",
            borderRadius: 8,
            background: "rgba(129,140,248,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", letterSpacing: 3, marginBottom: 4 }}>
              PALINDROME LENGTH {selLen}
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1, marginBottom: 10 }}>
              "{selectedChars.join("")}" READS THE SAME BOTH WAYS
            </div>
            <button
              onClick={reset}
              style={{
                padding: "5px 18px",
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.35)",
                borderRadius: 5,
                color: "#818cf8",
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
