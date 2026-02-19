import { CellState } from '../types';

/** Compute clues (run-lengths of filled cells) for a single line */
function lineClues(line: number[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell === 1) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
}

/** Compute row clues from a solution grid */
export function computeRowClues(solution: number[][]): number[][] {
  return solution.map((row) => lineClues(row));
}

/** Compute column clues from a solution grid */
export function computeColClues(solution: number[][]): number[][] {
  const cols = solution[0].length;
  const clues: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const col = solution.map((row) => row[c]);
    clues.push(lineClues(col));
  }
  return clues;
}

/** Check if a player's line matches a clue */
export function lineMatchesClue(line: number[], clue: number[]): boolean {
  const playerClue = lineClues(line);
  if (playerClue.length !== clue.length) return false;
  return playerClue.every((v, i) => v === clue[i]);
}

/**
 * Per-clue completion: returns a boolean[] indicating which individual
 * clue numbers are satisfied by runs of filled cells in the line.
 *
 * Since all filled cells are verified correct (against the solution),
 * any contiguous run of Filled cells is a real group whose length is
 * either final or will only grow. We match runs to clues using space
 * constraints and left-to-right ordering.
 *
 * A run is "sealed" (bounded on both sides by MarkedX or edge) when its
 * length is guaranteed final. Unsealed runs could still grow, so we only
 * mark a clue as done when the run length exactly matches AND the run is
 * sealed OR uniquely constrained to one clue.
 */
export function computeClueCompletion(
  line: CellState[],
  clues: number[],
): boolean[] {
  const n = clues.length;
  const L = line.length;
  const result = new Array<boolean>(n).fill(false);

  // Special case: clue is [0] — done if no filled cells
  if (n === 1 && clues[0] === 0) {
    result[0] = line.every((c) => c !== CellState.Filled);
    return result;
  }

  // Find all runs of filled cells, noting whether each is sealed
  const runs: { start: number; end: number; len: number; sealed: boolean }[] = [];
  let i = 0;
  while (i < L) {
    if (line[i] === CellState.Filled) {
      const start = i;
      while (i < L && line[i] === CellState.Filled) i++;
      const end = i; // exclusive
      const leftSealed = start === 0 || line[start - 1] === CellState.MarkedX;
      const rightSealed = end === L || line[end] === CellState.MarkedX;
      runs.push({ start, end, len: end - start, sealed: leftSealed && rightSealed });
    } else {
      i++;
    }
  }

  if (runs.length === 0) return result;

  // Prefix sums for minimum-space calculation
  const prefixSum = [0];
  for (let j = 0; j < n; j++) prefixSum.push(prefixSum[j] + clues[j]);

  // minBefore(ci) = minimum cells needed for clues 0..ci-1 plus gaps
  //   = sum(clues[0..ci-1]) + ci
  // minAfter(ci) = minimum cells needed for clues ci+1..n-1 plus gaps
  //   = sum(clues[ci+1..n-1]) + (n - 1 - ci)
  const minBefore = (ci: number) => prefixSum[ci] + ci;
  const minAfter = (ci: number) => (prefixSum[n] - prefixSum[ci + 1]) + (n - 1 - ci);

  // For each run, find which clue indices it could match.
  // Sealed runs must match exactly; unsealed runs could grow,
  // so we also check that the run length matches the clue.
  const candidates: number[][] = runs.map((run) => {
    const possible: number[] = [];
    for (let ci = 0; ci < n; ci++) {
      if (run.sealed) {
        // Sealed: length is final, must equal clue exactly
        if (clues[ci] !== run.len) continue;
      } else {
        // Unsealed: could still grow, only match if length already equals clue
        if (clues[ci] !== run.len) continue;
      }
      if (minBefore(ci) <= run.start &&
          minAfter(ci) <= L - run.end) {
        possible.push(ci);
      }
    }
    return possible;
  });

  // Iteratively prune using ordering: runs are left-to-right,
  // so their matched clue indices must be strictly increasing
  let changed = true;
  while (changed) {
    changed = false;
    // Forward pass: each run's min candidate > previous run's min candidate
    for (let ri = 1; ri < runs.length; ri++) {
      if (candidates[ri - 1].length === 0) continue;
      const prevMin = candidates[ri - 1][0];
      const before = candidates[ri].length;
      candidates[ri] = candidates[ri].filter((c) => c > prevMin);
      if (candidates[ri].length < before) changed = true;
    }
    // Backward pass: each run's max candidate < next run's max candidate
    for (let ri = runs.length - 2; ri >= 0; ri--) {
      if (candidates[ri + 1].length === 0) continue;
      const nextMax = candidates[ri + 1][candidates[ri + 1].length - 1];
      const before = candidates[ri].length;
      candidates[ri] = candidates[ri].filter((c) => c < nextMax);
      if (candidates[ri].length < before) changed = true;
    }
  }

  // If a run has exactly one candidate, mark that clue as completed
  for (let ri = 0; ri < runs.length; ri++) {
    if (candidates[ri].length === 1) {
      result[candidates[ri][0]] = true;
    }
  }

  return result;
}
