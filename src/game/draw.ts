import type { PoseFrame } from '../pose/landmarks';
import { drawCameraView, type Rect } from '../ui/cameraPreview';
import type { Gfx } from './app';

export const COLORS = {
  bgTop: '#5a3cc8',
  bgBottom: '#2b1d6b',
  ink: '#2b1d6b',
  white: '#ffffff',
  gold: '#ffd84a',
  green: '#2fbf71',
};

export function drawBackground({ ctx, w, h }: Gfx): void {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, COLORS.bgTop);
  bg.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

interface TextOptions {
  align?: CanvasTextAlign;
  weight?: number;
  stroke?: string;
  /** 글자 크기 대비 테두리 두께 */
  strokeRatio?: number;
  font?: string;
}

const SANS = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', 'Malgun Gothic', sans-serif";

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  opts: TextOptions = {},
): void {
  ctx.save();
  ctx.font = `${opts.weight ?? 900} ${size}px ${opts.font ?? SANS}`;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = size * (opts.strokeRatio ?? 0.12);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  progress: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fill();
  if (progress > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, Math.max(r.h, r.w * progress), r.h, r.h / 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 둥근 테두리 안에 카메라 + 스켈레톤을 그린다. */
export function drawCameraPanel(g: Gfx, frame: PoseFrame | null, box: Rect, showIndices = false, border = COLORS.white): Rect {
  const { ctx } = g;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, Math.min(box.w, box.h) * 0.05);
  ctx.fill();
  ctx.clip();
  const r = drawCameraView(ctx, g.video, frame, box, { showIndices });
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(3, box.h * 0.012);
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, Math.min(box.w, box.h) * 0.05);
  ctx.stroke();
  ctx.restore();
  return r;
}
