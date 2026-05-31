export interface TreeProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const TREE_PROBLEMS: TreeProblem[] = [
  {
    index: 1,
    title: "Seed Planter",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "701",
    insightTitle: "BST Insert — Follow the Path",
    insight: "At each node: if val < node, go left; if val > node, go right. Insert at first null slot. O(h) time — O(log n) balanced, O(n) worst case.",
    mechanic: "bst_insert",
  },
  {
    index: 2,
    title: "Node Hunt",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "700",
    insightTitle: "BST Search — Eliminate Half Each Step",
    insight: "Compare target to current node. Go left if smaller, right if larger. BST property guarantees half the tree is eliminated each step.",
    mechanic: "bst_search",
  },
  {
    index: 3,
    title: "In-Order Walk",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "94",
    insightTitle: "Inorder Traversal — Left, Root, Right",
    insight: "Inorder on a BST yields sorted output. Recurse: visit left subtree, then root, then right subtree. Stack-based iteration mirrors the call stack.",
    mechanic: "tree_inorder",
  },
  {
    index: 4,
    title: "Level Rain",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "102",
    insightTitle: "Level-Order BFS — Process Level by Level",
    insight: "Queue starts with root. Each iteration: drain the entire current level, enqueue children. Queue size at start of each iteration = nodes in that level.",
    mechanic: "tree_levelorder",
  },
  {
    index: 5,
    title: "LCA Climber",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "236",
    insightTitle: "Lowest Common Ancestor — First Fork",
    insight: "LCA is the deepest node where p and q are in different subtrees (or one of them is the node itself). Post-order: if both children return a node, current node is LCA.",
    mechanic: "tree_lca",
  },
  {
    index: 6,
    title: "BST Judge",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "98",
    insightTitle: "Validate BST — Track Min/Max Bounds",
    insight: "Every node has a valid range [min, max]. Root: (-∞, +∞). Left child: (-∞, parent). Right child: (parent, +∞). Inorder must be strictly increasing.",
    mechanic: "bst_validate",
  },
  {
    index: 7,
    title: "Node Remover",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "450",
    insightTitle: "BST Delete — Three Cases",
    insight: "Leaf: just remove. One child: replace with child. Two children: replace value with inorder successor (leftmost node in right subtree), then delete successor.",
    mechanic: "bst_delete",
  },
  {
    index: 8,
    title: "Path Tracer",
    difficulty: "Medium",
    free: false,
    leetcodeRef: "112",
    insightTitle: "Path Sum — Root to Leaf",
    insight: "DFS from root, subtract node value from remaining target. At leaf: check if remaining = 0. Backtrack when path fails. Multiple paths may exist.",
    mechanic: "tree_pathsum",
  },
];
