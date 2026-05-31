// Pure validation functions — no UI dependencies

export function isValidMidPlacement(
  left: number,
  right: number,
  clickedIndex: number
): { valid: boolean; reason: string } {
  if (clickedIndex < left || clickedIndex > right) {
    return {
      valid: false,
      reason: `MID must be between positions ${left} and ${right} (current window)`,
    };
  }
  return { valid: true, reason: "Valid mid placement" };
}

export function getBinarySearchFeedback(
  array: number[],
  target: number,
  mid: number
): "higher" | "lower" | "found" {
  if (array[mid] === target) return "found";
  return target > array[mid] ? "higher" : "lower";
}

export function isValidPointerMove(params: {
  array: number[];
  target: number;
  left: number;
  right: number;
  mid: number;
  direction: "higher" | "lower";
  clickedIndex: number;
}): { valid: boolean; reason: string } {
  const { mid, direction, clickedIndex } = params;
  if (direction === "higher") {
    if (clickedIndex < mid + 1) {
      return {
        valid: false,
        reason: `Target is higher — LEFT must move to index ≥ ${mid + 1}`,
      };
    }
    return { valid: true, reason: "Correct — lower half eliminated" };
  } else {
    if (clickedIndex > mid - 1) {
      return {
        valid: false,
        reason: `Target is lower — RIGHT must move to index ≤ ${mid - 1}`,
      };
    }
    return { valid: true, reason: "Correct — upper half eliminated" };
  }
}

export function isValidPartition(
  arrayA: number[],
  arrayB: number[],
  partitionA: number
): { valid: boolean; feedback: string; median?: number; partitionB?: number } {
  const m = arrayA.length;
  const n = arrayB.length;
  const halfLen = Math.floor((m + n + 1) / 2);
  const partitionB = halfLen - partitionA;

  if (partitionB < 0 || partitionB > n) {
    return { valid: false, feedback: "Partition out of valid range", partitionB };
  }

  const maxLeftA = partitionA === 0 ? -Infinity : arrayA[partitionA - 1];
  const minRightA = partitionA === m ? Infinity : arrayA[partitionA];
  const maxLeftB = partitionB === 0 ? -Infinity : arrayB[partitionB - 1];
  const minRightB = partitionB === n ? Infinity : arrayB[partitionB];

  if (maxLeftA > minRightB) {
    return {
      valid: false,
      feedback: `A's left max (${maxLeftA}) > B's right min (${minRightB}). Move A partition LEFT.`,
      partitionB,
    };
  }
  if (maxLeftB > minRightA) {
    return {
      valid: false,
      feedback: `B's left max (${maxLeftB}) > A's right min (${minRightA}). Move A partition RIGHT.`,
      partitionB,
    };
  }

  const median =
    (m + n) % 2 === 0
      ? (Math.max(maxLeftA, maxLeftB) + Math.min(minRightA === Infinity ? 0 : minRightA, minRightB === Infinity ? 0 : minRightB)) / 2
      : Math.max(maxLeftA, maxLeftB);

  return { valid: true, feedback: "Valid partition!", median, partitionB };
}

export function simulateDelivery(packages: number[], speed: number): number {
  let hours = 0;
  for (const p of packages) hours += Math.ceil(p / speed);
  return hours;
}

export function simulateShipping(weights: number[], capacity: number): number {
  let days = 1;
  let load = 0;
  for (const w of weights) {
    if (load + w > capacity) { days++; load = 0; }
    load += w;
  }
  return days;
}

export function isMinimumAnswer(
  array: number[],
  guess: number,
  target: number,
  mechanic: "delivery" | "shipping"
): boolean {
  const sim = mechanic === "delivery" ? simulateDelivery : simulateShipping;
  if (sim(array, guess) > target) return false;
  if (guess <= (mechanic === "delivery" ? 1 : Math.max(...array))) return true;
  return sim(array, guess - 1) > target;
}
