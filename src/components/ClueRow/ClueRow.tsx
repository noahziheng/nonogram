import { memo } from 'react';
import styles from './ClueRow.module.css';

interface ClueRowProps {
  clues: number[];
  clueCompleted: boolean[];
  allCompleted: boolean;
  /** rowIndex or colIndex — used as data-row / data-col for CSS-driven hover highlight */
  rowIndex?: number;
  colIndex?: number;
  direction: 'row' | 'col';
  onTap?: () => void;
}

export const ClueRow = memo(function ClueRow({
  clues,
  clueCompleted,
  allCompleted,
  rowIndex,
  colIndex,
  direction,
  onTap,
}: ClueRowProps) {
  const className = [
    styles.clueRow,
    styles[direction],
    allCompleted && styles.allCompleted,
  ]
    .filter(Boolean)
    .join(' ');

  // data-row / data-col attributes let CSS (on the parent board element) drive
  // the highlighted state without React re-renders on every hover change.
  const dataAttrs =
    direction === 'row'
      ? { 'data-clue-row': rowIndex }
      : { 'data-clue-col': colIndex };

  return (
    <div className={className} onTouchStart={onTap} {...dataAttrs}>
      {clues.map((n, i) => {
        const numClass = [
          styles.clueNum,
          clueCompleted[i] && styles.done,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <span key={i} className={numClass}>
            {n}
          </span>
        );
      })}
    </div>
  );
});
