export type ClockMode =
  | "guided_find"
  | "player_decide"
  | "unknown_pivot"
  | "double_rotation"
  | "time_attack"
  | "find_pivot"
  | "duplicates"
  | "boss";

export interface ClockProblem {
  array: number[];
  target: number;
}

export interface ClockLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: ClockMode;
  problems: ClockProblem[];   // 1 problem normally, 5 for time_attack, 5 for boss
  timePerProblem?: number;    // seconds (time_attack mode)
}

function rotated(start: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => ((start + i - 1) % n) + 1);
}

export const CLOCK_LEVELS: ClockLevel[] = [
  {
    level: 1,
    caseTitle: "The Tampered Clock",
    storyBeat: "The city clock was tampered with. The hours still run in order — but they start from the middle. Find hour 2.",
    ahaTitle: "Rotated Array: Which Half Is Sorted?",
    ahaBody: "Key insight: In a rotated sorted array, at least ONE half is always fully sorted. Check if arr[lo] ≤ arr[mid] — if yes, left half is sorted. Is target in [arr[lo], arr[mid])? Search left. Otherwise search right.",
    xpBase: 50,
    mode: "guided_find",
    problems: [{ array: [4, 5, 6, 7, 1, 2, 3], target: 2 }],
  },
  {
    level: 2,
    caseTitle: "No Guidance",
    storyBeat: "The same trick, but no hints this time. You decide which half to search. Think: which half is sorted? Is the target in it?",
    ahaTitle: "Decide Which Half",
    ahaBody: "The decision rule: if arr[mid] ≥ arr[lo], left half is sorted — binary search it for target. Otherwise right half is sorted — binary search that. This runs in O(log n) even on rotated arrays.",
    xpBase: 60,
    mode: "player_decide",
    problems: [
      { array: [6, 7, 8, 1, 2, 3, 4, 5], target: 8 },
      { array: [3, 4, 5, 6, 1, 2], target: 1 },
      { array: [5, 6, 7, 8, 9, 1, 2, 3, 4], target: 7 },
    ],
  },
  {
    level: 3,
    caseTitle: "Where Did It Break?",
    storyBeat: "You don't know where the rotation happened. You must deduce the pivot through guesses while also finding the target.",
    ahaTitle: "Unknown Pivot",
    ahaBody: "You don't need to find the pivot first — the algorithm naturally handles it. At each mid: if arr[mid] ≥ arr[lo], left is sorted; else right is sorted. Proceed without ever explicitly finding the pivot.",
    xpBase: 70,
    mode: "unknown_pivot",
    problems: [
      { array: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], target: 11 },
      { array: [10, 12, 15, 1, 4, 6, 8], target: 4 },
    ],
  },
  {
    level: 4,
    caseTitle: "The Double Tamper",
    storyBeat: "The Clockmaker tampered TWICE. Two pivot points. Your usual trick may not apply — think carefully.",
    ahaTitle: "Two Pivots",
    ahaBody: "With two pivots, neither half is guaranteed fully sorted. You must check tighter bounds: is arr[mid] ≥ arr[lo] AND arr[mid] ≤ arr[hi]? A true sorted half satisfies both. This edge case appears in interviews.",
    xpBase: 80,
    mode: "double_rotation",
    problems: [
      { array: [6, 7, 1, 2, 3, 8, 9, 4, 5], target: 9 },
    ],
  },
  {
    level: 5,
    caseTitle: "Speed Round",
    storyBeat: "Five rotated clocks, 8 seconds each. Trust your instincts, detective.",
    ahaTitle: "Intuition for Rotated Search",
    ahaBody: "After enough practice, the check becomes instant: mid ≥ lo → left sorted → is target in [lo, mid)? The decision is a single comparison. Real interview answers should happen in under 2 minutes.",
    xpBase: 90,
    mode: "time_attack",
    timePerProblem: 8,
    problems: [
      { array: [4, 5, 6, 7, 0, 1, 2], target: 0 },
      { array: [6, 7, 8, 1, 2, 3, 4, 5], target: 3 },
      { array: [3, 4, 5, 6, 1, 2], target: 6 },
      { array: [7, 8, 9, 1, 2, 3, 4, 5, 6], target: 9 },
      { array: [2, 3, 4, 5, 6, 7, 0, 1], target: 4 },
    ],
  },
  {
    level: 6,
    caseTitle: "Find the Fracture",
    storyBeat: "Don't find the hour — find WHERE the clock broke. Find the minimum element (the rotation point).",
    ahaTitle: "Finding the Pivot (Minimum Element)",
    ahaBody: "If arr[mid] > arr[hi], the rotation point is in [mid+1, hi]. Otherwise it's in [lo, mid]. This is binary search for the minimum in a rotated array — O(log n), also used to find 'where did sorted order break?'",
    xpBase: 90,
    mode: "find_pivot",
    problems: [
      { array: [4, 5, 6, 7, 1, 2, 3], target: 1 },  // target = minimum (pivot)
      { array: [3, 4, 5, 1, 2], target: 1 },
      { array: [6, 7, 8, 1, 2, 3, 4, 5], target: 1 },
    ],
  },
  {
    level: 7,
    caseTitle: "Duplicate Hours",
    storyBeat: "The Clockmaker added forgeries — duplicate values. Your usual binary search breaks. Can you handle it?",
    ahaTitle: "Duplicates Break Binary Search",
    ahaBody: "When arr[mid] === arr[lo], you can't tell which half is sorted. The fallback: shrink the window by one (lo++). This degrades worst-case to O(n) but handles duplicates correctly. Real systems use this for 'search in rotated array with duplicates' (LC 81).",
    xpBase: 100,
    mode: "duplicates",
    problems: [
      { array: [2, 2, 3, 4, 2], target: 3 },
      { array: [1, 3, 1, 1, 1], target: 3 },
    ],
  },
  {
    level: 8,
    caseTitle: "The Clockmaker's Vault",
    storyBeat: "Find 5 targets in sequence inside one rotated array. Each target reveals a digit of the vault combination. Time decreases with each find.",
    ahaTitle: "Repeated Rotated Search",
    ahaBody: "Five binary searches on the same rotated array. Each is independent O(log n). The array doesn't change — only the target. This is the foundation of database index range scans on partitioned (rotated) data.",
    xpBase: 130,
    mode: "boss",
    problems: [
      { array: [6, 7, 8, 9, 1, 2, 3, 4, 5], target: 7 },
      { array: [6, 7, 8, 9, 1, 2, 3, 4, 5], target: 2 },
      { array: [6, 7, 8, 9, 1, 2, 3, 4, 5], target: 9 },
      { array: [6, 7, 8, 9, 1, 2, 3, 4, 5], target: 4 },
      { array: [6, 7, 8, 9, 1, 2, 3, 4, 5], target: 6 },
    ],
  },
];
