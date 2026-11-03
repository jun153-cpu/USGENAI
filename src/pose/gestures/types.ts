import type { Body } from '../body';

export interface GestureContext {
  body: Body;
  /** 서 있을 때의 엉덩이 높이 기준선 (영상 높이 단위, 아래로 갈수록 큼) */
  baselineHipY: number;
}

export interface GestureResult {
  /** 동작 자세 (유지형은 이 상태를 유지, 횟수형은 이 상태 → rest 가 1회) */
  active: boolean;
  /** 쉬는 자세. active 와 rest 사이의 애매한 구간은 둘 다 false. */
  rest: boolean;
  /** 디버그 화면에 보여줄 측정값 */
  info: Record<string, number | boolean | null>;
}

export type GestureFn = (c: GestureContext) => GestureResult;

export const NOT_VISIBLE: GestureResult = { active: false, rest: false, info: { visible: false } };

export const round2 = (n: number) => Math.round(n * 100) / 100;
