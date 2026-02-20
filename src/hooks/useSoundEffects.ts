import { useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { CellState } from '../types';
import { playFill, playMarkX, playError, playWin, playLose, playLineComplete } from '../utils/sound';

/** Watch game state transitions and play appropriate sound effects */
export function useSoundEffects(state: GameState) {
  const prevRef = useRef({
    errorCount: state.errorCount,
    won: state.won,
    lost: state.lost,
    filledCount: 0,
    markedCount: 0,
    completedLines: 0,
  });

  // Only re-run when the board, win/lose, or errorCount actually changes.
  // Hover is now managed via DOM directly, so hover changes never trigger this.
  useEffect(() => {
    const prev = prevRef.current;

    // Count filled and marked cells
    let filled = 0;
    let marked = 0;
    for (const row of state.board) {
      for (const cell of row) {
        if (cell === CellState.Filled) filled++;
        else if (cell === CellState.MarkedX) marked++;
      }
    }

    // Count completed lines
    let completedLines = 0;
    const rows = state.board.length;
    const cols = state.board[0].length;
    for (let r = 0; r < rows; r++) {
      if (state.board[r].every((c) => c !== CellState.Empty)) completedLines++;
    }
    for (let c = 0; c < cols; c++) {
      if (state.board.every((row) => row[c] !== CellState.Empty)) completedLines++;
    }

    // Win / lose
    if (state.won && !prev.won) {
      playWin();
    } else if (state.lost && !prev.lost) {
      playLose();
    } else if (state.errorCount > prev.errorCount) {
      playError();
    } else if (completedLines > prev.completedLines) {
      playLineComplete();
    } else if (filled > prev.filledCount) {
      playFill();
    } else if (marked > prev.markedCount) {
      playMarkX();
    }

    prevRef.current = {
      errorCount: state.errorCount,
      won: state.won,
      lost: state.lost,
      filledCount: filled,
      markedCount: marked,
      completedLines,
    };
  }, [state.board, state.errorCount, state.won, state.lost]);
}
