"use client";

import { useState } from "react";
import { useXP } from "@/lib/xpContext";
import { TickNumber } from "@/components/Effects";
import { Bolt, Flame, Compass, Speaker, SpeakerOff, Check, Live } from "@/components/Glyphs";
import UserMenu from "@/components/UserMenu";
import SettingsModal from "@/components/SettingsModal";

const SECTION_LABELS = [
  { code: "01", name: "Watch",   sub: "Visualizer" },
  { code: "02", name: "Drive",   sub: "Interactive" },
  { code: "03", name: "Race",    sub: "Beat the Clock" },
  { code: "04", name: "Debug",   sub: "Spot the Bug" },
  { code: "05", name: "Boss",    sub: "Final Stand" },
  { code: "06", name: "Context", sub: "Real World" },
];

function Wordmark({ golden }: { golden: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-display)",
      fontSize: 22,
      letterSpacing: "-0.02em",
      fontWeight: 500,
      position: "relative",
      cursor: "default",
      userSelect: "none",
      flexShrink: 0,
    }}>
      <span style={{
        color: golden ? "#f6c453" : "#cdb9ff",
        textShadow: golden
          ? "0 0 18px rgba(246,196,83,0.65)"
          : "0 0 14px rgba(167,139,250,0.45)",
      }}>brain</span>
      <span style={{ color: "rgba(235,233,227,0.92)" }}>rot</span>
      <span style={{
        position: "absolute", right: -8, top: -2,
        fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(246,196,83,0.7)",
        letterSpacing: "0.1em",
      }}>v.7</span>
    </span>
  );
}

function DiagonalDivider() {
  return (
    <div style={{
      width: 1, height: 28,
      background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.16), transparent)",
      transform: "skewX(-18deg)",
      flexShrink: 0,
    }} />
  );
}

function SectionRail({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6, flex: 1, minWidth: 0 }}>
      {SECTION_LABELS.map((s, i) => {
        const isActive = i === current;
        const isDone   = i < current;
        return (
          <button
            key={s.code}
            onClick={() => onJump(i)}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
              padding: "8px 10px",
              background: isActive ? "rgba(167,139,250,0.08)" : "transparent",
              border: "1px solid " + (isActive ? "rgba(167,139,250,0.35)" : "transparent"),
              borderRadius: 6,
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: isActive ? "#f6c453" : isDone ? "rgba(110,231,183,0.7)" : "rgba(235,233,227,0.25)",
                letterSpacing: "0.12em",
              }}>{s.code}</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isActive ? "#ebe9e3" : isDone ? "rgba(110,231,183,0.65)" : "rgba(235,233,227,0.35)",
                letterSpacing: "0.02em",
              }}>{s.name}</span>
              {isDone && (
                <span style={{ marginLeft: "auto" }}>
                  <Check size={10} color="rgba(110,231,183,0.8)" />
                </span>
              )}
              {isActive && (
                <span style={{ marginLeft: "auto", position: "relative", display: "inline-flex" }}>
                  <Live size={6} color="#f6c453" />
                  <span style={{
                    position: "absolute", inset: -4, borderRadius: "50%",
                    border: "1px solid rgba(246,196,83,0.5)",
                    animation: "pulse-ring 2s ease-out infinite",
                  }} />
                </span>
              )}
            </div>
            <div style={{
              height: 2, width: "100%",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: isDone ? "100%" : isActive ? "60%" : "0%",
                background: isDone
                  ? "linear-gradient(90deg,#34d399,#6ee7b7)"
                  : "linear-gradient(90deg,#a78bfa,#f6c453)",
                transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
                boxShadow: isActive ? "0 0 8px rgba(246,196,83,0.4)" : "none",
              }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function XPMeter({ xp, level }: { xp: number; level: string }) {
  const into = xp % 200;
  const pct = (into / 200) * 100;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 12px 6px 10px",
      background: "rgba(246,196,83,0.05)",
      border: "1px solid rgba(246,196,83,0.18)",
      borderRadius: 8,
      position: "relative",
    }}>
      <Bolt size={14} color="#f6c453" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 70 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ color: "#f6c453", fontWeight: 700, fontSize: 13, letterSpacing: "0.02em", fontFamily: "var(--font-mono)" }}>
            <TickNumber value={xp} />
          </span>
          <span style={{ color: "rgba(246,196,83,0.4)", fontSize: 9, letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>XP</span>
        </div>
        <div style={{ height: 3, width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: pct + "%",
            background: "linear-gradient(90deg,#f6c453,#fde68a)",
            boxShadow: "0 0 8px rgba(246,196,83,0.6)",
            transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
          }} />
        </div>
      </div>
      <div style={{
        position: "absolute", top: -7, right: 10,
        fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em",
        color: "rgba(246,196,83,0.7)",
        background: "#0c0c14", padding: "0 4px",
      }}>{level || "INITIATE"}</div>
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const golden = streak >= 7;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 12px",
      background: golden ? "rgba(246,196,83,0.08)" : "rgba(251,113,133,0.06)",
      border: "1px solid " + (golden ? "rgba(246,196,83,0.3)" : "rgba(251,113,133,0.22)"),
      borderRadius: 8,
    }}>
      <span style={{
        display: "inline-block",
        animation: streak > 0 ? "float-y 2.2s ease-in-out infinite" : "none",
      }}>
        <Flame size={14} color={golden ? "#f6c453" : "#fb7185"} />
      </span>
      <span style={{
        color: golden ? "#f6c453" : "#fb7185",
        fontWeight: 700, fontSize: 13, letterSpacing: "0.02em",
        fontFamily: "var(--font-mono)",
      }}>
        <TickNumber value={streak} />
      </span>
      <span style={{
        fontSize: 8, letterSpacing: "0.12em",
        color: golden ? "rgba(246,196,83,0.55)" : "rgba(251,113,133,0.5)",
        fontFamily: "var(--font-mono)",
      }}>DAYS</span>
    </div>
  );
}

function IconButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        cursor: "pointer",
        color: "rgba(235,233,227,0.65)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(167,139,250,0.1)";
        e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)";
        e.currentTarget.style.color = "#ebe9e3";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "rgba(235,233,227,0.65)";
      }}
    >{children}</button>
  );
}

export default function Header({
  onMap,
  mode = "module",
  onHub,
  onLogout,
}: {
  onMap?: () => void;
  mode?: "hub" | "module";
  onHub?: () => void;
  onLogout?: () => void;
}) {
  const { xp, streak, level, currentSection, goToSection, soundEnabled, toggleSound } = useXP();
  const golden = streak >= 7;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "var(--hud-h)",
      background: "linear-gradient(180deg, rgba(7,7,13,0.92), rgba(7,7,13,0.78))",
      backdropFilter: "blur(18px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Bottom accent line */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.5), rgba(246,196,83,0.4), transparent)",
      }} />
      {/* Sweep scan beam */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(246,196,83,0.9) 50%, transparent 100%)",
        backgroundSize: "30% 100%",
        animation: "border-sweep 8s linear infinite",
        opacity: 0.6,
      }} />

      <div style={{
        height: "100%",
        maxWidth: 1280, margin: "0 auto", padding: "0 20px",
        display: "flex", alignItems: "center", gap: 18,
      }}>
        <Wordmark golden={golden} />
        <DiagonalDivider />

        {mode === "hub" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em",
              color: "rgba(0,229,255,0.6)",
            }}>
              ◇ LEARNING HUB
            </span>
          </div>
        ) : (
          <>
            {onHub && (
              <button
                onClick={onHub}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em",
                  color: "rgba(232,244,255,0.45)",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,229,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
                  e.currentTarget.style.color = "rgba(0,229,255,0.9)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(232,244,255,0.45)";
                }}
              >
                ← HUB
              </button>
            )}
            <SectionRail current={currentSection} onJump={goToSection} />
          </>
        )}

        <DiagonalDivider />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <XPMeter xp={xp} level={level} />
          <StreakBadge streak={streak} />
          {onMap && (
            <IconButton title="World Map" onClick={onMap}>
              <Compass size={15} />
            </IconButton>
          )}
          <IconButton title={soundEnabled ? "Sound on" : "Sound off"} onClick={toggleSound}>
            {soundEnabled ? <Speaker size={14} /> : <SpeakerOff size={14} />}
          </IconButton>
          <UserMenu
            onLogout={onLogout ?? (() => {})}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout ?? (() => {})}
      />
    </header>
  );
}
