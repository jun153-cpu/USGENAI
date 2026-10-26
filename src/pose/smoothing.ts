import type { Point } from './landmarks';

interface OneEuroParams {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** One-Euro 필터: 천천히 움직일 땐 떨림을 많이 줄이고, 빠르게 움직일 땐 지연을 줄인다. */
export class OneEuroFilter {
  private x: number | null = null;
  private dx = 0;
  private lastT = 0;

  constructor(private readonly params: OneEuroParams) {}

  filter(value: number, tSec: number): number {
    if (this.x === null) {
      this.x = value;
      this.lastT = tSec;
      return value;
    }
    const dt = Math.max(tSec - this.lastT, 1e-3);
    this.lastT = tSec;
    const rawDx = (value - this.x) / dt;
    this.dx += alpha(this.params.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }

  reset(): void {
    this.x = null;
    this.dx = 0;
  }
}

export class PoseSmoother {
  private filters: OneEuroFilter[][] = [];

  constructor(private readonly params: OneEuroParams) {}

  smooth(points: Point[], timeMs: number): Point[] {
    const t = timeMs / 1000;
    return points.map((p, i) => {
      const f = (this.filters[i] ??= [0, 1, 2].map(() => new OneEuroFilter(this.params)));
      return { x: f[0].filter(p.x, t), y: f[1].filter(p.y, t), z: f[2].filter(p.z, t), visibility: p.visibility };
    });
  }

  reset(): void {
    this.filters = [];
  }
}
