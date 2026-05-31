"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const MONO = "var(--font-mono, 'JetBrains Mono', monospace)";
const INITIAL = [2, 0, 2, 1, 1, 0, 2, 0, 1];
const BALL_COLOR = ["#ef4444", "#e2e8f0", "#3b82f6"];
const BALL_LABEL = ["RED·0", "WHT·1", "BLU·2"];
const ZONE_COLOR = ["rgba(239,68,68,0.12)", "rgba(226,232,240,0.08)", "rgba(59,130,246,0.12)"];
const ZONE_BORDER = ["rgba(239,68,68,0.4)", "rgba(226,232,240,0.25)", "rgba(59,130,246,0.4)"];
const ZONE_TEXT  = ["#ef4444", "#cbd5e1", "#3b82f6"];

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
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.18), i * 100));
}

const KEYFRAMES = `
@keyframes ballFly {
  0%   { transform: scale(1) translateY(0); opacity:1; }
  40%  { transform: scale(1.2) translateY(-18px); opacity:1; }
  100% { transform: scale(0.6) translateY(60px); opacity:0; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes pop {
  0%   { transform: scale(0.6); opacity:0; }
  60%  { transform: scale(1.15); opacity:1; }
  100% { transform: scale(1); opacity:1; }
}
@keyframes zoneGlow {
  0%,100% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 18px 4px currentColor; }
}
@keyframes fadeIn {
  from { opacity:0; } to { opacity:1; }
}
`;

