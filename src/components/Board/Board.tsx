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

/**
 * 从事件目标元素中提取 row/col 坐标
 * 支持事件委托模式
 */
function getCellCoords(target: EventTarget | null): { row: number; col: number } | null {
  if (!(target instanceof HTMLElement)) return null;
  // 向上查找最近的带有 data-row 和 data-col 的元素
  const cell = target.closest('[data-row][data-col]');
  if (!cell) return null;
  const row = cell.getAttribute('data-row');
  const col = cell.getAttribute('data-col');
  if (row === null || col === null) return null;
  return { row: Number(row), col: Number(col) };
}

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
  const [availableHeight, setAvailableHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight - 200 : 600,
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        if (rect.width > 0) setAvailableWidth(rect.width);
        // 估算可用高度：视口高度减去其他 UI 元素
        const viewportHeight = window.innerHeight;
        const estimatedOtherUI = 200; // header + toolbar + footer 等
        setAvailableHeight(Math.max(300, viewportHeight - estimatedOtherUI));
      }
    });
    ro.observe(el);
    // Measure immediately on mount
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setAvailableWidth(rect.width);
    return () => ro.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    const clueWidthPx = maxRowClueLen * CLUE_CHAR_W + CLUE_PAD;
    const clueHeightPx = maxColClueLen * CLUE_CHAR_W + CLUE_PAD;
    
    // 同时考虑宽度和高度限制
    const fitWidth = Math.floor((availableWidth - clueWidthPx) / cols);
    const fitHeight = Math.floor((availableHeight - clueHeightPx) / rows);
    
    const fit = Math.min(fitWidth, fitHeight);
    return Math.max(MIN_CELL, Math.min(BASE_CELL, fit));
  }, [availableWidth, availableHeight, cols, rows, maxRowClueLen, maxColClueLen]);

  const clueCharW = cellSize < 24 ? 14 : CLUE_CHAR_W;
  const cluePad = cellSize < 24 ? 8 : CLUE_PAD;

  // ── Hover: zero-React-render approach via direct DOM classList manipulation ──
  // We never call setState/dispatch for hover; instead we directly add/remove CSS
  // classes on the relevant Cell and ClueRow DOM elements. This means touchmove
  // at 60fps costs almost nothing.

  const hoverRef = useRef<{ row: number | null; col: number | null }>({ row: null, col: null });
  
  // 缓存 DOM 元素引用，避免重复 querySelectorAll
  const cellDOMCache = useRef<Map<string, HTMLElement>>(new Map());
  const clueDOMCache = useRef<Map<string, HTMLElement>>(new Map());

  // 当棋盘尺寸变化时清空缓存
  useEffect(() => {
    cellDOMCache.current.clear();
    clueDOMCache.current.clear();
    hoverRef.current = { row: null, col: null };
  }, [rows, cols, state.puzzle]);

  // 构建 DOM 缓存（延迟初始化）
  const ensureDOMCache = useCallback(() => {
    const board = boardRef.current;
    if (!board || cellDOMCache.current.size > 0) return;
    
    // 一次性查询所有 cell 和 clue 元素
    board.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((el) => {
      const r = el.getAttribute('data-row');
      const c = el.getAttribute('data-col');
      if (r !== null && c !== null) {
        cellDOMCache.current.set(`${r},${c}`, el);
      }
    });
    board.querySelectorAll<HTMLElement>('[data-clue-row]').forEach((el) => {
      const r = el.getAttribute('data-clue-row');
      if (r !== null) clueDOMCache.current.set(`clue-row-${r}`, el);
    });
    board.querySelectorAll<HTMLElement>('[data-clue-col]').forEach((el) => {
      const c = el.getAttribute('data-clue-col');
      if (c !== null) clueDOMCache.current.set(`clue-col-${c}`, el);
    });
  }, []);

  const applyHoverDOM = useCallback((row: number | null, col: number | null) => {
    ensureDOMCache();
    const prev = hoverRef.current;

    // 使用缓存的 DOM 引用进行操作
    const toggleHighlight = (r: number | null, c: number | null, add: boolean) => {
      if (r !== null) {
        // 高亮整行
        for (let i = 0; i < cols; i++) {
          const el = cellDOMCache.current.get(`${r},${i}`);
          if (el) el.classList.toggle(cellStyles.highlighted, add);
        }
        const clueEl = clueDOMCache.current.get(`clue-row-${r}`);
        if (clueEl) clueEl.classList.toggle(clueStyles.highlighted, add);
      }
      if (c !== null) {
        // 高亮整列
        for (let i = 0; i < rows; i++) {
          const el = cellDOMCache.current.get(`${i},${c}`);
          if (el) el.classList.toggle(cellStyles.highlighted, add);
        }
        const clueEl = clueDOMCache.current.get(`clue-col-${c}`);
        if (clueEl) clueEl.classList.toggle(clueStyles.highlighted, add);
      }
    };

    // 清除之前的高亮
    if (prev.row !== row || prev.col !== col) {
      toggleHighlight(prev.row, prev.col, false);
    }

    hoverRef.current = { row, col };

    // 应用新的高亮
    if (row !== null || col !== null) {
      toggleHighlight(row, col, true);
    }
  }, [ensureDOMCache, rows, cols]);

  const setHoverDirect = useCallback((row: number | null, col: number | null) => {
    const prev = hoverRef.current;
    if (prev.row === row && prev.col === col) return; // no-op
    applyHoverDOM(row, col);
  }, [applyHoverDOM]);

  const clearHoverDirect = useCallback(() => {
    applyHoverDOM(null, null);
  }, [applyHoverDOM]);

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

  // ── 事件委托：Board 层级统一处理鼠标事件 ──
  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (wonLostRef.current.won || wonLostRef.current.lost) return;
      const coords = getCellCoords(e.target);
      if (!coords) return;
      
      e.preventDefault();
      const { row, col } = coords;
      const isRight = e.button === 2;
      dragging.current = true;
      dragAction.current = determineDragAction(row, col, isRight);
      dragVisited.current = new Set([`${row},${col}`]);
      applyAction(row, col, dragAction.current);
    },
    [determineDragAction, applyAction],
  );

  const handleBoardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCellCoords(e.target);
      if (coords) {
        setHoverDirect(coords.row, coords.col);
        
        if (dragging.current) {
          const key = `${coords.row},${coords.col}`;
          if (!dragVisited.current.has(key)) {
            dragVisited.current.add(key);
            applyAction(coords.row, coords.col, dragAction.current);
          }
        }
      }
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

  // ── 触摸事件处理 ──
  const getCellFromTouch = useCallback(
    (touch: { clientX: number; clientY: number }): { row: number; col: number } | null => {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el) return null;
      return getCellCoords(el);
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

  // 计算棋盘总尺寸用于 max-width/max-height 限制
  const totalWidth = maxRowClueLen * clueCharW + cluePad + cols * cellSize;
  const totalHeight = maxColClueLen * clueCharW + cluePad + rows * cellSize;

  return (
    <div ref={wrapperRef} className={styles.boardOuter}>
      <div
        ref={boardRef}
        className={styles.board}
        style={{
          gridTemplateColumns: `${maxRowClueLen * clueCharW + cluePad}px repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `${maxColClueLen * clueCharW + cluePad}px repeat(${rows}, ${cellSize}px)`,
          maxWidth: totalWidth,
          maxHeight: totalHeight,
        }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleBoardMouseMove}
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
                onClearError={clearError}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
