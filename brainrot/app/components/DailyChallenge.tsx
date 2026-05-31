"use client";

import { useState, useEffect } from "react";
import { Corners, fireBurst } from "@/components/Effects";
import { Target, Sparkle, Live } from "@/components/Glyphs";

function msToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function TimePart({ v }: { v: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 16, fontWeight: 700, color: "#ebe9e3",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 4,
      padding: "2px 6px",
      minWidth: 28, textAlign: "center",
      letterSpacing: "0.02em",
      display: "inline-block",
    }}>{v}</span>
  );
}

function Stat({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8, letterSpacing: "0.2em", color: "rgba(235,233,227,0.35)",
      }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13, fontWeight: 600,
        color: hi ? "#f6c453" : "rgba(235,233,227,0.85)",
      }}>{value}</span>
    </div>
  );
}

export default function DailyChallenge() {
  const [seconds, setSeconds] = useState(() => Math.floor(msToMidnight() / 1000));

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ position: "relative" }}>
      <Corners color="rgba(246,196,83,0.4)" size={12} thickness={1.2} />
      <div className="chrome-edge" style={{
        position: "relative",
        background: "linear-gradient(135deg, rgba(246,196,83,0.06) 0%, rgba(167,139,250,0.04) 100%), rgba(12,12,20,0.85)",
        border: "1px solid rgba(246,196,83,0.18)",
        borderRadius: 14,
        padding: "22px 26px",
        overflow: "hidden",
      }}>
        {/* Diagonal stripe bg */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          backgroundImage: "repeating-linear-gradient(135deg, rgba(246,196,83,1) 0 2px, transparent 2px 16px)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18,
          position: "relative",
        }}>
          {/* Left: title */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(246,196,83,0.2), rgba(246,196,83,0.05))",
              border: "1px solid rgba(246,196,83,0.4)",
              borderRadius: 8,
              position: "relative",
              flexShrink: 0,
            }}>
              <Target size={22} color="#f6c453" />
              <span style={{
                position: "absolute", inset: -2, borderRadius: 10,
                border: "1px solid rgba(246,196,83,0.4)",
                animation: "pulse-ring 2s ease-out infinite",
              }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9, letterSpacing: "0.22em", color: "#f6c453",
                }}>DAILY CHALLENGE</span>
                <span style={{
                  padding: "1px 6px", borderRadius: 3,
                  background: "rgba(246,196,83,0.15)",
                  border: "1px solid rgba(246,196,83,0.3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 8, letterSpacing: "0.1em",
                  color: "#f6c453",
                }}>2X XP</span>
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: 22, color: "#ebe9e3", letterSpacing: "-0.01em",
                marginBottom: 2, margin: "0 0 2px",
              }}>
                Sort six in under ninety seconds.
              </h3>
              <p style={{
                fontSize: 12, color: "rgba(235,233,227,0.4)",
                letterSpacing: "0.02em", margin: 0,
              }}>
                Beat yesterday&apos;s median by 14% and the streak fires gold.
              </p>
            </div>
          </div>

          {/* Right: timer + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8, letterSpacing: "0.2em", color: "rgba(235,233,227,0.4)",
              }}>RESETS IN</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TimePart v={hh} />
                <span style={{ color: "rgba(235,233,227,0.3)" }}>:</span>
                <TimePart v={mm} />
                <span style={{ color: "rgba(235,233,227,0.3)" }}>:</span>
                <TimePart v={ss} />
              </div>
            </div>
            <button
              onClick={(e) => { fireBurst(e, 10, "XP"); }}
              className="btn-primary"
              style={{ padding: "10px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Sparkle size={12} color="#fff4d6" />
              Accept
            </button>
          </div>
        </div>

        {/* Bottom telemetry strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 18, marginTop: 16, paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}>
          <Stat label="ATTEMPTS" value="2,481" />
          <Stat label="AVG TIME" value="1:42" />
          <Stat label="BEST" value="0:47" hi />
          <Stat label="DROP RATE" value="11%" />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Live size={6} color="#6ee7b7" />
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9, color: "rgba(110,231,183,0.7)", letterSpacing: "0.15em",
            }}>312 RUNNING NOW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
