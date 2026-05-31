export type StarCount = 0 | 1 | 2 | 3;

export interface GuessRecord {
  guess: number;
  result: "high" | "low" | "found" | "lie";
  remaining: number;
  wasOptimal: boolean;
}

export interface LevelResult {
  stars: StarCount;
  guesses: number;
  optimalGuesses: number;
  xpEarned: number;
  time: number;
}

/** Colors that define the Search City noir palette */
export const NOIR = {
  bg: "#070b12",
  bgPanel: "#0c1220",
  border: "rgba(240,165,0,0.2)",
  borderStrong: "rgba(240,165,0,0.5)",
  amber: "#f0a500",
  amberDim: "rgba(240,165,0,0.5)",
  teal: "#2a9d8f",
  red: "#e84a5f",
  text: "#e8e4d8",
  textDim: "rgba(232,228,216,0.45)",
  textFaint: "rgba(232,228,216,0.2)",
};

export function calcStars(guesses: number, optimal: number): StarCount {
  if (guesses <= optimal) return 3;
  if (guesses <= optimal + 1) return 2;
  if (guesses <= optimal + 3) return 1;
  return 0;
}

export function calcXP(base: number, stars: StarCount): number {
  const mult = [0.5, 0.7, 0.85, 1.0];
  return Math.round(base * mult[stars]);
}

export function optimalGuesses(range: number): number {
  return Math.ceil(Math.log2(range)) + 1;
}
