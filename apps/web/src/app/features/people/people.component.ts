import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiService, apiError, fieldErrors } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PulseService } from '../../core/services/pulse.service';
import { CAN, ROLE_LABEL, Role, hasRole, outranks, roleLabel } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import { AttendancePolicy, AttendanceRecord, Company, Person, PersonTimelineEvent, directReports } from '../../core/models/domain';
import { clock, duration, titleCase } from '../../core/utils/format';

import { NetroIcon, IconName } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeletonRows, NetroState, NetroStatus, Tone } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroPager, NetroTimeline, TimelineEvent } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroFilterSelect, NetroSortIcon, NetroToolbar, SortState } from '../../ui/toolbar';

type SortKey = 'name' | 'role' | 'manager' | 'status' | 'shift';

export const DESIGNATION_PRESETS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Sales Executive',
  'Operations Manager',
  'Field Agent',
  'HR Executive',
  'Technical Lead',
] as const;

/** How each recorded change to a person's record is presented in the timeline. */
const TIMELINE_STYLE: Record<string, { icon: IconName; tone: Tone }> = {
  ONBOARDING: { icon: 'user-plus', tone: 'info' },
  PROMOTION: { icon: 'arrow-up-right', tone: 'ok' },
  DESIGNATION_ASSIGNED: { icon: 'briefcase', tone: 'neutral' },
  DESIGNATION_CHANGED: { icon: 'briefcase', tone: 'neutral' },
  ACCESS_ROLE_ASSIGNED: { icon: 'shield', tone: 'neutral' },
  ACCESS_ROLE_CHANGED: { icon: 'shield', tone: 'warn' },
  MANAGER_ASSIGNED: { icon: 'hierarchy', tone: 'neutral' },
  MANAGER_CHANGED: { icon: 'hierarchy', tone: 'warn' },
  ATTENDANCE_POLICY_CHANGED: { icon: 'policy', tone: 'neutral' },
  DEACTIVATION: { icon: 'lock', tone: 'risk' },
  REACTIVATION: { icon: 'check-circle', tone: 'ok' },
};

export const ROLE_RANK_MAP: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  HR: 2,
  COMPANY_ADMIN: 3,
  SUPER_ADMIN: 4,
  MASTER_SUPER_ADMIN: 5,
};

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroPager,
    NetroTimeline,
    NetroToolbar,
    NetroFilterSelect,
    NetroSortIcon,
    NetroAvatar,
    NetroBadge,
    NetroStatus,
    NetroState,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people.component.html',
  styleUrl: './people.component.css',
})
export class PeopleComponent {
  readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly pulse = inject(PulseService);
  private readonly router = inject(Router);

