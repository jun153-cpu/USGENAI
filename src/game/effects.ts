interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const SPARKLE_COLORS = ['#ffffff', '#ffd84a', '#ff9de2', '#8ae9ff'];

export class Particles {
  private list: Particle[] = [];

  /** (x, y) 에서 사방으로 터지는 반짝이. speed 는 초당 픽셀. */
  burst(x: number, y: number, color: string, count: number, speed: number, size: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = 0.7 + Math.random() * 0.6;
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        maxLife: life,
        size: size * (0.5 + Math.random()),
        color: Math.random() < 0.5 ? color : SPARKLE_COLORS[i % SPARKLE_COLORS.length],
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 600 * dt;
      p.vx *= 0.98;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      drawStar(ctx, p.x, p.y, p.size);
    }
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.4;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}
