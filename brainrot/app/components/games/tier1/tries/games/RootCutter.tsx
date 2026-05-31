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
function playRoundDone() {
  playTone(660, "sine", 0.12);
  setTimeout(() => playTone(880, "sine", 0.15), 130);
}
function playSolved() {
  playTone(440, "sine", 0.12);
  setTimeout(() => playTone(660, "sine", 0.12), 140);
  setTimeout(() => playTone(880, "sine", 0.2), 280);
}

interface Round {
  roots: string[];
  sentence: string[];
  answers: Record<string, string>;
  note: string;
}

const ROUNDS: Round[] = [
  {
    roots: ["cat", "bat"],
    sentence: ["cattle", "battled"],
    answers: { cattle: "cat", battled: "bat" },
    note: "Find the shortest root that starts each word.",
  },
  {
    roots: ["run", "ran", "she", "her", "hero"],
    sentence: ["runners", "heroine", "ranch"],
    answers: { runners: "run", heroine: "her", ranch: "ran" },
    note: "First-prefix-wins: shortest matching root wins.",
  },
  {
    roots: ["in", "inter", "int"],
    sentence: ["international", "interest", "interim"],
    answers: { international: "in", interest: "in", interim: "in" },
    note: "All share 'in' — first (shortest) match wins every time!",
  },
];

const DIFFICULTY = ["EASY", "MEDIUM", "HARD"];

export default function RootCutter({ onSolve, onAttempt }: GameProps) {
  const solvedRef = useRef(false);
  const attemptedRef = useRef(false);
  const [round, setRound] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [replaced, setReplaced] = useState<Record<string, string>>({});
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const [wrongRoot, setWrongRoot] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const r = ROUNDS[round];

  const handleWordClick = useCallback((word: string) => {
    if (transitioning || replaced[word] || solvedRef.current) return;
    if (!attemptedRef.current) { attemptedRef.current = true; onAttempt(); }
    setSelectedWord(prev => prev === word ? null : word);
    setWrongRoot(null);
  }, [transitioning, replaced, onAttempt]);

  const handleRootClick = useCallback((root: string) => {
    if (!selectedWord || transitioning || solvedRef.current) return;
    const correct = r.answers[selectedWord];
    if (root === correct) {
      playCorrect();
      const next = { ...replaced, [selectedWord]: root };
      setReplaced(next);
      setSelectedWord(null);
      setWrongRoot(null);
      if (Object.keys(next).length === r.sentence.length) {
        playRoundDone();
        setBanner(round === 2 ? "ALL ROOTS FOUND!" : "ROUND COMPLETE!");
        setTransitioning(true);
        setTimeout(() => {
          setBanner(null);
          setTransitioning(false);
          if (round + 1 >= ROUNDS.length) {
            if (!solvedRef.current) {
              solvedRef.current = true;
              playSolved();
              setBanner("SOLVED!");
              setTimeout(() => onSolve(), 1000);
            }
          } else {
            setRound(r2 => r2 + 1);
            setReplaced({});
            setSelectedWord(null);
          }
        }, 1200);
      }
    } else {
      playWrong();
      setWrongRoot(root);
      setWrongWord(selectedWord);
      setTimeout(() => { setWrongRoot(null); setWrongWord(null); }, 600);
    }
  }, [selectedWord, transitioning, replaced, r, round, onSolve]);

  const mission = getMission("tries", 6);
  const tools = getTools("tries");
  const stats: ShellStat[] = [{ label: "ROUND", value: round + 1 }];

  return (
    <>
      <style>{`
        @keyframes rc-shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        @keyframes rc-pop {
          0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}
        }
        @keyframes rc-banner {
          0%{opacity:0;transform:translateY(-10px) scale(0.9)}
          20%{opacity:1;transform:translateY(0) scale(1)}
          80%{opacity:1}
          100%{opacity:0;transform:translateY(-6px)}
        }
        @keyframes rc-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,0.5)}
          50%{box-shadow:0 0 0 6px rgba(6,182,212,0)}
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
            transform: "translate(-50%,-50%)",
            background: round === 2 && banner === "SOLVED!" ? "#eab308" : "#06b6d4",
            color: "#0a0a0f", padding: "12px 28px", borderRadius: 12,
            fontWeight: 700, fontSize: 22, zIndex: 10, letterSpacing: 2,
            animation: "rc-banner 1.2s ease forwards",
          }}>{banner}</div>
        )}

        {/* Note */}
        <div style={{ fontSize: 11, color: "#94a3b8", padding: "6px 10px", background: "#1e293b", borderRadius: 6 }}>
          {r.note}
        </div>

        {/* Trie roots panel */}
        <div style={{ background: "#111827", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, letterSpacing: 1 }}>TRIE ROOTS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[...new Set(r.roots)].map(root => {
              const isWrong = wrongRoot === root;
              return (
                <button
                  key={root}
                  onClick={() => handleRootClick(root)}
                  disabled={!selectedWord || transitioning}
                  style={{
                    padding: "6px 14px", borderRadius: 6, border: "none", cursor: selectedWord ? "pointer" : "default",
                    background: isWrong ? "#ef4444" : selectedWord ? "#06b6d4" : "#1e293b",
                    color: isWrong ? "#fff" : selectedWord ? "#0a0a0f" : "#64748b",
                    fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 1,
                    animation: isWrong ? "rc-shake 0.4s ease" : "none",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >{root}</button>
              );
            })}
          </div>
        </div>

        {/* Sentence */}
        <div style={{ background: "#111827", borderRadius: 8, padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>SENTENCE — click a word, then pick its root</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {r.sentence.map((word) => {
              const rep = replaced[word];
              const isSel = selectedWord === word;
              const isWrong = wrongWord === word && !rep;
              return (
                <div
                  key={word}
                  onClick={() => !rep && handleWordClick(word)}
                  style={{
                    cursor: rep ? "default" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                >
                  <div style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 17, fontWeight: 700,
                    background: rep ? "#14532d" : isWrong ? "#7f1d1d" : isSel ? "#0e7490" : "#1e293b",
                    color: rep ? "#22c55e" : isWrong ? "#ef4444" : isSel ? "#67e8f9" : "#cbd5e1",
                    border: isSel ? "2px solid #06b6d4" : "2px solid transparent",
                    animation: isSel ? "rc-pulse 1.2s infinite" : rep ? "rc-pop 0.3s ease" : "none",
                    transition: "background 0.15s",
                  }}>
                    {rep ? (
                      <span>
                        <span style={{ color: "#22c55e", textDecoration: "underline" }}>{rep}</span>
                        <span style={{ color: "#4b5563" }}>{word.slice(rep.length)}</span>
                      </span>
                    ) : word}
                  </div>
                  {!rep && (
                    <div style={{ fontSize: 9, color: isSel ? "#06b6d4" : "#374151" }}>
                      {isSel ? "↑ pick root" : "click"}
                    </div>
                  )}
                  {rep && (
                    <div style={{ fontSize: 9, color: "#22c55e" }}>✓ {rep}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status bar */}
        <div style={{ fontSize: 11, color: "#475569", textAlign: "center" }}>
          {selectedWord
            ? `"${selectedWord}" selected — pick the shortest matching root above`
            : "Click a word in the sentence to begin"}
        </div>
      </div>
    </GameShell>
    </>
  );
}
