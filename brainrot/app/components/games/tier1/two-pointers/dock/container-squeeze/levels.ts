export type SqueezeMode =
  | "explore"    // try pairs manually, then two-pointer (L1)
  | "guided"     // game shows which pointer to move (L2)
  | "player"     // player makes all decisions (L3)
  | "rain_trap"  // trapping rain water (L4)
  | "shrinking"  // walls disappear over time (L5)
  | "build"      // player sets wall heights (L6)
  | "multi"      // three containers side by side (L7)
  | "boss";      // five mixed panels (L8)

export interface SqueezeLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: SqueezeMode;
  heights: number[];
  targetVolume?: number;  // for build mode
  optimalMoves: number;
}

export const SQUEEZE_LEVELS: SqueezeLevel[] = [
  {
    level: 1,
    caseTitle: "Find the Biggest Tank",
    storyBeat: "Two walls trap water between them. Volume = distance × shorter wall. Find the biggest tank.",
    ahaTitle: "Always Move the Shorter Wall",
    ahaBody: "Moving the taller wall can only decrease or maintain area — never improve it (shorter wall is still the limiting factor). Moving the shorter wall CAN find a taller wall that beats the current best. This greedy insight gives O(n).",
    xpBase: 55,
    mode: "explore",
    heights: [1, 8, 6, 2, 5, 4, 8, 3],
    optimalMoves: 7,
  },
  {
    level: 2,
    caseTitle: "Move the Right Wall",
    storyBeat: "The dock supervisor tells you which wall to move. Learn the rule before flying solo.",
    ahaTitle: "The Decision Rule",
    ahaBody: "heights[L] < heights[R] → move L inward (left wall is shorter, so it limits us). heights[L] >= heights[R] → move R inward. This single comparison makes every move optimal.",
    xpBase: 60,
    mode: "guided",
    heights: [4, 3, 2, 1, 4, 6, 7, 1],
    optimalMoves: 7,
  },
  {
    level: 3,
    caseTitle: "Player Decides",
    storyBeat: "No guidance. You make all pointer decisions. Optimal decisions earn 3 stars.",
    ahaTitle: "Greedy Correctness Proof",
    ahaBody: "For any pair (L, R), if h[L] < h[R], all pairs (L, R-1), (L, R-2)... can't beat current area (same or shorter L side, shorter width). So we safely discard R and move L — no information lost.",
    xpBase: 70,
    mode: "player",
    heights: [1, 2, 4, 3, 6, 7, 4, 2, 5],
    optimalMoves: 8,
  },
  {
    level: 4,
    caseTitle: "Trap the Rain",
    storyBeat: "Rain is coming. Each bar traps water based on its neighbors' heights.",
    ahaTitle: "Trapping Rain Water — Different Problem",
    ahaBody: "Water at position i = min(maxLeft, maxRight) - height[i]. Track maxLeft and maxRight from both ends. When maxLeft < maxRight: process left side (water = maxLeft - h[L]). Total complexity O(n), O(1) space.",
    xpBase: 85,
    mode: "rain_trap",
    heights: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
    optimalMoves: 12,
  },
  {
    level: 5,
    caseTitle: "Shrinking Dock",
    storyBeat: "The dock is flooding. Walls sink every 10 seconds. Keep finding the max tank.",
    ahaTitle: "Re-applying the Algorithm",
    ahaBody: "When the array changes (a wall disappears), re-run two pointers from scratch — O(n) again. The algorithm is stateless: no memoization needed. This mirrors real-world dynamic problems where you re-query on each update.",
    xpBase: 90,
    mode: "shrinking",
    heights: [2, 9, 4, 8, 6, 7, 3, 1],
    optimalMoves: 7,
  },
  {
    level: 6,
    caseTitle: "Build the Optimal Dock",
    storyBeat: "You choose the wall heights. Achieve the target storage volume.",
    ahaTitle: "Intuition: Width × Min Height",
    ahaBody: "To maximize water: maximize both distance and minimum height. Best strategy: tall walls far apart. Two very tall walls at both ends achieves near-maximum. This is why greedy always moves inward — we want to preserve our best tall walls as long as possible.",
    xpBase: 90,
    mode: "build",
    heights: [1, 1, 1, 1, 1, 1, 1, 1],
    targetVolume: 24,
    optimalMoves: 8,
  },
  {
    level: 7,
    caseTitle: "Multiple Containers",
    storyBeat: "Three separate docks. Find the maximum tank in all three within 60 seconds.",
    ahaTitle: "O(n) × 3 = Still O(n)",
    ahaBody: "Three independent two-pointer runs. Total O(n₁ + n₂ + n₃) — linear in combined input size. This is how multi-query systems work: sort once, apply two pointers per query.",
    xpBase: 100,
    mode: "multi",
    heights: [1, 8, 6, 2, 5, 4, 8, 3],
    optimalMoves: 20,
  },
  {
    level: 8,
    caseTitle: "The Flood",
    storyBeat: "Storm surge. 90 seconds to optimize 5 container configurations. Fail = dock floods.",
    ahaTitle: "Two Pointers: Universal O(n) Tool",
    ahaBody: "Two pointers solve: pair sums, container water, trapping rain, removing duplicates, palindrome check, partitioning — all O(n), O(1) space. One mental model replacing dozens of brute-force approaches.",
    xpBase: 140,
    mode: "boss",
    heights: [1, 8, 6, 2, 5, 4, 8, 3],
    optimalMoves: 35,
  },
];
