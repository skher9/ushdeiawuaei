"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onLogout: () => void;
  onSettings: () => void;
}

export default function UserMenu({ onLogout, onSettings }: Props) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    onLogout();
  };

  const initials = email ? email[0].toUpperCase() : "?";
  const shortEmail = email.length > 22 ? email.slice(0, 20) + "…" : email;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Account"
        style={{
          width: 32, height: 32, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: open
            ? "linear-gradient(135deg, rgba(0,229,255,0.35), rgba(167,139,250,0.25))"
            : "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(167,139,250,0.15))",
          border: "1.5px solid " + (open ? "rgba(0,229,255,0.7)" : "rgba(0,229,255,0.35)"),
          cursor: "pointer",
          fontFamily: "var(--font-display)",
          fontSize: 13, fontWeight: 700,
          color: open ? "#00e5ff" : "rgba(232,244,255,0.85)",
          boxShadow: open ? "0 0 14px rgba(0,229,255,0.35)" : "none",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.6)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(0,229,255,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              minWidth: 210,
              background: "rgba(11,14,31,0.98)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              zIndex: 200,
            }}
          >
            {/* Email header */}
            <div style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(0,229,255,0.3), rgba(167,139,250,0.2))",
                  border: "1.5px solid rgba(0,229,255,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
                  color: "#00e5ff",
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.18em",
                    color: "rgba(0,229,255,0.6)", marginBottom: 2,
                  }}>SIGNED IN AS</div>
                  <div style={{
                    fontSize: 12, color: "#e8f4ff", fontFamily: "var(--font-tac)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {shortEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "6px" }}>
              <MenuItem
                icon={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2 13.5c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                }
                label="Settings"
                onClick={() => { setOpen(false); onSettings(); }}
              />
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
              <MenuItem
                icon={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
                label="Sign out"
                onClick={handleLogout}
                danger
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 8,
        background: "transparent", border: "none",
        cursor: "pointer",
        color: danger ? "rgba(255,154,199,0.75)" : "rgba(232,244,255,0.75)",
        fontFamily: "var(--font-tac)", fontSize: 13,
        textAlign: "left",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(255,46,147,0.08)" : "rgba(255,255,255,0.05)";
        e.currentTarget.style.color = danger ? "#ff9ac7" : "#e8f4ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "rgba(255,154,199,0.75)" : "rgba(232,244,255,0.75)";
      }}
    >
      <span style={{ opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}
