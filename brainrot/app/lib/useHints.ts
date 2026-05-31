"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useHints(slug: string) {
  const [hintsUsed, setHintsUsed] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_hints")
        .select("hints_used")
        .eq("user_id", user.id)
        .eq("pattern_slug", slug)
        .maybeSingle();
      if (data && !cancelled) setHintsUsed(data.hints_used);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const useHint = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = hintsUsed + 1;
    setHintsUsed(next);
    await supabase.from("user_hints").upsert(
      { user_id: user.id, pattern_slug: slug, hints_used: next },
      { onConflict: "user_id,pattern_slug" }
    );
  }, [supabase, slug, hintsUsed]);

  return { hintsUsed, useHint };
}
