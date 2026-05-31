"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ContainerSqueeze from "@/components/games/tier1/two-pointers/dock/container-squeeze/ContainerSqueeze";
import type { StarCount } from "@/components/games/tier1/two-pointers/dock/types";

function saveProgress(levelNum: number, stars: StarCount) {
  const current = parseInt(localStorage.getItem("pd_container-squeeze_levels") ?? "0", 10);
  if (levelNum > current) localStorage.setItem("pd_container-squeeze_levels", String(levelNum));
  const existing = parseInt(localStorage.getItem(`pd_container-squeeze_level_${levelNum}_stars`) ?? "0", 10);
  if (stars > existing) localStorage.setItem(`pd_container-squeeze_level_${levelNum}_stars`, String(stars));
}

export default function ContainerSqueezeLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = use(params);
  const levelNum = parseInt(level, 10);
  const router = useRouter();

  if (isNaN(levelNum) || levelNum < 1 || levelNum > 8) {
    router.replace("/learn/tier1/two-pointers/container-squeeze");
    return null;
  }

  function handleComplete({ stars }: { stars: StarCount; xpEarned: number }) {
    saveProgress(levelNum, stars);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ perspective: 1200 }}
    >
      <ContainerSqueeze
        levelNum={levelNum}
        onComplete={handleComplete}
        onBack={() => router.push("/learn/tier1/two-pointers/container-squeeze")}
      />
    </motion.div>
  );
}
