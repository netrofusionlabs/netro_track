import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';
import { Customer, Product, Visit, visitProducts } from '../../core/models/domain';
import { clock, dayLabel, mapsLink, relativeTime, uuid } from '../../core/utils/format';
import { locate } from '../../core/utils/geo';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeletonRows, NetroState, NetroAlert } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

/**
 * Field visits as an operational log: who was with which customer, when, where,
 * and what was discussed — not a spreadsheet of notes.
 */
@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroToolbar,
    NetroAvatar,
    NetroBadge,
    NetroState,
    NetroAlert,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visits.component.html',
  styleUrl: './visits.component.css',
})
export class VisitsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly visits = signal<Visit[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly catalogue = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  readonly viewing = signal<Visit | null>(null);
  readonly editorOpen = signal(false);
  readonly saving = signal(false);

  readonly customerId = signal('');
  readonly notes = signal('');
  readonly selectedIds = signal<string[]>([]);

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.visits();
    return this.visits().filter(v => {
      const hay = [v.customer?.name, v.user?.name, v.notes, visitProducts(v).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  constructor() {
    this.load();
    this.api.list<Customer>(API.customers).subscribe(list => this.customers.set(list));
    this.api.list<Product>(API.products).subscribe(list => this.catalogue.set(list));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Visit[]>(API.visits).subscribe({
      next: res => {
        this.visits.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load visits.'));
        this.loading.set(false);
      },
    });
  }

  productsOf = visitProducts;
  when = (v: Visit) => dayLabel(v.checkInTime) + ' · ' + clock(v.checkInTime);
  ago = (v: Visit) => relativeTime(v.checkInTime || v.createdAt);
  maps = mapsLink;

  view(visit: Visit): void {
    this.viewing.set(visit);
  }

  closeView(): void {
    this.viewing.set(null);
  }

  startCreate(): void {
    this.customerId.set('');
    this.notes.set('');
    this.selectedIds.set([]);
    this.editorOpen.set(true);
    this.closeView();
  }

  async closeEditor(): Promise<void> {
    if (this.notes().trim() || this.customerId()) {
      const ok = await this.confirm.ask({
        title: 'Discard this visit?',
        body: 'The notes and product selection will not be kept.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.editorOpen.set(false);
  }

  toggleProduct(id: string, on: boolean): void {
    this.selectedIds.update(current => (on ? [...current, id] : current.filter(x => x !== id)));
  }

  checked(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  async submit(): Promise<void> {
    if (!this.customerId()) {
      this.toast.warning('Choose a customer', 'A visit has to be against someone in the directory.');
      return;
    }

    this.saving.set(true);
    try {
      const coords = await locate();
      const names = this.catalogue()
        .filter(p => this.selectedIds().includes(p.id))
        .map(p => p.name);
      this.api
        .post<Visit>(API.visits, {
          localId: uuid(),
          customerId: this.customerId(),
          checkInTime: new Date().toISOString(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: this.notes().trim() || undefined,
          productsDiscussed: names.join(', ') || undefined,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.editorOpen.set(false);
            this.toast.success('Visit recorded', 'Logged at your current location.');
            this.load();
          },
          error: err => {
            this.saving.set(false);
            this.toast.error('Could not record this visit', apiError(err));
          },
        });
    } catch (err) {
      this.saving.set(false);
      this.toast.error('Location needed', err instanceof Error ? err.message : 'Could not read your location.');
    }
  }

  applySearch(value: string): void {
    this.search.set(value);
  }
}
