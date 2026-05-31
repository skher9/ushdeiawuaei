"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const STRINGS = ["RACEACAR", "ABCBA", "ABCA", "DEIFIED", "ABECBA"];
const PICK = STRINGS[Math.floor(Math.random() * STRINGS.length)];

const GEM_PALETTE: Record<string, string> = {
  A: "#f43f5e", B: "#3b82f6", C: "#22c55e", D: "#a78bfa",
  E: "#fbbf24", F: "#06b6d4", I: "#f97316", R: "#ec4899",
  S: "#84cc16",
};
function gemColor(ch: string) { return GEM_PALETTE[ch] ?? "#94a3b8"; }

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

function playWin() {
  playTone(523); setTimeout(() => playTone(659), 120); setTimeout(() => playTone(784), 240);
}

const KEYFRAMES = `
@keyframes gemBounce {
  0%   { transform: scale(1) translateY(0); }
  30%  { transform: scale(1.3) translateY(-12px); }
  55%  { transform: scale(0.92) translateY(0); }
  75%  { transform: scale(1.08) translateY(-4px); }
  100% { transform: scale(1) translateY(0); }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%  { transform: translateX(-7px); }
  40%  { transform: translateX(7px); }
  60%  { transform: translateX(-4px); }
  80%  { transform: translateX(4px); }
}
@keyframes winGlow {
  0%,100% { box-shadow: 0 0 8px 2px currentColor; opacity:1; }
  50%      { box-shadow: 0 0 22px 8px currentColor; opacity:0.9; }
}
@keyframes mirrorPulse {
  0%,100% { opacity: 0.3; }
  50%      { opacity: 0.75; }
}
@keyframes fadeIn {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

type FlashState = "green" | "orange" | "red" | null;
type Phase = "compare" | "skip" | "solved" | "failed";

function isPalindrome(s: string, l: number, r: number) {
  while (l < r) { if (s[l] !== s[r]) return false; l++; r--; }
  return true;
}

export default function PalindromePro({ onSolve, onAttempt }: GameProps) {
  const str = PICK;
  const [L, setL] = useState(0);
  const [R, setR] = useState(str.length - 1);
  const [skipUsed, setSkipUsed] = useState(false);
  const [phase, setPhase] = useState<Phase>("compare");
  const [flashL, setFlashL] = useState<FlashState>(null);
  const [flashR, setFlashR] = useState<FlashState>(null);
  const [attempted, setAttempted] = useState(false);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (phase === "solved" && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1000);
    }
  }, [phase, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function triggerFlash(lc: FlashState, rc: FlashState, dur = 500) {
    setFlashL(lc); setFlashR(rc);
    setTimeout(() => { setFlashL(null); setFlashR(null); }, dur);
  }

  function handleGemClick(idx: number) {
    if (phase === "solved" || phase === "failed") return;
    doAttempt();

    if (phase === "compare") {
      if (idx !== L && idx !== R) return;
      if (str[L] === str[R]) {
        playTone(523);
        triggerFlash("green", "green", 450);
        setTimeout(() => {
          const nL = L + 1; const nR = R - 1;
          setL(nL); setR(nR);
          if (nL >= nR) { playWin(); setPhase("solved"); }
        }, 360);
      } else {
        if (!skipUsed) {
          playTone(392, "triangle");
          triggerFlash("orange", "orange", 500);
          setPhase("skip");
        } else {
          playTone(180, "sawtooth", 0.2);
          triggerFlash("red", "red", 600);
          setTimeout(() => setPhase("failed"), 500);
        }
      }
      return;
    }

    if (phase === "skip") {
      if (idx !== L && idx !== R) return;
      playTone(392, "triangle");
      setSkipUsed(true);
      setFlashL(null); setFlashR(null);
      if (idx === L) {
        const nL = L + 1;
        setL(nL);
        if (nL >= R || isPalindrome(str, nL, R)) {
          setTimeout(() => { playWin(); setPhase("solved"); }, 250);
        } else { setPhase("compare"); }
      } else {
        const nR = R - 1;
        setR(nR);
        if (L >= nR || isPalindrome(str, L, nR)) {
          setTimeout(() => { playWin(); setPhase("solved"); }, 250);
        } else { setPhase("compare"); }
      }
    }
  }

  function getFlashBg(side: "L" | "R"): string | null {
    const f = side === "L" ? flashL : flashR;
    if (f === "green")  return "rgba(34,197,94,0.85)";
    if (f === "orange") return "rgba(251,146,60,0.85)";
    if (f === "red")    return "rgba(239,68,68,0.85)";
    return null;
  }

  const centerFrac = str.length > 1 ? ((L + R) / 2) / (str.length - 1) * 100 : 50;

  const mission = getMission("two-pointers", 3);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "L PTR", value: L }, { label: "R PTR", value: R }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Word badge */}
      <div style={{
        marginBottom: 8, padding: "8px 20px",
        background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.22)",
        borderRadius: 6, fontSize: 13, color: "#f43f5e",
        letterSpacing: "0.18em", fontWeight: 700,
      }}>
        {str}
      </div>

      {/* Status */}
      <div style={{ marginBottom: 20, fontSize: 11, letterSpacing: "0.08em", minHeight: 18, textAlign: "center" }}>
        {phase === "compare" && (
          <span style={{ color: "#64748b" }}>
            {str[L]} vs {str[R]} · SKIP: {skipUsed ? <span style={{ color: "#ef4444" }}>USED</span> : <span style={{ color: "#22c55e" }}>AVAILABLE</span>}
          </span>
        )}
        {phase === "skip" && <span style={{ color: "#fb923c", animation: "fadeIn 0.2s ease" }}>MISMATCH — CLICK L OR R GEM TO SKIP IT</span>}
        {phase === "solved" && <span style={{ color: "#22c55e", animation: "fadeIn 0.3s ease" }}>IS A PALINDROME ✓</span>}
        {phase === "failed" && <span style={{ color: "#ef4444", animation: "fadeIn 0.3s ease" }}>NOT A PALINDROME ✗</span>}
      </div>

      {/* Necklace */}
      <div style={{ position: "relative", marginBottom: 28 }}>
        {/* Cord */}
        <div style={{
          position: "absolute", top: "calc(50% - 6px)", left: 20, right: 20, height: 3,
          background: "linear-gradient(90deg, #111, #222, #111)", borderRadius: 2,
          transform: "translateY(-50%)", zIndex: 0,
        }} />
        {/* Mirror line */}
        <div style={{
          position: "absolute", top: -18, bottom: -18,
          left: `calc(${centerFrac}%)`, width: 2,
          background: "rgba(168,85,247,0.55)", borderRadius: 1, zIndex: 2,
          animation: "mirrorPulse 2s ease-in-out infinite", pointerEvents: "none",
        }} />

        <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1 }}>
          {str.split("").map((ch, i) => {
            const isL = i === L; const isR = i === R;
            const isActive = isL || isR;
            const isUsed = i < L || i > R;
            const color = gemColor(ch);
            const fb = isL ? getFlashBg("L") : isR ? getFlashBg("R") : null;
            const isSolved = phase === "solved";
            const canClick = isActive && (phase === "compare" || phase === "skip");

            let bg   = isUsed ? "#0f0f0f" : fb ? `${fb}44` : isSolved ? "rgba(34,197,94,0.18)" : `${color}22`;
            let bord = isUsed ? "2px solid #1a1a1a" : fb ? `2px solid ${fb}` : isSolved ? "2px solid rgba(34,197,94,0.7)" : isActive ? `2px solid ${color}` : `2px solid ${color}66`;
            let shadow = fb ? `0 0 20px 6px ${fb}55` : isSolved ? "0 0 14px 4px rgba(34,197,94,0.4)" : isActive ? `0 0 14px 4px ${color}44` : "none";
            let anim = "";
            if (fb?.includes("34,197")) anim = "gemBounce 0.5s ease";
            else if (fb?.includes("251,146") || fb?.includes("239,68")) anim = "shake 0.4s ease";
            else if (isSolved) anim = "winGlow 1.4s ease-in-out infinite";

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ height: 14, display: "flex", alignItems: "center" }}>
                  {isL && <span style={{ fontSize: 9, fontWeight: 700, color: "#3b82f6" }}>L</span>}
                  {isR && !isL && <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444" }}>R</span>}
                </div>
                <div
                  onClick={() => handleGemClick(i)}
                  style={{
                    width: 46, height: 46, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: bg, border: bord, boxShadow: shadow,
                    color: isUsed ? "#222" : isSolved ? "#22c55e" : fb ? "#fff" : color,
                    cursor: canClick ? "pointer" : "default",
                    animation: anim, opacity: isUsed ? 0.3 : 1,
                    fontSize: 16, fontWeight: 700,
                    transition: "background 0.2s, border 0.2s, opacity 0.3s",
                  }}
                >{ch}</div>
                <div style={{ fontSize: 8, color: "#2a2a2a" }}>{i}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skip indicator */}
      <div style={{
        marginBottom: 20, display: "flex", gap: 8, alignItems: "center",
        padding: "8px 16px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #181818", borderRadius: 6,
      }}>
        <span style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em" }}>SKIP TOKEN:</span>
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          background: skipUsed ? "#1a1a1a" : "rgba(34,197,94,0.3)",
          border: skipUsed ? "1px solid #2a2a2a" : "1px solid rgba(34,197,94,0.6)",
        }} />
        <span style={{ fontSize: 9, color: skipUsed ? "#374151" : "#22c55e", letterSpacing: "0.06em" }}>
          {skipUsed ? "USED" : "AVAILABLE"}
        </span>
      </div>

      {/* Footer */}
      <div style={{
        width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        TWO POINTERS FROM OUTSIDE IN · ONE SKIP ALLOWED · SKIP LEFT OR SKIP RIGHT ON FIRST MISMATCH
      </div>
    </div>
    </GameShell>
  );
}
