"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono,'JetBrains Mono',monospace)";

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

const LETTER_COLORS: Record<string, string> = {
  a: "#ef4444", b: "#3b82f6", c: "#22c55e", d: "#f59e0b",
  e: "#a855f7", f: "#06b6d4", g: "#ec4899", h: "#14b8a6",
  i: "#f97316", j: "#8b5cf6", k: "#84cc16", l: "#e11d48",
  m: "#0ea5e9", n: "#d97706", o: "#10b981", p: "#6366f1",
  q: "#f43f5e", r: "#64748b", s: "#7c3aed", t: "#059669",
  u: "#dc2626", v: "#2563eb", w: "#16a34a", x: "#b45309",
  y: "#7c3aed", z: "#0891b2",
};

const PROBLEMS = [
  { s: "cbaebabc", p: "abc" },
  { s: "abab", p: "ab" },
  { s: "acdbacdacb", p: "abc" },
];

function getFreqMap(str: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of str) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

function isAnagram(windowFreq: Map<string, number>, patFreq: Map<string, number>): boolean {
  for (const [c, n] of patFreq) {
    if ((windowFreq.get(c) ?? 0) !== n) return false;
  }
  return true;
}

function findAllAnagrams(s: string, p: string): number[] {
  const results: number[] = [];
  const pf = getFreqMap(p);
  const wf = new Map<string, number>();
  for (let i = 0; i < p.length && i < s.length; i++) wf.set(s[i], (wf.get(s[i]) ?? 0) + 1);
  if (isAnagram(wf, pf)) results.push(0);
  for (let i = p.length; i < s.length; i++) {
    const add = s[i];
    wf.set(add, (wf.get(add) ?? 0) + 1);
    const rem = s[i - p.length];
    const prev = wf.get(rem) ?? 0;
    if (prev <= 1) wf.delete(rem); else wf.set(rem, prev - 1);
    if (isAnagram(wf, pf)) results.push(i - p.length + 1);
  }
  return results;
}

