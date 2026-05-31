"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";

export interface AlgoContent {
  title: string;
  pseudocode: string;
  Animation: React.FC;
}

// ─── Shared style constants ────────────────────────────────────────────────
const CONTAINER: React.CSSProperties = {
  width: 400,
  height: 260,
  background: "#0a0a0a",
  position: "relative",
  overflow: "hidden",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const MONO: React.CSSProperties = { fontFamily: "monospace" };
const GOLD = "#eab308";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const RED = "#ef4444";
const PURPLE = "#a855f7";
const DIM = "#374151";

// ─── pointer_trace ─────────────────────────────────────────────────────────
const ARR = [3, 7, 11, 15, 21, 28, 35, 42];
const TARGET_BS = 21;

const steps_bs = [
  { lo: 0, hi: 7, mid: 3, faded: [] as number[], found: false },
  { lo: 4, hi: 7, mid: 5, faded: [0, 1, 2, 3], found: false },
  { lo: 4, hi: 4, mid: 4, faded: [0, 1, 2, 3, 5, 6, 7], found: false },
  { lo: 4, hi: 4, mid: 4, faded: [0, 1, 2, 3, 5, 6, 7], found: true },
];

function PointerTraceAnimation() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const advance = () => {
      setStep((s) => (s + 1) % steps_bs.length);
    };
    timerRef.current = setTimeout(advance, step === steps_bs.length - 1 ? 1200 : 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);

  const cur = steps_bs[step];

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>
          target = {TARGET_BS}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {ARR.map((v, i) => {
            const isMid = i === cur.mid;
            const isFaded = cur.faded.includes(i);
            const isFound = cur.found && isMid;
            let bg = DIM;
            if (isFound) bg = GREEN;
            else if (isMid) bg = GOLD;
            else if (i === cur.lo || i === cur.hi) bg = BLUE;
            return (
              <motion.div
                key={i}
                animate={{
                  opacity: isFaded ? 0.2 : 1,
                  backgroundColor: bg,
                  scale: isMid ? 1.15 : 1,
                }}
                transition={{ duration: 0.35 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...MONO,
                  fontSize: 11,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {v}
              </motion.div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 20, ...MONO, fontSize: 10, color: "#9ca3af" }}>
          <span style={{ color: BLUE }}>lo={cur.lo}</span>
          <span style={{ color: GOLD }}>mid={cur.mid}</span>
          <span style={{ color: BLUE }}>hi={cur.hi}</span>
        </div>
        {cur.found && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ ...MONO, fontSize: 11, color: GREEN }}
          >
            FOUND at index {cur.mid} ✓
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── resource_constraint ───────────────────────────────────────────────────
const RC_STEPS = [
  { lo: 0, hi: 9, mid: 4 },
  { lo: 5, hi: 9, mid: 7 },
  { lo: 5, hi: 6, mid: 5 },
  { lo: 6, hi: 6, mid: 6 },
];
const FIRST_BAD = 6;

function ResourceConstraintAnimation() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setStep((s) => (s + 1) % RC_STEPS.length), 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);

  const cur = RC_STEPS[step];
  const isBad = cur.mid >= FIRST_BAD;

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>first bad version</div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const bad = i >= FIRST_BAD;
            const isMid = i === cur.mid;
            const isLo = i === cur.lo;
            const isHi = i === cur.hi;
            let border = "1px solid transparent";
            if (isLo || isHi) border = `2px solid ${BLUE}`;
            if (isMid) border = `2px solid ${GOLD}`;
            return (
              <motion.div
                key={i}
                animate={{ backgroundColor: bad ? "#7f1d1d" : "#14532d", scale: isMid ? 1.2 : 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 3,
                  border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...MONO,
                  fontSize: 9,
                  color: bad ? RED : GREEN,
                }}
              >
                {i}
              </motion.div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, ...MONO, fontSize: 10 }}>
          <span style={{ color: BLUE }}>lo={cur.lo}</span>
          <span style={{ color: GOLD }}>mid={cur.mid}</span>
          <span style={{ color: BLUE }}>hi={cur.hi}</span>
        </div>
        <motion.div
          key={String(isBad)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 11, color: isBad ? RED : GREEN }}
        >
          isBad({cur.mid}) → {isBad ? "true → hi=mid" : "false → lo=mid+1"}
        </motion.div>
      </div>
    </div>
  );
}

// ─── simulation_guess ──────────────────────────────────────────────────────
const SG_STEPS = [
  { lo: 1, hi: 100, mid: 50, can: false },
  { lo: 1, hi: 49, mid: 25, can: true },
  { lo: 26, hi: 49, mid: 37, can: true },
  { lo: 38, hi: 49, mid: 43, can: false },
  { lo: 38, hi: 42, mid: 40, can: true },
];

function SimulationGuessAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % SG_STEPS.length), 1000);
    return () => clearTimeout(t);
  }, [step]);

  const cur = SG_STEPS[step];
  const pct = (v: number) => ((v - 1) / 99) * 320;

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: 360 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>binary search on answer space [1..100]</div>
        <div style={{ position: "relative", width: 320, height: 24 }}>
          {/* track */}
          <div style={{ position: "absolute", top: 10, left: 0, right: 0, height: 4, background: DIM, borderRadius: 2 }} />
          {/* active range */}
          <motion.div
            animate={{ left: pct(cur.lo), width: pct(cur.hi) - pct(cur.lo) }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 10, height: 4, background: BLUE, borderRadius: 2 }}
          />
          {/* lo */}
          <motion.div
            animate={{ left: pct(cur.lo) - 6 }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 0, width: 12, height: 12, borderRadius: "50%", background: BLUE }}
          />
          {/* hi */}
          <motion.div
            animate={{ left: pct(cur.hi) - 6 }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 0, width: 12, height: 12, borderRadius: "50%", background: BLUE }}
          />
          {/* mid */}
          <motion.div
            animate={{ left: pct(cur.mid) - 6 }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 0, width: 12, height: 12, borderRadius: "50%", background: GOLD }}
          />
          <motion.div
            animate={{ left: pct(cur.lo) }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 14, ...MONO, fontSize: 9, color: BLUE }}
          >
            {cur.lo}
          </motion.div>
          <motion.div
            animate={{ left: pct(cur.hi) - 10 }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: 14, ...MONO, fontSize: 9, color: BLUE }}
          >
            {cur.hi}
          </motion.div>
          <motion.div
            animate={{ left: pct(cur.mid) - 6 }}
            transition={{ duration: 0.5 }}
            style={{ position: "absolute", top: -14, ...MONO, fontSize: 9, color: GOLD }}
          >
            mid={cur.mid}
          </motion.div>
        </div>
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 11, color: cur.can ? GREEN : RED }}
        >
          canAchieve({cur.mid}) → {cur.can ? "true → hi=mid" : "false → lo=mid+1"}
        </motion.div>
      </div>
    </div>
  );
}

// ─── partition_game ────────────────────────────────────────────────────────
const A_ARR = [1, 3, 8, 12];
const B_ARR = [2, 5, 9, 14];
const PG_STEPS = [
  { pA: 2, valid: false, label: "maxLeftA(3) > minRightB(5)? no" },
  { pA: 3, valid: false, label: "maxLeftA(8) > minRightB(9)? no" },
  { pA: 4, valid: true, label: "maxLeftA(12) ≤ minRightB(14) ✓" },
];

function PartitionGameAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % PG_STEPS.length), 1200);
    return () => clearTimeout(t);
  }, [step]);

  const cur = PG_STEPS[step];

  const renderRow = (arr: number[], pA: number, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ ...MONO, fontSize: 9, color: "#6b7280", width: 14 }}>{label}</div>
      <div style={{ display: "flex", gap: 3 }}>
        {arr.map((v, i) => {
          const isLeft = i < pA;
          return (
            <motion.div
              key={i}
              animate={{ backgroundColor: isLeft ? "#1e3a5f" : "#1a1a2e" }}
              transition={{ duration: 0.4 }}
              style={{
                width: 34,
                height: 32,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...MONO,
                fontSize: 11,
                color: isLeft ? BLUE : "#9ca3af",
                border: `1px solid ${isLeft ? BLUE : DIM}`,
              }}
            >
              {v}
            </motion.div>
          );
        })}
      </div>
      <motion.div
        animate={{ left: cur.pA * 37 - 2 }}
        transition={{ duration: 0.4 }}
        style={{ width: 2, height: 36, background: GOLD, borderRadius: 1 }}
      />
    </div>
  );

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>median of two sorted arrays</div>
        {renderRow(A_ARR, cur.pA, "A")}
        {renderRow(B_ARR, 4 - cur.pA, "B")}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...MONO, fontSize: 10, color: cur.valid ? GREEN : GOLD }}
        >
          {cur.label}
        </motion.div>
      </div>
    </div>
  );
}

// ─── placement (N-Queens) ──────────────────────────────────────────────────
type NQStep = {
  queens: [number, number][];
  conflict?: [number, number];
  backtrack?: boolean;
};
const NQ_STEPS: NQStep[] = [
  { queens: [[0, 0]] },
  { queens: [[0, 0], [1, 2]] },
  { queens: [[0, 0], [1, 2], [2, 1]], conflict: [2, 1] },
  { queens: [[0, 0], [1, 2]], backtrack: true },
  { queens: [[0, 0], [1, 3]] },
  { queens: [[0, 0], [1, 3], [2, 1]] },
  { queens: [[0, 0], [1, 3], [2, 1], [3, 2]] },
];

function PlacementAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % NQ_STEPS.length), 900);
    return () => clearTimeout(t);
  }, [step]);

  const cur = NQ_STEPS[step];
  const N = 4;
  const isSolution = cur.queens.length === N && !cur.conflict;

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>4-queens backtracking</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 3 }}>
          {Array.from({ length: N * N }, (_, idx) => {
            const r = Math.floor(idx / N);
            const c = idx % N;
            const hasQueen = cur.queens.some(([qr, qc]) => qr === r && qc === c);
            const isConflict = cur.conflict && cur.conflict[0] === r && cur.conflict[1] === c;
            const light = (r + c) % 2 === 0;
            let bg = light ? "#1f2937" : "#111827";
            if (hasQueen && !isConflict) bg = isSolution ? "#14532d" : "#1e3a5f";
            if (isConflict) bg = "#7f1d1d";
            return (
              <motion.div
                key={idx}
                animate={{ backgroundColor: bg }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {hasQueen ? "♛" : ""}
              </motion.div>
            );
          })}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: cur.conflict ? RED : cur.backtrack ? GOLD : GREEN }}>
          {cur.conflict ? "conflict → backtrack" : cur.backtrack ? "trying next col..." : isSolution ? "solution found ✓" : `placing row ${cur.queens.length}`}
        </div>
      </div>
    </div>
  );
}

// ─── path_trace (Word Search) ──────────────────────────────────────────────
const GRID_LETTERS = [
  ["A", "B", "C", "D"],
  ["E", "C", "A", "T"],
  ["I", "A", "T", "S"],
  ["N", "G", "E", "P"],
];
// Spell CAT: (1,1)->(1,2)->(0,3) then backtrack and find CATS: (1,1)->(1,2)->(2,2)->(2,3)
const PT_STEPS = [
  { path: [[1, 1]] as [number, number][], dead: [] as [number, number][], label: "start C" },
  { path: [[1, 1], [1, 2]] as [number, number][], dead: [] as [number, number][], label: "try A→" },
  { path: [[1, 1], [1, 2], [0, 2]] as [number, number][], dead: [] as [number, number][], label: "try C? no" },
  { path: [[1, 1], [1, 2]] as [number, number][], dead: [[0, 2]] as [number, number][], label: "backtrack" },
  { path: [[1, 1], [1, 2], [2, 2]] as [number, number][], dead: [[0, 2]] as [number, number][], label: "try T→" },
  { path: [[1, 1], [1, 2], [2, 2], [2, 3]] as [number, number][], dead: [] as [number, number][], label: "S found! CATS ✓" },
];

function PathTraceAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % PT_STEPS.length), 900);
    return () => clearTimeout(t);
  }, [step]);

  const cur = PT_STEPS[step];
  const inPath = (r: number, c: number) => cur.path.some(([pr, pc]) => pr === r && pc === c);
  const isDead = (r: number, c: number) => cur.dead.some(([dr, dc]) => dr === r && dc === c);
  const isLast = (r: number, c: number) => {
    const last = cur.path[cur.path.length - 1];
    return last && last[0] === r && last[1] === c;
  };
  const isFound = cur.label.includes("✓");

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>word search: find "CATS"</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
          {GRID_LETTERS.flatMap((row, r) =>
            row.map((letter, c) => {
              const onPath = inPath(r, c);
              const dead = isDead(r, c);
              const last = isLast(r, c);
              let bg = "#111827";
              if (dead) bg = "#7f1d1d";
              else if (isFound && onPath) bg = "#14532d";
              else if (last) bg = GOLD;
              else if (onPath) bg = "#1e3a5f";
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{ backgroundColor: bg }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...MONO,
                    fontSize: 14,
                    fontWeight: 700,
                    color: onPath || dead ? "#fff" : "#6b7280",
                  }}
                >
                  {letter}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={{ ...MONO, fontSize: 11, color: cur.label.includes("backtrack") ? RED : cur.label.includes("✓") ? GREEN : GOLD }}>
          {cur.label}
        </div>
      </div>
    </div>
  );
}

// ─── selection (Combination Sum) ──────────────────────────────────────────
type TreeNode = { id: string; x: number; y: number; val: string; state: "normal" | "pruned" | "solution" };
type TreeEdge = { x1: number; y1: number; x2: number; y2: number };

