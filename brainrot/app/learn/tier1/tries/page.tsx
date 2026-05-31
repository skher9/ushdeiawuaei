"use client";
import TriesHub from "@/components/games/tier1/tries/TriesHub";
export default function TriesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "0 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <TriesHub />
      </div>
    </div>
  );
}
