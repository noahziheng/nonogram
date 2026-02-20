import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { CellState } from '../../types';
import type { DragAction } from '../../types';
import { useGameContext } from '../../context/GameContext';
import { lineMatchesClue, computeClueCompletion } from '../../logic/clues';
import { Cell } from '../Cell/Cell';
import { ClueRow } from '../ClueRow/ClueRow';
import styles from './Board.module.css';

const BASE_CELL = 30;
const MIN_CELL = 24;
const CLUE_CHAR_W = 20;
const CLUE_PAD = 12;
const OUTER_PAD = 24; // total horizontal padding around board

export function Board() {
  const { state, fillCell, markX, setHover, clearHover } = useGameContext();
  const { board, rowClues, colClues, hoverRow, hoverCol, inputMode } = state;
  const rows = board.length;
  const cols = board[0].length;
  const boardRef = useRef<HTMLDivElement>(null);

  const maxRowClueLen = Math.max(...rowClues.map((c) => c.length));
  const maxColClueLen = Math.max(...colClues.map((c) => c.length));

  // Responsive cell size
  const [winWidth, setWinWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800,
  );

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cellSize = useMemo(() => {
    const outerPad = winWidth < 480 ? 16 : OUTER_PAD;
    const clueCharW = CLUE_CHAR_W;
    const clueWidth = maxRowClueLen * clueCharW + CLUE_PAD;
    const available = winWidth - outerPad - clueWidth;
    const fit = Math.floor(available / cols);
    return Math.max(MIN_CELL, Math.min(BASE_CELL, fit));
  }, [winWidth, cols, maxRowClueLen]);

  const clueCharW = cellSize < 24 ? 14 : CLUE_CHAR_W;
  const cluePad = cellSize < 24 ? 8 : CLUE_PAD;

  const dragging = useRef(false);
  const dragAction = useRef<DragAction>('fill');
  const dragVisited = useRef<Set<string>>(new Set());

  const determineDragAction = useCallback(
    (row: number, col: number, isRightClick: boolean): DragAction => {
      const current = board[row][col];
      if (isRightClick) {
        return current === CellState.MarkedX ? 'unmarkX' : 'markX';
      }
      return current === CellState.Filled ? 'unfill' : 'fill';
    },
    [board],
  );

  const applyAction = useCallback(
    (row: number, col: number, action: DragAction) => {
      const current = board[row][col];
      switch (action) {
        case 'fill':
          if (current !== CellState.Filled) fillCell(row, col);
          break;
        case 'unfill':
          if (current === CellState.Filled) fillCell(row, col);
          break;
        case 'markX':
          if (current !== CellState.MarkedX && current !== CellState.Filled)
            markX(row, col);
          break;
        case 'unmarkX':
          if (current === CellState.MarkedX) markX(row, col);
          break;
      }
    },
    [board, fillCell, markX],
  );

  const handleCellDown = useCallback(
    (row: number, col: number, button: number) => {
      if (state.won || state.lost) return;
      const isRight = button === 2;
      dragging.current = true;
      dragAction.current = determineDragAction(row, col, isRight);
      dragVisited.current = new Set([`${row},${col}`]);
      applyAction(row, col, dragAction.current);
    },
    [state.won, state.lost, determineDragAction, applyAction],
  );

  const handleCellEnter = useCallback(
    (row: number, col: number) => {
      setHover(row, col);
      if (!dragging.current) return;
      const key = `${row},${col}`;
      if (dragVisited.current.has(key)) return;
      dragVisited.current.add(key);
      applyAction(row, col, dragAction.current);
    },
    [setHover, applyAction],
  );

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getCellFromTouch = useCallback(
    (touch: { clientX: number; clientY: number }): { row: number; col: number } | null => {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el) return null;
      const r = el.getAttribute('data-row');
      const c = el.getAttribute('data-col');
      if (r == null || c == null) return null;
      return { row: Number(r), col: Number(c) };
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (state.won || state.lost) return;
      const touch = e.touches[0];
      const cell = getCellFromTouch(touch);
      if (!cell) return;
      e.preventDefault();
      const isMarkMode = inputMode === 'markX';
      dragging.current = true;
      dragAction.current = determineDragAction(cell.row, cell.col, isMarkMode);
      dragVisited.current = new Set([`${cell.row},${cell.col}`]);
      applyAction(cell.row, cell.col, dragAction.current);
      setHover(cell.row, cell.col);
    },
    [state.won, state.lost, inputMode, determineDragAction, applyAction, getCellFromTouch, setHover],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      const touch = e.touches[0];
      const cell = getCellFromTouch(touch);
      if (!cell) return;
      e.preventDefault();
      const key = `${cell.row},${cell.col}`;
      setHover(cell.row, cell.col);
      if (dragVisited.current.has(key)) return;
      dragVisited.current.add(key);
      applyAction(cell.row, cell.col, dragAction.current);
    },
    [getCellFromTouch, setHover, applyAction],
  );

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    // Don't clear hover on touch — keep it sticky so user can see row/col
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => el.removeEventListener('touchmove', prevent);
  }, []);

  const rowClueCompletion = useMemo(
    () => board.map((r, i) => computeClueCompletion(r, rowClues[i])),
    [board, rowClues],
  );

  const colClueCompletion = useMemo(
    () =>
      colClues.map((clue, c) => {
        const line = board.map((r) => r[c]);
        return computeClueCompletion(line, clue);
      }),
    [board, colClues],
  );

  const rowAllCompleted = useMemo(
    () =>
      board.map((r, i) => {
        const line = r.map((c) => (c === CellState.Filled ? 1 : 0));
        return lineMatchesClue(line, rowClues[i]);
      }),
    [board, rowClues],
  );

  const colAllCompleted = useMemo(
    () =>
      colClues.map((clue, c) => {
        const line = board.map((r) => (r[c] === CellState.Filled ? 1 : 0));
        return lineMatchesClue(line, clue);
      }),
    [board, colClues],
  );

  const handleColClueTap = useCallback(
    (c: number) => () => setHover(null, c),
    [setHover],
  );

  const handleRowClueTap = useCallback(
    (r: number) => () => setHover(r, null),
    [setHover],
  );

  return (
    <div
      ref={boardRef}
      className={styles.board}
      style={{
        gridTemplateColumns: `${maxRowClueLen * clueCharW + cluePad}px repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `${maxColClueLen * clueCharW + cluePad}px repeat(${rows}, ${cellSize}px)`,
        overscrollBehavior: 'contain',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseLeave={clearHover}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Top-left corner */}
      <div />

      {/* Column clues */}
      {colClues.map((clue, c) => (
        <ClueRow
          key={`col-${c}`}
          clues={clue}
          clueCompleted={colClueCompletion[c]}
          allCompleted={colAllCompleted[c]}
          highlighted={hoverCol === c}
          direction="col"
          onTap={handleColClueTap(c)}
        />
      ))}

      {/* Rows */}
      {board.map((row, r) => (
        <div key={`row-${r}`} style={{ display: 'contents' }}>
          <ClueRow
            clues={rowClues[r]}
            clueCompleted={rowClueCompletion[r]}
            allCompleted={rowAllCompleted[r]}
            highlighted={hoverRow === r}
            direction="row"
            onTap={handleRowClueTap(r)}
          />
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              row={r}
              col={c}
              value={cell}
              size={cellSize}
              highlighted={hoverRow === r || hoverCol === c}
              hasError={state.errorCells.has(`${r},${c}`)}
              onCellDown={handleCellDown}
              onCellEnter={handleCellEnter}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
