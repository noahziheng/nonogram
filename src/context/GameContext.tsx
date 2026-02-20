import { createContext, useContext } from 'react';
import type { GameState, PuzzleDefinition, InputMode } from '../types';

interface GameContextValue {
  state: GameState;
  fillCell: (row: number, col: number) => void;
  markX: (row: number, col: number) => void;
  clearError: (row: number, col: number) => void;
  setInputMode: (mode: InputMode) => void;
  newGame: (puzzle: PuzzleDefinition) => void;
  reset: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameContext');
  return ctx;
}
