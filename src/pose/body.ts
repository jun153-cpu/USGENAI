import { angleDeg } from './geometry';
import { LM, isVisible, type Point } from './landmarks';

export interface Vec {
  x: number;
  y: number;
}

/** 차렷 자세에서 잰 아이 몸 정보. 거리 단위는 영상 높이 = 1. */
export interface BodyProfile {
  shoulderWidth: number;
  torsoLength: number;
  hipY: number;
  ankleSpread: number;
  /** 허벅지 세로 길이 ÷ 정강이 세로 길이 */
  thighRatio: number;
}

/** PC 개발 중 사람 없이 진행할 때 쓰는 기본값 (640x480 에서 2.5m 거리의 아이 정도) */
export const DEFAULT_PROFILE: BodyProfile = {
  shoulderWidth: 0.12,
  torsoLength: 0.18,
  hipY: 0.55,
  ankleSpread: 0.06,
  thighRatio: 1,
};

const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 한 프레임의 관절을 판정하기 쉬운 형태로 감싼다.
 * 좌표는 x 에 화면비를 곱해 가로·세로 단위를 맞춘 값.
 */
export class Body {
  /** 현재 거리에서의 어깨너비. 모든 판정 거리의 기준 단위. */
  readonly scale: number;
  readonly torsoLength: number | null;

  constructor(
    readonly lm: Point[],
    readonly aspect: number,
    readonly profile: BodyProfile,
  ) {
    this.torsoLength = this.visible(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP)
      ? dist(this.shoulderMid(), this.hipMid())
      : null;
    const shoulderWidth = this.visible(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER)
      ? dist(this.pt(LM.LEFT_SHOULDER), this.pt(LM.RIGHT_SHOULDER))
      : 0;
    // 몸을 옆으로 돌리면 어깨너비가 작아 보이므로 몸통 길이로 아래 한계를 둔다.
    const fromTorso = this.torsoLength !== null ? this.torsoLength * (profile.shoulderWidth / profile.torsoLength) * 0.8 : 0;
    this.scale = Math.max(shoulderWidth, fromTorso) || profile.shoulderWidth;
  }

  visible(...idx: number[]): boolean {
    return idx.every((i) => isVisible(this.lm[i]));
  }

  pt(i: number): Vec {
    const p = this.lm[i];
    return { x: p.x * this.aspect, y: p.y };
  }

  shoulderMid(): Vec {
    return mid(this.pt(LM.LEFT_SHOULDER), this.pt(LM.RIGHT_SHOULDER));
  }

  hipMid(): Vec {
    return mid(this.pt(LM.LEFT_HIP), this.pt(LM.RIGHT_HIP));
  }

  /** 보이는 무릎들의 평균 각도. 무릎이 하나도 안 보이면 null. */
  kneeAngle(): number | null {
    const angles: number[] = [];
    for (const [h, k, a] of [
      [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
      [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    ]) {
      if (this.visible(h, k, a)) angles.push(angleDeg(this.lm[h], this.lm[k], this.lm[a], this.aspect));
    }
    return angles.length ? angles.reduce((s, v) => s + v, 0) / angles.length : null;
  }

  /** 허벅지 세로 길이 ÷ 정강이 세로 길이 (보이는 다리 평균). 앉을수록 작아진다. */
  thighRatio(): number | null {
    const ratios: number[] = [];
    for (const [h, k, a] of [
      [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
      [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    ]) {
      if (!this.visible(h, k, a)) continue;
      const shin = this.lm[a].y - this.lm[k].y;
      if (shin > 0.01) ratios.push((this.lm[k].y - this.lm[h].y) / shin);
    }
    return ratios.length ? ratios.reduce((s, v) => s + v, 0) / ratios.length : null;
  }

  /** 두 발목 사이 가로 거리 (어깨너비 단위). 안 보이면 null. */
  ankleSpread(): number | null {
    if (!this.visible(LM.LEFT_ANKLE, LM.RIGHT_ANKLE)) return null;
    return Math.abs(this.pt(LM.LEFT_ANKLE).x - this.pt(LM.RIGHT_ANKLE).x) / this.scale;
  }
}
