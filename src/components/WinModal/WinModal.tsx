import { formatTime } from '../../utils';
import styles from './WinModal.module.css';

interface WinModalProps {
  remaining: number;
  timeLimit: number;
  puzzleName: string;
  solution: number[][];
  color?: string;
  onNewGame: () => void;
}

export function WinModal({
  remaining,
  timeLimit,
  puzzleName,
  solution,
  color,
  onNewGame,
}: WinModalProps) {
  const used = timeLimit - remaining;
  const rows = solution.length;
  const cols = solution[0].length;
  const cellSize = Math.min(24, Math.floor(200 / Math.max(rows, cols)));
  const fillColor = color || 'var(--accent)';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div
          className={styles.pattern}
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {solution.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={styles.patternCell}
                style={{
                  background: cell === 1 ? fillColor : 'transparent',
                  animationDelay: `${(r + c) * 25}ms`,
                }}
              />
            )),
          )}
        </div>
        <h2 className={styles.title}>恭喜完成！</h2>
        <p className={styles.info}>
          你完成了「{puzzleName}」
        </p>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(used)}</span>
            <span className={styles.statLabel}>用时</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(remaining)}</span>
            <span className={styles.statLabel}>剩余</span>
          </div>
        </div>
        <button className={styles.btn} onClick={onNewGame}>
          再来一局
        </button>
      </div>
    </div>
  );
}
