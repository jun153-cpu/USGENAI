import type { PoseFrame } from '../pose/landmarks';

interface RecordedFrame {
  t: number;
  aspect: number;
  /** [x, y, z, visibility] × 33. 사람이 없으면 null */
  lm: number[][] | null;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * 디버그 모드 전용: 관절 좌표(숫자)만 기록해 JSON 파일로 내려받는다.
 * 카메라 영상은 기록하지 않는다. 판정 임계값 조정과 테스트 데이터 제작용.
 */
export class Recorder {
  private frames: RecordedFrame[] = [];
  private recording = false;
  private readonly button: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'rec-btn';
    this.button.addEventListener('click', () => this.toggle());
    this.render();
    parent.appendChild(this.button);
  }

  push(frame: PoseFrame): void {
    if (!this.recording) return;
    this.frames.push({
      t: Math.round(frame.time),
      aspect: r3(frame.aspect),
      lm: frame.landmarks?.map((p) => [r3(p.x), r3(p.y), r3(p.z), r3(p.visibility)]) ?? null,
    });
    if (this.frames.length % 30 === 0) this.render();
  }

  private toggle(): void {
    if (this.recording) {
      this.recording = false;
      this.download();
    } else {
      this.frames = [];
      this.recording = true;
    }
    this.render();
  }

  private render(): void {
    this.button.textContent = this.recording ? `■ 저장 (${(this.frames.length / 30).toFixed(0)}초)` : '● 녹화';
    this.button.classList.toggle('on', this.recording);
  }

  private download(): void {
    if (this.frames.length === 0) return;
    const blob = new Blob([JSON.stringify({ version: 1, frames: this.frames })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pose-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
