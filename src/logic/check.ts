import { CellState } from '../types';
import { lineMatchesClue } from './clues';

/** Check if the board matches the solution clues (win condition) */
export function checkWin(
  board: CellState[][],
  rowClues: number[][],
  colClues: number[][],
): boolean {
  const rows = board.length;
  const cols = board[0].length;

  // Check each row
  for (let r = 0; r < rows; r++) {
    const line = board[r].map((c) => (c === CellState.Filled ? 1 : 0));
    if (!lineMatchesClue(line, rowClues[r])) return false;
  }

  // Check each column
  for (let c = 0; c < cols; c++) {
    const line = board.map((row) => (row[c] === CellState.Filled ? 1 : 0));
    if (!lineMatchesClue(line, colClues[c])) return false;
  }

  return true;
}
