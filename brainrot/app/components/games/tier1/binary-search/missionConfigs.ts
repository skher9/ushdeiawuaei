export interface ToolDef {
  name: string;
  complexity: string;
  icon: string;
  cost: string;
}

export interface MissionDef {
  missionName: string;
  situation: string;
  objective: string;
  constraint: string;
  tools: ToolDef[];
  difficulty: string;
  lcRef: string;
  optimalComplexity: string;
  defaultTool: string;
}

export const COMPLEXITY_ORDER: Record<string, number> = {
  'O(1)': 0,
  'O(log n)': 1,
  'O(√n)': 2,
  'O(n)': 3,
  'O(n log n)': 4,
  'O(n²)': 5,
  'O(2^n)': 6,
  'O(?)': 3,
  'O(1)/scan': 1,
};

export const COMPLEXITY_COLOR: Record<string, string> = {
  'O(1)': '#22c55e',
  'O(log n)': '#22c55e',
  'O(√n)': '#3b82f6',
  'O(n)': '#eab308',
  'O(n log n)': '#f97316',
  'O(n²)': '#ef4444',
  'O(2^n)': '#ef4444',
  'O(?)': '#eab308',
  'O(1)/scan': '#22c55e',
};

export function dominantComplexity(complexities: string[]): string {
  if (complexities.length === 0) return '--';
  return complexities.reduce((worst, c) =>
    (COMPLEXITY_ORDER[c] ?? 3) > (COMPLEXITY_ORDER[worst] ?? 3) ? c : worst
  );
}

export function complexityScore(used: string, optimal: string): number {
  const usedRank = COMPLEXITY_ORDER[used] ?? 3;
  const optRank = COMPLEXITY_ORDER[optimal] ?? 1;
  const diff = usedRank - optRank;
  if (diff <= 0) return 100;
  if (diff === 1) return 75;
  if (diff === 2) return 50;
  return 25;
}

const MISSIONS: Record<number, MissionDef> = {
  1: {
    missionName: 'THE VAULT HEIST',
    situation: 'Spotify vault. 10,000 songs sorted by duration.',
    objective: 'Find song with target duration. Return its index.',
    constraint: 'Security drones arrive in 60s. Wrong direction costs 8s.',
    tools: [
      { name: 'Linear Scan', complexity: 'O(n)', icon: '→', cost: '−15s timer' },
      { name: 'Binary Search', complexity: 'O(log n)', icon: '⌀', cost: '−8s/wrong' },
      { name: 'Jump Search', complexity: 'O(√n)', icon: '↷', cost: '−4s/overshoot' },
    ],
    difficulty: 'Easy',
    lcRef: '704',
    optimalComplexity: 'O(log n)',
    defaultTool: 'Binary Search',
  },
  2: {
    missionName: 'OUTBREAK',
    situation: '20 lab chambers. One started the corruption. Everything after is infected.',
    objective: 'Find the FIRST infected chamber before the ooze arrives.',
    constraint: 'Ooze crosses in 45s. Linear scan takes 50s. You will not make it.',
    tools: [
      { name: 'Linear Scan', complexity: 'O(n)', icon: '→', cost: '2.5s/test' },
      { name: 'Binary Search', complexity: 'O(log n)', icon: '⌀', cost: '2.5s/test' },
      { name: 'Random Sample', complexity: 'O(?)', icon: '⚂', cost: '2.5s/test' },
    ],
    difficulty: 'Easy',
    lcRef: '278',
    optimalComplexity: 'O(log n)',
    defaultTool: 'Binary Search',
  },
  3: {
    missionName: 'THE TOURNAMENT',
    situation: 'Underground arena. 12 fighters ranked by power level.',
    objective: 'Insert the challenger into the correct ranked slot.',
    constraint: 'Crowd noise rises 3% per comparison. Riot triggers at 100%.',
    tools: [
      { name: 'Check Each Fighter', complexity: 'O(n)', icon: '→', cost: '+3% noise/check' },
      { name: 'Binary Position Search', complexity: 'O(log n)', icon: '⌀', cost: '+3% noise/check' },
      { name: 'Ask Neighbors', complexity: 'O(1)×3', icon: '?', cost: '3 uses only' },
    ],
    difficulty: 'Easy',
    lcRef: '35',
    optimalComplexity: 'O(log n)',
    defaultTool: 'Binary Position Search',
  },
  4: {
    missionName: 'DEAD SIGNAL',
    situation: '14 mountain peaks. Heights unknown until scanned.',
    objective: 'Find ANY peak — element greater than both neighbors.',
    constraint: '5 power cells only. Every wasted scan risks mission failure.',
    tools: [
      { name: 'Scan Peak', complexity: 'O(1)/scan', icon: '▲', cost: '1 cell/scan' },
      { name: 'Scan + Neighbors', complexity: 'O(1)/scan', icon: '▲▲', cost: '2 cells/scan' },
      { name: 'Thermal Overview', complexity: 'O(n)', icon: '🌡', cost: '3 cells, once' },
    ],
    difficulty: 'Medium',
    lcRef: '162',
    optimalComplexity: 'O(log n)',
    defaultTool: 'Scan Peak',
  },
};

export default MISSIONS;
