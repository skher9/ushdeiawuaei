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
  { fruits: [1, 2, 1, 2, 3, 3, 2, 2, 1] },
  { fruits: [1, 1, 2, 3, 3, 2, 2] },
  { fruits: [3, 3, 3, 1, 2, 1, 1, 2, 3, 3, 4] },
];

const FRUIT_STYLES: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: "#fbbf2422", border: "#fbbf24", label: "1" },
  2: { bg: "#f9731622", border: "#f97316", label: "2" },
  3: { bg: "#a855f722", border: "#a855f7", label: "3" },
  4: { bg: "#22c55e22", border: "#22c55e", label: "4" },
};

function computeAnswer(fruits: number[]): number {
  let l = 0, maxLen = 0;
  const map = new Map<number, number>();
  for (let r = 0; r < fruits.length; r++) {
    map.set(fruits[r], (map.get(fruits[r]) ?? 0) + 1);
    while (map.size > 2) {
      const lf = fruits[l];
      const cnt = map.get(lf)! - 1;
      if (cnt === 0) map.delete(lf); else map.set(lf, cnt);
      l++;
    }
    maxLen = Math.max(maxLen, r - l + 1);
  }
  return maxLen;
}

type Phase = "picking" | "overflow" | "won";

export default function FruitBasket({ onSolve, onAttempt }: GameProps) {
  const [probIdx] = useState(() => Math.floor(Math.random() * PROBLEMS.length));
  const fruits = PROBLEMS[probIdx].fruits;
  const answer = computeAnswer(fruits);

  const [L, setL] = useState(0);
  const [R, setR] = useState(-1);
  const [baskets, setBaskets] = useState<[number | null, number | null]>([null, null]);
  const [windowMap, setWindowMap] = useState<Map<number, number>>(new Map());
  const [longest, setLongest] = useState(0);
  const [phase, setPhase] = useState<Phase>("picking");
  const [overflowType, setOverflowType] = useState<number | null>(null);
  const [basketShake, setBasketShake] = useState<0 | 1 | null>(null);
  const [bounceBasket, setBounceBasket] = useState<0 | 1 | null>(null);
  const [attempted, setAttempted] = useState(false);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (phase === "won" && !solvedRef.current) {
      solvedRef.current = true;
      setTimeout(() => onSolve(), 1200);
    }
  }, [phase, onSolve]);

  function doAttempt() {
    if (!attempted) { setAttempted(true); onAttempt(); }
  }

  function pickFruit(i: number) {
    if (phase !== "picking" || i !== R + 1) return;
    doAttempt();
    const ftype = fruits[i];
    const newMap = new Map(windowMap);

    // Check if it's a new type
    const typesInWindow = new Set([...newMap.keys()].filter(k => newMap.get(k)! > 0));
    const alreadyHave = typesInWindow.has(ftype);
    const isThirdType = !alreadyHave && typesInWindow.size >= 2;

    if (isThirdType) {
      // Overflow!
      setOverflowType(ftype);
      setPhase("overflow");
      setBasketShake(0);
      setTimeout(() => setBasketShake(1), 60);
      setTimeout(() => setBasketShake(null), 600);
      playTone(120, "sawtooth", 0.25);
      return;
    }

    // Valid pick
    newMap.set(ftype, (newMap.get(ftype) ?? 0) + 1);
    const newR = i;
    const newLen = newR - L + 1;
    const newLongest = Math.max(longest, newLen);
    setWindowMap(newMap);
    setR(newR);
    setLongest(newLongest);

    // Update baskets
    const newBaskets: [number | null, number | null] = [...baskets] as [number | null, number | null];
    if (!newBaskets[0] && !newBaskets[1]) {
      newBaskets[0] = ftype;
      setBounceBasket(0);
    } else if (newBaskets[0] === ftype) {
      setBounceBasket(0);
    } else if (newBaskets[1] === ftype) {
      setBounceBasket(1);
    } else if (!newBaskets[0]) {
      newBaskets[0] = ftype;
      setBounceBasket(0);
    } else {
      newBaskets[1] = ftype;
      setBounceBasket(1);
    }
    setBaskets(newBaskets);
    setTimeout(() => setBounceBasket(null), 400);

    playTone(440, "sine", 0.1);

    if (newR === fruits.length - 1) {
      // Reached end
      if (newLongest === answer) {
        setPhase("won");
      }
    }
  }

  function abandonBasket(slot: 0 | 1) {
    if (phase !== "overflow" || overflowType === null) return;
    doAttempt();
    const abandonedType = baskets[slot];
    if (abandonedType === null) return;

    // Shrink left until abandonedType is completely gone from window
    const freshMap = new Map(windowMap);
    let l2 = L;
    while (l2 <= R && (freshMap.get(abandonedType) ?? 0) > 0) {
      const f = fruits[l2];
      const c = (freshMap.get(f) ?? 0) - 1;
      if (c === 0) freshMap.delete(f); else freshMap.set(f, c);
      l2++;
    }

    const newBaskets: [number | null, number | null] = [...baskets] as [number | null, number | null];
    newBaskets[slot] = null;

    setL(l2);
    setWindowMap(freshMap);
    setBaskets(newBaskets);
    setOverflowType(null);
    setPhase("picking");
    playTone(300, "sine", 0.15);

    // Now try to pick the overflow fruit again
    if (l2 <= R + 1) {
      const ftype = overflowType;
      const finalMap = new Map(freshMap);
      finalMap.set(ftype, (finalMap.get(ftype) ?? 0) + 1);
      const newR2 = R + 1;
      const newLen2 = newR2 - l2 + 1;
      const newLongest2 = Math.max(longest, newLen2);

      const nb: [number | null, number | null] = [...newBaskets] as [number | null, number | null];
      if (!nb[0]) nb[0] = ftype;
      else if (!nb[1]) nb[1] = ftype;

      setWindowMap(finalMap);
      setR(newR2);
      setLongest(newLongest2);
      setBaskets(nb);

      if (newR2 === fruits.length - 1) {
        if (newLongest2 === answer) setTimeout(() => setPhase("won"), 100);
      }
    }
  }

  const won = phase === "won";
  const windowLen = R >= L ? R - L + 1 : 0;

  const mission = getMission("sliding-window", 5);
  const tools = getTools("sliding-window");
  const stats: ShellStat[] = [{ label: "WINDOW LEN", value: longest }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          70% { transform: translateY(-4px); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fruitPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header */}
{/* Longest tracker */}
      <div style={{
        marginBottom: 14, display: "flex", gap: 20, fontSize: 10, color: "#475569", letterSpacing: "0.08em",
      }}>
        <span>WINDOW: <strong style={{ color: "#eab308" }}>{windowLen}</strong></span>
        <span>LONGEST: <strong style={{ color: "#10b981" }}>{longest}</strong></span>
        <span>ANSWER: <strong style={{ color: won ? "#22c55e" : "#374151" }}>{won ? answer : "?"}</strong></span>
      </div>

      {/* Fruit row */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20, flexWrap: "wrap", justifyContent: "center", position: "relative" }}>
        {fruits.map((ftype, i) => {
          const inWindow = i >= L && i <= R;
          const isNext = i === R + 1 && phase === "picking";
          const style = FRUIT_STYLES[ftype] ?? FRUIT_STYLES[1];
          return (
            <div key={i}
              onClick={() => pickFruit(i)}
              style={{
                width: 40, height: 48,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: inWindow ? style.bg : "rgba(255,255,255,0.02)",
                border: `2px solid ${inWindow ? style.border : isNext ? style.border + "88" : "#1a1a1a"}`,
                borderRadius: 8,
                cursor: isNext ? "pointer" : "default",
                transition: "all 0.15s",
                opacity: i > R + 1 && phase === "picking" ? 0.35 : 1,
                position: "relative",
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: style.border,
                boxShadow: isNext ? `0 0 8px ${style.border}` : "none",
                transition: "box-shadow 0.15s",
              }} />
              <span style={{ fontSize: 8, color: "#475569", marginTop: 2 }}>{i}</span>
              {isNext && (
                <span style={{
                  position: "absolute", top: -16, fontSize: 8, color: style.border,
                  animation: "fruitPop 0.3s ease-out",
                }}>NEXT</span>
              )}
            </div>
          );
        })}
        {/* Window bracket */}
        {R >= L && (
          <div style={{
            position: "absolute", bottom: -6,
            left: L * 45, width: (R - L + 1) * 45 - 5,
            height: 3, background: "#10b981", borderRadius: 2,
            transition: "left 0.2s, width 0.2s",
          }} />
        )}
      </div>

      {/* Overflow alert */}
      {phase === "overflow" && (
        <div style={{
          marginBottom: 14, padding: "10px 20px",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 6, fontSize: 11, color: "#ef4444",
          letterSpacing: "0.08em", textAlign: "center",
        }}>
          3RD TYPE! DROP A BASKET TO MAKE ROOM
          <div style={{ fontSize: 9, color: "#f87171", marginTop: 4 }}>
            (window will shrink left until that type is gone)
          </div>
        </div>
      )}

      {/* Baskets */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {([0, 1] as const).map(slot => {
          const ftype = baskets[slot];
          const style = ftype ? FRUIT_STYLES[ftype] : null;
          return (
            <div key={slot}
              onClick={() => phase === "overflow" ? abandonBasket(slot) : undefined}
              style={{
                width: 90, minHeight: 80,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                background: phase === "overflow" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${phase === "overflow" ? "rgba(239,68,68,0.4)" : "#1a1a1a"}`,
                borderRadius: 8, padding: "10px 8px",
                cursor: phase === "overflow" ? "pointer" : "default",
                animation: basketShake !== null ? "shake 0.5s ease" : bounceBasket === slot ? "bounce 0.4s ease" : "none",
                transition: "background 0.2s, border 0.2s",
              }}>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>BASKET {slot + 1}</div>
              {ftype && style ? (
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: style.border,
                  }} />
                  <div style={{ fontSize: 10, color: style.border, fontWeight: 700 }}>
                    TYPE {ftype}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569" }}>
                    ×{windowMap.get(ftype) ?? 0}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: "#2d2d2d" }}>EMPTY</div>
              )}
              {phase === "overflow" && ftype && (
                <div style={{ fontSize: 8, color: "#ef4444", letterSpacing: "0.06em" }}>CLICK TO DROP</div>
              )}
            </div>
          );
        })}
      </div>

      {won && (
        <div style={{
          padding: "14px 24px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6,
          fontSize: 11, color: "#22c55e", letterSpacing: "0.08em",
          textAlign: "center", lineHeight: 1.8, marginBottom: 12,
        }}>
          MAX COLLECTION: {answer} FRUITS
          <br />
          <span style={{ fontSize: 9, color: "#4ade80", opacity: 0.7 }}>
            EXPAND RIGHT · 3RD TYPE = SHRINK LEFT · AT MOST 2 DISTINCT
          </span>
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 500,
        padding: "8px 12px", background: "rgba(255,255,255,0.01)",
        border: "1px solid #141414", borderRadius: 4,
        fontSize: 9, color: "#374151", lineHeight: 1.7, letterSpacing: "0.04em",
      }}>
        PICK NEXT FRUIT · 3RD DISTINCT TYPE = OVERFLOW · DROP BASKET = SHRINK LEFT UNTIL GONE
      </div>
    </div>
    </GameShell>
  );
}
