"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CitySkyline, CaseCard } from "@/components/games/tier1/binary-search/SearchCity/NoirLayout";
import { NOIR } from "@/components/games/tier1/binary-search/SearchCity/types";

/* ── Progress helpers ────────────────────────────────────── */
function getProgress(game: "smuggler" | "clock" | "witness"): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`sc_${game}_levels`) ?? "0", 10);
}

function getStatus(
  done: number,
  locked: boolean,
): "available" | "active" | "completed" | "locked" {
  if (locked) return "locked";
  if (done >= 8) return "completed";
  if (done > 0) return "active";
  return "available";
}

/* ── Letter-by-letter title ──────────────────────────────── */
function LetterReveal({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  return (
    <span>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: startDelay + i * 0.05 }}
          style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Entry screen (noir city intro) ─────────────────────── */
function EntryScreen({ onDone }: { onDone: () => void }) {
  const [showTitle, setShowTitle] = useState(false);
  const [showSub, setShowSub] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTitle(true), 500);
    const t2 = setTimeout(() => setShowSub(true), 1300);
    const t3 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: NOIR.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
      }}
    >
      {/* Skyline */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 300 }}>
        <CitySkyline />
      </div>

      {/* Rain */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: "110vh", opacity: [0, 0.15, 0.15, 0] }}
            transition={{ duration: 1.2 + Math.random(), delay: Math.random() * 2, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              left: `${Math.random() * 100}%`,
              width: 1, height: 18 + Math.random() * 12,
              background: "rgba(42,157,143,0.4)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 2 }}>
        <AnimatePresence>
          {showTitle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                letterSpacing: "0.32em", color: NOIR.teal, marginBottom: 18,
              }}>
                <LetterReveal text="REGION I · BINARY SEARCH" startDelay={0} />
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(44px, 9vw, 88px)",
                fontWeight: 900, letterSpacing: "0.06em",
                color: NOIR.text, marginBottom: 18,
                textShadow: `0 0 50px rgba(240,165,0,0.25)`,
                lineHeight: 1,
              }}>
                <LetterReveal text="SEARCH CITY" startDelay={0.15} />
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 14,
                color: NOIR.textDim, maxWidth: 500, lineHeight: 1.75,
              }}>
                Every clue cuts the search space in half.
                <br />Think fast, detective.
              </p>
              <div style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 10, color: NOIR.textFaint, letterSpacing: "0.2em" }}>
                TAP TO ENTER
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Amber glow */}
      <div style={{
        position: "absolute", bottom: "30%", left: "50%", transform: "translateX(-50%)",
        width: 400, height: 200,
        background: "radial-gradient(ellipse, rgba(240,165,0,0.07), transparent 70%)",
        pointerEvents: "none",
      }} />
    </motion.div>
  );
}

/* ── Case select screen ──────────────────────────────────── */
function CaseSelectScreen() {
  const router = useRouter();
  const [smugglerDone, setSmugglerDone] = useState(0);
  const [clockDone, setClockDone] = useState(0);
  const [witnessDone, setWitnessDone] = useState(0);

  useEffect(() => {
    setSmugglerDone(getProgress("smuggler"));
    setClockDone(getProgress("clock"));
    setWitnessDone(getProgress("witness"));
  }, []);

  const totalDone = smugglerDone + clockDone + witnessDone;
  const totalLevels = 24;

  const clockLocked = smugglerDone < 8;
  const witnessLocked = clockDone < 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ minHeight: "100vh", background: NOIR.bg, color: NOIR.text, position: "relative", overflow: "hidden" }}
    >
      {/* Skyline */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 280, zIndex: 0, pointerEvents: "none" }}>
        <CitySkyline />
      </div>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(7,11,18,0.92)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${NOIR.border}`,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: NOIR.textDim, fontSize: 13, fontFamily: "var(--font-tac)", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← World Map
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: NOIR.textFaint }}>
          REGION I · SEARCH CITY
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.amber }}>
          {totalDone} / {totalLevels}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "32px 20px 140px" }}>
        {/* Region header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: 28, textAlign: "center" }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.28em", color: NOIR.teal, marginBottom: 8 }}>
            ◆ SEARCH CITY
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 900, color: NOIR.text, marginBottom: 8 }}>
            ACTIVE CASES
          </h1>
          <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: NOIR.textDim, maxWidth: 420, margin: "0 auto" }}>
            Three cases. Three flavors of binary search.
            Crack all 24 levels to close Search City.
          </p>
        </motion.div>

        {/* Overall progress */}
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(12,18,32,0.7)", border: `1px solid ${NOIR.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: NOIR.textFaint }}>TOTAL PROGRESS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: NOIR.amber }}>{totalDone}/{totalLevels}</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(totalDone / totalLevels) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${NOIR.teal}, ${NOIR.amber})`, borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Case cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.35 }}>
            <CaseCard
              caseNum="001"
              title="The Number Smuggler"
              difficulty="ENTRY"
              description="Find the warehouse. Every wrong guess wastes time."
              levelsComplete={smugglerDone}
              totalLevels={8}
              status={getStatus(smugglerDone, false)}
              onClick={() => router.push("/learn/tier1/binary-search/smuggler")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
            <CaseCard
              caseNum="002"
              title="The Crooked Clock"
              difficulty="INTERMEDIATE"
              description="Rotated sequences. The clock lies — find the truth."
              levelsComplete={clockDone}
              totalLevels={8}
              status={getStatus(clockDone, clockLocked)}
              lockTooltip="Close Case 001 to unlock"
              onClick={() => router.push("/learn/tier1/binary-search/clock")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.26, duration: 0.35 }}>
            <CaseCard
              caseNum="003"
              title="The Silent Witness"
              difficulty="ADVANCED"
              description="No array. Binary search the answer itself."
              levelsComplete={witnessDone}
              totalLevels={8}
              status={getStatus(witnessDone, witnessLocked)}
              lockTooltip="Close Case 002 to unlock"
              onClick={() => router.push("/learn/tier1/binary-search/witness")}
            />
          </motion.div>
        </div>

        {/* Region complete */}
        {totalDone >= 24 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              marginTop: 28, padding: "24px", textAlign: "center",
              background: "rgba(42,157,143,0.08)", border: `1px solid ${NOIR.teal}`,
              borderRadius: 14,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: NOIR.teal, marginBottom: 8 }}>
              SEARCH CITY CLOSED ✓
            </div>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: NOIR.textDim, lineHeight: 1.7 }}>
              Binary Search powers every search autocomplete, database index lookup, and git bisect you&apos;ve ever used.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function BinarySearchPage() {
  const [showEntry, setShowEntry] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("sc_bs_entry_seen");
    setShowEntry(!seen);
    if (!seen) localStorage.setItem("sc_bs_entry_seen", "1");
  }, []);

  if (showEntry === null) return null;

  return (
    <>
      <AnimatePresence>
        {showEntry && <EntryScreen key="entry" onDone={() => setShowEntry(false)} />}
      </AnimatePresence>
      {!showEntry && <CaseSelectScreen />}
    </>
  );
}
