export interface GraphProblem {
  index: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  free: boolean;
  leetcodeRef: string | null;
  insight: string;
  insightTitle: string;
  mechanic: string;
}

export const GRAPH_PROBLEMS: GraphProblem[] = [
  {
    index: 1,
    title: "Minefield",
    difficulty: "Easy",
    free: true,
    leetcodeRef: null,
    insightTitle: "Flood Fill: BFS in Action",
    insight: "Each click triggered a flood fill — BFS expanding outward from the clicked cell, revealing all safe neighbors. Queue starts with one cell; each dequeue reveals neighbors and enqueues safe ones. The wave stops at mines and boundaries.",
    mechanic: "flood_fill",
  },
  {
    index: 2,
    title: "Island Count",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "200",
    insightTitle: "Number of Islands: DFS",
    insight: "Each island is a connected component. DFS from any unvisited land cell marks the entire island visited before returning. Count how many times DFS is triggered = number of islands. Time: O(m×n).",
    mechanic: "dfs_mark",
  },
  {
    index: 3,
    title: "The Escape",
    difficulty: "Easy",
    free: true,
    leetcodeRef: "1926",
    insightTitle: "BFS Shortest Path",
    insight: "BFS guarantees the shortest path on unweighted grids. The first time BFS reaches the exit, the path length equals the minimum steps. DFS would find A path — not necessarily the shortest.",
    mechanic: "path_find",
  },
  {
    index: 4,
    title: "Rotten Oranges",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "994",
    insightTitle: "Multi-Source BFS",
    insight: "All rotten oranges are enqueued simultaneously — BFS from multiple sources at once. Each BFS level = one minute of spreading. This gives the minimum time to rot all oranges, because spread happens in parallel.",
    mechanic: "simulation",
  },
  {
    index: 5,
    title: "Walls and Gates",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "286",
    insightTitle: "Multi-Source BFS from Destinations",
    insight: "BFS from ALL gates simultaneously fills each empty room with its distance to the nearest gate. Running BFS from destinations backward is often cleaner than running from every source forward.",
    mechanic: "distance_fill",
  },
  {
    index: 6,
    title: "Pacific Atlantic",
    difficulty: "Medium",
    free: true,
    leetcodeRef: "417",
    insightTitle: "Multi-Source DFS: Reverse Flow",
    insight: "Instead of simulating water flowing down from every cell, run DFS uphill from both oceans. Cells reachable from both = answer. Reversing the problem direction often reveals a cleaner solution.",
    mechanic: "dual_dfs",
  },
  {
    index: 7,
    title: "Word Ladder",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "127",
    insightTitle: "BFS on Implicit Graphs",
    insight: "Words are nodes; edges exist between words that differ by one letter. BFS finds the shortest transformation sequence. The graph is never built explicitly — neighbors are generated on the fly. O(M²×N) where M=word length, N=word count.",
    mechanic: "graph_bfs",
  },
  {
    index: 8,
    title: "Critical Lines",
    difficulty: "Hard",
    free: true,
    leetcodeRef: "1192",
    insightTitle: "Tarjan's Bridge Algorithm",
    insight: "A bridge is an edge whose removal disconnects the graph. Tarjan's algorithm finds all bridges in O(V+E) using DFS timestamps and low values. low[v] = min discovery time reachable from v's subtree without using the parent edge.",
    mechanic: "graph_analysis",
  },
];
