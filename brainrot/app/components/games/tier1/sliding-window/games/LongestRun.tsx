"use client";
import { useState, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";

const SAMPLE_STRINGS = ["ABCABCBB", "PWWKEW", "AABCDE", "DVDF"];

// A fixed color per unique letter (across all possible letters)
const LETTER_COLORS: Record<string, string> = {
  A: "#f87171", B: "#fb923c", C: "#fbbf24", D: "#a3e635",
  E: "#34d399", F: "#22d3ee", G: "#60a5fa", H: "#a78bfa",
  I: "#f472b6", J: "#4ade80", K: "#38bdf8", L: "#c084fc",
  M: "#e879f9", N: "#fb7185", O: "#fdba74", P: "#86efac",
  Q: "#67e8f9", R: "#93c5fd", S: "#c4b5fd", T: "#f9a8d4",
  U: "#6ee7b7", V: "#fcd34d", W: "#7dd3fc", X: "#d8b4fe",
  Y: "#fda4af", Z: "#bbf7d0",
};

function gemColor(ch: string): string {
  return LETTER_COLORS[ch.toUpperCase()] ?? "#94a3b8";
}

function computeMaxLen(s: string): number {
  const seen = new Set<string>();
  let l = 0, max = 0;
  for (let r = 0; r < s.length; r++) {
    while (seen.has(s[r])) { seen.delete(s[l]); l++; }
    seen.add(s[r]);
    if (r - l + 1 > max) max = r - l + 1;
  }
  return max;
}

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

function playFanfare() {
  const notes = [392, 523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.2), i * 100));
}

function playNewRecord() {
  setTimeout(() => playTone(660, "sine", 0.15), 0);
  setTimeout(() => playTone(784, "sine", 0.15), 160);
}

interface GemState {
  /** animation class to apply */
  anim: "idle" | "enter" | "exit" | "shake";
}

