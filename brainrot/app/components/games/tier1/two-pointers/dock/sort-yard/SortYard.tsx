"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import DockLayout, { AhaMoment, StarBar } from "../DockLayout";
import { DOCK, calcStars, calcXP, type StarCount } from "../types";
import { SORT_LEVELS } from "./levels";

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
function playSwap()  { playTone(280, "triangle", 0.18); }
function playMove()  { playTone(400, "sine", 0.09); }
function playWin()   { [660, 880, 1100].forEach((f, i) => setTimeout(() => playTone(f, "sine", 0.2), i * 90)); }
function playError() { playTone(120, "triangle", 0.15); }

/* ── Color helpers ───────────────────────────────────────── */
const RB_COLOR: Record<number, { bg: string; border: string; label: string }> = {
  0: { bg: "rgba(68,136,255,0.2)",  border: DOCK.blue,  label: "BLUE" },
  1: { bg: "rgba(255,74,106,0.2)",  border: DOCK.red,   label: "RED"  },
};
const DNF_COLOR: Record<number, { bg: string; border: string; label: string }> = {
  0: { bg: "rgba(255,74,106,0.2)",  border: DOCK.red,   label: "RED"   },
  1: { bg: "rgba(216,232,240,0.12)",border: DOCK.steel, label: "WHITE" },
  2: { bg: "rgba(68,136,255,0.2)",  border: DOCK.blue,  label: "BLUE"  },
};

/* ── Crate tile ──────────────────────────────────────────── */
function Tile({
  value, label, isLeft, isRight, isMid, isLo, isHi, isDim, color, size = 52,
}: {
  value: number | string; label?: string;
  isLeft?: boolean; isRight?: boolean; isMid?: boolean;
  isLo?: boolean; isHi?: boolean; isDim?: boolean;
  color?: { bg: string; border: string }; size?: number;
}) {
  const bg     = color?.bg ?? (isDim ? "rgba(5,10,20,0.5)" : DOCK.bgCard);
  const border = color?.border
    ? `2px solid ${color.border}`
    : isLeft  ? `2px solid ${DOCK.blue}`
    : isRight ? `2px solid ${DOCK.red}`
    : isMid   ? `2px solid ${DOCK.amber}`
    : isLo    ? `2px solid ${DOCK.blue}`
    : isHi    ? `2px solid ${DOCK.red}`
    : `1px solid ${DOCK.border}`;

  return (
    <motion.div
      animate={{ scale: (isLeft || isRight || isMid) ? [1.12, 1] : 1, opacity: isDim ? 0.3 : 1 }}
      transition={{ duration: 0.2 }}
      style={{
        width: size, height: size, borderRadius: 7, flexShrink: 0,
        background: bg, border,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", cursor: "default", position: "relative",
      }}
    >
      <span style={{ fontSize: size > 44 ? 16 : 12, fontWeight: 800, color: isDim ? DOCK.textFaint : DOCK.text }}>{value}</span>
      {label && <span style={{ fontSize: 7, color: DOCK.textFaint, letterSpacing: "0.08em", marginTop: 2 }}>{label}</span>}
      {isLeft  && <div style={{ position: "absolute", bottom: -14, fontSize: 7, color: DOCK.blue,  letterSpacing: "0.08em" }}>L</div>}
      {isRight && <div style={{ position: "absolute", bottom: -14, fontSize: 7, color: DOCK.red,   letterSpacing: "0.08em" }}>R</div>}
      {isMid   && <div style={{ position: "absolute", bottom: -14, fontSize: 7, color: DOCK.amber, letterSpacing: "0.08em" }}>MID</div>}
      {isLo    && <div style={{ position: "absolute", bottom: -14, fontSize: 7, color: DOCK.blue,  letterSpacing: "0.08em" }}>LO</div>}
      {isHi    && <div style={{ position: "absolute", bottom: -14, fontSize: 7, color: DOCK.red,   letterSpacing: "0.08em" }}>HI</div>}
    </motion.div>
  );
}

