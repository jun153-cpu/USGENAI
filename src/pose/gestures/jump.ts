import { THRESHOLDS } from '../../config/thresholds';
import { LM } from '../landmarks';
import { NOT_VISIBLE, round2, type GestureFn } from './types';

/** 점프: 엉덩이가 서 있을 때 기준선보다 올라가면 공중(active), 내려오면 rest. */
export const jump: GestureFn = ({ body, baselineHipY }) => {
  if (!body.visible(LM.LEFT_HIP, LM.RIGHT_HIP)) return NOT_VISIBLE;
  const rise = (baselineHipY - body.hipMid().y) / body.scale;
  return {
    active: rise >= THRESHOLDS.jump.riseMin,
    rest: rise <= THRESHOLDS.jump.landMax,
    info: { rise: round2(rise) },
  };
};
