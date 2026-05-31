export interface BSProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const BS_PROBLEMS: BSProblem[] = [
  {
    index: 1,
    title: "Vault Heist",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "704",
    insightTitle: "Classic Binary Search",
    insight:
      "Every click picked the midpoint of the remaining range. That's binary search: each step eliminates half. To search 1,000,000 records you need at most 20 clicks — not 1,000,000.",
    mechanic: "pointer_trace",
  },
  {
    index: 2,
    title: "Outbreak",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "278",
    insightTitle: "First Bad Version",
    insight:
      "You searched for the first chamber where infection is TRUE. Binary search on a yes/no predicate finds the boundary in O(log n): if clean, go right; if infected, go left — first infected must be ≤ here.",
    mechanic: "resource_constraint",
  },
  {
    index: 3,
    title: "Tournament",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "35",
    insightTitle: "Search Insert Position",
    insight:
      "You searched for the leftmost slot where arr[mid] ≥ challenger. That's lower-bound binary search: maintain left=0, right=n, while left<right: if arr[mid]<target: left=mid+1 else right=mid. Answer = left.",
    mechanic: "drag_insert",
  },
  {
    index: 4,
    title: "Dead Signal",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "162",
    insightTitle: "Find Peak Element",
    insight:
      "At any mountain, if the right neighbor is taller the peak must be to the right. This is always true — binary search the slope. At any mid: if arr[mid] < arr[mid+1], peak is in [mid+1..right], else in [left..mid].",
    mechanic: "resource_constraint",
  },
  {
    index: 5,
    title: "Grid Zero",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "410",
    insightTitle: "Binary Search on Answer Space",
    insight:
      "You weren't searching the array — you were searching the answer space [max_district, total_demand]. 'Can 3 trucks handle capacity ≤ X?' flips false→true exactly once. Binary search that boundary: each test eliminates half the remaining range. O(n log(sum)).",
    mechanic: "simulation_guess",
  },
  {
    index: 6,
    title: "The Delivery Driver",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "875",
    insightTitle: "Binary Search on Answer (Min Speed)",
    insight:
      "Minimum viable speed is a classic binary search on answer. 'Can I finish all deliveries at speed X?' flips from false to true exactly once. Search [1, max_distance] for that flip point.",
    mechanic: "simulation_guess",
  },
  {
    index: 7,
    title: "The Cargo Ship",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "1011",
    insightTitle: "Binary Search on Capacity",
    insight:
      "Ship capacity search: binary search [max_item, sum_all_items]. 'Can we ship in D days at capacity C?' is monotone — true once C crosses the threshold. That threshold is your answer.",
    mechanic: "simulation_guess",
  },
  {
    index: 8,
    title: "The Two Archives",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "4",
    insightTitle: "Median of Two Sorted Arrays",
    insight:
      "Partitioning both arrays at the right split point makes every left-side element ≤ every right-side element. Binary search on the partition of the smaller array. O(log(min(m,n))).",
    mechanic: "partition_game",
  },
];