export default function ColorSort({ onSolve, onAttempt }: GameProps) {
  const [arr, setArr] = useState([...INITIAL]);
  const [lo, setLo] = useState(0);
  const [mid, setMid] = useState(0);
  const [hi, setHi] = useState(INITIAL.length - 1);
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [flying, setFlying] = useState<number | null>(null); // index flying out
  const [attempted, setAttempted] = useState(false);
  const [sorted, setSorted] = useState<number[]>([]); // sorted bucket counts [r, w, b]
  const solvedRef = useRef(false);

  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1000);
    }
  }, [solved, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function handleZone(zone: number) {
    if (solved || mid > hi) return;
    doAttempt();
    const val = arr[mid];
    if (zone !== val) {
      playTone(200, "sawtooth", 0.1);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      return;
    }

    // Correct!
    playTone(400 + lo * 30);
    setFlying(mid);

    setTimeout(() => {
      setFlying(null);
      const a = [...arr];
      let nlo = lo, nmid = mid, nhi = hi;
      if (val === 0) {
        // swap arr[lo] and arr[mid], lo++, mid++
        [a[nlo], a[nmid]] = [a[nmid], a[nlo]];
        nlo++; nmid++;
      } else if (val === 1) {
        nmid++;
      } else {
        // swap arr[mid] and arr[hi], hi-- (mid stays)
        [a[nmid], a[nhi]] = [a[nhi], a[nmid]];
        nhi--;
      }

      const ns = [...sorted];
      ns[val] = (ns[val] ?? 0) + 1;

      setArr(a); setLo(nlo); setMid(nmid); setHi(nhi); setSorted(ns);

      if (nmid > nhi) {
        playWin();
        setSolved(true);
      }
    }, 380);
  }

  const isDone = mid > hi;

  const mission = getMission("two-pointers", 4);
  const tools = getTools("two-pointers");
  const stats: ShellStat[] = [{ label: "MID PTR", value: mid }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{KEYFRAMES}</style>

      {/* Pointers legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        {[["lo", "#22c55e"], ["mid", "#fbbf24"], ["hi", "#a78bfa"]].map(([lbl, col]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: col as string }} />
            <span style={{ fontSize: 9, color: col as string, letterSpacing: "0.08em" }}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Ball array */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10, position: "relative" }}>
        {arr.map((val, i) => {
          const isLo  = i === lo  && !solved;
          const isMid = i === mid && !solved && mid <= hi;
          const isHi  = i === hi  && !solved;
          const isOut = i < lo || i > hi;
          const isFlying = flying === i;
          const color = BALL_COLOR[val];

          let border = `2px solid ${color}55`;
          let bg = `${color}18`;
          let shadow = "none";
          let scale = 1;
          let anim = "";

          if (isMid) {
            border = `3px solid #fbbf24`;
            bg = `${color}40`;
            shadow = `0 0 16px 4px #fbbf2466`;
            scale = 1.15;
          }
          if (isFlying) anim = "ballFly 0.35s ease forwards";
          if (isOut && !isMid) { bg = "#111"; border = "2px solid #1a1a1a"; }
          if (solved) { border = `2px solid ${color}88`; bg = `${color}28`; shadow = "none"; }

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              {/* Pointer markers above */}
              <div style={{ height: 14, display: "flex", gap: 2, alignItems: "center", justifyContent: "center" }}>
                {isLo  && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />}
                {isMid && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />}
                {isHi  && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />}
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: bg, border,
                boxShadow: shadow, color,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                transform: `scale(${scale})`,
                animation: anim,
                opacity: isOut && !solved ? 0.25 : 1,
                transition: "transform 0.2s, opacity 0.3s",
                fontSize: 10, fontWeight: 700,
              }}>
                {val}
              </div>
              <div style={{ display: "flex", gap: 2, height: 14, alignItems: "center", justifyContent: "center" }}>
                {isLo  && <span style={{ fontSize: 8, color: "#22c55e" }}>lo</span>}
                {isMid && <span style={{ fontSize: 8, color: "#fbbf24" }}>mid</span>}
                {isHi  && <span style={{ fontSize: 8, color: "#a78bfa" }}>hi</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current ball highlight */}
      {!solved && mid <= hi && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em" }}>CLASSIFY THIS BALL →</span>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `${BALL_COLOR[arr[mid]]}30`,
            border: `3px solid ${BALL_COLOR[arr[mid]]}`,
            boxShadow: `0 0 20px 6px ${BALL_COLOR[arr[mid]]}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: BALL_COLOR[arr[mid]],
            animation: shaking ? "shake 0.38s ease" : "none",
          }}>
            {arr[mid]}
          </div>
        </div>
      )}

      {/* Zone buttons */}
      {!solved && mid <= hi && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[0, 1, 2].map((z) => (
            <button
              key={z}
              onClick={() => handleZone(z)}
              style={{
                padding: "12px 20px", borderRadius: 8, cursor: "pointer",
                background: ZONE_COLOR[z], border: `1px solid ${ZONE_BORDER[z]}`,
                color: ZONE_TEXT[z], fontSize: 12, fontWeight: 700,
                fontFamily: MONO, letterSpacing: "0.08em",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              {BALL_LABEL[z]}
            </button>
          ))}
        </div>
      )}

      {/* Sorted zones */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[0, 1, 2].map((z) => (
          <div key={z} style={{
            minWidth: 80, padding: "10px 12px",
            background: ZONE_COLOR[z], border: `1px solid ${ZONE_BORDER[z]}`,
            borderRadius: 8, textAlign: "center",
            animation: solved ? "zoneGlow 1.4s ease-in-out infinite" : "none",
            color: ZONE_TEXT[z],
          }}>
            <div style={{ fontSize: 9, letterSpacing: "0.08em", marginBottom: 6 }}>{BALL_LABEL[z]}</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
              {Array.from({ length: sorted[z] ?? 0 }).map((_, k) => (
                <div key={k} style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: BALL_COLOR[z], opacity: 0.85,
                  animation: "pop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }} />
              ))}
            </div>
            <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>{sorted[z] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Win message */}
      {solved && (
        <div style={{
          padding: "16px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)", borderLeft: "3px solid rgba(34,197,94,0.7)",
          borderRadius: 6, fontSize: 12, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 2, animation: "fadeIn 0.4s ease",
        }}>
          SORTED! DUTCH NATIONAL FLAG ✓
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.8 }}>
            ONE PASS · O(n) TIME · O(1) SPACE
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 16, width: "100%", maxWidth: 560, padding: "10px 14px",
        background: "rgba(255,255,255,0.01)", border: "1px solid #141414",
        borderRadius: 4, fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        0→SWAP(lo,mid),lo++,mid++ · 1→mid++ · 2→SWAP(mid,hi),hi-- (mid unchanged)
      </div>
    </div>
    </GameShell>
  );
}
