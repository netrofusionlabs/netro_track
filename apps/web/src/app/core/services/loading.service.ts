import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _activeRequests = signal<number>(0);

  /** True whenever one or more HTTP requests or async tasks are active. */
  readonly isLoading = computed(() => this._activeRequests() > 0);

  /** Current number of concurrent background tasks. */
  readonly activeCount = computed(() => this._activeRequests());

  start(): void {
    this._activeRequests.update(count => count + 1);
  }

  stop(): void {
    this._activeRequests.update(count => Math.max(0, count - 1));
  }

  reset(): void {
    this._activeRequests.set(0);
  }
}
