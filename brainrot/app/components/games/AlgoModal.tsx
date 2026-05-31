"use client";
// AlgoModal — shows algorithm animation + pseudocode
// Opened on game load (auto, 200ms delay) + "LEARN ALGO" button anytime

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ALGO_CONTENT } from "./algoContent";

interface AlgoModalProps {
  open: boolean;
  onClose: () => void;
  mechanic: string;       // key into ALGO_CONTENT
  autoClose?: boolean;    // if true: auto-close after 4s (for intro)
}

export default function AlgoModal({ open, onClose, mechanic, autoClose = false }: AlgoModalProps) {
  const [activeTab, setActiveTab] = useState<"animation" | "pseudocode">("animation");
  const content = ALGO_CONTENT[mechanic] ?? null;

  // Reset tab to animation when modal opens
  useEffect(() => {
    if (open) setActiveTab("animation");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dark overlay — covers game container (absolute, not fixed) */}
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              zIndex: 100,
            }}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "calc(100% - 48px)",
              maxWidth: 520,
              background: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 10,
              overflow: "hidden",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {/* Header row: tabs + close */}
            <div style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #1e1e1e",
              padding: "0 12px",
            }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, flex: 1 }}>
                {(["animation", "pseudocode"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "10px 14px",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
                      cursor: "pointer",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: activeTab === tab ? "#3b82f6" : "#374151",
                      fontFamily: "inherit",
                      marginBottom: -1,
                    }}
                  >
                    {tab === "animation" ? "ANIMATION" : "PSEUDOCODE"}
                  </button>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "#374151",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "4px 6px",
                  fontFamily: "inherit",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content area */}
            <div style={{ padding: "16px" }}>
              {!content ? (
                <div style={{
                  fontSize: 11,
                  color: "#475569",
                  textAlign: "center",
                  padding: "32px 0",
                }}>
                  Animation coming soon
                </div>
              ) : activeTab === "animation" ? (
                <content.Animation />
              ) : (
                <pre style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#94a3b8",
                  background: "#080808",
                  padding: "16px",
                  borderRadius: 6,
                  overflow: "auto",
                  maxHeight: 220,
                  lineHeight: 1.8,
                  border: "1px solid #1e1e1e",
                  margin: 0,
                }}>
                  {content.pseudocode}
                </pre>
              )}
            </div>

            {/* Auto-close countdown bar */}
            {autoClose && (
              <div style={{
                padding: "0 16px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}>
                <div style={{
                  flex: 1,
                  height: 2,
                  background: "#1e1e1e",
                  borderRadius: 1,
                  overflow: "hidden",
                }}>
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                    onAnimationComplete={onClose}
                    style={{
                      height: 2,
                      background: "#3b82f6",
                      borderRadius: 1,
                    }}
                  />
                </div>
                <button
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 9,
                    color: "#374151",
                    fontFamily: "inherit",
                    letterSpacing: "0.08em",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  SKIP →
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