const SEL_STEPS: Array<{ nodes: TreeNode[]; edges: TreeEdge[]; label: string }> = [
  {
    nodes: [{ id: "root", x: 190, y: 30, val: "7", state: "normal" }],
    edges: [],
    label: "target = 7",
  },
  {
    nodes: [
      { id: "root", x: 190, y: 30, val: "7", state: "normal" },
      { id: "n2", x: 80, y: 90, val: "5 (2)", state: "normal" },
      { id: "n3", x: 190, y: 90, val: "4 (3)", state: "normal" },
      { id: "n5", x: 310, y: 90, val: "2 (5)", state: "normal" },
    ],
    edges: [
      { x1: 190, y1: 44, x2: 80, y2: 80 },
      { x1: 190, y1: 44, x2: 190, y2: 80 },
      { x1: 190, y1: 44, x2: 310, y2: 80 },
    ],
    label: "choose 2 / 3 / 5",
  },
  {
    nodes: [
      { id: "root", x: 190, y: 30, val: "7", state: "normal" },
      { id: "n2", x: 80, y: 90, val: "5 (2)", state: "normal" },
      { id: "n3", x: 190, y: 90, val: "4 (3)", state: "normal" },
      { id: "n5", x: 310, y: 90, val: "2 (5)", state: "normal" },
      { id: "n22a", x: 30, y: 155, val: "3 (2)", state: "normal" },
      { id: "n22b", x: 100, y: 155, val: "1 (3)", state: "normal" },
      { id: "n22c", x: 155, y: 155, val: "9 (2)", state: "pruned" },
    ],
    edges: [
      { x1: 190, y1: 44, x2: 80, y2: 80 },
      { x1: 190, y1: 44, x2: 190, y2: 80 },
      { x1: 190, y1: 44, x2: 310, y2: 80 },
      { x1: 80, y1: 104, x2: 30, y2: 145 },
      { x1: 80, y1: 104, x2: 100, y2: 145 },
      { x1: 80, y1: 104, x2: 155, y2: 145 },
    ],
    label: "over target → prune",
  },
  {
    nodes: [
      { id: "root", x: 190, y: 30, val: "7", state: "normal" },
      { id: "n2", x: 80, y: 90, val: "5 (2)", state: "normal" },
      { id: "n3", x: 190, y: 90, val: "4 (3)", state: "normal" },
      { id: "n5", x: 310, y: 90, val: "2 (5)", state: "normal" },
      { id: "n22a", x: 30, y: 155, val: "3 (2)", state: "normal" },
      { id: "n22b", x: 100, y: 155, val: "1 (3)", state: "normal" },
      { id: "n22c", x: 155, y: 155, val: "9 (2)", state: "pruned" },
      { id: "sol1", x: 30, y: 215, val: "[2,2,3]", state: "solution" },
    ],
    edges: [
      { x1: 190, y1: 44, x2: 80, y2: 80 },
      { x1: 190, y1: 44, x2: 190, y2: 80 },
      { x1: 190, y1: 44, x2: 310, y2: 80 },
      { x1: 80, y1: 104, x2: 30, y2: 145 },
      { x1: 80, y1: 104, x2: 100, y2: 145 },
      { x1: 80, y1: 104, x2: 155, y2: 145 },
      { x1: 30, y1: 169, x2: 30, y2: 205 },
    ],
    label: "solution: [2,2,3] ✓",
  },
];

function SelectionAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % SEL_STEPS.length), 1100);
    return () => clearTimeout(t);
  }, [step]);

  const cur = SEL_STEPS[step];

  return (
    <div style={CONTAINER}>
      <div style={{ ...MONO, fontSize: 9, color: "#6b7280", position: "absolute", top: 8, left: 12 }}>
        combination sum: target=7, nums=[2,3,5]
      </div>
      <svg width={400} height={260} style={{ position: "absolute", top: 0, left: 0 }}>
        {cur.edges.map((e, i) => (
          <motion.line
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={DIM} strokeWidth={1.5}
          />
        ))}
      </svg>
      {cur.nodes.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1, backgroundColor: n.state === "pruned" ? "#7f1d1d" : n.state === "solution" ? "#14532d" : "#1e3a5f" }}
          transition={{ duration: 0.35 }}
          style={{
            position: "absolute",
            left: n.x - 24,
            top: n.y - 12,
            width: 48,
            height: 24,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...MONO,
            fontSize: 9,
            color: n.state === "pruned" ? RED : n.state === "solution" ? GREEN : "#93c5fd",
            fontWeight: 600,
          }}
        >
          {n.val}
        </motion.div>
      ))}
      <div style={{ ...MONO, fontSize: 10, position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", color: cur.label.includes("✓") ? GREEN : cur.label.includes("prune") ? RED : GOLD }}>
        {cur.label}
      </div>
    </div>
  );
}

// ─── swap (Permutations) ───────────────────────────────────────────────────
const SWAP_COLORS = [BLUE, GREEN, GOLD, PURPLE];
const SWAP_STEPS = [
  { arr: [0, 1, 2, 3], label: "[A,B,C,D]", swapping: null as null | [number, number] },
  { arr: [0, 1, 2, 3], label: "swap(0,2)", swapping: [0, 2] as [number, number] },
  { arr: [2, 1, 0, 3], label: "[C,B,A,D]", swapping: null },
  { arr: [2, 1, 0, 3], label: "swap(1,3)", swapping: [1, 3] as [number, number] },
  { arr: [2, 3, 0, 1], label: "[C,D,A,B]", swapping: null },
  { arr: [2, 3, 0, 1], label: "backtrack →", swapping: [1, 3] as [number, number] },
  { arr: [2, 1, 0, 3], label: "[C,B,A,D]", swapping: null },
  { arr: [2, 1, 0, 3], label: "backtrack →", swapping: [0, 2] as [number, number] },
  { arr: [0, 1, 2, 3], label: "[A,B,C,D]", swapping: null },
];
const LABELS = ["A", "B", "C", "D"];

function SwapAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % SWAP_STEPS.length), 800);
    return () => clearTimeout(t);
  }, [step]);

  const cur = SWAP_STEPS[step];

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>permutations via swapping</div>
        <div style={{ display: "flex", gap: 10 }}>
          {cur.arr.map((origIdx, pos) => {
            const isSwapping = cur.swapping && (cur.swapping[0] === pos || cur.swapping[1] === pos);
            return (
              <motion.div
                key={pos}
                animate={{
                  scale: isSwapping ? 1.2 : 1,
                  y: isSwapping ? -6 : 0,
                  backgroundColor: SWAP_COLORS[origIdx],
                }}
                transition={{ duration: 0.35 }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {LABELS[origIdx]}
              </motion.div>
            );
          })}
        </div>
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 12, color: cur.label.includes("backtrack") ? RED : GOLD }}
        >
          {cur.label}
        </motion.div>
      </div>
    </div>
  );
}

// ─── grid_fill (Sudoku) ────────────────────────────────────────────────────
type GFStep = {
  grid: (number | null)[][];
  active: [number, number] | null;
  state: "placing" | "conflict" | "backtrack" | "solved";
  label: string;
};
const INITIAL_GRID: (number | null)[][] = [
  [null, 2, null, null],
  [null, null, null, 3],
  [3, null, null, null],
  [null, null, 1, null],
];
const GF_STEPS: GFStep[] = [
  { grid: INITIAL_GRID, active: [0, 0], state: "placing", label: "try 1 at (0,0)" },
  { grid: [[1, 2, null, null], [null, null, null, 3], [3, null, null, null], [null, null, 1, null]], active: [0, 0], state: "placing", label: "placed 1 ✓" },
  { grid: [[1, 2, null, null], [null, null, null, 3], [3, null, null, null], [null, null, 1, null]], active: [0, 2], state: "placing", label: "try 3 at (0,2)" },
  { grid: [[1, 2, 3, null], [null, null, null, 3], [3, null, null, null], [null, null, 1, null]], active: [0, 2], state: "conflict", label: "conflict! col has 3" },
  { grid: [[1, 2, null, null], [null, null, null, 3], [3, null, null, null], [null, null, 1, null]], active: [0, 2], state: "backtrack", label: "try 4 at (0,2)" },
  { grid: [[1, 2, 4, null], [null, null, null, 3], [3, null, null, null], [null, null, 1, null]], active: [0, 2], state: "placing", label: "placed 4 ✓" },
];

function GridFillAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % GF_STEPS.length), 1000);
    return () => clearTimeout(t);
  }, [step]);

  const cur = GF_STEPS[step];

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>4×4 sudoku backtracking</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
          {cur.grid.flatMap((row, r) =>
            row.map((val, c) => {
              const isActive = cur.active && cur.active[0] === r && cur.active[1] === c;
              const isConflict = isActive && cur.state === "conflict";
              const isFixed = INITIAL_GRID[r][c] !== null;
              let bg = "#111827";
              if (isConflict) bg = "#7f1d1d";
              else if (isActive && cur.state === "placing") bg = "#1e3a5f";
              else if (isFixed) bg = "#1f2937";
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{ backgroundColor: bg, scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...MONO,
                    fontSize: 16,
                    fontWeight: 700,
                    color: isFixed ? "#9ca3af" : isConflict ? RED : BLUE,
                    border: `1px solid ${isActive ? GOLD : DIM}`,
                  }}
                >
                  {val ?? ""}
                </motion.div>
              );
            })
          )}
        </div>
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 11, color: cur.state === "conflict" ? RED : cur.state === "backtrack" ? GOLD : GREEN }}
        >
          {cur.label}
        </motion.div>
      </div>
    </div>
  );
}

// ─── flood_fill (BFS) ──────────────────────────────────────────────────────
const FF_SIZE = 5;
function cellDist(r: number, c: number, sr: number, sc: number) {
  return Math.abs(r - sr) + Math.abs(c - sc);
}

function FloodFillAnimation() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setTick((v) => (v + 1) % 8), 500);
    return () => clearTimeout(t);
  }, [tick]);

  const sr = 2, sc = 2;
  const queue: string[] = [];

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>BFS flood fill from center</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${FF_SIZE}, 1fr)`, gap: 3 }}>
          {Array.from({ length: FF_SIZE * FF_SIZE }, (_, idx) => {
            const r = Math.floor(idx / FF_SIZE);
            const c = idx % FF_SIZE;
            const d = cellDist(r, c, sr, sc);
            const revealed = d <= tick;
            const active = d === tick;
            return (
              <motion.div
                key={idx}
                animate={{
                  backgroundColor: revealed ? (active ? GOLD : "#164e63") : "#111827",
                  scale: active ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...MONO,
                  fontSize: 9,
                  color: revealed ? "#fff" : DIM,
                }}
              >
                {revealed ? d : ""}
              </motion.div>
            );
          })}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>
          queue frontier: dist = {tick}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: FF_SIZE * FF_SIZE }, (_, idx) => {
            const r = Math.floor(idx / FF_SIZE);
            const c = idx % FF_SIZE;
            const d = cellDist(r, c, sr, sc);
            if (d !== tick) return null;
            queue.push(`(${r},${c})`);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ ...MONO, fontSize: 9, color: GOLD, background: "#1c1c1c", padding: "2px 4px", borderRadius: 3 }}
              >
                {r},{c}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── dfs_mark ──────────────────────────────────────────────────────────────
const DFS_GRID = [
  [1, 1, 0, 1],
  [1, 0, 0, 1],
  [0, 0, 1, 0],
  [0, 1, 1, 0],
];
// Island 1: (0,0),(0,1),(1,0) — Island 2: (0,3),(1,3) — Island 3: (2,2),(3,1),(3,2)
const ISLAND_CELLS: Record<number, [number, number][]> = {
  1: [[0, 0], [0, 1], [1, 0]],
  2: [[0, 3], [1, 3]],
  3: [[2, 2], [3, 1], [3, 2]],
};
const ISLAND_COLORS: Record<number, string> = { 1: BLUE, 2: GREEN, 3: PURPLE };
const DFS_SEQ: Array<{ r: number; c: number; island: number }> = [
  { r: 0, c: 0, island: 1 }, { r: 0, c: 1, island: 1 }, { r: 1, c: 0, island: 1 },
  { r: 0, c: 3, island: 2 }, { r: 1, c: 3, island: 2 },
  { r: 2, c: 2, island: 3 }, { r: 3, c: 1, island: 3 }, { r: 3, c: 2, island: 3 },
];

function DfsMarkAnimation() {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (idx < DFS_SEQ.length) {
        const cell = DFS_SEQ[idx];
        setRevealed((prev) => new Set([...prev, `${cell.r}-${cell.c}`]));
        setIdx((i) => i + 1);
      } else {
        setTimeout(() => { setRevealed(new Set()); setIdx(0); }, 1500);
      }
    }, idx === 0 ? 400 : 500);
    return () => clearTimeout(t);
  }, [idx]);

  const curIsland = idx < DFS_SEQ.length ? DFS_SEQ[Math.max(0, idx - 1)].island : 0;
  const islandCount = idx === 0 ? 0 : ISLAND_CELLS[1].every((c) => revealed.has(`${c[0]}-${c[1]}`))
    ? (ISLAND_CELLS[2].every((c) => revealed.has(`${c[0]}-${c[1]}`)) ? (ISLAND_CELLS[3].every((c) => revealed.has(`${c[0]}-${c[1]}`)) ? 3 : 2) : 1)
    : 0;

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...MONO, fontSize: 10, color: "#6b7280", marginBottom: 4 }}>island DFS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
            {DFS_GRID.flatMap((row, r) =>
              row.map((cell, c) => {
                const key = `${r}-${c}`;
                const isRevealed = revealed.has(key);
                let bg = cell ? "#374151" : "#0f172a";
                let color = cell ? "#9ca3af" : "#1f2937";
                if (isRevealed) {
                  const islandNum = Object.entries(ISLAND_CELLS).find(([, cells]) =>
                    cells.some(([cr, cc]) => cr === r && cc === c)
                  );
                  if (islandNum) { bg = ISLAND_COLORS[Number(islandNum[0])]; color = "#fff"; }
                }
                return (
                  <motion.div
                    key={key}
                    animate={{ backgroundColor: bg }}
                    transition={{ duration: 0.3 }}
                    style={{ width: 40, height: 40, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", ...MONO, fontSize: 9, color }}
                  >
                    {cell ? "■" : "~"}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 100 }}>
          <div style={{ ...MONO, fontSize: 11, color: "#6b7280" }}>DFS stack:</div>
          <AnimatePresence>
            {DFS_SEQ.slice(Math.max(0, idx - 3), idx).reverse().map((item, i) => (
              <motion.div
                key={`${item.r}-${item.c}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1 - i * 0.3, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  ...MONO, fontSize: 10,
                  color: ISLAND_COLORS[item.island],
                  background: "#1c1c1c",
                  padding: "2px 6px",
                  borderRadius: 3,
                }}
              >
                ({item.r},{item.c})
              </motion.div>
            ))}
          </AnimatePresence>
          <div style={{ ...MONO, fontSize: 11, color: GOLD, marginTop: 8 }}>
            islands: {islandCount}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── path_find (BFS Shortest Path) ────────────────────────────────────────
