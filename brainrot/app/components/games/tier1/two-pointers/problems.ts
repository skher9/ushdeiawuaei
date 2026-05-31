export interface TPProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const TP_PROBLEMS: TPProblem[] = [
  {
    index: 1,
    title: "Collision Course",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "167",
    insightTitle: "Two Sum II — Two Pointers",
    insight: "Sorted array → two pointers from both ends. Sum too small: left++. Sum too big: right--. Meet in O(n) not O(n²).",
    mechanic: "two_sum_sorted",
  },
  {
    index: 2,
    title: "Container Craft",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "11",
    insightTitle: "Container With Most Water",
    insight: "Move the shorter wall inward — it can only get worse by moving the taller one. Greedy pointer movement.",
    mechanic: "container_water",
  },
  {
    index: 3,
    title: "Palindrome Probe",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "125",
    insightTitle: "Valid Palindrome",
    insight: "Two pointers from both ends, skip non-alphanumeric. Compare in O(n) with O(1) space.",
    mechanic: "palindrome_check",
  },
  {
    index: 4,
    title: "Color Sort",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "75",
    insightTitle: "Dutch National Flag — 3 Pointers",
    insight: "Three pointers: low, mid, high. Each swap maintains invariant: 0s before low, 1s between low/mid, 2s after high.",
    mechanic: "dutch_flag",
  },
  {
    index: 5,
    title: "Triple Sum",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "15",
    insightTitle: "3Sum — Fix + Two Pointers",
    insight: "Fix one element, two-pointer the rest. Sort first so duplicates are adjacent and can be skipped.",
    mechanic: "three_sum",
  },
  {
    index: 6,
    title: "Rain Trap",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "42",
    insightTitle: "Trapping Rain Water",
    insight: "Track maxLeft and maxRight from both ends. Water at each bar = min(maxLeft, maxRight) - height. No extra array needed.",
    mechanic: "trap_water",
  },
  {
    index: 7,
    title: "Merge Streams",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "88",
    insightTitle: "Merge Sorted Arrays",
    insight: "Two pointers from the END of both arrays, fill from back. Avoids shifting elements. In-place in O(m+n).",
    mechanic: "merge_sorted",
  },
  {
    index: 8,
    title: "Squeeze Play",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "16",
    insightTitle: "3Sum Closest",
    insight: "Same as 3Sum but track minimum absolute difference. Move pointer based on whether sum is too high or low.",
    mechanic: "three_sum_closest",
  },
];
