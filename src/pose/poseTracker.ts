import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { THRESHOLDS } from '../config/thresholds';
import { mirror, type PoseFrame } from './landmarks';
import { PoseSmoother } from './smoothing';

export type Delegate = 'GPU' | 'CPU';

export interface TrackerStats {
  delegate: Delegate;
  /** 초당 추론 횟수 */
  inferenceFps: number;
  /** 추론 1회 평균 소요 시간(ms) */
  inferenceMs: number;
}

function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

async function createLandmarker(delegate: Delegate): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(assetUrl('mediapipe/wasm'));
  const t = THRESHOLDS.tracking;
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: assetUrl('mediapipe/pose_landmarker_lite.task'), delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: t.minPoseDetectionConfidence,
    minPosePresenceConfidence: t.minPosePresenceConfidence,
    minTrackingConfidence: t.minTrackingConfidence,
  });
}

/** 카메라 영상 → 거울 반전 + 떨림 보정된 관절 좌표. */
export class PoseTracker {
  readonly stats: TrackerStats;
  private smoother = new PoseSmoother(THRESHOLDS.smoothing);
  private lastVideoTime = -1;
  private lastRunAt = 0;
  private lastTimestamp = 0;
  private fpsWindowStart = 0;
  private fpsWindowCount = 0;
  private switching = false;

  private constructor(private landmarker: PoseLandmarker, delegate: Delegate) {
    this.stats = { delegate, inferenceFps: 0, inferenceMs: 0 };
  }

  static async create(): Promise<PoseTracker> {
    try {
      return new PoseTracker(await createLandmarker('GPU'), 'GPU');
    } catch (err) {
      console.warn('GPU delegate unavailable, falling back to CPU', err);
      return new PoseTracker(await createLandmarker('CPU'), 'CPU');
    }
  }

  /** 새 영상 프레임이 있고 주기 제한을 넘었을 때만 추론한다. 추론하지 않으면 null. */
  detect(video: HTMLVideoElement, now: number): PoseFrame | null {
    if (this.switching || video.readyState < 2 || video.videoWidth === 0) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    if (now - this.lastRunAt < 1000 / THRESHOLDS.tracking.maxInferenceFps) return null;
    this.lastVideoTime = video.currentTime;
    this.lastRunAt = now;

    // detectForVideo 는 타임스탬프가 반드시 증가해야 한다.
    const timestamp = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = timestamp;

    let result;
    const t0 = performance.now();
    try {
      result = this.landmarker.detectForVideo(video, timestamp);
    } catch (err) {
      console.error('Pose inference failed', err);
      if (this.stats.delegate === 'GPU') void this.switchToCpu();
      return null;
    }
    this.recordTiming(performance.now() - t0, now);

    const raw = result.landmarks[0];
    let landmarks = null;
    if (raw && raw.length > 0) {
      landmarks = this.smoother.smooth(mirror(raw), now);
    } else {
      this.smoother.reset();
    }
    return { time: now, landmarks, aspect: video.videoWidth / video.videoHeight };
  }

  private recordTiming(ms: number, now: number): void {
    this.stats.inferenceMs = this.stats.inferenceMs === 0 ? ms : this.stats.inferenceMs * 0.9 + ms * 0.1;
    if (this.fpsWindowStart === 0) this.fpsWindowStart = now;
    this.fpsWindowCount++;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed >= 1000) {
      this.stats.inferenceFps = (this.fpsWindowCount * 1000) / elapsed;
      this.fpsWindowStart = now;
      this.fpsWindowCount = 0;
    }
  }

  private async switchToCpu(): Promise<void> {
    this.switching = true;
    try {
      this.landmarker.close();
      this.landmarker = await createLandmarker('CPU');
      this.stats.delegate = 'CPU';
      this.smoother.reset();
    } finally {
      this.switching = false;
    }
  }
}
