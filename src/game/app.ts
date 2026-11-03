import type { BodyProfile } from '../pose/body';
import type { FullBodyStatus, PoseFrame } from '../pose/landmarks';

/** 장면 전환 (장면끼리 서로 import 하지 않도록 main 에서 구현) */
export interface Flow {
  toCalibrate(): void;
  toPractice(profile: BodyProfile): void;
}

export interface Gfx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  video: HTMLVideoElement;
}

export interface Tick {
  now: number;
  /** 지난 화면 갱신 이후 초 */
  dt: number;
  /** 가장 최근 인식 결과 */
  frame: PoseFrame | null;
  /** 이번 갱신에서 새로 나온 인식 결과 (없으면 null) */
  newFrame: PoseFrame | null;
  body: FullBodyStatus;
}

export interface Scene {
  enter?(): void;
  update(t: Tick): void;
  draw(g: Gfx, t: Tick): void;
  /** 화면 위 안내 문구. null 이면 숨김 */
  status?(t: Tick): string | null;
  debugLines?(): string[];
  onTap?(): void;
  onKey?(key: string): void;
}

export class App {
  scene: Scene | null = null;

  goto(scene: Scene): void {
    this.scene = scene;
    scene.enter?.();
  }
}

export const BODY_STATUS_TEXT: Record<FullBodyStatus, string> = {
  ok: '전신이 보여요!',
  noPerson: '카메라 앞에 서 주세요',
  feetHidden: '발까지 보이게 뒤로 가 주세요',
  headHidden: '머리까지 보이게 해 주세요',
  partial: '몸 전체가 보이게 서 주세요',
};
