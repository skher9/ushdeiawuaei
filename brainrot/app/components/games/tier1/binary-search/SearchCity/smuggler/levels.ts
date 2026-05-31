export type SmugglerMode =
  | "standard"
  | "timer"
  | "reverse"
  | "corrupt_clue"
  | "parallel"
  | "fog"
  | "boss";

export interface SmugglerLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  range: number;        // warehouses 1..range
  optimalGuesses: number;
  xpBase: number;
  mode: SmugglerMode;
  timerPerGuess?: number;   // seconds (timer mode)
  bossEscapeTimer?: number; // seconds (boss mode)
  penaltyPerBadGuess?: number; // seconds added to penalty (boss)
}

export const SMUGGLER_LEVELS: SmugglerLevel[] = [
  {
    level: 1,
    caseTitle: "The First Lead",
    storyBeat: "A smuggler is hiding in one of 8 warehouses. You have 3 guesses. Every wrong guess costs you time.",
    ahaTitle: "Classic Binary Search",
    ahaBody: "Every guess picked the midpoint of the remaining range, eliminating half the possibilities. To search 1,000,000 records you need at most 20 guesses — not 1,000,000. That's O(log n).",
    range: 8,
    optimalGuesses: 3,
    xpBase: 40,
    mode: "standard",
  },
  {
    level: 2,
    caseTitle: "Double the Docks",
    storyBeat: "The smuggler got smarter. Now he could be hiding in any of 16 warehouses. One extra guess needed.",
    ahaTitle: "Scaling Binary Search",
    ahaBody: "Doubling the search space adds only ONE extra guess. 8 → 3 guesses. 16 → 4 guesses. 32 → 5. Each doubling is just +1. That's the logarithmic miracle.",
    range: 16,
    optimalGuesses: 4,
    xpBase: 50,
    mode: "standard",
  },
  {
    level: 3,
    caseTitle: "The Ticking Clock",
    storyBeat: "The smuggler is about to escape. You have 10 seconds per guess. Think fast, detective.",
    ahaTitle: "Binary Search Under Pressure",
    ahaBody: "Time pressure doesn't change the algorithm — it reveals whether you've internalized it. The midpoint choice should be instinctive: (lo + hi) >> 1.",
    range: 32,
    optimalGuesses: 5,
    xpBase: 60,
    mode: "timer",
    timerPerGuess: 10,
  },
  {
    level: 4,
    caseTitle: "Role Reversal",
    storyBeat: "Now YOU are the smuggler. Pick a hiding spot. The AI detective will find you using perfect binary search.",
    ahaTitle: "Binary Search Is Unstoppable",
    ahaBody: "The AI found you in at most ⌊log₂(32)⌋ + 1 = 5 guesses — guaranteed. No hiding spot saves you. A linear detective would need up to 32 guesses. This is why binary search is used everywhere sorted data exists.",
    range: 32,
    optimalGuesses: 5,
    xpBase: 60,
    mode: "reverse",
  },
  {
    level: 5,
    caseTitle: "The Double Agent",
    storyBeat: "One of our informants is a double agent. One clue during this case will be a lie. Find the smuggler anyway.",
    ahaTitle: "Fault Tolerance",
    ahaBody: "When one clue contradicts a previous answer, you've found the lie. Backtrack one step and search the rejected half. Real systems use checksums and parity bits for exactly this reason.",
    range: 32,
    optimalGuesses: 5,
    xpBase: 70,
    mode: "corrupt_clue",
  },
  {
    level: 6,
    caseTitle: "Three at Once",
    storyBeat: "Three smugglers. Three warehouses. Find them all. You have 45 seconds total.",
    ahaTitle: "Parallel Binary Searches",
    ahaBody: "Three independent O(log n) searches still beats one O(n) scan. Switching between parallel searches doesn't hurt — each is self-contained. This is how database query planners think.",
    range: 16,
    optimalGuesses: 4,
    xpBase: 80,
    mode: "parallel",
  },
  {
    level: 7,
    caseTitle: "Lights Out",
    storyBeat: "The smuggler disabled the warehouse signs. You can only see the number you just guessed. No visual help.",
    ahaTitle: "Mental Binary Search",
    ahaBody: "You tracked lo and hi in your head. Computers do the same: two pointers, no visualization. The algorithm is just: lo=0, hi=n, while lo<hi: mid=(lo+hi)/2, update lo or hi based on comparison.",
    range: 64,
    optimalGuesses: 6,
    xpBase: 90,
    mode: "fog",
  },
  {
    level: 8,
    caseTitle: "The Mastermind",
    storyBeat: "The Mastermind controls 128 warehouses. You race his escape timer. Every non-optimal guess adds 8 seconds penalty. Win the race.",
    ahaTitle: "Perfect Binary Search",
    ahaBody: "128 warehouses. Optimal: 7 guesses. Any deviation and the clock beats you. This is O(log n) as a live performance — each comparison must count. Optimal binary search = always pick (lo+hi)>>1.",
    range: 128,
    optimalGuesses: 7,
    xpBase: 120,
    mode: "boss",
    bossEscapeTimer: 90,
    penaltyPerBadGuess: 8,
  },
];
