"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useXP } from "@/lib/xpContext";
import {
  WITNESS_LEVELS,
  canShipInDays, canDeliverInDays, kokoCanFinish,
  canSplitWithMax, canPlaceCows,
} from "./levels";
import NoirLayout, { AhaMoment, StarBar } from "../NoirLayout";
import { NOIR, calcStars, calcXP, type StarCount } from "../types";

/* ── Slider input ────────────────────────────────────────── */
function GuessSlider({
  lo, hi, value, onChange, label, unit = "",
}: { lo: number; hi: number; value: number; onChange: (v: number) => void; label: string; unit?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint }}>
        <span>{label}</span>
        <span style={{ color: NOIR.amber, fontWeight: 700, fontSize: 20 }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={lo} max={hi} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: NOIR.amber, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.textFaint }}>
        <span>{lo}{unit}</span><span>{hi}{unit}</span>
      </div>
    </div>
  );
}

/* ── Question → answer row ───────────────────────────────── */
function QARow({ question, answer, isOptimal }: { question: string; answer: string; isOptimal: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex", gap: 16, alignItems: "center", padding: "8px 12px",
        background: "rgba(12,18,32,0.6)", border: `1px solid ${NOIR.border}`,
        borderRadius: 7, fontFamily: "var(--font-mono)", fontSize: 12,
      }}
    >
      <span style={{ color: NOIR.textDim, flex: 1 }}>{question}</span>
      <span style={{
        fontWeight: 700, letterSpacing: "0.1em",
        color: answer === "YES" ? NOIR.teal : "#e84a5f",
      }}>{answer}</span>
      {!isOptimal && <span style={{ color: "#e84a5f", fontSize: 9 }}>!OPT</span>}
    </motion.div>
  );
}

