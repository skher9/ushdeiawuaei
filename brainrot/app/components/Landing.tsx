"use client";

import { useState, useEffect, useRef } from "react";
import { Corners, Magnetic } from "@/components/Effects";
import * as Glyphs from "@/components/Glyphs";

/* ── Binary search steps for hero animation ─────────────── */
interface HeroStep {
  array: number[];
  target: number;
  left: number;
  right: number;
  mid: number | null;
  eliminated: number[];
  description: string;
  found: boolean;
}

const HERO_ARR = [11, 22, 34, 45, 57, 64, 78, 90];
const HERO_TARGET = 64;

const HERO_STEPS: HeroStep[] = [
  { array: HERO_ARR, target: HERO_TARGET, left: 0, right: 7, mid: null, eliminated: [], description: "Searching for 64 in a sorted array of 8 elements.", found: false },
  { array: HERO_ARR, target: HERO_TARGET, left: 0, right: 7, mid: 3, eliminated: [], description: "mid=3, arr[3]=45. Target 64 > 45 — eliminate left half.", found: false },
  { array: HERO_ARR, target: HERO_TARGET, left: 4, right: 7, mid: 5, eliminated: [0,1,2,3], description: "mid=5, arr[5]=64 = target. Found in 2 steps, not 6.", found: true },
];

