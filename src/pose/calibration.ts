import { THRESHOLDS } from '../config/thresholds';
import { Body, DEFAULT_PROFILE, type BodyProfile, type Vec } from './body';
import type { FullBodyStatus, PoseFrame } from './landmarks';

interface Sample {
  shoulderWidth: number;
  torsoLength: number;
  hipY: number;
  ankleSpread: number;
  thighRatio: number;
  center: Vec;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type CalibrationPhase = 'waiting' | 'measuring' | 'done';

/** 차렷 자세를 일정 시간 측정해 BodyProfile 을 만든다. */
export class Calibrator {
  phase: CalibrationPhase = 'waiting';
  progress = 0;
  /** 움직여서 측정을 다시 시작한 횟수 */
  restarts = 0;
  private samples: Sample[] = [];
  private startedAt = 0;

  update(frame: PoseFrame, status: FullBodyStatus): BodyProfile | null {
    if (this.phase === 'done') return null;
    if (status !== 'ok' || !frame.landmarks) {
      this.reset();
      return null;
    }

    const body = new Body(frame.landmarks, frame.aspect, DEFAULT_PROFILE);
    const sample = this.measure(body);
    if (!sample) return null;

    const first = this.samples[0];
    if (first && Math.hypot(sample.center.x - first.center.x, sample.center.y - first.center.y) > THRESHOLDS.calibration.maxDrift * first.shoulderWidth) {
      this.reset();
      this.restarts++;
    }

    if (this.phase === 'waiting') {
      this.phase = 'measuring';
      this.startedAt = frame.time;
    }
    this.samples.push(sample);
    this.progress = Math.min(1, (frame.time - this.startedAt) / THRESHOLDS.calibration.durationMs);
    if (this.progress < 1) return null;

    this.phase = 'done';
    const pick = (k: keyof Omit<Sample, 'center'>) => median(this.samples.map((s) => s[k]));
    return {
      shoulderWidth: pick('shoulderWidth'),
      torsoLength: pick('torsoLength'),
      hipY: pick('hipY'),
      ankleSpread: pick('ankleSpread'),
      thighRatio: pick('thighRatio'),
    };
  }

  private measure(body: Body): Sample | null {
    const thighRatio = body.thighRatio();
    const ankleSpread = body.ankleSpread();
    if (body.torsoLength === null || thighRatio === null || ankleSpread === null) return null;
    const center = body.hipMid();
    return {
      shoulderWidth: body.scale,
      torsoLength: body.torsoLength,
      hipY: center.y,
      ankleSpread: ankleSpread * body.scale,
      thighRatio,
      center,
    };
  }

  private reset(): void {
    this.phase = 'waiting';
    this.progress = 0;
    this.samples = [];
  }
}