/* ── Package list visualization ──────────────────────────── */
function PackageList({ packages, capacity, days }: { packages: number[]; capacity: number; days?: number }) {
  let trip = 0, load = 0;
  const trips: number[][] = [[]];
  for (const w of packages) {
    if (load + w > capacity) { trip++; trips.push([]); load = 0; }
    trips[trip].push(w);
    load += w;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {trips.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: NOIR.textFaint, width: 28 }}>D{i + 1}</span>
          <div style={{ display: "flex", gap: 3 }}>
            {t.map((w, j) => (
              <div key={j} style={{
                width: w * 12 + 16, height: 28, borderRadius: 4,
                background: "rgba(240,165,0,0.12)", border: `1px solid ${NOIR.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.amber,
              }}>{w}</div>
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: NOIR.textFaint }}>
            sum={t.reduce((a, b) => a + b, 0)}
          </span>
        </div>
      ))}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: trips.length <= (days ?? 999) ? NOIR.teal : "#e84a5f", marginTop: 4 }}>
        {trips.length} trip{trips.length !== 1 ? "s" : ""} {days ? `(max ${days})` : ""}
        {" "}{trips.length <= (days ?? 999) ? "✓ FEASIBLE" : "✗ TOO MANY"}
      </div>
    </div>
  );
}

/* ── Koko visualization ──────────────────────────────────── */
function KokoViz({ piles, speed, hours }: { piles: number[]; speed: number; hours: number }) {
  const timePerPile = piles.map(p => Math.ceil(p / speed));
  const total = timePerPile.reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        {piles.map((p, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: NOIR.textFaint }}>{timePerPile[i]}h</div>
            <div style={{
              width: 40, height: p * 6, background: `linear-gradient(180deg, rgba(240,165,0,0.6), rgba(240,165,0,0.2))`,
              border: `1px solid ${NOIR.border}`, borderRadius: "4px 4px 0 0",
              display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4,
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: NOIR.amber }}>{p}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: total <= hours ? NOIR.teal : "#e84a5f" }}>
        Total: {total}h / {hours}h limit {total <= hours ? "✓" : "✗"}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main SilentWitness
═══════════════════════════════════════════════════════════ */
interface Props {
  levelNum: number;
  onComplete: (r: { stars: StarCount; xpEarned: number }) => void;
  onBack?: () => void;
}

export default function SilentWitness({ levelNum, onComplete, onBack }: Props) {
  const router = useRouter();
  const { addXP } = useXP();
  const cfg = WITNESS_LEVELS[levelNum - 1];
  if (!cfg) { router.push("/learn/tier1/binary-search"); return null; }

  const [phase, setPhase] = useState<"playing" | "aha">("playing");
  const [stars, setStars] = useState<StarCount>(3);
  const [guesses, setGuesses] = useState(0);
  const [qaLog, setQaLog] = useState<{ q: string; a: string; opt: boolean }[]>([]);

  // Amount / limited_cred
  const [lo, setLo] = useState(() => cfg.amountRange?.[0] ?? 1);
  const [hi, setHi] = useState(() => cfg.amountRange?.[1] ?? 1000);
  const [guess, setGuess] = useState(() => Math.ceil(((cfg.amountRange?.[0] ?? 1) + (cfg.amountRange?.[1] ?? 1000)) / 2));
  const [credits, setCredits] = useState(cfg.totalCredits ?? 999);
  const [solved, setSolved] = useState(false);

  // Simulation modes
  const [simValue, setSimValue] = useState(() => {
    if (cfg.mode === "min_capacity") return Math.max(...(cfg.packages ?? [1]));
    if (cfg.mode === "min_days") return 1;
    if (cfg.mode === "koko") return Math.max(...(cfg.piles ?? [1]));
    if (cfg.mode === "split_array") return Math.max(...(cfg.splitArray ?? [1]));
    if (cfg.mode === "cows") return 1;
    return 1;
  });
  const [simLo, setSimLo] = useState(() => {
    if (cfg.mode === "min_capacity") return Math.max(...(cfg.packages ?? [1]));
    if (cfg.mode === "koko") return 1;
    if (cfg.mode === "split_array") return Math.max(...(cfg.splitArray ?? [1]));
    if (cfg.mode === "cows") return 1;
    return 1;
  });
  const [simHi, setSimHi] = useState(() => {
    if (cfg.mode === "min_capacity" || cfg.mode === "min_days")
      return (cfg.packages ?? [1]).reduce((a, b) => a + b, 0);
    if (cfg.mode === "koko") return Math.max(...(cfg.piles ?? [1]));
    if (cfg.mode === "split_array") return (cfg.splitArray ?? [1]).reduce((a, b) => a + b, 0);
    if (cfg.mode === "cows") return Math.max(...(cfg.stalls ?? [1])) - Math.min(...(cfg.stalls ?? [0]));
    return 100;
  });

  // Boss: 3 sub-problems
  const [bossPart, setBossPart] = useState(0);
  const [bossAnswers, setBossAnswers] = useState<number[]>([]);

  const optimalMid = Math.ceil((lo + hi) / 2);

  const finalizeGame = useCallback((g: number) => {
    const opt = Math.ceil(Math.log2((cfg.amountRange?.[1] ?? 1000) - (cfg.amountRange?.[0] ?? 1) + 1)) + 1;
    const s = calcStars(g, opt + 2);
    const xp = calcXP(cfg.xpBase, s);
    setStars(s);
    addXP(xp);
    onComplete({ stars: s, xpEarned: xp });
    setTimeout(() => setPhase("aha"), 800);
  }, [cfg, addXP, onComplete]);

  const askAmount = useCallback(() => {
    if (solved) return;
    const answer = cfg.amountAnswer!;
    const isOptimal = guess === optimalMid;
    const newGuesses = guesses + 1;
    setGuesses(newGuesses);

    if (cfg.mode === "limited_cred") {
      const cost = isOptimal ? cfg.creditsPerQuestion! : cfg.creditsPerQuestion! * 3;
      setCredits(c => c - cost);
    }

    let q = `Was more than $${guess} stolen?`;
    let a: string;
    if (guess === answer) { a = "EXACT MATCH"; setSolved(true); finalizeGame(newGuesses); }
    else if (guess < answer) { a = "YES"; setLo(guess + 1); setGuess(Math.ceil((guess + 1 + hi) / 2)); }
    else { a = "NO"; setHi(guess - 1); setGuess(Math.ceil((lo + guess - 1) / 2)); }

    setQaLog(log => [...log, { q, a: a === "EXACT MATCH" ? "✓ FOUND" : a, opt: isOptimal }]);
    if (!isOptimal) setStars(s => Math.max(0, s - 1) as StarCount);
  }, [guess, solved, guesses, cfg, optimalMid, lo, hi, finalizeGame]);

  const checkSim = useCallback(() => {
    const newGuesses = guesses + 1;
    setGuesses(newGuesses);

    let feasible = false;
    let q = "", a = "";
    const mid = Math.ceil((simLo + simHi) / 2);
    const isOptimal = simValue === mid;

    if (cfg.mode === "min_capacity") {
      feasible = canShipInDays(cfg.packages!, simValue, cfg.days!);
      q = `Can all packages cross in ≤${cfg.days} trips with limit ${simValue}?`;
    } else if (cfg.mode === "min_days") {
      feasible = canDeliverInDays(cfg.packages!, cfg.capacity!, simValue);
      q = `Can all packages be delivered in ${simValue} days (capacity ${cfg.capacity})?`;
    } else if (cfg.mode === "koko") {
      feasible = kokoCanFinish(cfg.piles!, simValue, cfg.hours!);
      q = `Can Koko finish all piles at speed ${simValue}/hour in ${cfg.hours} hours?`;
    } else if (cfg.mode === "split_array") {
      feasible = canSplitWithMax(cfg.splitArray!, cfg.mSplits!, simValue);
      q = `Can array be split into ${cfg.mSplits} parts with max sum ≤ ${simValue}?`;
    } else if (cfg.mode === "cows") {
      feasible = canPlaceCows(cfg.stalls!, cfg.numCows!, simValue);
      q = `Can ${cfg.numCows} cows be placed with min distance ≥ ${simValue}?`;
    }
    a = feasible ? "YES ✓" : "NO ✗";
    setQaLog(log => [...log, { q, a, opt: isOptimal }]);
    if (!isOptimal) setStars(s => Math.max(0, s - 1) as StarCount);

    // Binary search logic: for min feasible, if feasible go lower; else go higher
    if (cfg.mode === "min_capacity" || cfg.mode === "min_days" || cfg.mode === "koko" || cfg.mode === "split_array" || cfg.mode === "cows") {
      if (feasible) {
        // This value works — try smaller
        setSimHi(simValue);
        if (simLo >= simHi - 1 || simLo === simValue) {
          // Found minimum
          setSolved(true);
          finalizeGame(newGuesses);
          return;
        }
        setSimValue(Math.ceil((simLo + simValue) / 2));
      } else {
        setSimLo(simValue + 1);
        if (simLo + 1 >= simHi) {
          setSolved(true);
          finalizeGame(newGuesses);
          return;
        }
        setSimValue(Math.ceil((simValue + 1 + simHi) / 2));
      }
    }
  }, [simValue, simLo, simHi, guesses, cfg, finalizeGame]);

  const renderContent = () => {
    if (cfg.mode === "amount" || cfg.mode === "limited_cred") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {cfg.mode === "limited_cred" && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: credits < 20 ? "#e84a5f" : NOIR.amber }}>
              CREDIBILITY: {credits} / {cfg.totalCredits} pts
            </div>
          )}
          <div style={{ padding: "16px 24px", background: "rgba(12,18,32,0.8)", border: `1px solid ${NOIR.border}`, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint, marginBottom: 4 }}>CURRENT SEARCH RANGE</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: NOIR.amber }}>
              ${lo} — ${hi}
            </div>
          </div>
          <GuessSlider
            lo={lo} hi={hi} value={guess}
            onChange={v => setGuess(v)}
            label={`Your question: "Was more than $X stolen?"`}
            unit=""
          />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint }}>
            Optimal midpoint: ${optimalMid}
            {guess !== optimalMid && ` · Your choice: $${guess}`}
          </div>
          <button
            onClick={askAmount} disabled={solved}
            style={{
              padding: "12px 32px", borderRadius: 8, cursor: solved ? "not-allowed" : "pointer",
              background: "rgba(240,165,0,0.14)", border: `1px solid ${NOIR.borderStrong}`,
              color: NOIR.amber, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 15,
            }}
          >
            ASK WITNESS
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 500 }}>
            {qaLog.map((row, i) => <QARow key={i} question={row.q} answer={row.a} isOptimal={row.opt} />)}
          </div>
        </div>
      );
    }

    // Simulation modes
    let sliderLabel = "Set capacity";
    let sliderUnit = "";
    let rangeHi = simHi;
    if (cfg.mode === "koko") { sliderLabel = "Koko's eating speed"; sliderUnit = " bananas/h"; }
    else if (cfg.mode === "min_days") { sliderLabel = "Number of days"; }
    else if (cfg.mode === "split_array") { sliderLabel = "Max subarray sum limit"; }
    else if (cfg.mode === "cows") { sliderLabel = "Minimum cow distance"; }

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.textFaint }}>
          <span>SEARCH RANGE: [{simLo} – {simHi}]</span>
          <span>OPTIMAL MID: {Math.ceil((simLo + simHi) / 2)}</span>
        </div>

        {/* Visualization */}
        {(cfg.mode === "min_capacity" || cfg.mode === "min_days") && cfg.packages && (
          <PackageList packages={cfg.packages} capacity={cfg.mode === "min_capacity" ? simValue : cfg.capacity!} days={cfg.mode === "min_days" ? simValue : cfg.days} />
        )}
        {cfg.mode === "koko" && cfg.piles && (
          <KokoViz piles={cfg.piles} speed={simValue} hours={cfg.hours!} />
        )}
        {cfg.mode === "cows" && cfg.stalls && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[...cfg.stalls].sort((a, b) => a - b).map((s, i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: 4, background: "rgba(240,165,0,0.12)", border: `1px solid ${NOIR.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.amber }}>{s}</div>
            ))}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.textFaint, marginLeft: 8 }}>min dist: {simValue}</span>
          </div>
        )}

        <GuessSlider lo={simLo} hi={rangeHi} value={simValue} onChange={setSimValue} label={sliderLabel} unit={sliderUnit} />
        <button
          onClick={checkSim} disabled={solved}
          style={{
            padding: "12px 32px", borderRadius: 8, cursor: solved ? "not-allowed" : "pointer",
            background: "rgba(240,165,0,0.14)", border: `1px solid ${NOIR.borderStrong}`,
            color: NOIR.amber, fontFamily: "var(--font-tac)", fontWeight: 700, fontSize: 15,
          }}
        >TEST THIS VALUE</button>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 540 }}>
          {qaLog.map((row, i) => <QARow key={i} question={row.q} answer={row.a} isOptimal={row.opt} />)}
        </div>
      </div>
    );
  };

  return (
    <NoirLayout gameName="THE SILENT WITNESS" levelNum={levelNum} xpReward={cfg.xpBase} stars={stars} onBack={onBack}>
      <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.24em", color: NOIR.amberDim, marginBottom: 6 }}>CASE {levelNum} OF 8</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: NOIR.text, marginBottom: 6 }}>{cfg.caseTitle.toUpperCase()}</h2>
          <StarBar stars={stars} />
        </div>
        <p style={{ color: NOIR.textDim, textAlign: "center", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6, fontSize: 14 }}>{cfg.storyBeat}</p>
        {renderContent()}
      </div>

      <AnimatePresence>
        {phase === "aha" && (
          <AhaMoment
            title={cfg.ahaTitle}
            body={cfg.ahaBody}
            complexity="O(log n)"
            onContinue={() => {
              const next = levelNum + 1;
              router.push(next <= 8 ? `/learn/tier1/binary-search/witness/${next}` : "/learn/tier1/binary-search");
            }}
          />
        )}
      </AnimatePresence>
    </NoirLayout>
  );
}
