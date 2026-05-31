export interface TrieProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const TRIE_PROBLEMS: TrieProblem[] = [
  {
    index: 1,
    title: "Letter Drop",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "208",
    insightTitle: "Trie Insert — Follow Then Create",
    insight: "Walk the trie letter by letter. If child exists, follow it. If not, create it. Mark the last node as a word-end. Each insert is O(m) where m = word length.",
    mechanic: "trie_insert",
  },
  {
    index: 2,
    title: "Word Seeker",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "208",
    insightTitle: "Trie Search — Path Must End at Word Node",
    insight: "Navigate letter by letter. If any letter's child is missing, word doesn't exist. If all letters found but last node isn't a word-end, it's only a prefix, not a word.",
    mechanic: "trie_search",
  },
  {
    index: 3,
    title: "Prefix Scout",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "208",
    insightTitle: "startsWith — Prefix Exists if Path Exists",
    insight: "A prefix exists if you can navigate every character without hitting a null child. Unlike search, you don't need a word-end marker — just the path.",
    mechanic: "trie_prefix",
  },
  {
    index: 4,
    title: "Wild Matcher",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "211",
    insightTitle: "Word Dictionary — Dot Wildcard Branching",
    insight: "For '.' wildcard, branch into ALL existing children simultaneously (BFS/DFS all paths). Regular letters navigate normally. One valid path to a word-end = match found.",
    mechanic: "trie_wildcard",
  },
  {
    index: 5,
    title: "Root Cutter",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "648",
    insightTitle: "Replace Words — First Matching Prefix Wins",
    insight: "For each word in the sentence, navigate the trie. Stop at the first word-end node encountered. That's the root replacement. If no prefix matches, keep the original word.",
    mechanic: "trie_replace",
  },
  {
    index: 6,
    title: "Common Fork",
    difficulty: "Easy",
    free: false,
    leetcodeRef: "14",
    insightTitle: "Longest Common Prefix — Stop at the Fork",
    insight: "Insert all words into a trie. Navigate down while each node has exactly one child and isn't a word-end. The moment you see branching (>1 child) or a word-end, stop — that's the LCP.",
    mechanic: "trie_lcp",
  },
  {
    index: 7,
    title: "Auto Suggest",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "1268",
    insightTitle: "Search Suggestions — DFS After Each Prefix",
    insight: "After each typed character, navigate to that prefix node in the trie. DFS from there, collecting up to 3 lexicographically smallest words. Lexicographic order = insert words sorted, or sort children alphabetically.",
    mechanic: "trie_suggest",
  },
  {
    index: 8,
    title: "Sentence Slicer",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "139",
    insightTitle: "Word Break — DP + Trie Lookup",
    insight: "dp[i] = true if s[0..i] can be segmented. For each i where dp[i]=true, scan forward using trie to find all valid words starting at i, mark dp[i+word.len]=true. O(n²) DP with O(m) trie lookup per step.",
    mechanic: "trie_break",
  },
];
