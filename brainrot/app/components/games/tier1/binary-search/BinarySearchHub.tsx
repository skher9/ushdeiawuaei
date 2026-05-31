"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BS_PROBLEMS } from "@/components/games/tier1/binary-search/problems";
import ModuleHubShell from "@/components/games/shared/ModuleHubShell";

interface AttemptRow { problem_id: string; solved: boolean; attempts: number; }
interface DBProblem { id: string; order_index: number; }

export default function BinarySearchHub() {
  const supabase = createClient();
  const [dbProblems, setDbProblems] = useState<DBProblem[]>([]);
  const [attempts, setAttempts] = useState<Map<string, AttemptRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: probs } = await supabase
        .from("problems")
        .select("id, order_index")
        .eq("pattern_slug", "binary-search")
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
    BS_PROBLEMS.filter(p => {
      const id = idByIndex.get(p.index);
      return id ? attempts.get(id)?.solved : false;
    }).map(p => p.index)
  );

  const attemptCounts = new Map(
    BS_PROBLEMS.map(p => {
      const id = idByIndex.get(p.index);
      return [p.index, id ? (attempts.get(id)?.attempts ?? 0) : 0] as [number, number];
    })
  );

  return (
    <ModuleHubShell
      moduleTitle="Binary Search"
      moduleDesc="8 games. Halve the search space every step. From classic arrays to median of two sorted arrays."
      tierLabel="TIER I · PATTERN 1"
      patternTag="TIER I · SEARCH"
      accent="var(--cyan)"
      problems={BS_PROBLEMS.map(p => ({
        index: p.index,
        title: p.title,
        difficulty: p.difficulty,
        leetcodeRef: p.leetcodeRef ?? undefined,
      }))}
      solvedIndices={solvedIndices}
      attemptCounts={attemptCounts}
      hrefBase="/learn/tier1/binary-search"
      loading={loading}
    />
  );
}
