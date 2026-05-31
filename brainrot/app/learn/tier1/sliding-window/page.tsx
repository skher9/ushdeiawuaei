"use client";
import SlidingWindowHub from "@/components/games/tier1/sliding-window/SlidingWindowHub";
export default function SlidingWindowPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "0 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <SlidingWindowHub />
      </div>
    </div>
  );
}
