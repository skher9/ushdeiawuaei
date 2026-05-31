"use client";
import { useState, useCallback, useRef } from "react";
import type { GameProps } from "../types";
import GameShell, { type ShellStat } from "@/components/games/shared/GameShell";
import { getMission, getTools } from "@/components/games/shared/gameMissions";

const WORD_LIST_RAW = [
  "COLD","CORD","CORE","BORE","BONE","BANE","BAND","SAND","SAID","SAIL",
  "TAIL","TALL","BALL","BALE","DALE","DARE","BARE","BARK","DARK","DART",
  "DIRT","BIRD","BIND","FIND","FINE","FIRE","HIRE","HERE","HARE","HAVE",
  "CAVE","CANE","LANE","LINE","LIME","TIME","TILE","FILE","FILL","HILL",
  "WILL","WILD","MILD","MIND","MINE","WINE","VINE","PINE","PILE","BILE",
  "BITE","KITE","CITE","SITE","SIRE","TIRE","WIRE","WISE","RISE","RICE",
  "RACE","FACE","LACE","PACE","PAGE","CAGE","CASE","BASE","VASE","VALE",
  "MALE","TALE","GATE","LATE","FATE","MATE","MOTE","NOTE","NOSE","ROSE",
  "RODE","CODE","MODE","MORE","GORE","GONE","CONE","TONE","TUNE",
  "DUNE","DONE","DOSE","LOSE","LOVE","LIVE","GIVE","GAVE","SAVE","SAFE",
  "SALE","MOLE","ROLE","RULE","RUDE","ROPE","ROBE","LOBE",
  "LODE","LOAD","ROAD","READ","BEAD","BEAT","HEAT","HEAP","REAP","LEAP",
  "LEAN","BEAN","BEAR","BEER","BEEN","SEEN","SEED","FEED","FEET","FEEL",
  "FELL","BELL","BELT","BOLT","BOOT","BOOK","LOOK","LOCK","DOCK","ROCK",
  "SOCK","SICK","SILK","MILK","MILL","KILL","KILN","KING","RING","RINK",
  "GOLD","WARM","WARD","WORD",
];
const WORD_SET: Set<string> = new Set(WORD_LIST_RAW);

const PUZZLES = [
  { start: "COLD", end: "CORD", steps: 1 },
  { start: "DARK", end: "DARE", steps: 1 },
  { start: "FILL", end: "HILL", steps: 1 },
  { start: "FIRE", end: "HIRE", steps: 1 },
  { start: "BONE", end: "CONE", steps: 1 },
  { start: "SAND", end: "BAND", steps: 1 },
  { start: "MINE", end: "WINE", steps: 1 },
  { start: "FILL", end: "FILE", steps: 1 },
];

function randomPuzzle() {
  return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
}

