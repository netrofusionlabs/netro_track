import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { AttendanceRecord } from '../core/models/domain';
import { clock } from '../core/utils/format';

interface Bar {
  key: string;
  name: string;
  /** Percentage offsets across the working window. */
  left: number;
  width: number;
  open: boolean;
  label: string;
}

/**
 * The Netro Pulse band.
 *
 * Every punch session in the current scope drawn against a single day axis:
 * one row per person, a bar from punch-in to punch-out, open shifts running to
 * "now". It answers "who is working, when did they start, who is still out"
 * in one glance — which a table of times cannot do — and it is the product's
 * recurring visual signature rather than decoration, because every pixel is a
 * real timestamp.
 */
@Component({
  selector: 'netro-pulse-band',
  standalone: true,
  imports: [NgIf, NgFor, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="band">
      <div class="band__axis" aria-hidden="true">
        <span class="band__tick" *ngFor="let t of ticks()" [style.left.%]="t.at">
          <span class="band__tick-label">{{ t.label }}</span>
        </span>
        <span class="band__now" *ngIf="nowAt() !== null" [style.left.%]="nowAt()!">
          <span class="band__now-label">now</span>
        </span>
      </div>

      <div class="band__rows" *ngIf="bars().length; else quiet">
        <div class="band__row" *ngFor="let bar of bars()">
          <span class="band__name truncate" [title]="bar.name">{{ bar.name }}</span>
          <span class="band__track">
            <span
              class="band__bar"
              [ngClass]="{ 'band__bar--open': bar.open }"
              [style.left.%]="bar.left"
              [style.width.%]="bar.width"
              [attr.title]="bar.name + ' · ' + bar.label"
            ></span>
          </span>
        </div>
      </div>

      <ng-template #quiet>
        <p class="band__quiet">No punch activity recorded yet today.</p>
      </ng-template>

      <p class="band__more" *ngIf="hidden() > 0">
        + {{ hidden() }} more {{ hidden() === 1 ? 'person' : 'people' }} on duty
      </p>
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .band { display: flex; flex-direction: column; gap: var(--s-2); }

      .band__axis {
        position: relative;
        height: 14px;
        margin-left: var(--band-label, 116px);
        border-bottom: 1px solid var(--line-subtle);
      }
      .band__tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--line-subtle); }
      .band__tick-label {
        position: absolute;
        top: 0;
        left: 3px;
        font: var(--t-micro);
        color: var(--fg-faint);
        white-space: nowrap;
      }
      .band__now { position: absolute; top: -2px; bottom: -4px; width: 1px; background: var(--accent); }
      .band__now-label {
        position: absolute;
        top: -2px;
        left: 4px;
        font: var(--t-micro);
        color: var(--accent);
      }

      .band__rows { display: flex; flex-direction: column; gap: 3px; }
      .band__row { display: flex; align-items: center; gap: var(--s-2); min-width: 0; }
      .band__name {
        width: var(--band-label, 116px);
        flex: none;
        font: var(--t-small);
        color: var(--fg-muted);
      }
      .band__track {
        position: relative;
        flex: 1;
        height: 12px;
        border-radius: var(--r-sm);
        background: var(--surface-inset);
        min-width: 0;
      }
      .band__bar {
        position: absolute;
        top: 2px;
        bottom: 2px;
        min-width: 3px;
        border-radius: 2px;
        background: var(--idle-solid);
      }
      /* An open shift is live work: it carries the brand colour and a soft
         leading edge so it reads as still running rather than truncated. */
      .band__bar--open {
        background: linear-gradient(90deg, var(--brand-500), var(--brand-400));
        box-shadow: 0 0 0 1px var(--accent-line);
      }

      .band__quiet { font: var(--t-small); color: var(--fg-subtle); padding: var(--s-4) 0; }
      .band__more { font: var(--t-micro); color: var(--fg-faint); margin-left: var(--band-label, 116px); }

      @media (max-width: 720px) {
        .band { --band-label: 78px; }
      }
    `,
  ],
})
export class NetroPulseBand {
  readonly records = input.required<AttendanceRecord[]>();
  /** Rows shown before the band stops growing; the rest are summarised. */
  readonly limit = input(8);
  /** Axis window in hours. Six to twenty-two covers every realistic shift. */
  readonly fromHour = input(6);
  readonly toHour = input(22);

  private readonly span = computed(() => Math.max(1, this.toHour() - this.fromHour()));

  readonly ticks = computed(() => {
    const out: Array<{ at: number; label: string }> = [];
    for (let h = this.fromHour(); h <= this.toHour(); h += 4) {
      out.push({ at: ((h - this.fromHour()) / this.span()) * 100, label: `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` });
    }
    return out;
  });

  readonly nowAt = computed(() => {
    const pos = this.positionOf(new Date());
    return pos === null ? null : pos;
  });

  private readonly ordered = computed(() =>
    [...this.records()].sort((a, b) => {
      // Open shifts first — they are the ones that still need attention.
      const openDelta = Number(!!a.punchOutTime) - Number(!!b.punchOutTime);
      if (openDelta !== 0) return openDelta;
      return new Date(a.punchInTime).getTime() - new Date(b.punchInTime).getTime();
    }),
  );

  readonly hidden = computed(() => Math.max(0, this.ordered().length - this.limit()));

  readonly bars = computed<Bar[]>(() =>
    this.ordered()
      .slice(0, this.limit())
      .map(record => {
        const start = this.positionOf(record.punchInTime) ?? 0;
        const end = record.punchOutTime ? (this.positionOf(record.punchOutTime) ?? 100) : (this.nowAt() ?? 100);
        const left = Math.max(0, Math.min(100, start));
        const width = Math.max(1, Math.min(100 - left, end - left));
        return {
          key: record.id,
          name: record.user?.name ?? 'Unknown',
          left,
          width,
          open: !record.punchOutTime,
          label: record.punchOutTime
            ? `${clock(record.punchInTime)} – ${clock(record.punchOutTime)}`
            : `${clock(record.punchInTime)} – running`,
        };
      }),
  );

  /** Percent across the axis, or null when the instant is unusable. */
  private positionOf(value: string | Date): number | null {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    const hours = d.getHours() + d.getMinutes() / 60;
    return ((hours - this.fromHour()) / this.span()) * 100;
  }
}
