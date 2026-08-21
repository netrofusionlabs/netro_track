import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NetroIcon, IconName } from './icon';
import { Maybe, Tone } from './primitives';

/* ==========================================================================
   Page header — the same anatomy on every screen: where am I, what is this,
   what can I do.
   ========================================================================== */

export interface Crumb {
  label: string;
  route?: string;
}

@Component({
  selector: 'netro-page-header',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <nav class="crumbs" *ngIf="crumbs().length" aria-label="Breadcrumb">
        <ng-container *ngFor="let c of crumbs(); let last = last">
          <a *ngIf="c.route && !last" [routerLink]="c.route">{{ c.label }}</a>
          <span *ngIf="!c.route || last" [attr.aria-current]="last ? 'page' : null">{{ c.label }}</span>
          <span class="crumbs__sep" *ngIf="!last">/</span>
        </ng-container>
      </nav>

      <div class="page-head__top">
        <div class="page-head__titles">
          <h1 class="page-head__title">
            {{ title() }}
            <ng-content select="[slot=title-adornment]" />
          </h1>
          <p class="page-head__desc" *ngIf="description()">{{ description() }}</p>
        </div>
        <div class="page-head__actions">
          <ng-content select="[slot=actions]" />
        </div>
      </div>

      <ng-content />
    </header>
  `,
  styles: [':host { display: block; }'],
})
export class NetroPageHeader {
  readonly title = input.required<string>();
  readonly description = input<Maybe<string>>(null);
  readonly crumbs = input<Crumb[]>([]);
}

/* ==========================================================================
   Panel — the single container. Cards are not a decoration, they are a
   grouping device with a head, a body and an optional foot.
   ========================================================================== */

@Component({
  selector: 'netro-panel',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [ngClass]="{ 'panel--flush': flush(), 'panel--sunken': sunken() }">
      <header class="panel__head" *ngIf="heading()">
        <div class="stack" style="gap: 1px; min-width: 0">
          <h2 class="panel__title">
            <netro-icon *ngIf="icon()" [name]="icon()!" [size]="14" style="color: var(--fg-faint)" />
            {{ heading() }}
          </h2>
          <p class="panel__desc" *ngIf="description()">{{ description() }}</p>
        </div>
        <div class="panel__actions"><ng-content select="[slot=actions]" /></div>
      </header>

      <div [ngClass]="bodyClass()">
        <ng-content />
      </div>

      <footer class="panel__foot" *ngIf="hasFooter()">
        <ng-content select="[slot=footer]" />
      </footer>
    </section>
  `,
  styles: [':host { display: block; min-width: 0; }'],
})
export class NetroPanel {
  readonly heading = input<Maybe<string>>(null);
  readonly description = input<Maybe<string>>(null);
  readonly icon = input<Maybe<IconName>>(null);
  readonly flush = input(false);
  readonly sunken = input(false);
  readonly padding = input<'default' | 'tight' | 'none'>('default');
  readonly hasFooter = input(false);

  readonly bodyClass = computed(() => {
    const p = this.padding();
    return p === 'none' ? 'panel__body panel__body--flush' : p === 'tight' ? 'panel__body panel__body--tight' : 'panel__body';
  });
}

/* ==========================================================================
   Metric — one number, its meaning, and where it came from.
   ========================================================================== */