/* ── Brand mark ──────────────────────────────────────────── */
function BrandMark() {
  return (
    <div style={{
      width: 38, height: 38,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(0,229,255,0.05))",
      border: "1px solid rgba(0,229,255,0.6)",
      borderRadius: 8, position: "relative",
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
        <path d="M4 12 L12 4 L20 12 L12 20 Z" />
        <circle cx="12" cy="12" r="3" fill="#ffd60a" stroke="none" />
      </svg>
      <span className="pulse-ring" style={{ inset: -3, borderColor: "rgba(0,229,255,0.5)" } as React.CSSProperties} />
    </div>
  );
}

/* ── Nav ─────────────────────────────────────────────────── */
function LandingNav({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      padding: scrolled ? "10px 0" : "16px 0",
      background: scrolled
        ? "linear-gradient(180deg, rgba(6,8,20,0.92), rgba(6,8,20,0.78))"
        : "linear-gradient(180deg, rgba(6,8,20,0.4), transparent)",
      borderBottom: scrolled ? "1px solid rgba(0,229,255,0.12)" : "1px solid transparent",
      backdropFilter: scrolled ? "blur(18px)" : "none",
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", gap: 24 }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <BrandMark />
          <div>
            <div className="display" style={{ fontSize: 17, fontWeight: 800, color: "#e8f4ff", letterSpacing: "0.03em", lineHeight: 1 }}>BRAINROT</div>
            <div className="mono" style={{ fontSize: 8.5, letterSpacing: "0.25em", color: "#00e5ff", lineHeight: 1, marginTop: 2 }}>ACADEMY · v.7</div>
          </div>
        </a>

        <nav style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4 }}>
          {[
            { label: "Stages", href: "#stages" },
            { label: "Realms", href: "#preview" },
            { label: "Manifesto", href: "#about" },
            { label: "Initiates", href: "#testimonials" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="tac" style={{
              padding: "8px 14px", fontSize: 13, fontWeight: 500, letterSpacing: "0.05em",
              color: "rgba(232,244,255,0.7)", textTransform: "uppercase", textDecoration: "none",
              borderRadius: 6, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.background = "rgba(0,229,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(232,244,255,0.7)"; e.currentTarget.style.background = "transparent"; }}
            >{l.label}</a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onOpenAuth("login")} className="tac" style={{
            padding: "9px 16px", background: "transparent",
            border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8,
            color: "rgba(232,244,255,0.85)", fontSize: 13, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.6)"; e.currentTarget.style.color = "#00e5ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; e.currentTarget.style.color = "rgba(232,244,255,0.85)"; }}
          >Sign in</button>
          <Magnetic strength={0.2}>
            <button onClick={() => onOpenAuth("signup")} className="btn btn-primary" style={{ padding: "9px 16px", fontSize: 13 }}>
              Forge account
              <Glyphs.ArrowRight size={12} color="#fff5b0" />
            </button>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────── */
function Hero({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1 >= HERO_STEPS.length ? 0 : p + 1)), 1400);
    return () => clearInterval(t);
  }, []);

  const step = HERO_STEPS[idx];

  return (
    <section style={{
      minHeight: "100vh", paddingTop: 140, paddingBottom: 80,
      paddingLeft: 28, paddingRight: 28,
      maxWidth: 1280, margin: "0 auto",
      display: "grid", gridTemplateColumns: "1.05fr 0.95fr",
      gap: 64, alignItems: "center",
    }}>
      {/* Left: text */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 11px",
            background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 999,
          }}>
            <Glyphs.Live size={6} color="#b6ff3c" />
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "#b6ff3c" }}>1,247 INITIATES ONLINE</span>
          </span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(232,244,255,0.5)" }}>v.7 · LIVE NOW</span>
        </div>

        <h1 className="display" style={{
          fontSize: "clamp(48px, 6.5vw, 88px)",
          lineHeight: 0.98, letterSpacing: "0.005em",
          color: "#e8f4ff", marginBottom: 24, fontWeight: 800,
          textShadow: "0 0 60px rgba(0,229,255,0.25)",
        }}>
          COMPUTER SCIENCE,<br />
          <span style={{
            background: "linear-gradient(120deg, #ffd60a 10%, #00e5ff 60%, #ff2e93 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(0,229,255,0.4))",
          }}>FELT IN THE FINGERS.</span>
        </h1>

        <p className="tac" style={{ fontSize: 20, lineHeight: 1.5, color: "rgba(232,244,255,0.75)", maxWidth: 580, marginBottom: 36 }}>
          DSA patterns. System design. Debugging. Distributed systems. Networks. AI.
          Brainrot drops you into six stages of pure pattern recognition — across every
          concept that runs the modern stack.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
          <Magnetic strength={0.22}>
            <button onClick={() => onOpenAuth("signup")} className="btn btn-primary chrome-edge" style={{ padding: "16px 28px", fontSize: 14 }}>
              <Glyphs.Play size={12} color="#fff5b0" />
              Start free
              <Glyphs.ArrowRight size={14} color="#fff5b0" />
            </button>
          </Magnetic>
          <Magnetic strength={0.18}>
            <button onClick={() => onOpenAuth("login")} className="btn" style={{ padding: "16px 24px", fontSize: 14 }}>
              <Glyphs.Wave size={14} />
              I have an account
            </button>
          </Magnetic>
        </div>

        <div className="tac" style={{ display: "flex", alignItems: "center", gap: 22, color: "rgba(232,244,255,0.55)", fontSize: 13 }}>
          {[
            "No card, no email tax",
            "~3 min to first search",
            "9 disciplines, 80+ topics",
          ].map((text, i, arr) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Glyphs.Check size={12} color="#b6ff3c" /> {text}
              </span>
              {i < arr.length - 1 && <span style={{ width: 1, height: 14, background: "rgba(0,229,255,0.2)" }} />}
            </span>
          ))}
        </div>
      </div>

      {/* Right: live demo card */}
      <div style={{ position: "relative" }}>
        <Corners color="rgba(0,229,255,0.6)" size={16} thickness={1.4} />
        <div style={{
          position: "relative", padding: "26px 30px 22px",
          background: "linear-gradient(180deg, rgba(0,229,255,0.04), transparent), rgba(11,14,31,0.65)",
          border: "1px solid rgba(0,229,255,0.18)", borderRadius: 16, overflow: "hidden",
          backdropFilter: "blur(12px)", boxShadow: "0 30px 80px -20px rgba(0,229,255,0.3)",
        }}>
          {/* Grid bg */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 85%)",
          } as React.CSSProperties} />

          {/* Window chrome */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {["#ff3d3d", "#ffd60a", "#b6ff3c"].map((c) => (
                <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}80` }} />
              ))}
              <span className="mono" style={{ marginLeft: 8, fontSize: 10, letterSpacing: "0.18em", color: "#00e5ff" }}>BINARY.SEARCH(8)</span>
            </div>
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)" }}>STAGE 01 · WATCH</span>
          </div>

          {/* Binary search blocks */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, height: 220, justifyContent: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              {step.array.map((val, i) => {
                const isElim = step.eliminated.includes(i);
                const isMid = step.mid === i;
                const isFound = isMid && step.found;
                const inRange = i >= step.left && i <= step.right && !isElim;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 42, height: 44,
                      background: isFound ? "rgba(182,255,60,0.18)"
                        : isMid ? "rgba(255,214,10,0.15)"
                        : inRange ? "rgba(0,229,255,0.08)"
                        : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${isFound ? "#b6ff3c" : isMid ? "#ffd60a" : inRange ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: isElim ? 0.2 : 1,
                      transition: "all 0.4s",
                      boxShadow: isFound ? "0 0 14px rgba(182,255,60,0.4)" : isMid ? "0 0 14px rgba(255,214,10,0.3)" : "none",
                    }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: isFound ? "#b6ff3c" : isMid ? "#ffd60a" : "rgba(232,244,255,0.7)" }}>{val}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 8, color: isFound ? "#b6ff3c" : isMid ? "#ffd60a" : i === step.left && inRange ? "#67e8f9" : i === step.right && inRange ? "#67e8f9" : "transparent" }}>
                      {isFound ? "✓" : isMid ? "M" : i === step.left && inRange ? "L" : i === step.right && inRange ? "R" : "."}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mono" style={{ textAlign: "center", fontSize: 10, color: "rgba(232,244,255,0.3)", letterSpacing: "0.1em" }}>
              TARGET: <span style={{ color: "#ffd60a" }}>{step.target}</span>
              {step.mid !== null && (
                <> &nbsp;·&nbsp; arr[{step.mid}] = <span style={{ color: step.found ? "#b6ff3c" : "#ffd60a" }}>{step.array[step.mid]}</span></>
              )}
            </div>
          </div>

          {/* Caption */}
          <div style={{
            position: "relative", padding: "10px 12px",
            background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 8,
            fontSize: 13, color: "rgba(232,244,255,0.78)", fontStyle: "italic", lineHeight: 1.5,
          }}>
            <span className="mono" style={{ color: "#00e5ff", fontSize: 9, letterSpacing: "0.2em", marginRight: 8, fontStyle: "normal" }}>
              STEP {String(idx + 1).padStart(2, "0")}
            </span>
            {step.description}
          </div>

          {/* Floating badge */}
          <div style={{
            position: "absolute", top: -16, right: -16,
            padding: "10px 14px",
            background: "rgba(11,14,31,0.95)", border: "1px solid rgba(255,214,10,0.5)", borderRadius: 10,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 24px -8px rgba(255,214,10,0.5)",
            animation: "float-y 3s ease-in-out infinite", zIndex: 2,
          }}>
            <Glyphs.Bolt size={14} color="#ffd60a" />
            <div>
              <div className="mono" style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(232,244,255,0.5)" }}>BONUS</div>
              <div className="mono" style={{ fontSize: 13, color: "#ffd60a", fontWeight: 700 }}>+50 XP</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Social proof stats ───────────────────────────────────── */
function SocialProof() {
  const stats = [
    { value: "1,247", label: "ONLINE NOW", accent: "#b6ff3c" },
    { value: "80+", label: "TOPICS", accent: "#00e5ff" },
    { value: "9", label: "DISCIPLINES", accent: "#ffd60a" },
    { value: "6", label: "STAGES", accent: "#ff2e93" },
    { value: "12 MIN", label: "AVG SESSION", accent: "#b6ff3c" },
  ];

  return (
    <div style={{ borderTop: "1px solid rgba(0,229,255,0.08)", borderBottom: "1px solid rgba(0,229,255,0.08)", background: "rgba(0,229,255,0.02)", padding: "28px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 32, color: s.accent, textShadow: `0 0 20px ${s.accent}80` }}>{s.value}</div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "rgba(232,244,255,0.4)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stages grid ─────────────────────────────────────────── */
const STAGES = [
  { code: "01", title: "WATCH", lede: "See the pattern play out in real time. Zero pressure.", icon: "Play", accent: "#00e5ff" },
  { code: "02", title: "DRIVE", lede: "Take the wheel. Step the algorithm one tap at a time.", icon: "Target", accent: "#ffd60a" },
  { code: "03", title: "RACE", lede: "Beat the clock. Sort under pressure.", icon: "Bolt", accent: "#b6ff3c" },
  { code: "04", title: "DEBUG", lede: "Spot the off-by-one. Smallest bug, largest payoff.", icon: "Shield", accent: "#ff2e93" },
  { code: "05", title: "BOSS", lede: "Final stand: 12 elements, two minutes, no mercy.", icon: "Crown", accent: "#ffd60a" },
  { code: "06", title: "CONTEXT", lede: "Where this pattern lives in production code, today.", icon: "Circuit", accent: "#00e5ff" },
];

function StagesGrid() {
  return (
    <section id="stages" style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 28px" }}>
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#00e5ff", marginBottom: 12 }}>◆ SIX STAGES · ONE PATTERN</div>
        <h2 className="display" style={{ fontSize: "clamp(32px, 4vw, 56px)", color: "#e8f4ff", lineHeight: 1.05 }}>THE PROGRESSION</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {STAGES.map((s) => {
          const Icon = Glyphs[s.icon as keyof typeof Glyphs] as React.FC<{ size?: number; color?: string }>;
          return (
            <div key={s.code} style={{ position: "relative" }}>
              <Corners color={`${s.accent}60`} size={12} thickness={1} />
              <div style={{
                padding: "24px 22px",
                background: "linear-gradient(135deg, rgba(0,229,255,0.04), rgba(0,0,0,0)), rgba(11,14,31,0.6)",
                border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${s.accent}40`; (e.currentTarget as HTMLDivElement).style.background = `linear-gradient(135deg, ${s.accent}08, rgba(0,0,0,0)), rgba(11,14,31,0.8)`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.1)"; (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(135deg, rgba(0,229,255,0.04), rgba(0,0,0,0)), rgba(11,14,31,0.6)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${s.accent}14`, border: `1px solid ${s.accent}40`, borderRadius: 8,
                  }}>
                    <Icon size={18} color={s.accent} />
                  </div>
                  <div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: s.accent }}>STAGE {s.code}</div>
                    <div className="display" style={{ fontSize: 15, color: "#e8f4ff", letterSpacing: "0.05em" }}>{s.title}</div>
                  </div>
                </div>
                <p className="tac" style={{ fontSize: 14, color: "rgba(232,244,255,0.65)", lineHeight: 1.55 }}>{s.lede}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Disciplines grid ────────────────────────────────────── */
