import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NetroIcon, IconName } from './icon';
import { initials, tintIndex } from '../core/utils/format';

export type Tone = 'neutral' | 'ok' | 'warn' | 'risk' | 'info';

/**
 * Optional inputs accept `undefined` as well as `null`. Almost every value the
 * design system renders comes from an API field that may simply be absent, and
 * forcing every call site to coalesce would be noise for no safety.
 */
export type Maybe<T> = T | null | undefined;

const TONE_CLASS: Record<Tone, string> = {
  neutral: '',
  ok: 'badge--ok',
  warn: 'badge--warn',
  risk: 'badge--risk',
  info: 'badge--info',
};

const DOT_CLASS: Record<Tone, string> = {
  neutral: '',
  ok: 'dot--ok',
  warn: 'dot--warn',
  risk: 'dot--risk',
  info: 'dot--info',
};

/* ==========================================================================
   Badge — a labelled state. Colour reinforces the word, never replaces it.
   ========================================================================== */

@Component({
  selector: 'netro-badge',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [ngClass]="[toneClass(), large() ? 'badge--lg' : '', plain() ? 'badge--plain' : '']">
      <netro-icon *ngIf="icon()" [name]="icon()!" [size]="large() ? 13 : 11" />
      <span class="dot" *ngIf="dot() && !icon()" [ngClass]="dotClass()"></span>
      <span><ng-content /></span>
    </span>
  `,
  styles: [':host { display: inline-flex; min-width: 0; max-width: 100%; }'],
})
export class NetroBadge {
  readonly tone = input<Tone>('neutral');
  readonly icon = input<Maybe<IconName>>(null);
  readonly dot = input(false);
  readonly large = input(false);
  readonly plain = input(false);

  readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
  readonly dotClass = computed(() => DOT_CLASS[this.tone()]);
}

/* ==========================================================================
   Status — a dot plus its label. The atom of the Netro status language.
   ========================================================================== */

@Component({
  selector: 'netro-status',
  standalone: true,
  imports: [NgClass, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-text">
      <span class="dot" [ngClass]="[dotClass(), live() ? 'dot--live' : '', hollow() ? 'dot--hollow' : '']"></span>
      <span class="truncate"><ng-content /></span>
      <span class="text-micro" style="color: var(--fg-faint)" *ngIf="suffix()">{{ suffix() }}</span>
    </span>
  `,
  styles: [':host { display: inline-flex; min-width: 0; max-width: 100%; }'],
})
export class NetroStatus {
  readonly tone = input<Tone>('neutral');
  /** Pulses to signal continuously-refreshing data. Use sparingly. */
  readonly live = input(false);
  readonly hollow = input(false);
  readonly suffix = input<Maybe<string>>(null);

  readonly dotClass = computed(() => DOT_CLASS[this.tone()]);
}

/* ==========================================================================
   Avatar & Identity
   ========================================================================== */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type Presence = 'none' | 'on' | 'off' | 'warn';

@Component({
  selector: 'netro-avatar',
  standalone: true,
  imports: [NgIf, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="avatar" [ngClass]="classes()">
      <img *ngIf="src(); else glyph" [src]="src()!" [alt]="name() || 'Profile photo'" />
      <ng-template #glyph>{{ label() }}</ng-template>
      <span
        *ngIf="presence() !== 'none'"
        class="avatar__presence"
        [ngClass]="{
          'avatar__presence--on': presence() === 'on',
          'avatar__presence--warn': presence() === 'warn'
        }"
      ></span>
    </span>
  `,
  styles: [':host { display: inline-flex; flex: none; }'],
})
export class NetroAvatar {
  readonly name = input<Maybe<string>>(null);
  readonly src = input<Maybe<string>>(null);
  readonly size = input<AvatarSize>('md');
  readonly presence = input<Presence>('none');
  /** Overrides the name when deriving the deterministic tint (e.g. a user id). */
  readonly seed = input<Maybe<string>>(null);

  readonly label = computed(() => initials(this.name()));
  readonly classes = computed(() => [
    this.size() === 'md' ? '' : `avatar--${this.size()}`,
    this.src() ? '' : `avatar--t${tintIndex(this.seed() ?? this.name())}`,
  ]);
}

@Component({
  selector: 'netro-identity',
  standalone: true,
  imports: [NgIf, NetroAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="identity">
      <netro-avatar [name]="name()" [src]="src()" [size]="size()" [presence]="presence()" [seed]="seed()" />
      <span class="identity__body">
        <span class="identity__name">{{ name() || 'Unknown' }}</span>
        <span class="identity__meta" *ngIf="meta()">{{ meta() }}</span>
        <ng-content />
      </span>
    </span>
  `,
  styles: [':host { display: block; min-width: 0; }'],
})
export class NetroIdentity {
  readonly name = input<Maybe<string>>(null);
  readonly meta = input<Maybe<string>>(null);
  readonly src = input<Maybe<string>>(null);
  readonly size = input<AvatarSize>('md');
  readonly presence = input<Presence>('none');
  readonly seed = input<Maybe<string>>(null);
}

