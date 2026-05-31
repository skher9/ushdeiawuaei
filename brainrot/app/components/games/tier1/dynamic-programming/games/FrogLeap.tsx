"use client";
import { useState, useCallback, useRef, useEffect } from "react";
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

const MONO = "var(--font-mono,'JetBrains Mono',monospace)";
const PAD_COUNT = 5;
const TOTAL_WAYS = 5;

// All 5 distinct paths from pad 0 to pad 4 (hop +1 or +2 only)
const ALL_PATHS: number[][] = [
  [0,1,2,3,4],
  [0,1,2,4],
  [0,1,3,4],
  [0,2,3,4],
  [0,2,4],
];
const ALL_PATH_KEYS = new Set(ALL_PATHS.map(p => p.join(",")));

const DP = [1, 1, 2, 3, 5];

const PAD_COLORS = ["#22c55e","#3b82f6","#a855f7","#f59e0b","#818cf8"];

export default function FrogLeap({ onSolve, onAttempt }: GameProps) {
  const [frogPos, setFrogPos] = useState(0);
  const [currentPath, setCurrentPath] = useState<number[]>([0]);
  const [foundPaths, setFoundPaths] = useState<string[]>([]);
  const [justHopped, setJustHopped] = useState<number | null>(null);
  const [flashNew, setFlashNew] = useState(false);
  const [solved, setSolved] = useState(false);
  const hasAttempted = useRef(false);
  const solvedRef = useRef(false);

  const canHop = (target: number) => {
    if (solved) return false;
    return (target === frogPos + 1 || target === frogPos + 2) && target < PAD_COUNT;
  };

  const hop = useCallback((target: number) => {
    if (!canHop(target) || solved) return;

    if (!hasAttempted.current) {
      hasAttempted.current = true;
      onAttempt();
    }

    playTone(200 + target * 80, "sine", 0.15);

    const newPath = [...currentPath, target];
    setCurrentPath(newPath);
    setFrogPos(target);
    setJustHopped(target);
    setTimeout(() => setJustHopped(null), 350);

    if (target === PAD_COUNT - 1) {
      const key = newPath.join(",");
      const isNew = !foundPaths.includes(key);

      if (isNew && ALL_PATH_KEYS.has(key)) {
        const next = [...foundPaths, key];
        setFoundPaths(next);
        setFlashNew(true);
        setTimeout(() => setFlashNew(false), 600);
        playTone(523, "sine", 0.12);
        setTimeout(() => playTone(659, "sine", 0.12), 100);

        if (next.length === TOTAL_WAYS && !solvedRef.current) {
          solvedRef.current = true;
          setSolved(true);
          playTone(784, "sine", 0.2);
          setTimeout(() => playTone(1047, "sine", 0.3), 200);
          setTimeout(() => playTone(1319, "sine", 0.4), 400);
          setTimeout(() => onSolve(), 1000);
        }
      } else {
        playTone(200, "triangle", 0.1);
      }

      setTimeout(() => {
        setFrogPos(0);
        setCurrentPath([0]);
      }, 500);
    }
  }, [frogPos, currentPath, foundPaths, solved, onAttempt, onSolve]);

  const mission = getMission("dynamic-programming", 1);
  const tools = getTools("dynamic-programming");
  const stats: ShellStat[] = [{ label: "FOUND", value: foundPaths?.length ?? 0 }];

  return (
    <>
      <style>{`
        @keyframes fl-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(129,140,248,0); }
        }
        @keyframes fl-pop { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }
        @keyframes fl-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes fl-flash { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
        @keyframes fl-win { 0%,100%{box-shadow:0 0 0 0 rgba(129,140,248,0.5)} 50%{box-shadow:0 0 20px 6px rgba(129,140,248,0.2)} }
        @keyframes fl-path-in { 0%{transform:translateX(-8px);opacity:0} 100%{transform:translateX(0);opacity:1} }
      `}</style>

      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

        {/* Ways counter */}
        <div style={{
          marginBottom: 20,
          padding: "10px 24px",
          background: foundPaths.length === TOTAL_WAYS ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${foundPaths.length === TOTAL_WAYS ? "rgba(129,140,248,0.4)" : "#1a1a1a"}`,
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 20,
          animation: solved ? "fl-win 1.5s infinite" : flashNew ? "fl-flash 0.4s" : "none",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: foundPaths.length === TOTAL_WAYS ? "#818cf8" : "#e2e8f0", lineHeight: 1 }}>
              {foundPaths.length}
            </div>
            <div style={{ fontSize: 8, color: "#374151", letterSpacing: "0.1em" }}>FOUND</div>
          </div>
          <div style={{ fontSize: 18, color: "#1e1e1e" }}>/</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#374151", lineHeight: 1 }}>{TOTAL_WAYS}</div>
            <div style={{ fontSize: 8, color: "#374151", letterSpacing: "0.1em" }}>TOTAL</div>
          </div>
          {solved && (
            <div style={{ fontSize: 10, color: "#818cf8", letterSpacing: "0.1em", marginLeft: 8 }}>ALL WAYS FOUND!</div>
          )}
        </div>

        {/* Pond + pads */}
        <div style={{
          width: "100%", maxWidth: 520, marginBottom: 20,
          background: "linear-gradient(180deg, #0d1a2e 0%, #060d1a 100%)",
          border: "1px solid #0f2040",
          borderRadius: 16, padding: "28px 16px 20px",
          position: "relative",
        }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 10 }}>
            {Array.from({ length: PAD_COUNT }, (_, i) => {
              const isCurrent = frogPos === i;
              const isHoppable = canHop(i);
              const inCurrentPath = currentPath.includes(i);
              const arcOffset = Math.sin((i / (PAD_COUNT - 1)) * Math.PI) * 16;
              const col = PAD_COLORS[i];

              return (
                <div key={i} onClick={() => hop(i)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  marginBottom: arcOffset, cursor: isHoppable ? "pointer" : "default",
                }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: "50%",
                    background: isCurrent ? `${col}22` : inCurrentPath ? `${col}11` : "#111",
                    border: `2px solid ${isCurrent ? col : isHoppable ? "#818cf8" : inCurrentPath ? `${col}66` : "#1e2e1e"}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    animation: isCurrent ? "fl-bounce 1s infinite" : isHoppable ? "fl-pulse 1.2s infinite" : justHopped === i ? "fl-pop 0.35s" : "none",
                    transition: "background 0.2s, border-color 0.2s",
                  }}>
                    {isCurrent && <div style={{ fontSize: 22, lineHeight: 1 }}>🐸</div>}
                    <div style={{ fontSize: isCurrent ? 8 : 10, color: isCurrent ? col : isHoppable ? "#a5b4fc" : inCurrentPath ? `${col}aa` : "#374151", fontWeight: 700 }}>
                      {i}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.06em" }}>
                    dp[{i}]={solved ? DP[i] : "?"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current path trail */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 18 }}>
            {currentPath.length > 1 && currentPath.map((p, idx) => (
              <span key={idx} style={{ fontSize: 10, color: PAD_COLORS[p], fontWeight: 700 }}>
                {idx > 0 && <span style={{ color: "#1e1e1e", margin: "0 2px" }}>→</span>}
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Found paths list */}
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ fontSize: 9, color: "#374151", letterSpacing: "0.1em", marginBottom: 8 }}>
            PATHS DISCOVERED:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ALL_PATHS.map((path, pi) => {
              const key = path.join(",");
              const found = foundPaths.includes(key);
              const isJustFound = found && foundPaths[foundPaths.length - 1] === key;
              return (
                <div key={pi} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px",
                  background: found ? "rgba(129,140,248,0.06)" : "rgba(255,255,255,0.01)",
                  border: `1px solid ${found ? "rgba(129,140,248,0.2)" : "#141414"}`,
                  borderRadius: 5,
                  opacity: found ? 1 : 0.3,
                  animation: isJustFound ? "fl-path-in 0.35s ease" : "none",
                  transition: "all 0.3s",
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: found ? "rgba(129,140,248,0.2)" : "#1a1a1a",
                    border: `1px solid ${found ? "#818cf8" : "#222"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: found ? "#818cf8" : "#374151", fontWeight: 700,
                  }}>{pi + 1}</div>
                  {found ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {path.map((p, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {i > 0 && <span style={{ color: "#2a2a2a", fontSize: 9 }}>→</span>}
                          <span style={{ fontSize: 11, fontWeight: 700, color: PAD_COLORS[p] }}>{p}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {Array.from({ length: path.length }).map((_, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {i > 0 && <span style={{ color: "#1a1a1a", fontSize: 9 }}>→</span>}
                          <span style={{ fontSize: 10, color: "#1e1e1e", fontWeight: 700 }}>?</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginLeft: "auto", fontSize: 8, color: found ? "#475569" : "#1a1a1a", letterSpacing: "0.1em" }}>
                    {found ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {!solved && foundPaths.length > 0 && foundPaths.length < TOTAL_WAYS && (
            <div style={{ marginTop: 12, fontSize: 10, color: "#475569", textAlign: "center", letterSpacing: "0.06em" }}>
              {TOTAL_WAYS - foundPaths.length} more way{TOTAL_WAYS - foundPaths.length !== 1 ? "s" : ""} to find
            </div>
          )}
        </div>
      </div>
    </GameShell>
    </>
  );
}
