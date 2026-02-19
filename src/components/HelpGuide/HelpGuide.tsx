import { useState } from 'react';
import styles from './HelpGuide.module.css';

const STORAGE_KEY = 'nonogram-help-dismissed';

interface HelpGuideProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function HelpGuide({ forceOpen, onClose }: HelpGuideProps) {
  const [autoShow, setAutoShow] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY);
  });

  const visible = forceOpen || autoShow;

  const dismiss = () => {
    setAutoShow(false);
    localStorage.setItem(STORAGE_KEY, '1');
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={dismiss}>
      <div className={styles.guide} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>如何游玩</h2>
          <button className={styles.closeBtn} onClick={dismiss} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.intro}>
            根据行列旁的数字提示，找出哪些格子需要填充，还原隐藏的图案。
          </p>
          <div className={styles.rules}>
            <div className={styles.rule}>
              <span className={styles.ruleIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--accent)">
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                </svg>
              </span>
              <span>数字表示该行/列中<strong>连续填充</strong>格子的数量</span>
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                  <rect x="2" y="2" width="5" height="12" rx="1.5" fill="var(--bg-cell-filled)" />
                  <rect x="9" y="2" width="5" height="12" rx="1.5" fill="var(--bg-cell-filled)" />
                </svg>
              </span>
              <span>多个数字之间至少间隔<strong>一格空白</strong></span>
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                  <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" />
                  <line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
                </svg>
              </span>
              <span>确定不需要填充的格子可以标记 ✕ 排除</span>
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="6" />
                  <line x1="8" y1="5" x2="8" y2="8.5" />
                  <circle cx="8" cy="11" r="0.8" fill="var(--warning)" />
                </svg>
              </span>
              <span>填错或标错会<strong>扣除 5 秒</strong>，在限时内完成即可</span>
            </div>
          </div>
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>桌面端</span>
              <span className={styles.controlDesc}>左键填充 · 右键标 ✕ · 可拖拽</span>
            </div>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>触屏</span>
              <span className={styles.controlDesc}>画板下方切换模式 · 滑动操作</span>
            </div>
          </div>
        </div>
        <button className={styles.startBtn} onClick={dismiss}>
          开始游戏
        </button>
      </div>
    </div>
  );
}