  readonly designationPresets = DESIGNATION_PRESETS;
  readonly people = signal<Person[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly search = signal('');
  readonly roleFilter = signal('');
  readonly statusFilter = signal('');

  readonly sort = new SortState<SortKey>('name');

  /** Person open in the workspace drawer. */
  readonly viewing = signal<Person | null>(null);
  readonly history = signal<PersonTimelineEvent[]>([]);
  readonly historyLoading = signal(false);

  /** Add / edit state. */
  readonly editorOpen = signal(false);
  readonly editing = signal<Person | null>(null);
  readonly supervisors = signal<Person[]>([]);
  readonly policies = signal<AttendancePolicy[]>([]);
  readonly branches = signal<any[]>([]);
  readonly departments = signal<any[]>([]);
  readonly companies = signal<Company[]>([]);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly actorRole = this.api.role;
  readonly isSuperAdmin = computed(() => this.actorRole() === 'SUPER_ADMIN' || this.actorRole() === 'MASTER_SUPER_ADMIN');

  /** `PUT /users/:id` and deactivation are HR and above. */
  readonly canEdit = computed(() => hasRole(this.actorRole(), CAN.editWorkforce));
  /** `POST /users` is allowed for HR and above (managers cannot create employees). */
  readonly canCreate = computed(() => hasRole(this.actorRole(), CAN.editWorkforce));

  readonly roleOptions = computed(() =>
    (['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as Role[])
      .filter(r => this.actorRole() === 'MASTER_SUPER_ADMIN' || !outranks(r, this.actorRole()))
      .map(r => ({ value: r, label: ROLE_LABEL[r] })),
  );

  readonly statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Deactivated' },
  ];

  readonly directReports = directReports;

  /** Selected company signal for target tenant detection. */
  readonly selectedCompanyId = signal<string>('');
  readonly selectedCompany = computed(() => {
    const id = this.selectedCompanyId();
    if (!id) return this.companies()[0] || null;
    return this.companies().find(c => c.id === id) || null;
  });

  readonly isPlatformCompany = computed(() => {
    const c = this.selectedCompany();
    if (c) return c.code === 'NETRO' || c.name.toLowerCase().includes('netro');
    const userCompany = this.api.user()?.companyName || '';
    return userCompany.toLowerCase().includes('netro') || !this.isSuperAdmin();
  });

  /** Mirrors `canCreateRole` on the API, so the picker never offers a 403. */
  readonly creatableRoles = computed<Role[]>(() => {
    switch (this.actorRole()) {
      case 'MASTER_SUPER_ADMIN':
        return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
      case 'SUPER_ADMIN':
        return ['COMPANY_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
      case 'COMPANY_ADMIN':
        return ['HR', 'MANAGER', 'EMPLOYEE'];
      case 'HR':
        return ['MANAGER', 'EMPLOYEE'];
      case 'MANAGER':
        return ['EMPLOYEE'];
      default:
        return [];
    }
  });

  /** Super Admin & Master Super Admin are ONLY allowed for the platform company (NetroTrack). */
  readonly displayedRoles = computed<Role[]>(() => {
    const roles = this.creatableRoles();
    if (!this.isPlatformCompany()) {
      return roles.filter(r => r !== 'SUPER_ADMIN' && r !== 'MASTER_SUPER_ADMIN');
    }
    return roles;
  });

  readonly targetRole = signal<Role>('EMPLOYEE');

  readonly isCompanyGpsDisabled = computed(() => {
    const c = this.selectedCompany();
    if (!c || !c.modules) return false;
    return !c.modules.some((m: any) => (m.module === 'GPS' || m.code === 'GPS') && m.isEnabled);
  });

  readonly canToggleGps = computed(() => {
    if (this.isCompanyGpsDisabled()) return false;
    const actorRole = this.actorRole();
    if (!actorRole) return false;
    const actorRank = ROLE_RANK_MAP[actorRole] ?? 0;
    const targetRank = ROLE_RANK_MAP[this.targetRole()] ?? 0;
    return actorRank > targetRank;
  });

  readonly needsSupervisor = computed(() => {
    const role = this.targetRole();
    return role === 'EMPLOYEE' || role === 'MANAGER' || role === 'HR';
  });

  readonly isManagerActor = computed(() => this.actorRole() === 'MANAGER');

  readonly canChangeRoleInEdit = computed(() => {
    const target = this.editing();
    if (!target) return true;
    const actorRole = this.actorRole();
    if (!actorRole) return false;
    const actorRank = ROLE_RANK_MAP[actorRole] ?? 0;
    const targetRank = ROLE_RANK_MAP[target.role] ?? 0;
    return actorRank > targetRank;
  });

  readonly isDesignationChanged = signal(false);

  readonly form = this.fb.nonNullable.group({
    companyId: [''],
    employeeId: ['', []],
    departmentId: ['', []],
    branchId: ['', []],
    managerId: ['', []],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    password: [''],
    role: ['EMPLOYEE' as Role, [Validators.required]],
    designationName: ['', [Validators.required]],
    isPromotion: [false],
    emergencyContactName: ['', [Validators.required]],
    emergencyContactPhone: ['', [Validators.required]],
    attendancePolicyId: [''],
    personalEmail: [''],
    secondaryPhone: [''],
    linkedinUrl: [''],
    twitterUrl: [''],
    bloodGroup: [''],
    isGpsTracked: [true],
  });

  /** Reassign Manager Workflow signals. */
  readonly reassignOpen = signal(false);
  readonly reassignTarget = signal<Person | null>(null);
  readonly reassignStrategy = signal<'move-to-unassigned' | 'move-to-manager'>('move-to-unassigned');
  readonly replacementManagerId = signal('');
  readonly reassigning = signal(false);

  readonly candidateManagers = computed(() => {
    const target = this.reassignTarget();
    return this.people().filter(p => (p.role === 'MANAGER' || p.role === 'HR' || p.role === 'COMPANY_ADMIN') && p.id !== target?.id && p.status !== 'INACTIVE');
  });

  /** Today's punch per person, so the directory and the roster never disagree. */
  private readonly shiftByUser = computed(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of this.pulse.state().roster) map.set(record.userId, record);
    return map;
  });

  readonly rows = computed(() =>
    this.sort.apply(this.people(), (person, key) => {
      switch (key) {
        case 'name':
          return person.name;
        case 'role':
          return person.role;
        case 'manager':
          return person.managerName ?? person.manager?.name ?? '';
        case 'status':
          return person.status ?? '';
        case 'shift':
          return this.shiftByUser().get(person.id)?.punchInTime ?? '';
      }
    }),
  );

  readonly activeFilters = computed(
    () => [this.search(), this.roleFilter(), this.statusFilter()].filter(Boolean).length,
  );

  /** The recorded history, rendered in the shared timeline vocabulary. */
  readonly historyEvents = computed<TimelineEvent[]>(() =>
    this.history().map(event => {
      const style = TIMELINE_STYLE[event.eventType] ?? { icon: 'note' as IconName, tone: 'neutral' as Tone };
      return {
        title: event.title || titleCase(event.eventType),
        meta: [
          new Date(event.effectiveDate || event.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          event.changedByName ? `by ${event.changedByName}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        note: this.changeNote(event),
        icon: style.icon,
        tone: style.tone,
      };
    }),
  );

  constructor() {
    this.load();
    this.loadPolicies();
    this.loadBranches();
    this.loadDepartments();
    if (this.isSuperAdmin()) this.loadCompanies();
    this.setupPolicySync();
  }

  private setupPolicySync(): void {
    this.form.controls.attendancePolicyId.valueChanges.subscribe(policyId => {
      if (!policyId) return;
      const policy = this.policies().find(p => p.id === policyId);
      if (policy) {
        const inGps = policy.punchInConfig?.gps;
        const outGps = policy.punchOutConfig?.gps;
        if (inGps === 'REQUIRED' || inGps === 'OPTIONAL' || outGps === 'REQUIRED' || outGps === 'OPTIONAL') {
          if (!this.isCompanyGpsDisabled() && this.canToggleGps()) {
            this.form.controls.isGpsTracked.setValue(true);
          }
        }
      }
    });

    this.form.controls.role.valueChanges.subscribe(role => {
      this.targetRole.set(role);
      // Auto-assign manager if actor is Manager
      if (this.isManagerActor()) {
        this.form.controls.managerId.setValue(this.api.user()?.id || '');
      }
    });

    this.form.controls.companyId.valueChanges.subscribe(cid => {
      this.selectedCompanyId.set(cid);
    });

    this.form.controls.designationName.valueChanges.subscribe(val => {
      const original = this.editing()?.designationName ?? this.editing()?.designation?.name ?? '';
      this.isDesignationChanged.set(this.editing() !== null && val.trim() !== original.trim());
    });
  }

  loadPolicies(companyId?: string): void {
    const params: Record<string, string> = { type: 'ATTENDANCE' };
    if (companyId) params['companyId'] = companyId;
    this.api.get<AttendancePolicy[]>(API.policies, params).subscribe({
      next: res => this.policies.set(Array.isArray(res.data) ? res.data : []),
    });
  }

  loadCompanies(): void {
    this.api.get<Company[]>(API.companies).subscribe({
      next: res => this.companies.set(Array.isArray(res.data) ? res.data : []),
    });
  }

  loadBranches(companyId?: string): void {
    const params: Record<string, string> = {};
    if (companyId) params['companyId'] = companyId;
    this.api.get<any[]>(API.BRANCHES, params).subscribe({
      next: res => {
        const data = (res as any)?.data ? (res as any).data : (Array.isArray(res) ? res : []);
        this.branches.set(data);
      },
    });
  }

  loadDepartments(companyId?: string): void {
    const params: Record<string, string> = {};
    if (companyId) params['companyId'] = companyId;
    this.api.get<any[]>('/api/v1/departments', params).subscribe({
      next: res => {
        const data = (res as any)?.data ? (res as any).data : (Array.isArray(res) ? res : []);
        this.departments.set(data);
      },
    });
  }

  loadManagers(companyId?: string): void {
    const params: Record<string, string> = {};
    if (companyId) params['companyId'] = companyId;
    this.api.get<Person[]>(API.workforceSupervisors, params).subscribe({
      next: res => this.supervisors.set(Array.isArray(res) ? res : []),
    });
  }

  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  setDesignation(preset: string): void {
    this.form.controls.designationName.setValue(preset);
  }

  setBloodGroup(bg: string): void {
    const current = this.form.controls.bloodGroup.value;
    this.form.controls.bloodGroup.setValue(current === bg ? '' : bg);
  }

  // ---- Data ---------------------------------------------------------------

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .get<Person[]>(API.workforce, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search() || undefined,
        role: this.roleFilter() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: res => {
          this.people.set(Array.isArray(res.data) ? res.data : []);
          this.total.set(res.pagination?.totalItems ?? res.data?.length ?? 0);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(apiError(err, 'Could not load the workforce directory.'));
          this.loading.set(false);
        },
      });
  }

  /** Search and filters reset paging — page 4 of a different query is noise. */
  applySearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  applyRole(value: string): void {
    this.roleFilter.set(value);
    this.page.set(1);
    this.load();
  }

  applyStatus(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  // ---- Workspace ----------------------------------------------------------

  view(person: Person): void {
    this.viewing.set(person);
    this.history.set([]);
    this.historyLoading.set(true);
    this.api.list<PersonTimelineEvent>(API.personTimeline(person.id)).subscribe(entries => {
      this.history.set(entries);
      this.historyLoading.set(false);
    });
  }

  closeView(): void {
    this.viewing.set(null);
  }

  viewShiftHistory(person: Person): void {
    this.closeView();
    this.router.navigate(['/attendance']);
  }

  policyNameOf(person: Person): string {
    if (!person.attendancePolicyId) return 'Company Default Policy';
    const match = this.policies().find(p => p.id === person.attendancePolicyId);
    return match?.name || 'Assigned Policy';
  }

  companyNameOf(person: Person | null): string {
    if (!person || !person.company) return '—';
    return `${person.company.name} [${person.company.code || ''}]`;
  }

  // ---- Create / edit ------------------------------------------------------

  startCreate(): void {
    const compId = this.isSuperAdmin() ? (this.companies()[0]?.id || '') : (this.api.user()?.companyId || '');
    this.selectedCompanyId.set(compId);
    this.editing.set(null);
    this.serverErrors.set({});
    this.isDesignationChanged.set(false);

    const roles = this.displayedRoles();
    const defaultRole: Role = this.isManagerActor() ? 'EMPLOYEE' : (roles[roles.length - 1] ?? 'EMPLOYEE');
    this.targetRole.set(defaultRole);

    const defaultManagerId = this.isManagerActor() ? (this.api.user()?.id || '') : '';

    this.form.reset({
      companyId: compId,
      employeeId: '',
      departmentId: '',
      branchId: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      role: defaultRole,
      designationName: '',
      isPromotion: false,
      emergencyContactName: '',
      emergencyContactPhone: '',
      attendancePolicyId: '',
      managerId: defaultManagerId,
      personalEmail: '',
      secondaryPhone: '',
      linkedinUrl: '',
      twitterUrl: '',
      bloodGroup: '',
      isGpsTracked: !this.isCompanyGpsDisabled(),
    });

    this.form.controls.employeeId.enable();
    this.loadManagers(compId);
    this.loadPolicies(compId);
    this.loadBranches(compId);
    this.loadDepartments(compId);
    this.editorOpen.set(true);
  }

  startEdit(person: Person): void {
    this.editing.set(person);
    this.selectedCompanyId.set(person.companyId || this.api.user()?.companyId || '');
    this.serverErrors.set({});
    this.isDesignationChanged.set(false);
    this.targetRole.set(person.role);

    this.form.reset({
      companyId: person.companyId || '',
      employeeId: person.employeeId ?? '',
      departmentId: (person as any).departmentId || '',
      branchId: (person as any).branchId ?? '',
      name: person.name,
      email: person.email ?? '',
      phone: person.phone ?? '',
      password: '',
      role: person.role,
      designationName: person.designationName ?? person.designation?.name ?? '',
      isPromotion: false,
      emergencyContactName: person.emergencyContactName ?? '',
      emergencyContactPhone: person.emergencyContactPhone ?? '',
      attendancePolicyId: person.attendancePolicyId ?? '',
      managerId: person.managerId ?? '',
      personalEmail: person.personalEmail ?? '',
      secondaryPhone: person.secondaryPhone ?? '',
      linkedinUrl: person.linkedinUrl ?? '',
      twitterUrl: person.twitterUrl ?? '',
      bloodGroup: person.bloodGroup ?? '',
      isGpsTracked: person.isGpsTracked ?? true,
    });

    // Employee ID is the sign-in identifier and is immutable after creation.
    this.form.controls.employeeId.disable();
    
    if (this.canEdit()) {
      const targetCompanyId = person.companyId;
      this.loadManagers(targetCompanyId);
      this.loadPolicies(targetCompanyId);
      this.loadBranches(targetCompanyId);
      this.loadDepartments(targetCompanyId);
    }
    
    this.editorOpen.set(true);
    this.closeView();
  }

  onCompanyChange(): void {
    const companyId = this.form.controls.companyId.value;
    this.selectedCompanyId.set(companyId);

    // Auto-switch role if current role is not allowed for tenant company
    const curRole = this.form.controls.role.value;
    if (!this.isPlatformCompany() && (curRole === 'SUPER_ADMIN' || curRole === 'MASTER_SUPER_ADMIN')) {
      const fallback = this.displayedRoles()[0] || 'COMPANY_ADMIN';
      this.form.controls.role.setValue(fallback);
    }

    if (this.isCompanyGpsDisabled()) {
      this.form.controls.isGpsTracked.setValue(false);
    }

    this.loadManagers(companyId);
    this.loadPolicies(companyId);
    this.loadBranches(companyId);
    this.loadDepartments(companyId);
  }

  onRoleChange(): void {
    const role = this.form.controls.role.value;
    this.targetRole.set(role);

    if (this.isManagerActor()) {
      this.form.controls.managerId.setValue(this.api.user()?.id || '');
    } else {
      this.form.controls.managerId.setValue('');
    }

    this.loadSupervisors(role, this.editing()?.id);
  }

  private loadSupervisors(targetRole: Role, excludeUserId?: string): void {
    const companyId = this.isSuperAdmin() ? (this.form.controls.companyId.value || undefined) : undefined;
    this.api
      .list<Person>(API.workforceSupervisors, { targetRole, excludeUserId, companyId })
      .subscribe(list => this.supervisors.set(list));
  }

  /** Typed-but-unsaved work is never discarded silently. */
  async closeEditor(): Promise<void> {
    if (this.form.dirty) {
      const discard = await this.confirm.ask({
        title: 'Discard your changes?',
        body: 'This form has edits that have not been saved.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!discard) return;
    }
    this.form.markAsPristine();
    this.editorOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Some details are missing', 'The fields marked in red still need a value.');
      return;
    }

    const raw = this.form.getRawValue();
    const target = this.editing();

    let finalManagerId = raw.managerId || null;
    if (this.isManagerActor()) {
      finalManagerId = this.api.user()?.id || finalManagerId;
    }
    if (!this.needsSupervisor()) {
      finalManagerId = null;
    }

    const common: Record<string, any> = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      role: raw.role,
      designationName: raw.designationName.trim(),
      emergencyContactName: raw.emergencyContactName.trim(),
      emergencyContactPhone: raw.emergencyContactPhone.trim(),
      attendancePolicyId: raw.attendancePolicyId || null,
      branchId: raw.branchId || null,
      companyId: this.isSuperAdmin() ? (raw.companyId || null) : undefined,
      managerId: finalManagerId,
      personalEmail: raw.personalEmail.trim() || null,
      secondaryPhone: raw.secondaryPhone.trim() || null,
      linkedinUrl: raw.linkedinUrl.trim() || null,
      twitterUrl: raw.twitterUrl.trim() || null,
      bloodGroup: raw.bloodGroup.trim() || null,
      isGpsTracked: this.isCompanyGpsDisabled() ? false : raw.isGpsTracked,
    };

    if (raw.password && raw.password.trim().length >= 6) {
      common['password'] = raw.password.trim();
    }

    if (target && this.isDesignationChanged()) {
      common['isPromotion'] = raw.isPromotion;
    }

    this.saving.set(true);
    this.serverErrors.set({});

    const request = target
      ? this.api.put(API.person(target.id), common)
      : this.api.post(API.workforce, { ...common, employeeId: raw.employeeId.trim() });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.form.markAsPristine();
        this.toast.success(
          target ? 'Details updated' : 'Person added',
          target
            ? `${raw.name}'s record has been saved.`
            : `${raw.name} can now sign in with employee ID ${raw.employeeId}.`,
        );
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(err));
        this.toast.error(target ? 'Could not save changes' : 'Could not add this person', apiError(err));
      },
    });
  }

  async resetCredentials(person: Person): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Confirm Credentials Reset',
      body: `Are you sure you want to reset password to "Password123!" and clear MPIN for ${person.name} (${person.employeeId || person.email})?`,
      confirmLabel: 'Reset to Default',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;

    this.api.post<{ message?: string }>(API.personResetCredentials(person.id), {}).subscribe({
      next: res => {
        this.toast.success('Credentials Reset', res.message || `Password reset to Password123! and MPIN cleared for ${person.name}.`);
        this.load();
      },
      error: err => {
        this.toast.error('Failed to reset credentials', apiError(err));
      },
    });
  }

