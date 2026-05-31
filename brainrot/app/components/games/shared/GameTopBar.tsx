"use client";
import Link from "next/link";

interface Props {
  moduleTitle: string;
  moduleHref: string;
  pattern: string;
  problemIndex: number;
  problemTitle: string;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  lcRef?: string;
  elapsed: number;
  solved: boolean;
  onLearnAlgo: () => void;
}

const DIFF_COLOR: Record<string, string> = {
  Easy: "#34d399", Medium: "#ffd60a", Hard: "#ff5a7a",
};

const ArrowLeft = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BookIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <path d="M3 6.5C3 5.7 3.7 5 4.5 5H10a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4.5a1.5 1.5 0 0 1-1.5-1.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M21 6.5C21 5.7 20.3 5 19.5 5H14a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const CheckIco = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function GameTopBar({
  moduleTitle, moduleHref, pattern, problemIndex, problemTitle,
  difficulty, lcRef, elapsed, solved, onLearnAlgo,
}: Props) {
  const diffColor = DIFF_COLOR[difficulty] ?? "var(--ink-3)";

  return (
    <div style={{
      height: 60, flexShrink: 0, display: "flex", alignItems: "center", gap: 14,
      padding: "0 20px",
      borderBottom: "1px solid rgba(0,229,255,0.14)",
      background: "linear-gradient(180deg, rgba(11,14,31,0.95), rgba(6,8,20,0.7))",
      backdropFilter: "blur(14px)",
      fontFamily: "var(--font-mono)",
      zIndex: 10,
    }}>
      {/* back */}
      <Link href={moduleHref} style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-tac)", whiteSpace: "nowrap" }}>
          <ArrowLeft /> {moduleTitle}
        </div>
      </Link>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)" }} />

      {/* learn algo */}
      <button
        onClick={onLearnAlgo}
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "6px 13px",
          borderRadius: 8, cursor: "pointer", flexShrink: 0,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)",
          color: "var(--ink-2)", fontFamily: "var(--font-tac)", fontSize: 12,
          fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
        }}
      >
        <BookIcon /> Learn the algorithm
      </button>

      {/* pattern + problem */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: "var(--cyan)", letterSpacing: "0.14em", whiteSpace: "nowrap" }}>{pattern}</span>
        <span style={{ color: "var(--ink-4)" }}>/</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          P{problemIndex} · {problemTitle}
        </span>
      </div>

      {/* right cluster */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        {solved && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#34d399" }}>
            <CheckIco /> SOLVED
          </span>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(232,244,255,0.5)" }}>
          {fmt(elapsed)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: diffColor }}>
          {difficulty.toUpperCase()}
        </span>
        {lcRef && (
          <span style={{ fontSize: 11, color: "var(--ink-4)" }}>LC #{lcRef}</span>
        )}
      </div>
    </div>
  );
}
