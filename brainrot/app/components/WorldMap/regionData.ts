export const WORLD_W = 4000;
export const WORLD_H = 3000;

export interface RegionDef {
  id: string;
  roman: string;
  name: string;
  subname: string;
  href: string;
  xp: number;
  totalLevels: number;
  description: string;
  /** World center coordinates */
  wx: number;
  wy: number;
  /** What must be solved (completedSteps >= 1) to unlock this */
  unlockRequires: string | null;
  /** Decorative icon emoji */
  icon: string;
  /** Unique blob shape via border-radius */
  blobRadius: string;
}

export const REGIONS: RegionDef[] = [
  {
    id: "binary-search",
    roman: "I",
    name: "Binary Search",
    subname: "Search City",
    href: "/learn/tier1/binary-search",
    xp: 320,
    totalLevels: 8,
    description: "Eliminate half the search space with every step.",
    wx: 600, wy: 500,
    unlockRequires: null,
    icon: "🔍",
    blobRadius: "58% 42% 65% 35% / 52% 61% 39% 48%",
  },
  {
    id: "two-pointers",
    roman: "II",
    name: "Two Pointers",
    subname: "Pointer Docks",
    href: "/learn/tier1/two-pointers",
    xp: 280,
    totalLevels: 8,
    description: "Two ends converge on the answer in a single pass.",
    wx: 1100, wy: 400,
    unlockRequires: null,
    icon: "↔",
    blobRadius: "45% 55% 38% 62% / 60% 44% 56% 40%",
  },
  {
    id: "sliding-window",
    roman: "III",
    name: "Sliding Window",
    subname: "Scanner District",
    href: "/learn/tier1/sliding-window",
    xp: 300,
    totalLevels: 8,
    description: "A frame that expands and contracts as it scans.",
    wx: 1600, wy: 500,
    unlockRequires: null,
    icon: "▭",
    blobRadius: "55% 45% 42% 58% / 48% 55% 45% 52%",
  },
  {
    id: "graphs",
    roman: "IV",
    name: "Graphs · BFS/DFS",
    subname: "Graph Jungle",
    href: "/learn/tier1/graphs",
    xp: 380,
    totalLevels: 8,
    description: "Flood fill, shortest paths, connected components.",
    wx: 2100, wy: 450,
    unlockRequires: null,
    icon: "◎",
    blobRadius: "62% 38% 50% 50% / 45% 62% 38% 55%",
  },
  {
    id: "trees",
    roman: "V",
    name: "Trees & BST",
    subname: "Tree Temple",
    href: "/learn/tier1/trees",
    xp: 380,
    totalLevels: 8,
    description: "Insert, search, traverse — the recursive structure.",
    wx: 1100, wy: 900,
    unlockRequires: null,
    icon: "⟁",
    blobRadius: "40% 60% 55% 45% / 58% 42% 62% 38%",
  },
  {
    id: "backtracking",
    roman: "VI",
    name: "Backtracking",
    subname: "Palace Ruins",
    href: "/learn/tier1/backtracking",
    xp: 360,
    totalLevels: 8,
    description: "Place, conflict, retreat — prune before you dive.",
    wx: 1600, wy: 1000,
    unlockRequires: null,
    icon: "↺",
    blobRadius: "52% 48% 60% 40% / 42% 58% 44% 56%",
  },
  {
    id: "tries",
    roman: "VII",
    name: "Tries",
    subname: "Trie Archives",
    href: "/learn/tier1/tries",
    xp: 360,
    totalLevels: 8,
    description: "The prefix tree behind autocomplete and search.",
    wx: 2100, wy: 950,
    unlockRequires: null,
    icon: "⌥",
    blobRadius: "38% 62% 48% 52% / 55% 40% 60% 45%",
  },
  {
    id: "dynamic-programming",
    roman: "VIII",
    name: "Dynamic Programming",
    subname: "DP Lab",
    href: "/learn/tier1/dynamic-programming",
    xp: 420,
    totalLevels: 8,
    description: "Fill the table. See the dependencies. Optimal.",
    wx: 1600, wy: 1500,
    unlockRequires: null,
    icon: "▦",
    blobRadius: "48% 52% 45% 55% / 60% 45% 55% 40%",
  },
  {
    id: "arena",
    roman: "ARENA",
    name: "Interview Arena",
    subname: "Final Gate",
    href: "/learn/tier1/binary-search", // placeholder
    xp: 0,
    totalLevels: 0,
    description: "Mixed-topic mode. Pattern hidden. Identify and survive.",
    wx: 2600, wy: 1200,
    unlockRequires: null, // special: needs 3 completed
    icon: "⚔",
    blobRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
  },
];

/** Connections: [from id, to id] */
export const CONNECTIONS: [string, string][] = [
  ["binary-search", "two-pointers"],
  ["two-pointers", "sliding-window"],
  ["sliding-window", "graphs"],
  ["two-pointers", "trees"],
  ["trees", "backtracking"],
  ["backtracking", "tries"],
  ["backtracking", "dynamic-programming"],
  ["graphs", "arena"],
  ["tries", "arena"],
];
