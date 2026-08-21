import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NetroIcon, IconName } from './icon';
import { Maybe } from './primitives';
import { ToastService } from '../core/services/toast.service';
import { ConfirmService } from '../core/services/confirm.service';

/* Body scroll is owned by a counter so nested overlays don't unlock early. */
let lockDepth = 0;

function lockScroll(): void {
  if (lockDepth === 0) document.body.style.overflow = 'hidden';
  lockDepth += 1;
}

function unlockScroll(): void {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) document.body.style.overflow = '';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Shared behaviour for dialog and drawer: scroll lock, focus trap, restore. */
@Directive()
abstract class OverlayBase implements OnInit, OnDestroy {
  protected readonly host = inject(ElementRef<HTMLElement>);
  private restoreTo: HTMLElement | null = null;

  ngOnInit(): void {
    this.restoreTo = document.activeElement as HTMLElement | null;
    lockScroll();
    queueMicrotask(() => this.focusFirst());
  }

  ngOnDestroy(): void {
    unlockScroll();
    this.restoreTo?.focus?.();
  }

  private panel(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.dialog, .drawer');
  }

  private focusFirst(): void {
    const panel = this.panel();
    if (!panel) return;
    const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
    const first = preferred ?? panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.requestClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = this.panel();
    if (!panel) return;
    const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!nodes.length) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected abstract requestClose(): void;
}

/* ==========================================================================
   Dialog — a decision or a short focused form. Blocks the page on purpose.
   ========================================================================== */

@Component({
  selector: 'netro-dialog',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="onScrim()"></div>
    <div
      class="dialog"
      [ngClass]="sizeClass()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="heading()"
      tabindex="-1"
    >
      <header class="overlay__head">
        <div class="overlay__titles">
          <h2 class="overlay__title">{{ heading() }}</h2>
          <p class="overlay__sub" *ngIf="sub()">{{ sub() }}</p>
        </div>
        <button type="button" class="btn btn--subtle btn--sm btn--icon" aria-label="Close dialog" (click)="closed.emit()">
          <netro-icon name="close" [size]="15" />
        </button>
      </header>

      <div class="overlay__body" [ngClass]="{ 'overlay__body--flush': flush() }">
        <ng-content />
      </div>

      <footer class="overlay__foot" *ngIf="hasFooter()">
        <ng-content select="[slot=footer]" />
      </footer>
    </div>
  `,
  styles: [':host { display: contents; }'],
})
export class NetroDialog extends OverlayBase {
  readonly heading = input.required<string>();
  readonly sub = input<Maybe<string>>(null);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly flush = input(false);
  readonly hasFooter = input(true);
  /** Forms disable this so a stray click can't discard typed input. */
  readonly dismissOnScrim = input(true);

  readonly closed = output<void>();

  readonly sizeClass = computed(() => (this.size() === 'md' ? '' : `dialog--${this.size()}`));

  onScrim(): void {
    if (this.dismissOnScrim()) this.closed.emit();
  }

  protected requestClose(): void {
    this.closed.emit();
  }
}

/* ==========================================================================
   Drawer — detail and editing beside the list, so context is never lost.
   ========================================================================== */

@Component({
  selector: 'netro-drawer',
  standalone: true,
  imports: [NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scrim" (click)="onScrim()"></div>
    <aside
      class="drawer"
      [ngClass]="widthClass()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="heading()"
      tabindex="-1"
    >
      <header class="overlay__head">
        <div class="overlay__titles">
          <p class="eyebrow" *ngIf="eyebrow()">{{ eyebrow() }}</p>
          <h2 class="overlay__title">{{ heading() }}</h2>
          <p class="overlay__sub" *ngIf="sub()">{{ sub() }}</p>
        </div>
        <ng-content select="[slot=head-actions]" />
        <button type="button" class="btn btn--subtle btn--sm btn--icon" aria-label="Close panel" (click)="closed.emit()">
          <netro-icon name="close" [size]="15" />
        </button>
      </header>

      <ng-content select="[slot=sticky]" />

      <div class="overlay__body" [ngClass]="{ 'overlay__body--flush': flush() }">
        <ng-content />
      </div>

      <footer class="overlay__foot" *ngIf="hasFooter()">
        <ng-content select="[slot=footer]" />
      </footer>
    </aside>
  `,
  styles: [':host { display: contents; }'],
})
export class NetroDrawer extends OverlayBase {
  readonly heading = input.required<string>();
  readonly eyebrow = input<Maybe<string>>(null);
  readonly sub = input<Maybe<string>>(null);
  readonly width = input<'md' | 'wide' | 'xwide'>('md');
  readonly flush = input(false);
  readonly hasFooter = input(true);
  readonly dismissOnScrim = input(true);

