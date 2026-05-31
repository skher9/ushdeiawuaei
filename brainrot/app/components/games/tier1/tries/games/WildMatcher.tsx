"use client";
import { useState, useRef, useCallback } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const FONT = "var(--font-mono,'JetBrains Mono',monospace)";
const CYAN = "#06b6d4";
const GREEN = "#22c55e";
const RED = "#ef4444";
const GOLD = "#f59e0b";

function playTone(freq: number, type: OscillatorType, dur: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}
function playCorrect() { playTone(880, "sine", 0.15); }
function playWrong() { playTone(200, "sawtooth", 0.2); }
function playSelect() { playTone(600, "sine", 0.1); }
function playDeselect() { playTone(350, "sine", 0.1); }
function playRoundComplete() {
  setTimeout(() => playTone(660, "sine", 0.15), 0);
  setTimeout(() => playTone(880, "sine", 0.15), 160);
}
function playSolved() {
  setTimeout(() => playTone(440, "sine", 0.18), 0);
  setTimeout(() => playTone(660, "sine", 0.18), 180);
  setTimeout(() => playTone(880, "sine", 0.22), 360);
}

function matchesPattern(word: string, pattern: string): boolean {
  if (word.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "." && pattern[i] !== word[i]) return false;
  }
  return true;
}

interface RoundData {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  pattern: string;
  words: string[];
  correctSet: Set<string>;
}

const ROUND1: RoundData = {
  difficulty: "EASY",
  pattern: ".at",
  words: ["bat", "cat", "hat", "dog", "car", "mat"],
  correctSet: new Set(["bat", "cat", "hat", "mat"]),
};

const ROUND2: RoundData = {
  difficulty: "MEDIUM",
  pattern: "c.t",
  words: ["cat", "cut", "cot", "bat", "got", "hit"],
  correctSet: new Set(["cat", "cut", "cot"]),
};

const ROUND3: RoundData = {
  difficulty: "HARD",
  pattern: "..ll",
  words: ["ball", "bell", "bill", "bull", "call", "fall", "hall", "tell"],
  correctSet: new Set(["ball", "bell", "bill", "bull", "call", "fall", "hall", "tell"]),
};

const ROUNDS: RoundData[] = [ROUND1, ROUND2, ROUND3];

type CheckState = "idle" | "correct" | "wrong";

