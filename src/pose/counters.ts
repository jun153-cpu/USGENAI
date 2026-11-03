import { THRESHOLDS } from '../config/thresholds';

/** 자세를 일정 시간 유지했는지 잰다. 잠깐 흐트러지는 건 봐주고, 오래 풀면 천천히 줄어든다. */
export class HoldTimer {
  private held = 0;
  private lastTime: number | null = null;
  private lastActiveAt = -Infinity;

  constructor(
    private readonly durationMs: number = THRESHOLDS.hold.durationMs,
    private readonly graceMs: number = THRESHOLDS.hold.graceMs,
  ) {}

  /** 진행률(0~1)을 반환 */
  update(active: boolean, time: number): number {
    const dt = this.lastTime === null ? 0 : Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    if (active) {
      this.held += dt;
      this.lastActiveAt = time;
    } else if (time - this.lastActiveAt > this.graceMs) {
      this.held = Math.max(0, this.held - dt);
    }
    return this.progress;
  }

  get progress(): number {
    return Math.min(1, this.held / this.durationMs);
  }

  reset(): void {
    this.held = 0;
    this.lastTime = null;
    this.lastActiveAt = -Infinity;
  }
}

export type RepPhase = 'unknown' | 'rest' | 'active';

/**
 * 쉬는 자세 → 동작 자세 → 쉬는 자세 를 1회로 센다.
 * 시작할 때 이미 동작 자세면 먼저 쉬는 자세를 거쳐야 센다.
 */
export class RepCounter {
  count = 0;
  phase: RepPhase = 'unknown';
  private activeSince = 0;
  private lastRepAt = -Infinity;

  /** 이번 호출에서 1회가 세어졌으면 true */
  update(active: boolean, rest: boolean, time: number): boolean {
    if (this.phase === 'unknown') {
      if (rest) this.phase = 'rest';
      return false;
    }
    if (this.phase === 'rest' && active) {
      this.phase = 'active';
      this.activeSince = time;
      return false;
    }
    if (this.phase === 'active' && rest) {
      this.phase = 'rest';
      const longEnough = time - this.activeSince >= THRESHOLDS.reps.minActiveMs;
      const spaced = time - this.lastRepAt >= THRESHOLDS.reps.minIntervalMs;
      if (longEnough && spaced) {
        this.count++;
        this.lastRepAt = time;
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.count = 0;
    this.phase = 'unknown';
    this.lastRepAt = -Infinity;
  }
}
