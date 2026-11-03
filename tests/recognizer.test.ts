import { describe, expect, it } from 'vitest';
import { Body, type BodyProfile } from '../src/pose/body';
import { Calibrator } from '../src/pose/calibration';
import { HoldTimer, RepCounter } from '../src/pose/counters';
import { big } from '../src/pose/gestures/big';
import { fire } from '../src/pose/gestures/fire';
import { jump } from '../src/pose/gestures/jump';
import { power } from '../src/pose/gestures/power';
import type { GestureFn } from '../src/pose/gestures/types';
import type { Point } from '../src/pose/landmarks';
import { PoseRecognizer, type RecognizerState } from '../src/pose/poseRecognizer';
import { ASPECT, airborne, armsForward, armsUpOnly, frame, frames, jackOpen, pose, squat, standing, tPose } from './helpers';

const PROFILE: BodyProfile = { shoulderWidth: 0.12, torsoLength: 0.2, hipY: 0.55, ankleSpread: 0.08, thighRatio: 0.944 };

function evalOn(g: GestureFn, lm: Point[], baselineHipY = PROFILE.hipY) {
  return g({ body: new Body(lm, ASPECT, PROFILE), baselineHipY });
}

describe('gestures', () => {
  it('火 fire: arms forward is active, standing and T-pose are not', () => {
    expect(evalOn(fire, armsForward()).active).toBe(true);
    expect(evalOn(fire, standing()).active).toBe(false);
    expect(evalOn(fire, tPose()).active).toBe(false);
    expect(evalOn(fire, jackOpen()).active).toBe(false);
  });

  it('大 big: arms up + legs apart is active, arms down is rest', () => {
    expect(evalOn(big, jackOpen()).active).toBe(true);
    expect(evalOn(big, standing()).rest).toBe(true);
    expect(evalOn(big, standing()).active).toBe(false);
  });

  it('大 big: arms up without spreading legs is not enough by default', () => {
    expect(evalOn(big, armsUpOnly()).active).toBe(false);
  });

  it('力 power: squat is active, standing is rest', () => {
    expect(evalOn(power, squat()).active).toBe(true);
    expect(evalOn(power, standing()).rest).toBe(true);
    expect(evalOn(power, standing()).active).toBe(false);
  });

  it('jump: rising above the hip baseline is active', () => {
    expect(evalOn(jump, airborne()).active).toBe(true);
    expect(evalOn(jump, standing()).rest).toBe(true);
  });

  it('ignores gestures whose joints are not visible', () => {
    const lm = armsForward();
    lm[15].visibility = 0.1;
    const r = evalOn(fire, lm);
    expect(r.active).toBe(false);
    expect(r.rest).toBe(false);
  });

  it('judges in shoulder-width units, so distance from the camera does not matter', () => {
    // 카메라에 두 배 가까이 선 아이: 모든 좌표를 중심 기준 2배로 키운다.
    const near = (lm: Point[]) => lm.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * 2, y: 0.5 + (p.y - 0.5) * 2 }));
    expect(evalOn(fire, near(armsForward()), 0.5 + (0.55 - 0.5) * 2).active).toBe(true);
    expect(evalOn(fire, near(tPose()), 0.6).active).toBe(false);
  });
});

describe('HoldTimer', () => {
  it('forgives short breaks within the grace period', () => {
    const h = new HoldTimer(500, 250);
    for (let t = 0; t <= 300; t += 33) h.update(true, t);
    for (let t = 333; t <= 500; t += 33) h.update(false, t);
    let p = 0;
    for (let t = 533; t <= 800; t += 33) p = h.update(true, t);
    expect(p).toBe(1);
  });

  it('decays after a long break', () => {
    const h = new HoldTimer(500, 100);
    for (let t = 0; t <= 300; t += 33) h.update(true, t);
    const before = h.progress;
    for (let t = 333; t <= 700; t += 33) h.update(false, t);
    expect(h.progress).toBeLessThan(before);
  });
});

describe('RepCounter', () => {
  it('needs a rest pose before counting', () => {
    const c = new RepCounter();
    c.update(true, false, 0);
    c.update(false, true, 200);
    expect(c.count).toBe(0);
    c.update(true, false, 400);
    c.update(false, true, 600);
    expect(c.count).toBe(1);
  });

  it('ignores flickers shorter than the minimum active time', () => {
    const c = new RepCounter();
    c.update(false, true, 0);
    c.update(true, false, 500);
    c.update(false, true, 520);
    expect(c.count).toBe(0);
  });
});

