import type { PuzzleDefinition } from '../types';

const COLORS = [
  '#e05252', '#e0884d', '#d4a843', '#5bb876',
  '#4da8b8', '#5b8fd9', '#8b6cc1', '#c96b9e',
];

/** Generate a random puzzle with cohesive, recognizable patterns */
export function generateRandomPuzzle(
  rows: number,
  cols: number,
): PuzzleDefinition {
  let best: number[][] | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 30; attempt++) {
    const grid = generateBase(rows, cols);
    const smoothPasses = rows <= 5 ? 0 : rows <= 10 ? 1 : 2;
    smooth(grid, rows, cols, smoothPasses);

    if (hasEmptyLine(grid, rows, cols)) continue;

    const total = rows * cols;
    const filled = countFilled(grid, rows, cols);
    const density = filled / total;
    if (density < 0.3 || density > 0.65) continue;

    // Prefer density near 0.45 and large connected regions
    const score = -Math.abs(density - 0.45) * 10;
    if (score > bestScore) {
      bestScore = score;
      best = grid;
    }
  }

  if (!best) {
    best = fallback(rows, cols);
  }

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  return {
    name: `随机 ${rows}×${cols}`,
    rows,
    cols,
    solution: best,
    color,
  };
}

// --- Generation strategies ---

function generateBase(rows: number, cols: number): number[][] {
  const r = Math.random();
  if (r < 0.35) return symmetricBlob(rows, cols);
  if (r < 0.65) return circleBased(rows, cols);
  return walkBased(rows, cols);
}

/** Center-weighted random noise, mirrored horizontally */
function symmetricBlob(rows: number, cols: number): number[][] {
  const grid = makeGrid(rows, cols);
  const cy = rows / 2;
  const cx = cols / 2;
  const maxDist = Math.sqrt(cy * cy + cx * cx);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= Math.floor((cols - 1) / 2); c++) {
      const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2) / maxDist;
      const p = Math.max(0.05, 0.8 - dist * 1.0 + (Math.random() - 0.5) * 0.25);
      const val = Math.random() < p ? 1 : 0;
      grid[r][c] = val;
      grid[r][cols - 1 - c] = val;
    }
  }
  return grid;
}

/** Overlapping random ellipses */
function circleBased(rows: number, cols: number): number[][] {
  const grid = makeGrid(rows, cols);
  const numShapes = 2 + Math.floor(Math.random() * 4);

  for (let i = 0; i < numShapes; i++) {
    const cr = rows * (0.15 + Math.random() * 0.7);
    const cc = cols * (0.15 + Math.random() * 0.7);
    const ry = 1.5 + Math.random() * (rows / 2.5);
    const rx = 1.5 + Math.random() * (cols / 2.5);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (((r - cr) / ry) ** 2 + ((c - cc) / rx) ** 2 <= 1) {
          grid[r][c] = 1;
        }
      }
    }
  }
  return grid;
}

/** Random walks from center area, creating organic blobs */
function walkBased(rows: number, cols: number): number[][] {
  const grid = makeGrid(rows, cols);
  const numWalks = 3 + Math.floor(Math.random() * 4);
  const stepsPerWalk = Math.floor(rows * cols * 0.12);

  for (let w = 0; w < numWalks; w++) {
    let r = Math.floor(rows / 2 + (Math.random() - 0.5) * rows * 0.4);
    let c = Math.floor(cols / 2 + (Math.random() - 0.5) * cols * 0.4);

    for (let s = 0; s < stepsPerWalk; s++) {
      r = clamp(r, 0, rows - 1);
      c = clamp(c, 0, cols - 1);
      grid[r][c] = 1;
      // Also fill neighbors sometimes for thicker strokes
      if (Math.random() < 0.3) {
        const nr = clamp(r + randDir(), 0, rows - 1);
        const nc = clamp(c + randDir(), 0, cols - 1);
        grid[nr][nc] = 1;
      }
      const dir = Math.floor(Math.random() * 4);
      if (dir === 0) r--;
      else if (dir === 1) r++;
      else if (dir === 2) c--;
      else c++;
    }
  }
  return grid;
}

// --- Cellular automata smoothing ---

function smooth(grid: number[][], rows: number, cols: number, passes: number): void {
  for (let p = 0; p < passes; p++) {
    const prev = grid.map((r) => [...r]);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              n += prev[nr][nc];
            }
          }
        }
        if (prev[r][c] === 1) {
          grid[r][c] = n >= 2 ? 1 : 0; // survive with 2+ neighbors
        } else {
          grid[r][c] = n >= 4 ? 1 : 0; // birth with 4+ neighbors
        }
      }
    }
  }
}

// --- Helpers ---

function makeGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function randDir(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

function countFilled(grid: number[][], rows: number, cols: number): number {
  let count = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) count += grid[r][c];
  return count;
}

function hasEmptyLine(grid: number[][], rows: number, cols: number): boolean {
  for (let r = 0; r < rows; r++) {
    if (grid[r].every((c) => c === 0)) return true;
  }
  for (let c = 0; c < cols; c++) {
    if (grid.every((row) => row[c] === 0)) return true;
  }
  return false;
}

/** Varied fallback: randomly filled with target density */
function fallback(rows: number, cols: number): number[][] {
  const grid = makeGrid(rows, cols);
  const cy = (rows - 1) / 2;
  const cx = (cols - 1) / 2;
  const maxDist = Math.sqrt(cy * cy + cx * cx) || 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2) / maxDist;
      const p = 0.7 - d * 0.5 + (Math.random() - 0.5) * 0.3;
      if (Math.random() < p) grid[r][c] = 1;
    }
  }
  return grid;
}
