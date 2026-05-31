"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AttemptData {
  solved: boolean;
  hintsUsed: number;
  attempts: number;
  timeTakenSeconds: number | null;
  solvedAt: string | null;
}

export function useProblemAttempt(problemId: string | null, patternSlug: string) {
  const supabase = createClient();
  const startTimeRef = useRef<number | null>(null);
  const [attemptData, setAttemptData] = useState<AttemptData>({
    solved: false,
    hintsUsed: 0,
    attempts: 0,
    timeTakenSeconds: null,
    solvedAt: null,
  });

  useEffect(() => {
    if (!problemId) return;
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("user_problem_attempts")
        .select("solved, hints_used, attempts, time_taken_seconds, solved_at")
        .eq("user_id", user.id)
        .eq("problem_id", problemId)
        .maybeSingle();
      if (data && !cancelled) {
        setAttemptData({
          solved: data.solved,
          hintsUsed: data.hints_used,
          attempts: data.attempts,
          timeTakenSeconds: data.time_taken_seconds,
          solvedAt: data.solved_at,
        });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [problemId]);

  const startAttempt = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const submitSolve = useCallback(async (hintsUsed: number) => {
    if (!problemId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const timeTaken = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : null;
    const solvedAt = new Date().toISOString();

    await supabase.from("user_problem_attempts").upsert(
      {
        user_id: user.id,
        problem_id: problemId,
        solved: true,
        hints_used: hintsUsed,
        attempts: attemptData.attempts + 1,
        time_taken_seconds: timeTaken,
        solved_at: solvedAt,
      },
      { onConflict: "user_id,problem_id" }
    );

    setAttemptData(prev => ({
      ...prev,
      solved: true,
      hintsUsed,
      attempts: prev.attempts + 1,
      timeTakenSeconds: timeTaken,
      solvedAt,
    }));
  }, [problemId, supabase, attemptData.attempts]);

  const incrementAttempts = useCallback(async () => {
    if (!problemId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = attemptData.attempts + 1;
    await supabase.from("user_problem_attempts").upsert(
      { user_id: user.id, problem_id: problemId, attempts: next },
      { onConflict: "user_id,problem_id" }
    );
    setAttemptData(prev => ({ ...prev, attempts: next }));
  }, [problemId, supabase, attemptData.attempts]);

  return { startAttempt, submitSolve, incrementAttempts, attemptData };
}
