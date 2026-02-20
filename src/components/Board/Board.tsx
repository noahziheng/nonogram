import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { CellState } from '../../types';
import type { DragAction } from '../../types';
import { useGameContext } from '../../context/GameContext';
import { lineMatchesClue, computeClueCompletion } from '../../logic/clues';
import { Cell } from '../Cell/Cell';
import { ClueRow } from '../ClueRow/ClueRow';
import styles from './Board.module.css';
import cellStyles from '../Cell/Cell.module.css';
import clueStyles from '../ClueRow/ClueRow.module.css';

const BASE_CELL = 30;
const MIN_CELL = 24;
const CLUE_CHAR_W = 20;
const CLUE_PAD = 12;

export function Board() {
  const { state, fillCell, markX, clearError } = useGameContext();
  const { board, rowClues, colClues, inputMode } = state;
  const rows = board.length;
  const cols = board[0].length;
  const boardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const maxRowClueLen = useMemo(() => Math.max(...rowClues.map((c) => c.length)), [rowClues]);
  const maxColClueLen = useMemo(() => Math.max(...colClues.map((c) => c.length)), [colClues]);

  // Use the actual wrapper width via ResizeObserver — avoids overflow/scrollbar on large boards.
  const [availableWidth, setAvailableWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth - 40 : 760,
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setAvailableWidth(w);
    });
    ro.observe(el);
    // Measure immediately on mount
    const w = el.getBoundingClientRect().width;
    if (w > 0) setAvailableWidth(w);
    return () => ro.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    const clueWidth = maxRowClueLen * CLUE_CHAR_W + CLUE_PAD;
    const fit = Math.floor((availableWidth - clueWidth) / cols);
    return Math.max(MIN_CELL, Math.min(BASE_CELL, fit));
  }, [availableWidth, cols, maxRowClueLen]);

  const clueCharW = cellSize < 24 ? 14 : CLUE_CHAR_W;
  const cluePad = cellSize < 24 ? 8 : CLUE_PAD;

  // ── Hover: zero-React-render approach via direct DOM classList manipulation ──
  // We never call setState/dispatch for hover; instead we directly add/remove CSS
  // classes on the relevant Cell and ClueRow DOM elements. This means touchmove
  // at 60fps costs almost nothing — just a querySelectorAll + classList toggle.

  const hoverRef = useRef<{ row: number | null; col: number | null }>({ row: null, col: null });

  const applyHoverDOM = useCallback((row: number | null, col: number | null) => {
    const board = boardRef.current;
    if (!board) return;

    const prev = hoverRef.current;

    // Clear previous highlighted cells
    if (prev.row !== null) {
      board.querySelectorAll<HTMLElement>(`[data-row="${prev.row}"]`).forEach((el) => {
        el.classList.remove(cellStyles.highlighted);
      });
      board.querySelectorAll<HTMLElement>(`[data-clue-row="${prev.row}"]`).forEach((el) => {
        el.classList.remove(clueStyles.highlighted);
      });
    }
    if (prev.col !== null) {
      board.querySelectorAll<HTMLElement>(`[data-col="${prev.col}"]`).forEach((el) => {
        el.classList.remove(cellStyles.highlighted);
      });
      board.querySelectorAll<HTMLElement>(`[data-clue-col="${prev.col}"]`).forEach((el) => {
        el.classList.remove(clueStyles.highlighted);
      });
    }

    hoverRef.current = { row, col };

    // Apply new highlighted cells
    if (row !== null) {
      board.querySelectorAll<HTMLElement>(`[data-row="${row}"]`).forEach((el) => {
        el.classList.add(cellStyles.highlighted);
      });
      const clueEl = board.querySelector<HTMLElement>(`[data-clue-row="${row}"]`);
      if (clueEl) clueEl.classList.add(clueStyles.highlighted);
    }
    if (col !== null) {
      board.querySelectorAll<HTMLElement>(`[data-col="${col}"]`).forEach((el) => {
        el.classList.add(cellStyles.highlighted);
      });
      const clueEl = board.querySelector<HTMLElement>(`[data-clue-col="${col}"]`);
      if (clueEl) clueEl.classList.add(clueStyles.highlighted);
    }
  }, []);

  const setHoverDirect = useCallback((row: number | null, col: number | null) => {
    const prev = hoverRef.current;
    if (prev.row === row && prev.col === col) return; // no-op
    applyHoverDOM(row, col);
  }, [applyHoverDOM]);

  const clearHoverDirect = useCallback(() => {
    applyHoverDOM(null, null);
  }, [applyHoverDOM]);

  // Clear hover DOM state when puzzle changes
  useEffect(() => {
    hoverRef.current = { row: null, col: null };
  }, [state.puzzle]);

  // ── Board state ref for stable drag callbacks ──
  const boardStateRef = useRef(board);
  boardStateRef.current = board;

  const wonLostRef = useRef({ won: state.won, lost: state.lost });
  wonLostRef.current = { won: state.won, lost: state.lost };

  const inputModeRef = useRef(inputMode);
  inputModeRef.current = inputMode;

  const dragging = useRef(false);
  const dragAction = useRef<DragAction>('fill');
  const dragVisited = useRef<Set<string>>(new Set());

  const determineDragAction = useCallback(
    (row: number, col: number, isRightClick: boolean): DragAction => {
      const current = boardStateRef.current[row][col];
      if (isRightClick) {
        return current === CellState.MarkedX ? 'unmarkX' : 'markX';
      }
      return current === CellState.Filled ? 'unfill' : 'fill';
    },
    [],
  );

  const applyAction = useCallback(
    (row: number, col: number, action: DragAction) => {
      const current = boardStateRef.current[row][col];
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
    [fillCell, markX],
  );

  const handleCellDown = useCallback(
    (row: number, col: number, button: number) => {
      if (wonLostRef.current.won || wonLostRef.current.lost) return;
      const isRight = button === 2;
      dragging.current = true;
      dragAction.current = determineDragAction(row, col, isRight);
      dragVisited.current = new Set([`${row},${col}`]);
      applyAction(row, col, dragAction.current);
    },
    [determineDragAction, applyAction],
  );

  const handleCellEnter = useCallback(
    (row: number, col: number) => {
      setHoverDirect(row, col);
      if (!dragging.current) return;
      const key = `${row},${col}`;
      if (dragVisited.current.has(key)) return;
      dragVisited.current.add(key);
      applyAction(row, col, dragAction.current);
    },
    [setHoverDirect, applyAction],
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
      if (wonLostRef.current.won || wonLostRef.current.lost) return;
      const touch = e.touches[0];
      const cell = getCellFromTouch(touch);
      if (!cell) return;
      e.preventDefault();
      const isMarkMode = inputModeRef.current === 'markX';
      dragging.current = true;
      dragAction.current = determineDragAction(cell.row, cell.col, isMarkMode);
      dragVisited.current = new Set([`${cell.row},${cell.col}`]);
      applyAction(cell.row, cell.col, dragAction.current);
      setHoverDirect(cell.row, cell.col);
    },
    [determineDragAction, applyAction, getCellFromTouch, setHoverDirect],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      const touch = e.touches[0];
      const cell = getCellFromTouch(touch);
      if (!cell) return;
      e.preventDefault();
      setHoverDirect(cell.row, cell.col);
      const key = `${cell.row},${cell.col}`;
      if (dragVisited.current.has(key)) return;
      dragVisited.current.add(key);
      applyAction(cell.row, cell.col, dragAction.current);
    },
    [getCellFromTouch, setHoverDirect, applyAction],
  );

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    // Keep hover sticky on touch — lets user see which row/col is highlighted
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

  // Stable tap handler arrays for ClueRow — rebuilt only when puzzle dimensions change
  const colTapRef = useRef<Array<() => void>>([]);
  const rowTapRef = useRef<Array<() => void>>([]);

  if (colTapRef.current.length !== cols) {
    colTapRef.current = Array.from({ length: cols }, (_, c) => () => setHoverDirect(null, c));
  }
  if (rowTapRef.current.length !== rows) {
    rowTapRef.current = Array.from({ length: rows }, (_, r) => () => setHoverDirect(r, null));
  }

  useEffect(() => {
    colTapRef.current = Array.from({ length: cols }, (_, c) => () => setHoverDirect(null, c));
    rowTapRef.current = Array.from({ length: rows }, (_, r) => () => setHoverDirect(r, null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows]);

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

  return (
    <div ref={wrapperRef} className={styles.boardOuter}>
      <div
        ref={boardRef}
        className={styles.board}
        style={{
          gridTemplateColumns: `${maxRowClueLen * clueCharW + cluePad}px repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `${maxColClueLen * clueCharW + cluePad}px repeat(${rows}, ${cellSize}px)`,
          overscrollBehavior: 'contain',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseLeave={clearHoverDirect}
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
            colIndex={c}
            direction="col"
            onTap={colTapRef.current[c]}
          />
        ))}

        {/* Rows */}
        {board.map((row, r) => (
          <div key={`row-${r}`} style={{ display: 'contents' }}>
            <ClueRow
              clues={rowClues[r]}
              clueCompleted={rowClueCompletion[r]}
              allCompleted={rowAllCompleted[r]}
              rowIndex={r}
              direction="row"
              onTap={rowTapRef.current[r]}
            />
            {row.map((cell, c) => (
              <Cell
                key={`${r}-${c}`}
                row={r}
                col={c}
                value={cell}
                size={cellSize}
                hasError={state.errorCells.has(`${r},${c}`)}
                onCellDown={handleCellDown}
                onCellEnter={handleCellEnter}
                onClearError={clearError}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
