export interface SWProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const SW_PROBLEMS: SWProblem[] = [
  {
    index: 1,
    title: "The Scanner",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "643",
    insightTitle: "Fixed Window Maximum Average",
    insight: "Slide a fixed-size window right: subtract leftmost, add rightmost. O(n) not O(n·k).",
    mechanic: "fixed_window",
  },
  {
    index: 2,
    title: "Longest Run",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "3",
    insightTitle: "Longest Substring Without Repeating Chars",
    insight: "Expand right freely. When duplicate found, shrink left until duplicate gone. Set tracks window contents.",
    mechanic: "variable_window",
  },
  {
    index: 3,
    title: "Anagram Hunt",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "567",
    insightTitle: "Permutation in String",
    insight: "Fixed window of pattern length. Compare frequency maps. Slide right, update counts in O(1) per step.",
    mechanic: "freq_window",
  },
  {
    index: 4,
    title: "Fruit Basket",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "904",
    insightTitle: "At Most 2 Distinct Types",
    insight: "Variable window: expand right adding fruit types. When 3rd type appears, shrink left until 2 types remain.",
    mechanic: "at_most_k",
  },
  {
    index: 5,
    title: "Max Slider",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "239",
    insightTitle: "Sliding Window Maximum — Monotonic Deque",
    insight: "Deque stores indices of potential maximums in decreasing order. Front is always current max. Back pops when smaller than new element.",
    mechanic: "monotonic_deque",
  },
  {
    index: 6,
    title: "Rain Catcher",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "76",
    insightTitle: "Minimum Window Substring",
    insight: "Expand right until all chars covered. Shrink left until constraint breaks. Track minimum valid window seen.",
    mechanic: "min_window",
  },
  {
    index: 7,
    title: "K Swaps",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "424",
    insightTitle: "Longest Repeating Character Replacement",
    insight: "Window is valid if (window_size - max_freq) <= k. Max freq never decreases — window only grows or stays.",
    mechanic: "k_replacement",
  },
  {
    index: 8,
    title: "All Anagrams",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "438",
    insightTitle: "Find All Anagrams in a String",
    insight: "Fixed window slides one step at a time. Count matching frequencies. Every valid window is an anagram start.",
    mechanic: "all_anagrams",
  },
];
