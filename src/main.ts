import './style.css';
import { THRESHOLDS } from './config/thresholds';
import { installKeyboard } from './dev/keyboardInput';
import { App, type Flow, type Gfx, type Tick } from './game/app';
import { CalibrateScene } from './game/scenes/calibrate';
import { PracticeScene } from './game/scenes/practice';
import { ReadyScene } from './game/scenes/ready';
import { describeCameraError, startCamera } from './platform/camera';
import { deviceFeatures, enterPlayMode } from './platform/device';
import { unlockAudio } from './platform/sfx';
import { hasKoreanVoice, unlockSpeech } from './platform/speech';
import { checkFullBody, type FullBodyStatus, type PoseFrame } from './pose/landmarks';
import { PoseRecognizer } from './pose/poseRecognizer';
import { PoseTracker } from './pose/poseTracker';
import { DebugOverlay, isDebug } from './ui/debugOverlay';
import { Recorder } from './ui/recorder';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const video = document.getElementById('camera') as HTMLVideoElement;
const startOverlay = document.getElementById('start')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const startMsg = document.getElementById('start-msg')!;
const statusEl = document.getElementById('status')!;
const debug = new DebugOverlay(document.getElementById('debug')!);
const recorder = isDebug ? new Recorder(document.body) : null;

const gfx: Gfx = { ctx, w: 0, h: 0, video };

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  gfx.w = window.innerWidth;
  gfx.h = window.innerHeight;
  canvas.width = Math.round(gfx.w * dpr);
  canvas.height = Math.round(gfx.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const app = new App();
const flow: Flow = {
  toCalibrate: () => app.goto(new CalibrateScene(flow)),
  toPractice: (profile) => app.goto(new PracticeScene(new PoseRecognizer(profile))),
};

canvas.addEventListener('pointerdown', () => app.scene?.onTap?.());
installKeyboard((key) => app.scene?.onKey?.(key));

function runLoop(tracker: PoseTracker): void {
  let frame: PoseFrame | null = null;
  let lastSeen = -Infinity;
  let body: FullBodyStatus = 'noPerson';
  let lastNow = performance.now();
  let fpsStart = lastNow;
  let fpsCount = 0;
  let renderFps = 0;

  const tick = (now: number) => {
    const newFrame = tracker.detect(video, now);
    if (newFrame) {
      frame = newFrame;
      recorder?.push(newFrame);
      if (newFrame.landmarks) {
        lastSeen = now;
        body = checkFullBody(newFrame.landmarks);
      }
    }
    if (now - lastSeen > THRESHOLDS.personLostMs) body = 'noPerson';

    fpsCount++;
    if (now - fpsStart >= 1000) {
      renderFps = (fpsCount * 1000) / (now - fpsStart);
      fpsStart = now;
      fpsCount = 0;
    }

    const t: Tick = { now, dt: Math.min((now - lastNow) / 1000, 0.1), frame, newFrame, body };
    lastNow = now;

    const scene = app.scene;
    if (scene) {
      scene.update(t);
      // update 중에 장면이 바뀌었으면 새 장면을 그린다
      const current = app.scene!;
      current.draw(gfx, t);
      const status = current.status?.(t) ?? null;
      statusEl.hidden = status === null;
      if (status !== null) {
        statusEl.textContent = status;
        statusEl.classList.toggle('ok', body === 'ok');
      }
      debug.update(
        {
          renderFps,
          tracker: tracker.stats,
          frame,
          fullBody: body,
          video,
          device: deviceFeatures,
          extra: current.debugLines?.() ?? [],
          koreanVoice: hasKoreanVoice(),
        },
        now,
      );
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', async () => {
  // 소리·음성 잠금 해제는 await 전에, 터치 이벤트 안에서 바로 해야 한다.
  unlockAudio();
  unlockSpeech();
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
  app.goto(new ReadyScene(flow));
  runLoop(tracker);
});