describe('Calibrator', () => {
  it('measures the body after holding still for 3 seconds', () => {
    const cal = new Calibrator();
    let profile: BodyProfile | null = null;
    for (const f of frames(standing, 0, 3100)) profile ??= cal.update(f, 'ok');
    expect(profile).not.toBeNull();
    expect(profile!.shoulderWidth).toBeCloseTo(0.12, 2);
    expect(profile!.torsoLength).toBeCloseTo(0.2, 2);
    expect(profile!.hipY).toBeCloseTo(0.55, 2);
    expect(profile!.thighRatio).toBeCloseTo(0.944, 2);
  });

  it('restarts when the child moves', () => {
    const cal = new Calibrator();
    for (const f of frames(standing, 0, 1500)) cal.update(f, 'ok');
    for (const f of frames(() => pose({}, 0.1), 1500, 100)) cal.update(f, 'ok');
    expect(cal.restarts).toBe(1);
    expect(cal.progress).toBeLessThan(0.1);
  });

  it('waits while the full body is not visible', () => {
    const cal = new Calibrator();
    for (const f of frames(standing, 0, 3100)) cal.update(f, 'feetHidden');
    expect(cal.phase).toBe('waiting');
  });
});

describe('PoseRecognizer', () => {
  const run = (r: PoseRecognizer, seq: ReturnType<typeof frames>) => seq.map((f) => r.update(f));
  const timeline = (...parts: Array<[() => Point[], number]>) => {
    const out: ReturnType<typeof frames> = [];
    let t = 0;
    for (const [make, ms] of parts) {
      out.push(...frames(make, t, ms));
      t += ms;
    }
    return out;
  };

  it('火: holding arms forward for 0.5s succeeds once', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('fire');
    const states = run(r, timeline([standing, 300], [armsForward, 700]));
    expect(states.filter((s) => s.succeeded)).toHaveLength(1);
    expect(states.at(-1)!.done).toBe(true);
    expect(states.at(-1)!.progress).toBe(1);
  });

  it('力: three squats complete the spell and count as activity', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('power', 3);
    const states = run(r, timeline([standing, 300], [squat, 300], [standing, 300], [squat, 300], [standing, 300], [squat, 300], [standing, 300]));
    expect(states.filter((s) => s.repCounted)).toHaveLength(3);
    expect(states.filter((s) => s.succeeded)).toHaveLength(1);
    expect(states.at(-1)!.activity.squats).toBe(3);
  });

  it('大: jumping jacks are counted', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('big', 2);
    const states = run(r, timeline([standing, 300], [jackOpen, 300], [standing, 300], [jackOpen, 300], [standing, 300]));
    expect(states.at(-1)!.reps).toBe(2);
    expect(states.at(-1)!.done).toBe(true);
    expect(states.at(-1)!.activity.jumpingJacks).toBe(2);
  });

  it('counts jumps relative to the standing hip baseline', () => {
    const r = new PoseRecognizer(PROFILE);
    const states = run(r, timeline([standing, 500], [airborne, 200], [standing, 400], [airborne, 200], [standing, 400]));
    expect(states.at(-1)!.activity.jumps).toBe(2);
  });

  it('does not progress on the wrong gesture', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('fire');
    const states = run(r, timeline([standing, 300], [tPose, 1000], [jackOpen, 1000]));
    expect(states.some((s) => s.succeeded)).toBe(false);
  });

  it('keyboard simulation succeeds only for the current target', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('big', 3);
    r.simulateSuccess('fire');
    expect(r.update(null).succeeded).toBe(false);
    r.simulateSuccess('big');
    const s: RecognizerState = r.update(null);
    expect(s.succeeded).toBe(true);
    expect(s.done).toBe(true);
  });

  it('pauses the hold timer when the person disappears', () => {
    const r = new PoseRecognizer(PROFILE);
    r.setTarget('fire');
    run(r, frames(armsForward, 0, 300));
    const s = r.update(frame(null, 1000));
    expect(s.succeeded).toBe(false);
  });
});