// 5x5 maze: 0=open, 1=wall
const MAZE = [
  [0, 1, 0, 0, 0],
  [0, 1, 0, 1, 0],
  [0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
];
const START_PF = [0, 0];
const END_PF = [4, 4];
// BFS distances from start (pre-computed)
const PF_DIST: (number | null)[][] = [
  [0, null, 8, 9, 10],
  [1, null, 7, null, 9],
  [2, 3, 6, null, 8],
  [3, null, null, null, 7],
  [4, 5, 6, 7, 8],
];
// Shortest path cells (from [0,0] to [4,4])
const SHORTEST = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]];

function PathFindAnimation() {
  const [phase, setPhase] = useState<"fill" | "path" | "pause">("fill");
  const [fillTick, setFillTick] = useState(-1);
  useEffect(() => {
    if (phase === "fill") {
      if (fillTick < 10) {
        const t = setTimeout(() => setFillTick((v) => v + 1), 300);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("path"), 400);
        return () => clearTimeout(t);
      }
    } else if (phase === "path") {
      const t = setTimeout(() => setPhase("pause"), 800);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setPhase("fill"); setFillTick(-1); }, 1500);
      return () => clearTimeout(t);
    }
  }, [phase, fillTick]);

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>BFS shortest path — 5×5 maze</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
          {MAZE.flatMap((row, r) =>
            row.map((cell, c) => {
              const dist = PF_DIST[r][c];
              const revealed = dist !== null && dist <= fillTick;
              const onPath = SHORTEST.some(([pr, pc]) => pr === r && pc === c);
              const isStart = r === START_PF[0] && c === START_PF[1];
              const isEnd = r === END_PF[0] && c === END_PF[1];
              let bg = "#111827";
              if (cell === 1) bg = "#374151";
              else if (phase === "path" && onPath) bg = GOLD;
              else if (revealed) bg = "#0f3460";
              let textColor = "#fff";
              if (phase === "path" && onPath) textColor = "#000";
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{ backgroundColor: bg }}
                  transition={{ duration: 0.25 }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...MONO,
                    fontSize: 10,
                    color: textColor,
                    fontWeight: isStart || isEnd ? 700 : 400,
                    border: isStart ? `2px solid ${GREEN}` : isEnd ? `2px solid ${RED}` : "none",
                  }}
                >
                  {cell === 1 ? "" : isStart ? "S" : isEnd ? "E" : revealed ? dist : ""}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: phase === "path" ? GOLD : "#6b7280" }}>
          {phase === "fill" ? `filling distances... tick=${fillTick}` : phase === "path" ? "shortest path highlighted ✓" : "dist = 8 steps"}
        </div>
      </div>
    </div>
  );
}

// ─── simulation (Multi-Source BFS / Rotten Oranges) ───────────────────────
const ORANGE_GRID: (0 | 1 | 2)[][] = [
  [1, 1, 1, 1],
  [1, 0, 1, 1],
  [2, 1, 1, 2],
  [1, 1, 1, 1],
];
// Pre-compute which cells rot at which minute from sources at (2,0) and (2,3)
function rotMinute(r: number, c: number) {
  const d1 = Math.abs(r - 2) + Math.abs(c - 0);
  const d2 = Math.abs(r - 2) + Math.abs(c - 3);
  if (ORANGE_GRID[r][c] === 0) return Infinity;
  if (ORANGE_GRID[r][c] === 2) return 0;
  return Math.min(d1, d2);
}

function SimulationAnimation() {
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setMinute((m) => (m + 1) % 6), 700);
    return () => clearTimeout(t);
  }, [minute]);

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>multi-source BFS — rotten oranges</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
          {ORANGE_GRID.flatMap((row, r) =>
            row.map((cell, c) => {
              if (cell === 0) return (
                <div key={`${r}-${c}`} style={{ width: 48, height: 48, borderRadius: 4, background: "#111827" }} />
              );
              const rotAt = rotMinute(r, c);
              const isRotten = rotAt <= minute;
              const isSource = cell === 2;
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{
                    backgroundColor: isSource ? "#7f1d1d" : isRotten ? "#92400e" : "#14532d",
                    scale: rotAt === minute ? 1.15 : 1,
                  }}
                  transition={{ duration: 0.35 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  {isRotten || isSource ? "🍊" : "🟢"}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={{ ...MONO, fontSize: 12, color: GOLD }}>
          minute = {minute}
        </div>
      </div>
    </div>
  );
}

// ─── distance_fill (Gates BFS) ─────────────────────────────────────────────
const GATES_GRID = [
  [0, -1, Infinity, Infinity, Infinity],
  [Infinity, Infinity, Infinity, -1, Infinity],
  [Infinity, -1, Infinity, Infinity, Infinity],
  [Infinity, Infinity, -1, Infinity, 0],
  [Infinity, Infinity, Infinity, Infinity, Infinity],
];
function gateDist(r: number, c: number) {
  if (GATES_GRID[r][c] === -1) return -1;
  const gates: [number, number][] = [[0, 0], [3, 4]];
  let min = Infinity;
  for (const [gr, gc] of gates) {
    const d = Math.abs(r - gr) + Math.abs(c - gc);
    // Check no wall in path (simplified manhattan)
    min = Math.min(min, d);
  }
  return min;
}

function DistanceFillAnimation() {
  const [tick, setTick] = useState(-1);
  useEffect(() => {
    const t = setTimeout(() => setTick((v) => (v + 1) % 10), 500);
    return () => clearTimeout(t);
  }, [tick]);

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>multi-source BFS from gates</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
          {GATES_GRID.flatMap((row, r) =>
            row.map((cell, c) => {
              const isWall = cell === -1;
              const isGate = cell === 0;
              const d = isWall ? -1 : gateDist(r, c);
              const revealed = !isWall && !isGate && d <= tick;
              const alpha = revealed ? Math.max(0.2, 1 - d * 0.15) : 0;
              let bg = "#111827";
              if (isWall) bg = "#374151";
              else if (isGate) bg = GREEN;
              else if (revealed) bg = `rgba(59, 130, 246, ${alpha})`;
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{ backgroundColor: bg }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...MONO,
                    fontSize: 10,
                    color: isGate ? "#000" : isWall ? "#6b7280" : "#fff",
                    fontWeight: isGate ? 700 : 400,
                  }}
                >
                  {isWall ? "■" : isGate ? "G" : revealed ? d : "∞"}
                </motion.div>
              );
            })
          )}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: BLUE }}>
          BFS tick = {tick} — distances filling outward
        </div>
      </div>
    </div>
  );
}

// ─── dual_dfs (Pacific Atlantic) ───────────────────────────────────────────
// 5x5 height grid
const PA_HEIGHTS = [
  [9, 2, 5, 3, 1],
  [8, 7, 6, 2, 4],
  [3, 4, 5, 6, 8],
  [1, 2, 3, 7, 9],
  [2, 1, 4, 8, 5],
];
// Pacific = can reach top or left; Atlantic = can reach bottom or right
// Pre-computed reachability (running uphill)
function canReach(r: number, c: number, ocean: "pacific" | "atlantic") {
  const h = PA_HEIGHTS[r][c];
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  // Simplified: pacific = r<=1 or c<=1; atlantic = r>=3 or c>=3
  const touchesPacific = r === 0 || c === 0;
  const touchesAtlantic = r === 4 || c === 4;
  if (ocean === "pacific") return touchesPacific || (r <= 2 && c <= 2 && h >= 3);
  return touchesAtlantic || (r >= 2 && c >= 2 && h >= 5);
}

const DD_PHASES = ["pacific", "atlantic", "overlap", "reset"] as const;

function DualDfsAnimation() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  useEffect(() => {
    const durations = [1200, 1200, 1200, 600];
    const t = setTimeout(() => setPhaseIdx((p) => (p + 1) % DD_PHASES.length), durations[phaseIdx]);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  const phase = DD_PHASES[phaseIdx];

  return (
    <div style={CONTAINER}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ ...MONO, fontSize: 10, color: "#6b7280" }}>Pacific Atlantic — reverse DFS uphill</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
          {PA_HEIGHTS.flatMap((row, r) =>
            row.map((h, c) => {
              const pacific = canReach(r, c, "pacific");
              const atlantic = canReach(r, c, "atlantic");
              const both = pacific && atlantic;
              let bg = "#111827";
              if (phase === "overlap" && both) bg = GOLD;
              else if ((phase === "pacific" || phase === "overlap") && pacific && !both) bg = "#1e3a5f";
              else if ((phase === "atlantic" || phase === "overlap") && atlantic && !both) bg = "#14532d";
              if (phase === "overlap" && both) bg = GOLD;
              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{ backgroundColor: bg }}
                  transition={{ duration: 0.4 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...MONO,
                    fontSize: 10,
                    color: both && phase === "overlap" ? "#000" : "#9ca3af",
                  }}
                >
                  {h}
                </motion.div>
              );
            })
          )}
        </div>
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 11, color: phase === "overlap" ? GOLD : phase === "pacific" ? BLUE : GREEN }}
        >
          {phase === "pacific" && "Pacific DFS (blue) from top+left"}
          {phase === "atlantic" && "Atlantic DFS (green) from bottom+right"}
          {phase === "overlap" && "Intersection = BOTH OCEANS ✓"}
          {phase === "reset" && "..."}
        </motion.div>
      </div>
    </div>
  );
}

// ─── graph_bfs (Word Ladder) ────────────────────────────────────────────────
const WORD_LEVELS = [["COLD"], ["CORD"], ["WORD"], ["WARD"], ["WARM"]];
const WORD_EDGES = [
  [0, 0, 1, 0], // COLD→CORD
  [1, 0, 2, 0], // CORD→WORD
  [2, 0, 3, 0], // WORD→WARD
  [3, 0, 4, 0], // WARD→WARM
];

