export interface BTProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const BT_PROBLEMS: BTProblem[] = [
  { index: 1, title: "The Royal Guard", difficulty: "Easy", free: true, leetcodeRef: "51", insightTitle: "N-Queens: Backtracking Basics", insight: "You placed queens one row at a time. When stuck, you backtracked to the previous row and tried the next column. That IS backtracking: build a solution incrementally, abandon a path the moment it violates constraints, and try the next option.", mechanic: "placement" },
  { index: 2, title: "Word Hunt", difficulty: "Easy", free: true, leetcodeRef: "79", insightTitle: "Grid Backtracking", insight: "You traced a path through the grid, backtracking whenever you hit a dead end or revisited a cell. DFS + backtracking on a 2D grid: mark visited, recurse neighbors, unmark on return.", mechanic: "path_trace" },
  { index: 3, title: "Treasure Combos", difficulty: "Easy", free: true, leetcodeRef: "39", insightTitle: "Combination Sum", insight: "You picked numbers that sum to a target. Each choice branches into two: include this number again, or move to the next. The recursion tree prunes when the running sum exceeds the target.", mechanic: "selection" },
  { index: 4, title: "The Lineup", difficulty: "Medium", free: true, leetcodeRef: "46", insightTitle: "Permutations", insight: "Every swap at position i explores one branch of the permutation tree. Swapping back undoes the choice — that is the backtrack step. N! leaves, but pruning skips duplicate branches.", mechanic: "swap" },
  { index: 5, title: "Maze Caver", difficulty: "Medium", free: true, leetcodeRef: null, insightTitle: "DFS Maze Generation", insight: "Recursive backtracker: carve passages depth-first. Dead end = backtrack to last fork. Every cell visited exactly once.", mechanic: "dfs_mark" },
  { index: 6, title: "Broken Palace", difficulty: "Hard", free: true, leetcodeRef: "51", insightTitle: "Constrained Placement", insight: "Blocked cells eliminate entire branches early. Good backtracking checks constraints before recursing — forward checking — not after.", mechanic: "placement" },
  { index: 7, title: "Sudoku", difficulty: "Hard", free: true, leetcodeRef: "37", insightTitle: "Constraint Satisfaction", insight: "Sudoku is backtracking with three simultaneous constraints: row, column, 3x3 box. Always fill the cell with the fewest valid options first (minimum remaining values heuristic).", mechanic: "grid_fill" },
  { index: 8, title: "Eight Queens", difficulty: "Hard", free: true, leetcodeRef: "52", insightTitle: "N-Queens: Full Search", insight: "92 solutions for 8x8. Bitmasking makes it fast: three integers track column, diagonal, and anti-diagonal attacks.", mechanic: "placement" },
];
