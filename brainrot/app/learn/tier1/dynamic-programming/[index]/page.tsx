"use client";
import { use, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProblemAttempt } from "@/hooks/useProblemAttempt";
import { DP_PROBLEMS } from "@/components/games/tier1/dynamic-programming/problems";
import dynamic from "next/dynamic";
import type { GameProps } from "@/components/games/tier1/dynamic-programming/types";
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

const FrogLeap = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/FrogLeap"), { ssr: false, loading: () => <GameLoader /> });
const VaultCracker = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/VaultCracker"), { ssr: false, loading: () => <GameLoader /> });
const CoinForge = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/CoinForge"), { ssr: false, loading: () => <GameLoader /> });
const GeneSplice = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/GeneSplice"), { ssr: false, loading: () => <GameLoader /> });
const LootPack = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/LootPack"), { ssr: false, loading: () => <GameLoader /> });
const PixelPath = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/PixelPath"), { ssr: false, loading: () => <GameLoader /> });
const WordWarp = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/WordWarp"), { ssr: false, loading: () => <GameLoader /> });
const MirrorGem = dynamic(() => import("@/components/games/tier1/dynamic-programming/games/MirrorGem"), { ssr: false, loading: () => <GameLoader /> });

const GAME_MAP: Record<number, React.ComponentType<GameProps>> = {
  1: FrogLeap,
  2: VaultCracker,
  3: CoinForge,
  4: GeneSplice,
  5: LootPack,
  6: PixelPath,
  7: WordWarp,
  8: MirrorGem,
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "#22c55e", Medium: "#eab308", Hard: "#ef4444",
};

const ACCENT = "#818cf8";

const S: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
};

export default function ProblemPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = use(params);
  const idx = parseInt(index, 10);
  const problem = DP_PROBLEMS.find(p => p.index === idx) ?? null;

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
    useProblemAttempt(dbId, "dynamic-programming");

  useEffect(() => {
    if (!problem) return;
    async function loadId() {
      const { data } = await supabase
        .from("problems")
        .select("id")
        .eq("pattern_slug", "dynamic-programming")
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
        moduleTitle="Dynamic Programming"
        moduleHref="/learn/tier1/dynamic-programming"
        pattern="DYNAMIC PROGRAMMING"
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
          moduleHref="/learn/tier1/dynamic-programming"
          problemIndex={idx}
          nextHref={idx < 8 ? `/learn/tier1/dynamic-programming/${idx + 1}` : null}
          onClose={() => setSolveVisible(false)}
        />
      )}
    </div>
  );
}