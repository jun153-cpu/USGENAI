// 음원 파일 없이 Web Audio 로 효과음을 만든다.
let audio: AudioContext | null = null;

/** 터치 이벤트 안에서 호출해야 소리가 나온다. */
export function unlockAudio(): void {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') void audio.resume();
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.25): void {
  if (!audio) return;
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** 횟수 1회 */
export function playRep(): void {
  tone(880, 0, 0.15, 'triangle', 0.3);
}

/** 주문 성공 */
export function playSuccess(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.35, 'triangle', 0.3));
  tone(1568, 0.32, 0.6, 'sine', 0.15);
}

/** 카운트다운 */
export function playTick(): void {
  tone(660, 0, 0.12, 'square', 0.12);
}
