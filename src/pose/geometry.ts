import type { Point } from './landmarks';

/** 꼭짓점 b 에서 a-b-c 가 이루는 각도(0~180°). aspect 로 가로 비율을 보정한다. */
export function angleDeg(a: Point, b: Point, c: Point, aspect: number): number {
  const v1x = (a.x - b.x) * aspect;
  const v1y = a.y - b.y;
  const v2x = (c.x - b.x) * aspect;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 두 점 사이 거리(세로 높이 = 1 기준 단위). */
export function distance(a: Point, b: Point, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}
