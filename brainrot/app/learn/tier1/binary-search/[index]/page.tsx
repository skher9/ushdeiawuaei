"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { BS_PROBLEMS } from "@/components/games/tier1/binary-search/problems";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/binary-search/types";
import { FloatingReactions } from "@/components/games/tier1/binary-search/FloatingReactions";
import MissionBrief from "@/components/games/tier1/binary-search/MissionBrief";
import Toolbox from "@/components/games/tier1/binary-search/Toolbox";
import DebriefQuestion from "@/components/games/tier1/binary-search/DebriefQuestion";
import MISSIONS, { dominantComplexity, complexityScore } from "@/components/games/tier1/binary-search/missionConfigs";
import AlgoModal from "@/components/games/AlgoModal";
import GameTopBar from "@/components/games/shared/GameTopBar";
import SolvePanel from "@/components/games/shared/SolvePanel";

function GameLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#374151", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
      loading...
    </div>
  );
}

const VaultHeist = dynamic(() => import("@/components/games/tier1/binary-search/games/VaultHeist"), { ssr: false, loading: () => <GameLoader /> });
const Outbreak = dynamic(() => import("@/components/games/tier1/binary-search/games/Outbreak"), { ssr: false, loading: () => <GameLoader /> });
const Tournament = dynamic(() => import("@/components/games/tier1/binary-search/games/Tournament"), { ssr: false, loading: () => <GameLoader /> });
const DeadSignal = dynamic(() => import("@/components/games/tier1/binary-search/games/DeadSignal"), { ssr: false, loading: () => <GameLoader /> });
const GridZero = dynamic(() => import("@/components/games/tier1/binary-search/games/GridZero"), { ssr: false, loading: () => <GameLoader /> });
const P6 = dynamic(() => import("@/components/games/tier1/binary-search/P6_DeliveryRace"), { ssr: false, loading: () => <GameLoader /> });
const P7 = dynamic(() => import("@/components/games/tier1/binary-search/P7_CargoShip"), { ssr: false, loading: () => <GameLoader /> });
const P8 = dynamic(() => import("@/components/games/tier1/binary-search/P8_DualConveyor"), { ssr: false, loading: () => <GameLoader /> });

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: VaultHeist, 2: Outbreak, 3: Tournament, 4: DeadSignal,
  5: GridZero, 6: P6, 7: P7, 8: P8,
};

const MODULE_HREF = "/learn/tier1/binary-search";

