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

const PROBLEMS = [
  { s: "cbaebabc", p: "abc" },
  { s: "abab", p: "ab" },
  { s: "baa", p: "aa" },
];

const LETTER_COLORS: Record<string, string> = {
  a: "#ef4444", b: "#3b82f6", c: "#22c55e", d: "#f59e0b",
  e: "#a855f7", f: "#06b6d4", g: "#ec4899",
};

function getColor(c: string) { return LETTER_COLORS[c] ?? "#94a3b8"; }

function getFreqMap(str: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of str) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

function isAnagram(wf: Map<string, number>, pf: Map<string, number>): boolean {
  for (const [c, n] of pf) { if ((wf.get(c) ?? 0) !== n) return false; }
  return true;
}

function findAllAnagrams(s: string, p: string): number[] {
  const results: number[] = [];
  const pf = getFreqMap(p);
  const wf = new Map<string, number>();
  for (let i = 0; i < p.length && i < s.length; i++) wf.set(s[i], (wf.get(s[i]) ?? 0) + 1);
  if (s.length >= p.length && isAnagram(wf, pf)) results.push(0);
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

interface Particle { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; }

export default function AllAnagrams({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const { s, p } = PROBLEMS[probIdx];
  const pf = getFreqMap(p);
  const allCorrect = findAllAnagrams(s, p);

  const totalWindows = s.length - p.length + 1;

  const [framePos, setFramePos] = useState(0);
  const [foundSet, setFoundSet] = useState<Set<number>>(new Set());
  const [glowPos, setGlowPos] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [earlyFinishError, setEarlyFinishError] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [windowFreq, setWindowFreq] = useState<Map<string, number>>(() => {
    const wf = new Map<string, number>();
    for (let i = 0; i < p.length && i < s.length; i++) wf.set(s[i], (wf.get(s[i]) ?? 0) + 1);
    return wf;
  });
  const solvedRef = useRef(false);
  const particleIdRef = useRef(0);

  const traversalDone = framePos + p.length - 1 >= s.length - 1;

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1200);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function advance() {
    if (solved || traversalDone) return;
    doAttempt();

    const newPos = framePos + 1;
    // Slide window freq: remove s[framePos], add s[framePos + p.length]
    const newFreq = new Map(windowFreq);
    const remChar = s[framePos];
    const addChar = s[framePos + p.length];
    const rPrev = newFreq.get(remChar) ?? 0;
    if (rPrev <= 1) newFreq.delete(remChar); else newFreq.set(remChar, rPrev - 1);
    newFreq.set(addChar, (newFreq.get(addChar) ?? 0) + 1);

    setWindowFreq(newFreq);
    setFramePos(newPos);

    const match = isAnagram(newFreq, pf);
    const updatedFoundSet = match ? new Set([...foundSet, newPos]) : foundSet;

    if (match) {
      setFoundSet(updatedFoundSet);
      setGlowPos(newPos);
      setTimeout(() => setGlowPos(null), 800);
      playTone(523); setTimeout(() => playTone(659), 80); setTimeout(() => playTone(784), 160);
      spawnParticles(newPos);
    } else {
      playTone(400, "sine", 0.06);
    }

    if (newPos + p.length - 1 >= s.length - 1) {
      // Traversal done
      if (updatedFoundSet.size === allCorrect.length) {
        setTimeout(() => {
          playTone(523); setTimeout(() => playTone(659), 100);
          setTimeout(() => playTone(784), 200); setTimeout(() => playTone(1046), 300);
        }, 200);
        setTimeout(() => setSolved(true), 400);
      }
    }
  }

  function spawnParticles(pos: number) {
    const tileW = 38, gap = 5;
    const cx = pos * (tileW + gap) + tileW / 2;
    const newParts: Particle[] = Array.from({ length: 8 }).map(() => ({
      id: particleIdRef.current++,
      x: cx, y: 30,
      vx: (Math.random() - 0.5) * 60,
      vy: -(Math.random() * 30 + 20),
      life: 1,
      color: ["#22c55e", "#10b981", "#4ade80", "#86efac"][Math.floor(Math.random() * 4)],
    }));
    setParticles(prev => [...prev, ...newParts]);
    setTimeout(() => {
      setParticles(prev => prev.filter(pt => !newParts.find(np => np.id === pt.id)));
    }, 700);
  }

  function tryFinish() {
    doAttempt();
    if (!traversalDone) {
      setEarlyFinishError(true);
      setTimeout(() => setEarlyFinishError(false), 1200);
      return;
    }
    if (foundSet.size === allCorrect.length) {
      setSolved(true);
    } else {
      setEarlyFinishError(true);
      setTimeout(() => setEarlyFinishError(false), 1500);
    }
  }

  const tileW = 38, gap = 5;
  const isGlowing = glowPos === framePos;

  const mission = getMission("sliding-window", 8);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "FOUND", value: foundSet.size }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes frameGold {
          0%,100% { box-shadow: 0 0 6px rgba(234,179,8,0.4); }
          50% { box-shadow: 0 0 14px rgba(234,179,8,0.7); }
        }
        @keyframes frameGreen {
          0%,100% { box-shadow: 0 0 8px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 24px rgba(34,197,94,1); }
        }
        @keyframes particleFly {
          0% { opacity: 1; transform: translate(0,0); }
          100% { opacity: 0; transform: translate(var(--pvx), var(--pvy)); }
        }
        @keyframes mapMark {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideFrame {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Header */}
{/* Pattern */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>PATTERN:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {p.split("").map((c, i) => (
            <div key={i} style={{
              width: 30, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${getColor(c)}22`, border: `2px solid ${getColor(c)}`,
              borderRadius: 4, fontSize: 13, fontWeight: 700, color: getColor(c),
            }}>{c}</div>
          ))}
        </div>
        <span style={{ fontSize: 9, color: "#475569" }}>len={p.length}</span>
      </div>

      {/* String tiles + frame */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        {/* Particle layer */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 10 }}>
          {particles.map(pt => (
            <div key={pt.id} style={{
              position: "absolute",
              left: pt.x, top: pt.y,
              width: 6, height: 6, borderRadius: "50%",
              background: pt.color,
              animation: "particleFly 0.7s ease-out forwards",
              ["--pvx" as string]: `${pt.vx}px`,
              ["--pvy" as string]: `${pt.vy}px`,
            }} />
          ))}
        </div>

        {/* Frame overlay */}
        <div style={{
          position: "absolute",
          top: -4,
          left: framePos * (tileW + gap) - 3,
          width: p.length * (tileW + gap) - gap + 6,
          height: 54,
          borderRadius: 7,
          border: `2px solid ${isGlowing ? "#22c55e" : "#eab308"}`,
          pointerEvents: "none",
          zIndex: 2,
          transition: "left 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.2s",
          animation: isGlowing ? "frameGreen 0.5s infinite" : "frameGold 2s infinite",
        }} />

        {/* Tiles */}
        <div style={{ display: "flex", gap }}>
          {s.split("").map((c, i) => {
            const inFrame = i >= framePos && i < framePos + p.length;
            const isFound = allCorrect.includes(i) && foundSet.has(i);
            const col = getColor(c);
            return (
              <div key={i} style={{
                width: tileW, height: 46,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: isFound && inFrame
                  ? "rgba(34,197,94,0.14)"
                  : inFrame
                    ? `${col}15`
                    : `${col}08`,
                border: `1px solid ${inFrame ? (isGlowing ? "rgba(34,197,94,0.5)" : `${col}44`) : `${col}22`}`,
                borderRadius: 5,
                transition: "background 0.15s, border 0.15s",
                position: "relative",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{c}</span>
                <span style={{ fontSize: 7, color: "#374151" }}>{i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Found markers below tiles */}
      <div style={{ display: "flex", gap, marginBottom: 14 }}>
        {s.split("").map((_, i) => {
          const isFoundStart = foundSet.has(i);
          return (
            <div key={i} style={{ width: tileW, display: "flex", justifyContent: "center" }}>
              {isFoundStart ? (
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#22c55e",
                  animation: "mapMark 0.3s ease-out",
                }} />
              ) : (
                <div style={{ width: 10, height: 10 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Window freq display */}
      <div style={{
        width: "100%", maxWidth: 500, marginBottom: 12,
        padding: "8px 14px", background: "rgba(255,255,255,0.02)",
        border: "1px solid #1a1a1a", borderRadius: 6,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em" }}>WINDOW:</span>
        {[...pf.keys()].map(c => {
          const have = windowFreq.get(c) ?? 0;
          const need = pf.get(c) ?? 0;
          const ok = have === need;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: getColor(c) }}>{c}</span>
              <span style={{ fontSize: 10, color: ok ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                {have}/{need}
              </span>
            </div>
          );
        })}
        <span style={{
          marginLeft: "auto", fontSize: 9,
          color: isAnagram(windowFreq, pf) ? "#22c55e" : "#374151",
          letterSpacing: "0.06em",
        }}>
          {isAnagram(windowFreq, pf) ? "ANAGRAM" : "no match"}
        </span>
      </div>

      {/* Found map */}
      <div style={{
        width: "100%", maxWidth: 500, marginBottom: 12,
        padding: "8px 14px", background: "rgba(34,197,94,0.02)",
        border: "1px solid rgba(34,197,94,0.1)", borderRadius: 5,
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 9, color: "#10b981", letterSpacing: "0.08em" }}>FOUND:</span>
        {allCorrect.map(pos => (
          <div key={pos} style={{
            padding: "3px 8px",
            background: foundSet.has(pos) ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${foundSet.has(pos) ? "rgba(34,197,94,0.4)" : "#1a1a1a"}`,
            borderRadius: 3, fontSize: 10, fontWeight: 700,
            color: foundSet.has(pos) ? "#22c55e" : "#2d2d2d",
            transition: "all 0.2s",
          }}>
            [{pos}]
          </div>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#475569" }}>
          {foundSet.size}/{allCorrect.length}
        </span>
      </div>

      {earlyFinishError && (
        <div style={{
          marginBottom: 10, fontSize: 10, color: "#ef4444",
          padding: "6px 14px", background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4,
          letterSpacing: "0.06em",
        }}>
          {!traversalDone
            ? `FRAME HASN'T FINISHED TRAVERSAL — ${totalWindows - framePos - 1} WINDOWS REMAINING`
            : `MISSING ${allCorrect.length - foundSet.size} ANAGRAM(S) — KEEP ADVANCING`
          }
        </div>
      )}

      {!solved && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={advance}
            disabled={traversalDone}
            style={{
              padding: "10px 20px",
              background: traversalDone ? "rgba(255,255,255,0.02)" : "rgba(16,185,129,0.1)",
              border: `1px solid ${traversalDone ? "#1a1a1a" : "rgba(16,185,129,0.35)"}`,
              borderRadius: 5, cursor: traversalDone ? "not-allowed" : "pointer",
              fontSize: 11, color: traversalDone ? "#1e1e1e" : "#10b981",
              fontFamily: MONO, letterSpacing: "0.08em",
              transition: "all 0.12s",
            }}>
            ADVANCE →
          </button>
          {traversalDone && (
            <button onClick={tryFinish} style={{
              padding: "10px 20px",
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: 5, cursor: "pointer", fontSize: 11,
              color: "#818cf8", fontFamily: MONO, letterSpacing: "0.08em",
            }}>FINISH</button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {!solved && (
        <div style={{
          width: "100%", maxWidth: 500, marginTop: 12, height: 3,
          background: "#1a1a1a", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "#10b981",
            width: `${((framePos + 1) / totalWindows) * 100}%`,
            transition: "width 0.2s",
          }} />
        </div>
      )}

      {solved && (
        <div style={{
          padding: "14px 24px", marginTop: 12,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6, fontSize: 11, color: "#22c55e",
          letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8,
        }}>
          ALL {allCorrect.length} ANAGRAMS FOUND: [{allCorrect.join(", ")}]
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            FIXED WINDOW · SLIDE ONE STEP · CHECK FREQ MAP · O(n) TOTAL
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500, marginTop: 12,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        SLIDE ONE STEP AT A TIME · FRAME ONLY MOVES RIGHT · FIND ALL ANAGRAM STARTS · NO GOING BACK
      </div>
    </div>
    </GameShell>
  );
}
