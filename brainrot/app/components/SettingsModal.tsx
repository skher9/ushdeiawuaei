"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useXP } from "@/lib/xpContext";
import { Close, Check, Shield, Lock, Bolt, Flame, Speaker, SpeakerOff, Star, Target } from "@/components/Glyphs";

type Tab = "profile" | "security" | "preferences";

function Field({
  label, value, onChange, type = "text", placeholder, disabled = false,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const filled = !!value;
  const raised = focus || filled || disabled;

  return (
    <div style={{ position: "relative" }}>
      <label style={{
        position: "absolute",
        left: 14, top: raised ? -8 : 14,
        fontSize: raised ? 10 : 14,
        fontFamily: raised ? "var(--font-mono)" : "var(--font-tac)",
        letterSpacing: raised ? "0.2em" : "0.04em",
        color: disabled ? "rgba(232,244,255,0.25)" : focus ? "#00e5ff" : filled ? "rgba(232,244,255,0.55)" : "rgba(232,244,255,0.4)",
        background: raised ? "rgba(11,14,31,1)" : "transparent",
        padding: raised ? "0 6px" : 0,
        pointerEvents: "none",
        transition: "all 0.2s cubic-bezier(.16,1,.3,1)",
        textTransform: "uppercase", zIndex: 1,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        disabled={disabled}
        placeholder={focus ? placeholder : ""}
        style={{
          width: "100%", padding: "13px 14px",
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(0,229,255,0.03)",
          border: "1px solid " + (disabled ? "rgba(255,255,255,0.06)" : focus ? "rgba(0,229,255,0.6)" : "rgba(0,229,255,0.14)"),
          borderRadius: 8,
          outline: "none",
          color: disabled ? "rgba(232,244,255,0.35)" : "#e8f4ff",
          fontFamily: "var(--font-tac)",
          fontSize: 15,
          letterSpacing: "0.01em",
          boxShadow: focus ? "0 0 0 3px rgba(0,229,255,0.1)" : "none",
          transition: "all 0.2s",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub?: string }) {
  return (
    <div
      onClick={onChange}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      <div>
        <div style={{ fontSize: 14, color: "#e8f4ff", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(232,244,255,0.4)", marginTop: 2, letterSpacing: "0.1em" }}>{sub}</div>}
      </div>
      <div style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.06)",
        border: "1px solid " + (checked ? "rgba(0,229,255,0.6)" : "rgba(255,255,255,0.1)"),
        position: "relative", flexShrink: 0,
        transition: "all 0.2s",
      }}>
        <div style={{
          position: "absolute", top: 2,
          left: checked ? 20 : 2,
          width: 16, height: 16,
          background: checked ? "#00e5ff" : "rgba(255,255,255,0.3)",
          borderRadius: "50%",
          transition: "left 0.2s, background 0.2s",
          boxShadow: checked ? "0 0 8px rgba(0,229,255,0.6)" : "none",
        }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 18px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(232,244,255,0.45)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: accent ?? "#e8f4ff", textShadow: accent ? `0 0 10px ${accent}60` : "none" }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid rgba(184,247,255,0.3)", borderTopColor: "#b8f7ff",
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }} />
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsModal({ open, onClose, onLogout }: Props) {
  const supabase = createClient();
  const { xp, streak, bestAccuracy, soundEnabled, toggleSound, level } = useXP();

  const [tab, setTab] = useState<Tab>("profile");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [provider, setProvider] = useState("email");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const close = useCallback(onClose, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (!open) { setMsg(null); setNewPass(""); setConfirmPass(""); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setDisplayName(data.user.user_metadata?.display_name ?? data.user.user_metadata?.full_name ?? "");
        setProvider(data.user.app_metadata?.provider ?? "email");
      }
    });
  }, [open]);

  const handlePasswordChange = async () => {
    setMsg(null);
    if (newPass.length < 8) { setMsg({ type: "error", text: "Password must be at least 8 characters." }); return; }
    if (newPass !== confirmPass) { setMsg({ type: "error", text: "Passwords don't match." }); return; }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassLoading(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Password updated." });
      setNewPass(""); setConfirmPass("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const isOAuth = provider !== "email";
  const totalXP = xp;
  const accuracy = bestAccuracy > 0 ? `${Math.round(bestAccuracy)}%` : "—";

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <Shield size={14} /> },
    { id: "security", label: "Security", icon: <Lock size={14} /> },
    { id: "preferences", label: "Preferences", icon: <Star size={14} /> },
  ];

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(6,8,20,0.88)", backdropFilter: "blur(20px)",
        padding: 20,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 760,
          background: "rgba(11,14,31,0.98)",
          border: "1px solid rgba(0,229,255,0.25)",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 30px 80px -20px rgba(0,229,255,0.2), 0 20px 60px rgba(0,0,0,0.7)",
          display: "grid", gridTemplateColumns: "200px 1fr",
          minHeight: 500,
        }}
      >
        {/* Left sidebar */}
        <div style={{
          padding: "28px 16px",
          background: "rgba(6,8,20,0.6)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", color: "rgba(0,229,255,0.6)", marginBottom: 16, paddingLeft: 8 }}>
            ◇ SETTINGS
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
                background: tab === t.id ? "rgba(0,229,255,0.08)" : "transparent",
                border: "1px solid " + (tab === t.id ? "rgba(0,229,255,0.3)" : "transparent"),
                cursor: "pointer",
                color: tab === t.id ? "#00e5ff" : "rgba(232,244,255,0.5)",
                fontFamily: "var(--font-tac)", fontSize: 13, fontWeight: 500,
                textAlign: "left", width: "100%",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ opacity: 0.8 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Sign out */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
              color: "rgba(255,100,100,0.6)",
              fontFamily: "var(--font-tac)", fontSize: 13,
              textAlign: "left", width: "100%",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,46,147,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,46,147,0.2)";
              e.currentTarget.style.color = "#ff9ac7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = "rgba(255,100,100,0.6)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>

        {/* Right content */}
        <div style={{ padding: "28px 32px", overflowY: "auto", position: "relative" }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, cursor: "pointer", color: "rgba(232,244,255,0.6)",
            }}
          >
            <Close size={14} />
          </button>

          <AnimatePresence mode="wait">
            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#e8f4ff", marginBottom: 6, fontWeight: 700 }}>Profile</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)", marginBottom: 28 }}>
                  ACCOUNT INFORMATION
                </p>

                {/* Avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: "16px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(167,139,250,0.2))",
                    border: "2px solid rgba(0,229,255,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                    color: "#00e5ff",
                  }}>
                    {email ? email[0].toUpperCase() : "?"}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-tac)", fontSize: 15, color: "#e8f4ff", fontWeight: 600, marginBottom: 4 }}>
                      {displayName || email.split("@")[0] || "Unknown"}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)" }}>
                      {level} · {provider === "google" ? "GOOGLE AUTH" : provider === "email" ? "EMAIL AUTH" : provider.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Email" value={email} disabled />
                  <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="your handle" />
                </div>
              </motion.div>
            )}

            {/* ── SECURITY ── */}
            {tab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#e8f4ff", marginBottom: 6, fontWeight: 700 }}>Security</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)", marginBottom: 28 }}>
                  PASSWORD & ACCESS
                </p>

                {isOAuth ? (
                  <div style={{
                    padding: "18px 20px",
                    background: "rgba(0,229,255,0.04)",
                    border: "1px solid rgba(0,229,255,0.18)",
                    borderRadius: 12,
                    marginBottom: 20,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Shield size={14} color="#00e5ff" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "#00e5ff" }}>
                        {provider.toUpperCase()} AUTHENTICATION ACTIVE
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(232,244,255,0.55)", lineHeight: 1.5 }}>
                      You signed in with {provider.charAt(0).toUpperCase() + provider.slice(1)}. Password management is handled by your provider — no separate password is set.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(232,244,255,0.4)", marginBottom: 16 }}>
                      CHANGE PASSWORD
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                      <Field label="New password" type="password" value={newPass} onChange={setNewPass} placeholder="8+ characters" />
                      <Field label="Confirm password" type="password" value={confirmPass} onChange={setConfirmPass} placeholder="repeat new password" />
                    </div>

                    {msg && (
                      <div style={{
                        marginBottom: 16, padding: "10px 14px",
                        background: msg.type === "error" ? "rgba(255,46,147,0.08)" : "rgba(0,229,255,0.08)",
                        border: `1px solid ${msg.type === "error" ? "rgba(255,46,147,0.3)" : "rgba(0,229,255,0.3)"}`,
                        borderRadius: 8, fontSize: 13,
                        color: msg.type === "error" ? "#ff9ac7" : "#00e5ff",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        {msg.type === "success" && <Check size={12} color="#00e5ff" />}
                        {msg.text}
                      </div>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      disabled={passLoading}
                      className="btn btn-violet"
                      style={{ padding: "12px 24px", fontSize: 13, justifyContent: "center", opacity: passLoading ? 0.6 : 1 }}
                    >
                      {passLoading ? <Spinner /> : <Lock size={13} color="#b8f7ff" />}
                      {passLoading ? "Updating..." : "Update password"}
                    </button>
                  </>
                )}

                <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,100,100,0.5)", marginBottom: 14 }}>
                    DANGER ZONE
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 16px",
                      background: "rgba(255,46,147,0.04)", border: "1px solid rgba(255,46,147,0.2)",
                      borderRadius: 8, cursor: "pointer",
                      fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em",
                      color: "rgba(255,154,199,0.8)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,46,147,0.1)";
                      e.currentTarget.style.borderColor = "rgba(255,46,147,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,46,147,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,46,147,0.2)";
                    }}
                  >
                    Sign out of all sessions
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── PREFERENCES ── */}
            {tab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#e8f4ff", marginBottom: 6, fontWeight: 700 }}>Preferences</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(232,244,255,0.4)", marginBottom: 28 }}>
                  AUDIO & DISPLAY
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  <Toggle
                    checked={soundEnabled}
                    onChange={toggleSound}
                    label="Sound effects"
                    sub={soundEnabled ? "ENABLED — audio cues active" : "DISABLED — silent mode"}
                  />
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", color: "rgba(232,244,255,0.4)", marginBottom: 14 }}>
                  YOUR STATS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <StatRow label="Total XP" value={totalXP.toLocaleString()} accent="#ffd60a" />
                  <StatRow label="Level" value={level} accent="#a78bfa" />
                  <StatRow label="Day streak" value={streak} accent={streak >= 7 ? "#ffd60a" : "#fb7185"} />
                  <StatRow label="Best accuracy" value={accuracy} accent="#00e5ff" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