  // ---- Manager Reassignment Workflow --------------------------------------

  openReassign(person: Person): void {
    this.reassignTarget.set(person);
    this.reassignStrategy.set('move-to-unassigned');
    this.replacementManagerId.set('');
    this.reassignOpen.set(true);
  }

  closeReassign(): void {
    this.reassignOpen.set(false);
    this.reassignTarget.set(null);
  }

  submitReassign(): void {
    const target = this.reassignTarget();
    if (!target) return;
    const strategy = this.reassignStrategy();
    const targetManagerId = this.replacementManagerId();

    if (strategy === 'move-to-manager' && !targetManagerId) {
      this.toast.warning('Replacement manager required', 'Please select a replacement manager for the direct reports.');
      return;
    }

    this.reassigning.set(true);
    this.api
      .post(API.personRemoveManager(target.id), {
        strategy,
        targetManagerId: strategy === 'move-to-manager' ? targetManagerId : undefined,
      })
      .subscribe({
        next: () => {
          this.reassigning.set(false);
          this.closeReassign();
          this.toast.success('Direct reports reassigned', `Subordinates of ${target.name} have been updated.`);
          this.load();
        },
        error: err => {
          this.reassigning.set(false);
          this.toast.error('Could not reassign direct reports', apiError(err));
        },
      });
  }

