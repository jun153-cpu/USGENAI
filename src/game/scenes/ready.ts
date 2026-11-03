import { THRESHOLDS } from '../../config/thresholds';
import { DEFAULT_PROFILE } from '../../pose/body';
import { speak } from '../../platform/speech';
import type { Rect } from '../../ui/cameraPreview';
import { isDebug } from '../../ui/debugOverlay';
import { BODY_STATUS_TEXT, type Flow, type Gfx, type Scene, type Tick } from '../app';
import { COLORS, drawBackground, drawCameraPanel } from '../draw';

export function bigCameraBox({ w, h }: Gfx): Rect {
  return { x: w * 0.04, y: h * 0.16, w: w * 0.92, h: h * 0.81 };
}

/** 카메라 화면 위에 "여기에 서세요" 사람 모양 가이드를 그린다. */
export function drawSilhouette(ctx: CanvasRenderingContext2D, r: Rect, ok: boolean): void {
  const cx = r.x + r.w / 2;
  const u = r.h;
  const Y = (v: number) => r.y + v * u;
  const color = ok ? COLORS.green : COLORS.white;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = ok ? 'rgba(47, 191, 113, 0.18)' : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = Math.max(3, u * 0.012);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(ok ? [] : [u * 0.03, u * 0.02]);

  ctx.beginPath();
  ctx.arc(cx, Y(0.16), u * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - u * 0.075, Y(0.26));
  ctx.lineTo(cx + u * 0.075, Y(0.26));
  ctx.lineTo(cx + u * 0.105, Y(0.53));
  ctx.lineTo(cx + u * 0.08, Y(0.54));
  ctx.lineTo(cx + u * 0.06, Y(0.36));
  ctx.lineTo(cx + u * 0.055, Y(0.55));
  ctx.lineTo(cx + u * 0.06, Y(0.93));
  ctx.lineTo(cx + u * 0.012, Y(0.93));
  ctx.lineTo(cx, Y(0.62));
  ctx.lineTo(cx - u * 0.012, Y(0.93));
  ctx.lineTo(cx - u * 0.06, Y(0.93));
  ctx.lineTo(cx - u * 0.055, Y(0.55));
  ctx.lineTo(cx - u * 0.06, Y(0.36));
  ctx.lineTo(cx - u * 0.08, Y(0.54));
  ctx.lineTo(cx - u * 0.105, Y(0.53));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 마법사 준비: 전신이 화면에 들어올 때까지 기다린다. */
export class ReadyScene implements Scene {
  private okSince: number | null = null;

  constructor(private readonly flow: Flow) {}

  enter(): void {
    this.okSince = null;
    speak('마법사님! 화면 속 그림자에 몸을 맞춰 주세요!');
  }

  update(t: Tick): void {
    if (t.body !== 'ok') {
      this.okSince = null;
      return;
    }
    this.okSince ??= t.now;
    if (t.now - this.okSince >= THRESHOLDS.ready.fullBodyHoldMs) this.flow.toCalibrate();
  }

  draw(g: Gfx, t: Tick): void {
    drawBackground(g);
    const ok = t.body === 'ok';
    const r = drawCameraPanel(g, t.frame, bigCameraBox(g), isDebug, ok ? COLORS.green : COLORS.white);
    drawSilhouette(g.ctx, r, ok);
  }

  status(t: Tick): string {
    return t.body === 'ok' ? '좋아요! 그대로 있어요' : BODY_STATUS_TEXT[t.body];
  }

  onKey(key: string): void {
    if (key === 'c') this.flow.toPractice(DEFAULT_PROFILE);
  }
}
