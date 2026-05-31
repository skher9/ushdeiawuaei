"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BT_PROBLEMS } from "@/components/games/tier1/backtracking/problems";
import ModuleHubShell from "@/components/games/shared/ModuleHubShell";

interface AttemptRow { problem_id: string; solved: boolean; attempts: number; }
interface DBProblem { id: string; order_index: number; }

export default function BacktrackingHub() {
  const supabase = createClient();
  const [dbProblems, setDbProblems] = useState<DBProblem[]>([]);
  const [attempts, setAttempts] = useState<Map<string, AttemptRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: probs } = await supabase
        .from("problems")
        .select("id, order_index")
        .eq("pattern_slug", "backtracking")
        .order("order_index");

      if (!probs) { setLoading(false); return; }
      setDbProblems(probs);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const ids = probs.map((p: DBProblem) => p.id);
      const { data: attRows } = await supabase
        .from("user_problem_attempts")
        .select("problem_id, solved, attempts")
        .eq("user_id", user.id)
        .in("problem_id", ids);

      if (attRows) {
        const map = new Map<string, AttemptRow>();
        for (const r of attRows) map.set(r.problem_id, r);
        setAttempts(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const idByIndex = new Map(dbProblems.map(p => [p.order_index, p.id]));

  const solvedIndices = new Set(
    BT_PROBLEMS.filter(p => {
      const id = idByIndex.get(p.index);
      return id ? attempts.get(id)?.solved : false;
    }).map(p => p.index)
  );

  const attemptCounts = new Map(
    BT_PROBLEMS.map(p => {
      const id = idByIndex.get(p.index);
      return [p.index, id ? (attempts.get(id)?.attempts ?? 0) : 0] as [number, number];
    })
  );

  return (
    <ModuleHubShell
      moduleTitle="Backtracking"
      moduleDesc="8 games. Place, conflict, retreat. From N-Queens to Sudoku — the wrong move sends you back."
      tierLabel="TIER I · PATTERN 5"
      patternTag="TIER I · RECURSION"
      accent="var(--cyan)"
      problems={BT_PROBLEMS.map(p => ({
        index: p.index,
        title: p.title,
        difficulty: p.difficulty,
        leetcodeRef: p.leetcodeRef ?? undefined,
      }))}
      solvedIndices={solvedIndices}
      attemptCounts={attemptCounts}
      hrefBase="/learn/tier1/backtracking"
      loading={loading}
    />
  );
}