  // ---- Lifecycle actions --------------------------------------------------

  async toggleActive(person: Person): Promise<void> {
    const deactivating = person.status !== 'INACTIVE';
    const reports = directReports(person);

    if (deactivating && reports > 0) {
      this.openReassign(person);
      return;
    }

    const ok = await this.confirm.ask({
      title: deactivating ? `Deactivate ${person.name}?` : `Reactivate ${person.name}?`,
      body: deactivating
        ? 'They will be signed out and blocked from signing in. Attendance, visits and orders already recorded are kept.'
        : 'They will be able to sign in again with their existing credentials.',
      confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
      tone: deactivating ? 'danger' : 'default',
      facts: [
        { label: 'Employee ID', value: person.employeeId || '—' },
        { label: 'Role', value: roleLabel(person.role) },
      ],
    });
    if (!ok) return;

    const endpoint = deactivating ? API.personDeactivate(person.id) : API.personActivate(person.id);
    this.api.post(endpoint).subscribe({
      next: () => {
        this.toast.success(
          deactivating ? 'Access removed' : 'Access restored',
          `${person.name} is now ${deactivating ? 'deactivated' : 'active'}.`,
        );
        this.closeView();
        this.load();
      },
      error: err => this.toast.error('Could not change access', apiError(err)),
    });
  }

