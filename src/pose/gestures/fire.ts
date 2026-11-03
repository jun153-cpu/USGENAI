import { THRESHOLDS } from '../../config/thresholds';
import { LM } from '../landmarks';
import { NOT_VISIBLE, round2, type GestureFn } from './types';

/** 火: 양팔을 앞으로 쭉. 두 손목이 어깨 높이 근처, 몸 앞쪽(좌우로 많이 벌리지 않음)에 있으면 성공. */
export const fire: GestureFn = ({ body }) => {
  if (!body.visible(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_WRIST, LM.RIGHT_WRIST)) return NOT_VISIBLE;
  const t = THRESHOLDS.fire;
  const shoulder = body.shoulderMid();

  let worstDy = 0;
  let worstDx = 0;
  let ok = true;
  for (const w of [body.pt(LM.LEFT_WRIST), body.pt(LM.RIGHT_WRIST)]) {
    // dy > 0 이면 어깨보다 아래
    const dy = (w.y - shoulder.y) / body.scale;
    const dx = Math.abs(w.x - shoulder.x) / body.scale;
    if (Math.abs(dy) > Math.abs(worstDy)) worstDy = dy;
    worstDx = Math.max(worstDx, dx);
    if (dy < -t.wristAboveShoulderMax || dy > t.wristBelowShoulderMax || dx > t.wristFromCenterMax) ok = false;
  }

  return {
    active: ok,
    rest: !ok,
    info: { wristDy: round2(worstDy), wristDx: round2(worstDx) },
  };
};
