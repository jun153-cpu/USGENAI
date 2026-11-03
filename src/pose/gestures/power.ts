import { THRESHOLDS } from '../../config/thresholds';
import { NOT_VISIBLE, round2, type GestureFn } from './types';

/** 力: 스쿼트. 무릎 각도가 작아지거나 허벅지가 짧아 보이면 앉은 것(active), 다시 펴면 rest. */
export const power: GestureFn = ({ body }) => {
  const knee = body.kneeAngle();
  const thigh = body.thighRatio();
  if (knee === null || thigh === null) return NOT_VISIBLE;
  const t = THRESHOLDS.power;
  const thighRel = thigh / body.profile.thighRatio;

  return {
    active: knee <= t.kneeDownMaxDeg || thighRel <= t.thighRatioDownMax,
    rest: knee >= t.kneeUpMinDeg && thighRel >= t.thighRatioUpMin,
    info: { knee: Math.round(knee), thighRel: round2(thighRel) },
  };
};
