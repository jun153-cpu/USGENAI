import { describe, expect, it } from 'vitest';
import { angleDeg } from '../src/pose/geometry';
import { LANDMARK_COUNT, LM, checkFullBody, mirror, type Point } from '../src/pose/landmarks';
import { OneEuroFilter } from '../src/pose/smoothing';

const p = (x: number, y: number, visibility = 1): Point => ({ x, y, z: 0, visibility });

function standingPose(): Point[] {
  const lm = Array.from({ length: LANDMARK_COUNT }, () => p(0.5, 0.5));
  lm[LM.NOSE] = p(0.5, 0.15);
  lm[LM.LEFT_SHOULDER] = p(0.45, 0.3);
  lm[LM.RIGHT_SHOULDER] = p(0.55, 0.3);
  lm[LM.LEFT_HIP] = p(0.46, 0.55);
  lm[LM.RIGHT_HIP] = p(0.54, 0.55);
  lm[LM.LEFT_KNEE] = p(0.46, 0.72);
  lm[LM.RIGHT_KNEE] = p(0.54, 0.72);
  lm[LM.LEFT_ANKLE] = p(0.46, 0.9);
  lm[LM.RIGHT_ANKLE] = p(0.54, 0.9);
  return lm;
}

describe('angleDeg', () => {
  it('measures a straight line as 180°', () => {
    expect(angleDeg(p(0, 0), p(0.5, 0), p(1, 0), 1)).toBeCloseTo(180);
  });

  it('measures a right angle as 90°', () => {
    expect(angleDeg(p(0, 0), p(0, 1), p(1, 1), 1)).toBeCloseTo(90);
  });

  it('corrects for non-square video', () => {
    // 4:3 영상에서 정규화 좌표 (0.75, 1) 방향은 실제로 45°
    expect(angleDeg(p(0.75, 1), p(0, 0), p(0, 1), 4 / 3)).toBeCloseTo(45);
  });
});

describe('mirror', () => {
  it('flips x and keeps anatomical labels', () => {
    const [a] = mirror([{ x: 0.2, y: 0.3, z: 0.1, visibility: 0.9 }]);
    expect(a).toEqual({ x: 0.8, y: 0.3, z: 0.1, visibility: 0.9 });
  });
});

describe('checkFullBody', () => {
  it('accepts a fully visible standing pose', () => {
    expect(checkFullBody(standingPose())).toBe('ok');
  });

  it('reports no person', () => {
    expect(checkFullBody(null)).toBe('noPerson');
  });

  it('reports hidden feet when ankles are out of frame', () => {
    const lm = standingPose();
    lm[LM.LEFT_ANKLE] = p(0.46, 1.05);
    expect(checkFullBody(lm)).toBe('feetHidden');
  });

  it('reports hidden feet when ankles have low visibility', () => {
    const lm = standingPose();
    lm[LM.RIGHT_ANKLE] = p(0.54, 0.9, 0.1);
    expect(checkFullBody(lm)).toBe('feetHidden');
  });

  it('reports hidden head', () => {
    const lm = standingPose();
    lm[LM.NOSE] = p(0.5, -0.02);
    expect(checkFullBody(lm)).toBe('headHidden');
  });
});

describe('OneEuroFilter', () => {
  const params = { minCutoff: 1, beta: 0, dCutoff: 1 };

  it('damps jitter on a still signal', () => {
    const f = new OneEuroFilter(params);
    let out = 0;
    for (let i = 0; i < 60; i++) out = f.filter(0.5 + (i % 2 ? 0.02 : -0.02), i / 30);
    expect(Math.abs(out - 0.5)).toBeLessThan(0.01);
  });

  it('converges to a new steady value', () => {
    const f = new OneEuroFilter(params);
    f.filter(0, 0);
    let out = 0;
    for (let i = 1; i <= 90; i++) out = f.filter(1, i / 30);
    expect(out).toBeCloseTo(1, 2);
  });
});
