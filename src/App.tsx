import { useState, useCallback } from 'react';
import type { BoardSize, PuzzleDefinition } from './types';
import { presets } from './data/presets';
import { generateRandomPuzzle } from './logic/generate';
import { useGame } from './hooks/useGame';
import { useTimer } from './hooks/useTimer';
import { useTheme } from './hooks/useTheme';
import { useSoundEffects } from './hooks/useSoundEffects';
import { GameContext } from './context/GameContext';
import { Board } from './components/Board/Board';
import { Toolbar } from './components/Toolbar/Toolbar';
import { PuzzleSelector } from './components/PuzzleSelector/PuzzleSelector';
import { WinModal } from './components/WinModal/WinModal';
import { GameOverModal } from './components/GameOverModal/GameOverModal';
import { HelpGuide } from './components/HelpGuide/HelpGuide';
import styles from './App.module.css';

const STORAGE_KEY_SIZE = 'nonogram-size';

function loadSize(): BoardSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SIZE);
    if (saved === '5x5' || saved === '10x10' || saved === '15x15') return saved;
  } catch { /* ignore */ }
  return '5x5';
}

const initialSize = loadSize();
const defaultPuzzle = presets[initialSize][0];

export default function App() {
  const [currentSize, setCurrentSize] = useState<BoardSize>(initialSize);
  const [helpOpen, setHelpOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const {
    state, fillCell, markX, clearError, setInputMode,
    tick, newGame, reset,
  } = useGame(defaultPuzzle);

  useTimer(state.started, state.won || state.lost, tick);
  useSoundEffects(state);

  const handleSelectSize = useCallback(
    (size: BoardSize) => {
      setCurrentSize(size);
      try { localStorage.setItem(STORAGE_KEY_SIZE, size); } catch { /* ignore */ }
      newGame(presets[size][0]);
    },
    [newGame],
  );

  const handleSelectPuzzle = useCallback(
    (puzzle: PuzzleDefinition) => {
      newGame(puzzle);
    },
    [newGame],
  );

  const handleRandomPuzzle = useCallback(() => {
    const [r, c] = currentSize.split('x').map(Number);
    newGame(generateRandomPuzzle(r, c));
  }, [currentSize, newGame]);

  return (
    <GameContext.Provider
      value={{
        state, fillCell, markX, clearError, setInputMode,
        newGame, reset,
      }}
    >
      <div className={styles.app}>
        <div className={styles.header}>
          <button
            className={styles.helpBtn}
            onClick={() => setHelpOpen(true)}
            aria-label="游戏帮助"
          >
            ?
          </button>
          <h1 className={styles.title}>数织 Nonogram</h1>
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label="切换主题"
          >
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <PuzzleSelector
          currentSize={currentSize}
          onSelectSize={handleSelectSize}
          onSelectPuzzle={handleSelectPuzzle}
          onRandomPuzzle={handleRandomPuzzle}
        />
        <Toolbar />
        <div className={styles.boardWrapper}>
          <Board />
        </div>
        <div className={styles.boardFooter}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${state.inputMode === 'fill' ? styles.modeFillActive : ''}`}
              onClick={() => setInputMode('fill')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="1" y="1" width="12" height="12" rx="2" />
              </svg>
              <span>填充</span>
            </button>
            <button
              className={`${styles.modeBtn} ${state.inputMode === 'markX' ? styles.modeXActive : ''}`}
              onClick={() => setInputMode('markX')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
              <span>标记</span>
            </button>
          </div>
          <p className={styles.hint}>
            点击填充 · 切换模式标记 ✕ · 可滑动
          </p>
        </div>
        <HelpGuide forceOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        {state.won && (
          <WinModal
            remaining={state.remaining}
            timeLimit={state.timeLimit}
            puzzleName={state.puzzle.name}
            solution={state.puzzle.solution}
            color={state.puzzle.color}
            onNewGame={handleRandomPuzzle}
          />
        )}
        {state.lost && (
          <GameOverModal
            puzzleName={state.puzzle.name}
            reason={state.lostReason}
            onRetry={reset}
            onNewGame={handleRandomPuzzle}
          />
        )}
      </div>
    </GameContext.Provider>
  );
}
