import { memo, useEffect } from 'react';
import { CellState } from '../../types';
import { useGameContext } from '../../context/GameContext';
import styles from './Cell.module.css';

interface CellProps {
  row: number;
  col: number;
  value: CellState;
  size: number;
  highlighted: boolean;
  hasError: boolean;
  onCellDown: (row: number, col: number, button: number) => void;
  onCellEnter: (row: number, col: number) => void;
}

export const Cell = memo(function Cell({
  row,
  col,
  value,
  size,
  highlighted,
  hasError,
  onCellDown,
  onCellEnter,
}: CellProps) {
  const { clearError } = useGameContext();

  useEffect(() => {
    if (!hasError) return;
    const id = setTimeout(() => clearError(row, col), 600);
    return () => clearTimeout(id);
  }, [hasError, row, col, clearError]);

  const className = [
    styles.cell,
    value === CellState.Filled && styles.filled,
    value === CellState.MarkedX && styles.markedX,
    highlighted && styles.highlighted,
    hasError && styles.error,
    col % 5 === 0 && styles.thickLeft,
    row % 5 === 0 && styles.thickTop,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-row={row}
      data-col={col}
      style={{ width: size, height: size, fontSize: size < 24 ? 10 : 12 }}
      onMouseDown={(e) => {
        e.preventDefault();
        onCellDown(row, col, e.button);
      }}
      onMouseEnter={() => onCellEnter(row, col)}
    >
      {value === CellState.MarkedX && '\u2715'}
    </div>
  );
});
