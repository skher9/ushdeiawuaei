"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HarborSkyline, ManifestCard } from "@/components/games/tier1/two-pointers/dock/DockLayout";
import { DOCK } from "@/components/games/tier1/two-pointers/dock/types";

/* ── Foghorn (Web Audio) ─────────────────────────────────── */
function playFoghorn() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(88, ctx.currentTime + 1.8);
    g.gain.setValueAtTime(0.28, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    osc.start(); osc.stop(ctx.currentTime + 2.2);
  } catch {}
}

/* ── Progress helpers ────────────────────────────────────── */
function getProgress(game: "cargo-match" | "sort-yard" | "container-squeeze"): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`pd_${game}_levels`) ?? "0", 10);
}

function getStatus(done: number, locked: boolean): "available" | "active" | "completed" | "locked" {
  if (locked)    return "locked";
  if (done >= 8) return "completed";
  if (done > 0)  return "active";
  return "available";
}

/* ── Letter-by-letter title ──────────────────────────────── */
function LetterReveal({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  return (
    <span>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: startDelay + i * 0.045 }}
          style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Entry screen ────────────────────────────────────────── */
function EntryScreen({ onDone }: { onDone: () => void }) {
  const [showTitle, setShowTitle] = useState(false);
  const [showSub,   setShowSub]   = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => { setShowTitle(true); playFoghorn(); }, 500);
    const t2 = setTimeout(() => setShowSub(true), 1300);
    const t3 = setTimeout(onDone, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onDone}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: DOCK.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320 }}>
        <HarborSkyline />
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
        transition={{ duration: 2 }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(0,60,80,0.4), transparent 70%)",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", zIndex: 2, padding: "0 20px" }}>
        <AnimatePresence>
          {showTitle && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.36em", color: DOCK.cyan, marginBottom: 18 }}>
                <LetterReveal text="REGION II · TWO POINTERS" startDelay={0} />
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(42px, 9vw, 86px)",
                fontWeight: 900, letterSpacing: "0.04em",
                color: DOCK.text, marginBottom: 16,
                textShadow: `0 0 50px rgba(0,180,200,0.2)`,
                lineHeight: 1,
              }}>
                <LetterReveal text="POINTER DOCKS" startDelay={0.12} />
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSub && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: DOCK.textDim, maxWidth: 480, lineHeight: 1.75 }}>
                Two ends. One goal.
                <br />Move smart or move twice.
              </p>
              <div style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 10, color: DOCK.textFaint, letterSpacing: "0.2em" }}>
                TAP TO ENTER
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{
        position: "absolute", bottom: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 200,
        background: "radial-gradient(ellipse, rgba(0,180,200,0.06), transparent 70%)",
        pointerEvents: "none",
      }} />
    </motion.div>
  );
}

/* ── Game select screen ──────────────────────────────────── */
function GameSelectScreen() {
  const router = useRouter();
  const [cargoDone,   setCargoDone]   = useState(0);
  const [sortDone,    setSortDone]    = useState(0);
  const [squeezeDone, setSqueezeDone] = useState(0);

  useEffect(() => {
    setCargoDone(getProgress("cargo-match"));
    setSortDone(getProgress("sort-yard"));
    setSqueezeDone(getProgress("container-squeeze"));
  }, []);

  const totalDone     = cargoDone + sortDone + squeezeDone;
  const sortLocked    = cargoDone  < 8;
  const squeezeLocked = sortDone   < 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ minHeight: "100vh", background: DOCK.bg, color: DOCK.text, position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 320, zIndex: 0, pointerEvents: "none" }}>
        <HarborSkyline />
      </div>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", padding: "0 20px",
        background: "rgba(5,10,20,0.94)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${DOCK.border}`,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: DOCK.textDim, fontSize: 13, fontFamily: "var(--font-tac)", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← World Map
        </button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: DOCK.textFaint }}>
          REGION II · POINTER DOCKS
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber }}>
          {totalDone} / 24
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "32px 20px 140px" }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: 28, textAlign: "center" }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.3em", color: DOCK.cyan, marginBottom: 8 }}>
            ◆ POINTER DOCKS
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: DOCK.text, marginBottom: 8 }}>
            ACTIVE MANIFESTS
          </h1>
          <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: DOCK.textDim, maxWidth: 420, margin: "0 auto" }}>
            Three manifests. Three flavors of two pointers.
            Clear all 24 levels to close Pointer Docks.
          </p>
        </motion.div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(10,16,32,0.7)", border: `1px solid ${DOCK.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: DOCK.textFaint }}>TOTAL PROGRESS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: DOCK.amber }}>{totalDone}/24</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(totalDone / 24) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${DOCK.blue}, ${DOCK.cyan})`, borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Manifest cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.35 }}>
            <ManifestCard
              manifestNum="001"
              title="Cargo Match"
              description="Find the pairs. Every wrong move wastes crane time."
              levelsComplete={cargoDone}
              totalLevels={8}
              status={getStatus(cargoDone, false)}
              onClick={() => router.push("/learn/tier1/two-pointers/cargo-match")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
            <ManifestCard
              manifestNum="002"
              title="The Sort Yard"
              description="Mismatched crates. Two workers, opposite ends, swap until sorted."
              levelsComplete={sortDone}
              totalLevels={8}
              status={getStatus(sortDone, sortLocked)}
              lockTooltip="Ship Manifest 001 to unlock"
              onClick={() => router.push("/learn/tier1/two-pointers/sort-yard")}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.26, duration: 0.35 }}>
            <ManifestCard
              manifestNum="003"
              title="Container Squeeze"
              description="Two walls, trapped water. Move the shorter wall. Find the maximum."
              levelsComplete={squeezeDone}
              totalLevels={8}
              status={getStatus(squeezeDone, squeezeLocked)}
              lockTooltip="Ship Manifest 002 to unlock"
              onClick={() => router.push("/learn/tier1/two-pointers/container-squeeze")}
            />
          </motion.div>
        </div>

        {totalDone >= 24 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: 28, padding: "24px", textAlign: "center", background: "rgba(0,100,80,0.08)", border: `1px solid ${DOCK.cyan}`, borderRadius: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: DOCK.cyan, marginBottom: 8 }}>
              MANIFEST COMPLETE ✓
            </div>
            <p style={{ fontFamily: "var(--font-tac)", fontSize: 14, color: DOCK.textDim, lineHeight: 1.7 }}>
              Two pointers power every pair-sum check, QuickSort partition, rain-water trap, and palindrome test. O(n) from both ends.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function PointerDocksPage() {
  const [showEntry, setShowEntry] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("pd_entry_seen");
    setShowEntry(!seen);
    if (!seen) localStorage.setItem("pd_entry_seen", "1");
  }, []);

  if (showEntry === null) return null;

  return (
    <>
      <AnimatePresence>
        {showEntry && <EntryScreen key="entry" onDone={() => setShowEntry(false)} />}
      </AnimatePresence>
      {!showEntry && <GameSelectScreen />}
    </>
  );
}
