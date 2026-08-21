import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService, apiError, fieldErrors } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CAN, hasRole } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import { Product } from '../../core/models/domain';
import { currency } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroBadge, NetroSkeletonRows, NetroState, NetroAlert } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroToolbar,
    NetroBadge,
    NetroState,
    NetroAlert,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.component.html',
})
export class ProductsComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly viewing = signal<Product | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly saving = signal(false);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly canModify = computed(() => hasRole(this.api.role(), CAN.manageCatalogue));

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p => [p.name, p.sku, p.description, p.unit].join(' ').toLowerCase().includes(q));
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: [''],
    price: ['' as string | number],
    unit: [''],
    description: [''],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Product[]>(API.products).subscribe({
      next: res => {
        this.products.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load the catalogue.'));
        this.loading.set(false);
      },
    });
  }

  money = (p: Product) => currency(p.price ?? p.unitPrice);
  applySearch(v: string): void {
    this.search.set(v);
  }

  view(p: Product): void {
    this.viewing.set(p);
  }
  closeView(): void {
    this.viewing.set(null);
  }

  startCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', sku: '', price: '', unit: '', description: '', isActive: true });
    this.editorOpen.set(true);
    this.closeView();
  }

  startEdit(p: Product): void {
    this.editing.set(p);
    this.form.reset({
      name: p.name,
      sku: p.sku ?? '',
      price: p.price ?? p.unitPrice ?? '',
      unit: p.unit ?? '',
      description: p.description ?? '',
      isActive: p.isActive !== false,
    });
    this.editorOpen.set(true);
    this.closeView();
  }

  async closeEditor(): Promise<void> {
    if (this.form.dirty) {
      const ok = await this.confirm.ask({
        title: 'Discard your changes?',
        body: 'This form has edits that have not been saved.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.form.markAsPristine();
    this.editorOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const price = raw.price === '' || raw.price == null ? null : Number(raw.price);
    const body = {
      name: raw.name.trim(),
      sku: raw.sku.trim() || null,
      description: raw.description.trim() || null,
      unit: raw.unit.trim() || null,
      price: price != null && Number.isFinite(price) ? price : null,
      isActive: raw.isActive,
    };
    const target = this.editing();
    this.saving.set(true);
    const request = target ? this.api.put(`${API.products}/${target.id}`, body) : this.api.post(API.products, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.form.markAsPristine();
        this.toast.success(target ? 'Product updated' : 'Product added', `${raw.name} is in the catalogue.`);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(err));
        this.toast.error('Could not save this product', apiError(err));
      },
    });
  }

  async remove(p: Product): Promise<void> {
    const ok = await this.confirm.askDelete('product', p.name);
    if (!ok) return;
    this.api.delete(`${API.products}/${p.id}`).subscribe({
      next: () => {
        this.toast.success('Product removed', `${p.name} is no longer in the catalogue.`);
        this.closeView();
        this.load();
      },
      error: err => this.toast.error('Could not delete this product', apiError(err)),
    });
  }

  errorFor(control: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[control as string];
    if (server) return server;
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return null;
    if (field.hasError('required')) return 'This is required.';
    return 'Check this value.';
  }
}
