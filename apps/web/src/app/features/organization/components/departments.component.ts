import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { API } from '../../../core/models/endpoints';
import { NetroIcon } from '../../../ui/icon';
import { NetroPanel } from '../../../ui/patterns';
import { NetroDrawer } from '../../../ui/overlays';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [NgIf, NgFor, NetroIcon, NetroPanel, NetroDrawer, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <netro-panel
      heading="Departments"
      description="Manage organizational departments and functional units."
      [flush]="true"
    >
      <div slot="actions">
        <button type="button" class="btn btn--primary btn--sm" (click)="openDrawer()">
          <netro-icon name="plus" [size]="13" /> Add department
        </button>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Department name</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()">
              <td colspan="4" class="text-subtle">Loading departments...</td>
            </tr>
            <tr *ngIf="!loading() && departments().length === 0">
              <td colspan="4" class="text-subtle">No departments found. Create your first department.</td>
            </tr>
            <tr *ngFor="let dept of departments()">
              <td class="font-medium">{{ dept.name }}</td>
              <td class="text-subtle">
                <span *ngIf="dept.branch" class="badge badge--neutral">{{ dept.branch.name }}</span>
                <span *ngIf="!dept.branch" class="badge badge--info">Global</span>
              </td>
              <td>
                <span class="badge" [class.badge--success]="dept.isActive" [class.badge--neutral]="!dept.isActive">
                  {{ dept.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="row-actions">
                <button type="button" class="btn btn--subtle btn--sm" (click)="openDrawer(dept)">Edit</button>
                <button type="button" class="btn btn--subtle btn--sm text-danger" (click)="deleteDepartment(dept.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </netro-panel>

    @if (drawerOpen()) {
      <netro-drawer
        [heading]="editingDepartment() ? 'Edit department' : 'Create department'"
        (closed)="closeDrawer()"
      >
        <form #form="ngForm" (ngSubmit)="saveDepartment(form)">
          <div class="drawer__body">
            <div class="field">
              <label class="label" for="d-name">Department name <span class="text-danger">*</span></label>
              <input type="text" id="d-name" name="name" class="input" [ngModel]="editingDepartment()?.name" required minlength="2">
            </div>
            
            <div class="field mt-3">
              <label class="label" for="d-branch">Branch</label>
              <select id="d-branch" name="branchId" class="input" [ngModel]="editingDepartment()?.branchId || ''">
                <option value="">Global (All Branches)</option>
                <option *ngFor="let branch of branches()" [value]="branch.id">{{ branch.name }}</option>
              </select>
            </div>

            <div class="field mt-3">
              <label class="checkbox-field">
                <input type="checkbox" name="isActive" class="checkbox" [ngModel]="editingDepartment()?.isActive ?? true">
                <span class="label">Department is active</span>
              </label>
            </div>
          </div>
          <div class="drawer__foot">
            <button type="button" class="btn btn--default" (click)="closeDrawer()">Cancel</button>
            <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving...' : 'Save department' }}
            </button>
          </div>
        </form>
      </netro-drawer>
    }
  `
})
export class DepartmentsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly departments = signal<any[]>([]);
  readonly branches = signal<any[]>([]);
  readonly loading = signal(true);
  
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly editingDepartment = signal<any>(null);

  constructor() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.api.get<any>(API.BRANCHES).subscribe(res => this.branches.set(res?.data ? res.data : (Array.isArray(res) ? res : [])));
    this.api.get<any>(API.DEPARTMENTS).subscribe({
      next: (res) => {
        this.departments.set(res?.data ? res.data : (Array.isArray(res) ? res : []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(dept?: any) {
    this.editingDepartment.set(dept || null);
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.editingDepartment.set(null);
  }

  saveDepartment(form: NgForm) {
    if (form.invalid) return;
    this.saving.set(true);
    const payload = form.value;
    if (payload.branchId === "") {
      payload.branchId = null;
    }

    const request = this.editingDepartment()
      ? this.api.put(`${API.DEPARTMENTS}/${this.editingDepartment().id}`, payload)
      : this.api.post(API.DEPARTMENTS, payload);

    request.subscribe({
      next: () => {
        this.toast.success(`Department ${this.editingDepartment() ? 'updated' : 'created'}`);
        this.closeDrawer();
        this.saving.set(false);
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to save department');
        this.saving.set(false);
      }
    });
  }

  async deleteDepartment(id: string) {
    const confirmed = await this.confirm.askDelete('Department');
    if (confirmed) {
      this.api.delete(`${API.DEPARTMENTS}/${id}`).subscribe({
        next: () => {
          this.toast.success('Department deleted');
          this.loadData();
        },
        error: (err: any) => this.toast.error(err.error?.message || 'Failed to delete department')
      });
    }
  }
}
