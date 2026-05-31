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
  { s: "ADOBECODEBANC", t: "ABC" },
  { s: "AABDCBA", t: "ABC" },
  { s: "FFBBBCAF", t: "FAC" },
];

const LETTER_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#3b82f6", C: "#22c55e", D: "#f59e0b",
  E: "#a855f7", F: "#06b6d4", G: "#ec4899", N: "#f97316",
  O: "#8b5cf6", P: "#84cc16", S: "#e11d48",
};

function getColor(c: string) {
  return LETTER_COLORS[c] ?? "#94a3b8";
}

function computeMinWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  let have = 0;
  const required = need.size;
  const win = new Map<string, number>();
  let l = 0, minLen = Infinity, minL = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    win.set(c, (win.get(c) ?? 0) + 1);
    if (need.has(c) && win.get(c) === need.get(c)) have++;
    while (have === required) {
      if (r - l + 1 < minLen) { minLen = r - l + 1; minL = l; }
      const lc = s[l];
      win.set(lc, win.get(lc)! - 1);
      if (need.has(lc) && win.get(lc)! < need.get(lc)!) have--;
      l++;
    }
  }
  return minLen === Infinity ? "" : s.slice(minL, minL + minLen);
}

export default function RainCatcher({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const { s, t } = PROBLEMS[probIdx];
  const answer = computeMinWindow(s, t);

  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
  const required = need.size;

  const [L, setL] = useState(0);
  const [R, setR] = useState(-1);
  const [windowMap, setWindowMap] = useState<Map<string, number>>(new Map());
  const [satisfied, setSatisfied] = useState(0);
  const [bestL, setBestL] = useState(-1);
  const [bestR, setBestR] = useState(-1);
  const [phase, setPhase] = useState<"expand" | "shrink">("expand");
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [breakFlash, setBreakFlash] = useState(false);
  const [allCaughtFlash, setAllCaughtFlash] = useState(false);
  const solvedRef = useRef(false);

  const allCaught = satisfied === required;

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1200);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function expandRight() {
    if (solved || phase !== "expand" || R >= s.length - 1) return;
    doAttempt();
    const newR = R + 1;
    const c = s[newR];
    const newMap = new Map(windowMap);
    newMap.set(c, (newMap.get(c) ?? 0) + 1);

    let newSatisfied = satisfied;
    if (need.has(c) && newMap.get(c) === need.get(c)) {
      newSatisfied++;
      playTone(660, "sine", 0.12);
    } else {
      playTone(300, "sine", 0.07);
    }

    setWindowMap(newMap);
    setR(newR);
    setSatisfied(newSatisfied);

    if (newSatisfied === required) {
      let nb = bestL, nr = bestR;
      if (bestL === -1 || newR - L + 1 < bestR - bestL + 1) { nb = L; nr = newR; }
      setBestL(nb); setBestR(nr);
      setPhase("shrink");
      setAllCaughtFlash(true);
      setTimeout(() => setAllCaughtFlash(false), 1000);
      playTone(523); setTimeout(() => playTone(659), 80); setTimeout(() => playTone(784), 160);
    }
  }

  function shrinkLeft() {
    if (solved || phase !== "shrink" || L > R) return;
    doAttempt();
    const c = s[L];
    const newMap = new Map(windowMap);
    const prev = newMap.get(c) ?? 0;
    if (prev <= 1) newMap.delete(c); else newMap.set(c, prev - 1);

    let newSatisfied = satisfied;
    if (need.has(c) && prev <= (need.get(c) ?? 0)) {
      newSatisfied--;
      setBreakFlash(true);
      setTimeout(() => setBreakFlash(false), 600);
      playTone(180, "sawtooth", 0.15);
      setWindowMap(newMap);
      setL(L + 1);
      setSatisfied(newSatisfied);
      setPhase("expand");
      if (R >= s.length - 1) {
        if (bestL !== -1) setSolved(true);
      }
      return;
    }

    const newL = L + 1;
    const wLen = R - newL + 1;
    if (bestL === -1 || wLen < bestR - bestL + 1) {
      setBestL(newL); setBestR(R);
    }
    playTone(400, "triangle", 0.08);
    setWindowMap(newMap);
    setL(newL);

    if (newL > R) {
      setPhase("expand");
      setSatisfied(0);
    }
  }

  const windowLen = R >= L ? R - L + 1 : 0;
  const bestLen = bestL !== -1 ? bestR - bestL + 1 : Infinity;

  const mission = getMission("sliding-window", 7);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "SATISFIED", value: satisfied }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes allCaughtAnim {
          0%,100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
          50% { box-shadow: 0 0 20px 6px rgba(34,197,94,0.5); }
        }
        @keyframes breakFlashAnim {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulseArrow {
          0%,100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes bucketFill {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1); }
        }
      `}</style>

{/* Target */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>CATCH ALL OF:</span>
        <div style={{ display: "flex", gap: 4 }}>
          {t.split("").map((c, i) => (
            <div key={i} style={{
              width: 30, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${getColor(c)}22`, border: `2px solid ${getColor(c)}`,
              borderRadius: 4, fontSize: 13, fontWeight: 700, color: getColor(c),
            }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {s.split("").map((c, i) => {
          const inWindow = i >= L && i <= R && R >= L;
          const isBest = bestL !== -1 && i >= bestL && i <= bestR;
          const isNextExpand = i === R + 1 && phase === "expand";
          const isCurrentL = i === L && phase === "shrink" && R >= L;
          const col = getColor(c);
          let bg = `${col}11`, border = `${col}22`;
          if (inWindow && allCaught) { bg = "rgba(34,197,94,0.1)"; border = "rgba(34,197,94,0.4)"; }
          else if (inWindow) { bg = `${col}22`; border = `${col}55`; }
          if (isBest && !inWindow) { bg = "rgba(234,179,8,0.06)"; border = "rgba(234,179,8,0.2)"; }

          return (
            <div key={i}
              onClick={() => { if (isNextExpand) expandRight(); else if (isCurrentL) shrinkLeft(); }}
              style={{
                width: 34, height: 44,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: bg, border: `1px solid ${border}`, borderRadius: 5,
                cursor: (isNextExpand || isCurrentL) ? "pointer" : "default",
                transition: "all 0.15s",
                animation: allCaughtFlash && inWindow ? "allCaughtAnim 0.8s ease" : "none",
                outline: isBest ? "1px dashed rgba(234,179,8,0.4)" : "none",
                outlineOffset: "2px", position: "relative",
              }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{c}</span>
              <span style={{ fontSize: 7, color: "#374151" }}>{i}</span>
              {isNextExpand && (
                <span style={{ position: "absolute", top: -14, fontSize: 9, color: "#3b82f6", animation: "pulseArrow 0.8s infinite" }}>→</span>
              )}
              {isCurrentL && (
                <span style={{ position: "absolute", top: -14, fontSize: 9, color: "#f59e0b", animation: "pulseArrow 0.8s infinite" }}>←</span>
              )}
            </div>
          );
        })}
      </div>

      {R >= L && (
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em", marginBottom: 8 }}>
          L={L} · R={R} · "{s.slice(L, R + 1)}" (len {windowLen})
          {bestL !== -1 && ` · best="${s.slice(bestL, bestR + 1)}" (len ${bestLen})`}
        </div>
      )}

      {/* Buckets */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {[...need.entries()].map(([c, req]) => {
          const have = windowMap.get(c) ?? 0;
          const filled = have >= req;
          const col = getColor(c);
          return (
            <div key={c} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 12px",
              background: filled ? `${col}18` : "rgba(255,255,255,0.02)",
              border: `1px solid ${filled ? col : "#1a1a1a"}`,
              borderRadius: 6, minWidth: 54, transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{c}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 3, border: `1px solid ${col}44`,
                background: "#0a0a0a", overflow: "hidden", position: "relative",
              }}>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: `${Math.min(have / req, 1) * 100}%`,
                  background: filled ? col : `${col}66`,
                  transition: "height 0.25s",
                  transformOrigin: "bottom",
                }} />
              </div>
              <span style={{ fontSize: 9, color: filled ? col : "#475569" }}>{have}/{req}</span>
            </div>
          );
        })}
      </div>

      {/* Phase indicator */}
      <div style={{
        marginBottom: 12, padding: "8px 18px",
        background: breakFlash ? "rgba(239,68,68,0.08)" : allCaughtFlash ? "rgba(34,197,94,0.08)" : phase === "expand" ? "rgba(59,130,246,0.06)" : "rgba(234,179,8,0.06)",
        border: `1px solid ${breakFlash ? "rgba(239,68,68,0.4)" : allCaughtFlash ? "rgba(34,197,94,0.4)" : phase === "expand" ? "rgba(59,130,246,0.3)" : "rgba(234,179,8,0.3)"}`,
        borderRadius: 5, fontSize: 11,
        color: breakFlash ? "#ef4444" : allCaughtFlash ? "#22c55e" : phase === "expand" ? "#3b82f6" : "#eab308",
        letterSpacing: "0.08em", textAlign: "center",
        animation: breakFlash ? "breakFlashAnim 0.3s infinite" : "none",
      }}>
        {breakFlash ? "COVERAGE BROKEN — EXPAND AGAIN"
          : allCaughtFlash ? "ALL CAUGHT! SHRINK TO MINIMIZE"
            : phase === "expand" ? `EXPAND → CLICK TILE [${R + 1}]`
              : `SHRINK ← CLICK TILE [${L}]`}
      </div>

      {!solved && (
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <button onClick={expandRight} disabled={phase !== "expand" || R >= s.length - 1}
            style={{
              padding: "8px 16px",
              background: phase === "expand" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${phase === "expand" ? "rgba(59,130,246,0.35)" : "#1a1a1a"}`,
              borderRadius: 4, cursor: phase === "expand" ? "pointer" : "not-allowed",
              fontSize: 10, color: phase === "expand" ? "#60a5fa" : "#1e1e1e",
              fontFamily: MONO, letterSpacing: "0.06em",
            }}>EXPAND →</button>
          <button onClick={shrinkLeft} disabled={phase !== "shrink" || L > R}
            style={{
              padding: "8px 16px",
              background: phase === "shrink" ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${phase === "shrink" ? "rgba(234,179,8,0.35)" : "#1a1a1a"}`,
              borderRadius: 4, cursor: phase === "shrink" ? "pointer" : "not-allowed",
              fontSize: 10, color: phase === "shrink" ? "#eab308" : "#1e1e1e",
              fontFamily: MONO, letterSpacing: "0.06em",
            }}>← SHRINK</button>
        </div>
      )}

      {solved && (
        <div style={{
          padding: "14px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6,
          fontSize: 11, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 1.8, marginBottom: 12,
        }}>
          MINIMUM WINDOW: "{answer}"
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            EXPAND UNTIL COVERED · SHRINK UNTIL BROKEN · TRACK MINIMUM VALID
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        EXPAND RIGHT → FILL BUCKETS → ALL FULL = SHRINK LEFT → COVERAGE BREAKS = EXPAND AGAIN
      </div>
    </div>
    </GameShell>
  );
}
