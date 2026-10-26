import './style.css';
import { THRESHOLDS } from './config/thresholds';
import { describeCameraError, startCamera } from './platform/camera';
import { deviceFeatures, enterPlayMode } from './platform/device';
import { checkFullBody, type FullBodyStatus, type PoseFrame } from './pose/landmarks';
import { PoseTracker } from './pose/poseTracker';
import { drawCameraView } from './ui/cameraPreview';
import { DebugOverlay, isDebug } from './ui/debugOverlay';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const video = document.getElementById('camera') as HTMLVideoElement;
const startOverlay = document.getElementById('start')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const startMsg = document.getElementById('start-msg')!;
const statusEl = document.getElementById('status')!;
const debug = new DebugOverlay(document.getElementById('debug')!);

const STATUS_TEXT: Record<FullBodyStatus, string> = {
  ok: '전신이 보여요! 준비 완료 ✨',
  noPerson: '카메라 앞에 서 주세요',
  feetHidden: '발까지 보이게 뒤로 가 주세요',
  headHidden: '머리까지 보이게 해 주세요',
  partial: '몸 전체가 보이게 서 주세요',
};

let viewW = 0;
let viewH = 0;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function runLoop(tracker: PoseTracker): void {
  let frame: PoseFrame | null = null;
  let lastSeen = -Infinity;
  let status: FullBodyStatus = 'noPerson';
  let fpsStart = performance.now();
  let fpsCount = 0;
  let renderFps = 0;

  const tick = (now: number) => {
    const next = tracker.detect(video, now);
    if (next) {
      frame = next;
      if (next.landmarks) {
        lastSeen = now;
        status = checkFullBody(next.landmarks);
      }
    }
    if (now - lastSeen > THRESHOLDS.personLostMs) status = 'noPerson';

    fpsCount++;
    if (now - fpsStart >= 1000) {
      renderFps = (fpsCount * 1000) / (now - fpsStart);
      fpsStart = now;
      fpsCount = 0;
    }

    const bg = ctx.createLinearGradient(0, 0, 0, viewH);
    bg.addColorStop(0, '#4a2fb0');
    bg.addColorStop(1, '#2b1d6b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewW, viewH);
    drawCameraView(ctx, video, frame, { x: 0, y: 0, w: viewW, h: viewH }, { dim: 0.15, showIndices: isDebug });

    statusEl.textContent = STATUS_TEXT[status];
    statusEl.classList.toggle('ok', status === 'ok');

    debug.update(
      { renderFps, tracker: tracker.stats, frame, fullBody: status, video, device: deviceFeatures },
      now,
    );
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startMsg.textContent = '카메라를 켜는 중…';
  await enterPlayMode();

  try {
    if (!video.srcObject) await startCamera(video);
  } catch (err) {
    startMsg.textContent = describeCameraError(err);
    startBtn.disabled = false;
    startBtn.textContent = '다시 시도';
    return;
  }

  startMsg.textContent = '마법 책을 펼치는 중… (처음엔 조금 걸려요)';
  let tracker: PoseTracker;
  try {
    tracker = await PoseTracker.create();
  } catch (err) {
    console.error(err);
    startMsg.textContent = '동작 인식 준비에 실패했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
    startBtn.disabled = false;
    startBtn.textContent = '다시 시도';
    return;
  }

  startOverlay.hidden = true;
  statusEl.hidden = false;
  runLoop(tracker);
});
