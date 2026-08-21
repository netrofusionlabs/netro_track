import { Injectable, effect, signal } from '@angular/core';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'netro.theme';

/**
 * Applies the `.dark` class to the document root. Defaults to following the
 * operating system so the portal matches whatever the operator already runs.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly choice = signal<ThemeChoice>(readStored());
  readonly resolved = signal<'light' | 'dark'>('light');

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.choice() === 'system') this.apply();
    });
    effect(() => {
      localStorage.setItem(STORAGE_KEY, this.choice());
      this.apply();
    });
  }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
  }

  /** Cycles light → dark → system, which is what the header control does. */
  cycle(): void {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    this.choice.set(order[(order.indexOf(this.choice()) + 1) % order.length]);
  }

  private apply(): void {
    const dark = this.choice() === 'dark' || (this.choice() === 'system' && this.media.matches);
    document.documentElement.classList.toggle('dark', dark);
    this.resolved.set(dark ? 'dark' : 'light');
  }
}

function readStored(): ThemeChoice {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  // Migrate the pre-redesign `theme` key so returning users keep their choice.
  const legacy = localStorage.getItem('theme');
  if (legacy === 'dark') return 'dark';
  if (legacy === 'light') return 'light';
  return 'system';
}