@Component({
  selector: 'netro-metric',
  standalone: true,
  imports: [NgIf, NgClass, NgTemplateOutlet, NetroIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a *ngIf="route(); else plain" class="metric" [ngClass]="toneClass()" [routerLink]="route()!" [queryParams]="queryParams()">
      <ng-container *ngTemplateOutlet="inner" />
    </a>
    <ng-template #plain>
      <div class="metric" [ngClass]="toneClass()">
        <ng-container *ngTemplateOutlet="inner" />
      </div>
    </ng-template>

    <ng-template #inner>
      <span class="metric__label">
        <netro-icon *ngIf="icon()" [name]="icon()!" [size]="12" />
        {{ label() }}
      </span>
      <span class="metric__value">
        {{ value() }}
        <small *ngIf="unit()">{{ unit() }}</small>
      </span>
      <span class="metric__foot" *ngIf="caption() || hasFoot()">
        <ng-container *ngIf="caption()">{{ caption() }}</ng-container>
        <ng-content />
      </span>
    </ng-template>
  `,
  styles: [':host { display: block; min-width: 0; }', '.metric { height: 100%; }'],
})
export class NetroMetric {
  readonly label = input.required<string>();
  readonly value = input<string | number>('—');
  readonly unit = input<Maybe<string>>(null);
  readonly caption = input<Maybe<string>>(null);
  readonly icon = input<Maybe<IconName>>(null);
  readonly tone = input<'neutral' | 'attention' | 'risk'>('neutral');
  readonly route = input<Maybe<string>>(null);
  readonly queryParams = input<Record<string, unknown> | null>(null);
  readonly hasFoot = input(false);

  readonly toneClass = computed(() =>
    this.tone() === 'attention' ? 'metric--attention' : this.tone() === 'risk' ? 'metric--risk' : '',
  );
}

/* ==========================================================================
   Segmented control — mutually exclusive view switch (filters, density…).
   ========================================================================== */

export interface SegmentOption<T = string> {
  value: T;
  label: string;
  icon?: IconName;
  count?: number | null;
}

@Component({
  selector: 'netro-segmented',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented" [ngClass]="{ 'segmented--sm': small() }" role="group" [attr.aria-label]="label()">
      <button
        *ngFor="let opt of options()"
        type="button"
        class="segmented__item"
        [ngClass]="{ 'is-active': opt.value === value() }"
        [attr.aria-pressed]="opt.value === value()"
        (click)="valueChange.emit(opt.value)"
      >
        <netro-icon *ngIf="opt.icon" [name]="opt.icon" [size]="12" />
        {{ opt.label }}
        <span class="count-pill" *ngIf="opt.count != null">{{ opt.count }}</span>
      </button>
    </div>
  `,
  styles: [':host { display: inline-flex; }'],
})
export class NetroSegmented {
  readonly options = input.required<SegmentOption[]>();
  readonly value = input<Maybe<string>>(null);
  readonly label = input<string>('View');
  readonly small = input(false);
  readonly valueChange = output<string>();
}

/* ==========================================================================
   Tabs — navigation between related views of the same subject.
   ========================================================================== */

@Component({
  selector: 'netro-tabs',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="tablist" [attr.aria-label]="label()">
      <button
        *ngFor="let t of tabs()"
        type="button"
        role="tab"
        class="tab"
        [ngClass]="{ 'is-active': t.value === value() }"
        [attr.aria-selected]="t.value === value()"
        (click)="valueChange.emit(t.value)"
      >
        <netro-icon *ngIf="t.icon" [name]="t.icon" [size]="14" />
        {{ t.label }}
        <span class="count-pill" *ngIf="t.count != null" [ngClass]="{ 'count-pill--attention': !!t.urgent && t.count > 0 }">
          {{ t.count }}
        </span>
      </button>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroTabs {
  readonly tabs = input.required<Array<SegmentOption & { urgent?: boolean }>>();
  readonly value = input<Maybe<string>>(null);
  readonly label = input<string>('Sections');
  readonly valueChange = output<string>();
}

/* ==========================================================================
   Pager
   ========================================================================== */

@Component({
  selector: 'netro-pager',
  standalone: true,
  imports: [NgIf, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pager" *ngIf="total() > 0">
      <span>
        Showing <strong class="tnum">{{ from() }}–{{ to() }}</strong> of
        <strong class="tnum">{{ total() }}</strong> {{ noun() }}
      </span>
      <span class="pager__spacer"></span>
      <label class="row" style="gap: 6px" *ngIf="showPageSize()">
        <span class="text-micro">Rows</span>
        <select class="select select--sm" style="width: auto" [value]="pageSize()" (change)="onSize($event)">
          <option [value]="25">25</option>
          <option [value]="50">50</option>
          <option [value]="100">100</option>
        </select>
      </label>
      <div class="row" style="gap: 4px; flex-wrap: nowrap">
        <button
          type="button"
          class="btn btn--default btn--sm btn--icon"
          [disabled]="page() <= 1"
          aria-label="Previous page"
          (click)="pageChange.emit(page() - 1)"
        >
          <netro-icon name="chevron-left" [size]="14" />
        </button>
        <span class="text-micro text-subtle tnum" style="padding: 0 4px">{{ page() }} / {{ pageCount() }}</span>
        <button
          type="button"
          class="btn btn--default btn--sm btn--icon"
          [disabled]="page() >= pageCount()"
          aria-label="Next page"
          (click)="pageChange.emit(page() + 1)"
        >
          <netro-icon name="chevron-right" [size]="14" />
        </button>
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroPager {
  readonly page = input(1);
  readonly pageSize = input(25);
  readonly total = input(0);
  readonly noun = input('records');
  readonly showPageSize = input(true);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  onSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}

/* ==========================================================================
   Timeline — ordered events with their evidence.
   ========================================================================== */

export interface TimelineEvent {
  title: string;
  meta?: string | null;
  note?: string | null;
  icon?: IconName;
  tone?: Tone;
}

@Component({
  selector: 'netro-timeline',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="timeline">
      <li class="tl-item" *ngFor="let e of events()">
        <span class="tl-item__marker" [ngClass]="markerClass(e)">
          <netro-icon [name]="e.icon || 'check'" [size]="11" />
        </span>
        <div class="tl-item__body">
          <p class="tl-item__title">{{ e.title }}</p>
          <p class="tl-item__meta" *ngIf="e.meta">{{ e.meta }}</p>
          <p class="tl-item__note" *ngIf="e.note">{{ e.note }}</p>
        </div>
      </li>
    </ol>
  `,
  styles: [':host { display: block; }', 'ol { list-style: none; }'],
})
export class NetroTimeline {
  readonly events = input.required<TimelineEvent[]>();

  markerClass(e: TimelineEvent): string {
    switch (e.tone) {
      case 'ok':
        return 'tl-item__marker--ok';
      case 'warn':
        return 'tl-item__marker--warn';
      case 'risk':
        return 'tl-item__marker--risk';
      case 'info':
        return 'tl-item__marker--brand';
      default:
        return '';
    }
  }
}
