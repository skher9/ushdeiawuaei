"use client";
import Link from "next/link";

interface Props {
  insightTitle: string;
  insight: string;
  moduleHref: string;
  problemIndex: number;
  totalProblems?: number;
  nextHref: string | null;
  score?: number;
  onClose: () => void;
}

function scoreColor(s: number) {
  if (s >= 90) return "#34d399";
  if (s >= 70) return "var(--cyan)";
  if (s >= 50) return "var(--gold)";
  return "#ff5a7a";
}

export default function SolvePanel({
  insightTitle, insight, moduleHref, problemIndex, nextHref, score, onClose,
}: Props) {
  return (
    <div
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "rgba(6,10,24,0.97)",
        borderTop: "1px solid rgba(0,229,255,0.2)",
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        padding: "24px 28px 32px",
        zIndex: 50,
        fontFamily: "var(--font-tac)",
        animation: "slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        backdropFilter: "blur(16px)",
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: "#34d399", marginBottom: 6 }}>◇ SOLVED · P{problemIndex}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>{insightTitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {score !== undefined && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, color: scoreColor(score) }}>
                {score}<span style={{ fontSize: 11, color: "var(--ink-4)" }}>/100</span>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                color: "var(--ink-3)", padding: "6px 12px", borderRadius: 8,
                cursor: "pointer", fontSize: 13, fontFamily: "var(--font-tac)",
              }}
            >✕</button>
          </div>
        </div>

        {/* insight */}
        <div style={{
          fontSize: 14, color: "var(--ink-2)", lineHeight: 1.75,
          padding: "14px 16px",
          background: "rgba(0,229,255,0.04)",
          border: "1px solid rgba(0,229,255,0.14)",
          borderLeft: "3px solid var(--cyan)",
          borderRadius: "0 8px 8px 0",
        }}>
          {insight}
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={moduleHref} style={{ textDecoration: "none" }}>
            <button style={{
              padding: "10px 20px",
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--ink-3)",
              fontFamily: "var(--font-tac)", fontWeight: 600, letterSpacing: "0.06em",
            }}>
              ← MODULE
            </button>
          </Link>
          {nextHref && (
            <Link href={nextHref} style={{ textDecoration: "none" }}>
              <button style={{
                padding: "10px 20px",
                background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.5)",
                borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--cyan)",
                fontFamily: "var(--font-tac)", fontWeight: 700, letterSpacing: "0.06em",
              }}>
                NEXT PROBLEM →
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
