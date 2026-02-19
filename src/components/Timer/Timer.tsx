import { formatTime } from '../../utils';
import styles from './Timer.module.css';

interface TimerProps {
  remaining: number;
  timeLimit: number;
}

export function Timer({ remaining, timeLimit }: TimerProps) {
  const ratio = remaining / timeLimit;
  const urgent = ratio <= 0.15;
  const warning = !urgent && ratio <= 0.33;

  const wrapClass = [
    styles.timerWrap,
    urgent && styles.urgent,
    warning && styles.warning,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      <span className={styles.icon}>{urgent ? '\u23F0' : '\u23F1'}</span>
      <span className={styles.timer}>{formatTime(remaining)}</span>
    </div>
  );
}