export default function WildMatcher({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptRef = useRef(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [wrongWords, setWrongWords] = useState<Set<string>>(new Set());
  const [missedWords, setMissedWords] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [shakeConfirm, setShakeConfirm] = useState(false);

  const round = ROUNDS[roundIdx];

  function triggerAttempt() {
    if (!attemptRef.current) { attemptRef.current = true; onAttempt(); }
  }

  const handleWordClick = useCallback((word: string) => {
    if (done || checkState !== "idle") return;
    triggerAttempt();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
        playDeselect();
      } else {
        next.add(word);
        playSelect();
      }
      return next;
    });
  }, [done, checkState]);

  const handleConfirm = useCallback(() => {
    if (done || checkState !== "idle") return;
    triggerAttempt();

    const correct = round.correctSet;
    const wrongs = new Set<string>();
    const missed = new Set<string>();

    for (const w of selected) {
      if (!correct.has(w)) wrongs.add(w);
    }
    for (const w of correct) {
      if (!selected.has(w)) missed.add(w);
    }

    if (wrongs.size === 0 && missed.size === 0) {
      setCheckState("correct");
      playRoundComplete();
      setBanner(roundIdx < 2 ? "ROUND COMPLETE" : "SOLVED!");
      setTimeout(() => {
        setBanner(null);
        if (roundIdx < 2) {
          const next = roundIdx + 1;
          setRoundIdx(next);
          setSelected(new Set());
          setCheckState("idle");
          setWrongWords(new Set());
          setMissedWords(new Set());
        } else {
          setDone(true);
          playSolved();
          if (!solvedRef.current) {
            solvedRef.current = true;
            setTimeout(() => onSolve(), 1000);
          }
        }
      }, 1200);
    } else {
      setCheckState("wrong");
      setWrongWords(wrongs);
      setMissedWords(missed);
      playWrong();
      setShakeConfirm(true);
      setTimeout(() => setShakeConfirm(false), 400);
      setTimeout(() => {
        setCheckState("idle");
        setSelected(new Set());
        setWrongWords(new Set());
        setMissedWords(new Set());
      }, 1800);
    }
  }, [done, checkState, selected, round, roundIdx]);

  function renderPattern(pattern: string) {
    return pattern.split("").map((ch, i) => (
      <span key={i} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 4,
        background: ch === "." ? "rgba(245,158,11,0.15)" : "rgba(6,182,212,0.1)",
        border: `1.5px solid ${ch === "." ? "rgba(245,158,11,0.4)" : "rgba(6,182,212,0.4)"}`,
        color: ch === "." ? GOLD : CYAN,
        fontSize: 16, fontWeight: 800, fontFamily: FONT,
        marginRight: 2,
      }}>{ch}</span>
    ));
  }

  function getWordStyle(word: string): React.CSSProperties {
    const isSelected = selected.has(word);
    const isCorrect = round.correctSet.has(word);
    const isWrong = wrongWords.has(word);
    const isMissed = missedWords.has(word);

    if (checkState === "correct" && isCorrect) {
      return {
        background: "rgba(34,197,94,0.18)",
        border: "1.5px solid rgba(34,197,94,0.5)",
        color: GREEN,
      };
    }
    if (checkState === "wrong") {
      if (isWrong) return {
        background: "rgba(239,68,68,0.15)",
        border: "1.5px solid rgba(239,68,68,0.5)",
        color: RED,
      };
      if (isMissed) return {
        background: "rgba(245,158,11,0.12)",
        border: "1.5px solid rgba(245,158,11,0.4)",
        color: GOLD,
      };
      if (isSelected && isCorrect) return {
        background: "rgba(34,197,94,0.12)",
        border: "1.5px solid rgba(34,197,94,0.3)",
        color: GREEN,
      };
    }
    if (isSelected) return {
      background: "rgba(6,182,212,0.15)",
      border: "1.5px solid rgba(6,182,212,0.6)",
      color: CYAN,
    };
    return {
      background: "rgba(255,255,255,0.03)",
      border: "1.5px solid #2a2a2a",
      color: "#94a3b8",
    };
  }

  const selCount = selected.size;
  const reqCount = round.correctSet.size;

  const mission = getMission("tries", 8);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: roundIdx + 1 }, { label: "SELECTED", value: selected?.size ?? 0 }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes wm-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        @keyframes wm-banner { 0%{opacity:0;transform:translateY(-8px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0} }
        @keyframes wm-pop { 0%{transform:scale(0.85)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
        @keyframes wm-wrong-flash { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Pattern row */}
      <div style={{ padding: "10px 16px 8px", background: "rgba(6,182,212,0.04)", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Pattern:</span>
          <div style={{ display: "flex", alignItems: "center" }}>
            {renderPattern(round.pattern)}
          </div>
          <span style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>
            <span style={{ color: GOLD }}>'.'</span> = any single char
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Click all words that match → press <span style={{ color: CYAN }}>MATCH</span> to confirm
        </div>
      </div>

      {/* Word grid */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "12px 16px", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>
            {selCount} selected · need {reqCount} matches
          </span>
          {checkState === "wrong" && (
            <span style={{ fontSize: 10, color: RED, animation: "wm-wrong-flash 0.5s ease 2" }}>
              {wrongWords.size > 0 ? `${wrongWords.size} wrong · ` : ""}
              {missedWords.size > 0 ? `${missedWords.size} missed` : ""}
            </span>
          )}
        </div>

        {/* Word tiles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${round.words.length <= 6 ? 3 : 4}, 1fr)`,
          gap: 8,
          flex: 1,
          alignContent: "start",
        }}>
          {round.words.map(word => {
            const style = getWordStyle(word);
            const isSelected = selected.has(word);
            return (
              <button
                key={word}
                onClick={() => handleWordClick(word)}
                disabled={checkState !== "idle"}
                style={{
                  ...style,
                  padding: "10px 8px",
                  borderRadius: 8,
                  cursor: checkState === "idle" ? "pointer" : "default",
                  fontFamily: FONT,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  transition: "all 0.15s",
                  position: "relative",
                  outline: "none",
                  animation: isSelected && checkState === "idle" ? "wm-pop 0.2s ease" : undefined,
                }}
              >
                {word}
                {isSelected && checkState === "idle" && (
                  <span style={{
                    position: "absolute", top: 3, right: 5,
                    fontSize: 9, color: CYAN, opacity: 0.8,
                  }}>✓</span>
                )}
                {wrongWords.has(word) && (
                  <span style={{ position: "absolute", top: 3, right: 5, fontSize: 9, color: RED }}>✗</span>
                )}
                {missedWords.has(word) && (
                  <span style={{ position: "absolute", top: 3, right: 5, fontSize: 9, color: GOLD }}>!</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={handleConfirm}
            disabled={done || checkState !== "idle" || selCount === 0}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              background: selCount === 0 || checkState !== "idle"
                ? "rgba(6,182,212,0.04)"
                : "rgba(6,182,212,0.12)",
              border: `1.5px solid ${selCount === 0 || checkState !== "idle" ? "rgba(6,182,212,0.1)" : "rgba(6,182,212,0.4)"}`,
              color: selCount === 0 || checkState !== "idle" ? "#374151" : CYAN,
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              cursor: selCount === 0 || checkState !== "idle" ? "default" : "pointer",
              transition: "all 0.15s",
              animation: shakeConfirm ? "wm-shake 0.4s ease" : undefined,
            }}
          >
            {checkState === "correct" ? "✓ MATCHED!" : checkState === "wrong" ? "✗ TRY AGAIN" : "MATCH →"}
          </button>

          {banner && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              zIndex: 10, padding: "8px 24px",
              background: banner === "SOLVED!" ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.12)",
              border: `1px solid ${banner === "SOLVED!" ? "rgba(34,197,94,0.4)" : "rgba(6,182,212,0.35)"}`,
              borderRadius: 8, fontSize: 15, fontWeight: 700,
              color: banner === "SOLVED!" ? GREEN : CYAN,
              letterSpacing: "0.12em", animation: "wm-banner 1.2s ease forwards",
              whiteSpace: "nowrap",
            }}>{banner}</div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div style={{ padding: "6px 16px 10px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(6,182,212,0.2)", border: `1.5px solid ${CYAN}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>SELECTED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: `1.5px solid ${GOLD}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>MISSED (hint)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: `1.5px solid ${RED}` }} />
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>WRONG SELECT</span>
        </div>
      </div>
    </div>
    </GameShell>
  );
}
