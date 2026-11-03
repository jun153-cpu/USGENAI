import type { GestureId } from '../config/spells';
import { THRESHOLDS } from '../config/thresholds';
import { Body, type BodyProfile } from './body';
import { HoldTimer, RepCounter } from './counters';
import { big } from './gestures/big';
import { fire } from './gestures/fire';
import { jump } from './gestures/jump';
import { power } from './gestures/power';
import type { GestureFn, GestureResult } from './gestures/types';
import { LM, type PoseFrame } from './landmarks';

export const GESTURES: Record<GestureId, GestureFn> = { fire, big, power };

export interface ActivityStats {
  jumps: number;
  squats: number;
  jumpingJacks: number;
}

export interface RecognizerState {
  target: GestureId | null;
  /** 0~1. 유지형은 유지 시간, 횟수형은 (횟수 + 반동작 0.5) / 목표 횟수 */
  progress: number;
  reps: number;
  repsNeeded: number;
  done: boolean;
  /** 이번 업데이트에서 목표 동작 1회가 세어짐 */
  repCounted: boolean;
  /** 이번 업데이트에서 목표 달성 */
  succeeded: boolean;
  activity: ActivityStats;
  /** 디버그용: 이번 프레임의 동작별 판정 결과 */
  results: Partial<Record<GestureId | 'jump', GestureResult>>;
  baselineHipY: number;
}

interface Target {
  id: GestureId;
  repsNeeded: number;
  done: boolean;
}

/**
 * 게임과 독립된 동작 인식기.
 * setTarget() 으로 목표 동작을 정하고 새 프레임마다 update() 를 부르면 진행률·성공 여부를 돌려준다.
 * 점프·스쿼트·점핑잭 횟수(활동량)는 목표와 상관없이 항상 센다.
 */
export class PoseRecognizer {
  readonly activity: ActivityStats = { jumps: 0, squats: 0, jumpingJacks: 0 };
  private target: Target | null = null;
  private hold = new HoldTimer();
  private targetReps = new RepCounter();
  private statSquat = new RepCounter();
  private statJack = new RepCounter();
  private statJump = new RepCounter();
  private baselineHipY: number;
  private simulated: GestureId | null = null;
  private lastResults: RecognizerState['results'] = {};

  constructor(readonly profile: BodyProfile) {
    this.baselineHipY = profile.hipY;
  }

  /** repsNeeded 가 있으면 횟수형, 없으면 유지형 */
  setTarget(id: GestureId | null, repsNeeded?: number): void {
    this.target = id ? { id, repsNeeded: repsNeeded ?? 0, done: false } : null;
    this.hold.reset();
    this.targetReps.reset();
  }

  /** 키보드 등으로 동작 성공을 흉내낸다 (다음 update 에 반영) */
  simulateSuccess(id: GestureId): void {
    this.simulated = id;
  }

  /** frame 이 null 이면 새 프레임 없이 시뮬레이션 입력만 처리 */
  update(frame: PoseFrame | null): RecognizerState {
    let repCounted = false;
    let succeeded = false;
    const target = this.target;

    if (frame?.landmarks) {
      const body = new Body(frame.landmarks, frame.aspect, this.profile);
      const ctx = { body, baselineHipY: this.baselineHipY };
      const results: RecognizerState['results'] = {
        fire: fire(ctx),
        big: big(ctx),
        power: power(ctx),
        jump: jump(ctx),
      };
      this.lastResults = results;
      this.countActivity(results, frame.time);
      this.updateBaseline(body, results);

      if (target && !target.done) {
        const r = results[target.id]!;
        if (target.repsNeeded > 0) {
          repCounted = this.targetReps.update(r.active, r.rest, frame.time);
          succeeded = this.targetReps.count >= target.repsNeeded;
        } else {
          succeeded = this.hold.update(r.active, frame.time) >= 1;
        }
      }
    } else if (frame && target && !target.done && target.repsNeeded === 0) {
      this.hold.update(false, frame.time);
    }

    if (this.simulated && target && !target.done && this.simulated === target.id) succeeded = true;
    this.simulated = null;
    if (succeeded && target) target.done = true;

    return {
      target: target?.id ?? null,
      progress: this.progress(),
      reps: this.targetReps.count,
      repsNeeded: target?.repsNeeded ?? 0,
      done: target?.done ?? false,
      repCounted,
      succeeded,
      activity: { ...this.activity },
      results: this.lastResults,
      baselineHipY: this.baselineHipY,
    };
  }

  private progress(): number {
    const t = this.target;
    if (!t) return 0;
    if (t.done) return 1;
    if (t.repsNeeded === 0) return this.hold.progress;
    const half = this.targetReps.phase === 'active' ? 0.5 : 0;
    return Math.min(1, (this.targetReps.count + half) / t.repsNeeded);
  }

  private countActivity(results: RecognizerState['results'], time: number): void {
    const { power: p, big: b, jump: j } = results;
    if (p && this.statSquat.update(p.active, p.rest, time)) this.activity.squats++;
    if (b && this.statJack.update(b.active, b.rest, time)) this.activity.jumpingJacks++;
    if (j && this.statJump.update(j.active, j.rest, time)) this.activity.jumps++;
  }

  /** 무릎을 편 채 땅에 서 있을 때만 엉덩이 기준선을 천천히 현재 위치로 맞춘다 (앞뒤로 움직여도 따라가도록). */
  private updateBaseline(body: Body, results: RecognizerState['results']): void {
    if (!body.visible(LM.LEFT_HIP, LM.RIGHT_HIP)) return;
    const knee = body.kneeAngle();
    if (knee === null || knee < THRESHOLDS.baseline.kneeStraightDeg) return;
    if (this.statJump.phase === 'active' || results.jump?.active) return;
    this.baselineHipY += (body.hipMid().y - this.baselineHipY) * THRESHOLDS.baseline.adaptRate;
  }
}
