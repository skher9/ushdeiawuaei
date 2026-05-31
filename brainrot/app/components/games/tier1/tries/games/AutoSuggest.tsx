"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

function playTone(freq: number, type: OscillatorType = "sine", dur = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playCorrect() { playTone(880, "sine", 0.15); }
function playWrong() { playTone(200, "sawtooth", 0.2); }
function playKey() { playTone(300 + Math.random() * 150, "sine", 0.08); }
function playRoundDone() {
  playTone(660, "sine", 0.12);
  setTimeout(() => playTone(880, "sine", 0.15), 130);
}
function playSolved() {
  playTone(440, "sine", 0.12);
  setTimeout(() => playTone(660, "sine", 0.12), 140);
  setTimeout(() => playTone(880, "sine", 0.2), 280);
}

function getSuggestions(words: string[], prefix: string): string[] {
  return words
    .filter(w => w.startsWith(prefix))
    .sort()
    .slice(0, 3);
}

interface Step {
  prefix: string;
  correct: string[];
}

interface RoundDef {
  words: string[];
  steps: Step[];
  difficulty: string;
  letters: string[];
}

const ROUNDS: RoundDef[] = [
  {
    words: ["mobile", "mouse", "monitor", "mic"],
    steps: [
      { prefix: "m", correct: ["mic", "mobile", "monitor"] },
      { prefix: "mo", correct: ["mobile", "monitor", "mouse"] },
    ],
    difficulty: "EASY",
    letters: ["m", "o"],
  },
  {
    words: ["search", "see", "session", "set", "send"],
    steps: [
      { prefix: "s", correct: ["search", "see", "send"] },
      { prefix: "se", correct: ["search", "see", "send"] },
      { prefix: "ses", correct: ["session"] },
    ],
    difficulty: "MEDIUM",
    letters: ["s", "e", "s"],
  },
  {
    words: ["apple", "app", "application", "apply", "apt"],
    steps: [
      { prefix: "a", correct: ["app", "apple", "application"] },
      { prefix: "ap", correct: ["app", "apple", "application"] },
      { prefix: "app", correct: ["app", "apple", "application"] },
      { prefix: "appl", correct: ["apple", "application", "apply"] },
    ],
    difficulty: "HARD",
    letters: ["a", "p", "p", "l"],
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "#22c55e", MEDIUM: "#eab308", HARD: "#ef4444",
};

export default function AutoSuggest({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wrongItems, setWrongItems] = useState<Set<string>>(new Set());
  const [correctItems, setCorrectItems] = useState<Set<string>>(new Set());
  const [stepDone, setStepDone] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const r = ROUNDS[round];
  const step = r.steps[stepIdx];

  const currentSuggestions = getSuggestions(r.words, step.prefix);

  const handleToggleSuggestion = useCallback((word: string) => {
    if (transitioning || stepDone || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }
    playKey();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }, [transitioning, stepDone, onAttempt]);

  const handleConfirm = useCallback(() => {
    if (transitioning || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }

    const correct = new Set(step.correct);
    const isCorrect = selected.size === correct.size && [...selected].every(w => correct.has(w));

    if (isCorrect) {
      playCorrect();
      setCorrectItems(new Set(step.correct));
      setStepDone(true);
      setTransitioning(true);

      setTimeout(() => {
        setCorrectItems(new Set());
        setStepDone(false);
        setSelected(new Set());
        setWrongItems(new Set());

        const nextStep = stepIdx + 1;
        if (nextStep >= r.steps.length) {
          playRoundDone();
          setBanner(round + 1 >= ROUNDS.length ? "ALL STEPS DONE!" : "ROUND COMPLETE!");
          setTimeout(() => {
            setBanner(null);
            if (round + 1 >= ROUNDS.length) {
              if (!solvedRef.current) {
                solvedRef.current = true;
                playSolved();
                setBanner("SOLVED!");
                setTimeout(() => onSolve(), 1000);
                setTransitioning(false);
              }
            } else {
              setRound(r2 => r2 + 1);
              setStepIdx(0);
              setTransitioning(false);
            }
          }, 1200);
        } else {
          setStepIdx(nextStep);
          setTransitioning(false);
        }
      }, 700);
    } else {
      playWrong();
      const wrong = new Set<string>();
      for (const w of selected) { if (!correct.has(w)) wrong.add(w); }
      for (const w of correct) { if (!selected.has(w)) wrong.add(w); }
      setWrongItems(wrong);
      setTimeout(() => setWrongItems(new Set()), 700);
    }
  }, [transitioning, step, selected, stepIdx, r.steps.length, round, onSolve, onAttempt]);

  const mission = getMission("tries", 4);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: round + 1 }];

  return (
    <>
      <style>{`
        @keyframes as-shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-3px)} 80%{transform:translateX(3px)}
        }
        @keyframes as-pop {
          0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)}
        }
        @keyframes as-banner {
          0%{opacity:0;transform:translate(-50%,-50%) scale(0.85)}
          15%{opacity:1;transform:translate(-50%,-50%) scale(1)}
          80%{opacity:1}
          100%{opacity:0;transform:translate(-50%,-50%) scale(0.95)}
        }
        @keyframes as-cursor {
          0%,100%{opacity:1} 50%{opacity:0}
        }
        @keyframes as-slide-in {
          from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)}
        }
      `}</style>
      <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>
        {banner && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            background: banner.includes("SOLVED") ? "#eab308" : "#06b6d4",
            color: "#0a0a0f", padding: "10px 24px", borderRadius: 10,
            fontWeight: 700, fontSize: 20, zIndex: 10, letterSpacing: 2,
            animation: "as-banner 1.4s ease forwards",
            whiteSpace: "nowrap",
          }}>{banner}</div>
        )}

        {/* Word list */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[...r.words].sort().map(w => (
            <div key={w} style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11,
              background: "#111827", color: "#64748b",
              border: "1px solid #1e293b",
            }}>{w}</div>
          ))}
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: 6 }}>
          {r.steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < stepIdx ? "#06b6d4" : i === stepIdx ? "#0e7490" : "#1e293b",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#111827", border: "2px solid #06b6d4",
            borderRadius: 10, padding: "10px 14px",
          }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>🔍</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#06b6d4", letterSpacing: 2 }}>
              {step.prefix}
            </span>
            <span style={{ animation: "as-cursor 1s infinite", color: "#06b6d4" }}>|</span>
          </div>

          {/* Dropdown suggestions */}
          <div style={{
            background: "#111827", border: "1px solid #1e293b", borderTop: "none",
            borderRadius: "0 0 10px 10px", overflow: "hidden",
            animation: "as-slide-in 0.2s ease",
          }}>
            {currentSuggestions.map((word, i) => {
              const isSelected = selected.has(word);
              const isWrong = wrongItems.has(word);
              const isCorrectItem = correctItems.has(word);
              return (
                <div
                  key={word}
                  onClick={() => handleToggleSuggestion(word)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 14px", cursor: "pointer",
                    background: isCorrectItem ? "#14532d" : isSelected ? "#0c4a6e" : "transparent",
                    borderBottom: i < currentSuggestions.length - 1 ? "1px solid #0f172a" : "none",
                    animation: isWrong ? "as-shake 0.4s ease" : "none",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: isCorrectItem ? "#22c55e" : isSelected ? "#06b6d4" : "#1e293b",
                    border: `2px solid ${isCorrectItem ? "#22c55e" : isSelected ? "#06b6d4" : "#374151"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#0a0a0f", fontWeight: 700,
                  }}>
                    {(isSelected || isCorrectItem) ? "✓" : ""}
                  </div>
                  <span style={{
                    fontSize: 14, color: isCorrectItem ? "#22c55e" : isSelected ? "#67e8f9" : "#94a3b8",
                    fontWeight: isSelected || isCorrectItem ? 700 : 400,
                  }}>
                    <span style={{ color: "#06b6d4" }}>{word.slice(0, step.prefix.length)}</span>
                    {word.slice(step.prefix.length)}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#374151" }}>#{i + 1} lex</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instruction */}
        <div style={{ fontSize: 11, color: "#64748b", background: "#111827", padding: "5px 10px", borderRadius: 5 }}>
          Step {stepIdx + 1}/{r.steps.length}: Select ALL correct top-3 suggestions for prefix &quot;{step.prefix}&quot;
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || transitioning}
          style={{
            padding: "10px 0", borderRadius: 8, border: "none",
            cursor: selected.size === 0 || transitioning ? "not-allowed" : "pointer",
            background: selected.size > 0 && !transitioning ? "#06b6d4" : "#1e293b",
            color: selected.size > 0 && !transitioning ? "#0a0a0f" : "#374151",
            fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: 1,
            transition: "background 0.2s, color 0.2s",
          }}
        >CONFIRM SELECTION</button>
      </div>
    </GameShell>
    </>
  );
}
