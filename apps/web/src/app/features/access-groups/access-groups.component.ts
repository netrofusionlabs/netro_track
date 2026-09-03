import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';

import { NetroIcon } from '../../ui/icon';
import { NetroAlert, NetroBadge, NetroSkeletonRows, NetroState, Tone } from '../../ui/primitives';
import { NetroMetric, NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

export interface CapabilityItem {
  id: string;
  key: string;
  slug: string;
  name: string;
  description?: string;
  type: 'MODULE' | 'FEATURE' | 'ACTION';
  parentId?: string | null;
  sortOrder: number;
}

export interface AccessGroupItem {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userMembers: number;
    permissions: number;
  };
}

export interface AccessGroupDetail extends AccessGroupItem {
  permissions: Array<{
    capabilityId: string;
    capability: CapabilityItem;
  }>;
  userMembers: Array<{
    user: {
      id: string;
      name: string;
      employeeId: string;
      email?: string | null;
      role: string;
    };
  }>;
}

interface CompanyOption {
  id: string;
  name: string;
}

@Component({
  selector: 'netro-access-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NetroIcon,
    NetroAlert,
    NetroBadge,
    NetroSkeletonRows,
    NetroState,
    NetroMetric,
    NetroPageHeader,
    NetroPanel,
    NetroDrawer,
    NetroToolbar,
  ],
  templateUrl: './access-groups.component.html',
  styleUrls: ['./access-groups.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessGroupsComponent {
  private readonly api = inject(ApiService);
  private readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly canManage = computed(() => this.perms.has('access_control.groups.manage'));

  /** Whether the current user is a super admin who can scope to any company */
  readonly isSuperAdmin = computed(() => {
    const role = this.api.role();
    return role === 'SUPER_ADMIN' || role === 'MASTER_SUPER_ADMIN';
  });

  // Company selector for super admins
  readonly companies = signal<CompanyOption[]>([]);
  readonly selectedCompanyId = signal<string>('');

  // State signals
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal<boolean>(false);

  readonly groups = signal<AccessGroupItem[]>([]);
  readonly availableCapabilities = signal<CapabilityItem[]>([]);

  // Search & Filter
  readonly searchQuery = signal<string>('');

  // Drawer states
  readonly isDrawerOpen = signal<boolean>(false);
  readonly editingGroupId = signal<string | null>(null);
  readonly drawerMode = computed<'create' | 'edit'>(() => (this.editingGroupId() ? 'edit' : 'create'));

  // Form Model
  readonly formName = signal<string>('');
  readonly formDescription = signal<string>('');
  readonly formIsActive = signal<boolean>(true);
  readonly selectedCapabilityIds = signal<Set<string>>(new Set());

  // Metrics
  readonly totalGroups = computed(() => this.groups().length);
  readonly systemGroupsCount = computed(() => this.groups().filter((g) => g.isSystem).length);
  readonly customGroupsCount = computed(() => this.groups().filter((g) => !g.isSystem).length);
  readonly activeGroupsCount = computed(() => this.groups().filter((g) => g.isActive).length);

  // Filtered Groups
  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.groups();
    return this.groups().filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  });

  // Group capabilities by Module -> Actions for organized checklist rendering
  readonly groupedCapabilities = computed(() => {
    const caps = this.availableCapabilities();
    const actionCaps = caps.filter((c) => c.type === 'ACTION');

    const moduleMap = new Map<string, { moduleName: string; actions: CapabilityItem[] }>();

    for (const action of actionCaps) {
      const parts = action.slug.split('.');
      const moduleKey = parts[0] || 'general';
      const moduleName = moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace(/_/g, ' ');

      if (!moduleMap.has(moduleKey)) {
        moduleMap.set(moduleKey, { moduleName, actions: [] });
      }
      moduleMap.get(moduleKey)!.actions.push(action);
    }

    return Array.from(moduleMap.entries()).map(([moduleKey, data]) => ({
      moduleKey,
      moduleName: data.moduleName,
      actions: data.actions.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  });

  constructor() {
    if (this.isSuperAdmin()) {
      this.loadCompanies();
    }
    this.loadData();
  }

  /** Returns companyId query params for super admin scoping */
  private companyQuery(): Record<string, string> | undefined {
    const cid = this.selectedCompanyId();
    return this.isSuperAdmin() && cid ? { companyId: cid } : undefined;
  }

  private loadCompanies(): void {
    this.api.get<CompanyOption[]>(API.companies).subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        this.companies.set(list);
      },
      error: () => this.companies.set([]),
    });
  }

  onCompanyChange(companyId: string): void {
    this.selectedCompanyId.set(companyId);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const query = this.companyQuery();
    this.api.get<AccessGroupItem[]>(API.accessGroups, query).subscribe({
      next: (res) => {
        this.groups.set(Array.isArray(res.data) ? res.data : []);
        this.loadAvailableCapabilities();
      },
      error: (err) => {
        this.error.set(apiError(err));
        this.loading.set(false);
      },
    });
  }

  private loadAvailableCapabilities(): void {
    const query = this.companyQuery();
    this.api.get<CapabilityItem[]>(API.availableCapabilities, query).subscribe({
      next: (res) => {
        this.availableCapabilities.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openCreateDrawer(): void {
    this.editingGroupId.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.formIsActive.set(true);
    this.selectedCapabilityIds.set(new Set());
    this.isDrawerOpen.set(true);
  }

  openEditDrawer(group: AccessGroupItem): void {
    this.editingGroupId.set(group.id);
    this.formName.set(group.name);
    this.formDescription.set(group.description || '');
    this.formIsActive.set(group.isActive);
    this.selectedCapabilityIds.set(new Set());

    // Fetch full group details with assigned permissions (scoped to company for super admins)
    const query = this.companyQuery();
    this.api.get<AccessGroupDetail>(API.accessGroup(group.id), query).subscribe({
      next: (res) => {
        if (res.data && res.data.permissions) {
          const capIds = new Set(res.data.permissions.map((p) => p.capabilityId));
          this.selectedCapabilityIds.set(capIds);
        }
        this.isDrawerOpen.set(true);
      },
      error: (err) => {
        this.toast.error(apiError(err));
      },
    });
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleCapability(capId: string): void {
    const current = new Set(this.selectedCapabilityIds());
    if (current.has(capId)) {
      current.delete(capId);
    } else {
      current.add(capId);
    }
    this.selectedCapabilityIds.set(current);
  }

  toggleModuleAll(actions: CapabilityItem[]): void {
    const current = new Set(this.selectedCapabilityIds());
    const allSelected = actions.every((a) => current.has(a.id));

    if (allSelected) {
      for (const a of actions) current.delete(a.id);
    } else {
      for (const a of actions) current.add(a.id);
    }
    this.selectedCapabilityIds.set(current);
  }

  isModuleAllSelected(actions: CapabilityItem[]): boolean {
    const current = this.selectedCapabilityIds();
    return actions.length > 0 && actions.every((a) => current.has(a.id));
  }

  isModulePartiallySelected(actions: CapabilityItem[]): boolean {
    const current = this.selectedCapabilityIds();
    const count = actions.filter((a) => current.has(a.id)).length;
    return count > 0 && count < actions.length;
  }

  saveGroup(): void {
    const name = this.formName().trim();
    if (!name) {
      this.toast.warning('Access Group name is required.');
      return;
    }

    const capabilityIds = Array.from(this.selectedCapabilityIds());
    if (capabilityIds.length === 0) {
      this.toast.warning('Please select at least one capability for this Access Group.');
      return;
    }

    if (this.isSuperAdmin() && !this.selectedCompanyId()) {
      this.toast.warning('Please select a company before saving.');
      return;
    }

    this.saving.set(true);

    const payload: Record<string, unknown> = {
      name,
      description: this.formDescription().trim() || undefined,
      isActive: this.formIsActive(),
      capabilityIds,
    };

    // Super admins include companyId in the payload for cross-tenant operations
    if (this.isSuperAdmin() && this.selectedCompanyId()) {
      payload['companyId'] = this.selectedCompanyId();
    }

    const isEdit = !!this.editingGroupId();
    const request$ = isEdit
      ? this.api.put(API.accessGroup(this.editingGroupId()!), payload)
      : this.api.post(API.accessGroups, payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          isEdit ? 'Access Group updated successfully.' : 'Access Group created successfully.'
        );
        this.closeDrawer();
        this.loadData();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiError(err));
      },
    });
  }

  async deleteGroup(group: AccessGroupItem): Promise<void> {
    if (group.isSystem) {
      this.toast.warning('Default system access groups cannot be deleted.');
      return;
    }

    const ok = await this.confirm.askDelete(
      'Access Group',
      group.name,
      `Users assigned exclusively to '${group.name}' will lose these permissions immediately upon deletion.`
    );

    if (!ok) return;

    const query = this.companyQuery();
    const url = API.accessGroup(group.id);
    const deleteUrl = query ? `${url}?companyId=${query['companyId']}` : url;
    this.api.delete(deleteUrl).subscribe({
      next: () => {
        this.toast.success('Access Group deleted successfully.');
        this.loadData();
      },
      error: (err) => {
        this.toast.error(apiError(err));
      },
    });
  }
}
