"use client";
import Link from "next/link";

export interface HubProblem {
  index: number;
  title: string;
  difficulty: string;
  leetcodeRef?: string;
}

interface Props {
  moduleTitle: string;
  moduleDesc: string;
  tierLabel: string;
  patternTag: string;
  accent?: string;
  problems: HubProblem[];
  solvedIndices: Set<number>;
  attemptCounts?: Map<number, number>;
  hrefBase: string;
  loading?: boolean;
}

const DIFF_COLOR: Record<string, string> = {
  Easy: "#34d399", Medium: "#ffd60a", Hard: "#ff5a7a",
};

const CheckIco = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LockIco = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <rect x="4.5" y="10" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);

const BoltIco = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <path d="M13 2 4 13.5h6L9 22l9-11.5h-6L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

const ArrowIco = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function ProblemCard({
  prob, solved, attempts, locked, href, accent,
}: {
  prob: HubProblem;
  solved: boolean;
  attempts: number;
  locked: boolean;
  href: string;
  accent: string;
}) {
  const diffColor = DIFF_COLOR[prob.difficulty] ?? "var(--ink-3)";

  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 18px",
      background: solved ? "rgba(52,211,153,0.05)" : locked ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${solved ? "rgba(52,211,153,0.22)" : locked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 10,
      opacity: locked ? 0.5 : 1,
      cursor: locked ? "default" : "pointer",
      transition: "border-color 0.15s, background 0.15s",
    }}
    onMouseEnter={(e) => {
      if (!locked) {
        (e.currentTarget as HTMLDivElement).style.borderColor = solved ? "rgba(52,211,153,0.45)" : `${accent}55`;
        (e.currentTarget as HTMLDivElement).style.background = solved ? "rgba(52,211,153,0.08)" : `${accent}0a`;
      }
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.borderColor = solved ? "rgba(52,211,153,0.22)" : locked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)";
      (e.currentTarget as HTMLDivElement).style.background = solved ? "rgba(52,211,153,0.05)" : locked ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)";
    }}
    >
      {/* index badge */}
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: 9,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: solved ? "rgba(52,211,153,0.12)" : `${accent}14`,
        border: `1px solid ${solved ? "rgba(52,211,153,0.3)" : `${accent}33`}`,
        fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800,
        color: solved ? "#34d399" : locked ? "var(--ink-4)" : accent,
      }}>
        {solved ? <CheckIco /> : locked ? <LockIco /> : prob.index}
      </div>

      {/* title + lc ref */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-tac)", fontSize: 15, fontWeight: 600,
          color: locked ? "var(--ink-4)" : "var(--ink)", marginBottom: 3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {prob.title}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {prob.leetcodeRef && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>
              LC #{prob.leetcodeRef}
            </span>
          )}
          {attempts > 0 && !locked && !solved && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>
              {attempts} attempt{attempts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* right: diff + arrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.1em", color: locked ? "var(--ink-4)" : diffColor,
        }}>
          {prob.difficulty.toUpperCase()}
        </span>
        {!locked && (
          <span style={{ color: solved ? "#34d399" : "var(--ink-4)" }}>
            <ArrowIco />
          </span>
        )}
      </div>
    </div>
  );

  if (locked) return inner;
  return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
}

export default function ModuleHubShell({
  moduleTitle, moduleDesc, tierLabel, patternTag,
  accent = "#00e5ff",
  problems, solvedIndices, attemptCounts = new Map(),
  hrefBase, loading = false,
}: Props) {
  const solved = problems.filter(p => solvedIndices.has(p.index)).length;
  const pct = problems.length > 0 ? Math.round((solved / problems.length) * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-0)",
      fontFamily: "var(--font-tac)",
    }}>
      {/* back to hub nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        height: 56, display: "flex", alignItems: "center", padding: "0 32px",
        background: "rgba(6,8,20,0.9)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--cyan)" }}>brain</span>
            <span style={{ color: "var(--ink)" }}>rot</span>
          </div>
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", margin: "0 12px" }}>›</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-3)" }}>
          {patternTag}
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", color: `${accent}`, opacity: 0.75, marginBottom: 12 }}>
            ◇ {tierLabel}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 12, lineHeight: 1.05 }}>
            {moduleTitle}
          </h1>
          <p style={{ fontSize: 16, color: "var(--ink-3)", lineHeight: 1.6, maxWidth: 520, marginBottom: 24 }}>
            {moduleDesc}
          </p>

          {/* progress row */}
          {!loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, maxWidth: 320 }}>
                <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 6,
                    background: `linear-gradient(90deg, ${accent}, color-mix(in oklch, ${accent}, white 20%))`,
                    width: `${pct}%`,
                    transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: `0 0 12px ${accent}66`,
                  }} />
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: solved === problems.length ? "#34d399" : accent }}>
                {solved}/{problems.length}
              </span>
              {solved > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>
                  <BoltIco />
                  {solved * 40} XP
                </span>
              )}
            </div>
          )}
        </div>

        {/* problem list */}
        {loading ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-4)", letterSpacing: "0.1em" }}>
            LOADING...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {problems.map((prob) => (
              <ProblemCard
                key={prob.index}
                prob={prob}
                solved={solvedIndices.has(prob.index)}
                attempts={attemptCounts.get(prob.index) ?? 0}
                locked={false}
                href={`${hrefBase}/${prob.index}`}
                accent={accent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
