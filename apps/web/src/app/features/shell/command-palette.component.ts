import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { NetroIcon, IconName } from '../../ui/icon';
import { NavigationService } from '../../core/services/navigation.service';
import { ThemeService } from '../../core/services/theme.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  group: string;
  keywords: string[];
  run: () => void;
}

/**
 * Keyboard-first navigation. Every destination and a small set of global
 * actions are reachable without touching the mouse, which is how people who
 * live in an operations tool all day actually move around it.
 */
@Component({
  selector: 'netro-command-palette',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="dismissed.emit()"></div>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="palette__search">
        <netro-icon name="search" [size]="16" />
        <input
          #box
          class="palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          [attr.aria-activedescendant]="'palette-opt-' + cursor()"
          placeholder="Search NetroTrack — pages, actions, settings"
          [value]="query()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
        />
        <span class="kbd">Esc</span>
      </div>

      <div class="palette__results" id="palette-results" role="listbox">
        <ng-container *ngIf="results().length; else nothing">
          @for (group of grouped(); track group.label) {
            <p class="menu__label">{{ group.label }}</p>
            @for (item of group.items; track item.id) {
              <button
                type="button"
                role="option"
                class="palette__item"
                [id]="'palette-opt-' + indexOf(item)"
                [attr.aria-selected]="indexOf(item) === cursor()"
                [ngClass]="{ 'is-cursor': indexOf(item) === cursor() }"
                (mouseenter)="cursor.set(indexOf(item))"
                (click)="choose(item)"
              >
                <netro-icon [name]="item.icon" [size]="15" />
                <span class="palette__labels">
                  <span class="palette__label">{{ item.label }}</span>
                  <span class="palette__hint">{{ item.hint }}</span>
                </span>
                <netro-icon name="arrow-right" [size]="13" class="palette__go" />
              </button>
            }
          }
        </ng-container>
        <ng-template #nothing>
          <p class="palette__empty">No match for “{{ query() }}”.</p>
        </ng-template>
      </div>

      <div class="palette__foot">
        <span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span>
        <span><span class="kbd">↵</span> open</span>
        <span class="spacer"></span>
        <span>{{ results().length }} result{{ results().length === 1 ? '' : 's' }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: contents; }

      .palette {
        position: fixed;
        z-index: 401;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        width: min(620px, calc(100vw - 24px));
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        background: var(--surface-raised);
        border: 1px solid var(--line-strong);
        border-radius: var(--r-xl);
        box-shadow: var(--e-4);
        overflow: hidden;
        animation: netro-scale-in var(--dur-2) var(--ease-out);
      }

      .palette__search {
        display: flex;
        align-items: center;
        gap: var(--s-3);
        padding: 0 var(--s-4);
        height: 50px;
        border-bottom: 1px solid var(--line-subtle);
        color: var(--fg-faint);
        flex: none;
      }
      .palette__input {
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        color: var(--fg);
        font: 400 15px/1 var(--font-sans);
      }
      .palette__input:focus { outline: none; }
      .palette__input::placeholder { color: var(--fg-faint); }

      .palette__results { overflow-y: auto; padding: 5px; flex: 1; min-height: 0; }

      .palette__item {
        display: flex;
        align-items: center;
        gap: var(--s-3);
        width: 100%;
        padding: 8px 10px;
        border-radius: var(--r-md);
        color: var(--fg-muted);
        text-align: left;
      }
      .palette__item.is-cursor { background: var(--surface-active); color: var(--fg); }
      .palette__labels { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
      .palette__label { font: var(--t-body-md); color: var(--fg); }
      .palette__hint {
        font: var(--t-small);
        color: var(--fg-subtle);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .palette__go { opacity: 0; color: var(--accent); }
      .palette__item.is-cursor .palette__go { opacity: 1; }

      .palette__empty { padding: var(--s-8) var(--s-4); text-align: center; font: var(--t-small); color: var(--fg-subtle); }

      .palette__foot {
        display: flex;
        align-items: center;
        gap: var(--s-4);
        padding: 7px var(--s-4);
        border-top: 1px solid var(--line-subtle);
        background: var(--surface-sunken);
        font: var(--t-micro);
        color: var(--fg-faint);
        flex: none;
      }
      .palette__foot .kbd { margin-right: 3px; }
    `,
  ],
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  private readonly theme = inject(ThemeService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly dismissed = output<void>();

  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  readonly query = signal('');
  readonly cursor = signal(0);

  private readonly commands = computed<Command[]>(() => {
    const goTo: Command[] = this.nav.items().map(item => ({
      id: `go:${item.route}`,
      label: item.disabled ? `${item.label} (Coming Soon)` : item.label,
      hint: item.hint,
      icon: item.icon,
      group: item.disabled ? 'Coming Soon' : 'Go to',
      keywords: item.keywords ?? [],
      run: () => {
        if (item.disabled) {
          this.toast.info(
            `${item.label} — Coming Soon`,
            'This feature is currently in active development and will be released in an upcoming update.',
          );
          this.dismissed.emit();
        } else {
          this.router.navigateByUrl(item.route);
        }
      },
    }));

    const actions: Command[] = [
      {
        id: 'act:profile',
        label: 'My profile',
        hint: 'Photo, contact details and MPIN',
        icon: 'user',
        group: 'Account',
        keywords: ['account', 'me', 'mpin', 'password', 'avatar'],
        run: () => this.router.navigateByUrl('/profile'),
      },
      {
        id: 'act:theme',
        label: `Switch to ${this.theme.resolved() === 'dark' ? 'light' : 'dark'} appearance`,
        hint: 'Currently following ' + this.theme.choice(),
        icon: this.theme.resolved() === 'dark' ? 'sun' : 'moon',
        group: 'Account',
        keywords: ['dark mode', 'light mode', 'appearance', 'contrast'],
        run: () => this.theme.cycle(),
      },
      {
        id: 'act:signout',
        label: 'Sign out',
        hint: 'End this session on this device',
        icon: 'logout',
        group: 'Account',
        keywords: ['log out', 'exit', 'leave'],
        run: () => {
          this.api.logout();
          this.router.navigateByUrl('/login');
        },
      },
    ];

    return [...goTo, ...actions];
  });

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.commands();
    return this.commands()
      .map(c => ({ c, score: score(c, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c);
  });

  readonly grouped = computed(() => {
    const out: Array<{ label: string; items: Command[] }> = [];
    for (const item of this.results()) {
      const bucket = out.find(g => g.label === item.group);
      if (bucket) bucket.items.push(item);
      else out.push({ label: item.group, items: [item] });
    }
    return out;
  });

  constructor() {
    queueMicrotask(() => this.box()?.nativeElement.focus());
  }

  indexOf(item: Command): number {
    return this.results().indexOf(item);
  }

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.cursor.set(0);
  }

  onKey(event: KeyboardEvent): void {
    const total = this.results().length;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismissed.emit();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.cursor.set(total ? (this.cursor() + 1) % total : 0);
      this.scrollToCursor();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.set(total ? (this.cursor() - 1 + total) % total : 0);
      this.scrollToCursor();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.results()[this.cursor()];
      if (item) this.choose(item);
    }
  }

  choose(item: Command): void {
    this.dismissed.emit();
    item.run();
  }

  private scrollToCursor(): void {
    queueMicrotask(() => {
      document.getElementById(`palette-opt-${this.cursor()}`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}

/** Prefix matches outrank word matches, which outrank keyword matches. */
function score(command: Command, query: string): number {
  const label = command.label.toLowerCase();
  if (label.startsWith(query)) return 100;
  if (label.includes(query)) return 70;
  if (command.keywords.some(k => k.startsWith(query))) return 50;
  if (command.keywords.some(k => k.includes(query))) return 35;
  if (command.hint.toLowerCase().includes(query)) return 20;
  return 0;
}
