export interface DeviceFeatures {
  fullscreen: boolean;
  landscapeLock: boolean;
  wakeLock: boolean;
}

export const deviceFeatures: DeviceFeatures = { fullscreen: false, landscapeLock: false, wakeLock: false };

let wakeLock: WakeLockSentinel | null = null;
let wantWakeLock = false;

async function requestWakeLock(): Promise<void> {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    deviceFeatures.wakeLock = true;
    wakeLock.addEventListener('release', () => {
      deviceFeatures.wakeLock = false;
    });
  } catch {
    deviceFeatures.wakeLock = false;
  }
}

// 탭을 다녀오면 화면 유지 잠금이 풀리므로 다시 건다.
document.addEventListener('visibilitychange', () => {
  if (wantWakeLock && document.visibilityState === 'visible' && !deviceFeatures.wakeLock) {
    void requestWakeLock();
  }
});

document.addEventListener('fullscreenchange', () => {
  deviceFeatures.fullscreen = !!document.fullscreenElement;
});

/** 전체화면 + 가로 고정 + 화면 꺼짐 방지. 브라우저 정책상 터치 이벤트 안에서 호출해야 한다. */
export async function enterPlayMode(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    // 지원하지 않는 브라우저면 그냥 진행
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape');
    deviceFeatures.landscapeLock = true;
  } catch {
    deviceFeatures.landscapeLock = false;
  }
  wantWakeLock = true;
  await requestWakeLock();
}
