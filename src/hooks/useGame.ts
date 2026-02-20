import { useReducer, useCallback } from 'react';
import type { GameState, GameAction, PuzzleDefinition, BoardSize, InputMode } from '../types';
import { CellState, TIME_LIMITS, ERROR_LIMITS } from '../types';
import { computeRowClues, computeColClues, lineMatchesClue } from '../logic/clues';
import { checkWin } from '../logic/check';

const PENALTY_SECONDS = 5;

/** Auto-mark empty cells as X in any completed row/column */
function autoMarkCompleted(
  board: CellState[][],
  rowClues: number[][],
  colClues: number[][],
): void {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    const line = board[r].map((c) => (c === CellState.Filled ? 1 : 0));
    if (lineMatchesClue(line, rowClues[r])) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === CellState.Empty) board[r][c] = CellState.MarkedX;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    const line = board.map((row) => (row[c] === CellState.Filled ? 1 : 0));
    if (lineMatchesClue(line, colClues[c])) {
      for (let r = 0; r < rows; r++) {
        if (board[r][c] === CellState.Empty) board[r][c] = CellState.MarkedX;
      }
    }
  }
}

function sizeKey(puzzle: PuzzleDefinition): BoardSize {
  return `${puzzle.rows}x${puzzle.cols}` as BoardSize;
}

function createInitialState(puzzle: PuzzleDefinition): GameState {
  const key = sizeKey(puzzle);
  const limit = TIME_LIMITS[key] ?? 10 * 60;
  const maxErrors = ERROR_LIMITS[key] ?? 5;
  return {
    puzzle,
    board: Array.from({ length: puzzle.rows }, () =>
      Array(puzzle.cols).fill(CellState.Empty),
    ),
    rowClues: computeRowClues(puzzle.solution),
    colClues: computeColClues(puzzle.solution),
    timeLimit: limit,
    remaining: limit,
    started: false,
    won: false,
    lost: false,
    lostReason: null,
    errorCells: new Set(),
    errorCount: 0,
    maxErrors,
    inputMode: 'fill',
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'FILL_CELL': {
      if (state.won || state.lost) return state;
      const { row, col } = action;
      const current = state.board[row][col];

      // Already resolved cells can't be changed
      if (current === CellState.MarkedX) return state;

      // If already filled, toggle off
      if (current === CellState.Filled) {
        const newBoard = state.board.map((r) => [...r]);
        newBoard[row][col] = CellState.Empty;
        return { ...state, board: newBoard, started: true };
      }

      // Trying to fill — check against solution
      if (state.puzzle.solution[row][col] === 0) {
        const key = `${row},${col}`;
        const newErrors = new Set(state.errorCells);
        newErrors.add(key);
        const newErrorCount = state.errorCount + 1;
        const newRemaining = Math.max(0, state.remaining - PENALTY_SECONDS);
        const errorsExhausted = newErrorCount >= state.maxErrors;
        const timeOut = newRemaining === 0;
        const newBoard = state.board.map((r) => [...r]);
        newBoard[row][col] = CellState.MarkedX;
        return {
          ...state,
          board: newBoard,
          started: true,
          remaining: newRemaining,
          lost: errorsExhausted || timeOut,
          lostReason: errorsExhausted ? 'errors' : timeOut ? 'time' : null,
          errorCells: newErrors,
          errorCount: newErrorCount,
        };
      }

      // Correct fill
      const newBoard = state.board.map((r) => [...r]);
      newBoard[row][col] = CellState.Filled;
      autoMarkCompleted(newBoard, state.rowClues, state.colClues);
      const won = checkWin(newBoard, state.rowClues, state.colClues);
      return { ...state, board: newBoard, started: true, won };
    }
    case 'MARK_X': {
      if (state.won || state.lost) return state;
      const { row, col } = action;
      if (state.board[row][col] === CellState.Filled) return state;

      // Toggling existing X off is always allowed
      if (state.board[row][col] === CellState.MarkedX) {
        const newBoard = state.board.map((r) => [...r]);
        newBoard[row][col] = CellState.Empty;
        return { ...state, board: newBoard, started: true };
      }

      // Trying to mark X on a cell that should be filled → error + auto-fill
      if (state.puzzle.solution[row][col] === 1) {
        const key = `${row},${col}`;
        const newErrors = new Set(state.errorCells);
        newErrors.add(key);
        const newErrorCount = state.errorCount + 1;
        const newRemaining = Math.max(0, state.remaining - PENALTY_SECONDS);
        const errorsExhausted = newErrorCount >= state.maxErrors;
        const timeOut = newRemaining === 0;
        const newBoard = state.board.map((r) => [...r]);
        newBoard[row][col] = CellState.Filled;
        autoMarkCompleted(newBoard, state.rowClues, state.colClues);
        const won = checkWin(newBoard, state.rowClues, state.colClues);
        return {
          ...state,
          board: newBoard,
          started: true,
          remaining: newRemaining,
          lost: errorsExhausted || timeOut,
          lostReason: errorsExhausted ? 'errors' : timeOut ? 'time' : null,
          won: (errorsExhausted || timeOut) ? false : won,
          errorCells: newErrors,
          errorCount: newErrorCount,
        };
      }

      // Correct mark X
      const newBoard = state.board.map((r) => [...r]);
      newBoard[row][col] = CellState.MarkedX;
      return { ...state, board: newBoard, started: true };
    }
    case 'CLEAR_ERROR': {
      const key = `${action.row},${action.col}`;
      if (!state.errorCells.has(key)) return state;
      const newErrors = new Set(state.errorCells);
      newErrors.delete(key);
      return { ...state, errorCells: newErrors };
    }
    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode };
    case 'TICK': {
      if (!state.started || state.won || state.lost) return state;
      const newRemaining = state.remaining - 1;
      if (newRemaining <= 0) {
        return { ...state, remaining: 0, lost: true, lostReason: 'time' };
      }
      return { ...state, remaining: newRemaining };
    }
    case 'NEW_GAME':
      return createInitialState(action.puzzle);
    case 'RESET':
      return createInitialState(state.puzzle);
    default:
      return state;
  }
}

export function useGame(initialPuzzle: PuzzleDefinition) {
  const [state, dispatch] = useReducer(
    gameReducer,
    initialPuzzle,
    createInitialState,
  );

  const fillCell = useCallback(
    (row: number, col: number) => dispatch({ type: 'FILL_CELL', row, col }),
    [],
  );
  const markX = useCallback(
    (row: number, col: number) => dispatch({ type: 'MARK_X', row, col }),
    [],
  );
  const clearError = useCallback(
    (row: number, col: number) => dispatch({ type: 'CLEAR_ERROR', row, col }),
    [],
  );
  const setInputMode = useCallback(
    (mode: InputMode) => dispatch({ type: 'SET_INPUT_MODE', mode }),
    [],
  );
  const tick = useCallback(() => dispatch({ type: 'TICK' }), []);
  const newGame = useCallback(
    (puzzle: PuzzleDefinition) => dispatch({ type: 'NEW_GAME', puzzle }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state, fillCell, markX, clearError, setInputMode,
    tick, newGame, reset,
  };
}