  // ---- Presentation -------------------------------------------------------

  shiftFor(person: Person): AttendanceRecord | undefined {
    return this.shiftByUser().get(person.id);
  }

  onDuty(person: Person): boolean {
    const record = this.shiftFor(person);
    return !!record && !record.punchOutTime;
  }

  shiftLabel(person: Person): string {
    const record = this.shiftFor(person);
    if (!record) return 'No punch today';
    return `${record.punchOutTime ? 'Shift closed' : 'On duty'} · ${this.shiftDuration(person)}`;
  }

  shiftDuration(person: Person): string {
    const record = this.shiftFor(person);
    if (!record) return '—';
    return duration(record.punchInTime, record.punchOutTime);
  }

  shiftTone(person: Person): Tone {
    const record = this.shiftFor(person);
    if (!record) return 'warn';
    return record.punchOutTime ? 'neutral' : 'ok';
  }

  punchedAt(person: Person): string | null {
    const record = this.shiftFor(person);
    return record ? clock(record.punchInTime) : null;
  }

  reportsFor(person: Person): number {
    return directReports(person);
  }

  designationOf(person: Person): string {
    return person.designationName || person.designation?.name || '—';
  }

  managerOf(person: Person): string {
    return person.managerName || person.manager?.name || 'Unassigned';
  }