const DISCIPLINES = [
  { title: "DSA", desc: "Sorting, trees, graphs, DP — every pattern, zero padding.", icon: "Circuit", accent: "#00e5ff" },
  { title: "Systems Design", desc: "Scale services, pick databases, draw the right arrows.", icon: "Web", accent: "#ffd60a" },
  { title: "Debugging", desc: "Read stack traces. Trace state. Feel the off-by-one.", icon: "Shield", accent: "#ff2e93" },
  { title: "Distributed Systems", desc: "Consensus, replication, failure — in your hands.", icon: "Target", accent: "#b6ff3c" },
  { title: "Networks", desc: "TCP, DNS, HTTP — packets you can actually feel.", icon: "Wave", accent: "#00e5ff" },
  { title: "AI / ML", desc: "Gradient descent, attention, embeddings — live.", icon: "Sparkle", accent: "#ffd60a" },
  { title: "Operating Systems", desc: "Scheduling, memory, concurrency — no black box.", icon: "Bolt", accent: "#ff2e93" },
  { title: "Databases", desc: "Indexes, transactions, query plans — every trick.", icon: "Crown", accent: "#b6ff3c" },
  { title: "Security", desc: "Auth flows, crypto primitives, threat models.", icon: "Lock", accent: "#00e5ff" },
];

