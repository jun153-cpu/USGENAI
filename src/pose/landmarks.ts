import { THRESHOLDS } from '../config/thresholds';

// MediaPipe Pose 33개 관절 중 사용하는 것. LEFT/RIGHT 는 아이 몸 기준.
export const LM = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT: 31,
  RIGHT_FOOT: 32,
} as const;

export const LANDMARK_COUNT = 33;

export const BODY_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT],
];

/** 화면 좌표(거울 반전 완료). x,y 는 0~1 정규화. */
export interface Point {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  /** performance.now() 기준 ms */
  time: number;
  /** 사람이 없으면 null */
  landmarks: Point[] | null;
  /** 영상 가로/세로 비율. 각도 계산 시 x 에 곱해 실제 비율로 맞춘다. */
  aspect: number;
}

/** 전면 카메라 원본 좌표를 거울 좌표로 바꾼다. */
export function mirror(raw: ReadonlyArray<{ x: number; y: number; z: number; visibility?: number }>): Point[] {
  return raw.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 }));
}

export function isVisible(p: Point | undefined): p is Point {
  return !!p && p.visibility >= THRESHOLDS.landmark.minVisibility;
}

export type FullBodyStatus = 'ok' | 'noPerson' | 'feetHidden' | 'headHidden' | 'partial';

const FULL_BODY_REQUIRED = [
  LM.NOSE,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_KNEE,
  LM.RIGHT_KNEE,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
];

function inFrame(p: Point): boolean {
  const m = THRESHOLDS.fullBody.edgeMargin;
  return p.x >= m && p.x <= 1 - m && p.y >= m && p.y <= 1 - m;
}

export function checkFullBody(lm: Point[] | null): FullBodyStatus {
  if (!lm) return 'noPerson';
  const ok = (i: number) => isVisible(lm[i]) && inFrame(lm[i]);
  if (FULL_BODY_REQUIRED.every(ok)) return 'ok';
  if (!ok(LM.NOSE)) return 'headHidden';
  if (!ok(LM.LEFT_ANKLE) || !ok(LM.RIGHT_ANKLE) || !ok(LM.LEFT_KNEE) || !ok(LM.RIGHT_KNEE)) return 'feetHidden';
  return 'partial';
}