  label(role: string): string {
    return roleLabel(role);
  }

  /** HR and above may edit and deactivate anyone they outrank, except themselves. */
  canActOn(person: Person): boolean {
    if (!this.canEdit()) return false;
    if (person.id === this.api.user()?.id) return false;
    return this.actorRole() === 'MASTER_SUPER_ADMIN' || outranks(this.actorRole(), person.role);
  }

  /** Credential resets and reactivation reach one rung further down, to managers. */
  canResetFor(person: Person): boolean {
    if (!this.canCreate()) return false;
    if (person.id === this.api.user()?.id) return false;
    return this.actorRole() === 'MASTER_SUPER_ADMIN' || outranks(this.actorRole(), person.role);
  }

  errorFor(control: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[control as string];
    if (server) return server;
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return null;
    if (field.hasError('required')) return 'This is required.';
    if (field.hasError('email')) return 'Enter a valid email address.';
    if (field.hasError('minlength')) return 'This is too short.';
    return 'Check this value.';
  }

  /** "Manager → Company Admin" reads faster than two separate fields. */
  private changeNote(event: PersonTimelineEvent): string | null {
    if (event.previousValue && event.newValue) return `${event.previousValue} → ${event.newValue}`;
    if (event.newValue) return event.newValue;
    return event.description || null;
  }
}