function differsBy1(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
    if (diffs > 1) return false;
  }
  return diffs === 1;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function WordLadder({ onSolve, onAttempt }: GameProps) {
  const [puzzle, setPuzzle] = useState(() => randomPuzzle());
  const [path, setPath] = useState<string[]>(() => [randomPuzzle().start]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [flash, setFlash] = useState<"valid" | "invalid" | null>(null);
  const [solved, setSolved] = useState(false);

  const attemptedRef = useRef(false);
  const solvedRef = useRef(false);

  // Keep path in sync with puzzle start on puzzle change
  const currentWord = path[path.length - 1];

  const triggerFlash = useCallback((type: "valid" | "invalid") => {
    setFlash(type);
    setTimeout(() => setFlash(null), 600);
  }, []);

  const handleSlotClick = useCallback(
    (idx: number) => {
      if (solved) return;
      setSelectedSlot((prev) => (prev === idx ? null : idx));
    },
    [solved]
  );

  const handleLetterPick = useCallback(
    (letter: string) => {
      if (solved || selectedSlot === null) return;

      const candidate =
        currentWord.slice(0, selectedSlot) +
        letter +
        currentWord.slice(selectedSlot + 1);

      if (candidate === currentWord) {
        setSelectedSlot(null);
        return;
      }

      if (!WORD_SET.has(candidate)) {
        triggerFlash("invalid");
        setSelectedSlot(null);
        return;
      }

      // Valid word
      if (!attemptedRef.current) {
        attemptedRef.current = true;
        onAttempt();
      }

      triggerFlash("valid");
      const newPath = [...path, candidate];
      setPath(newPath);
      setSelectedSlot(null);

      if (candidate === puzzle.end && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        setTimeout(() => onSolve(), 800);
      }
    },
    [
      solved,
      selectedSlot,
      currentWord,
      path,
      puzzle.end,
      triggerFlash,
      onAttempt,
      onSolve,
    ]
  );

  function restartGame() {
    const p = randomPuzzle();
    setPuzzle(p);
    setPath([p.start]);
    setSelectedSlot(null);
    setFlash(null);
    setSolved(false);
    solvedRef.current = false;
    attemptedRef.current = false;
  }

  const wordColor =
    flash === "valid"
      ? "#22c55e"
      : flash === "invalid"
      ? "#ef4444"
      : solved
      ? "#22c55e"
      : "#e2e8f0";

  const slotBorder = (idx: number) => {
    if (selectedSlot === idx) return "2px solid #06b6d4";
    if (flash === "invalid") return "2px solid #ef4444";
    if (flash === "valid") return "2px solid #22c55e";
    return "2px solid #1f2937";
  };

  const slotBg = (idx: number) => {
    if (selectedSlot === idx) return "rgba(6,182,212,0.12)";
    return "rgba(255,255,255,0.03)";
  };

  const mission = getMission("graphs", 7);
  const tools = getTools("graphs");
  const stats: ShellStat[] = [{ label: "STEPS", value: path.length - 1 }, { label: "TARGET", value: puzzle.steps }];

  return (
    <GameShell
      missionName={mission.missionName} zone={mission.zone}
      situation={mission.situation} objective={mission.objective} constraint={mission.constraint}
      tools={tools} stats={stats} sceneLabel={mission.sceneLabel}
    >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", userSelect: "none", overflowY: "auto", padding: "48px 16px 16px", boxSizing: "border-box" }}>

      {/* Puzzle goal row */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 8, color: "#374151", letterSpacing: "0.06em" }}>START</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.15em",
            }}
          >
            {puzzle.start}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#1f2937" }}>· · · · ·</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 8, color: "#374151", letterSpacing: "0.06em" }}>END</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: solved ? "#22c55e" : "#f59e0b",
              letterSpacing: "0.15em",
              transition: "color 0.3s",
            }}
          >
            {puzzle.end}
          </span>
        </div>
      </div>

      {/* Current word slots */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexShrink: 0,
          transition: "opacity 0.15s",
        }}
      >
        {currentWord.split("").map((letter, idx) => (
          <div
            key={idx}
            onClick={() => handleSlotClick(idx)}
            style={{
              width: 72,
              height: 68,
              background: slotBg(idx),
              border: slotBorder(idx),
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: solved ? "default" : "pointer",
              fontSize: 28,
              fontWeight: 700,
              color: wordColor,
              userSelect: "none",
              transition: "border-color 0.15s, background 0.15s, color 0.2s",
              letterSpacing: "0.05em",
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Status / instruction */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color:
            flash === "invalid"
              ? "#ef4444"
              : flash === "valid"
              ? "#22c55e"
              : selectedSlot !== null
              ? "#06b6d4"
              : "#374151",
          transition: "color 0.2s",
          flexShrink: 0,
          minHeight: 16,
        }}
      >
        {flash === "invalid" && "NOT A VALID WORD"}
        {flash === "valid" && !solved && "VALID — WORD ADDED"}
        {solved && "SOLVED — REACHED THE TARGET!"}
        {!flash && !solved && selectedSlot === null && "CLICK A LETTER SLOT TO CHANGE IT"}
        {!flash && !solved && selectedSlot !== null && `POSITION ${selectedSlot + 1} SELECTED — PICK A LETTER`}
      </div>

      {/* Alphabet picker */}
      {selectedSlot !== null && !solved && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 32px)",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {ALPHABET.map((letter) => {
            const candidate =
              currentWord.slice(0, selectedSlot) +
              letter +
              currentWord.slice(selectedSlot + 1);
            const isCurrentLetter = letter === currentWord[selectedSlot];
            const wouldBeValid = !isCurrentLetter && WORD_SET.has(candidate);
            return (
              <div
                key={letter}
                onClick={() => handleLetterPick(letter)}
                style={{
                  width: 32,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: isCurrentLetter
                    ? "1px solid #374151"
                    : wouldBeValid
                    ? "1px solid rgba(34,197,94,0.5)"
                    : "1px solid #111",
                  background: isCurrentLetter
                    ? "rgba(255,255,255,0.02)"
                    : wouldBeValid
                    ? "rgba(34,197,94,0.08)"
                    : "transparent",
                  cursor: isCurrentLetter ? "default" : "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: isCurrentLetter
                    ? "#1f2937"
                    : wouldBeValid
                    ? "#22c55e"
                    : "#374151",
                  userSelect: "none",
                  transition: "border-color 0.1s, background 0.1s",
                  letterSpacing: "0.04em",
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      )}

      {/* Path chain */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 8,
            color: "#1f2937",
            letterSpacing: "0.08em",
            marginBottom: 2,
          }}
        >
          PATH · {path.length - 1} STEP{path.length - 1 !== 1 ? "S" : ""}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
          }}
        >
          {path.map((word, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    i === 0
                      ? "#64748b"
                      : i === path.length - 1 && word === puzzle.end
                      ? "#22c55e"
                      : i === path.length - 1
                      ? "#e2e8f0"
                      : "#475569",
                  letterSpacing: "0.1em",
                }}
              >
                {word}
              </span>
              {i < path.length - 1 && (
                <span style={{ fontSize: 10, color: "#1f2937" }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Solved / restart */}
      {solved && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#22c55e",
              letterSpacing: "0.08em",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {puzzle.start} → {puzzle.end} IN {path.length - 1} STEP{path.length - 1 !== 1 ? "S" : ""}
          </div>
          <button
            onClick={restartGame}
            style={{
              padding: "8px 24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: "#22c55e",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
          >
            [ PLAY AGAIN ]
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid #111",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 8,
            color: "#1f2937",
            letterSpacing: "0.06em",
            lineHeight: 2,
          }}
        >
          BFS ON IMPLICIT GRAPH: each word is a node · edge exists if words differ by 1 letter
          · BFS finds shortest transformation sequence
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {[
            { color: "#64748b", label: "START WORD" },
            { color: "#f59e0b", label: "TARGET WORD" },
            { color: "#06b6d4", label: "SELECTED SLOT" },
            { color: "#22c55e", label: "VALID NEIGHBOR" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: color,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontSize: 8, color: "#1f2937" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </GameShell>
  );
}
