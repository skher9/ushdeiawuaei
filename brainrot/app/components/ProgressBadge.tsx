"use client";

interface ProgressBadgeProps {
  completed: number;
  total: number;
}

export function ProgressBadge({ completed, total }: ProgressBadgeProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const done = completed >= total;

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(12,12,20,0.75)",
      border: `1px solid ${done ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.08)"}`,
      padding: "5px 10px",
      zIndex: 10,
    }}>
      <div style={{ position: "relative", width: 56, height: 3, background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: done ? "var(--emerald)" : "var(--violet)",
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: done ? "var(--emerald)" : "var(--ink-3)",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
      }}>
        {completed}/{total}
      </span>
    </div>
  );
}
