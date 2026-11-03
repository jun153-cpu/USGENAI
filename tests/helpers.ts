import { LANDMARK_COUNT, LM, type Point, type PoseFrame } from '../src/pose/landmarks';

export const ASPECT = 4 / 3;

type XY = [number, number];

/** 2.5m 쯤 떨어진 아이의 차렷 자세 (정규화 좌표, 4:3 영상). 어깨너비 ≈ 0.12 (영상 높이 단위). */
const STANDING: Record<number, XY> = {
  [LM.NOSE]: [0.5, 0.25],
  [LM.LEFT_EAR]: [0.48, 0.24],
  [LM.RIGHT_EAR]: [0.52, 0.24],
  [LM.LEFT_SHOULDER]: [0.455, 0.35],
  [LM.RIGHT_SHOULDER]: [0.545, 0.35],
  [LM.LEFT_ELBOW]: [0.445, 0.47],
  [LM.RIGHT_ELBOW]: [0.555, 0.47],
  [LM.LEFT_WRIST]: [0.44, 0.58],
  [LM.RIGHT_WRIST]: [0.56, 0.58],
  [LM.LEFT_HIP]: [0.47, 0.55],
  [LM.RIGHT_HIP]: [0.53, 0.55],
  [LM.LEFT_KNEE]: [0.47, 0.72],
  [LM.RIGHT_KNEE]: [0.53, 0.72],
  [LM.LEFT_ANKLE]: [0.47, 0.9],
  [LM.RIGHT_ANKLE]: [0.53, 0.9],
  [LM.LEFT_HEEL]: [0.47, 0.91],
  [LM.RIGHT_HEEL]: [0.53, 0.91],
  [LM.LEFT_FOOT]: [0.46, 0.93],
  [LM.RIGHT_FOOT]: [0.54, 0.93],
};

export function pose(overrides: Record<number, XY> = {}, shiftY = 0): Point[] {
  const all = { ...STANDING, ...overrides };
  return Array.from({ length: LANDMARK_COUNT }, (_, i) => {
    const [x, y] = all[i] ?? [0.5, 0.5];
    return { x, y: y + shiftY, z: 0, visibility: all[i] ? 1 : 0 };
  });
}

export const standing = () => pose();

export const armsForward = () =>
  pose({
    [LM.LEFT_ELBOW]: [0.46, 0.37],
    [LM.RIGHT_ELBOW]: [0.54, 0.37],
    [LM.LEFT_WRIST]: [0.47, 0.37],
    [LM.RIGHT_WRIST]: [0.53, 0.37],
  });

export const tPose = () =>
  pose({
    [LM.LEFT_ELBOW]: [0.38, 0.35],
    [LM.RIGHT_ELBOW]: [0.62, 0.35],
    [LM.LEFT_WRIST]: [0.3, 0.35],
    [LM.RIGHT_WRIST]: [0.7, 0.35],
  });

export const jackOpen = () =>
  pose({
    [LM.LEFT_ELBOW]: [0.42, 0.26],
    [LM.RIGHT_ELBOW]: [0.58, 0.26],
    [LM.LEFT_WRIST]: [0.43, 0.17],
    [LM.RIGHT_WRIST]: [0.57, 0.17],
    [LM.LEFT_KNEE]: [0.45, 0.72],
    [LM.RIGHT_KNEE]: [0.55, 0.72],
    [LM.LEFT_ANKLE]: [0.42, 0.9],
    [LM.RIGHT_ANKLE]: [0.58, 0.9],
  });

/** 팔만 올리고 다리는 모은 자세 */
export const armsUpOnly = () =>
  pose({
    [LM.LEFT_WRIST]: [0.43, 0.17],
    [LM.RIGHT_WRIST]: [0.57, 0.17],
  });

export const squat = () =>
  pose({
    [LM.NOSE]: [0.5, 0.4],
    [LM.LEFT_EAR]: [0.48, 0.39],
    [LM.RIGHT_EAR]: [0.52, 0.39],
    [LM.LEFT_SHOULDER]: [0.455, 0.49],
    [LM.RIGHT_SHOULDER]: [0.545, 0.49],
    [LM.LEFT_ELBOW]: [0.46, 0.55],
    [LM.RIGHT_ELBOW]: [0.54, 0.55],
    [LM.LEFT_WRIST]: [0.47, 0.5],
    [LM.RIGHT_WRIST]: [0.53, 0.5],
    [LM.LEFT_HIP]: [0.47, 0.68],
    [LM.RIGHT_HIP]: [0.53, 0.68],
    [LM.LEFT_KNEE]: [0.45, 0.74],
    [LM.RIGHT_KNEE]: [0.55, 0.74],
  });

/** 제자리에서 몸 전체가 위로 뜬 자세 */
export const airborne = () => pose({}, -0.05);

export function frame(landmarks: Point[] | null, time: number): PoseFrame {
  return { time, landmarks, aspect: ASPECT };
}

/** make() 자세를 durationMs 동안 33ms 간격 프레임으로 만든다. */
export function frames(make: () => Point[], startMs: number, durationMs: number): PoseFrame[] {
  const out: PoseFrame[] = [];
  for (let t = startMs; t < startMs + durationMs; t += 33) out.push(frame(make(), t));
  return out;
}