export default function ProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = BS_PROBLEMS.find(p => p.index === idx) ?? null;
  const mission = MISSIONS[idx] ?? null;
  const isMissionGame = mission !== null;

  const supabase = createClient();
  const [dbId, setDbId] = useState<string | null>(null);
  const [solveVisible, setSolveVisible] = useState(false);
  const [debriefVisible, setDebriefVisible] = useState(false);
  const [algoModalOpen, setAlgoModalOpen] = useState(false);
  const [algoAutoClose, setAlgoAutoClose] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tool + score state (mission games only)
  const [activeTool, setActiveTool] = useState<string>(mission?.defaultTool ?? "");
  const [usedTools, setUsedTools] = useState<{ name: string; complexity: string }[]>([]);
  const [score, setScore] = useState(100);

  const { submitSolve, incrementAttempts, attemptData, startAttempt } =
    useProblemAttempt(dbId, "binary-search");

  useEffect(() => {
    if (!problem) return;
    async function loadId() {
      const { data } = await supabase
        .from("problems")
        .select("id")
        .eq("pattern_slug", "binary-search")
        .eq("order_index", problem!.index)
        .maybeSingle();
      if (data) setDbId(data.id);
    }
    loadId();
  }, [problem]);

  useEffect(() => {
    if (dbId) startAttempt();
  }, [dbId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setAlgoAutoClose(true);
      setAlgoModalOpen(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Listen for tool usage events from Phaser scenes
  useEffect(() => {
    if (!isMissionGame) return;
    function onToolUsed(e: Event) {
      const { tool, complexity } = (e as CustomEvent).detail as { tool: string; complexity: string };
      setUsedTools(prev => {
        // dedup: only add unique tool name entries
        if (prev.some(t => t.name === tool)) return prev;
        return [...prev, { name: tool, complexity }];
      });
    }
    window.addEventListener("bs-tool-used", onToolUsed);
    return () => window.removeEventListener("bs-tool-used", onToolUsed);
  }, [isMissionGame]);

  // Emit tool selection to Phaser scene
  function handleSelectTool(name: string) {
    setActiveTool(name);
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("bs-tool-select", { detail: { tool: name } }));
  }

  function calcScore(): number {
    if (!mission) return 100;
    const dominant = dominantComplexity(usedTools.map(t => t.complexity));
    let base = complexityScore(dominant, mission.optimalComplexity);
    // speed bonus: +15 if solved in under 60s
    if (elapsed < 60) base = Math.min(100, base + 15);
    // first attempt bonus: +10
    if (attempts <= 1) base = Math.min(100, base + 10);
    return base;
  }

  const handleSolve = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitSolve(0);
    if (isMissionGame) {
      setScore(calcScore());
      setDebriefVisible(true);
    } else {
      setSolveVisible(true);
    }
  };

  const handleAttempt = async () => {
    setAttempts(a => a + 1);
    await incrementAttempts();
  };

  function handleDebriefContinue(bonusPoints: number) {
    setScore(s => Math.min(100, s + bonusPoints));
    setDebriefVisible(false);
    setSolveVisible(true);
  }

  if (!problem) return <div style={{ minHeight: "100vh", background: "var(--bg-0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}><span style={{ color: "#ff5a7a", fontSize: 12 }}>Problem not found.</span></div>;

  const GameComponent = GAME_MAP[idx];
  const dominantUsed = dominantComplexity(usedTools.map(t => t.complexity));

  return (
    <div style={{ height: "100vh", background: "var(--bg-0)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <GameTopBar
        moduleTitle="Binary Search"
        moduleHref={MODULE_HREF}
        pattern="BINARY SEARCH"
        problemIndex={idx}
        problemTitle={problem.title}
        difficulty={problem.difficulty}
        lcRef={problem.leetcodeRef ?? undefined}
        elapsed={elapsed}
        solved={attemptData.solved || solveVisible}
        onLearnAlgo={() => { setAlgoAutoClose(false); setAlgoModalOpen(true); }}
      />

      {/* Mission brief (games 1-4 only) */}
      {isMissionGame && mission && (
        <MissionBrief
          missionName={mission.missionName}
          situation={mission.situation}
          objective={mission.objective}
          constraint={mission.constraint}
          tools={mission.tools.map(t => t.name)}
          difficulty={mission.difficulty}
          lcRef={mission.lcRef}
          score={score}
        />
      )}

      {/* Toolbox (games 1-4 only) */}
      {isMissionGame && mission && (
        <Toolbox
          tools={mission.tools}
          activeTool={activeTool}
          usedTools={usedTools}
          onSelectTool={handleSelectTool}
        />
      )}

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {GameComponent ? (
          <GameComponent onSolve={handleSolve} onAttempt={handleAttempt} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-4)", fontSize: 12 }}>Game not available.</div>
        )}
        <FloatingReactions />
        {isMissionGame && (
          <DebriefQuestion
            visible={debriefVisible}
            toolsUsed={usedTools}
            finalComplexity={dominantUsed === "--" ? mission?.optimalComplexity ?? "O(log n)" : dominantUsed}
            optimalComplexity={mission?.optimalComplexity ?? "O(log n)"}
            score={score}
            onContinue={handleDebriefContinue}
          />
        )}
      </div>

      <AlgoModal open={algoModalOpen} onClose={() => { setAlgoModalOpen(false); setAlgoAutoClose(false); }} mechanic={problem.mechanic} autoClose={algoAutoClose} />

      {solveVisible && (
        <SolvePanel
          insightTitle={problem.insightTitle}
          insight={problem.insight}
          moduleHref={MODULE_HREF}
          problemIndex={idx}
          nextHref={idx < 8 ? `${MODULE_HREF}/${idx + 1}` : null}
          score={isMissionGame ? score : undefined}
          onClose={() => setSolveVisible(false)}
        />
      )}
    </div>
  );
}
