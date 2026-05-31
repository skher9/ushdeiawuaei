export interface DPProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const DP_PROBLEMS: DPProblem[] = [
  {
    index: 1,
    title: "Frog Leap",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "70",
    insightTitle: "Climbing Stairs — Bottom-Up Tabulation",
    insight: "dp[i] = dp[i-1] + dp[i-2]. Ways to reach step i = ways from one step below + ways from two steps below. Fibonacci with different meaning.",
    mechanic: "dp_tabulation",
  },
  {
    index: 2,
    title: "Vault Cracker",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "198",
    insightTitle: "House Robber — Skip or Take",
    insight: "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). At each house: skip it (keep previous max) or rob it (add value to max two steps back). Adjacent houses alarm.",
    mechanic: "dp_rob",
  },
  {
    index: 3,
    title: "Coin Forge",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "322",
    insightTitle: "Coin Change — Fill the DP Table",
    insight: "dp[amount] = min coins to make amount. For each amount, try every coin: dp[a] = min(dp[a], dp[a-coin]+1). Build from 0 up to target.",
    mechanic: "dp_coin",
  },
  {
    index: 4,
    title: "Gene Splice",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "1143",
    insightTitle: "Longest Common Subsequence",
    insight: "If chars match: dp[i][j] = dp[i-1][j-1] + 1. Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1]). Grid fills showing longest shared sequence.",
    mechanic: "dp_lcs",
  },
  {
    index: 5,
    title: "Loot Pack",
    difficulty: "Medium",
    free: false,
    leetcodeRef: null,
    insightTitle: "0/1 Knapsack — Include or Exclude",
    insight: "dp[w] = max value with capacity w. For each item: either skip (dp[w]) or take if it fits (dp[w-weight]+value). Process right-to-left to avoid reuse.",
    mechanic: "dp_knapsack",
  },
  {
    index: 6,
    title: "Pixel Path",
    difficulty: "Easy",
    free: false,
    leetcodeRef: "62",
    insightTitle: "Unique Paths — Grid Fill",
    insight: "dp[r][c] = paths from top-left to (r,c). Every cell = paths from above + paths from left. Top row and left column all equal 1.",
    mechanic: "dp_paths",
  },
  {
    index: 7,
    title: "Word Warp",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "72",
    insightTitle: "Edit Distance — Transform with Minimum Ops",
    insight: "dp[i][j] = min ops to convert word1[0..i] to word2[0..j]. If chars match: dp[i-1][j-1]. Else: 1 + min(insert, delete, replace). Grid fills diagonally.",
    mechanic: "dp_edit",
  },
  {
    index: 8,
    title: "Mirror Gem",
    difficulty: "Hard",
    free: false,
    leetcodeRef: "516",
    insightTitle: "Longest Palindromic Subsequence",
    insight: "dp[i][j] = LPS in s[i..j]. If s[i]==s[j]: dp[i+1][j-1]+2. Else: max(dp[i+1][j], dp[i][j-1]). Build intervals from length 1 outward.",
    mechanic: "dp_palindrome",
  },
];
