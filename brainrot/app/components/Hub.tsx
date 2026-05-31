"use client";

import { useState, useEffect } from "react";
import { useXP } from "@/lib/xpContext";
import { createClient } from "@/lib/supabase/client";
import SettingsModal from "@/components/SettingsModal";
import WorldMap, { type RegionProgress } from "@/components/WorldMap";

export default function Hub({ onLogout }: { onLogout: () => void }) {
  const { xp, streak, level } = useXP();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [progress, setProgress] = useState<RegionProgress>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const u = data.user;
      setEmail(u.email ?? "");
      setDisplayName(
        u.user_metadata?.display_name ||
        u.user_metadata?.full_name ||
        u.email?.split("@")[0] || ""
      );

      // Fetch all module progress in one query
      supabase
        .from("user_progress")
        .select("topic_slug, completed_steps, total_steps")
        .eq("user_id", u.id)
        .then(({ data: rows }) => {
          if (!rows) return;
          const map: RegionProgress = {};
          for (const row of rows) {
            map[row.topic_slug] = { done: row.completed_steps, total: row.total_steps };
          }
          setProgress(map);
        });
    });
  }, []);

  const initials = (displayName || email)[0]?.toUpperCase() ?? "?";

  return (
    <>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
      />
      <WorldMap
        progress={progress}
        xp={xp}
        streak={streak}
        level={level}
        initials={initials}
        email={email}
        onSettings={() => setSettingsOpen(true)}
        onLogout={onLogout}
      />
    </>
  );
}
