import { BODY_CONNECTIONS, LM, isVisible, type Point, type PoseFrame } from '../pose/landmarks';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function fitContain(srcW: number, srcH: number, box: Rect): Rect {
  const scale = Math.min(box.w / srcW, box.h / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

const LEFT_COLOR = '#ff6fb5';
const RIGHT_COLOR = '#3fd0ff';
const CENTER_COLOR = '#ffd84a';

const LEFT_SIDE = new Set<number>([
  LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_FOOT,
]);
const RIGHT_SIDE = new Set<number>([
  LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE, LM.RIGHT_FOOT,
]);

function boneColor(a: number, b: number): string {
  if (LEFT_SIDE.has(a) && LEFT_SIDE.has(b)) return LEFT_COLOR;
  if (RIGHT_SIDE.has(a) && RIGHT_SIDE.has(b)) return RIGHT_COLOR;
  return CENTER_COLOR;
}

interface DrawOptions {
  /** 영상 위에 덮는 어두운 막 (0~1) */
  dim?: number;
  /** 디버그용 관절 번호 표시 */
  showIndices?: boolean;
}

/** 거울 반전된 카메라 영상과 스켈레톤을 box 안에 그린다. 실제로 그려진 영역을 반환. */
export function drawCameraView(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  frame: PoseFrame | null,
  box: Rect,
  opts: DrawOptions = {},
): Rect {
  const r = fitContain(video.videoWidth || 4, video.videoHeight || 3, box);

  ctx.save();
  ctx.translate(r.x + r.w, r.y);
  ctx.scale(-1, 1);
  if (video.readyState >= 2) ctx.drawImage(video, 0, 0, r.w, r.h);
  ctx.restore();

  if (opts.dim) {
    ctx.fillStyle = `rgba(20, 10, 60, ${opts.dim})`;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  const lm = frame?.landmarks;
  if (lm) drawSkeleton(ctx, lm, r, opts.showIndices ?? false);
  return r;
}

function drawSkeleton(ctx: CanvasRenderingContext2D, lm: Point[], r: Rect, showIndices: boolean): void {
  const px = (p: Point) => r.x + p.x * r.w;
  const py = (p: Point) => r.y + p.y * r.h;
  const lineWidth = Math.max(3, r.h * 0.014);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = lineWidth;
  for (const [a, b] of BODY_CONNECTIONS) {
    const pa = lm[a];
    const pb = lm[b];
    if (!isVisible(pa) || !isVisible(pb)) continue;
    ctx.strokeStyle = boneColor(a, b);
    ctx.beginPath();
    ctx.moveTo(px(pa), py(pa));
    ctx.lineTo(px(pb), py(pb));
    ctx.stroke();
  }

  const nose = lm[LM.NOSE];
  const ls = lm[LM.LEFT_SHOULDER];
  const rs = lm[LM.RIGHT_SHOULDER];
  if (isVisible(nose)) {
    const shoulderPx = isVisible(ls) && isVisible(rs) ? Math.hypot(px(ls) - px(rs), py(ls) - py(rs)) : r.h * 0.1;
    ctx.strokeStyle = CENTER_COLOR;
    ctx.beginPath();
    ctx.arc(px(nose), py(nose), Math.max(lineWidth * 2, shoulderPx * 0.38), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  for (const [, idx] of Object.entries(LM)) {
    const p = lm[idx];
    if (idx === LM.NOSE || !isVisible(p)) continue;
    ctx.beginPath();
    ctx.arc(px(p), py(p), lineWidth * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  if (showIndices) {
    ctx.font = `${Math.max(10, r.h * 0.025)}px monospace`;
    ctx.fillStyle = '#00ff88';
    for (const [, idx] of Object.entries(LM)) {
      const p = lm[idx];
      if (isVisible(p)) ctx.fillText(String(idx), px(p) + lineWidth, py(p) - lineWidth);
    }
  }
  ctx.restore();
}
