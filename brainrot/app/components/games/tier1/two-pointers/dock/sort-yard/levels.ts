export type SortMode =
  | "red_blue"    // 2-color partition (L1)
  | "dutch_flag"  // 3-color (L2)
  | "bubble"      // adjacent swap sort (L3)
  | "odd_even"    // stable partition (L4)
  | "reverse"     // multiple reversal rounds (L5)
  | "palindrome"  // palindrome check (L6)
  | "dedup"       // remove duplicates in-place (L7)
  | "boss";       // 4 simultaneous panels (L8)

export interface SortLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: SortMode;
  array: number[];
  optimalSwaps: number;
}

export const SORT_LEVELS: SortLevel[] = [
  {
    level: 1,
    caseTitle: "Red and Blue Crates",
    storyBeat: "Red crates go left, blue crates go right. Two workers, opposite ends.",
    ahaTitle: "Partition: The QuickSort Core",
    ahaBody: "Moving left pointer past correct Blues and right pointer past correct Reds, then swapping — this IS the partition step of QuickSort. Two pointers, zero extra space.",
    xpBase: 45,
    mode: "red_blue",
    array: [1, 0, 1, 0, 1, 0, 1, 0],
    optimalSwaps: 4,
  },
  {
    level: 2,
    caseTitle: "Three Colors (Dutch Flag)",
    storyBeat: "Red, white, blue crates. Three workers, three zones.",
    ahaTitle: "Dutch National Flag: Three Pointers",
    ahaBody: "Three pointers: lo (end of reds), mid (scanner), hi (start of blues). When mid sees 0: swap with lo, advance both. When mid sees 2: swap with hi, advance hi only (don't advance mid). When mid sees 1: advance mid.",
    xpBase: 65,
    mode: "dutch_flag",
    array: [2, 0, 2, 1, 1, 0, 2, 0, 1],
    optimalSwaps: 6,
  },
  {
    level: 3,
    caseTitle: "Weight Sort",
    storyBeat: "Sort by weight. Only adjacent pairs can be compared and swapped.",
    ahaTitle: "Why Bubble Sort is O(n²)",
    ahaBody: "Adjacent swaps mean each comparison only moves an element one position. Worst case: n-1 passes × n-1 comparisons = O(n²). Two pointers on sorted arrays avoids this entirely.",
    xpBase: 70,
    mode: "bubble",
    array: [5, 3, 8, 1, 7, 2, 9, 4],
    optimalSwaps: 14,
  },
  {
    level: 4,
    caseTitle: "Odd-Even Split",
    storyBeat: "Odd-numbered crates left, even right. Relative order must be preserved.",
    ahaTitle: "Stable Partition",
    ahaBody: "Simple two-pointer swaps don't preserve relative order (unstable). A stable partition requires a buffer or careful in-place movement. This is why std::stable_partition is O(n log n), not O(n).",
    xpBase: 80,
    mode: "odd_even",
    array: [3, 1, 2, 4, 5, 6, 7, 8],
    optimalSwaps: 6,
  },
  {
    level: 5,
    caseTitle: "Reverse the Dock",
    storyBeat: "Emergency reversal. Swap from both ends until they meet.",
    ahaTitle: "Reversal: O(n/2) Swaps",
    ahaBody: "Two pointers from both ends, swap and advance inward. Exactly ⌊n/2⌋ swaps regardless of array content. Used in: rotate array, reverse words in sentence, palindrome construction.",
    xpBase: 75,
    mode: "reverse",
    array: [1, 2, 3, 4, 5, 6, 7, 8],
    optimalSwaps: 4,
  },
  {
    level: 6,
    caseTitle: "Palindrome Check",
    storyBeat: "Is this cargo sequence a palindrome? Compare from both ends.",
    ahaTitle: "Palindrome in O(n), O(1) Space",
    ahaBody: "Two pointers from both ends, compare and move inward. O(n) time, O(1) space — no extra array needed. Variation: valid palindrome ignores non-alphanumeric characters.",
    xpBase: 80,
    mode: "palindrome",
    array: [1, 2, 3, 4, 3, 2, 1],
    optimalSwaps: 0,
  },
  {
    level: 7,
    caseTitle: "Remove Duplicates",
    storyBeat: "Duplicate crates waste space. Remove them in-place.",
    ahaTitle: "Slow-Fast Pointer Pattern",
    ahaBody: "Slow pointer marks the last unique position. Fast pointer scans ahead. When fast finds a new unique value, slow advances and copies it. Result: unique values packed at front in O(n), O(1) space.",
    xpBase: 90,
    mode: "dedup",
    array: [1, 1, 2, 2, 3, 3, 4, 5, 5, 6],
    optimalSwaps: 6,
  },
  {
    level: 8,
    caseTitle: "The Great Sort",
    storyBeat: "The entire Sort Yard needs organizing. Four simultaneous challenges. The Port Authority is watching.",
    ahaTitle: "Two Pointers: A Universal Sorting Tool",
    ahaBody: "Two pointers power: partition (QuickSort), Dutch Flag, in-place reversal, palindrome check, and duplicate removal — all O(n), all O(1) space. One mental model, many algorithms.",
    xpBase: 135,
    mode: "boss",
    array: [1, 0, 1, 0],
    optimalSwaps: 8,
  },
];
