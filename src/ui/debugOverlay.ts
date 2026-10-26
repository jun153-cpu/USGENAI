import { THRESHOLDS } from '../config/thresholds';
import type { DeviceFeatures } from '../platform/device';
import { angleDeg } from '../pose/geometry';
import { LM, isVisible, type FullBodyStatus, type PoseFrame } from '../pose/landmarks';
import type { TrackerStats } from '../pose/poseTracker';

export const isDebug = new URLSearchParams(location.search).get('debug') === '1';

interface DebugInfo {
  renderFps: number;
  tracker: TrackerStats;
  frame: PoseFrame | null;
  fullBody: FullBodyStatus;
  video: HTMLVideoElement;
  device: DeviceFeatures;
}

const ANGLES: Array<[string, number, number, number]> = [
  ['팔꿈치 L', LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
  ['팔꿈치 R', LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  ['어깨   L', LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  ['어깨   R', LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  ['무릎   L', LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
  ['무릎   R', LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
];

const fmt = (n: number, d = 2) => n.toFixed(d).padStart(d + 3);
const check = (b: boolean) => (b ? '✓' : '✗');

export class DebugOverlay {
  private lastUpdate = 0;

  constructor(private readonly el: HTMLElement) {
    el.hidden = !isDebug;
  }

  /** 글자 갱신은 초당 5번만 (레이아웃 부담 줄이기) */
  update(info: DebugInfo, now: number): void {
    if (!isDebug || now - this.lastUpdate < 200) return;
    this.lastUpdate = now;

    const { tracker, frame, video, device } = info;
    const lowFps = tracker.inferenceFps > 0 && tracker.inferenceFps < THRESHOLDS.tracking.targetInferenceFps;
    const lines = [
      `화면 ${info.renderFps.toFixed(0)}fps | 추론 ${tracker.inferenceFps.toFixed(1)}fps${lowFps ? ' ⚠느림' : ''} (${tracker.inferenceMs.toFixed(1)}ms) ${tracker.delegate}`,
      `영상 ${video.videoWidth}x${video.videoHeight} | 전신: ${info.fullBody}`,
      `전체화면 ${check(device.fullscreen)} 가로고정 ${check(device.landscapeLock)} 화면유지 ${check(device.wakeLock)}`,
      '',
    ];

    const lm = frame?.landmarks;
    if (lm && frame) {
      for (const [label, a, b, c] of ANGLES) {
        const ok = isVisible(lm[a]) && isVisible(lm[b]) && isVisible(lm[c]);
        lines.push(`${label} ${ok ? angleDeg(lm[a], lm[b], lm[c], frame.aspect).toFixed(0).padStart(4) + '°' : '   - '}`);
      }
      lines.push('', '관절           x     y   vis');
      for (const [name, idx] of Object.entries(LM)) {
        const p = lm[idx];
        lines.push(`${String(idx).padStart(2)} ${name.padEnd(14).slice(0, 14)}${fmt(p.x)}${fmt(p.y)}${fmt(p.visibility)}`);
      }
    } else {
      lines.push('사람 없음');
    }
    this.el.textContent = lines.join('\n');
  }
}
