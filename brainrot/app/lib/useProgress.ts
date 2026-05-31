"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProgressState {
  completedSteps: number;
  totalSteps: number;
  completedAt: string | null;
}

export function useProgress(topicSlug: string, totalSteps: number) {
  const [progress, setProgress] = useState<ProgressState>({
    completedSteps: 0,
    totalSteps,
    completedAt: null,
  });
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_progress")
        .select("completed_steps, total_steps, completed_at")
        .eq("user_id", user.id)
        .eq("topic_slug", topicSlug)
        .maybeSingle();
      if (data && !cancelled) {
        setProgress({
          completedSteps: data.completed_steps,
          totalSteps: data.total_steps,
          completedAt: data.completed_at,
        });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [topicSlug, totalSteps]);

  const upsert = useCallback(async (completedSteps: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const completedAt = completedSteps >= totalSteps ? new Date().toISOString() : null;
    await supabase.from("user_progress").upsert({
      user_id: user.id,
      topic_slug: topicSlug,
      completed_steps: completedSteps,
      total_steps: totalSteps,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,topic_slug" });
    setProgress({ completedSteps, totalSteps, completedAt });
  }, [supabase, topicSlug, totalSteps]);

  return { progress, upsert };
}
