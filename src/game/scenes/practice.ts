import { SPELLS, type Spell } from '../../config/spells';
import type { PoseRecognizer, RecognizerState } from '../../pose/poseRecognizer';
import { playRep, playSuccess } from '../../platform/sfx';
import { speak } from '../../platform/speech';
import { isDebug } from '../../ui/debugOverlay';
import { BODY_STATUS_TEXT, type Gfx, type Scene, type Tick } from '../app';
import { COLORS, drawBackground, drawCameraPanel, drawProgressBar, drawText } from '../draw';
import { Particles } from '../effects';

const FIRST_SPELL_DELAY_MS = 1800;
const NEXT_SPELL_DELAY_MS = 2600;
const REMIND_EVERY_MS = 12000;

/**
 * 2단계 동작 연습 화면: 火 → 大 → 力 을 돌아가며 연습한다.
 * (3단계에서 몬스터가 나오는 본 게임으로 바뀐다)
 */
export class PracticeScene implements Scene {
  private index = -1;
  private nextAt = 0;
  private announcedAt = 0;
  private successAt: number | null = null;
  private state: RecognizerState | null = null;
  private particles = new Particles();
  private pendingBurst = false;

  constructor(private readonly recognizer: PoseRecognizer) {}

  private get spell(): Spell | null {
    return this.index >= 0 ? SPELLS[this.index] : null;
  }

  enter(): void {
    this.nextAt = performance.now() + FIRST_SPELL_DELAY_MS;
  }

  private startSpell(index: number, now: number): void {
    this.index = index % SPELLS.length;
    const s = SPELLS[this.index];
    this.recognizer.setTarget(s.id, s.reps);
    this.successAt = null;
    this.nextAt = 0;
    this.announce(now);
  }

  private announce(now: number): void {
    const s = this.spell;
    if (!s) return;
    this.announcedAt = now;
    speak(`${s.meaning} ${s.sound}! ${s.instruction}`);
  }

  update(t: Tick): void {
    if (this.nextAt && t.now >= this.nextAt) this.startSpell(this.index + 1, t.now);

    const st = this.recognizer.update(t.newFrame);
    this.state = st;
    if (st.repCounted && !st.succeeded) playRep();
    if (st.succeeded && this.spell) {
      this.successAt = t.now;
      this.pendingBurst = true;
      this.nextAt = t.now + NEXT_SPELL_DELAY_MS;
      playSuccess();
      speak(`성공! ${this.spell.meaning} ${this.spell.sound}!`);
    }
    if (this.spell && this.successAt === null && t.now - this.announcedAt > REMIND_EVERY_MS) this.announce(t.now);
    this.particles.update(t.dt);
  }

  draw(g: Gfx, t: Tick): void {
    const { ctx, w, h } = g;
    drawBackground(g);

    drawCameraPanel(g, t.frame, { x: w * 0.6, y: h * 0.1, w: w * 0.37, h: h * 0.7 }, isDebug);
    const a = this.state?.activity;
    if (a) {
      drawText(ctx, `점프 ${a.jumps} · 스쿼트 ${a.squats} · 점핑잭 ${a.jumpingJacks}`, w * 0.785, h * 0.88, h * 0.045, COLORS.white, { weight: 700 });
    }
    drawText(ctx, '화면을 누르면 다음 주문', w * 0.785, h * 0.95, h * 0.03, 'rgba(255,255,255,0.6)', { weight: 500 });

    const cx = w * 0.3;
    const s = this.spell;
    if (!s) {
      drawText(ctx, '준비!', cx, h * 0.45, h * 0.25, COLORS.gold, { stroke: COLORS.ink });
      return;
    }

    const since = this.successAt === null ? null : t.now - this.successAt;
    const bounce = since !== null && since < 600 ? 1 + 0.25 * Math.sin((since / 600) * Math.PI) : 1;
    const hanjaSize = Math.min(h * 0.42, w * 0.38) * bounce;
    const hanjaY = h * 0.38;

    if (since !== null) {
      ctx.save();
      const glow = ctx.createRadialGradient(cx, hanjaY, 0, cx, hanjaY, hanjaSize * 0.9);
      glow.addColorStop(0, 'rgba(255, 240, 150, 0.85)');
      glow.addColorStop(1, 'rgba(255, 240, 150, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - hanjaSize, hanjaY - hanjaSize, hanjaSize * 2, hanjaSize * 2);
      ctx.restore();
    }
    drawText(ctx, s.hanja, cx, hanjaY, hanjaSize, s.color, { stroke: COLORS.white, strokeRatio: 0.06 });
    if (this.pendingBurst) {
      this.particles.burst(cx, hanjaY, s.color, 70, h * 1.2, h * 0.025);
      this.pendingBurst = false;
    }

    drawText(ctx, `${s.meaning} ${s.sound}`, cx, h * 0.68, h * 0.1, COLORS.white, { stroke: COLORS.ink });
    drawText(ctx, s.instruction, cx, h * 0.78, h * 0.055, COLORS.gold, { weight: 700 });

    const st = this.state;
    const bar = { x: w * 0.06, y: h * 0.85, w: w * 0.48, h: h * 0.07 };
    drawProgressBar(ctx, bar, st?.progress ?? 0, since !== null ? COLORS.green : s.color);
    if (st && st.repsNeeded > 0) {
      drawText(ctx, `${st.reps} / ${st.repsNeeded}`, bar.x + bar.w / 2, bar.y + bar.h / 2, bar.h * 0.75, COLORS.white, { stroke: COLORS.ink });
    }

    if (since !== null) {
      drawText(ctx, '성공!', cx, h * 0.1, h * 0.12, COLORS.gold, { stroke: COLORS.ink });
    }
    this.particles.draw(ctx);
  }

  status(t: Tick): string | null {
    return t.body === 'noPerson' ? BODY_STATUS_TEXT.noPerson : null;
  }

  debugLines(): string[] {
    const st = this.state;
    if (!st) return [];
    const lines = [
      `목표 ${st.target ?? '-'} 진행 ${(st.progress * 100).toFixed(0)}% 횟수 ${st.reps}/${st.repsNeeded} ${st.done ? '완료' : ''}`,
      `엉덩이 기준선 ${st.baselineHipY.toFixed(3)}`,
    ];
    for (const [id, r] of Object.entries(st.results)) {
      const info = Object.entries(r.info).map(([k, v]) => `${k}=${v}`).join(' ');
      lines.push(`${id.padEnd(5)} ${r.active ? '●동작' : r.rest ? '○쉼 ' : '·중간'} ${info}`);
    }
    return lines;
  }

  onTap(): void {
    this.startSpell(this.index + 1, performance.now());
  }

  onKey(key: string): void {
    const n = Number(key);
    if (n >= 1 && n <= SPELLS.length) this.recognizer.simulateSuccess(SPELLS[n - 1].id);
    if (key === 'n') this.onTap();
  }
}
