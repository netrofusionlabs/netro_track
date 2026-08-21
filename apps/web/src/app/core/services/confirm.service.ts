import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  body?: string;
  /** Text on the affirmative button. Should name the action, not say "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** Extra facts to show, so the user can verify what they are acting on. */
  facts?: Array<{ label: string; value: string }>;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

/**
 * Replaces `window.confirm`. Destructive actions state exactly what will
 * happen and name the action on the button.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.pending.set({ ...request, resolve });
    });
  }

  /** Convenience for the common "delete this record" case. */
  askDelete(entity: string, name?: string, body?: string): Promise<boolean> {
    return this.ask({
      title: `Delete ${entity}?`,
      body:
        body ??
        `${name ? `“${name}”` : `This ${entity}`} will be removed from active views. ` +
          `Historical records that reference it are retained.`,
      confirmLabel: `Delete ${entity}`,
      tone: 'danger',
    });
  }

  settle(ok: boolean): void {
    const current = this.pending();
    if (!current) return;
    this.pending.set(null);
    current.resolve(ok);
  }
}
