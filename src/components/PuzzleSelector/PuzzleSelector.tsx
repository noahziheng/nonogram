import type { BoardSize, PuzzleDefinition } from '../../types';
import { presets } from '../../data/presets';
import styles from './PuzzleSelector.module.css';

interface PuzzleSelectorProps {
  currentSize: BoardSize;
  onSelectSize: (size: BoardSize) => void;
  onSelectPuzzle: (puzzle: PuzzleDefinition) => void;
  onRandomPuzzle: () => void;
}

const sizes: BoardSize[] = ['5x5', '10x10', '15x15'];

export function PuzzleSelector({
  currentSize,
  onSelectSize,
  onSelectPuzzle,
  onRandomPuzzle,
}: PuzzleSelectorProps) {
  const puzzles = presets[currentSize];

  return (
    <div className={styles.selector}>
      <div className={styles.sizeRow}>
        <span className={styles.label}>尺寸：</span>
        {sizes.map((size) => (
          <button
            key={size}
            className={`${styles.sizeBtn} ${size === currentSize ? styles.active : ''}`}
            onClick={() => onSelectSize(size)}
          >
            {size}
          </button>
        ))}
      </div>
      <div className={styles.puzzleRow}>
        <span className={styles.label}>选择：</span>
        {puzzles.map((p) => (
          <button
            key={p.name}
            className={styles.puzzleBtn}
            onClick={() => onSelectPuzzle(p)}
          >
            {p.name}
          </button>
        ))}
        <button className={styles.randomBtn} onClick={onRandomPuzzle}>
          随机生成
        </button>
      </div>
    </div>
  );
}
