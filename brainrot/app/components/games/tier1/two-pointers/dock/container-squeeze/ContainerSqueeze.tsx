"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import DockLayout, { AhaMoment, StarBar } from "../DockLayout";
import { DOCK, calcStars, calcXP, type StarCount } from "../types";
import { SQUEEZE_LEVELS } from "./levels";

/* ── Web Audio ───────────────────────────────────────────── */
function playTone(f: number, t: OscillatorType = "sine", d = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = t; osc.frequency.value = f;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
    osc.start(); osc.stop(ctx.currentTime + d);
  } catch {}
}
function playMove()  { playTone(360, "sine", 0.1); }
function playBest()  { [660, 880].forEach((f,i) => setTimeout(() => playTone(f,"sine",0.18), i*80)); }
function playWin()   { [660, 880, 1100].forEach((f,i) => setTimeout(() => playTone(f,"sine",0.2), i*90)); }
function playDrip()  { playTone(500, "sine", 0.08); setTimeout(() => playTone(320, "sine", 0.08), 100); }

/* ── Bar chart visualization ─────────────────────────────── */
function WaterChart({
  heights, left, right, maxH, bestL, bestR, rainTrap, waterLevels, showWater = true,
}: {
  heights: number[]; left: number; right: number; maxH: number;
  bestL?: number; bestR?: number;
  rainTrap?: boolean; waterLevels?: number[]; showWater?: boolean;
}) {
  const n = heights.length;
  const barW = Math.min(52, Math.floor(600 / n) - 4);
  const scale = 130 / (maxH || 1);

  const area = Math.min(heights[left], heights[right]) * (right - left);
  const bestArea = bestL !== undefined && bestR !== undefined
    ? Math.min(heights[bestL], heights[bestR]) * (bestR - bestL)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Bar chart */}
      <div style={{ position: "relative", height: 160, display: "flex", alignItems: "flex-end", gap: 3 }}>
        {heights.map((h, i) => {
          const isL = i === left, isR = i === right;
          const isBestL = i === bestL, isBestR = i === bestR;
          const inRange = i > left && i < right;
          const barH = Math.max(8, h * scale);
          const waterH = rainTrap && waterLevels ? Math.max(0, waterLevels[i] - h) * scale : 0;
          const barColor = isL ? DOCK.blue : isR ? DOCK.red : isBestL || isBestR ? DOCK.amber : "rgba(100,150,180,0.6)";

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: barW }}>
              {/* Water on top */}
              {waterH > 0 && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: waterH }}
                  transition={{ duration: 0.4 }}
                  style={{ width: "100%", background: "rgba(0,180,200,0.35)", borderRadius: "2px 2px 0 0", flexShrink: 0 }}
                />
              )}
              {/* Bar */}
              <motion.div
                animate={{ height: barH }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  width: "100%", background: barColor,
                  borderRadius: "4px 4px 0 0", flexShrink: 0,
                  border: (isL || isR) ? `2px solid ${isL ? DOCK.blue : DOCK.red}` : "none",
                  boxShadow: isL ? `0 0 12px ${DOCK.blue}` : isR ? `0 0 12px ${DOCK.red}` : "none",
                  position: "relative",
                }}
              />
              {/* Water fill between bars */}
              {showWater && inRange && !rainTrap && (
                <motion.div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: barW * n + 3 * (n - 1),
                    height: Math.min(heights[left], heights[right]) * scale,
                    background: "rgba(0,100,200,0.08)",
                    border: "1px dashed rgba(0,180,200,0.2)",
                    pointerEvents: "none",
                    display: i === left ? "block" : "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Height labels */}
      <div style={{ display: "flex", gap: 3 }}>
        {heights.map((h, i) => (
          <div key={i} style={{
            width: barW, textAlign: "center",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: i === left ? DOCK.blue : i === right ? DOCK.red : DOCK.textFaint,
          }}>{h}</div>
        ))}
      </div>

      {/* Pointer labels */}
      <div style={{ display: "flex", gap: 3 }}>
        {heights.map((_, i) => (
          <div key={i} style={{ width: barW, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9 }}>
            {i === left ? <span style={{ color: DOCK.blue }}>L</span> : i === right ? <span style={{ color: DOCK.red }}>R</span> : null}
          </div>
        ))}
      </div>

      {/* Current area */}
      {!rainTrap && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: DOCK.textDim, textAlign: "center" }}>
          CURRENT: <span style={{ color: DOCK.cyan, fontWeight: 800, fontSize: 18 }}>{area}</span>
          {bestArea > 0 && (
            <span style={{ marginLeft: 16 }}>BEST: <span style={{ color: DOCK.amber, fontWeight: 800 }}>{bestArea}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main ContainerSqueeze component
═══════════════════════════════════════════════════════════ */
interface Props {
  levelNum: number;
  onComplete: (r: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function ContainerSqueeze({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = SQUEEZE_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/two-pointers"); return null; }

  const [heights, setHeights] = useState<number[]>([...cfg.heights]);
  const maxH = Math.max(...heights);
  const [left,  setLeft]  = useState(0);
  const [right, setRight] = useState(heights.length - 1);
  const [moves, setMoves] = useState(0);
  const [optimalDecisions, setOptimalDecisions] = useState(0);
  const [phase, setPhase] = useState<"playing" | "aha">("playing");
  const [stars, setStars] = useState<StarCount>(3);
  const [bestL, setBestL] = useState<number | undefined>();
  const [bestR, setBestR] = useState<number | undefined>();
  const [bestArea, setBestArea] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fbColor, setFbColor]   = useState(DOCK.green);

  /* Explore phase */
  const [exploreMode, setExploreMode] = useState(cfg.mode === "explore");
  const [triedPairs, setTriedPairs] = useState<[number, number][]>([]);

  /* Rain trap */
  const [rainL, setRainL] = useState(0);
  const [rainR, setRainR] = useState(heights.length - 1);
  const [rainMaxL, setRainMaxL] = useState(heights[0]);
  const [rainMaxR, setRainMaxR] = useState(heights[heights.length - 1]);
  const [rainWater, setRainWater] = useState(0);
  const [waterLevels, setWaterLevels] = useState<number[]>(heights.map(() => 0));

  /* Shrinking */
  const [shrinkHeights, setShrinkHeights] = useState([...cfg.heights]);
  const [shrinkTimer, setShrinkTimer] = useState(10);
  const [shrinkLeft,  setShrinkLeft]  = useState(0);
  const [shrinkRight, setShrinkRight] = useState(cfg.heights.length - 1);
  const [shrinkBest,  setShrinkBest]  = useState(0);

  /* Build mode */
  const [buildHeights, setBuildHeights] = useState<number[]>(Array(8).fill(1));
  const [builtL, setBuiltL] = useState(0);
  const [builtR, setBuiltR] = useState(7);

  /* Multi */
  const MULTI_ARRS = [[1,8,6,2,5,4,8,3],[4,3,2,1,4],[2,3,10,6,5,8,1,7]];
  const [multiActive, setMultiActive] = useState(0);
  const [multiStates, setMultiStates] = useState(MULTI_ARRS.map(a => ({ l: 0, r: a.length-1, best: 0, done: false })));

  /* Boss */
  const BOSS_ARRS = [[1,8,6,2,5,4,8,3],[4,3,2,1,4,6,7],[0,1,0,2,1,0,1,3,2,1,2,1],[2,9,4,8,6],[1,5,3,7,2,6,4]];
  const BOSS_MODES = ["container","container","rain","container","container"] as const;
  const [bossActive, setBossActive] = useState(0);
  const [bossDone, setBossDone]     = useState<boolean[]>(Array(5).fill(false));
  const [bossL, setBossL]           = useState(BOSS_ARRS.map(() => 0));
  const [bossR, setBossR]           = useState(BOSS_ARRS.map((a) => a.length - 1));
  const [bossBest, setBossBest]     = useState<number[]>(BOSS_ARRS.map(() => 0));
  const [bossTimer, setBossTimer]   = useState(90);

  /* Boss timer */
  useEffect(() => {
    if (cfg.mode !== "boss" || phase !== "playing") return;
    const id = setInterval(() => {
      setBossTimer(t => {
        if (t <= 1) { finalize(moves); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cfg.mode, phase]);

  /* Shrinking timer */
  useEffect(() => {
    if (cfg.mode !== "shrinking" || phase !== "playing") return;
    const id = setInterval(() => {
      setShrinkTimer(t => {
        if (t <= 1) {
          setShrinkHeights(prev => {
            if (prev.length <= 2) return prev;
            const idx = Math.floor(Math.random() * prev.length);
            const next = prev.filter((_, i) => i !== idx);
            setShrinkLeft(0); setShrinkRight(next.length - 1);
            return next;
          });
          return 10;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cfg.mode, phase]);

  function showFeedback(msg: string, color = DOCK.green) {
    setFeedback(msg); setFbColor(color);
    setTimeout(() => setFeedback(null), 1800);
  }

  function finalize(totalMoves: number) {
    const s = calcStars(totalMoves, cfg.optimalMoves);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); addXP(xp); onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  function updateBest(l: number, r: number, hs: number[]) {
    const area = Math.min(hs[l], hs[r]) * (r - l);
    if (area > bestArea) {
      setBestArea(area); setBestL(l); setBestR(r);
      playBest(); showFeedback(`NEW BEST: ${area} 🏆`);
      return area;
    }
    return bestArea;
  }

  /* ── Container move ── */
  const movePointer = useCallback((dir: "left" | "right") => {
    if (phase !== "playing") return;
    const h = heights, l = left, r = right;
    const newL = dir === "left" ? l + 1 : l;
    const newR = dir === "right" ? r - 1 : r;
    if (newL >= newR) { finalize(moves + 1); return; }

    const optimalDir = h[l] <= h[r] ? "left" : "right";
    if (dir === optimalDir) setOptimalDecisions(d => d + 1);

    if (cfg.mode === "guided" && dir !== optimalDir) {
      showFeedback(`WRONG! Move the ${h[l] <= h[r] ? "LEFT" : "RIGHT"} wall (it's shorter)`, DOCK.red);
      return;
    }

    const area = Math.min(h[newL], h[newR]) * (newR - newL);
    playMove();
    if (area > bestArea) {
      setBestArea(area); setBestL(newL); setBestR(newR);
      playBest(); showFeedback(`NEW BEST: ${area}`);
    } else {
      showFeedback(`Area: ${area} (best: ${bestArea || Math.min(h[l],h[r])*(r-l)})`);
    }

    setLeft(newL); setRight(newR); setMoves(m => m + 1);
    if (newL + 1 >= newR) { setTimeout(() => finalize(moves + 1), 600); }
  }, [phase, left, right, heights, moves, bestArea, cfg.mode]);

  /* ── Rain trap step ── */
  function rainStep() {
    if (phase !== "playing") return;
    const l = rainL, r = rainR, h = heights;
    if (l >= r) { playWin(); setTimeout(() => finalize(moves), 600); return; }
    const newLevels = [...waterLevels];
    let newWater = rainWater, newMaxL = rainMaxL, newMaxR = rainMaxR;
    if (rainMaxL <= rainMaxR) {
      newMaxL = Math.max(rainMaxL, h[l]);
      const water = Math.max(0, newMaxL - h[l]);
      newWater += water;
      newLevels[l] = newMaxL;
      setRainL(l + 1);
      if (water > 0) { playDrip(); showFeedback(`Water at [${l}]: ${water} (maxL=${newMaxL})`); }
      else showFeedback(`Bar [${l}]=${h[l]} too tall, no water`);
    } else {
      newMaxR = Math.max(rainMaxR, h[r]);
      const water = Math.max(0, newMaxR - h[r]);
      newWater += water;
      newLevels[r] = newMaxR;
      setRainR(r - 1);
      if (water > 0) { playDrip(); showFeedback(`Water at [${r}]: ${water} (maxR=${newMaxR})`); }
      else showFeedback(`Bar [${r}]=${h[r]} too tall, no water`);
    }
    setRainMaxL(newMaxL); setRainMaxR(newMaxR);
    setRainWater(newWater); setWaterLevels(newLevels);
    setMoves(m => m + 1);
    if (l + 1 >= r - 1) { playWin(); setTimeout(() => finalize(moves + 1), 600); }
  }

  /* ── Shrink step ── */
  function shrinkStep(dir: "left" | "right") {
    const h = shrinkHeights, l = shrinkLeft, r = shrinkRight;
    if (l >= r) { finalize(moves + 1); return; }
    const newL = dir === "left" ? l + 1 : l;
    const newR = dir === "right" ? r - 1 : r;
    const area = Math.min(h[newL], h[newR]) * (newR - newL);
    if (area > shrinkBest) { setShrinkBest(area); playBest(); showFeedback(`NEW BEST: ${area}`); }
    setShrinkLeft(newL); setShrinkRight(newR); setMoves(m => m + 1); playMove();
    if (newL + 1 >= newR) { setShrinkLeft(0); setShrinkRight(h.length - 1); }
  }

  /* ── Build mode ── */
  function setBuildHeight(i: number, delta: number) {
    const next = [...buildHeights];
    next[i] = Math.max(1, Math.min(10, next[i] + delta));
    setBuildHeights(next);
    const l = builtL, r = builtR;
    const area = Math.min(next[l], next[r]) * (r - l);
    if (area >= (cfg.targetVolume ?? 24)) {
      playWin(); showFeedback(`TARGET ${cfg.targetVolume} REACHED!`);
      setTimeout(() => finalize(moves + 1), 800);
    }
  }
  function buildPointerStep(dir: "left" | "right") {
    const h = buildHeights, l = builtL, r = builtR;
    const newL = dir === "left" ? l + 1 : l;
    const newR = dir === "right" ? r - 1 : r;
    if (newL >= newR) return;
    setBuiltL(newL); setBuiltR(newR); setMoves(m => m + 1); playMove();
    const area = Math.min(h[newL], h[newR]) * (newR - newL);
    showFeedback(`Area: ${area}`);
  }

  /* ── Multi step ── */
  function multiStep(dir: "left" | "right") {
    const s = multiStates[multiActive];
    const h = MULTI_ARRS[multiActive];
    const newL = dir === "left" ? s.l + 1 : s.l;
    const newR = dir === "right" ? s.r - 1 : s.r;
    const area = Math.min(h[newL], h[newR]) * (newR - newL);
    const newBest = Math.max(s.best, area);
    const done = newL + 1 >= newR;
    const next = multiStates.map((ms, i) => i === multiActive ? { ...ms, l: newL, r: newR, best: newBest, done } : ms);
    setMultiStates(next); setMoves(m => m + 1); playMove();
    if (done) {
      playWin();
      if (next.every(ms => ms.done)) setTimeout(() => finalize(moves + 1), 600);
      else setMultiActive(i => (i + 1) % MULTI_ARRS.length);
    }
  }

  /* ── Boss step ── */
  function bossStep(dir: "left" | "right") {
    const h = BOSS_ARRS[bossActive];
    const l = bossL[bossActive], r = bossR[bossActive];
    const newL = dir === "left" ? l + 1 : l;
    const newR = dir === "right" ? r - 1 : r;
    if (newL >= newR) {
      const done = [...bossDone]; done[bossActive] = true; setBossDone(done);
      playWin();
      if (done.every(Boolean)) setTimeout(() => finalize(moves + 1), 600);
      else setBossActive(i => (i + 1) % BOSS_ARRS.length);
      return;
    }
    const area = Math.min(h[newL], h[newR]) * (newR - newL);
    const newBest = Math.max(bossBest[bossActive], area);
    const nl = [...bossL]; nl[bossActive] = newL; setBossL(nl);
    const nr = [...bossR]; nr[bossActive] = newR; setBossR(nr);
    const nb = [...bossBest]; nb[bossActive] = newBest; setBossBest(nb);
    setMoves(m => m + 1); playMove();
    showFeedback(`Area: ${area}, best: ${newBest}`);
  }

  /* ── Explore try pair ── */
  function tryPair(i: number) {
    if (!exploreMode) return;
    const pair: [number, number] = [Math.min(left, i), Math.max(right, i)];
    setTriedPairs(prev => [...prev, pair]);
    const area = Math.min(heights[pair[0]], heights[pair[1]]) * (pair[1] - pair[0]);
    if (area > bestArea) { setBestArea(area); setBestL(pair[0]); setBestR(pair[1]); playBest(); }
    showFeedback(`Pair [${pair[0]},${pair[1]}]: area=${area}`);
    if (triedPairs.length >= 4) setExploreMode(false);
  }

  const isContainer = cfg.mode === "explore" || cfg.mode === "guided" || cfg.mode === "player";
  const activeMoveLeft  = () => {
    if (cfg.mode === "shrinking") shrinkStep("left");
    else if (cfg.mode === "multi") multiStep("left");
    else if (cfg.mode === "boss") bossStep("left");
    else if (cfg.mode === "build") buildPointerStep("left");
    else movePointer("left");
  };
  const activeMoveRight = () => {
    if (cfg.mode === "shrinking") shrinkStep("right");
    else if (cfg.mode === "multi") multiStep("right");
    else if (cfg.mode === "boss") bossStep("right");
    else if (cfg.mode === "build") buildPointerStep("right");
    else movePointer("right");
  };

  const displayH = cfg.mode === "shrinking" ? shrinkHeights
                 : cfg.mode === "build"     ? buildHeights
                 : cfg.mode === "multi"     ? MULTI_ARRS[multiActive]
                 : cfg.mode === "boss"      ? BOSS_ARRS[bossActive]
                 : heights;
  const displayL = cfg.mode === "shrinking" ? shrinkLeft
                 : cfg.mode === "build"     ? builtL
                 : cfg.mode === "multi"     ? multiStates[multiActive].l
                 : cfg.mode === "boss"      ? bossL[bossActive]
                 : cfg.mode === "rain_trap" ? rainL
                 : left;
  const displayR = cfg.mode === "shrinking" ? shrinkRight
                 : cfg.mode === "build"     ? builtR
                 : cfg.mode === "multi"     ? multiStates[multiActive].r
                 : cfg.mode === "boss"      ? bossR[bossActive]
                 : cfg.mode === "rain_trap" ? rainR
                 : right;

  return (
    <DockLayout gameName="CONTAINER SQUEEZE" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: DOCK.amberDim, marginBottom: 6 }}>
            MANIFEST {levelNum} OF 8
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: DOCK.text, marginBottom: 4 }}>
            {cfg.caseTitle.toUpperCase()}
          </h2>
          <StarBar stars={stars} />
        </div>

        <p style={{ color: DOCK.textDim, textAlign: "center", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6, fontSize: 13 }}>
          {cfg.storyBeat}
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint, letterSpacing: "0.14em" }}>MOVES</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.cyan }}>{moves}</div>
          </div>
          {(isContainer || cfg.mode === "shrinking") && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>BEST AREA</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.amber }}>{bestArea || Math.min(heights[0], heights[heights.length-1]) * (heights.length-1)}</div>
            </div>
          )}
          {cfg.mode === "rain_trap" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>WATER TRAPPED</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.blue }}>{rainWater}</div>
            </div>
          )}
          {cfg.mode === "shrinking" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>NEXT SINK</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: shrinkTimer <= 4 ? DOCK.red : DOCK.steel }}>{shrinkTimer}s</div>
            </div>
          )}
          {cfg.mode === "boss" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>TIME LEFT</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: bossTimer <= 20 ? DOCK.red : DOCK.amber }}>{bossTimer}s</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>DOCKS DONE</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.green }}>{bossDone.filter(Boolean).length}/5</div>
              </div>
            </>
          )}
          {cfg.mode === "build" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>TARGET</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.amber }}>{cfg.targetVolume}</div>
            </div>
          )}
          {cfg.mode === "player" && moves > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>OPTIMAL MOVES</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.green }}>{optimalDecisions}/{moves}</div>
            </div>
          )}
        </div>

        {/* Boss/Multi tabs */}
        {cfg.mode === "boss" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
            {BOSS_ARRS.map((_, i) => (
              <button key={i} onClick={() => setBossActive(i)} style={{
                padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                background: bossActive === i ? "rgba(0,180,200,0.12)" : "rgba(10,16,32,0.6)",
                border: `1px solid ${bossActive === i ? DOCK.borderBlue : DOCK.border}`,
                color: bossDone[i] ? DOCK.green : bossActive === i ? DOCK.cyan : DOCK.textDim,
                fontFamily: "var(--font-mono)", fontSize: 10,
              }}>
                {bossDone[i] ? "✓" : `D${i+1}`}
              </button>
            ))}
          </div>
        )}
        {cfg.mode === "multi" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
            {MULTI_ARRS.map((_, i) => (
              <button key={i} onClick={() => setMultiActive(i)} style={{
                padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                background: multiActive === i ? "rgba(0,180,200,0.12)" : "rgba(10,16,32,0.6)",
                border: `1px solid ${multiActive === i ? DOCK.borderBlue : DOCK.border}`,
                color: multiStates[i].done ? DOCK.green : multiActive === i ? DOCK.cyan : DOCK.textDim,
                fontFamily: "var(--font-mono)", fontSize: 10,
              }}>
                {multiStates[i].done ? "✓" : `DOCK ${i+1}`}
              </button>
            ))}
          </div>
        )}

        {/* Build height controls */}
        {cfg.mode === "build" && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
            {buildHeights.map((h, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={() => setBuildHeight(i, 1)} style={{ padding: "2px 8px", background: "rgba(0,180,200,0.1)", border: `1px solid ${DOCK.border}`, borderRadius: 4, color: DOCK.cyan, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}>▲</button>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: DOCK.text }}>{h}</div>
                <button onClick={() => setBuildHeight(i, -1)} style={{ padding: "2px 8px", background: "rgba(255,74,106,0.08)", border: `1px solid ${DOCK.border}`, borderRadius: 4, color: DOCK.red, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}>▼</button>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ marginBottom: 20 }}>
          <WaterChart
            heights={displayH} left={displayL} right={displayR}
            maxH={Math.max(...displayH)} bestL={bestL} bestR={bestR}
            rainTrap={cfg.mode === "rain_trap"}
            waterLevels={cfg.mode === "rain_trap" ? waterLevels : undefined}
            showWater={isContainer}
          />
        </div>

        {/* Explore tried pairs */}
        {exploreMode && triedPairs.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {triedPairs.map(([l, r], i) => {
              const a = Math.min(heights[l], heights[r]) * (r - l);
              return (
                <div key={i} style={{ padding: "4px 10px", background: "rgba(10,16,32,0.7)", border: `1px solid ${DOCK.border}`, borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: a === bestArea ? DOCK.amber : DOCK.textDim }}>
                  [{l},{r}]={a}
                </div>
              );
            })}
          </div>
        )}
        {exploreMode && (
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber, marginBottom: 12, letterSpacing: "0.12em" }}>
            EXPLORE MODE — try a few pairs by clicking bars, then switch to two-pointer
          </div>
        )}

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginBottom: 14, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: fbColor }}
            >{feedback}</motion.div>
          )}
        </AnimatePresence>

        {/* Guided hint */}
        {cfg.mode === "guided" && phase === "playing" && (
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.cyan, marginBottom: 12, letterSpacing: "0.12em" }}
          >
            HINT: MOVE {heights[left] <= heights[right] ? "LEFT" : "RIGHT"} WALL INWARD (it{"'"}s shorter)
          </motion.div>
        )}

        {/* Action buttons */}
        {phase === "playing" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            {cfg.mode === "rain_trap" ? (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={rainStep}
                style={{ padding: "12px 28px", borderRadius: 8, cursor: "pointer", background: "rgba(0,100,200,0.12)", border: `1px solid ${DOCK.borderBlue}`, color: DOCK.blue, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                PROCESS NEXT BAR →
              </motion.button>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={activeMoveLeft}
                  disabled={displayL + 1 >= displayR}
                  style={{ padding: "12px 28px", borderRadius: 8, cursor: "pointer", background: "rgba(68,136,255,0.12)", border: `1px solid ${DOCK.borderBlue}`, color: DOCK.blue, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", opacity: displayL + 1 >= displayR ? 0.4 : 1 }}>
                  MOVE LEFT →
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={activeMoveRight}
                  disabled={displayR - 1 <= displayL}
                  style={{ padding: "12px 28px", borderRadius: 8, cursor: "pointer", background: "rgba(255,74,106,0.12)", border: `1px solid ${DOCK.borderRed}`, color: DOCK.red, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", opacity: displayR - 1 <= displayL ? 0.4 : 1 }}>
                  ← MOVE RIGHT
                </motion.button>
                {exploreMode && (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setExploreMode(false)}
                    style={{ padding: "12px 20px", borderRadius: 8, cursor: "pointer", background: "rgba(240,165,0,0.1)", border: `1px solid ${DOCK.amberDim}`, color: DOCK.amber, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>
                    START TWO-POINTER →
                  </motion.button>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, letterSpacing: "0.12em" }}>
          MOVES: {moves} · OPTIMAL: {cfg.optimalMoves}
        </div>
      </div>

      <AnimatePresence>
        {phase === "aha" && (
          <AhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(n)"
            onContinue={() => {
              const next = levelNum + 1;
              router.push(next <= 8 ? `/learn/tier1/two-pointers/container-squeeze/${next}` : "/learn/tier1/two-pointers/container-squeeze");
            }}
          />
        )}
      </AnimatePresence>
    </DockLayout>
  );
}
