"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { SW_PROBLEMS } from "@/components/games/tier1/sliding-window/problems";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/sliding-window/types";
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

const TheScanner = dynamic(() => import("@/components/games/tier1/sliding-window/games/TheScanner"), { ssr: false, loading: () => <GameLoader /> });
const LongestRun = dynamic(() => import("@/components/games/tier1/sliding-window/games/LongestRun"), { ssr: false, loading: () => <GameLoader /> });
const AnagramHunt = dynamic(() => import("@/components/games/tier1/sliding-window/games/AnagramHunt"), { ssr: false, loading: () => <GameLoader /> });
const FruitBasket = dynamic(() => import("@/components/games/tier1/sliding-window/games/FruitBasket"), { ssr: false, loading: () => <GameLoader /> });
const MaxSlider = dynamic(() => import("@/components/games/tier1/sliding-window/games/MaxSlider"), { ssr: false, loading: () => <GameLoader /> });
const RainCatcher = dynamic(() => import("@/components/games/tier1/sliding-window/games/RainCatcher"), { ssr: false, loading: () => <GameLoader /> });
const KSwaps = dynamic(() => import("@/components/games/tier1/sliding-window/games/KSwaps"), { ssr: false, loading: () => <GameLoader /> });
const AllAnagrams = dynamic(() => import("@/components/games/tier1/sliding-window/games/AllAnagrams"), { ssr: false, loading: () => <GameLoader /> });

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: TheScanner,
  2: LongestRun,
  3: AnagramHunt,
  4: FruitBasket,
  5: MaxSlider,
  6: RainCatcher,
  7: KSwaps,
  8: AllAnagrams,
};

const MODULE_HREF = "/learn/tier1/sliding-window";

export default function ProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = SW_PROBLEMS.find(p => p.index === idx) ?? null;

  const supabase = createClient();
  const [dbId, setDbId] = useState<string | null>(null);
  const [solveVisible, setSolveVisible] = useState(false);
  const [algoModalOpen, setAlgoModalOpen] = useState(false);
  const [algoAutoClose, setAlgoAutoClose] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitSolve, incrementAttempts, attemptData, startAttempt } =
    useProblemAttempt(dbId, "sliding-window");

  useEffect(() => {
    if (!problem) return;
    async function loadId() {
      const { data } = await supabase
        .from("problems")
        .select("id")
        .eq("pattern_slug", "sliding-window")
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

  const handleSolve = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitSolve(0);
    setSolveVisible(true);
  };

  const handleAttempt = async () => {
    setAttempts(a => a + 1);
    await incrementAttempts();
  };

  if (!problem) return <div style={{ minHeight: "100vh", background: "var(--bg-0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}><span style={{ color: "#ff5a7a", fontSize: 12 }}>Problem not found.</span></div>;

  const GameComponent = GAME_MAP[idx];

  return (
    <div style={{ height: "100vh", background: "var(--bg-0)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <GameTopBar
        moduleTitle="Sliding Window"
        moduleHref="/learn/tier1/sliding-window"
        pattern="SLIDING WINDOW"
        problemIndex={idx}
        problemTitle={problem.title}
        difficulty={problem.difficulty}
        lcRef={problem.leetcodeRef ?? undefined}
        elapsed={elapsed}
        solved={attemptData.solved || solveVisible}
        onLearnAlgo={() => { setAlgoAutoClose(false); setAlgoModalOpen(true); }}
      />

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {GameComponent ? (
          <GameComponent onSolve={handleSolve} onAttempt={handleAttempt} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-4)", fontSize: 12 }}>Game not available.</div>
        )}
      </div>

      <AlgoModal open={algoModalOpen} onClose={() => { setAlgoModalOpen(false); setAlgoAutoClose(false); }} mechanic={problem.mechanic} autoClose={algoAutoClose} />

      {solveVisible && (
        <SolvePanel
          insightTitle={problem.insightTitle}
          insight={problem.insight}
          moduleHref="/learn/tier1/sliding-window"
          problemIndex={idx}
          nextHref={idx < 8 ? `/learn/tier1/sliding-window/${idx + 1}` : null}
          onClose={() => setSolveVisible(false)}
        />
      )}
    </div>
  );
}