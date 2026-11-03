import { DEFAULT_PROFILE } from '../../pose/body';
import { Calibrator } from '../../pose/calibration';
import { playSuccess, playTick } from '../../platform/sfx';
import { speak } from '../../platform/speech';
import { isDebug } from '../../ui/debugOverlay';
import { BODY_STATUS_TEXT, type Flow, type Gfx, type Scene, type Tick } from '../app';
import { COLORS, drawBackground, drawCameraPanel, drawProgressBar, drawText } from '../draw';
import { bigCameraBox, drawSilhouette } from './ready';

/** 3초 차렷 자세로 아이 몸 크기를 잰다. */
export class CalibrateScene implements Scene {
  private cal = new Calibrator();
  private lastCount = 0;
  private seenRestarts = 0;
  private finished = false;

  constructor(private readonly flow: Flow) {}

  enter(): void {
    speak('차렷! 셋을 셀 동안 가만히 서 있어요.');
  }

  update(t: Tick): void {
    if (this.finished || !t.newFrame) return;
    const profile = this.cal.update(t.newFrame, t.body);
    if (profile) {
      this.finished = true;
      playSuccess();
      speak('준비 완료! 마법 연습을 시작해요!');
      this.flow.toPractice(profile);
      return;
    }
    if (this.cal.restarts !== this.seenRestarts) {
      this.seenRestarts = this.cal.restarts;
      speak('움직였어요! 다시 가만히!');
    }
    const count = this.countdown();
    if (count > 0 && count !== this.lastCount) playTick();
    this.lastCount = count;
  }

  private countdown(): number {
    return this.cal.phase === 'measuring' ? Math.max(1, Math.ceil((1 - this.cal.progress) * 3)) : 0;
  }

  draw(g: Gfx, t: Tick): void {
    drawBackground(g);
    const box = bigCameraBox(g);
    const r = drawCameraPanel(g, t.frame, box, isDebug, t.body === 'ok' ? COLORS.green : COLORS.white);
    const count = this.countdown();
    if (count === 0) {
      drawSilhouette(g.ctx, r, false);
      return;
    }
    drawText(g.ctx, String(count), r.x + r.w * 0.82, r.y + r.h * 0.45, g.h * 0.4, COLORS.gold, { stroke: COLORS.ink });
    drawProgressBar(
      g.ctx,
      { x: box.x + box.w * 0.1, y: box.y + box.h - g.h * 0.08, w: box.w * 0.8, h: g.h * 0.045 },
      this.cal.progress,
      COLORS.gold,
    );
  }

  status(t: Tick): string {
    if (t.body !== 'ok') return BODY_STATUS_TEXT[t.body];
    return '차렷! 가만히 서 있어요';
  }

  debugLines(): string[] {
    return [`캘리브레이션 ${this.cal.phase} ${(this.cal.progress * 100).toFixed(0)}% 재시작 ${this.cal.restarts}`];
  }

  onKey(key: string): void {
    if (key === 'c') this.flow.toPractice(DEFAULT_PROFILE);
  }
}