function DisciplinesGrid() {
  return (
    <section id="preview" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 80px" }}>
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#ffd60a", marginBottom: 12 }}>◇ NINE DISCIPLINES</div>
        <h2 className="display" style={{ fontSize: "clamp(32px, 4vw, 56px)", color: "#e8f4ff", lineHeight: 1.05 }}>EVERY CONCEPT THAT RUNS THE STACK</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {DISCIPLINES.map((d) => {
          const Icon = Glyphs[d.icon as keyof typeof Glyphs] as React.FC<{ size?: number; color?: string }>;
          return (
            <div key={d.title} style={{
              padding: "18px 20px",
              background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.08)", borderRadius: 10,
              display: "flex", gap: 14, alignItems: "flex-start",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${d.accent}30`; (e.currentTarget as HTMLDivElement).style.background = `${d.accent}06`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.08)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.03)"; }}
            >
              <div style={{ flexShrink: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: `${d.accent}12`, borderRadius: 7 }}>
                <Icon size={14} color={d.accent} />
              </div>
              <div>
                <div className="display" style={{ fontSize: 12, color: d.accent, letterSpacing: "0.1em", marginBottom: 4 }}>{d.title}</div>
                <p className="tac" style={{ fontSize: 13, color: "rgba(232,244,255,0.6)", lineHeight: 1.5 }}>{d.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Testimonials ────────────────────────────────────────── */
const TESTIMONIALS = [
  { quote: "I never thought I'd feel binary search. Now I see the midpoint in everything.", handle: "OBI.K", level: "LEVEL 12", accent: "#00e5ff" },
  { quote: "Three minutes in I was already running debug on my own instincts.", handle: "LYRA.V", level: "LEVEL 8", accent: "#ffd60a" },
  { quote: "The boss fight for trees nearly broke me. I came back. I won. I'm different now.", handle: "DAYO.W", level: "LEVEL 15", accent: "#ff2e93" },
];

function Testimonials() {
  return (
    <section id="testimonials" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 80px" }}>
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#ff2e93", marginBottom: 12 }}>◆ INITIATES SPEAK</div>
        <h2 className="display" style={{ fontSize: "clamp(28px, 3vw, 48px)", color: "#e8f4ff", lineHeight: 1.05 }}>FROM THE REALM</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {TESTIMONIALS.map((t) => (
          <div key={t.handle} style={{ position: "relative" }}>
            <Corners color={`${t.accent}50`} size={10} thickness={1} />
            <div style={{ padding: "22px 22px 18px", background: "rgba(11,14,31,0.7)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {[0,1,2,3,4].map((i) => <Glyphs.Star key={i} size={10} color="#ffd60a" />)}
              </div>
              <p className="tac" style={{ fontSize: 15, color: "rgba(232,244,255,0.8)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 16 }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${t.accent}30, ${t.accent}10)`, border: `1px solid ${t.accent}60`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="display" style={{ fontSize: 10, color: t.accent }}>{t.handle[0]}</span>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: t.accent }}>{t.handle}</div>
                  <div className="mono" style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)" }}>{t.level}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── About / manifesto ───────────────────────────────────── */
function AboutSection({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  return (
    <section id="about" style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 100px", textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#b6ff3c", marginBottom: 16 }}>◇ THE MANIFESTO</div>
      <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 52px)", color: "#e8f4ff", lineHeight: 1.1, marginBottom: 24 }}>
        NO TUTORIAL MAZE.<br />NO 40-HOUR INTRO.
      </h2>
      <p className="tac" style={{ fontSize: 19, color: "rgba(232,244,255,0.7)", lineHeight: 1.65, marginBottom: 16, maxWidth: 680, margin: "0 auto 16px" }}>
        CS education has a texture problem. Lectures feel like watching someone drive.
        Brainrot puts you in the driver&apos;s seat — six stages, nine disciplines, one pattern you&apos;ll
        feel in your fingers before the session ends.
      </p>
      <p className="tac" style={{ fontSize: 19, color: "rgba(232,244,255,0.7)", lineHeight: 1.65, marginBottom: 40, maxWidth: 680, margin: "0 auto 40px" }}>
        We time everything. We reward streaks. We end sessions with a boss fight.
        Because the only way to know a pattern is to have survived it.
      </p>
      <Magnetic strength={0.18}>
        <button onClick={() => onOpenAuth("signup")} className="btn btn-violet" style={{ padding: "14px 28px", fontSize: 14 }}>
          <Glyphs.Play size={12} color="#b8f7ff" />
          Enter the realm
          <Glyphs.ArrowRight size={14} color="#b8f7ff" />
        </button>
      </Magnetic>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────── */
function FinalCTA({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  return (
    <section style={{ padding: "80px 28px 100px", background: "linear-gradient(180deg, rgba(0,229,255,0.03), transparent)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <Corners color="rgba(0,229,255,0.4)" size={16} thickness={1.5} />
        <div style={{ padding: "60px 48px", background: "rgba(11,14,31,0.8)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#ffd60a", marginBottom: 16 }}>◆ CLAIM YOUR SEAT</div>
          <h2 className="display" style={{ fontSize: "clamp(32px, 5vw, 64px)", color: "#e8f4ff", lineHeight: 1.05, marginBottom: 20 }}>
            THREE MINUTES<br />
            <span style={{ background: "linear-gradient(120deg, #ffd60a, #00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TO YOUR FIRST WIN.
            </span>
          </h2>
          <p className="tac" style={{ fontSize: 17, color: "rgba(232,244,255,0.7)", marginBottom: 36, lineHeight: 1.6 }}>
            No card required. No tutorial maze. Just pattern recognition, from the first click.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Magnetic strength={0.22}>
              <button onClick={() => onOpenAuth("signup")} className="btn btn-primary chrome-edge" style={{ padding: "16px 32px", fontSize: 15 }}>
                <Glyphs.Play size={14} color="#fff5b0" />
                Forge your account
                <Glyphs.ArrowRight size={14} color="#fff5b0" />
              </button>
            </Magnetic>
            <Magnetic strength={0.18}>
              <button onClick={() => onOpenAuth("login")} className="btn" style={{ padding: "16px 24px", fontSize: 15 }}>
                <Glyphs.Wave size={14} />
                I already have one
              </button>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(0,229,255,0.08)", padding: "32px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark />
          <div>
            <div className="display" style={{ fontSize: 14, color: "#e8f4ff" }}>BRAINROT</div>
            <div className="mono" style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(0,229,255,0.6)" }}>ACADEMY · v.7</div>
          </div>
        </div>
        <p className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(232,244,255,0.3)" }}>
          © 2026 BRAINROT ACADEMY · FEEL THE PATTERN
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {["Terms", "Privacy", "Discord"].map((l) => (
            <a key={l} href="#" className="mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(232,244,255,0.4)", textDecoration: "none", textTransform: "uppercase", transition: "color 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(232,244,255,0.4)"; }}
            >{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Landing root ────────────────────────────────────────── */
export default function Landing({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  return (
    <div style={{ position: "relative", zIndex: 3, overflowX: "hidden" }}>
      <LandingNav onOpenAuth={onOpenAuth} />
      <Hero onOpenAuth={onOpenAuth} />
      <SocialProof />
      <StagesGrid />
      <DisciplinesGrid />
      <Testimonials />
      <AboutSection onOpenAuth={onOpenAuth} />
      <FinalCTA onOpenAuth={onOpenAuth} />
      <Footer />
    </div>
  );
}