  readonly closed = output<void>();

  readonly widthClass = computed(() => (this.width() === 'md' ? '' : `drawer--${this.width()}`));

  onScrim(): void {
    if (this.dismissOnScrim()) this.closed.emit();
  }

  protected requestClose(): void {
    this.closed.emit();
  }
}

/* ==========================================================================
   Toast host — mounted once in the shell.
   ========================================================================== */

@Component({
  selector: 'netro-toast-host',
  standalone: true,
  imports: [NgIf, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-region" role="region" aria-label="Notifications">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast--' + t.tone" role="status" aria-live="polite">
          <netro-icon [name]="glyph(t.tone)" [size]="15" [class]="iconClass(t.tone)" />
          <div class="toast__body">
            <p class="toast__title">{{ t.title }}</p>
            <p class="toast__detail" *ngIf="t.detail">{{ t.detail }}</p>
            <button
              *ngIf="t.action"
              type="button"
              class="btn btn--subtle btn--sm"
              style="align-self: flex-start; margin-top: 4px; padding-left: 0"
              (click)="run(t.id, t.action!.run)"
            >
              {{ t.action.label }}
            </button>
          </div>
          <button type="button" class="btn btn--subtle btn--sm btn--icon" aria-label="Dismiss" (click)="toasts.dismiss(t.id)">
            <netro-icon name="close" [size]="13" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    ':host { display: contents; }',
    '.tone-ok { color: var(--ok-fg); }',
    '.tone-risk { color: var(--risk-fg); }',
    '.tone-warn { color: var(--warn-fg); }',
    '.tone-info { color: var(--accent); }',
  ],
})
export class NetroToastHost {
  readonly toasts = inject(ToastService);

  glyph(tone: string): IconName {
    switch (tone) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'alert';
      default:
        return 'info';
    }
  }

  iconClass(tone: string): string {
    switch (tone) {
      case 'success':
        return 'tone-ok';
      case 'error':
        return 'tone-risk';
      case 'warning':
        return 'tone-warn';
      default:
        return 'tone-info';
    }
  }

  run(id: number, fn: () => void): void {
    this.toasts.dismiss(id);
    fn();
  }
}

/* ==========================================================================
   Confirm host — one consistent confirmation surface, replacing window.confirm.
   ========================================================================== */

@Component({
  selector: 'netro-confirm-host',
  standalone: true,
  imports: [NgIf, NetroDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as p) {
      <netro-dialog [heading]="p.title" size="sm" (closed)="confirm.settle(false)">
        <p class="text-small text-muted" style="line-height: 1.6" *ngIf="p.body">{{ p.body }}</p>

        <dl class="defs" style="margin-top: 14px" *ngIf="p.facts?.length">
          @for (f of p.facts; track f.label) {
            <div class="defs__row">
              <dt class="defs__key">{{ f.label }}</dt>
              <dd class="defs__val">{{ f.value }}</dd>
            </div>
          }
        </dl>

        <div slot="footer" style="display: contents">
          <span class="spacer"></span>
          <button type="button" class="btn btn--default" (click)="confirm.settle(false)">
            {{ p.cancelLabel || 'Cancel' }}
          </button>
          <button
            type="button"
            [class]="p.tone === 'danger' ? 'btn btn--danger' : 'btn btn--primary'"
            data-autofocus
            (click)="confirm.settle(true)"
          >
            {{ p.confirmLabel || 'Confirm' }}
          </button>
        </div>
      </netro-dialog>
    }
  `,
  styles: [':host { display: contents; }'],
})
export class NetroConfirmHost {
  readonly confirm = inject(ConfirmService);
}
