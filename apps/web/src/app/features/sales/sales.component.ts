import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';
import { Customer, Product, Sale } from '../../core/models/domain';
import { currency, dayLabel, uuid } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroSkeletonRows, NetroState, NetroAlert, NetroBadge } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

interface Line {
  productId: string;
  quantity: number;
}

@Component({
  selector: 'app-sales',
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
  templateUrl: './sales.component.html',
})
export class SalesComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly sales = signal<Sale[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly catalogue = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly viewing = signal<Sale | null>(null);
  readonly editorOpen = signal(false);
  readonly saving = signal(false);

  readonly customerId = signal('');
  readonly remarks = signal('');
  readonly lines = signal<Line[]>([{ productId: '', quantity: 1 }]);

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.sales();
    return this.sales().filter(s =>
      [s.customer?.name, s.user?.name, ...(s.items ?? []).map(i => i.product?.name)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  readonly draftTotal = computed(() => {
    let sum = 0;
    for (const line of this.lines()) {
      const product = this.catalogue().find(p => p.id === line.productId);
      const price = Number(product?.price ?? product?.unitPrice ?? 0);
      sum += price * Math.max(0, Number(line.quantity) || 0);
    }
    return sum;
  });

  constructor() {
    this.load();
    this.api.list<Customer>(API.customers).subscribe(list => this.customers.set(list));
    this.api.list<Product>(API.products).subscribe(list => this.catalogue.set(list));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Sale[]>(API.orders).subscribe({
      next: res => {
        this.sales.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load sales orders.'));
        this.loading.set(false);
      },
    });
  }

  money = currency;
  when = (s: Sale) => dayLabel(s.createdAt);
  itemsLabel = (s: Sale) =>
    (s.items ?? []).map(i => `${i.product?.name || 'Item'} × ${i.quantity}`).join(', ') || '—';

  view(s: Sale): void {
    this.viewing.set(s);
  }
  closeView(): void {
    this.viewing.set(null);
  }

  startCreate(): void {
    this.customerId.set('');
    this.remarks.set('');
    this.lines.set([{ productId: '', quantity: 1 }]);
    this.editorOpen.set(true);
    this.closeView();
  }

  async closeEditor(): Promise<void> {
    if (this.customerId() || this.lines().some(l => l.productId)) {
      const ok = await this.confirm.ask({
        title: 'Discard this order?',
        body: 'The customer and line items will not be kept.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.editorOpen.set(false);
  }

  addLine(): void {
    this.lines.update(current => [...current, { productId: '', quantity: 1 }]);
  }

  removeLine(index: number): void {
    this.lines.update(current => current.filter((_, i) => i !== index));
  }

  patchLine(index: number, patch: Partial<Line>): void {
    this.lines.update(current => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  submit(): void {
    if (!this.customerId()) {
      this.toast.warning('Choose a customer', 'An order has to be against someone in the directory.');
      return;
    }
    const items = this.lines()
      .filter(l => l.productId && l.quantity > 0)
      .map(l => {
        const product = this.catalogue().find(p => p.id === l.productId);
        return {
          productId: l.productId,
          quantity: Number(l.quantity),
          price: Number(product?.price ?? product?.unitPrice ?? 0),
        };
      });
    if (!items.length) {
      this.toast.warning('Add at least one item', 'Pick a product and a quantity.');
      return;
    }

    this.saving.set(true);
    this.api
      .post<Sale>(API.orders, {
        localId: uuid(),
        customerId: this.customerId(),
        remarks: this.remarks().trim() || undefined,
        items,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editorOpen.set(false);
          this.toast.success('Order recorded', `Total ${currency(this.draftTotal())}.`);
          this.load();
        },
        error: err => {
          this.saving.set(false);
          this.toast.error('Could not record this order', apiError(err));
        },
      });
  }

  applySearch(value: string): void {
    this.search.set(value);
  }

  priceOf(id: string): string {
    const product = this.catalogue().find(p => p.id === id);
    return product ? currency(product.price ?? product.unitPrice) : '';
  }
}
