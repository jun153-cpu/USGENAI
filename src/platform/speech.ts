let koVoice: SpeechSynthesisVoice | null = null;
const supported = 'speechSynthesis' in window;

function pickVoice(): void {
  const voices = speechSynthesis.getVoices();
  koVoice = voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ko')) ?? null;
}

if (supported) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function hasKoreanVoice(): boolean {
  return koVoice !== null;
}

/** 모바일 브라우저는 터치 이벤트 안에서 한 번 말을 해야 이후 음성이 나온다. */
export function unlockSpeech(): void {
  if (!supported) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

export function speak(text: string, { interrupt = true } = {}): void {
  if (!supported) return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  if (koVoice) u.voice = koVoice;
  u.rate = 0.95;
  u.pitch = 1.15;
  speechSynthesis.speak(u);
}
