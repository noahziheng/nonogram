import { memo, useEffect } from 'react';
import { CellState } from '../../types';
import styles from './Cell.module.css';

interface CellProps {
  row: number;
  col: number;
  value: CellState;
  size: number;
  hasError: boolean;
  onClearError: (row: number, col: number) => void;
}

/**
 * Cell 组件 - 纯展示组件
 * 事件处理已移至 Board 层级通过事件委托实现，提升移动端性能
 */
export const Cell = memo(function Cell({
  row,
  col,
  value,
  size,
  hasError,
  onClearError,
}: CellProps) {
  useEffect(() => {
    if (!hasError) return;
    const id = setTimeout(() => onClearError(row, col), 600);
    return () => clearTimeout(id);
  }, [hasError, row, col, onClearError]);

  const className = [
    styles.cell,
    value === CellState.Filled && styles.filled,
    value === CellState.MarkedX && styles.markedX,
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
    >
      {value === CellState.MarkedX && '\u2715'}
    </div>
  );
});
