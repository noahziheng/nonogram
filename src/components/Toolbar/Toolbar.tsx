import { useGameContext } from '../../context/GameContext';
import { Timer } from '../Timer/Timer';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const { state, reset } = useGameContext();
  const livesLeft = state.maxErrors - state.errorCount;

  return (
    <div className={styles.toolbar}>
      <span className={styles.puzzleName}>{state.puzzle.name}</span>
      <div className={styles.lives} aria-label={`剩余 ${livesLeft} 次机会`}>
        {Array.from({ length: state.maxErrors }, (_, i) => (
          <span
            key={i}
            className={`${styles.heart} ${i >= livesLeft ? styles.heartLost : ''}`}
          >
            {'\u2764'}
          </span>
        ))}
      </div>
      <Timer remaining={state.remaining} timeLimit={state.timeLimit} />
      <button className={styles.resetBtn} onClick={reset}>
        重新开始
      </button>
    </div>
  );
}
