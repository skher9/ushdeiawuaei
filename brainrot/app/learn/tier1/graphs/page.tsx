"use client";
import GraphsHub from "@/components/games/tier1/graphs/GraphsHub";

export default function GraphsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "0 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <GraphsHub />
      </div>
    </div>
  );
}
