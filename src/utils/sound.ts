let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function play(
  freq: number,
  type: OscillatorType,
  duration: number,
  volume = 0.15,
  delay = 0,
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ac.currentTime + delay + duration,
    );
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  } catch {
    /* audio not available */
  }
}

export function playFill() {
  play(660, 'sine', 0.08, 0.12);
}

export function playMarkX() {
  play(440, 'triangle', 0.06, 0.08);
}

export function playError() {
  play(180, 'sawtooth', 0.25, 0.12);
}

export function playWin() {
  play(523, 'sine', 0.15, 0.12, 0);
  play(659, 'sine', 0.15, 0.12, 0.12);
  play(784, 'sine', 0.15, 0.12, 0.24);
  play(1047, 'sine', 0.3, 0.15, 0.36);
}

export function playLose() {
  play(392, 'sine', 0.2, 0.1, 0);
  play(330, 'sine', 0.2, 0.1, 0.15);
  play(262, 'sine', 0.4, 0.12, 0.3);
}

export function playLineComplete() {
  play(880, 'sine', 0.1, 0.08, 0);
  play(1100, 'sine', 0.12, 0.1, 0.08);
}
