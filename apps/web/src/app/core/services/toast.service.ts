import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  /** Optional single follow-up action, e.g. "View request". */
  action?: { label: string; run: () => void };
  duration: number;
}

/**
 * Transient confirmation of things the user just did. Errors persist longer
 * than successes because they usually need reading.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(title: string, detail?: string, action?: Toast['action']): void {
    this.push('success', title, detail, action, 4200);
  }

  error(title: string, detail?: string, action?: Toast['action']): void {
    this.push('error', title, detail, action, 8000);
  }

  warning(title: string, detail?: string, action?: Toast['action']): void {
    this.push('warning', title, detail, action, 6000);
  }

  info(title: string, detail?: string, action?: Toast['action']): void {
    this.push('info', title, detail, action, 4500);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(
    tone: ToastTone,
    title: string,
    detail: string | undefined,
    action: Toast['action'] | undefined,
    duration: number,
  ): void {
    const id = ++this.seq;
    this.toasts.update(list => [...list.slice(-3), { id, tone, title, detail, action, duration }]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
  }
}