export default function AnagramHunt({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const { s, p } = PROBLEMS[probIdx];
  const patFreq = getFreqMap(p);
  const correctFirst = findAllAnagrams(s, p)[0] ?? -1;

  const [framePos, setFramePos] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const [celebMsg, setCelebMsg] = useState("");
  const solvedRef = useRef(false);

  const windowFreq = useCallback((): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = framePos; i < framePos + p.length && i < s.length; i++) {
      m.set(s[i], (m.get(s[i]) ?? 0) + 1);
    }
    return m;
  }, [framePos, s, p]);

  const currentFreq = windowFreq();
  const isMatch = isAnagram(currentFreq, patFreq);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 1000);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  function handleTileClick(i: number) {
    if (solved) return;
    if (!attempted) { setAttempted(true); onAttempt(); }
    if (i + p.length - 1 >= s.length) return;
    const prev = framePos;
    setFramePos(i);
    if (i !== prev) playTone(300, "sine", 0.08);

    const freq = new Map<string, number>();
    for (let j = i; j < i + p.length; j++) freq.set(s[j], (freq.get(s[j]) ?? 0) + 1);
    if (isAnagram(freq, patFreq)) {
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 900);
      setCelebMsg("ANAGRAM FOUND!");
      playTone(523); setTimeout(() => playTone(659), 100); setTimeout(() => playTone(784), 200);
      if (i === correctFirst || correctFirst === -1) {
        setTimeout(() => setSolved(true), 600);
      }
    } else {
      playTone(250, "triangle", 0.06);
      setCelebMsg("");
    }
  }

  const tileW = 38;
  const frameLeft = framePos * (tileW + 5);

  const mission = getMission("sliding-window", 3);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "STEP", value: framePos }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes frameGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); }
          50% { box-shadow: 0 0 16px 4px rgba(234,179,8,0.6); }
        }
        @keyframes frameGlowGreen {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 24px 8px rgba(34,197,94,0.8); }
        }
        @keyframes celebPop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tileInvalid { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Header */}
{/* Pattern */}
      <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>FIND ANAGRAM OF:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {p.split("").map((c, i) => (
            <div key={i} style={{
              width: 32, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `${LETTER_COLORS[c] ?? "#666"}22`,
              border: `2px solid ${LETTER_COLORS[c] ?? "#666"}`,
              borderRadius: 5, fontSize: 14, fontWeight: 700,
              color: LETTER_COLORS[c] ?? "#ccc",
            }}>{c}</div>
          ))}
        </div>
      </div>

      {/* String tiles with magnifier frame */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        {/* Frame overlay */}
        <div style={{
          position: "absolute",
          top: -4, left: frameLeft - 4,
          width: p.length * (tileW + 5) - 1 + 8,
          height: 54,
          borderRadius: 8,
          border: `2px solid ${flashGreen ? "#22c55e" : "#eab308"}`,
          pointerEvents: "none",
          zIndex: 2,
          transition: "left 0.18s cubic-bezier(0.4,0,0.2,1), border-color 0.2s",
          animation: flashGreen ? "frameGlowGreen 0.5s infinite" : "frameGlow 2s infinite",
        }} />

        {/* Tiles */}
        <div style={{ display: "flex", gap: 5 }}>
          {s.split("").map((c, i) => {
            const inFrame = i >= framePos && i < framePos + p.length;
            const isInvalid = i + p.length - 1 >= s.length;
            const col = LETTER_COLORS[c] ?? "#888";
            return (
              <div key={i} onClick={() => handleTileClick(i)} style={{
                width: tileW, height: 46,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: inFrame
                  ? (flashGreen ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.1)")
                  : `${col}11`,
                border: `1px solid ${inFrame ? (flashGreen ? "rgba(34,197,94,0.4)" : "rgba(234,179,8,0.3)") : `${col}33`}`,
                borderRadius: 5,
                cursor: isInvalid ? "not-allowed" : "pointer",
                transition: "background 0.15s, border 0.15s",
                opacity: isInvalid ? 0.3 : 1,
                position: "relative",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{c}</span>
                <span style={{ fontSize: 7, color: "#374151" }}>{i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Celebration */}
      {celebMsg && (
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#22c55e",
          marginBottom: 10, letterSpacing: "0.1em",
          animation: "celebPop 0.4s ease-out",
        }}>
          {celebMsg}
        </div>
      )}

      {/* Frequency bars */}
      <div style={{
        marginBottom: 16, padding: "10px 16px",
        background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a",
        borderRadius: 6, width: "100%", maxWidth: 500,
      }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>FREQUENCY CHECK:</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[...patFreq.entries()].map(([c, need]) => {
            const have = currentFreq.get(c) ?? 0;
            const ok = have === need;
            const over = have > need;
            const col = LETTER_COLORS[c] ?? "#888";
            return (
              <div key={c} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{c}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: Math.max(need, have) }).map((_, idx) => (
                    <div key={idx} style={{
                      width: 8, height: 14, borderRadius: 2,
                      background: idx < have
                        ? (over ? "#ef4444" : ok ? "#22c55e" : "#eab308")
                        : "#1e1e1e",
                      border: "1px solid #2a2a2a",
                      transition: "background 0.15s",
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 8, color: ok ? "#22c55e" : over ? "#ef4444" : "#475569" }}>
                  {have}/{need}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match status */}
      <div style={{
        fontSize: 10, letterSpacing: "0.08em",
        color: isMatch ? "#22c55e" : "#475569",
        marginBottom: 12,
        padding: "6px 16px",
        background: isMatch ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isMatch ? "rgba(34,197,94,0.25)" : "#1a1a1a"}`,
        borderRadius: 4,
      }}>
        {isMatch ? "ANAGRAM MATCH AT POSITION " + framePos : `WINDOW [${framePos}..${framePos + p.length - 1}] — NOT AN ANAGRAM`}
      </div>

      {solved && (
        <div style={{
          padding: "14px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6,
          fontSize: 11, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 1.8,
        }}>
          FIRST ANAGRAM FOUND AT INDEX {correctFirst}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            FIXED WINDOW · COMPARE FREQ MAPS · O(n) TOTAL
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500, marginTop: 14,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        CLICK TILE TO MOVE FRAME · GREEN BARS = MATCH · FIND POSITION WHERE FRAME IS AN ANAGRAM
      </div>
    </div>
    </GameShell>
  );
}
