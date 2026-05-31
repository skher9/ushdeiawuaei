"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import NumberSmuggler from "@/components/games/tier1/binary-search/SearchCity/smuggler/NumberSmuggler";
import type { StarCount } from "@/components/games/tier1/binary-search/SearchCity/types";

function saveProgress(levelNum: number, stars: StarCount) {
  const current = parseInt(localStorage.getItem("sc_smuggler_levels") ?? "0", 10);
  if (levelNum > current) localStorage.setItem("sc_smuggler_levels", String(levelNum));
  const existing = parseInt(localStorage.getItem(`sc_smuggler_level_${levelNum}_stars`) ?? "0", 10);
  if (stars > existing) localStorage.setItem(`sc_smuggler_level_${levelNum}_stars`, String(stars));
}

/* Detect if arriving from a completed level (page curl entrance) */
function useFromComplete() {
  const fromComplete = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      fromComplete.current = sessionStorage.getItem("sc_from_complete") === "smuggler";
      sessionStorage.removeItem("sc_from_complete");
    }
  }, []);
  return fromComplete.current;
}

export default function SmugglerLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = use(params);
  const levelNum = parseInt(level, 10);
  const router = useRouter();

  if (isNaN(levelNum) || levelNum < 1 || levelNum > 8) {
    router.replace("/learn/tier1/binary-search/smuggler");
    return null;
  }

  function handleComplete({ stars }: { stars: StarCount; xpEarned: number }) {
    saveProgress(levelNum, stars);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sc_from_complete", "smuggler");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ perspective: 1200 }}
    >
      <NumberSmuggler
        levelNum={levelNum}
        onComplete={handleComplete}
        onBack={() => router.push("/learn/tier1/binary-search/smuggler")}
      />
    </motion.div>
  );
}