function GraphBfsAnimation() {
  const [visibleLevels, setVisibleLevels] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVisibleLevels((v) => (v + 1) % (WORD_LEVELS.length + 2)), 700);
    return () => clearTimeout(t);
  }, [visibleLevels]);

  const nodeX = 200;
  const nodeY = (level: number) => 30 + level * 46;

  return (
    <div style={CONTAINER}>
      <div style={{ ...MONO, fontSize: 10, color: "#6b7280", position: "absolute", top: 8, left: 12 }}>
        word ladder: COLD → WARM (BFS levels)
      </div>
      <svg width={400} height={260} style={{ position: "absolute", top: 0, left: 0 }}>
        {WORD_EDGES.map(([l1, n1, l2, n2], i) => {
          if (l2 >= visibleLevels) return null;
          return (
            <motion.line
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              x1={nodeX} y1={nodeY(l1) + 14}
              x2={nodeX} y2={nodeY(l2) - 2}
              stroke={DIM} strokeWidth={1.5}
            />
          );
        })}
      </svg>
      {WORD_LEVELS.map((words, level) => {
        if (level >= visibleLevels) return null;
        return words.map((word, wi) => {
          const isActive = level === visibleLevels - 1;
          const isLast = level === WORD_LEVELS.length - 1 && visibleLevels > WORD_LEVELS.length;
          return (
            <motion.div
              key={`${level}-${wi}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, backgroundColor: isLast ? GREEN : isActive ? GOLD : "#1e3a5f" }}
              transition={{ duration: 0.35 }}
              style={{
                position: "absolute",
                left: nodeX - 30,
                top: nodeY(level) - 2,
                width: 60,
                height: 28,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...MONO,
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {word}
            </motion.div>
          );
        });
      })}
      <div style={{ ...MONO, fontSize: 10, color: "#6b7280", position: "absolute", bottom: 10, left: 12 }}>
        steps = {Math.min(visibleLevels, WORD_LEVELS.length) - 1}
      </div>
      {visibleLevels > WORD_LEVELS.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...MONO, fontSize: 11, color: GREEN, position: "absolute", bottom: 10, right: 12 }}
        >
          found in 4 steps ✓
        </motion.div>
      )}
    </div>
  );
}

// ─── graph_analysis (Tarjan's Bridges) ─────────────────────────────────────
// 6 nodes, bridge = edge 1-4
const GA_NODES = [
  { id: 0, x: 80, y: 60 },
  { id: 1, x: 180, y: 60 },
  { id: 2, x: 80, y: 150 },
  { id: 3, x: 180, y: 150 },
  { id: 4, x: 300, y: 60 },
  { id: 5, x: 300, y: 150 },
];
const GA_EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 3], // left component (biconnected)
  [1, 4], // BRIDGE
  [4, 5], [4, 5], // right component
];
const GA_STEPS = [
  { visited: [0], active: 0, disc: { 0: 0 }, low: { 0: 0 }, bridge: null as null | [number, number], label: "start DFS at 0" },
  { visited: [0, 1], active: 1, disc: { 0: 0, 1: 1 }, low: { 0: 0, 1: 1 }, bridge: null, label: "visit 1, disc=1" },
  { visited: [0, 1, 2], active: 2, disc: { 0: 0, 1: 1, 2: 2 }, low: { 0: 0, 1: 1, 2: 2 }, bridge: null, label: "visit 2, disc=2" },
  { visited: [0, 1, 2, 3], active: 3, disc: { 0: 0, 1: 1, 2: 2, 3: 3 }, low: { 0: 0, 1: 0, 2: 0, 3: 0 }, bridge: null, label: "low propagates back" },
  { visited: [0, 1, 2, 3, 4], active: 4, disc: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 }, low: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 4 }, bridge: null, label: "visit 4 via edge 1-4" },
  { visited: [0, 1, 2, 3, 4, 5], active: 5, disc: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, low: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 4, 5: 4 }, bridge: [1, 4] as [number, number], label: "low[4]=4 > disc[1]=1 → BRIDGE!" },
];

function GraphAnalysisAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % GA_STEPS.length), 1000);
    return () => clearTimeout(t);
  }, [step]);

  const cur = GA_STEPS[step];

  return (
    <div style={CONTAINER}>
      <div style={{ ...MONO, fontSize: 10, color: "#6b7280", position: "absolute", top: 8, left: 12 }}>
        Tarjan's bridge algorithm
      </div>
      <svg width={400} height={260} style={{ position: "absolute", top: 0, left: 0 }}>
        {GA_EDGES.map(([a, b], i) => {
          const na = GA_NODES[a], nb = GA_NODES[b];
          const isBridge = cur.bridge && ((cur.bridge[0] === a && cur.bridge[1] === b) || (cur.bridge[0] === b && cur.bridge[1] === a));
          return (
            <motion.line
              key={i}
              animate={{ stroke: isBridge ? RED : DIM, strokeWidth: isBridge ? 3 : 1.5 }}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            />
          );
        })}
      </svg>
      {GA_NODES.map((node) => {
        const isVisited = cur.visited.includes(node.id);
        const isActive = cur.active === node.id;
        const disc = (cur.disc as Record<number, number>)[node.id];
        const low = (cur.low as Record<number, number>)[node.id];
        return (
          <motion.div
            key={node.id}
            animate={{
              backgroundColor: isActive ? GOLD : isVisited ? BLUE : DIM,
              scale: isActive ? 1.2 : 1,
            }}
            transition={{ duration: 0.35 }}
            style={{
              position: "absolute",
              left: node.x - 18,
              top: node.y - 18,
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              ...MONO,
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            <span>{node.id}</span>
            {isVisited && (
              <span style={{ fontSize: 7, color: "#ddd", lineHeight: 1 }}>
                {disc}/{low}
              </span>
            )}
          </motion.div>
        );
      })}
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ ...MONO, fontSize: 10, position: "absolute", bottom: 10, left: 12, right: 12, color: cur.bridge ? RED : GOLD }}
      >
        {cur.label}
      </motion.div>
    </div>
  );
}

// ─── Sliding Window Animations ─────────────────────────────────────────────

const SW_ARRAY = [2, 4, 1, 7, 3, 5, 8, 6];
const SW_K = 3;

function FixedWindowAnimation() {
  const [pos, setPos] = useState(0);
  const maxPos = SW_ARRAY.length - SW_K;
  useEffect(() => {
    const t = setInterval(() => setPos(p => (p >= maxPos ? 0 : p + 1)), 700);
    return () => clearInterval(t);
  }, []);
  const curSum = SW_ARRAY.slice(pos, pos + SW_K).reduce((a, b) => a + b, 0);
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>FIXED WINDOW k={SW_K} — SLIDE RIGHT</div>
      <div style={{ display: "flex", gap: 6 }}>
        {SW_ARRAY.map((v, i) => {
          const inWin = i >= pos && i < pos + SW_K;
          return (
            <motion.div key={i} animate={{ background: inWin ? "rgba(16,185,129,0.2)" : "#111", borderColor: inWin ? "#10b981" : "#333", color: inWin ? "#4ade80" : "#475569" }}
              style={{ width: 38, height: 38, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, transition: "all 0.3s" }}>
              {v}
            </motion.div>
          );
        })}
      </div>
      <motion.div key={pos} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
        [{SW_ARRAY.slice(pos, pos + SW_K).join(" + ")}] = {curSum}
      </motion.div>
      <div style={{ fontSize: 9, color: "#374151" }}>O(n) — no nested loop</div>
    </div>
  );
}

const SW_STRING = ["a","b","c","a","b","c","b","b"];

function VariableWindowAnimation() {
  const frames = useMemo(() => {
    const f: { L: number; R: number; label: string }[] = [];
    const seen = new Set<string>();
    let L = 0;
    for (let R = 0; R < SW_STRING.length; R++) {
      while (seen.has(SW_STRING[R])) { seen.delete(SW_STRING[L]); L++; }
      seen.add(SW_STRING[R]);
      f.push({ L, R, label: `window [${L}..${R}] len=${R - L + 1}` });
    }
    return f;
  }, []);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFi(i => (i + 1) % frames.length), 900);
    return () => clearInterval(t);
  }, [frames]);
  const { L, R, label } = frames[fi];
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>VARIABLE WINDOW — EXPAND / SHRINK</div>
      <div style={{ display: "flex", gap: 6 }}>
        {SW_STRING.map((c, i) => {
          const inWin = i >= L && i <= R;
          const isL = i === L, isR = i === R;
          return (
            <motion.div key={i} animate={{ background: inWin ? "rgba(16,185,129,0.18)" : "#111", borderColor: isL ? "#f43f5e" : isR ? "#10b981" : inWin ? "#10b981" : "#333" }}
              style={{ width: 34, height: 34, border: "2px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: inWin ? "#e2e8f0" : "#374151", transition: "all 0.3s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 24, fontSize: 9 }}>
        <span style={{ color: "#f43f5e" }}>L={L}</span>
        <span style={{ color: "#10b981" }}>R={R}</span>
      </div>
      <div style={{ fontSize: 10, color: "#64748b" }}>{label}</div>
    </div>
  );
}

function FreqWindowAnimation() {
  const s = "cbaebabc", p = "abc";
  const pLen = p.length;
  const [step, setStep] = useState(0);
  const maxStep = s.length - pLen;
  useEffect(() => {
    const t = setInterval(() => setStep(i => (i > maxStep ? 0 : i + 1)), 800);
    return () => clearInterval(t);
  }, [maxStep]);
  const win = s.slice(step, step + pLen);
  const isMatch = [...win].sort().join("") === [...p].sort().join("");
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>FREQ MAP WINDOW — FIND ANAGRAM OF "{p}"</div>
      <div style={{ display: "flex", gap: 5 }}>
        {[...s].map((c, i) => {
          const inWin = i >= step && i < step + pLen;
          return (
            <motion.div key={i} animate={{ background: inWin ? (isMatch ? "rgba(16,185,129,0.25)" : "rgba(251,191,36,0.15)") : "#111", borderColor: inWin ? (isMatch ? "#10b981" : "#fbbf24") : "#333" }}
              style={{ width: 36, height: 36, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: inWin ? "#e2e8f0" : "#374151", transition: "all 0.3s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <motion.div key={step + "-" + isMatch} initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ fontSize: 13, color: isMatch ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
        "{win}" {isMatch ? "✓ ANAGRAM" : "≠ anagram"}
      </motion.div>
      <div style={{ fontSize: 9, color: "#374151" }}>window [{step}..{step + pLen - 1}] · slide every step</div>
    </div>
  );
}

function AtMostKAnimation() {
  const arr = ["A","B","C","B","B","C","A","A"];
  const K_VAL = 2;
  const frames = useMemo(() => {
    const f: { L: number; R: number; distinct: string[] }[] = [];
    const counts: Record<string, number> = {};
    let L = 0;
    for (let R = 0; R < arr.length; R++) {
      counts[arr[R]] = (counts[arr[R]] ?? 0) + 1;
      while (Object.keys(counts).length > K_VAL) {
        counts[arr[L]]--;
        if (counts[arr[L]] === 0) delete counts[arr[L]];
        L++;
      }
      f.push({ L, R, distinct: Object.keys(counts) });
    }
    return f;
  }, []);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFi(i => (i + 1) % frames.length), 800);
    return () => clearInterval(t);
  }, [frames]);
  const { L, R, distinct } = frames[fi];
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>AT MOST {K_VAL} DISTINCT — SHRINK WHEN NEEDED</div>
      <div style={{ display: "flex", gap: 6 }}>
        {arr.map((c, i) => {
          const inWin = i >= L && i <= R;
          const colors: Record<string, string> = { A: "#f43f5e", B: "#fbbf24", C: "#a78bfa" };
          return (
            <motion.div key={i} animate={{ background: inWin ? "rgba(16,185,129,0.12)" : "#111", borderColor: inWin ? (colors[c] ?? "#10b981") : "#333" }}
              style={{ width: 36, height: 36, border: "2px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: inWin ? (colors[c] ?? "#e2e8f0") : "#374151", transition: "all 0.3s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#64748b" }}>
        distinct: [{distinct.join(",")}] · len={R - L + 1}
      </div>
    </div>
  );
}

function MonotonicDequeAnimation() {
  const arr = [3, 1, 3, 1, 2, 6, 4, 8, 7];
  const WIN = 3;
  const frames = useMemo(() => {
    const f: { i: number; dq: number[]; maxVal: number }[] = [];
    const dq: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      while (dq.length && dq[0] < i - WIN + 1) dq.shift();
      while (dq.length && arr[dq[dq.length - 1]] < arr[i]) dq.pop();
      dq.push(i);
      if (i >= WIN - 1) f.push({ i, dq: [...dq], maxVal: arr[dq[0]] });
    }
    return f;
  }, []);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFi(i => (i + 1) % frames.length), 900);
    return () => clearInterval(t);
  }, [frames]);
  const { i: ci, dq, maxVal } = frames[fi];
  const winStart = ci - WIN + 1;
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>MONOTONIC DEQUE · WINDOW MAX k={WIN}</div>
      <div style={{ display: "flex", gap: 5 }}>
        {arr.map((v, idx) => {
          const inWin = idx >= winStart && idx <= ci;
          const isMax = idx === dq[0];
          return (
            <motion.div key={idx} animate={{ background: isMax ? "rgba(251,191,36,0.2)" : inWin ? "rgba(16,185,129,0.1)" : "#111", borderColor: isMax ? "#fbbf24" : inWin ? "#10b981" : "#333" }}
              style={{ width: 34, height: 34, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: isMax ? "#fbbf24" : inWin ? "#10b981" : "#374151", transition: "all 0.3s" }}>
              {v}
            </motion.div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#64748b" }}>deque: [{dq.map(i => arr[i]).join(",")}] · max={maxVal}</div>
    </div>
  );
}

function MinWindowAnimation() {
  const s = "ADOBECODEBANC", t = "ABC";
  const frames = useMemo(() => {
    const need: Record<string, number> = {};
    for (const c of t) need[c] = (need[c] ?? 0) + 1;
    const f: { L: number; R: number; formed: number; valid: boolean }[] = [];
    const have: Record<string, number> = {};
    let L = 0, formed = 0;
    const required = Object.keys(need).length;
    for (let R = 0; R < s.length; R++) {
      const c = s[R];
      have[c] = (have[c] ?? 0) + 1;
      if (c in need && have[c] === need[c]) formed++;
      if (formed === required) {
        f.push({ L, R, formed, valid: true });
        while (formed === required) {
          have[s[L]]--;
          if (s[L] in need && have[s[L]] < need[s[L]]) formed--;
          L++;
        }
      } else {
        f.push({ L, R, formed, valid: false });
      }
    }
    return f.filter((_, i) => i % 2 === 0);
  }, []);
  const [fi, setFi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFi(i => (i + 1) % frames.length), 700);
    return () => clearInterval(t);
  }, [frames]);
  const { L, R, formed, valid } = frames[fi];
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>MIN WINDOW SUBSTRING · target="{t}"</div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: 370 }}>
        {[...s].map((c, i) => {
          const inWin = i >= L && i <= R;
          const isNeeded = t.includes(c);
          return (
            <motion.div key={i} animate={{ background: valid && inWin ? "rgba(16,185,129,0.2)" : inWin ? "rgba(251,191,36,0.12)" : "#111", borderColor: valid && inWin ? "#10b981" : isNeeded && inWin ? "#fbbf24" : "#333" }}
              style={{ width: 24, height: 28, border: "1px solid #333", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: inWin ? "#e2e8f0" : "#374151", transition: "all 0.2s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: valid ? "#4ade80" : "#fbbf24" }}>
        {valid ? `✓ valid window [${L}..${R}]` : `need ${Object.keys({ A: 0, B: 0, C: 0 }).length - formed} more`}
      </div>
    </div>
  );
}

function KReplacementAnimation() {
  const s = "AABABBA";
  const K_VAL = 1;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(i => (i + 1) % s.length), 800);
    return () => clearInterval(t);
  }, []);
  const count: Record<string, number> = {};
  let L = 0, maxFreq = 0, best = 0;
  for (let R = 0; R <= step; R++) {
    count[s[R]] = (count[s[R]] ?? 0) + 1;
    maxFreq = Math.max(maxFreq, count[s[R]]);
    if ((R - L + 1) - maxFreq > K_VAL) { count[s[L]]--; L++; }
    best = Math.max(best, R - L + 1);
  }
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>K={K_VAL} REPLACEMENT · MAX REPEATING WINDOW</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[...s].map((c, i) => {
          const inWin = i >= L && i <= step;
          const colA = c === "A";
          return (
            <motion.div key={i} animate={{ background: inWin ? (colA ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)") : "#111", borderColor: inWin ? (colA ? "#10b981" : "#ef4444") : "#333" }}
              style={{ width: 38, height: 38, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: inWin ? "#e2e8f0" : "#374151", transition: "all 0.3s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#64748b" }}>
        maxFreq={maxFreq} · window={step - L + 1} · best={best}
      </div>
      <div style={{ fontSize: 9, color: "#374151" }}>(window - maxFreq) ≤ k → valid</div>
    </div>
  );
}

function AllAnagramsAnimation() {
  const s = "cbaebabc", p = "abc";
  const k = p.length;
  const positions: number[] = [];
  for (let i = 0; i <= s.length - k; i++) {
    if ([...s.slice(i, i + k)].sort().join("") === [...p].sort().join("")) positions.push(i);
  }
  const [step, setStep] = useState(0);
  const maxStep = s.length - k;
  useEffect(() => {
    const t = setInterval(() => setStep(i => (i >= maxStep ? 0 : i + 1)), 600);
    return () => clearInterval(t);
  }, [maxStep]);
  const isMatch = positions.includes(step);
  return (
    <div style={{ ...MONO, width: 400, height: 260, background: "#0a0a0a", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>ALL ANAGRAMS · s="{s}" p="{p}"</div>
      <div style={{ display: "flex", gap: 5 }}>
        {[...s].map((c, i) => {
          const inWin = i >= step && i < step + k;
          const isFound = positions.includes(step) && inWin;
          return (
            <motion.div key={i} animate={{ background: isFound ? "rgba(16,185,129,0.25)" : inWin ? "rgba(251,191,36,0.12)" : "#111", borderColor: isFound ? "#10b981" : inWin ? "#fbbf24" : "#333" }}
              style={{ width: 36, height: 36, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: inWin ? "#e2e8f0" : "#374151", transition: "all 0.25s" }}>
              {c}
            </motion.div>
          );
        })}
      </div>
      <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, fontWeight: 700, color: isMatch ? "#4ade80" : "#374151" }}>
        [{step}..{step + k - 1}] = "{s.slice(step, step + k)}" {isMatch ? "✓ anagram" : ""}
      </motion.div>
      <div style={{ fontSize: 9, color: "#10b981" }}>found at: [{positions.join(", ")}]</div>
    </div>
  );
}

// ─── dp_tabulation ────────────────────────────────────────────────────────
const DP_FROG_VALS = [1, 1, 2, 3, 5, 8];
function FrogLeapAnimation() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(() => setStep(s => (s + 1) % DP_FROG_VALS.length),
      step === DP_FROG_VALS.length - 1 ? 1400 : 750);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {DP_FROG_VALS.map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: i < step ? "rgba(34,197,94,0.12)" : i === step ? "rgba(234,179,8,0.18)" : "#111",
              border: `2px solid ${i < step ? GREEN : i === step ? GOLD : "#222"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              color: i < step ? GREEN : i === step ? GOLD : DIM,
              transition: "all 0.35s",
            }}>
              {i <= step ? v : "?"}
            </div>
            <div style={{ fontSize: 9, color: DIM, ...MONO }}>dp[{i}]</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: DIM, textAlign: "center", ...MONO }}>
        {step < 2
          ? `dp[${step}] = ${DP_FROG_VALS[step]} (base case)`
          : `dp[${step}] = dp[${step-1}]+dp[${step-2}] = ${DP_FROG_VALS[step-1]}+${DP_FROG_VALS[step-2]} = ${DP_FROG_VALS[step]}`}
      </div>
    </div>
  );
}

// ─── dp_rob ───────────────────────────────────────────────────────────────
const VAULT_VALS = [2, 7, 9, 3, 1];
const VAULT_DP   = [2, 7, 11, 11, 12];
const VAULT_ROBBED = [true, false, true, false, true];
function VaultCrackerAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep(s => (s + 1) % VAULT_VALS.length),
      step === VAULT_VALS.length - 1 ? 1400 : 800);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {VAULT_VALS.map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 6,
              background: i <= step ? (VAULT_ROBBED[i] ? "rgba(234,179,8,0.15)" : "rgba(100,116,139,0.08)") : "#111",
              border: `2px solid ${i <= step ? (VAULT_ROBBED[i] ? GOLD : DIM) : "#222"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              color: i <= step ? (VAULT_ROBBED[i] ? GOLD : DIM) : "#2a2a2a",
              transition: "all 0.35s",
            }}>
              ${v}
            </div>
            <div style={{ fontSize: 9, color: i <= step ? GREEN : "#1a1a1a", ...MONO }}>
              {i <= step ? VAULT_DP[i] : "·"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: DIM, textAlign: "center", ...MONO }}>
        {step === 0
          ? `dp[0] = ${VAULT_VALS[0]}`
          : `dp[${step}] = max(${VAULT_DP[step-1]}, ${step >= 2 ? VAULT_DP[step-2] : 0}+${VAULT_VALS[step]}) = ${VAULT_DP[step]}`}
      </div>
    </div>
  );
}

// ─── dp_coin ──────────────────────────────────────────────────────────────
const COINS = [1, 5, 7];
const COIN_TARGET = 11;
const COIN_DP = [0,1,2,3,4,1,2,1,2,3,2,3]; // min coins for amounts 0..11
function CoinForgeAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep(s => (s + 1) % (COIN_TARGET + 1)),
      step === COIN_TARGET ? 1400 : 650);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: DIM, ...MONO }}>coins:</span>
        {COINS.map(c => (
          <div key={c} style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(168,85,247,0.15)",
            border: `1px solid ${PURPLE}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: PURPLE,
          }}>{c}</div>
        ))}
        <span style={{ fontSize: 9, color: DIM, marginLeft: 6, ...MONO }}>target: {COIN_TARGET}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {COIN_DP.map((v, i) => (
          <div key={i} style={{
            width: 28, height: 36, borderRadius: 4,
            background: i <= step ? (i === step ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.08)") : "#111",
            border: `1px solid ${i <= step ? (i === step ? GOLD : "#374151") : "#1e1e1e"}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            transition: "all 0.3s",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: i <= step ? (i === step ? GOLD : GREEN) : "#2a2a2a", ...MONO }}>
              {i <= step ? v : "∞"}
            </div>
            <div style={{ fontSize: 7, color: DIM, ...MONO }}>{i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── dp_lcs ───────────────────────────────────────────────────────────────
const LCS_S1 = "ABCD";
const LCS_S2 = "ACBD";
const LCS_GRID = [[0,0,0,0,0],[0,1,1,1,1],[0,1,1,2,2],[0,1,2,2,2],[0,1,2,2,3]];
function GeneSpliceAnimation() {
  const [cell, setCell] = useState(0);
  const total = 5 * 5;
  useEffect(() => {
    const t = setTimeout(() => setCell(c => c < total - 1 ? c + 1 : 0),
      cell === total - 1 ? 1400 : 300);
    return () => clearTimeout(t);
  }, [cell]);
  const row = Math.floor(cell / 5), col = cell % 5;
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {["", ...LCS_S2.split("")].map((c, ci) => (
          <div key={ci} style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: BLUE, ...MONO }}>{c}</div>
        ))}
      </div>
      {LCS_GRID.map((r, ri) => (
        <div key={ri} style={{ display: "flex", gap: 2 }}>
          <div style={{ width: 36, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: BLUE, ...MONO }}>
            {ri === 0 ? "" : LCS_S1[ri - 1]}
          </div>
          {r.map((v, ci) => {
            const filled = ri * 5 + ci <= cell;
            const isCurrent = ri * 5 + ci === cell;
            const isMatch = ri > 0 && ci > 0 && LCS_S1[ri-1] === LCS_S2[ci-1];
            return (
              <div key={ci} style={{
                width: 36, height: 28, borderRadius: 3,
                background: isCurrent ? "rgba(234,179,8,0.2)" : filled ? (isMatch && ri > 0 && ci > 0 ? "rgba(34,197,94,0.1)" : "#0f0f0f") : "#070707",
                border: `1px solid ${isCurrent ? GOLD : filled ? (isMatch && ri > 0 && ci > 0 ? "rgba(34,197,94,0.4)" : "#1e1e1e") : "#111"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                color: isCurrent ? GOLD : filled ? (v > 0 ? GREEN : DIM) : "#111",
                transition: "all 0.2s",
              }}>
                {filled ? v : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── dp_knapsack ──────────────────────────────────────────────────────────
const KS_ITEMS = [{w:1,v:1},{w:3,v:4},{w:4,v:5},{w:5,v:7}];
const KS_CAP = 7;
const KS_DP_FINAL = [0,1,1,4,5,5,6,8]; // optimal values for cap 0..7
function LootPackAnimation() {
  const [itemIdx, setItemIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setItemIdx(i => (i + 1) % KS_ITEMS.length),
      1000);
    return () => clearTimeout(t);
  }, [itemIdx]);
  const dpRows = useMemo(() => {
    const rows: number[][] = [[...Array(KS_CAP + 1).fill(0)]];
    for (let i = 0; i < KS_ITEMS.length; i++) {
      const prev = rows[i];
      const cur = [...prev];
      for (let w = KS_CAP; w >= KS_ITEMS[i].w; w--) {
        cur[w] = Math.max(cur[w], prev[w - KS_ITEMS[i].w] + KS_ITEMS[i].v);
      }
      rows.push(cur);
    }
    return rows;
  }, []);
  const currentRow = dpRows[itemIdx + 1] ?? dpRows[dpRows.length - 1];
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {KS_ITEMS.map((item, i) => (
          <div key={i} style={{
            padding: "4px 8px", borderRadius: 4,
            background: i === itemIdx ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${i === itemIdx ? PURPLE : "#222"}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <div style={{ fontSize: 9, color: i === itemIdx ? PURPLE : DIM, ...MONO }}>w:{item.w}</div>
            <div style={{ fontSize: 9, color: i === itemIdx ? GOLD : DIM, ...MONO }}>v:{item.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {currentRow.map((v, i) => (
          <div key={i} style={{
            width: 30, height: 32, borderRadius: 3,
            background: "rgba(34,197,94,0.08)", border: "1px solid #1e2e1e",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, ...MONO }}>{v}</div>
            <div style={{ fontSize: 7, color: DIM, ...MONO }}>{i}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: DIM, ...MONO }}>
        item {itemIdx + 1}: w={KS_ITEMS[itemIdx].w} v={KS_ITEMS[itemIdx].v} → dp updates
      </div>
    </div>
  );
}

// ─── dp_paths ─────────────────────────────────────────────────────────────
const PATHS_GRID = [[1,1,1,1],[1,2,3,4],[1,3,6,10]];
function PixelPathAnimation() {
  const [cell, setCell] = useState(0);
  const total = 3 * 4;
  useEffect(() => {
    const t = setTimeout(() => setCell(c => c < total - 1 ? c + 1 : 0),
      cell === total - 1 ? 1400 : 450);
    return () => clearTimeout(t);
  }, [cell]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 9, color: DIM, ...MONO, marginBottom: 4 }}>paths = above + left</div>
      {PATHS_GRID.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 6 }}>
          {row.map((v, ci) => {
            const idx = ri * 4 + ci;
            const filled = idx <= cell;
            const isCurrent = idx === cell;
            return (
              <div key={ci} style={{
                width: 44, height: 38, borderRadius: 5,
                background: isCurrent ? "rgba(234,179,8,0.18)" : filled ? "rgba(59,130,246,0.1)" : "#0d0d0d",
                border: `1px solid ${isCurrent ? GOLD : filled ? "rgba(59,130,246,0.35)" : "#1a1a1a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
                color: isCurrent ? GOLD : filled ? BLUE : "#1e1e1e",
                transition: "all 0.3s",
              }}>
                {filled ? v : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── dp_edit ─────────────────────────────────────────────────────────────
const EDIT_S1 = "CAT";
const EDIT_S2 = "DOG";
const EDIT_GRID = [[0,1,2,3],[1,1,2,3],[2,2,2,3],[3,3,3,3]];
function WordWarpAnimation() {
  const [cell, setCell] = useState(0);
  const total = 4 * 4;
  useEffect(() => {
    const t = setTimeout(() => setCell(c => c < total - 1 ? c + 1 : 0),
      cell === total - 1 ? 1400 : 350);
    return () => clearTimeout(t);
  }, [cell]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {["", "", ...EDIT_S2.split("")].map((c, ci) => (
          <div key={ci} style={{ width: 34, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: RED, ...MONO }}>{c}</div>
        ))}
      </div>
      {EDIT_GRID.map((r, ri) => (
        <div key={ri} style={{ display: "flex", gap: 2 }}>
          <div style={{ width: 34, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: BLUE, ...MONO }}>
            {ri === 0 ? "" : EDIT_S1[ri - 1]}
          </div>
          {r.map((v, ci) => {
            const idx = ri * 4 + ci;
            const filled = idx <= cell;
            const isCurrent = idx === cell;
            const isZero = v === 0;
            return (
              <div key={ci} style={{
                width: 34, height: 30, borderRadius: 3,
                background: isCurrent ? "rgba(234,179,8,0.18)" : filled ? "#0f0f0f" : "#070707",
                border: `1px solid ${isCurrent ? GOLD : filled ? "#1e1e1e" : "#111"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                color: isCurrent ? GOLD : filled ? (v === 0 ? DIM : v <= 1 ? GREEN : v === 2 ? GOLD : RED) : "#111",
                transition: "all 0.25s",
              }}>
                {filled ? v : ""}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ fontSize: 9, color: DIM, ...MONO }}>"CAT" → "DOG" = {EDIT_GRID[3][3]} ops</div>
    </div>
  );
}

// ─── dp_palindrome ────────────────────────────────────────────────────────
const LPS_STR = "BBBAB";
const LPS_DP: number[][] = Array.from({length: 5}, () => Array(5).fill(0));
(function buildLPS() {
  for (let i = 0; i < 5; i++) LPS_DP[i][i] = 1;
  for (let len = 2; len <= 5; len++) {
    for (let i = 0; i <= 5 - len; i++) {
      const j = i + len - 1;
      if (LPS_STR[i] === LPS_STR[j]) LPS_DP[i][j] = LPS_DP[i+1][j-1] + 2;
      else LPS_DP[i][j] = Math.max(LPS_DP[i+1][j], LPS_DP[i][j-1]);
    }
  }
})();
function MirrorGemAnimation() {
  const [len, setLen] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setLen(l => l < 5 ? l + 1 : 1), len === 5 ? 1400 : 800);
    return () => clearTimeout(t);
  }, [len]);
  return (
    <div style={{ ...CONTAINER, flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {LPS_STR.split("").map((c, i) => (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(168,85,247,0.12)",
            border: `2px solid ${PURPLE}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: PURPLE,
          }}>{c}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({length: 5}).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {Array.from({length: 5}).map((_, j) => {
              const valid = j >= i;
              const inLen = valid && (j - i + 1) <= len;
              const isCur = valid && (j - i + 1) === len;
              return (
                <div key={j} style={{
                  width: 28, height: 24, borderRadius: 3,
                  background: !valid ? "transparent" : isCur ? "rgba(234,179,8,0.18)" : inLen ? "rgba(168,85,247,0.08)" : "#090909",
                  border: !valid ? "none" : `1px solid ${isCur ? GOLD : inLen ? "rgba(168,85,247,0.3)" : "#1a1a1a"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  color: !valid ? "transparent" : isCur ? GOLD : inLen ? PURPLE : "#1a1a1a",
                }}>
                  {valid && inLen ? LPS_DP[i][j] : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: DIM, ...MONO }}>
        LPS of "{LPS_STR}" = {LPS_DP[0][4]} · expanding len={len}
      </div>
    </div>
  );
}

// ─── ALGO_CONTENT export ───────────────────────────────────────────────────
export const ALGO_CONTENT: Partial<Record<string, AlgoContent>> = {
  pointer_trace: {
    title: "Classic Binary Search",
    pseudocode: `lo = 0, hi = n-1
while lo <= hi:
  mid = (lo + hi) / 2
  if arr[mid] == target: return mid
  if arr[mid] < target: lo = mid + 1
  else: hi = mid - 1
return -1`,
    Animation: PointerTraceAnimation,
  },

  resource_constraint: {
    title: "First Bad Version / Peak Element",
    pseudocode: `lo = 0, hi = n-1
while lo < hi:
  mid = (lo + hi) / 2
  if isBad(mid): hi = mid
  else: lo = mid + 1
return lo  // first bad version`,
    Animation: ResourceConstraintAnimation,
  },

  simulation_guess: {
    title: "Binary Search on Answer Space",
    pseudocode: `lo = min_val, hi = max_val
while lo < hi:
  mid = (lo + hi) / 2
  if canAchieve(mid): hi = mid
  else: lo = mid + 1
return lo`,
    Animation: SimulationGuessAnimation,
  },

  partition_game: {
    title: "Median of Two Sorted Arrays",
    pseudocode: `pA on smaller array A, pB = half - pA
if maxLeftA <= minRightB && maxLeftB <= minRightA:
  median = max(maxLeftA, maxLeftB)  // odd
else if maxLeftA > minRightB: pA--
else: pA++`,
    Animation: PartitionGameAnimation,
  },

  placement: {
    title: "N-Queens Backtracking",
    pseudocode: `place(row):
  if row == N: found solution
  for col in 0..N-1:
    if not attacked(row, col):
      place queen
      place(row + 1)
      remove queen  // backtrack`,
    Animation: PlacementAnimation,
  },

  path_trace: {
    title: "Grid Backtracking (Word Search)",
    pseudocode: `dfs(r, c, idx):
  if idx == len(word): return True
  if out of bounds or visited: return False
  if grid[r][c] != word[idx]: return False
  mark visited
  for each neighbor:
    if dfs(neighbor, idx+1): return True
  unmark visited  // backtrack
  return False`,
    Animation: PathTraceAnimation,
  },

  selection: {
    title: "Combination Sum (Recursion Tree)",
    pseudocode: `dfs(start, remaining):
  if remaining == 0: add to results
  if remaining < 0: return (prune)
  for i from start to n:
    choose nums[i]
    dfs(i, remaining - nums[i])
    unchoose  // backtrack`,
    Animation: SelectionAnimation,
  },

  swap: {
    title: "Permutations",
    pseudocode: `permute(nums, start):
  if start == len: add to results
  for i from start to n-1:
    swap(nums[start], nums[i])
    permute(nums, start + 1)
    swap(nums[start], nums[i])  // backtrack`,
    Animation: SwapAnimation,
  },

  grid_fill: {
    title: "Sudoku / Constraint Satisfaction",
    pseudocode: `solve(board):
  cell = find_empty()
  if none: return True (solved)
  for num in 1..9:
    if valid(cell, num):
      place num
      if solve(board): return True
      remove num  // backtrack
  return False`,
    Animation: GridFillAnimation,
  },

  flood_fill: {
    title: "BFS Flood Fill",
    pseudocode: `queue = [start]
while queue:
  cell = queue.popleft()
  for neighbor in 4_directions:
    if not visited and safe:
      mark visited
      queue.append(neighbor)`,
    Animation: FloodFillAnimation,
  },

  dfs_mark: {
    title: "DFS Island Marking",
    pseudocode: `for each cell:
  if land and not visited:
    islands++
    dfs(cell)  // marks entire island

dfs(r, c):
  if visited or water: return
  mark visited
  dfs all 4 neighbors`,
    Animation: DfsMarkAnimation,
  },

  path_find: {
    title: "BFS Shortest Path",
    pseudocode: `queue = [(start, 0)]
while queue:
  (cell, dist) = queue.popleft()
  for neighbor:
    if not visited:
      dist[neighbor] = dist + 1
      queue.append((neighbor, dist+1))
      if neighbor == exit: return dist+1`,
    Animation: PathFindAnimation,
  },

  simulation: {
    title: "Multi-Source BFS (Rotten Oranges)",
    pseudocode: `queue = all_rotten_sources  // enqueue ALL at once
minute = 0
while queue:
  process entire current level
  spread to fresh neighbors
  minute++`,
    Animation: SimulationAnimation,
  },

  distance_fill: {
    title: "Multi-Source BFS from Gates",
    pseudocode: `queue = all gates (value 0)
while queue:
  (r,c) = dequeue
  for neighbor in 4_dirs:
    if dist[neighbor] > dist[r,c] + 1:
      dist[neighbor] = dist[r,c] + 1
      enqueue neighbor`,
    Animation: DistanceFillAnimation,
  },

  dual_dfs: {
    title: "Pacific Atlantic (Reverse Flow DFS)",
    pseudocode: `// Run DFS UPHILL from both ocean borders
pacific = dfs_uphill(top_row + left_col)
atlantic = dfs_uphill(bottom_row + right_col)
answer = pacific ∩ atlantic`,
    Animation: DualDfsAnimation,
  },

  graph_bfs: {
    title: "BFS on Implicit Graph (Word Ladder)",
    pseudocode: `queue = [start_word]
visited = {start_word}
steps = 1
while queue:
  for word in current_level:
    for each 1-letter-change:
      if valid and not visited:
        if == end: return steps
        queue.append(new_word)
  steps++`,
    Animation: GraphBfsAnimation,
  },

  graph_analysis: {
    title: "Tarjan's Bridges",
    pseudocode: `dfs(u, parent):
  disc[u] = low[u] = timer++
  for v in adj[u]:
    if not visited:
      dfs(v, u)
      low[u] = min(low[u], low[v])
      if low[v] > disc[u]: BRIDGE(u,v)
    elif v != parent:
      low[u] = min(low[u], disc[v])`,
    Animation: GraphAnalysisAnimation,
  },

  fixed_window: {
    title: "Fixed Window Sliding",
    pseudocode: `window_sum = sum(arr[0..k-1])
best = window_sum
for i in range(k, n):
  window_sum += arr[i] - arr[i-k]
  best = max(best, window_sum)
return best / k`,
    Animation: FixedWindowAnimation,
  },

  variable_window: {
    title: "Variable Window (No Repeats)",
    pseudocode: `L = 0, seen = set(), max_len = 0
for R in range(n):
  while arr[R] in seen:
    seen.remove(arr[L])
    L++
  seen.add(arr[R])
  max_len = max(max_len, R - L + 1)
return max_len`,
    Animation: VariableWindowAnimation,
  },

  freq_window: {
    title: "Frequency Map Window",
    pseudocode: `need = Counter(pattern)
have, formed = {}, 0
L = 0, result = []
for R in range(len(s)):
  c = s[R]; have[c] = have.get(c,0)+1
  if c in need and have[c]==need[c]: formed++
  while formed == len(need):
    result.append(L)
    have[s[L]] -= 1
    if s[L] in need and have[s[L]]<need[s[L]]: formed--
    L++`,
    Animation: FreqWindowAnimation,
  },

  at_most_k: {
    title: "At Most K Distinct Window",
    pseudocode: `L = 0, counts = {}, max_len = 0
for R in range(n):
  counts[arr[R]] = counts.get(arr[R],0)+1
  while len(counts) > k:
    counts[arr[L]] -= 1
    if counts[arr[L]] == 0: del counts[arr[L]]
    L++
  max_len = max(max_len, R - L + 1)
return max_len`,
    Animation: AtMostKAnimation,
  },

  monotonic_deque: {
    title: "Monotonic Deque Maximum",
    pseudocode: `dq = deque()  // stores indices
result = []
for i in range(n):
  while dq and dq[0] < i - k + 1: dq.popleft()
  while dq and arr[dq[-1]] < arr[i]: dq.pop()
  dq.append(i)
  if i >= k-1: result.append(arr[dq[0]])
return result`,
    Animation: MonotonicDequeAnimation,
  },

  min_window: {
    title: "Minimum Window Substring",
    pseudocode: `need = Counter(t); have = {}; formed = 0
L = 0; ans = ""
for R in range(len(s)):
  c = s[R]; have[c] = have.get(c,0)+1
  if c in need and have[c]==need[c]: formed++
  while formed==len(need):
    if R-L+1 < len(ans) or not ans: ans = s[L:R+1]
    have[s[L]] -= 1
    if s[L] in need and have[s[L]]<need[s[L]]: formed--
    L++`,
    Animation: MinWindowAnimation,
  },

  k_replacement: {
    title: "K Replacements Window",
    pseudocode: `L = 0; max_freq = 0; result = 0
count = {}
for R in range(n):
  count[s[R]] = count.get(s[R],0)+1
  max_freq = max(max_freq, count[s[R]])
  if (R - L + 1) - max_freq > k:
    count[s[L]] -= 1
    L++
  result = max(result, R - L + 1)
return result`,
    Animation: KReplacementAnimation,
  },

  all_anagrams: {
    title: "All Anagram Positions",
    pseudocode: `need = Counter(p); have = Counter(s[:len(p)])
result = [0] if have == need else []
for i in range(1, len(s)-len(p)+1):
  have[s[i+len(p)-1]] += 1
  have[s[i-1]] -= 1
  if have[s[i-1]] == 0: del have[s[i-1]]
  if have == need: result.append(i)
return result`,
    Animation: AllAnagramsAnimation,
  },

  dp_tabulation: {
    title: "Bottom-Up Tabulation",
    pseudocode: `dp[0] = 1; dp[1] = 1
for i in range(2, n+1):
  dp[i] = dp[i-1] + dp[i-2]
return dp[n]`,
    Animation: FrogLeapAnimation,
  },

  dp_rob: {
    title: "House Robber Transition",
    pseudocode: `dp[0] = nums[0]
dp[1] = max(nums[0], nums[1])
for i in range(2, n):
  dp[i] = max(dp[i-1], dp[i-2] + nums[i])
return dp[n-1]`,
    Animation: VaultCrackerAnimation,
  },

  dp_coin: {
    title: "Coin Change DP",
    pseudocode: `dp = [inf] * (amount + 1); dp[0] = 0
for a in range(1, amount+1):
  for c in coins:
    if a >= c:
      dp[a] = min(dp[a], dp[a-c] + 1)
return dp[amount] if dp[amount] != inf else -1`,
    Animation: CoinForgeAnimation,
  },

  dp_lcs: {
    title: "Longest Common Subsequence",
    pseudocode: `dp = [[0]*(m+1) for _ in range(n+1)]
for i in range(1, n+1):
  for j in range(1, m+1):
    if s1[i-1] == s2[j-1]:
      dp[i][j] = dp[i-1][j-1] + 1
    else:
      dp[i][j] = max(dp[i-1][j], dp[i][j-1])
return dp[n][m]`,
    Animation: GeneSpliceAnimation,
  },

  dp_knapsack: {
    title: "0/1 Knapsack",
    pseudocode: `dp = [0] * (W + 1)
for weight, value in items:
  for w in range(W, weight-1, -1):
    dp[w] = max(dp[w], dp[w-weight] + value)
return dp[W]`,
    Animation: LootPackAnimation,
  },

  dp_paths: {
    title: "Unique Paths Grid Fill",
    pseudocode: `dp = [[1]*cols for _ in range(rows)]
for r in range(1, rows):
  for c in range(1, cols):
    dp[r][c] = dp[r-1][c] + dp[r][c-1]
return dp[rows-1][cols-1]`,
    Animation: PixelPathAnimation,
  },

  dp_edit: {
    title: "Edit Distance",
    pseudocode: `dp[i][0]=i; dp[0][j]=j
for i in range(1, n+1):
  for j in range(1, m+1):
    if s1[i-1]==s2[j-1]:
      dp[i][j] = dp[i-1][j-1]
    else:
      dp[i][j] = 1 + min(dp[i-1][j],   # delete
                         dp[i][j-1],   # insert
                         dp[i-1][j-1]) # replace
return dp[n][m]`,
    Animation: WordWarpAnimation,
  },

  dp_palindrome: {
    title: "Longest Palindromic Subsequence",
    pseudocode: `for i in range(n): dp[i][i] = 1
for length in range(2, n+1):
  for i in range(n-length+1):
    j = i + length - 1
    if s[i] == s[j]:
      dp[i][j] = dp[i+1][j-1] + 2
    else:
      dp[i][j] = max(dp[i+1][j], dp[i][j-1])
return dp[0][n-1]`,
    Animation: MirrorGemAnimation,
  },

  bst_insert: {
    title: "BST Insert",
    pseudocode: `def insert(node, val):
  if not node: return TreeNode(val)
  if val < node.val:
    node.left = insert(node.left, val)
  else:
    node.right = insert(node.right, val)
  return node`,
    Animation: () => {
      const [step, setStep] = useState(0);
      const steps = [{node:8,dir:null},{node:3,dir:"L"},{node:10,dir:"R"},{node:6,dir:"L→R"},{node:null,dir:"insert"}];
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%steps.length), step===steps.length-1?1400:800); return ()=>clearTimeout(t); }, [step]);
      const cur = steps[step];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:"#f59e0b",letterSpacing:"0.1em",...MONO}}>INSERT 6 INTO BST</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
            {[{v:8,l:0},{v:cur.node===3?3:3,l:1,side:"L"},{v:cur.node===10?10:10,l:1,side:"R"}].map((n,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                {n.side&&<span style={{fontSize:9,color:DIM}}>{n.side}</span>}
                <div style={{width:36,height:36,borderRadius:"50%",background:step>=i?"rgba(245,158,11,0.15)":"#111",border:`2px solid ${step>=i?"#f59e0b":"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:step>=i?"#f59e0b":DIM,...MONO}}>{n.v}</div>
              </div>
            ))}
            {step>=3&&<div style={{width:36,height:36,borderRadius:"50%",background:"rgba(34,197,94,0.15)",border:"2px solid #22c55e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#22c55e",...MONO}}>6</div>}
          </div>
          <div style={{fontSize:9,color:DIM,...MONO}}>
            {step===0?"start at root 8":step===1?"6<8 → go left":step===2?"6>3 → go right":step===3?"null slot found":"inserted!"}
          </div>
        </div>
      );
    },
  },

  bst_search: {
    title: "BST Search",
    pseudocode: `def search(node, target):
  if not node: return None
  if target == node.val: return node
  if target < node.val:
    return search(node.left, target)
  return search(node.right, target)`,
    Animation: () => {
      const [step, setStep] = useState(0);
      const path = [{v:15,cmp:"target 7 < 15"},{v:6,cmp:"7 > 6"},{v:9,cmp:"7 < 9"},{v:7,cmp:"found!"}];
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%path.length), step===path.length-1?1400:900); return ()=>clearTimeout(t); }, [step]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:10}}>
          <div style={{fontSize:9,color:"#3b82f6",letterSpacing:"0.1em",...MONO}}>SEARCH FOR 7</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
            {path.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:i<=step?1:0.2,transition:"opacity 0.3s"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:i===step?"rgba(59,130,246,0.2)":i<step?"rgba(34,197,94,0.1)":"#111",border:`2px solid ${i===step?BLUE:i<step?GREEN:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:i===step?BLUE:i<step?GREEN:DIM,...MONO}}>{p.v}</div>
                {i<=step&&<span style={{fontSize:9,color:i===step?BLUE:DIM,...MONO}}>{p.cmp}</span>}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  tree_inorder: {
    title: "Inorder Traversal (L→Root→R)",
    pseudocode: `def inorder(node, result):
  if not node: return
  inorder(node.left, result)   # go left
  result.append(node.val)      # visit
  inorder(node.right, result)  # go right
# On BST: yields sorted output`,
    Animation: () => {
      const order = [1,3,4,6,7,8,10,13,14];
      const [idx, setIdx] = useState(0);
      useEffect(() => { const t = setTimeout(() => setIdx(i => i<order.length-1?i+1:0), idx===order.length-1?1400:600); return ()=>clearTimeout(t); }, [idx]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:14}}>
          <div style={{fontSize:9,color:GOLD,letterSpacing:"0.1em",...MONO}}>INORDER → SORTED OUTPUT</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
            {order.map((v,i)=>(
              <div key={i} style={{width:30,height:30,borderRadius:"50%",background:i<idx?"rgba(34,197,94,0.12)":i===idx?"rgba(234,179,8,0.2)":"#111",border:`2px solid ${i<idx?GREEN:i===idx?GOLD:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<idx?GREEN:i===idx?GOLD:DIM,transition:"all 0.3s",...MONO}}>{v}</div>
            ))}
          </div>
          <div style={{fontSize:10,color:DIM,...MONO}}>visiting: {order[idx]}</div>
        </div>
      );
    },
  },

  tree_levelorder: {
    title: "Level-Order BFS",
    pseudocode: `from collections import deque
q = deque([root]); result = []
while q:
  level = []
  for _ in range(len(q)):  # drain level
    node = q.popleft()
    level.append(node.val)
    if node.left:  q.append(node.left)
    if node.right: q.append(node.right)
  result.append(level)`,
    Animation: () => {
      const levels = [[8],[3,10],[1,6,14],[4,7,13]];
      const [lv, setLv] = useState(0);
      useEffect(() => { const t = setTimeout(() => setLv(l => (l+1)%levels.length), lv===levels.length-1?1400:900); return ()=>clearTimeout(t); }, [lv]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:10}}>
          <div style={{fontSize:9,color:PURPLE,letterSpacing:"0.1em",...MONO}}>LEVEL-ORDER BFS</div>
          {levels.map((lvl,li)=>(
            <div key={li} style={{display:"flex",gap:8,justifyContent:"center",opacity:li<=lv?1:0.2,transition:"opacity 0.4s"}}>
              {lvl.map((v,vi)=>(
                <div key={vi} style={{width:30,height:30,borderRadius:"50%",background:li===lv?"rgba(168,85,247,0.2)":li<lv?"rgba(34,197,94,0.1)":"#111",border:`2px solid ${li===lv?PURPLE:li<lv?GREEN:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:li===lv?PURPLE:li<lv?GREEN:DIM,...MONO}}>{v}</div>
              ))}
            </div>
          ))}
          <div style={{fontSize:9,color:DIM,...MONO}}>level {lv}: [{levels[lv].join(", ")}]</div>
        </div>
      );
    },
  },

  tree_lca: {
    title: "Lowest Common Ancestor",
    pseudocode: `def lca(node, p, q):
  if not node or node==p or node==q:
    return node
  left  = lca(node.left,  p, q)
  right = lca(node.right, p, q)
  if left and right:
    return node   # split here = LCA
  return left or right`,
    Animation: () => {
      const [step, setStep] = useState(0);
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%4), step===3?1400:900); return ()=>clearTimeout(t); }, [step]);
      const nodes = [{v:6,note:"p=4 in left, q=7 in right → LCA!"},{v:3,note:"p=4 in right"},{v:10,note:"q not here"},{v:4,note:"found p"}];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:4}}>
            <div style={{padding:"2px 8px",background:"rgba(59,130,246,0.15)",border:"1px solid #3b82f6",borderRadius:4,fontSize:9,color:BLUE,...MONO}}>p=4</div>
            <div style={{padding:"2px 8px",background:"rgba(234,179,8,0.15)",border:"1px solid #eab308",borderRadius:4,fontSize:9,color:GOLD,...MONO}}>q=7</div>
          </div>
          {nodes.map((n,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,opacity:i<=step?1:0.2,transition:"opacity 0.35s"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:i===0&&step>=1?"rgba(34,197,94,0.2)":i===step?"rgba(234,179,8,0.15)":"#111",border:`2px solid ${i===0&&step>=1?GREEN:i===step?GOLD:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i===0&&step>=1?GREEN:i===step?GOLD:DIM,...MONO}}>{n.v}</div>
              {i<=step&&<span style={{fontSize:8,color:i===0&&step>=1?GREEN:DIM,...MONO}}>{n.note}</span>}
            </div>
          ))}
        </div>
      );
    },
  },

  bst_validate: {
    title: "Validate BST — Min/Max Bounds",
    pseudocode: `def valid(node, lo=-inf, hi=inf):
  if not node: return True
  if node.val <= lo or node.val >= hi:
    return False
  return (valid(node.left,  lo, node.val) and
          valid(node.right, node.val, hi))`,
    Animation: () => {
      const [step, setStep] = useState(0);
      const checks = [{v:5,lo:"-∞",hi:"+∞",ok:true},{v:3,lo:"-∞",hi:"5",ok:true},{v:7,lo:"5",hi:"+∞",ok:true},{v:4,lo:"3",hi:"5",ok:true},{v:6,lo:"5",hi:"+∞",ok:false,note:"6>5 but parent says < 7 — wait, 6<7 ✓"}];
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%checks.length), step===checks.length-1?1400:900); return ()=>clearTimeout(t); }, [step]);
      const c = checks[step];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:RED,letterSpacing:"0.1em",...MONO}}>VALIDATE BST</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
            {checks.map((ch,i)=>(
              <div key={i} style={{width:30,height:30,borderRadius:"50%",background:i<step?"rgba(34,197,94,0.1)":i===step?"rgba(234,179,8,0.2)":"#111",border:`2px solid ${i<step?GREEN:i===step?GOLD:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<step?GREEN:i===step?GOLD:DIM,transition:"all 0.3s",...MONO}}>{ch.v}</div>
            ))}
          </div>
          <div style={{padding:"6px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid #1e1e1e",borderRadius:4,textAlign:"center"}}>
            <div style={{fontSize:10,color:GOLD,...MONO}}>node {c.v}: range ({c.lo}, {c.hi})</div>
            <div style={{fontSize:9,color:c.ok?GREEN:RED,marginTop:2,...MONO}}>{c.ok?"✓ valid":"✗ invalid"}</div>
          </div>
        </div>
      );
    },
  },

  bst_delete: {
    title: "BST Delete — Three Cases",
    pseudocode: `def delete(node, key):
  if key < node.val: node.left = delete(node.left, key)
  elif key > node.val: node.right = delete(node.right, key)
  else:  # found
    if not node.left: return node.right   # case 1/2
    if not node.right: return node.left   # case 2
    succ = leftmost(node.right)  # case 3
    node.val = succ.val
    node.right = delete(node.right, succ.val)
  return node`,
    Animation: () => {
      const [step, setStep] = useState(0);
      const cases = ["DELETE 3 (two children)","find in-order successor","successor = 4 (leftmost in right)","replace 3 with 4","delete old 4 from right"];
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%cases.length), step===cases.length-1?1400:900); return ()=>clearTimeout(t); }, [step]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:RED,letterSpacing:"0.1em",...MONO}}>{cases[step]}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            {[{v:step<3?3:4,deleted:step>=1&&step<3},{v:1,side:"L"},{v:6,side:"R"},{v:step<3?4:null,side:"R→L"}].map((n,i)=>(
              n.v!==null&&<div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                {n.side&&<span style={{fontSize:7,color:DIM,...MONO}}>{n.side}</span>}
                <div style={{width:34,height:34,borderRadius:"50%",background:n.deleted?"rgba(239,68,68,0.15)":step>=3&&i===0?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.1)",border:`2px solid ${n.deleted?RED:step>=3&&i===0?GREEN:"#f59e0b"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:n.deleted?RED:step>=3&&i===0?GREEN:"#f59e0b",textDecoration:n.deleted?"line-through":"none",...MONO}}>{n.v}</div>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  tree_pathsum: {
    title: "Path Sum — Root to Leaf",
    pseudocode: `def hasPath(node, target):
  if not node: return False
  target -= node.val
  if not node.left and not node.right:
    return target == 0   # leaf check
  return (hasPath(node.left,  target) or
          hasPath(node.right, target))`,
    Animation: () => {
      const path = [{v:5,rem:22},{v:4,rem:17},{v:11,rem:13},{v:2,rem:2}];
      const [step, setStep] = useState(0);
      useEffect(() => { const t = setTimeout(() => setStep(s => (s+1)%path.length), step===path.length-1?1400:800); return ()=>clearTimeout(t); }, [step]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:10}}>
          <div style={{fontSize:9,color:GREEN,letterSpacing:"0.1em",...MONO}}>TARGET = 22</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
            {path.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:i<=step?1:0.2,transition:"opacity 0.3s"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:i===step?"rgba(34,197,94,0.2)":i<step?"rgba(34,197,94,0.1)":"#111",border:`2px solid ${i<=step?GREEN:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:GREEN,...MONO}}>{p.v}</div>
                {i<=step&&<span style={{fontSize:9,color:DIM,...MONO}}>remaining: {p.rem} - {p.v} = {p.rem-p.v}</span>}
              </div>
            ))}
            {step===path.length-1&&<div style={{fontSize:10,color:GREEN,fontWeight:700,...MONO}}>leaf! remaining=0 ✓</div>}
          </div>
        </div>
      );
    },
  },

  // ─── TRIE MECHANICS ───────────────────────────────────────────────────────

  trie_insert: {
    title: "Trie Insert — Follow Then Create",
    pseudocode: `def insert(word):
  node = root
  for ch in word:
    if ch not in node.children:
      node.children[ch] = TrieNode()
    node = node.children[ch]
  node.is_end = True`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const word = "cat";
      const [step, setStep] = useState(-1);
      useEffect(() => { const t = setTimeout(() => setStep(s => s < word.length ? s+1 : -1), step===word.length?1400:700); return ()=>clearTimeout(t); }, [step]);
      const nodes = ["root","c","a","t"];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:14}}>
          <div style={{fontSize:9,color:DIM,...MONO}}>insert("{word}")</div>
          <div style={{display:"flex",gap:0,alignItems:"center"}}>
            {nodes.map((n,i)=>{
              const active = step === i-1;
              const done = step >= i;
              return (
                <div key={i} style={{display:"flex",alignItems:"center"}}>
                  {i>0&&<div style={{width:24,height:2,background:done?CYAN:DIM,transition:"background 0.3s"}}/>}
                  <div style={{width:36,height:36,borderRadius:"50%",background:active?"rgba(6,182,212,0.25)":done?"rgba(6,182,212,0.1)":"#111",border:`2px solid ${active?CYAN:done?CYAN:DIM}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:active?CYAN:done?CYAN:DIM,...MONO,transition:"all 0.3s"}}>{n}</div>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:9,color:step===word.length?GREEN:DIM,...MONO,transition:"color 0.3s"}}>{step===word.length?"is_end = True ✓":"navigating..."}</div>
        </div>
      );
    },
  },

  trie_search: {
    title: "Trie Search — Path Must End at Word Node",
    pseudocode: `def search(word):
  node = root
  for ch in word:
    if ch not in node.children:
      return False  # path broken
    node = node.children[ch]
  return node.is_end  # must be word`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const queries = [{w:"cat",found:true},{w:"ca",found:false},{w:"car",found:false}];
      const [qi, setQi] = useState(0);
      const [step, setStep] = useState(0);
      const q = queries[qi];
      const maxStep = q.w.length + 1;
      useEffect(() => {
        const t = setTimeout(() => {
          if (step < maxStep) { setStep(s=>s+1); }
          else { setTimeout(() => { setQi(i=>(i+1)%queries.length); setStep(0); }, 1000); }
        }, step===maxStep?1200:600);
        return ()=>clearTimeout(t);
      }, [step, qi]);
      const nodes = ["root",...q.w.split("")];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:14}}>
          <div style={{fontSize:9,color:DIM,...MONO}}>search("{q.w}")</div>
          <div style={{display:"flex",gap:0,alignItems:"center"}}>
            {nodes.map((n,i)=>{
              const active = step===i;
              const done = step>i;
              const fail = step===maxStep&&!q.found&&i===nodes.length-1;
              return (
                <div key={i} style={{display:"flex",alignItems:"center"}}>
                  {i>0&&<div style={{width:20,height:2,background:done?CYAN:DIM,transition:"background 0.3s"}}/>}
                  <div style={{width:32,height:32,borderRadius:"50%",background:fail?"rgba(239,68,68,0.15)":active?"rgba(6,182,212,0.25)":done?"rgba(6,182,212,0.1)":"#111",border:`2px solid ${fail?RED:active?CYAN:done?CYAN:DIM}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:fail?RED:active?CYAN:done?CYAN:DIM,...MONO,transition:"all 0.3s"}}>{n}</div>
                </div>
              );
            })}
          </div>
          {step===maxStep&&<div style={{fontSize:10,fontWeight:700,...MONO,color:q.found?GREEN:RED}}>{q.found?"is_end=True → found ✓":"is_end=False → not a word ✗"}</div>}
        </div>
      );
    },
  },

  trie_prefix: {
    title: "startsWith — Prefix Exists if Path Exists",
    pseudocode: `def startsWith(prefix):
  node = root
  for ch in prefix:
    if ch not in node.children:
      return False
    node = node.children[ch]
  return True  # no is_end check`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const words = ["apple","app","application"];
      const prefix = "app";
      const [tick, setTick] = useState(0);
      useEffect(() => { const t = setTimeout(() => setTick(s=>(s+1)%(prefix.length+2)), 700); return ()=>clearTimeout(t); }, [tick]);
      const nodes = ["root",...prefix.split("")];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {words.map(w=><div key={w} style={{fontSize:9,padding:"2px 6px",background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:3,color:CYAN,...MONO}}>{w}</div>)}
          </div>
          <div style={{fontSize:9,color:DIM,...MONO}}>startsWith("{prefix}")</div>
          <div style={{display:"flex",gap:0,alignItems:"center"}}>
            {nodes.map((n,i)=>{
              const active = tick===i;
              const done = tick>i;
              return (
                <div key={i} style={{display:"flex",alignItems:"center"}}>
                  {i>0&&<div style={{width:20,height:2,background:done?CYAN:DIM,transition:"background 0.3s"}}/>}
                  <div style={{width:32,height:32,borderRadius:"50%",background:active?"rgba(6,182,212,0.25)":done?"rgba(6,182,212,0.1)":"#111",border:`2px solid ${active?CYAN:done?CYAN:DIM}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:active?CYAN:done?CYAN:DIM,...MONO,transition:"all 0.3s"}}>{n}</div>
                </div>
              );
            })}
          </div>
          {tick>prefix.length&&<div style={{fontSize:10,color:GREEN,fontWeight:700,...MONO}}>path exists → True ✓</div>}
        </div>
      );
    },
  },

  trie_wildcard: {
    title: "Word Dictionary — Dot Wildcard Branching",
    pseudocode: `def search(word):
  def dfs(node, i):
    if i == len(word): return node.is_end
    ch = word[i]
    if ch == '.':
      return any(dfs(c, i+1)
                 for c in node.children.values())
    if ch not in node.children: return False
    return dfs(node.children[ch], i+1)
  return dfs(root, 0)`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const [step, setStep] = useState(0);
      const branches = [
        {label:"search('.at')",desc:"'.' → branch ALL children",branches:["bat","cat","hat"],match:"all match ✓"},
        {label:"search('ca.')",desc:"'ca' exact → then '.' branch",branches:["cab","can","cat"],match:"cat found ✓"},
      ];
      const cur = branches[step%2];
      const [tick, setTick] = useState(0);
      useEffect(() => {
        const t = setTimeout(() => {
          if (tick < cur.branches.length) setTick(t=>t+1);
          else setTimeout(()=>{setStep(s=>s+1);setTick(0);},1200);
        }, 600);
        return ()=>clearTimeout(t);
      }, [tick, step]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:DIM,...MONO}}>{cur.label}</div>
          <div style={{fontSize:9,color:GOLD,...MONO}}>{cur.desc}</div>
          <div style={{display:"flex",gap:8}}>
            {cur.branches.map((b,i)=>(
              <div key={b} style={{padding:"4px 8px",background:tick>i?"rgba(6,182,212,0.15)":"#111",border:`1px solid ${tick>i?CYAN:DIM}`,borderRadius:4,fontSize:10,color:tick>i?CYAN:DIM,...MONO,transition:"all 0.3s"}}>{b}</div>
            ))}
          </div>
          {tick===cur.branches.length&&<div style={{fontSize:10,color:GREEN,fontWeight:700,...MONO}}>{cur.match}</div>}
        </div>
      );
    },
  },

  trie_replace: {
    title: "Replace Words — First Matching Prefix Wins",
    pseudocode: `def replaceWords(roots, sentence):
  trie = build_trie(roots)
  result = []
  for word in sentence.split():
    node, replaced = trie.root, word
    for i, ch in enumerate(word):
      if ch not in node.children: break
      node = node.children[ch]
      if node.is_end:
        replaced = word[:i+1]  # first root wins
        break
    result.append(replaced)
  return ' '.join(result)`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const roots = ["cat","bat","rat"];
      const words = [{w:"cattle",root:"cat"},{w:"battle",root:"bat"},{w:"rattle",root:"rat"}];
      const [step, setStep] = useState(0);
      const [tick, setTick] = useState(0);
      const cur = words[step%words.length];
      useEffect(() => {
        const t = setTimeout(() => {
          if (tick <= cur.root.length) setTick(t=>t+1);
          else setTimeout(()=>{setStep(s=>s+1);setTick(0);},1200);
        }, 600);
        return ()=>clearTimeout(t);
      }, [tick, step]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:6}}>{roots.map(r=><div key={r} style={{fontSize:9,padding:"2px 6px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:3,color:GOLD,...MONO}}>{r}</div>)}</div>
          <div style={{fontSize:9,color:DIM,...MONO}}>word: "{cur.w}"</div>
          <div style={{display:"flex",gap:1}}>
            {cur.w.split("").map((ch,i)=>(
              <div key={i} style={{width:22,height:24,background:i<tick?(i<cur.root.length?"rgba(6,182,212,0.2)":"rgba(55,65,81,0.3)"):"#111",border:`1px solid ${i<tick?(i<cur.root.length?CYAN:DIM):DIM}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:i<tick?(i<cur.root.length?CYAN:DIM):"#374151",...MONO,transition:"all 0.3s"}}>{ch}</div>
            ))}
          </div>
          {tick>cur.root.length&&<div style={{fontSize:10,color:GREEN,...MONO}}>→ "{cur.root}" ✓</div>}
        </div>
      );
    },
  },

  trie_lcp: {
    title: "Longest Common Prefix — Stop at the Fork",
    pseudocode: `def longestCommonPrefix(strs):
  trie = build_trie(strs)
  node, prefix = trie.root, ""
  while (len(node.children) == 1
         and not node.is_end):
    ch = next(iter(node.children))
    prefix += ch
    node = node.children[ch]
  return prefix`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const words = ["flower","flow","flight"];
      const lcp = "fl";
      const [tick, setTick] = useState(-1);
      useEffect(() => { const t = setTimeout(() => setTick(s => s < lcp.length+1 ? s+1 : -1), tick===lcp.length+1?1400:700); return ()=>clearTimeout(t); }, [tick]);
      const path = ["root","f","l","→fork"];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>{words.map(w=><div key={w} style={{fontSize:9,padding:"2px 5px",background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.15)",borderRadius:3,color:CYAN,...MONO}}>{w}</div>)}</div>
          <div style={{display:"flex",gap:0,alignItems:"center"}}>
            {path.map((n,i)=>{
              const active = tick===i;
              const done = tick>i;
              const isFork = i===path.length-1;
              return (
                <div key={i} style={{display:"flex",alignItems:"center"}}>
                  {i>0&&<div style={{width:20,height:2,background:done&&!isFork?CYAN:DIM,transition:"background 0.3s"}}/>}
                  <div style={{width:isFork?44:32,height:32,borderRadius:isFork?6:"50%",background:isFork&&active?"rgba(239,68,68,0.15)":active?"rgba(6,182,212,0.25)":done&&!isFork?"rgba(6,182,212,0.1)":"#111",border:`2px solid ${isFork&&active?RED:active?CYAN:done&&!isFork?CYAN:DIM}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isFork?8:10,fontWeight:700,color:isFork&&active?RED:active?CYAN:done&&!isFork?CYAN:DIM,...MONO,transition:"all 0.3s"}}>{n}</div>
                </div>
              );
            })}
          </div>
          {tick>=lcp.length&&<div style={{fontSize:10,color:GREEN,fontWeight:700,...MONO}}>LCP = "{lcp}" ✓</div>}
        </div>
      );
    },
  },

  trie_suggest: {
    title: "Search Suggestions — DFS After Each Prefix",
    pseudocode: `def suggestProducts(products, prefix):
  products.sort()  # lex order
  trie = build_trie(products)
  result, node = [], trie.root
  for ch in prefix:
    if ch not in node.children: break
    node = node.children[ch]
    # DFS: collect up to 3 words
    result.append(dfs_top3(node, prefix[:i+1]))
  return result`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const suggestions: Record<string,string[]> = {
        "m":["mobile","mouse","music"],
        "mo":["mobile","mouse"],
        "mob":["mobile"],
      };
      const [tick, setTick] = useState(0);
      const keys = Object.keys(suggestions);
      const cur = keys[tick%keys.length];
      useEffect(() => { const t = setTimeout(() => setTick(s=>s+1), 1200); return ()=>clearTimeout(t); }, [tick]);
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:12}}>
          <div style={{fontSize:9,color:DIM,...MONO}}>typed: "{cur}"</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {suggestions[cur].map((s,i)=>(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:8,color:GOLD,...MONO}}>{i+1}.</span>
                <div style={{fontSize:10,padding:"3px 8px",background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:3,color:CYAN,...MONO}}>
                  <span style={{color:GREEN}}>{cur}</span>{s.slice(cur.length)}
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:8,color:DIM,...MONO}}>DFS → top {suggestions[cur].length} (lex)</div>
        </div>
      );
    },
  },

  trie_break: {
    title: "Word Break — DP + Trie Lookup",
    pseudocode: `def wordBreak(s, wordDict):
  trie = build_trie(wordDict)
  n = len(s)
  dp = [False] * (n + 1)
  dp[0] = True  # empty prefix ok
  for i in range(n):
    if not dp[i]: continue
    # trie scan from i forward
    node = trie.root
    for j in range(i, n):
      if s[j] not in node.children: break
      node = node.children[s[j]]
      if node.is_end:
        dp[j+1] = True
  return dp[n]`,
    Animation: () => {
      const CYAN = "#06b6d4";
      const s = "leetcode";
      const words = ["leet","code"];
      const dpSteps = [
        [true,false,false,false,false,false,false,false,false],
        [true,false,false,false,true,false,false,false,false],
        [true,false,false,false,true,false,false,false,true],
      ];
      const [tick, setTick] = useState(0);
      useEffect(() => { const t = setTimeout(() => setTick(s=>(s+1)%dpSteps.length), 1100); return ()=>clearTimeout(t); }, [tick]);
      const dp = dpSteps[tick];
      return (
        <div style={{...CONTAINER,flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:6}}>{words.map(w=><div key={w} style={{fontSize:9,padding:"2px 5px",background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.18)",borderRadius:3,color:CYAN,...MONO}}>{w}</div>)}</div>
          <div style={{display:"flex",gap:2}}>
            {s.split("").map((ch,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:26,height:26,background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#9ca3af",...MONO}}>{ch}</div>
                <div style={{width:26,height:20,background:dp[i+1]?"rgba(6,182,212,0.15)":"#111",border:`1px solid ${dp[i+1]?CYAN:DIM}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:dp[i+1]?CYAN:DIM,...MONO,transition:"all 0.4s"}}>{dp[i+1]?"T":"F"}</div>
              </div>
            ))}
          </div>
          {tick===dpSteps.length-1&&<div style={{fontSize:10,color:GREEN,fontWeight:700,...MONO}}>dp[8]=True → segmentable ✓</div>}
        </div>
      );
    },
  },
};