/* ==========================================================================
   Skeletons — shape-of-content loading. Never a bare spinner on a full page.
   ========================================================================== */

@Component({
  selector: 'netro-skeleton',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk" [ngClass]="'sk--' + variant()" [style.width]="width()" [style.height]="height()"></span>`,
  styles: [':host { display: block; }', '.sk { display: block; }'],
})
export class NetroSkeleton {
  readonly variant = input<'text' | 'line' | 'title' | 'block' | 'circle'>('line');
  readonly width = input<string>('100%');
  readonly height = input<Maybe<string>>(null);
}

/** Placeholder rows sized like the table they stand in for. */
@Component({
  selector: 'netro-skeleton-rows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite">
      <span class="sr-only">Loading records…</span>
      @for (row of rowList(); track row) {
        <div class="sk-row">
          @for (col of colList(); track col) {
            <span class="sk sk--line" [style.width]="widthFor(col)"></span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .sk-row {
        display: flex;
        align-items: center;
        gap: var(--s-4);
        padding: var(--s-3) var(--s-4);
        border-bottom: 1px solid var(--line-subtle);
      }
      .sk-row:last-child { border-bottom: none; }
      .sk-row .sk { flex: 1; }
    `,
  ],
})
export class NetroSkeletonRows {
  readonly rows = input(5);
  readonly cols = input(4);

  readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
  readonly colList = computed(() => Array.from({ length: this.cols() }, (_, i) => i));

  /** Uneven widths so it reads as content rather than as a grid. */
  widthFor(col: number): string {
    return ['34%', '18%', '22%', '14%', '20%', '16%'][col % 6];
  }
}

/* ==========================================================================
   Empty / error state
   ========================================================================== */

@Component({
  selector: 'netro-state',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" [ngClass]="{ 'state--inline': inline(), 'state--risk': tone() === 'risk' }">
      <span class="state__glyph"><netro-icon [name]="icon()" [size]="20" /></span>
      <div class="stack stack--sm" style="align-items: center; gap: 4px">
        <p class="state__title">{{ title() }}</p>
        <p class="state__body" *ngIf="body()">{{ body() }}</p>
      </div>
      <div class="state__actions"><ng-content /></div>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroState {
  readonly icon = input<IconName>('info');
  readonly title = input.required<string>();
  readonly body = input<Maybe<string>>(null);
  readonly inline = input(false);
  readonly tone = input<'neutral' | 'risk'>('neutral');
}

/* ==========================================================================
   Inline alert
   ========================================================================== */

@Component({
  selector: 'netro-alert',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert" [ngClass]="cls()" role="status">
      <netro-icon [name]="glyph()" [size]="15" />
      <div class="alert__body">
        <strong *ngIf="heading()">{{ heading() }}</strong>
        <ng-content />
      </div>
      <button
        *ngIf="dismissible()"
        type="button"
        class="alert__close"
        aria-label="Dismiss message"
        (click)="dismissed.emit()"
      >
        <netro-icon name="close" [size]="13" />
      </button>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroAlert {
  readonly tone = input<Tone>('info');
  readonly heading = input<Maybe<string>>(null);
  readonly dismissible = input(false);
  readonly icon = input<Maybe<IconName>>(null);

  readonly dismissed = output<void>();

  readonly cls = computed(() => {
    switch (this.tone()) {
      case 'warn':
        return 'alert--warn';
      case 'risk':
        return 'alert--risk';
      case 'ok':
        return 'alert--ok';
      default:
        return '';
    }
  });

  readonly glyph = computed<IconName>(() => {
    if (this.icon()) return this.icon()!;
    switch (this.tone()) {
      case 'risk':
        return 'x-circle';
      case 'warn':
        return 'alert';
      case 'ok':
        return 'check-circle';
      default:
        return 'info';
    }
  });
}

/* ==========================================================================
   Meter — a proportion of a whole, with an accessible value.
   ========================================================================== */

@Component({
  selector: 'netro-meter',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="meter"
      role="progressbar"
      [attr.aria-valuenow]="pct()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="label()"
      [attr.title]="label() + ': ' + pct() + '%'"
    >
      <span class="meter__fill" [ngClass]="'meter__fill--' + tone()" [style.width.%]="pct()"></span>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroMeter {
  readonly value = input(0);
  readonly max = input(100);
  readonly tone = input<'brand' | 'ok' | 'warn' | 'risk' | 'idle'>('brand');
  readonly label = input<string>('Progress');

  readonly pct = computed(() => {
    const m = this.max();
    if (!m) return 0;
    return Math.max(0, Math.min(100, Math.round((this.value() / m) * 100)));
  });
}
