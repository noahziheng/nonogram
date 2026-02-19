import styles from './GameOverModal.module.css';

interface GameOverModalProps {
  puzzleName: string;
  reason: 'time' | 'errors' | null;
  onRetry: () => void;
  onNewGame: () => void;
}

export function GameOverModal({ puzzleName, reason, onRetry, onNewGame }: GameOverModalProps) {
  const isErrors = reason === 'errors';
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.emoji}>{isErrors ? '\u{1F494}' : '\u23F0'}</div>
        <h2 className={styles.title}>{isErrors ? '挑战失败' : '时间到！'}</h2>
        <p className={styles.info}>
          {isErrors
            ? `「${puzzleName}」错误次数已用尽`
            : `「${puzzleName}」未能在规定时间内完成`}
        </p>
        <div className={styles.buttons}>
          <button className={styles.retryBtn} onClick={onRetry}>
            重试本题
          </button>
          <button className={styles.newBtn} onClick={onNewGame}>
            换一题
          </button>
        </div>
      </div>
    </div>
  );
}
