"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import DockLayout, { AhaMoment, StarBar } from "../DockLayout";
import { DOCK, calcStars, calcXP, type StarCount } from "../types";
import { CARGO_LEVELS } from "./levels";

/* ── Web Audio helpers ───────────────────────────────────── */
function playTone(freq: number, type: OscillatorType = "sine", dur = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}
function playMove()  { playTone(340, "sine", 0.1); }
function playError() { playTone(120, "triangle", 0.18); }
function playFound() { [660,880,1100].forEach((f,i) => setTimeout(() => playTone(f,"sine",0.18), i*80)); }
function playDockBell() { playTone(830, "sine", 0.3); setTimeout(() => playTone(1046, "sine", 0.25), 200); }

/* ── Crate row ───────────────────────────────────────────── */
function CrateRow({
  arr, left, right, foundPairs = [], fogMode = false, revealedSet,
  highlight,
}: {
  arr: number[]; left: number; right: number;
  foundPairs?: [number, number][];
  fogMode?: boolean; revealedSet?: Set<number>;
  highlight?: number | null;
}) {
  const n = arr.length;
  const crateW = Math.min(56, Math.floor(600 / n) - 4);
  const isFound = (i: number) => foundPairs.some(([l, r]) => l === i || r === i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Crane hooks */}
      <div style={{ display: "flex", gap: 4, height: 32, alignItems: "flex-end" }}>
        {arr.map((_, i) => {
          const isLeft  = i === left;
          const isRight = i === right;
          if (!isLeft && !isRight) return <div key={i} style={{ width: crateW }} />;
          return (
            <motion.div key={i}
              initial={{ y: -10 }} animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                width: crateW, height: 26, display: "flex", flexDirection: "column", alignItems: "center",
              }}
            >
              <div style={{ width: 2, flex: 1, background: isLeft ? DOCK.blue : DOCK.red, opacity: 0.6 }} />
              <div style={{
                width: 14, height: 8, borderRadius: "0 0 4px 4px",
                background: isLeft ? DOCK.blue : DOCK.red,
                boxShadow: `0 0 8px ${isLeft ? DOCK.blue : DOCK.red}`,
              }} />
            </motion.div>
          );
        })}
      </div>

      {/* Crates */}
      <div style={{ display: "flex", gap: 4 }}>
        {arr.map((val, i) => {
          const isL = i === left;
          const isR = i === right;
          const inFound = isFound(i);
          const isElim  = i < left || i > right;
          const isHi    = highlight === i;
          const revealed = !fogMode || (revealedSet?.has(i) ?? false) || inFound;
          const val_shown = revealed ? val : "?";

          let bg     = DOCK.bgCard;
          let border = `1px solid ${DOCK.border}`;
          let color  = DOCK.textDim;
          let opacity = 1;

          if (inFound)   { bg = "rgba(52,211,153,0.18)"; border = `2px solid ${DOCK.green}`; color = DOCK.green; }
          else if (isL)  { bg = "rgba(68,136,255,0.18)"; border = `2px solid ${DOCK.blue}`;  color = DOCK.text; }
          else if (isR)  { bg = "rgba(255,74,106,0.18)"; border = `2px solid ${DOCK.red}`;   color = DOCK.text; }
          else if (isHi) { bg = "rgba(240,165,0,0.18)";  border = `2px solid ${DOCK.amber}`; color = DOCK.amber; }
          else if (isElim) { bg = "rgba(5,10,20,0.5)"; border = `1px solid rgba(255,255,255,0.04)`; opacity = 0.28; }

          return (
            <motion.div key={i}
              animate={{ opacity, scale: (isL || isR) ? [1.1, 1] : 1 }}
              transition={{ duration: 0.22 }}
              style={{
                width: crateW, height: crateW, borderRadius: 6,
                background: bg, border, opacity,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: crateW > 44 ? 16 : 13,
                fontWeight: 800, color,
              }}
            >
              {val_shown}
            </motion.div>
          );
        })}
      </div>

      {/* Index labels */}
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {arr.map((_, i) => (
          <div key={i} style={{
            width: crateW, textAlign: "center",
            fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint,
          }}>
            [{i}]
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sum balance display ─────────────────────────────────── */
function SumBalance({ sum, target }: { sum: number; target: number }) {
  const diff = sum - target;
  const tilt = Math.max(-30, Math.min(30, diff * 4));
  const color = diff === 0 ? DOCK.green : diff > 0 ? DOCK.red : DOCK.blue;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <motion.div
        animate={{ rotate: tilt }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ width: 120, height: 6, background: color, borderRadius: 3, transformOrigin: "center" }}
      />
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
        {sum}
        <span style={{ fontSize: 12, color: DOCK.textFaint, marginLeft: 8 }}>/ {target}</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.textFaint, letterSpacing: "0.12em" }}>
        {diff === 0 ? "⚖ BALANCED" : diff > 0 ? `↓ ${diff} OVER — MOVE RIGHT CRANE` : `↑ ${Math.abs(diff)} UNDER — MOVE LEFT CRANE`}
      </div>
    </div>
  );
}

