import { THRESHOLDS } from '../../config/thresholds';
import { LM } from '../landmarks';
import { NOT_VISIBLE, round2, type GestureFn } from './types';

/** 大: 점핑잭. 팔을 어깨 위로 올리고 다리를 벌리면 active, 팔을 내리면 rest. */
export const big: GestureFn = ({ body }) => {
  if (!body.visible(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_WRIST, LM.RIGHT_WRIST)) return NOT_VISIBLE;
  const t = THRESHOLDS.big;
  const shoulderY = body.shoulderMid().y;

  // 양 손목 중 더 낮은 쪽 기준 (양팔 모두 올려야 함). 양수 = 어깨보다 위.
  const lowerWrist = Math.max(body.pt(LM.LEFT_WRIST).y, body.pt(LM.RIGHT_WRIST).y);
  const higherWrist = Math.min(body.pt(LM.LEFT_WRIST).y, body.pt(LM.RIGHT_WRIST).y);
  const armsUpBy = (shoulderY - lowerWrist) / body.scale;
  const armsDownBy = (higherWrist - shoulderY) / body.scale;

  const spread = body.ankleSpread();
  const legsOpen = spread !== null && spread >= t.legsOpenMin;

  const armsUp = armsUpBy >= t.armsUpMin;
  const armsDown = armsDownBy >= t.armsDownMin;

  return {
    active: armsUp && (legsOpen || !t.requireLegs),
    rest: armsDown,
    info: { armsUpBy: round2(armsUpBy), legSpread: spread === null ? null : round2(spread), legsOpen },
  };
};
