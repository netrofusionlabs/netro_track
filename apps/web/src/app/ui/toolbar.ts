import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { NetroIcon, IconName } from './icon';

/**
 * The command bar that sits above every collection in NetroTrack: search on
 * the left, scoping in the middle, actions on the right. Same anatomy on every
 * screen, so the muscle memory transfers.
 */
@Component({
  selector: 'netro-toolbar',
  standalone: true,
  imports: [NgIf, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <div class="toolbar__search" *ngIf="searchable()">
        <label class="input-wrap">
          <span class="sr-only">{{ searchLabel() }}</span>
          <netro-icon class="input-wrap__icon" name="search" [size]="14" />
          <input
            class="input input--sm"
            type="search"
            [attr.placeholder]="searchPlaceholder()"
            [value]="search()"
            (input)="onSearch($event)"
          />
          <button
            *ngIf="search()"
            type="button"
            class="input-wrap__clear"
            aria-label="Clear search"
            (click)="clear()"
          >
            <netro-icon name="close" [size]="12" />
          </button>
        </label>
      </div>

      <ng-content select="[slot=filters]" />
      <span class="toolbar__spacer"></span>
      <ng-content select="[slot=actions]" />
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroToolbar {
  readonly search = input('');
  readonly searchable = input(true);
  readonly searchPlaceholder = input('Search…');
  readonly searchLabel = input('Search this list');

  readonly searchChange = output<string>();

  onSearch(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  clear(): void {
    this.searchChange.emit('');
  }
}

/**
 * Replaces the toolbar's contents while rows are selected, so bulk actions
 * never compete for space with filters and the selection is impossible to miss.
 */
@Component({
  selector: 'netro-bulkbar',
  standalone: true,
  imports: [NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bulkbar" role="region" aria-live="polite">
      <span class="bulkbar__count">
        {{ count() }} {{ count() === 1 ? noun() : nounPlural() }} selected
      </span>
      <button type="button" class="btn btn--subtle btn--sm" (click)="cleared.emit()">
        <netro-icon name="close" [size]="12" /> Clear
      </button>
      <span class="toolbar__spacer"></span>
      <ng-content />
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class NetroBulkbar {
  readonly count = input.required<number>();
  readonly noun = input('record');
  readonly nounPlural = input('records');
  readonly cleared = output<void>();
}

/** A labelled select used inside a toolbar's filter slot. */
@Component({
  selector: 'netro-filter-select',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="filter" [ngClass]="{ 'filter--set': value() !== allValue() }">
      <span class="filter__label">{{ label() }}</span>
      <select class="filter__select" [value]="value()" (change)="onChange($event)">
        <option [value]="allValue()">{{ allLabel() }}</option>
        <option *ngFor="let opt of options()" [value]="opt.value">{{ opt.label }}</option>
      </select>
    </label>
  `,
  styles: [
    `
      :host { display: inline-flex; }
      .filter {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 8px;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-md);
        background: var(--surface);
        cursor: pointer;
        transition: border-color var(--dur-1) var(--ease), background-color var(--dur-1) var(--ease);
      }
      .filter:hover { border-color: var(--n-300); }
      /* A filter that is actually narrowing the list looks different from one
         that is not, so an unexpectedly short list is self-explaining. */
      .filter--set {
        border-color: var(--accent-line);
        background: var(--accent-soft);
      }
      .filter__label { font: var(--t-micro); color: var(--fg-subtle); white-space: nowrap; }
      .filter--set .filter__label { color: var(--accent); }
      .filter__select {
        border: 0;
        background: transparent;
        font: var(--t-micro);
        color: var(--fg);
        cursor: pointer;
        max-width: 160px;
      }
      .filter__select:focus { outline: none; }
      .filter--set .filter__select { color: var(--accent); font-weight: 500; }
    `,
  ],
})
export class NetroFilterSelect {
  readonly label = input.required<string>();
  readonly options = input.required<Array<{ value: string; label: string }>>();
  readonly value = input('');
  readonly allValue = input('');
  readonly allLabel = input('All');

  readonly valueChange = output<string>();

  onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}

/**
 * Column sort state shared by every table. Kept as a tiny class rather than a
 * service so each list owns its own sorting without cross-talk.
 */
export class SortState<K extends string> {
  readonly key = signal<K | null>(null);
  readonly dir = signal<'asc' | 'desc'>('asc');

  constructor(initialKey?: K, initialDir: 'asc' | 'desc' = 'asc') {
    if (initialKey) this.key.set(initialKey);
    this.dir.set(initialDir);
  }

  toggle(key: K): void {
    if (this.key() === key) {
      this.dir.update(d => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.key.set(key);
    this.dir.set('asc');
  }

  ariaFor(key: K): 'ascending' | 'descending' | 'none' {
    if (this.key() !== key) return 'none';
    return this.dir() === 'asc' ? 'ascending' : 'descending';
  }

  /** Sorts a copy; comparators receive the raw row so they can read anything. */
  apply<T>(rows: T[], pick: (row: T, key: K) => string | number | null | undefined): T[] {
    const key = this.key();
    if (!key) return rows;
    const factor = this.dir() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = pick(a, key);
      const bv = pick(b, key);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }
}

/** The sort affordance in a table header. */
@Component({
  selector: 'netro-sort-icon',
  standalone: true,
  imports: [NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<netro-icon [name]="glyph()" [size]="12" [style.opacity]="active() ? 1 : 0.35" />`,
  styles: [':host { display: inline-flex; }'],
})
export class NetroSortIcon {
  readonly active = input(false);
  readonly dir = input<'asc' | 'desc'>('asc');

  readonly glyph = computed<IconName>(() =>
    !this.active() ? 'sort' : this.dir() === 'asc' ? 'sort-asc' : 'sort-desc',
  );
}