/* ── Move log ────────────────────────────────────────────── */
interface MoveEntry { crane: "left" | "right"; toIdx: number; val: number; sum: number; }
function MoveLog({ entries }: { entries: MoveEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: DOCK.textFaint, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em" }}>
        {open ? "▼" : "▶"} MOVE LOG ({entries.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(10,16,32,0.7)", border: `1px solid ${DOCK.border}`, borderRadius: 8, maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {entries.slice(-5).map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontFamily: "var(--font-mono)", fontSize: 10 }}>
                  <span style={{ color: e.crane === "left" ? DOCK.blue : DOCK.red, width: 32 }}>{e.crane === "left" ? "LEFT" : "RIGHT"}</span>
                  <span style={{ color: DOCK.textFaint }}>→ [{e.toIdx}]</span>
                  <span style={{ color: DOCK.amber }}>val:{e.val}</span>
                  <span style={{ color: DOCK.textFaint }}>sum:{e.sum}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 3Sum fixed-pointer display ──────────────────────────── */
function ThreeSumInfo({ fixedIdx, arr }: { fixedIdx: number; arr: number[] }) {
  return (
    <div style={{ padding: "8px 14px", background: "rgba(240,165,0,0.06)", border: `1px solid ${DOCK.amberDim}`, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, letterSpacing: "0.14em", marginBottom: 4 }}>FIXED CRANE (YELLOW)</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: DOCK.amber }}>
        [{fixedIdx}] = {arr[fixedIdx]}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main CargoMatch component
═══════════════════════════════════════════════════════════ */
interface Props {
  levelNum: number;
  onComplete: (r: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function CargoMatch({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = CARGO_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/two-pointers"); return null; }

  const isFog      = cfg.mode === "fog";
  const isAllPairs = cfg.mode === "all_pairs";
  const is3Sum     = cfg.mode === "three_sum";
  const isMoving   = cfg.mode === "moving_target";
  const isSortFirst = cfg.mode === "sort_first";
  const isClosest  = cfg.mode === "closest";
  const isBoss     = cfg.mode === "boss";

  /* ── State ── */
  const [workArr, setWorkArr]   = useState<number[]>(() => isSortFirst ? [...cfg.array] : [...cfg.array]);
  const [sorted, setSorted]     = useState(!isSortFirst);
  const [left,  setLeft]        = useState(0);
  const [right, setRight]       = useState(isSortFirst ? cfg.array.length - 1 : cfg.array.length - 1);
  const [moves, setMoves]       = useState(0);
  const [phase, setPhase]       = useState<"sorting" | "playing" | "won" | "aha">(isSortFirst ? "sorting" : "playing");
  const [stars, setStars]       = useState<StarCount>(3);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flash, setFlash]       = useState<"error" | "success" | null>(null);
  const [moveLog, setMoveLog]   = useState<MoveEntry[]>([]);

  /* All pairs */
  const [foundPairs, setFoundPairs] = useState<[number, number][]>([]);
  const allPairsTarget = useCallback(() => {
    const pairs: [number, number][] = [];
    const a = workArr;
    for (let l = 0, r = a.length - 1; l < r;) {
      const s = a[l] + a[r];
      if (s === cfg.target) { pairs.push([l, r]); l++; r--; }
      else if (s < cfg.target) l++;
      else r--;
    }
    return pairs;
  }, [workArr, cfg.target]);

  /* 3Sum */
  const [fixedIdx, setFixedIdx] = useState(0);
  const [triplets, setTriplets] = useState<[number, number, number][]>([]);
  const [roundDone, setRoundDone] = useState(false);

  /* Fog */
  const [revealed, setRevealed] = useState<Set<number>>(new Set([0, cfg.array.length - 1]));

  /* Moving target */
  const [currentTarget, setCurrentTarget] = useState(cfg.target);
  const [targetTimer, setTargetTimer] = useState(cfg.timerPerTarget ?? 30);
  const [totalPairs, setTotalPairs] = useState(0);
  const [targets] = useState<number[]>([cfg.target, 11, 6, 13, 8, 15]);

  /* Closest */
  const [bestDiff, setBestDiff]     = useState(Infinity);
  const [bestPair, setBestPair]     = useState<[number, number] | null>(null);

  /* Sort-first drag */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [swapCount, setSwapCount] = useState(0);

  /* Boss */
  const [bossActive, setBossActive] = useState(0);
  const [bossDone, setBossDone]    = useState<boolean[]>(
    isBoss ? Array(cfg.bossProblems!.length).fill(false) : []
  );
  const [bossStates, setBossStates] = useState<{ l: number; r: number; moves: number }[]>(
    isBoss ? cfg.bossProblems!.map(p => ({ l: 0, r: p.array.length - 1, moves: 0 })) : []
  );

  const fbTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showFeedback(msg: string, type: "error" | "success" = "success") {
    setFeedback(msg);
    setFlash(type);
    if (fbTimeout.current) clearTimeout(fbTimeout.current);
    fbTimeout.current = setTimeout(() => { setFeedback(null); setFlash(null); }, 1800);
  }

  /* Moving target ticker */
  useEffect(() => {
    if (!isMoving || phase !== "playing") return;
    const id = setInterval(() => {
      setTargetTimer(t => {
        if (t <= 1) {
          setTargetTimer(cfg.timerPerTarget!);
          setCurrentTarget(prev => {
            const idx = targets.indexOf(prev);
            return targets[(idx + 1) % targets.length];
          });
          setLeft(0); setRight(workArr.length - 1); setMoves(0);
          return cfg.timerPerTarget!;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isMoving, phase]);

  function finalize(totalMoves: number) {
    const s = calcStars(totalMoves, cfg.optimalMoves);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); setXpEarned(xp);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  /* ── Standard move ── */
  const handleMove = useCallback((direction: "left_fwd" | "right_back") => {
    if (phase !== "playing") return;
    const arr = workArr;

    /* Boss mode routing */
    if (isBoss) {
      const bp = cfg.bossProblems![bossActive];
      const st = bossStates[bossActive];
      const newL = direction === "left_fwd" ? st.l + 1 : st.l;
      const newR = direction === "right_back" ? st.r - 1 : st.r;
      if (newL >= newR) return;
      const sum = bp.array[newL] + bp.array[newR];
      const next = bossStates.map((s, i) => i === bossActive ? { ...s, l: newL, r: newR, moves: s.moves + 1 } : s);
      setBossStates(next);
      playMove();
      if (sum === bp.target) {
        playDockBell();
        const done = bossDone.map((d, i) => i === bossActive ? true : d);
        setBossDone(done);
        if (done.every(Boolean)) {
          setTimeout(() => finalize(next.reduce((a, s) => a + s.moves, 0)), 600);
        }
      }
      return;
    }

    const newL = direction === "left_fwd" ? left + 1 : left;
    const newR = direction === "right_back" ? right - 1 : right;
    if (newL >= newR) return;

    const newMoves = moves + 1;
    const sum = arr[newL] + arr[newR];
    playMove();

    if (isFog) {
      setRevealed(prev => { const s = new Set(prev); s.add(newL); s.add(newR); return s; });
    }

    setLeft(newL); setRight(newR); setMoves(newMoves);
    setMoveLog(prev => [...prev, {
      crane: direction === "left_fwd" ? "left" : "right",
      toIdx: direction === "left_fwd" ? newL : newR,
      val: direction === "left_fwd" ? arr[newL] : arr[newR],
      sum,
    }]);

    if (isClosest) {
      const diff = Math.abs(sum - cfg.target);
      if (diff < bestDiff) { setBestDiff(diff); setBestPair([newL, newR]); }
      showFeedback(diff === 0 ? "EXACT MATCH!" : `Diff: ${diff} — best so far: ${bestDiff === Infinity ? "none" : bestDiff}`);
      if (newL + 1 >= newR) {
        playDockBell();
        setTimeout(() => finalize(newMoves), 800);
      }
      return;
    }

    if (sum === cfg.target || (isMoving && sum === currentTarget)) {
      playDockBell();
      showFeedback("PAIR MATCHED!", "success");
      if (!isMoving) {
        setTimeout(() => finalize(newMoves), 800);
      } else {
        setTotalPairs(p => p + 1);
        setLeft(0); setRight(arr.length - 1); setMoves(0);
      }
    } else if (sum > cfg.target) {
      showFeedback("↓ TOO HEAVY — MOVE RIGHT CRANE");
    } else {
      showFeedback("↑ TOO LIGHT — MOVE LEFT CRANE");
    }

    /* All pairs: auto-advance both on match */
    if (isAllPairs && sum === cfg.target) {
      setFoundPairs(p => {
        const next = [...p, [newL, newR] as [number, number]];
        const total = allPairsTarget().length;
        if (next.length >= total) setTimeout(() => finalize(newMoves), 800);
        return next;
      });
    }
  }, [phase, left, right, moves, workArr, cfg, isFog, isClosest, isMoving, isAllPairs, isBoss, bossActive, bossStates, bossDone, currentTarget, bestDiff]);

  /* ── 3Sum round ── */
  const handle3SumMove = useCallback((direction: "left_fwd" | "right_back") => {
    if (phase !== "playing" || roundDone) return;
    const arr = workArr;
    const newL = direction === "left_fwd" ? left + 1 : left;
    const newR = direction === "right_back" ? right - 1 : right;
    if (newL >= newR) {
      const nextFixed = fixedIdx + 1;
      if (nextFixed >= arr.length - 2) {
        setTimeout(() => finalize(moves), 500);
      } else {
        setFixedIdx(nextFixed);
        setLeft(nextFixed + 1); setRight(arr.length - 1);
        setRoundDone(false);
      }
      return;
    }
    const sum = arr[fixedIdx] + arr[newL] + arr[newR];
    playMove();
    setLeft(newL); setRight(newR); setMoves(m => m + 1);
    if (sum === 0) {
      playDockBell();
      setTriplets(prev => [...prev, [fixedIdx, newL, newR]]);
      showFeedback(`TRIPLET: [${arr[fixedIdx]}, ${arr[newL]}, ${arr[newR]}]`, "success");
    } else if (sum > 0) {
      showFeedback("↓ TOO HEAVY — MOVE RIGHT CRANE");
    } else {
      showFeedback("↑ TOO LIGHT — MOVE LEFT CRANE");
    }
  }, [phase, roundDone, fixedIdx, left, right, moves, workArr, cfg]);

  /* ── Sort-first drag swap ── */
  function handleSortDrop(to: number) {
    if (dragFrom === null || dragFrom === to) { setDragFrom(null); return; }
    const next = [...workArr];
    [next[dragFrom], next[to]] = [next[to], next[dragFrom]];
    setWorkArr(next); setSwapCount(c => c + 1); setDragFrom(null);
    playMove();
    const isSorted = next.every((v, i, a) => i === 0 || a[i-1] <= v);
    if (isSorted) {
      setSorted(true); setPhase("playing");
      setRight(next.length - 1);
      showFeedback("SORTED! Now find the pair.", "success");
    }
  }

  const guidedHint = cfg.guided && moves < 2 ? (
    moves === 0
      ? (workArr[0] + workArr[workArr.length - 1] > cfg.target ? "right" : "left")
      : null
  ) : null;

  /* ═══════════ RENDER ═══════════ */
  const activeArr = isBoss ? cfg.bossProblems![bossActive].array : workArr;
  const activeL   = isBoss ? bossStates[bossActive].l : left;
  const activeR   = isBoss ? bossStates[bossActive].r : right;
  const activeSum = activeArr[activeL] + activeArr[activeR];
  const activeTgt = isMoving ? currentTarget : cfg.target;

  return (
    <DockLayout
      gameName="CARGO MATCH"
      levelNum={levelNum}
      xpReward={cfg.xpBase}
      stars={stars}
      onBack={onBack}
    >
      <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
        {/* Level header */}
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

        {/* Target display */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: DOCK.textFaint, marginBottom: 4 }}>TARGET WEIGHT</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: DOCK.amber }}>{activeTgt}</div>
          </div>
          {isMoving && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: DOCK.textFaint, marginBottom: 4 }}>NEXT TARGET IN</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: targetTimer <= 8 ? DOCK.red : DOCK.cyan }}>{targetTimer}s</div>
            </div>
          )}
          {isMoving && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: DOCK.textFaint, marginBottom: 4 }}>PAIRS FOUND</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: DOCK.green }}>{totalPairs}</div>
            </div>
          )}
          {isAllPairs && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: DOCK.textFaint, marginBottom: 4 }}>PAIRS FOUND</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: DOCK.green }}>{foundPairs.length} / {allPairsTarget().length}</div>
            </div>
          )}
          {is3Sum && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, marginBottom: 4 }}>TRIPLETS</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900, color: DOCK.green }}>{triplets.length}</div>
            </div>
          )}
        </div>

        {/* 3Sum fixed crane info */}
        {is3Sum && <div style={{ marginBottom: 14 }}><ThreeSumInfo fixedIdx={fixedIdx} arr={workArr} /></div>}

        {/* Boss tabs */}
        {isBoss && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
            {cfg.bossProblems!.map((_, i) => (
              <button key={i} onClick={() => setBossActive(i)} style={{
                padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                background: bossActive === i ? "rgba(0,180,200,0.14)" : "rgba(10,16,32,0.6)",
                border: `1px solid ${bossActive === i ? DOCK.borderBlue : DOCK.border}`,
                color: bossDone[i] ? DOCK.green : bossActive === i ? DOCK.cyan : DOCK.textDim,
                fontFamily: "var(--font-mono)", fontSize: 11,
              }}>
                {bossDone[i] ? "✓ " : ""}DOCK {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Sort-first phase */}
        {isSortFirst && !sorted && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber, textAlign: "center", marginBottom: 12, letterSpacing: "0.14em" }}>
              DRAG CRATES TO SORT · SWAPS: {swapCount}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {workArr.map((val, i) => (
                <motion.div key={i}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleSortDrop(i)}
                  whileHover={{ scale: 1.06 }}
                  style={{
                    width: 52, height: 52, borderRadius: 6,
                    background: dragFrom === i ? "rgba(240,165,0,0.2)" : DOCK.bgCard,
                    border: `1px solid ${dragFrom === i ? DOCK.amber : DOCK.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: DOCK.text,
                    cursor: "grab",
                  }}
                >{val}</motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Main crate row */}
        {(!isSortFirst || sorted) && (
          <div style={{ marginBottom: 20 }}>
            <CrateRow
              arr={isBoss ? cfg.bossProblems![bossActive].array : (sorted ? workArr : [...cfg.array].sort((a,b)=>a-b))}
              left={activeL} right={activeR}
              foundPairs={foundPairs}
              fogMode={isFog} revealedSet={revealed}
              highlight={is3Sum ? fixedIdx : null}
            />
          </div>
        )}

        {/* Closest best */}
        {isClosest && bestPair && (
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: DOCK.amber, marginBottom: 8 }}>
            BEST: [{bestPair[0]}]+[{bestPair[1]}] = {workArr[bestPair[0]] + workArr[bestPair[1]]} (diff {bestDiff})
          </div>
        )}

        {/* Sum balance */}
        {phase === "playing" && (!isSortFirst || sorted) && !isBoss && (
          <div style={{ marginBottom: 18 }}>
            <SumBalance sum={workArr[left] + workArr[right]} target={activeTgt} />
          </div>
        )}

        {isBoss && phase === "playing" && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <SumBalance sum={activeSum} target={cfg.bossProblems![bossActive].target} />
          </div>
        )}

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                textAlign: "center", marginBottom: 12,
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em",
                color: flash === "success" ? DOCK.green : DOCK.red,
              }}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guided hint */}
        {cfg.guided && phase === "playing" && moves < 2 && (
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.cyan, marginBottom: 10, letterSpacing: "0.12em" }}
          >
            HINT: {workArr[0] + workArr[workArr.length - 1] > cfg.target
              ? "SUM TOO HIGH — MOVE RIGHT CRANE INWARD"
              : workArr[0] + workArr[workArr.length - 1] < cfg.target
              ? "SUM TOO LOW — MOVE LEFT CRANE INWARD"
              : "SUM MATCHES TARGET!"}
          </motion.div>
        )}

        {/* Action buttons */}
        {phase === "playing" && (!isSortFirst || sorted) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => is3Sum ? handle3SumMove("left_fwd") : handleMove("left_fwd")}
              disabled={activeL + 1 >= activeR}
              style={{
                padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                background: "rgba(68,136,255,0.12)", border: `1px solid ${DOCK.borderBlue}`,
                color: DOCK.blue, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.1em", opacity: activeL + 1 >= activeR ? 0.4 : 1,
              }}
            >
              MOVE LEFT →
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => is3Sum ? handle3SumMove("right_back") : handleMove("right_back")}
              disabled={activeR - 1 <= activeL}
              style={{
                padding: "12px 28px", borderRadius: 8, cursor: "pointer",
                background: "rgba(255,74,106,0.12)", border: `1px solid ${DOCK.borderRed}`,
                color: DOCK.red, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.1em", opacity: activeR - 1 <= activeL ? 0.4 : 1,
              }}
            >
              ← MOVE RIGHT
            </motion.button>
          </div>
        )}

        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, letterSpacing: "0.12em" }}>
          MOVES: {moves} · OPTIMAL: {cfg.optimalMoves}
        </div>

        <MoveLog entries={moveLog} />
      </div>

      <AnimatePresence>
        {phase === "aha" && (
          <AhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(n)"
            onContinue={() => {
              const next = levelNum + 1;
              router.push(next <= 8 ? `/learn/tier1/two-pointers/cargo-match/${next}` : "/learn/tier1/two-pointers/cargo-match");
            }}
          />
        )}
      </AnimatePresence>
    </DockLayout>
  );
}
