import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { API } from '../../../core/models/endpoints';
import { NetroIcon } from '../../../ui/icon';
import { NetroPanel, NetroPageHeader } from '../../../ui/patterns';
import { NetroDrawer } from '../../../ui/overlays';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [NgIf, NgFor, NetroIcon, NetroPanel, NetroDrawer, FormsModule, NetroPageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <netro-page-header
        title="Branches"
        description="Manage geographical or structural branch locations for your company."
      >
        <div slot="actions" class="row row--nowrap">
          <select *ngIf="canImpersonate()" class="input" style="height: 32px; min-width: 200px;" [ngModel]="api.tenantOverrideId()" (ngModelChange)="onTenantChange($event)">
            <option [ngValue]="null">My Company (Default)</option>
            <option *ngFor="let c of companies()" [value]="c.id">{{ c.name }}</option>
          </select>
          <button type="button" class="btn btn--primary btn--sm" (click)="openDrawer()">
            <netro-icon name="plus" [size]="13" /> Add branch
          </button>
        </div>
      </netro-page-header>

      <netro-panel [flush]="true" padding="none">

      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Branch name</th>
              <th scope="col">Address</th>
              <th scope="col">Status</th>
              <th scope="col" class="col-actions"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()">
              <td colspan="4" class="text-subtle" style="text-align: center; padding: 24px;">Loading branches...</td>
            </tr>
            <tr *ngIf="!loading() && branches().length === 0">
              <td colspan="4" class="text-subtle" style="text-align: center; padding: 24px;">No branches found. Create your first branch.</td>
            </tr>
            <tr *ngFor="let branch of branches()" class="is-clickable" tabindex="0" (click)="openDrawer(branch)">
              <td>
                <div class="row row--nowrap row--center" style="gap: 12px">
                  <div>
                    <span class="cell-strong">{{ branch.name }}</span>
                    <span *ngIf="branch.isHq" class="badge badge--info ml-2" style="font-size: 0.7em; padding: 2px 6px; display: inline-block;">HQ</span>
                  </div>
                </div>
              </td>
              <td class="cell-secondary">{{ branch.address || '—' }}</td>
              <td>
                <span class="badge" [class.badge--success]="branch.isActive" [class.badge--neutral]="!branch.isActive">
                  {{ branch.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="col-actions" (click)="$event.stopPropagation()">
                <span class="row-actions">
                  <button type="button" class="btn btn--subtle btn--sm" (click)="openDrawer(branch)">
                    <netro-icon name="edit" [size]="14" /> Edit
                  </button>
                  <button type="button" class="btn btn--subtle btn--sm text-danger" (click)="deleteBranch(branch.id)">
                    <netro-icon name="x" [size]="14" /> Delete
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </netro-panel>
    </div>

    @if (drawerOpen()) {
      <netro-drawer
        [heading]="editingBranch() ? 'Edit branch' : 'Create branch'"
        (closed)="closeDrawer()"
      >
        <form #form="ngForm" (ngSubmit)="saveBranch(form)">
          <div class="drawer__body">
            <div class="field">
              <label class="label" for="b-name">Branch name <span class="text-danger">*</span></label>
              <input type="text" id="b-name" name="name" class="input" [ngModel]="editingBranch()?.name" required minlength="2">
            </div>
            
            <div class="field mt-3">
              <label class="label" for="b-address">Address</label>
              <input type="text" id="b-address" name="address" class="input" [ngModel]="editingBranch()?.address">
            </div>

            <div class="field-group" style="display: flex; gap: 12px; margin-top: 12px;">
              <div class="field" style="flex: 1;">
                <label class="label" for="b-state">State</label>
                <input type="text" id="b-state" name="state" class="input" [ngModel]="editingBranch()?.state">
              </div>
              <div class="field" style="flex: 1;">
                <label class="label" for="b-zip">ZIP Code</label>
                <input type="text" id="b-zip" name="zipCode" class="input" [ngModel]="editingBranch()?.zipCode">
              </div>
            </div>

            <div class="field mt-3">
              <label class="label" for="b-country">Country</label>
              <input type="text" id="b-country" name="country" class="input" [ngModel]="editingBranch()?.country">
            </div>

            <div class="field mt-4" style="border: 1px solid var(--line-subtle); padding: var(--s-3) var(--s-4); border-radius: var(--r-md); background: var(--surface-sunken);">
              <div class="row row--center row--nowrap" style="justify-content: space-between;">
                <div>
                  <label class="field__label" for="b-hq" style="color: var(--fg); font-weight: 500;">Set as Headquarters</label>
                  <span class="field__hint">Mark this branch as the main HQ.</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="b-hq" name="isHq" [ngModel]="editingBranch()?.isHq ?? false">
                  <div class="switch__track"><div class="switch__thumb"></div></div>
                </label>
              </div>
            </div>

            <div class="field mt-4 mb-2" style="border: 1px solid var(--line-subtle); padding: var(--s-3) var(--s-4); border-radius: var(--r-md); background: var(--surface-sunken);">
              <div class="row row--center row--nowrap" style="justify-content: space-between;">
                <div>
                  <label class="field__label" for="b-active" style="color: var(--fg); font-weight: 500;">Branch is active</label>
                  <span class="field__hint">Inactive branches cannot be assigned to new employees.</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="b-active" name="isActive" [ngModel]="editingBranch()?.isActive ?? true">
                  <div class="switch__track"><div class="switch__thumb"></div></div>
                </label>
              </div>
            </div>
          </div>
          <div class="drawer__foot" style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <button type="button" class="btn btn--default" (click)="closeDrawer()">Cancel</button>
            <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving...' : 'Save branch' }}
            </button>
          </div>
        </form>
      </netro-drawer>
    }
  `
})
export class BranchesComponent implements OnDestroy {
  readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly branches = signal<any[]>([]);
  readonly loading = signal(true);
  
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly editingBranch = signal<any>(null);

  readonly companies = signal<any[]>([]);
  readonly canImpersonate = computed(() => {
    const r = this.api.role();
    return r === 'SUPER_ADMIN' || r === 'MASTER_SUPER_ADMIN';
  });

  constructor() {
    this.loadBranches();
    if (this.canImpersonate()) {
      this.loadCompanies();
    }
  }

  loadCompanies() {
    this.api.get<any>(API.companies).subscribe({
      next: (res) => this.companies.set(res?.data ? res.data : (Array.isArray(res) ? res : [])),
      error: () => this.toast.error('Failed to load companies')
    });
  }

  onTenantChange(companyId: string | null) {
    this.api.tenantOverrideId.set(companyId || null);
    this.loadBranches();
  }

  ngOnDestroy() {
    this.api.tenantOverrideId.set(null);
  }

  loadBranches() {
    this.loading.set(true);
    this.api.get<any>(API.BRANCHES).subscribe({
      next: (res) => {
        this.branches.set(res?.data ? res.data : (Array.isArray(res) ? res : []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(branch?: any) {
    this.editingBranch.set(branch || null);
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.editingBranch.set(null);
  }

  saveBranch(form: NgForm) {
    if (form.invalid) return;
    this.saving.set(true);
    const payload = form.value;

    const request = this.editingBranch()
      ? this.api.put(`${API.BRANCHES}/${this.editingBranch().id}`, payload)
      : this.api.post(API.BRANCHES, payload);

    request.subscribe({
      next: () => {
        this.toast.success(`Branch ${this.editingBranch() ? 'updated' : 'created'}`);
        this.closeDrawer();
        this.saving.set(false);
        this.loadBranches();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to save branch');
        this.saving.set(false);
      }
    });
  }

  async deleteBranch(id: string) {
    const confirmed = await this.confirm.askDelete('Branch');
    if (confirmed) {
      this.api.delete(`${API.BRANCHES}/${id}`).subscribe({
        next: () => {
          this.toast.success('Branch deleted');
          this.loadBranches();
        },
        error: (err: any) => this.toast.error(err.error?.message || 'Failed to delete branch')
      });
    }
  }
}
