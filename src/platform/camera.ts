import { THRESHOLDS } from '../config/thresholds';

/** 전면 카메라를 켠다. 영상은 이 기기 안에서만 쓰이고 저장·전송되지 않는다. */
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('insecure');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: THRESHOLDS.camera.width },
      height: { ideal: THRESHOLDS.camera.height },
      frameRate: { ideal: 30 },
    },
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

export function describeCameraError(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : '';
  if (message === 'insecure') return '카메라를 쓰려면 https:// 주소로 접속해야 해요.';
  if (name === 'NotAllowedError') {
    return '카메라 권한이 꺼져 있어요. 주소창 옆 자물쇠(또는 ⋮) → 권한 → 카메라 "허용" 후 다시 시도해 주세요.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '이 기기에서 전면 카메라를 찾지 못했어요.';
  if (name === 'NotReadableError') return '다른 앱이 카메라를 쓰고 있어요. 다른 앱을 닫고 다시 시도해 주세요.';
  return `카메라를 켜지 못했어요. (${name || message || '알 수 없는 오류'})`;
}
