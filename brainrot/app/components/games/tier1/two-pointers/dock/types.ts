export type StarCount = 0 | 1 | 2 | 3;

export const DOCK = {
  bg:          "#050a14",
  bgPanel:     "#0a1020",
  bgCard:      "rgba(10,16,32,0.88)",
  border:      "rgba(0,180,200,0.2)",
  borderBlue:  "rgba(41,121,255,0.45)",
  borderRed:   "rgba(255,61,90,0.45)",
  cyan:        "#00b4c8",
  cyanDim:     "rgba(0,180,200,0.45)",
  blue:        "#4488ff",
  blueBright:  "#2979ff",
  blueDim:     "rgba(68,136,255,0.45)",
  red:         "#ff4a6a",
  redBright:   "#ff3d5a",
  redDim:      "rgba(255,74,106,0.45)",
  amber:       "#f0a500",
  amberDim:    "rgba(240,165,0,0.45)",
  green:       "#34d399",
  steel:       "#7a8a99",
  text:        "#d8e8f0",
  textDim:     "rgba(216,232,240,0.48)",
  textFaint:   "rgba(216,232,240,0.22)",
  water:       "#040c18",
};

export function calcStars(moves: number, optimal: number): StarCount {
  if (moves <= optimal)     return 3;
  if (moves <= optimal + 1) return 2;
  if (moves <= optimal + 3) return 1;
  return 0;
}

export function calcXP(base: number, stars: StarCount): number {
  return Math.round(base * [0.5, 0.7, 0.85, 1.0][stars]);
}
