"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Corners } from "@/components/Effects";
import * as Glyphs from "@/components/Glyphs";

/* ── Floating-label field ────────────────────────────────── */
function Field({
  label, value, onChange, type = "text", placeholder, icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; icon?: React.ReactNode;
}) {
  const [focus, setFocus] = useState(false);
  const filled = !!value;
  const raised = focus || filled;

  return (
    <div style={{ position: "relative" }}>
      <label style={{
        position: "absolute",
        left: icon ? 36 : 14,
        top: raised ? -8 : 14,
        fontSize: raised ? 10 : 14,
        fontFamily: raised ? "var(--font-mono)" : "var(--font-tac)",
        letterSpacing: raised ? "0.2em" : "0.04em",
        color: focus ? "#00e5ff" : filled ? "rgba(232,244,255,0.55)" : "rgba(232,244,255,0.4)",
        background: raised ? "rgba(11,14,31,1)" : "transparent",
        padding: raised ? "0 6px" : 0,
        pointerEvents: "none",
        transition: "all 0.2s cubic-bezier(.16,1,.3,1)",
        textTransform: "uppercase",
        zIndex: 1,
      }}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(0,229,255,0.03)",
        border: "1px solid " + (focus ? "rgba(0,229,255,0.6)" : "rgba(0,229,255,0.14)"),
        borderRadius: 8,
        transition: "all 0.2s",
        boxShadow: focus ? "0 0 0 3px rgba(0,229,255,0.1)" : "none",
      }}>
        {icon && (
          <span style={{ padding: "12px 0 12px 12px", color: focus ? "#00e5ff" : "rgba(232,244,255,0.4)", display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={focus ? placeholder : ""}
          style={{
            width: "100%",
            padding: "13px 14px",
            paddingLeft: icon ? 10 : 14,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e8f4ff",
            fontFamily: "var(--font-tac)",
            fontSize: 15,
            letterSpacing: "0.01em",
          }}
        />
      </div>
    </div>
  );
}

/* ── Checkbox ────────────────────────────────────────────── */
function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", color: "rgba(232,244,255,0.7)", fontSize: 13 }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 16, height: 16,
          background: checked ? "rgba(0,229,255,0.2)" : "transparent",
          border: "1px solid " + (checked ? "#00e5ff" : "rgba(0,229,255,0.25)"),
          borderRadius: 3, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {checked && <Glyphs.Check size={10} color="#00e5ff" />}
      </span>
      <span>{label}</span>
    </label>
  );
}

/* ── Social provider button ──────────────────────────────── */
function SocialBtn({ provider, onClick }: { provider: "google" | "discord" | "steam"; onClick: () => void }) {
  const meta = {
    google: { name: "Google", color: "#e8f4ff", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.35 11.1H12v3.18h5.36c-.23 1.4-1.62 4.1-5.36 4.1c-3.23 0-5.86-2.67-5.86-5.96s2.63-5.96 5.86-5.96c1.84 0 3.07.78 3.78 1.46l2.57-2.48C16.69 3.94 14.55 3 12 3C7 3 3 7 3 12s4 9 9 9c5.18 0 8.6-3.64 8.6-8.78c0-.59-.06-1.06-.25-1.62Z"/>
      </svg>
    )},
    discord: { name: "Discord", color: "#5865F2", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02C2.07 9.46 1.32 13.46 1.69 17.41a.1.1 0 0 0 .04.07c1.78 1.31 3.5 2.1 5.2 2.62c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25a.07.07 0 0 1 .07-.01c3.44 1.57 7.16 1.57 10.56 0a.07.07 0 0 1 .08.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.02.06.03.09.02c1.71-.52 3.43-1.31 5.2-2.62a.1.1 0 0 0 .04-.07c.44-4.56-.74-8.53-3.13-12.04c-.01-.01-.02-.02-.04-.03ZM8.52 15c-1.04 0-1.9-.95-1.9-2.12c0-1.17.84-2.12 1.9-2.12c1.07 0 1.92.96 1.9 2.12c0 1.17-.85 2.12-1.9 2.12Zm7 0c-1.04 0-1.9-.95-1.9-2.12c0-1.17.84-2.12 1.9-2.12c1.07 0 1.92.96 1.9 2.12c0 1.17-.84 2.12-1.9 2.12Z"/>
      </svg>
    )},
    steam: { name: "Steam", color: "#e8f4ff", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.98 2C6.62 2 2.25 6.18 2.04 11.48L7.18 13.6c.43-.3.96-.46 1.51-.46l.13.01l2.29-3.31v-.05c0-2.01 1.63-3.65 3.65-3.65c2.01 0 3.65 1.64 3.65 3.65c0 2.02-1.64 3.65-3.65 3.65h-.08l-3.27 2.32c0 .04.01.07.01.11c0 1.51-1.23 2.74-2.74 2.74c-1.33 0-2.45-.96-2.69-2.22L2.41 14.93C3.59 19.05 7.43 22 11.98 22c5.51 0 9.97-4.46 9.97-9.97s-4.46-9.97-9.97-9.97l.03-.06Z"/>
      </svg>
    )},
  }[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
        padding: "12px 8px",
        background: "rgba(0,229,255,0.04)",
        border: "1px solid rgba(0,229,255,0.15)",
        borderRadius: 8, cursor: "pointer",
        color: "rgba(232,244,255,0.7)",
        fontFamily: "var(--font-tac)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
        transition: "all 0.15s",
        flex: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = meta.color + "80";
        e.currentTarget.style.background = meta.color + "15";
        e.currentTarget.style.color = "#e8f4ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(0,229,255,0.15)";
        e.currentTarget.style.background = "rgba(0,229,255,0.04)";
        e.currentTarget.style.color = "rgba(232,244,255,0.7)";
      }}
    >
      {meta.icon}
      <span>{meta.name}</span>
    </button>
  );
}

