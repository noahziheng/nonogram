import { memo } from 'react';
import styles from './ClueRow.module.css';

interface ClueRowProps {
  clues: number[];
  clueCompleted: boolean[];
  allCompleted: boolean;
  highlighted: boolean;
  direction: 'row' | 'col';
  onTap?: () => void;
}

export const ClueRow = memo(function ClueRow({
  clues,
  clueCompleted,
  allCompleted,
  highlighted,
  direction,
  onTap,
}: ClueRowProps) {
  const className = [
    styles.clueRow,
    styles[direction],
    highlighted && !allCompleted && styles.highlighted,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} onTouchStart={onTap}>
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
