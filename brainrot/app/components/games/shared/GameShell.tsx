"use client";
import { useState, useEffect } from "react";

/* ── Types ───────────────────────────────────────────────── */
export interface ShellTool {
  name: string;
  icon: string;
  cx: string;
  note: string;
  optimal?: boolean;
}

export interface ShellStat {
  label: string;
  value: string | number;
  danger?: boolean;
}

export interface GameShellProps {
  /* mission brief */
  missionName: string;
  zone: string;
  situation: string;
  objective: string;
  constraint: string;
  /* toolbox */
  tools: ShellTool[];
  /* right panel */
  stats: ShellStat[];       // live stats from game state
  sceneLabel: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

/* ── Mini icon components ────────────────────────────────── */
const CheckIco = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Stat chip ───────────────────────────────────────────── */
function StatChip({ label, value, danger }: ShellStat) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "8px 16px", borderRadius: 10, minWidth: 72,
      background: danger ? "rgba(255,46,147,0.08)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${danger ? "rgba(255,46,147,0.35)" : "rgba(255,255,255,0.10)"}`,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.16em", color: "var(--ink-4)", marginBottom: 3 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: danger ? "#ff5a7a" : "var(--ink)", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

/* ── Tool row ────────────────────────────────────────────── */
function ToolRow({ tool }: { tool: ShellTool }) {
  const CYAN = "#00e5ff";
  const active = !!tool.optimal;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      padding: "12px 14px", borderRadius: 10,
      background: active ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? "rgba(0,229,255,0.45)" : "rgba(255,255,255,0.09)"}`,
      boxShadow: active ? "0 0 18px -4px rgba(0,229,255,0.3)" : "none",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(0,229,255,0.14)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.10)"}`,
        fontFamily: "var(--font-mono)", fontSize: 17,
        color: active ? CYAN : "var(--ink-4)",
      }}>{tool.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-tac)", fontSize: 14, fontWeight: 700, color: active ? "var(--ink)" : "var(--ink-2)" }}>{tool.name}</span>
          {active && <span style={{ color: "#34d399", display: "flex" }}><CheckIco /></span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: active ? "#34d399" : "var(--ink-4)", whiteSpace: "nowrap" }}>{tool.cx}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{tool.note}</span>
        </div>
      </div>
    </div>
  );
}

/* ── GameShell ───────────────────────────────────────────── */
export default function GameShell({
  missionName, zone, situation, objective, constraint,
  tools, stats, sceneLabel, hint, children,
}: GameShellProps) {
  const optimalTool = tools.find(t => t.optimal);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "row",
      background: "var(--bg-0)",
      overflow: "hidden",
    }}>
      {/* ── LEFT COMMAND RAIL ── */}
      <div style={{
        width: 356, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(0,229,255,0.12)",
        background: "linear-gradient(180deg, rgba(11,14,31,0.7), rgba(6,8,20,0.4))",
        overflow: "hidden",
      }}>
        {/* mission header */}
        <div style={{
          padding: "20px 22px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          position: "relative",
        }}>
          {/* gold corner brackets */}
          <div style={{ position: "absolute", top: 10, left: 10, width: 14, height: 14, borderTop: "1.5px solid var(--gold)", borderLeft: "1.5px solid var(--gold)", opacity: 0.55 }} />
          <div style={{ position: "absolute", bottom: 10, right: 10, width: 14, height: 14, borderBottom: "1.5px solid var(--gold)", borderRight: "1.5px solid var(--gold)", opacity: 0.55 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>◇ MISSION BRIEF</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
              padding: "2px 8px", borderRadius: 5,
              color: "var(--cyan)", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)",
            }}>{zone}</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.1 }}>{missionName}</h2>
        </div>

        {/* brief body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 5 }}>SITUATION</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)", fontFamily: "var(--font-tac)" }}>{situation}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 5 }}>OBJECTIVE</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#34d399", fontFamily: "var(--font-tac)" }}>{objective}</div>
          </div>
          <div style={{ padding: "11px 13px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 5 }}>⚠ CONSTRAINT</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)", fontFamily: "var(--font-tac)" }}>{constraint}</div>
          </div>
        </div>

        {/* toolbox */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 9, flex: 1, overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 2 }}>
            TOOLBOX · PICK YOUR APPROACH
          </div>
          {tools.map(t => <ToolRow key={t.name} tool={t} />)}

          {/* complexity verdict */}
          {optimalTool && (
            <div style={{ marginTop: "auto", padding: "14px 16px", borderRadius: 11, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.28)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-4)" }}>YOUR COMPLEXITY</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: "#34d399", whiteSpace: "nowrap" }}>{optimalTool.cx}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                <CheckIco /> MATCHES OPTIMAL · full score on track
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT GAME AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* stat chips top-right */}
        {stats.length > 0 && (
          <div style={{ position: "absolute", top: 16, right: 18, zIndex: 10, display: "flex", gap: 10 }}>
            {stats.map((s, i) => <StatChip key={i} {...s} />)}
          </div>
        )}

        {/* scene label */}
        {sceneLabel && (
          <div style={{ position: "absolute", top: 18, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 5, pointerEvents: "none" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", color: "rgba(0,229,255,0.75)" }}>
              {sceneLabel}
            </span>
          </div>
        )}

        {/* game content */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {children}
        </div>

        {/* hint text */}
        {hint && (
          <div style={{ padding: "10px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-3)", letterSpacing: "0.03em" }}>{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