export default function LongestRun({ onSolve, onAttempt }: GameProps) {
  const [strIndex] = useState(() => Math.floor(Math.random() * SAMPLE_STRINGS.length));
  const str = SAMPLE_STRINGS[strIndex];
  const maxLen = computeMaxLen(str);

  // L pointer: left boundary (inclusive). R pointer: right boundary (inclusive, -1 = nothing selected).
  const [L, setL] = useState(0);
  const [R, setR] = useState(-1);
  const [windowSet, setWindowSet] = useState<Set<string>>(new Set());
  const [longest, setLongest] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [submitFlash, setSubmitFlash] = useState<"none" | "success" | "error">("none");
  // Per-gem animation states
  const [gemAnims, setGemAnims] = useState<GemState[]>(() => str.split("").map(() => ({ anim: "idle" as const })));
  const [duplicateIdx, setDuplicateIdx] = useState<number | null>(null);
  const [newRecordFlash, setNewRecordFlash] = useState(false);
  const [windowBorderFlash, setWindowBorderFlash] = useState<"none" | "red" | "gold">("none");
  const solvedRef = useRef(false);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function setGemAnim(idx: number, anim: GemState["anim"], resetAfter?: number) {
    setGemAnims(prev => {
      const next = [...prev];
      next[idx] = { anim };
      return next;
    });
    if (resetAfter !== undefined) {
      setTimeout(() => {
        setGemAnims(prev => {
          const next = [...prev];
          next[idx] = { anim: "idle" };
          return next;
        });
      }, resetAfter);
    }
  }

  /** Click on a gem at index i */
  function handleGemClick(i: number) {
    if (solved) return;
    doAttempt();

    const hasWindow = R >= L;

    // Case 1: Click the leftmost gem in the window → shrink from left
    if (hasWindow && i === L) {
      const ch = str[L];
      const newSet = new Set(windowSet);
      newSet.delete(ch);
      setGemAnim(L, "exit", 300);
      setTimeout(() => {
        setWindowSet(newSet);
        setL(L + 1);
        setDuplicateIdx(null);
        setWindowBorderFlash("none");
      }, 80);
      playTone(300, "sine", 0.08);
      return;
    }

    // Case 2: Click immediately to the right of R (next gem to extend)
    const nextR = R + 1;
    if (i === nextR && i < str.length) {
      const ch = str[i];
      if (windowSet.has(ch)) {
        // Duplicate! Flash red, block.
        setDuplicateIdx(i);
        setGemAnim(i, "shake", 400);
        setWindowBorderFlash("red");
        setTimeout(() => setWindowBorderFlash("none"), 600);
        playTone(220, "sawtooth", 0.1);
      } else {
        // Extend R
        const newSet = new Set(windowSet);
        newSet.add(ch);
        setWindowSet(newSet);
        setR(i);
        setDuplicateIdx(null);
        setGemAnim(i, "enter", 350);
        const newLen = i - L + 1;
        let newLongest = longest;
        if (newLen > longest) {
          newLongest = newLen;
          setLongest(newLen);
          setNewRecordFlash(true);
          setTimeout(() => setNewRecordFlash(false), 1000);
          playNewRecord();
        } else {
          playTone(400 + newLen * 40, "sine", 0.08);
        }
        setWindowBorderFlash("gold");
        setTimeout(() => setWindowBorderFlash("none"), 300);
      }
      return;
    }

    // Case 3: No window yet (L > R or R === -1) — can restart from R+1 (same scan position) or 0
    if (!hasWindow) {
      // Allow clicking the gem right after R to continue scanning, or 0 if fully fresh
      const startPos = R < 0 ? 0 : Math.min(R + 1, str.length - 1);
      if (i === startPos) {
        const ch = str[i];
        const newSet = new Set([ch]);
        setWindowSet(newSet);
        setL(i);
        setR(i);
        setGemAnim(i, "enter", 350);
        const newLen = 1;
        if (newLen > longest) {
          setLongest(newLen);
          playNewRecord();
        } else {
          playTone(440, "sine", 0.08);
        }
      }
      return;
    }

    // Otherwise: hint the player what they can click
    if (hasWindow && i === L - 1) {
      // They tried to expand left — not how it works
      setGemAnim(i, "shake", 400);
      playTone(200, "sine", 0.06);
    }
  }

  function submit() {
    doAttempt();
    if (longest === maxLen) {
      setSubmitFlash("success");
      setSolved(true);
      playFanfare();
    } else {
      setSubmitFlash("error");
      playTone(180, "sawtooth", 0.15);
      setTimeout(() => setSubmitFlash("none"), 800);
    }
  }

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      const t = setTimeout(() => onSolve(), 1300);
      return () => clearTimeout(t);
    }
  }, [solved, onSolve]);

  const currentLen = R >= L && R >= 0 ? R - L + 1 : 0;
  const hasWindow = R >= L && R >= 0;

  const borderColor = windowBorderFlash === "red"
    ? "rgba(239,68,68,0.8)"
    : windowBorderFlash === "gold"
    ? "rgba(251,191,36,0.8)"
    : submitFlash === "success"
    ? "rgba(34,197,94,0.7)"
    : "rgba(16,185,129,0.3)";

  const borderAnim = windowBorderFlash === "red"
    ? "lr-border-red 0.5s ease"
    : "lr-border-pulse 2.5s ease-in-out infinite";

  const mission = getMission("sliding-window", 4);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "LENGTH", value: maxLen }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes lr-gem-enter {
          0%   { transform: scale(0.7); opacity: 0.3; }
          60%  { transform: scale(1.15); opacity: 1; }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1.0); opacity: 1; }
        }
        @keyframes lr-gem-exit {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.55); opacity: 0; }
        }
        @keyframes lr-gem-shake {
          0%, 100% { transform: translateX(0) scale(1); }
          15%  { transform: translateX(-5px) scale(1.05); }
          35%  { transform: translateX(5px) scale(1.05); }
          55%  { transform: translateX(-3px); }
          75%  { transform: translateX(3px); }
        }
        @keyframes lr-gem-idle-pulse {
          0%, 100% { box-shadow: 0 0 8px var(--gem-color), 0 0 20px rgba(255,255,255,0.05); }
          50% { box-shadow: 0 0 16px var(--gem-color), 0 0 36px rgba(255,255,255,0.1); }
        }
        @keyframes lr-border-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 20px rgba(16,185,129,0.45); }
        }
        @keyframes lr-border-red {
          0%, 100% { box-shadow: 0 0 0px transparent; }
          30% { box-shadow: 0 0 24px rgba(239,68,68,0.7); }
          60% { box-shadow: 0 0 14px rgba(239,68,68,0.4); }
        }
        @keyframes lr-record-burst {
          0%   { transform: scale(0.7); opacity: 0; }
          40%  { transform: scale(1.12); opacity: 1; }
          80%  { transform: scale(1.0); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0; }
        }
        @keyframes lr-pointer-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes lr-chain-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#10b981", letterSpacing: "0.14em", fontWeight: 700 }}>
            LONGEST RUN
          </span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              fontSize: 11, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.1em",
              padding: "3px 10px",
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 4,
              transition: "all 0.2s",
            }}>
              BEST: {longest}
            </span>
            <span style={{
              fontSize: 11, color: currentLen > 0 ? "#10b981" : "#374151",
              fontWeight: 700, letterSpacing: "0.08em",
              padding: "3px 10px",
              background: currentLen > 0 ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${currentLen > 0 ? "rgba(16,185,129,0.25)" : "#1a1a1a"}`,
              borderRadius: 4,
            }}>
              LEN: {currentLen}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em", lineHeight: 1.6 }}>
          CLICK NEXT GEM TO EXTEND · CLICK LEFTMOST GEM TO SHRINK
        </div>
      </div>

      {/* NEW RECORD flash */}
      {newRecordFlash && (
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#fbbf24",
          letterSpacing: "0.14em",
          marginBottom: 8,
          animation: "lr-record-burst 1s ease forwards",
        }}>
          NEW RECORD! {longest}
        </div>
      )}

      {/* Chain / necklace area */}
      <div style={{
        width: "100%",
        maxWidth: 560,
        position: "relative",
        marginBottom: 24,
      }}>
        {/* Chain line behind gems */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 24,
          right: 24,
          height: 2,
          background: "linear-gradient(90deg, #1a1a1a, #2a2a2a, #1a1a1a)",
          borderRadius: 2,
          transform: "translateY(-50%)",
          animation: "lr-chain-glow 2s ease-in-out infinite",
          zIndex: 0,
        }} />

        {/* Window glow ring behind the in-window gems */}
        {hasWindow && (
          <div style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: `calc(${L} * (100% / ${str.length}) + 4px)`,
            width: `calc(${currentLen} * (100% / ${str.length}) - 8px)`,
            height: 68,
            borderRadius: 34,
            border: `2px solid ${borderColor}`,
            background: submitFlash === "success"
              ? "rgba(34,197,94,0.06)"
              : "rgba(16,185,129,0.04)",
            transition: "left 0.15s, width 0.15s, border-color 0.2s",
            animation: borderAnim,
            zIndex: 1,
            pointerEvents: "none",
            boxSizing: "border-box",
          }} />
        )}

        {/* Gems row */}
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
          padding: "10px 0",
        }}>
          {str.split("").map((ch, i) => {
            const inWindow = hasWindow && i >= L && i <= R;
            const isL = hasWindow && i === L;
            const isR = hasWindow && i === R;
            const isDup = duplicateIdx === i;
            // isNext: the gem the player can click to extend (or start the window)
            const noWindowStartPos = R < 0 ? 0 : Math.min(R + 1, str.length - 1);
            const isNext = hasWindow ? (i === R + 1) : (i === noWindowStartPos);
            const gColor = gemColor(ch);
            const anim = gemAnims[i]?.anim ?? "idle";
            const canClick =
              (hasWindow && i === L) ||
              (hasWindow && i === R + 1 && i < str.length) ||
              (!hasWindow && i === noWindowStartPos);

            let gemBg = "#111";
            let gemBorder = "2px solid #222";
            let gemScale = 1.0;
            let gemOpacity = 0.45;
            let animStyle = "";

            if (inWindow) {
              gemBg = `${gColor}22`;
              gemBorder = `2px solid ${gColor}`;
              gemScale = 1.0;
              gemOpacity = 1;
              animStyle = anim === "idle" ? "lr-gem-idle-pulse 2.2s ease-in-out infinite" : "";
            }
            if (anim === "enter") { animStyle = "lr-gem-enter 0.35s cubic-bezier(.4,0,.2,1) forwards"; gemOpacity = 1; }
            if (anim === "exit") { animStyle = "lr-gem-exit 0.28s ease forwards"; }
            if (anim === "shake") {
              gemBorder = "2px solid rgba(239,68,68,0.8)";
              gemBg = "rgba(239,68,68,0.12)";
              animStyle = "lr-gem-shake 0.4s ease forwards";
              gemOpacity = 1;
            }
            if (isDup && !inWindow) {
              gemBorder = "2px solid rgba(239,68,68,0.6)";
              gemBg = "rgba(239,68,68,0.1)";
              gemOpacity = 0.85;
            }
            if (isNext && !isDup) {
              gemOpacity = 0.65;
            }
            if (submitFlash === "success" && inWindow) {
              gemBorder = "2px solid rgba(34,197,94,0.8)";
              gemBg = "rgba(34,197,94,0.15)";
            }

            return (
              <div
                key={i}
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {/* L / R pointer labels — mutually exclusive */}
                {(isL || isR) && (
                  <div style={{
                    position: "absolute",
                    top: -22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: isL && isR ? 8 : 9,
                    color: "#10b981",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    animation: "lr-pointer-bounce 1.2s ease-in-out infinite",
                    whiteSpace: "nowrap",
                  }}>
                    {isL && isR ? "L=R" : isL ? "L" : "R"}
                  </div>
                )}

                {/* Gem circle */}
                <div
                  onClick={() => handleGemClick(i)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: gemBg,
                    border: gemBorder,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: canClick ? "pointer" : "default",
                    opacity: gemOpacity,
                    transform: `scale(${gemScale})`,
                    transition: anim === "idle" ? "opacity 0.18s, border-color 0.18s" : "none",
                    animation: animStyle || undefined,
                    "--gem-color": gColor,
                    position: "relative",
                  } as React.CSSProperties}
                >
                  <span style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: inWindow ? gColor : (isDup ? "#ef4444" : "#4b5563"),
                    fontFamily: MONO,
                    transition: "color 0.18s",
                    textShadow: inWindow ? `0 0 10px ${gColor}88` : "none",
                  }}>
                    {ch}
                  </span>
                  {/* Clickable hint ring for next gem */}
                  {isNext && !isDup && !solved && (
                    <div style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: "1.5px dashed rgba(16,185,129,0.4)",
                      pointerEvents: "none",
                      animation: "lr-gem-idle-pulse 1.5s ease-in-out infinite",
                    }} />
                  )}
                </div>

                {/* Index */}
                <div style={{
                  fontSize: 7,
                  color: inWindow ? "rgba(16,185,129,0.4)" : "#1f2937",
                  marginTop: 4,
                  fontFamily: MONO,
                }}>
                  [{i}]
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicateIdx !== null && !solved && (
        <div style={{
          padding: "8px 18px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 6,
          fontSize: 10,
          color: "#ef4444",
          letterSpacing: "0.08em",
          marginBottom: 12,
          textAlign: "center",
        }}>
          DUPLICATE {str[duplicateIdx]}! · CLICK {hasWindow ? `[${str[L]}] AT LEFT` : ""} TO SHRINK FIRST
        </div>
      )}

      {/* Window status */}
      {hasWindow && !solved && (
        <div style={{
          padding: "8px 18px",
          background: "rgba(16,185,129,0.04)",
          border: "1px solid rgba(16,185,129,0.15)",
          borderRadius: 6,
          fontSize: 10,
          color: "#4b5563",
          letterSpacing: "0.06em",
          marginBottom: 12,
          textAlign: "center",
        }}>
          <span style={{ color: "#6b7280" }}>WINDOW: </span>
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            {str.slice(L, R + 1)}
          </span>
          <span style={{ color: "#374151", marginLeft: 10 }}>
            L={L} · R={R} · len={currentLen}
          </span>
        </div>
      )}

      {!hasWindow && !solved && (
        <div style={{
          padding: "8px 18px",
          background: "rgba(255,255,255,0.01)",
          border: "1px solid #1a1a1a",
          borderRadius: 6,
          fontSize: 10,
          color: "#374151",
          letterSpacing: "0.06em",
          marginBottom: 12,
          textAlign: "center",
        }}>
          CLICK THE FIRST GEM TO BEGIN
        </div>
      )}

      {/* Submit */}
      {!solved && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <button
            onClick={submit}
            style={{
              padding: "10px 28px",
              background: submitFlash === "error"
                ? "rgba(239,68,68,0.12)"
                : "rgba(16,185,129,0.1)",
              border: `1.5px solid ${submitFlash === "error" ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.4)"}`,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              color: submitFlash === "error" ? "#ef4444" : "#10b981",
              fontFamily: MONO,
              letterSpacing: "0.1em",
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            SUBMIT ANSWER
          </button>
        </div>
      )}

      {submitFlash === "error" && !solved && (
        <div style={{
          fontSize: 9,
          color: "#ef4444",
          letterSpacing: "0.06em",
          marginBottom: 10,
          textAlign: "center",
        }}>
          NOT THE MAXIMUM YET — BEST POSSIBLE: {maxLen}? KEEP EXPLORING
        </div>
      )}

      {solved && (
        <div style={{
          padding: "16px 28px",
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 8,
          fontSize: 12,
          color: "#22c55e",
          letterSpacing: "0.08em",
          textAlign: "center",
          lineHeight: 2,
          marginBottom: 12,
        }}>
          LONGEST SUBSTRING: {maxLen}
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            O(n) — EACH CHAR ADDED AND REMOVED AT MOST ONCE
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 8,
        width: "100%",
        maxWidth: 560,
        padding: "9px 14px",
        background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414",
        borderRadius: 4,
        fontSize: 9,
        color: "#374151",
        lineHeight: 1.7,
        letterSpacing: "0.04em",
      }}>
        CLICK RIGHTMOST AVAILABLE GEM TO EXTEND · DUPLICATE? CLICK L GEM TO SHRINK · SLIDING WINDOW = O(n)
      </div>
    </div>
    </GameShell>
  );
}

