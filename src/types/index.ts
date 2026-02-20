export const CellState = {
  Empty: 0,
  Filled: 1,
  MarkedX: 2,
} as const;

export type CellState = (typeof CellState)[keyof typeof CellState];

export type InputMode = 'fill' | 'markX';

export interface PuzzleDefinition {
  name: string;
  rows: number;
  cols: number;
  solution: number[][]; // 1 = filled, 0 = empty
  color?: string; // display color for win screen
}

export interface GameState {
  puzzle: PuzzleDefinition;
  board: CellState[][];
  rowClues: number[][];
  colClues: number[][];
  timeLimit: number; // total seconds allowed
  remaining: number; // seconds left
  started: boolean;
  won: boolean;
  lost: boolean;
  lostReason: 'time' | 'errors' | null;
  errorCells: Set<string>;
  errorCount: number;
  maxErrors: number;
  inputMode: InputMode;
}

/** The paint action determined by the first cell in a drag */
export type DragAction = 'fill' | 'unfill' | 'markX' | 'unmarkX';

export type GameAction =
  | { type: 'FILL_CELL'; row: number; col: number }
  | { type: 'MARK_X'; row: number; col: number }
  | { type: 'TICK' }
  | { type: 'NEW_GAME'; puzzle: PuzzleDefinition }
  | { type: 'RESET' }
  | { type: 'CLEAR_ERROR'; row: number; col: number }
  | { type: 'SET_INPUT_MODE'; mode: InputMode };

export type BoardSize = '5x5' | '10x10' | '15x15';

/** Time limits in seconds per board size */
export const TIME_LIMITS: Record<BoardSize, number> = {
  '5x5': 3 * 60,
  '10x10': 10 * 60,
  '15x15': 20 * 60,
};

/** Max errors allowed per board size */
export const ERROR_LIMITS: Record<BoardSize, number> = {
  '5x5': 3,
  '10x10': 5,
  '15x15': 7,
};