/* ── Action button ───────────────────────────────────────── */
function ActionBtn({ label, color = DOCK.cyan, borderColor, onClick, disabled }: {
  label: string; color?: string; borderColor?: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <motion.button whileHover={!disabled ? { scale: 1.04 } : {}} whileTap={!disabled ? { scale: 0.96 } : {}}
      onClick={!disabled ? onClick : undefined}
      style={{
        padding: "11px 22px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
        background: `${color}14`, border: `1px solid ${borderColor ?? color}`,
        color, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        letterSpacing: "0.1em", opacity: disabled ? 0.38 : 1,
      }}
    >{label}</motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main SortYard component
═══════════════════════════════════════════════════════════ */
interface Props {
  levelNum: number;
  onComplete: (r: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function SortYard({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = SORT_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/two-pointers"); return null; }

  /* ── State ── */
  const [arr, setArr]       = useState<number[]>([...cfg.array]);
  const [left, setLeft]     = useState(0);
  const [right, setRight]   = useState(cfg.array.length - 1);
  const [mid, setMid]       = useState(0);  // for dutch flag "scanner"
  const [swaps, setSwaps]   = useState(0);
  const [phase, setPhase]   = useState<"playing" | "aha">("playing");
  const [stars, setStars]   = useState<StarCount>(3);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fbFlash, setFbFlash]   = useState<"ok" | "err" | null>(null);
  const [comparisons, setComparisons] = useState(0);

  /* Palindrome */
  const [paliResult, setPaliResult] = useState<boolean | null>(null);

  /* Dedup */
  const [slow, setSlow] = useState(0);
  const [fast, setFast] = useState(1);
  const [unique, setUnique] = useState<number[]>([arr[0]]);

  /* Boss panels */
  const BOSS_ARRS = [[1, 0, 1, 0], [2, 0, 1, 2, 0, 1], [4, 3, 1, 1, 2, 2, 3], [1, 2, 3, 4, 3, 2, 1]];
  const BOSS_MODES = ["red_blue", "dutch_flag", "dedup", "palindrome"] as const;
  const [bossActive, setBossActive] = useState(0);
  const [bossDone, setBossDone]     = useState<boolean[]>(Array(4).fill(false));
  const [bossArrs, setBossArrs]     = useState(BOSS_ARRS.map(a => [...a]));
  const [bossL, setBossL]           = useState(BOSS_ARRS.map(() => 0));
  const [bossR, setBossR]           = useState(BOSS_ARRS.map((a) => a.length - 1));

  function showFeedback(msg: string, type: "ok" | "err" = "ok") {
    setFeedback(msg); setFbFlash(type);
    setTimeout(() => { setFeedback(null); setFbFlash(null); }, 1600);
  }

  function finalize(totalSwaps: number) {
    const s = calcStars(totalSwaps, cfg.optimalSwaps);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s); addXP(xp); onComplete({ stars: s, xpEarned: xp });
    setPhase("aha");
  }

  function isSortedRB(a: number[]) { let seenOne = false; for (const v of a) { if (v === 0 && seenOne) return false; if (v === 1) seenOne = true; } return true; }
  function isDNFSorted(a: number[]) { let phase = 0; for (const v of a) { if (v < phase) return false; if (v > phase) phase = v; } return true; }
  function isBubbleSorted(a: number[]) { return a.every((v,i,x) => i===0 || x[i-1]<=v); }
  function isOddEvenDone(a: number[]) {
    let sawEven = false;
    for (const v of a) { if (v % 2 === 0) sawEven = true; if (sawEven && v % 2 !== 0) return false; }
    return true;
  }

  /* ── Red/Blue sort ── */
  const handleRBMove = useCallback((side: "left" | "right") => {
    if (phase !== "playing") return;
    const a = [...arr];
    let l = left, r = right;
    if (side === "left") {
      while (l < r && a[l] === 1) l++;
      setLeft(l);
    } else {
      while (l < r && a[r] === 0) r--;
      setRight(r);
    }
    playMove();
    if (l >= r) { playWin(); setTimeout(() => finalize(swaps), 500); }
  }, [arr, left, right, swaps, phase]);

  const handleRBSwap = useCallback(() => {
    if (phase !== "playing" || arr[left] !== 1 || arr[right] !== 0) {
      showFeedback("LEFT must be RED, RIGHT must be BLUE to swap", "err"); playError(); return;
    }
    const a = [...arr];
    [a[left], a[right]] = [a[right], a[left]];
    setArr(a); setSwaps(s => s + 1); playSwap();
    showFeedback(`SWAPPED [${left}]↔[${right}]`);
    if (isSortedRB(a)) { playWin(); setTimeout(() => finalize(swaps + 1), 600); }
  }, [arr, left, right, swaps, phase]);

  /* ── Dutch Flag ── */
  function dnfStep() {
    if (phase !== "playing") return;
    const a = [...arr], m = mid, l = left, h = right;
    if (m > h) { playWin(); setTimeout(() => finalize(swaps), 500); return; }
    const val = a[m];
    let newArr = [...a], newL = l, newM = m, newH = h, swapped = false;
    if (val === 0) { [newArr[l], newArr[m]] = [newArr[m], newArr[l]]; newL++; newM++; swapped = true; }
    else if (val === 2) { [newArr[m], newArr[h]] = [newArr[h], newArr[m]]; newH--; swapped = true; }
    else { newM++; }
    setArr(newArr); setLeft(newL); setMid(newM); setRight(newH);
    if (swapped) { setSwaps(s => s + 1); playSwap(); } else { playMove(); }
    showFeedback(`val=${val}: ${val===0?"swap with LO, advance both":val===2?"swap with HI, retreat HI":"advance MID"}`);
    if (newM > newH) { playWin(); setTimeout(() => finalize(swaps + (swapped ? 1 : 0)), 600); }
  }

  /* ── Bubble sort ── */
  function bubbleStep() {
    if (phase !== "playing") return;
    const a = [...arr], l = left, r = right;
    setComparisons(c => c + 1);
    if (a[l] > a[l + 1]) {
      [a[l], a[l+1]] = [a[l+1], a[l]];
      setArr(a); setSwaps(s => s + 1); playSwap();
      showFeedback(`SWAP [${l}]=${arr[l]} ↔ [${l+1}]=${arr[l+1]}`);
    } else {
      playMove(); showFeedback(`No swap needed [${l}]=${arr[l]} ≤ [${l+1}]=${arr[l+1]}`);
    }
    const nextL = l + 1;
    if (nextL >= r) { setLeft(0); setRight(r - 1); } else { setLeft(nextL); }
    if (isBubbleSorted(a)) { playWin(); setTimeout(() => finalize(swaps + (a[l] > a[l+1] ? 1 : 0)), 600); }
  }

  /* ── Odd/Even split ── */
  function oddEvenStep() {
    if (phase !== "playing") return;
    const a = [...arr], l = left, r = right;
    if (l >= r) { playWin(); setTimeout(() => finalize(swaps), 500); return; }
    // find left-most even on left side
    let nl = l; while (nl < r && a[nl] % 2 !== 0) nl++;
    // find right-most odd on right side
    let nr = r; while (nr > nl && a[nr] % 2 === 0) nr--;
    if (nl < nr) {
      [a[nl], a[nr]] = [a[nr], a[nl]];
      setArr(a); setSwaps(s => s + 1); setLeft(nl + 1); setRight(nr - 1); playSwap();
      showFeedback(`SWAP even[${nl}]=${arr[nl]} ↔ odd[${nr}]=${arr[nr]}`);
    } else {
      setLeft(nl); setRight(nr); playMove();
      showFeedback("Correctly partitioned!");
    }
    if (isOddEvenDone(a)) { playWin(); setTimeout(() => finalize(swaps + 1), 600); }
  }

  /* ── Reverse ── */
  function reverseStep() {
    if (phase !== "playing") return;
    const a = [...arr], l = left, r = right;
    if (l >= r) { playWin(); setTimeout(() => finalize(swaps), 500); return; }
    [a[l], a[r]] = [a[r], a[l]];
    setArr(a); setLeft(l + 1); setRight(r - 1); setSwaps(s => s + 1);
    playSwap(); showFeedback(`SWAP [${l}]↔[${r}]`);
    if (l + 1 >= r - 1) { playWin(); setTimeout(() => finalize(swaps + 1), 600); }
  }

  /* ── Palindrome ── */
  function palindromeStep() {
    if (phase !== "playing") return;
    const a = arr, l = left, r = right;
    if (l >= r) { setPaliResult(true); playWin(); setTimeout(() => finalize(0), 600); return; }
    const match = a[l] === a[r];
    if (!match) { setPaliResult(false); showFeedback(`[${l}]=${a[l]} ≠ [${r}]=${a[r]} — NOT PALINDROME`, "err"); playError(); setTimeout(() => finalize(0), 1200); return; }
    showFeedback(`[${l}]=${a[l]} = [${r}]=${a[r]} ✓ MATCH`); playMove();
    setLeft(l + 1); setRight(r - 1);
    if (l + 1 >= r - 1) { setPaliResult(true); playWin(); setTimeout(() => finalize(0), 600); }
  }

  /* ── Dedup ── */
  function dedupStep() {
    if (phase !== "playing") return;
    const a = arr, f = fast;
    if (f >= a.length) { playWin(); setTimeout(() => finalize(swaps), 500); return; }
    if (a[f] !== a[slow]) {
      const s = slow + 1;
      const newA = [...a]; newA[s] = a[f];
      setArr(newA); setSlow(s); setUnique(u => [...u, a[f]]);
      setSwaps(sw => sw + 1); playSwap();
      showFeedback(`New unique ${a[f]} → position ${s}`);
    } else {
      showFeedback(`Duplicate ${a[f]}, skip`); playMove();
    }
    setFast(f + 1);
    if (f + 1 >= a.length) { playWin(); setTimeout(() => finalize(swaps + (a[f] !== a[slow] ? 1 : 0)), 600); }
  }

  /* ── Boss step ── */
  function bossStep() {
    const mode = BOSS_MODES[bossActive];
    const a = [...bossArrs[bossActive]];
    const l = bossL[bossActive], r = bossR[bossActive];
    if (mode === "red_blue") {
      if (l >= r) { markBossDone(); return; }
      if (a[l] === 1 && a[r] === 0) {
        [a[l], a[r]] = [a[r], a[l]];
        const nb = [...bossArrs]; nb[bossActive] = a; setBossArrs(nb);
        const nl = [...bossL]; nl[bossActive] = l + 1; setBossL(nl);
        const nr = [...bossR]; nr[bossActive] = r - 1; setBossR(nr);
        playSwap();
      } else {
        const nl = [...bossL]; if (a[l] === 0) nl[bossActive] = l + 1; setBossL(nl);
        const nr = [...bossR]; if (a[r] === 1) nr[bossActive] = r - 1; setBossR(nr);
        playMove();
      }
      if (isSortedRB(a)) markBossDone();
    } else if (mode === "palindrome") {
      if (l >= r || a[l] !== a[r]) { markBossDone(); return; }
      const nl = [...bossL]; nl[bossActive] = l + 1; setBossL(nl);
      const nr = [...bossR]; nr[bossActive] = r - 1; setBossR(nr);
      playMove();
      if (l + 1 >= r - 1) markBossDone();
    } else {
      markBossDone();
    }
  }

  function markBossDone() {
    const done = [...bossDone]; done[bossActive] = true; setBossDone(done);
    playWin();
    if (done.every(Boolean)) setTimeout(() => finalize(swaps), 600);
    else setBossActive(i => (i + 1) % 4);
  }

  /* ── Dispatch ── */
  function handleAction() {
    if (cfg.mode === "boss") { bossStep(); return; }
    if (cfg.mode === "dutch_flag") { dnfStep(); return; }
    if (cfg.mode === "bubble")     { bubbleStep(); return; }
    if (cfg.mode === "odd_even")   { oddEvenStep(); return; }
    if (cfg.mode === "reverse")    { reverseStep(); return; }
    if (cfg.mode === "palindrome") { palindromeStep(); return; }
    if (cfg.mode === "dedup")      { dedupStep(); return; }
  }

  const displayArr = cfg.mode === "boss" ? bossArrs[bossActive] : arr;
  const displayL   = cfg.mode === "boss" ? bossL[bossActive] : left;
  const displayR   = cfg.mode === "boss" ? bossR[bossActive] : right;

  const isColorMode = cfg.mode === "red_blue" || cfg.mode === "dutch_flag" || cfg.mode === "boss";
  const colorMap = cfg.mode === "dutch_flag" ? DNF_COLOR : RB_COLOR;

  return (
    <DockLayout gameName="SORT YARD" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
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

        {/* Stats row */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint, letterSpacing: "0.16em" }}>SWAPS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.cyan }}>{swaps}</div>
          </div>
          {cfg.mode === "bubble" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint, letterSpacing: "0.16em" }}>COMPARISONS</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.amber }}>{comparisons}</div>
            </div>
          )}
          {cfg.mode === "palindrome" && paliResult !== null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>RESULT</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: paliResult ? DOCK.green : DOCK.red }}>
                {paliResult ? "PALINDROME ✓" : "NOT PALINDROME ✗"}
              </div>
            </div>
          )}
          {cfg.mode === "dedup" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: DOCK.textFaint }}>UNIQUE FOUND</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: DOCK.green }}>{unique.length}</div>
            </div>
          )}
        </div>

        {/* Boss tabs */}
        {cfg.mode === "boss" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
            {["R/B Sort", "Dutch Flag", "Dedup", "Palindrome"].map((label, i) => (
              <button key={i} onClick={() => setBossActive(i)} style={{
                padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                background: bossActive === i ? "rgba(0,180,200,0.12)" : "rgba(10,16,32,0.6)",
                border: `1px solid ${bossActive === i ? DOCK.borderBlue : DOCK.border}`,
                color: bossDone[i] ? DOCK.green : bossActive === i ? DOCK.cyan : DOCK.textDim,
                fontFamily: "var(--font-mono)", fontSize: 10,
              }}>
                {bossDone[i] ? "✓ " : ""}{label}
              </button>
            ))}
          </div>
        )}

        {/* Array display */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 24, flexWrap: "wrap", paddingBottom: 18 }}>
          {displayArr.map((val, i) => {
            const isL = i === displayL;
            const isR = i === displayR;
            const isMidVal = cfg.mode === "dutch_flag" && i === mid;
            const isLoVal  = cfg.mode === "dutch_flag" && i === left;
            const isHiVal  = cfg.mode === "dutch_flag" && i === right;
            const isDimVal = cfg.mode === "reverse" && (i < displayL || i > displayR);
            const isDedupSlow = cfg.mode === "dedup" && i === slow;
            const isDedupFast = cfg.mode === "dedup" && i === fast;
            const col = isColorMode && colorMap[val] ? { bg: colorMap[val].bg, border: colorMap[val].border } : undefined;

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Tile
                  value={isColorMode ? (colorMap[val]?.label ?? val) : val}
                  isLeft={(isL && cfg.mode !== "dutch_flag") || isDedupSlow}
                  isRight={(isR && cfg.mode !== "dutch_flag") || isDedupFast}
                  isMid={isMidVal}
                  isLo={isLoVal && cfg.mode === "dutch_flag"}
                  isHi={isHiVal && cfg.mode === "dutch_flag"}
                  isDim={isDimVal}
                  color={col}
                  size={48}
                />
              </div>
            );
          })}
        </div>

        {/* Dedup result */}
        {cfg.mode === "dedup" && unique.length > 1 && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(52,211,153,0.06)", border: `1px solid rgba(52,211,153,0.3)`, borderRadius: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, marginBottom: 4, letterSpacing: "0.14em" }}>UNIQUE SEQUENCE</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {unique.map((v, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(52,211,153,0.12)", border: `1px solid ${DOCK.green}`, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: DOCK.green }}
                >{v}</motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div key={feedback}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginBottom: 14, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: fbFlash === "err" ? DOCK.red : DOCK.green }}
            >{feedback}</motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {phase === "playing" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            {cfg.mode === "red_blue" && (
              <>
                <ActionBtn label="← SCAN LEFT"   color={DOCK.blue} borderColor={DOCK.borderBlue} onClick={() => handleRBMove("left")} />
                <ActionBtn label="SWAP ↔"         color={DOCK.amber} onClick={handleRBSwap} />
                <ActionBtn label="SCAN RIGHT →"   color={DOCK.red}  borderColor={DOCK.borderRed}  onClick={() => handleRBMove("right")} />
              </>
            )}
            {(cfg.mode !== "red_blue") && (
              <ActionBtn
                label={cfg.mode === "dutch_flag" ? "NEXT DNF STEP"
                     : cfg.mode === "bubble"     ? "COMPARE & SWAP"
                     : cfg.mode === "odd_even"   ? "PARTITION STEP"
                     : cfg.mode === "reverse"    ? "SWAP ENDS"
                     : cfg.mode === "palindrome" ? "COMPARE ENDS"
                     : cfg.mode === "dedup"      ? "ADVANCE FAST PTR"
                     : cfg.mode === "boss"       ? "NEXT STEP"
                     : "STEP"}
                color={DOCK.cyan}
                onClick={handleAction}
              />
            )}
          </div>
        )}

        <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, letterSpacing: "0.12em" }}>
          SWAPS: {swaps} · OPTIMAL: {cfg.optimalSwaps}
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
              router.push(next <= 8 ? `/learn/tier1/two-pointers/sort-yard/${next}` : "/learn/tier1/two-pointers/sort-yard");
            }}
          />
        )}
      </AnimatePresence>
    </DockLayout>
  );
}