/* ── Left visual panel ───────────────────────────────────── */
function AuthVisual({ isLogin }: { isLogin: boolean }) {
  return (
    <div style={{
      position: "relative",
      background: `
        radial-gradient(circle at 30% 20%, rgba(0,229,255,0.25), transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255,46,147,0.18), transparent 50%),
        linear-gradient(135deg, #060814 0%, #131732 100%)
      `,
      padding: "44px 38px",
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(0,229,255,0.12)",
      overflow: "hidden",
      minHeight: 540,
    }}>
      {/* Grid bg */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15, pointerEvents: "none" }}>
        <defs>
          <pattern id="auth-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid)" />
      </svg>

      {/* Scanline sweep */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 80,
        background: "linear-gradient(180deg, transparent, rgba(0,229,255,0.08), transparent)",
        animation: "scan 8s linear infinite",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(0,229,255,0.05))",
            border: "1px solid rgba(0,229,255,0.6)", borderRadius: 6,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
              <path d="M4 12 L12 4 L20 12 L12 20 Z" />
              <circle cx="12" cy="12" r="3" fill="#ffd60a" stroke="none" />
            </svg>
          </div>
          <div>
            <div className="display" style={{ fontSize: 18, color: "#e8f4ff", fontWeight: 800, letterSpacing: "0.02em" }}>BRAINROT</div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: "#00e5ff" }}>ACADEMY · v.7</div>
          </div>
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: "#ffd60a", marginBottom: 12 }}>◇ TONIGHT IN THE REALM</div>
        <h3 className="display" style={{ fontSize: 28, color: "#e8f4ff", fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
          {isLogin ? "Your streak waited." : "Three minutes to your first cleared stage."}
        </h3>
        <p className="tac" style={{ fontSize: 15, color: "rgba(232,244,255,0.65)", lineHeight: 1.55, marginBottom: 24 }}>
          {isLogin
            ? "Pick up the daily, hold the combo, ride the streak back up."
            : "No tutorial maze. No 40-hour intro. Six stages, nine disciplines, one pattern you'll feel in your fingers."}
        </p>

        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "ONLINE", value: "1,247", accent: "#b6ff3c" },
            { label: "STAGES", value: "6", accent: "#ffd60a" },
            { label: "ZONES", value: "VI", accent: "#00e5ff" },
            { label: "MIN AVG", value: "12", accent: "#ff2e93" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", background: "rgba(11,14,31,0.6)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 8 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(232,244,255,0.4)" }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: s.accent, textShadow: `0 0 12px ${s.accent}80` }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial footer */}
      <div style={{ marginTop: "auto", position: "relative", zIndex: 1 }}>
        <div style={{ padding: "12px 14px", background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.18)", borderRadius: 10, fontSize: 13, color: "rgba(232,244,255,0.7)", lineHeight: 1.5 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {[0,1,2,3,4].map((i) => <Glyphs.Star key={i} size={10} color="#ffd60a" />)}
          </div>
          &quot;I never thought I&apos;d <em style={{ color: "#00e5ff", fontStyle: "normal" }}>feel</em> a sort algorithm. Now I dream in passes.&quot;
          <div className="mono" style={{ marginTop: 6, fontSize: 10, letterSpacing: "0.2em", color: "#ffd60a" }}>— OBI.K · LEVEL 12</div>
        </div>
      </div>
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid rgba(184,247,255,0.3)", borderTopColor: "#b8f7ff",
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

/* ── Auth modal ──────────────────────────────────────────── */
interface AuthModalProps {
  open: boolean;
  mode: "login" | "signup";
  onClose: () => void;
  onSwitch: (mode: "login" | "signup") => void;
  onAuth: () => void;
}

export default function AuthModal({ open, mode, onClose, onSwitch, onAuth }: AuthModalProps) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(onClose, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Reset form on mode switch
  useEffect(() => { setError(null); setLoading(false); }, [mode]);

  const handleGoogleAuth = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    // Clear any existing session first to prevent session bleeding
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setError("Auth unavailable"); setLoading(false); return; }

    // Clear any existing session before signing in to prevent session bleeding
    await supabase.auth.signOut();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setLoading(false);
    onAuth();
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(6,8,20,0.85)", backdropFilter: "blur(20px)",
        padding: 20,
        animation: "authBgIn 0.3s ease",
      }}
    >
      <style>{`
        @keyframes authBgIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(3000%); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%", maxWidth: 880,
          display: "grid", gridTemplateColumns: "1fr 1fr",
          background: "rgba(11,14,31,0.95)",
          border: "1px solid rgba(0,229,255,0.3)",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 30px 80px -20px rgba(0,229,255,0.4), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          animation: "authIn 0.5s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <Corners color="rgba(0,229,255,0.7)" size={14} thickness={1.2} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 5,
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, cursor: "pointer", color: "rgba(232,244,255,0.7)",
          }}
        >
          <Glyphs.Close size={14} />
        </button>

        <AuthVisual isLogin={isLogin} />

        {/* Form side */}
        <form onSubmit={handleSubmit} style={{
          padding: "44px 38px 32px",
          background: "rgba(11,14,31,0.95)",
          display: "flex", flexDirection: "column",
          minHeight: 540,
        }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.3em", color: "#00e5ff", marginBottom: 14, textTransform: "uppercase" }}>
            ◆ {isLogin ? "RESUME SESSION" : "FORGE ACCOUNT"}
          </div>
          <h2 className="display" style={{ fontSize: 30, lineHeight: 1.1, color: "#e8f4ff", marginBottom: 8, fontWeight: 800 }}>
            {isLogin ? "Sign in" : "Create login"}
          </h2>
          <p className="tac" style={{ fontSize: 15, color: "rgba(232,244,255,0.65)", marginBottom: 24, lineHeight: 1.5 }}>
            {isLogin
              ? "Pick up where the pattern was clicking."
              : "Claim your handle, start a streak, drill every concept that runs the stack."}
          </p>

          {/* Social */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <SocialBtn provider="google" onClick={handleGoogleAuth} />
            <SocialBtn provider="discord" onClick={() => setError("Discord OAuth coming soon.")} />
            <SocialBtn provider="steam" onClick={() => setError("Steam OAuth coming soon.")} />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.18))" }} />
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(232,244,255,0.4)" }}>OR EMAIL</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(0,229,255,0.18), transparent)" }} />
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            {!isLogin && (
              <Field label="Handle" value={name} onChange={setName} placeholder="argent01" icon={<Glyphs.Shield size={14} color="currentColor" />} />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@signal.net" icon={<Glyphs.Sparkle size={14} color="currentColor" />} />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={isLogin ? "your sigil" : "8+ chars"} icon={<Glyphs.Lock size={14} color="currentColor" />} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(255,46,147,0.08)", border: "1px solid rgba(255,46,147,0.3)", borderRadius: 8, fontSize: 13, color: "#ff9ac7" }}>
              {error}
            </div>
          )}

          {/* Remember / agree */}
          <div style={{ marginBottom: 18 }}>
            {isLogin ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Checkbox checked={false} onChange={() => {}} label="Keep me signed in" />
                <button type="button" className="mono" style={{ background: "none", border: "none", color: "#00e5ff", fontSize: 13, letterSpacing: "0.04em", cursor: "pointer", padding: 0 }}>
                  Forgot sigil?
                </button>
              </div>
            ) : (
              <Checkbox checked={agree} onChange={setAgree} label={<>I accept the <a href="#" style={{ color: "#00e5ff" }}>terms</a> and rotting policy.</>} />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!isLogin && !agree)}
            className="btn btn-violet"
            style={{
              width: "100%", padding: "14px 22px", fontSize: 14,
              justifyContent: "center",
              opacity: !isLogin && !agree ? 0.4 : 1,
              cursor: !isLogin && !agree ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <><Spinner /> Authenticating</>
            ) : (
              <>
                {isLogin ? <Glyphs.Play size={12} color="#b8f7ff" /> : <Glyphs.Sparkle size={12} color="#b8f7ff" />}
                {isLogin ? "Sign in" : "Forge & enter"}
                <Glyphs.ArrowRight size={14} color="#b8f7ff" />
              </>
            )}
          </button>

          <div className="tac" style={{ marginTop: 18, textAlign: "center", fontSize: 14, color: "rgba(232,244,255,0.6)" }}>
            {isLogin ? "New to the rot?" : "Already an Initiate?"}{" "}
            <button
              type="button"
              onClick={() => onSwitch(isLogin ? "signup" : "login")}
              className="mono"
              style={{
                background: "none", border: "none", color: "#ffd60a",
                fontSize: 14, fontWeight: 600, letterSpacing: "0.04em",
                textTransform: "uppercase", cursor: "pointer", padding: 0,
              }}
            >
              {isLogin ? "Forge account" : "Sign in"} →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
