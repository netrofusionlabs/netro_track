import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService, apiError, fieldErrors } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CAN, hasRole } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import { CUSTOMER_TYPES, Customer, Sale, Visit, customerPhone, visitProducts } from '../../core/models/domain';
import { currency, titleCase } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroBadge, NetroSkeletonRows, NetroState, NetroAlert } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
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
  templateUrl: './customers.component.html',
})
export class CustomersComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly types = CUSTOMER_TYPES;
  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly viewing = signal<Customer | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<Customer | null>(null);
  readonly saving = signal(false);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly relatedVisits = signal<Visit[]>([]);
  readonly relatedOrders = signal<Sale[]>([]);

  readonly canDelete = computed(() => hasRole(this.api.role(), CAN.deleteCustomers));
  readonly canCreate = computed(() => hasRole(this.api.role(), CAN.manageCustomers));

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(c =>
      [c.name, c.type, c.phone, c.email, c.village, c.address].join(' ').toLowerCase().includes(q),
    );
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['RETAILER'],
    phone: [''],
    email: [''],
    address: [''],
    village: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Customer[]>(API.customers).subscribe({
      next: res => {
        this.customers.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load customers.'));
        this.loading.set(false);
      },
    });
  }

  phone = customerPhone;
  label = titleCase;
  money = currency;

  applySearch(value: string): void {
    this.search.set(value);
  }

  view(customer: Customer): void {
    this.viewing.set(customer);
    this.api.list<Visit>(API.visits).subscribe(list => {
      this.relatedVisits.set(list.filter(v => v.customerId === customer.id).slice(0, 8));
    });
    this.api.list<Sale>(API.orders).subscribe(list => {
      this.relatedOrders.set(list.filter(s => s.customerId === customer.id).slice(0, 8));
    });
  }

  closeView(): void {
    this.viewing.set(null);
  }

  startCreate(): void {
    this.editing.set(null);
    this.serverErrors.set({});
    this.form.reset({ name: '', type: 'RETAILER', phone: '', email: '', address: '', village: '' });
    this.editorOpen.set(true);
    this.closeView();
  }

  startEdit(customer: Customer): void {
    this.editing.set(customer);
    this.serverErrors.set({});
    this.form.reset({
      name: customer.name,
      type: customer.type || 'RETAILER',
      phone: customerPhone(customer) === '—' ? '' : customerPhone(customer),
      email: customer.email ?? '',
      address: customer.address ?? '',
      village: customer.village ?? '',
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
    const body = {
      name: raw.name.trim(),
      type: raw.type || null,
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      address: raw.address.trim() || null,
      village: raw.village.trim() || null,
    };
    const target = this.editing();
    this.saving.set(true);
    this.serverErrors.set({});
    const request = target ? this.api.put(API.customers + '/' + target.id, body) : this.api.post(API.customers, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.form.markAsPristine();
        this.toast.success(target ? 'Customer updated' : 'Customer added', `${raw.name} is in the directory.`);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(err));
        this.toast.error('Could not save this customer', apiError(err));
      },
    });
  }

  async remove(customer: Customer): Promise<void> {
    const ok = await this.confirm.askDelete('customer', customer.name);
    if (!ok) return;
    this.api.delete(`${API.customers}/${customer.id}`).subscribe({
      next: () => {
        this.toast.success('Customer removed', `${customer.name} is no longer in the directory.`);
        this.closeView();
        this.load();
      },
      error: err => this.toast.error('Could not delete this customer', apiError(err)),
    });
  }

  productsOf = visitProducts;

  errorFor(control: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[control as string];
    if (server) return server;
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return null;
    if (field.hasError('required')) return 'This is required.';
    if (field.hasError('minlength')) return 'This is too short.';
    return 'Check this value.';
  }
}
