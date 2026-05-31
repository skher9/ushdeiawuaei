export type WitnessMode =
  | "amount"       // Simple range — "was more than X stolen?"
  | "min_capacity" // Find min ship/boat capacity that lets all pass in D days
  | "min_days"     // Find min days needed at a given capacity
  | "limited_cred" // Limited number of questions
  | "koko"         // Koko bananas — min speed to finish in H hours
  | "split_array"  // Minimize max subarray sum with M splits
  | "cows"         // Aggressive cows — maximize min gap
  | "boss";        // 3 witnesses simultaneously

export interface WitnessLevel {
  level: number;
  caseTitle: string;
  storyBeat: string;
  ahaTitle: string;
  ahaBody: string;
  xpBase: number;
  mode: WitnessMode;
  // Mode-specific data
  amountRange?: [number, number]; // [lo, hi]
  amountAnswer?: number;
  packages?: number[]; // weights
  days?: number;       // max days (ship/deliver)
  capacity?: number;   // max capacity (koko)
  piles?: number[];    // koko piles
  hours?: number;      // koko hours
  mSplits?: number;    // split array M parts
  splitArray?: number[];
  stalls?: number[];   // cow positions
  numCows?: number;
  creditsPerQuestion?: number;
  totalCredits?: number;
}

export const WITNESS_LEVELS: WitnessLevel[] = [
  {
    level: 1,
    caseTitle: "The Stolen Amount",
    storyBeat: "A theft occurred. The witness won't tell you directly — only answers: 'Was more than $X stolen? Yes or No.' Find the exact amount stolen (range: $1–$1000).",
    ahaTitle: "Binary Search on a Number Range",
    ahaBody: "You weren't searching an array — you were searching the number line. The predicate 'stolen > X' flips from Yes to No exactly once. Binary search that flip-point. Any monotone yes/no question has this structure.",
    xpBase: 60,
    mode: "amount",
    amountRange: [1, 1000],
    amountAnswer: 743,
  },
  {
    level: 2,
    caseTitle: "The River Crossing",
    storyBeat: "N packages must cross a river. Each boat has a weight limit. Find the MINIMUM weight limit that still lets all packages cross in at most 3 trips.",
    ahaTitle: "Binary Search on Answer: Min Capacity",
    ahaBody: "Binary search on the capacity C. 'Can all packages cross in ≤3 trips with limit C?' is a feasibility check that takes O(n). Search [max_weight, total_weight] for the first C where this is true.",
    xpBase: 70,
    mode: "min_capacity",
    packages: [3, 2, 2, 4, 1, 4],
    days: 3,
  },
  {
    level: 3,
    caseTitle: "The Delivery Schedule",
    storyBeat: "Packages must all be delivered. The truck capacity is 10. Find the MINIMUM number of days needed.",
    ahaTitle: "Binary Search on Days",
    ahaBody: "Binary search on D (days). 'Can all packages be delivered in ≤D days with capacity 10?' is a greedy check: fill each day greedily. D ranges from 1 to n. Find the first feasible D.",
    xpBase: 80,
    mode: "min_days",
    packages: [3, 2, 2, 4, 1, 4, 5, 1, 3, 2],
    capacity: 10,
  },
  {
    level: 4,
    caseTitle: "The Bribed Judge",
    storyBeat: "A judge was bribed. Each question costs credibility. You have 50 credits; each non-midpoint guess costs 10 extra. Find the bribe ($1–$500) optimally.",
    ahaTitle: "Optimal Binary Search = Minimum Questions",
    ahaBody: "With limited budget, every non-optimal guess is costly. The midpoint always minimizes worst-case remaining questions. This is why binary search is optimal for comparison-based search — it minimizes the maximum depth of the decision tree.",
    xpBase: 90,
    mode: "limited_cred",
    amountRange: [1, 500],
    amountAnswer: 317,
    totalCredits: 50,
    creditsPerQuestion: 5,
  },
  {
    level: 5,
    caseTitle: "Koko's Bananas",
    storyBeat: "Koko must eat all banana piles in H=8 hours. She eats K bananas/hour per pile. Find the minimum K that finishes in time.",
    ahaTitle: "Koko's Bananas — LC 875",
    ahaBody: "Binary search on eating speed K in [1, max_pile]. 'Can Koko finish all piles at speed K in H hours?' = sum of ceil(pile/K) ≤ H. This check is O(n). Search [1, max_pile] for the first K that satisfies it.",
    xpBase: 90,
    mode: "koko",
    piles: [3, 6, 7, 11],
    hours: 8,
  },
  {
    level: 6,
    caseTitle: "The Split Evidence",
    storyBeat: "Split this evidence array into 3 parts. Minimize the maximum sum of any part. Choose the optimal split threshold.",
    ahaTitle: "Split Array — Binary Search on Max Sum",
    ahaBody: "Binary search on the answer: the max subarray sum threshold T. 'Can we split array into ≤M parts where each part has sum ≤T?' is a greedy O(n) check. Search [max_element, total_sum] for the minimum feasible T.",
    xpBase: 100,
    mode: "split_array",
    splitArray: [7, 2, 5, 10, 8],
    mSplits: 2,
  },
  {
    level: 7,
    caseTitle: "The Safe Houses",
    storyBeat: "Place 3 informants in safe houses to maximize the minimum distance between any two. Find the maximum possible minimum distance.",
    ahaTitle: "Aggressive Cows — Maximize Min Distance",
    ahaBody: "Binary search on the minimum distance D. 'Can we place N cows in stalls so every pair is ≥D apart?' is a greedy O(n) check. Search [1, max_gap] for the maximum feasible D. Classic competitive programming pattern.",
    xpBase: 110,
    mode: "cows",
    stalls: [1, 2, 8, 4, 9],
    numCows: 3,
  },
  {
    level: 8,
    caseTitle: "Three Witnesses",
    storyBeat: "Three witnesses. Three simultaneous binary searches on answer space. Solve all three in under 3 minutes to reveal the vault code.",
    ahaTitle: "Binary Search as a Universal Tool",
    ahaBody: "Any problem with a monotone feasibility function can be solved with binary search on the answer. The pattern: 'I'm looking for the minimum/maximum X such that f(X) is true/false.' Whenever you see this structure, binary search is optimal.",
    xpBase: 140,
    mode: "boss",
    // Three sub-problems
    amountRange: [1, 1000],
    amountAnswer: 512,
    packages: [1, 2, 3, 4, 5, 6, 7, 8],
    days: 3,
    piles: [2, 4, 6, 8],
    hours: 6,
  },
];

/* Feasibility functions */
export function canShipInDays(packages: number[], capacity: number, days: number): boolean {
  let currentLoad = 0, trips = 1;
  for (const w of packages) {
    if (w > capacity) return false;
    if (currentLoad + w > capacity) { trips++; currentLoad = 0; }
    currentLoad += w;
  }
  return trips <= days;
}

export function canDeliverInDays(packages: number[], capacity: number, days: number): boolean {
  return canShipInDays(packages, capacity, days);
}

export function kokoCanFinish(piles: number[], speed: number, hours: number): boolean {
  return piles.reduce((sum, p) => sum + Math.ceil(p / speed), 0) <= hours;
}

export function canSplitWithMax(arr: number[], m: number, maxSum: number): boolean {
  let parts = 1, sum = 0;
  for (const x of arr) {
    if (x > maxSum) return false;
    if (sum + x > maxSum) { parts++; sum = 0; }
    sum += x;
  }
  return parts <= m;
}

export function canPlaceCows(stalls: number[], n: number, minDist: number): boolean {
  const sorted = [...stalls].sort((a, b) => a - b);
  let placed = 1, last = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - last >= minDist) { placed++; last = sorted[i]; }
  }
  return placed >= n;
}
