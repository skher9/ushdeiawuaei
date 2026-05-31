export type CargoMode =
  | "standard"       // single pair, guided (L1)
  | "all_pairs"      // find all pairs (L2)
  | "three_sum"      // fixed + two-pointer 3Sum (L3)
  | "fog"            // values hidden until pointer touches (L4)
  | "moving_target"  // target changes every 30s (L5)
  | "sort_first"     // sort array before finding pair (L6)
  | "closest"        // find pair closest to target (L7)
  | "boss";          // 4 simultaneous problems (L8)

export interface CargoLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: CargoMode;
  array: number[];         // sorted
  target: number;
  optimalMoves: number;    // pointer moves to find first pair
  guided?: boolean;        // show hint arrows
  timerPerTarget?: number; // seconds (moving_target)
  bossProblems?: { array: number[]; target: number }[];
}

export const CARGO_LEVELS: CargoLevel[] = [
  {
    level: 1,
    caseTitle: "First Shipment",
    storyBeat: "Two cranes, one manifest. Find the two crates that together weigh exactly 9 tons.",
    ahaTitle: "Classic Two Pointers",
    ahaBody: "If sum > target: move right pointer left (smaller value). If sum < target: move left pointer right (larger value). You never backtrack — O(n) total moves, not O(n²) brute-force checks.",
    xpBase: 40,
    mode: "standard",
    array: [2, 3, 5, 6, 8, 11],
    target: 9,
    optimalMoves: 4,
    guided: true,
  },
  {
    level: 2,
    caseTitle: "Multiple Manifests",
    storyBeat: "The manifest has 4 shipments. Find all pairs.",
    ahaTitle: "Continuing After a Match",
    ahaBody: "When a pair is found, advance BOTH pointers inward — the found pair can't contribute to another. Keep searching. This finds all pairs in O(n) without revisiting.",
    xpBase: 55,
    mode: "all_pairs",
    array: [1, 2, 3, 4, 5, 6, 7, 8],
    target: 9,
    optimalMoves: 7,
  },
  {
    level: 3,
    caseTitle: "Three Cranes",
    storyBeat: "Three shipments, three cranes. The foreman fixed the first crane — you control the other two.",
    ahaTitle: "3Sum: Fix + Two Pointers",
    ahaBody: "Fix one element (iterate with a for-loop), then run two-pointer on the rest. Total complexity: O(n²). Sort first to group duplicates — skip same values to avoid repeat triplets.",
    xpBase: 70,
    mode: "three_sum",
    array: [-4, -1, -1, 0, 1, 2],
    target: 0,
    optimalMoves: 8,
  },
  {
    level: 4,
    caseTitle: "Encrypted Manifest",
    storyBeat: "The manifest is encrypted. Crate weights are hidden until a crane reaches them.",
    ahaTitle: "Algorithm Without Visual Scan",
    ahaBody: "Brute force scans the whole array for candidates. Two pointers only need the current left and right values. Even blind — trusting the algorithm beats scanning everything.",
    xpBase: 75,
    mode: "fog",
    array: [1, 2, 4, 5, 7, 9, 11, 13],
    target: 14,
    optimalMoves: 5,
  },
  {
    level: 5,
    caseTitle: "Moving Target",
    storyBeat: "The manifest keeps updating. Target weight changes every 30 seconds. Find as many pairs as possible.",
    ahaTitle: "Speed Iteration",
    ahaBody: "Two pointers reset cleanly for each new target. O(n) per target means you can handle thousands of queries on the same sorted array — a common database query pattern.",
    xpBase: 85,
    mode: "moving_target",
    array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    target: 7,
    optimalMoves: 4,
    timerPerTarget: 30,
  },
  {
    level: 6,
    caseTitle: "Unsorted Dock",
    storyBeat: "The new dock worker didn't sort the crates. Fix it before the crane operators start.",
    ahaTitle: "Sort First — The Hidden Prerequisite",
    ahaBody: "Two pointers REQUIRE a sorted array. O(n log n) sort + O(n) scan = O(n log n) total — still beats O(n²) brute force. Never forget to sort first.",
    xpBase: 85,
    mode: "sort_first",
    array: [5, 1, 8, 3, 7, 2, 9, 4],
    target: 10,
    optimalMoves: 5,
  },
  {
    level: 7,
    caseTitle: "Closest Pair",
    storyBeat: "Can't find an exact match. Find the pair closest to the target weight.",
    ahaTitle: "Closest Sum — Same Pointer Logic",
    ahaBody: "Track the minimum |sum - target| as pointers move. The same decision rule holds: sum > target → R--, sum < target → L++. When sum equals target, that's the perfect minimum (diff = 0).",
    xpBase: 95,
    mode: "closest",
    array: [1, 2, 4, 5, 8, 11, 14],
    target: 13,
    optimalMoves: 5,
  },
  {
    level: 8,
    caseTitle: "The Midnight Manifest",
    storyBeat: "The entire dock needs clearing before dawn. Four manifests, four targets. All four must be solved.",
    ahaTitle: "Two Pointers at Scale",
    ahaBody: "Four independent O(n) searches. Switching between parallel searches doesn't hurt — each is self-contained with its own L and R. This mirrors multi-query database engines: sort once, query many times.",
    xpBase: 130,
    mode: "boss",
    array: [1, 3, 5, 7, 9, 11],
    target: 12,
    optimalMoves: 3,
    bossProblems: [
      { array: [1, 3, 5, 7, 9, 11], target: 12 },
      { array: [2, 4, 6, 8, 10],   target: 14 },
      { array: [1, 2, 4, 5, 8, 11], target: 9 },
      { array: [3, 6, 9, 12, 15],   target: 18 },
    ],
  },
];
