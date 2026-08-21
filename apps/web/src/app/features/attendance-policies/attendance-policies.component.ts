import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';
import {
  Policy,
  PolicyType,
  PolicyTargetType,
  POLICY_TYPE_LABELS,
  CustomFieldDefinition,
  DEFAULT_PUNCH_CONFIG,
  DEFAULT_REGULARIZATION_CONFIG,
  DEFAULT_LEAVE_CONFIG,
  DEFAULT_EXPENSE_CONFIG,
  DEFAULT_TRACKING_CONFIG,
  DEFAULT_VISIT_CONFIG,
  DEFAULT_INSPECTION_CONFIG,
  PUNCH_COMPONENTS,
  Person,
  PolicyAssignments,
  PunchComponentStatus,
  PunchConfig,
  RegularizationConfig,
  LeavePolicyConfig,
  ExpensePolicyConfig,
  TrackingPolicyConfig,
  VisitPolicyConfig,
  InspectionPolicyConfig,
  clonePunch,
  cloneRegularization,
  punchEnabled,
} from '../../core/models/domain';

import { NetroIcon } from '../../ui/icon';
import { NetroAlert, NetroBadge, NetroSkeletonRows, NetroState, Tone } from '../../ui/primitives';
import { NetroMetric, NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

type TargetType = PolicyTargetType;

interface NamedTarget {
  id: string;
  name: string;
}

interface PolicyDraft {
  type: PolicyType;
  name: string;
  description: string;
  isActive: boolean;
  config: Record<string, unknown>;
  punchInConfig: PunchConfig;
  punchOutConfig: PunchConfig;
  regularizationConfig: RegularizationConfig;
  leaveConfig: LeavePolicyConfig;
  expenseConfig: ExpensePolicyConfig;
  trackingConfig: TrackingPolicyConfig;
  visitConfig: VisitPolicyConfig;
  inspectionConfig: InspectionPolicyConfig;
}

const STATUSES: Array<{ value: PunchComponentStatus; label: string }> = [
  { value: 'DISABLED', label: 'Off' },
  { value: 'OPTIONAL', label: 'Optional' },
  { value: 'REQUIRED', label: 'Required' },
];

function emptyDraft(type: PolicyType = 'ATTENDANCE'): PolicyDraft {
  return {
    type,
    name: '',
    description: '',
    isActive: true,
    config: {},
    punchInConfig: clonePunch(DEFAULT_PUNCH_CONFIG),
    punchOutConfig: clonePunch(DEFAULT_PUNCH_CONFIG),
    regularizationConfig: cloneRegularization(DEFAULT_REGULARIZATION_CONFIG),
    leaveConfig: { ...DEFAULT_LEAVE_CONFIG },
    expenseConfig: { ...DEFAULT_EXPENSE_CONFIG },
    trackingConfig: { ...DEFAULT_TRACKING_CONFIG },
    visitConfig: { ...DEFAULT_VISIT_CONFIG },
    inspectionConfig: { ...DEFAULT_INSPECTION_CONFIG },
  };
}

function draftFrom(policy: Policy): PolicyDraft {
  const cfg = (policy.config || {}) as Record<string, unknown>;
  return {
    type: policy.type || 'ATTENDANCE',
    name: policy.name,
    description: policy.description ?? '',
    isActive: policy.isActive,
    config: cfg,
    punchInConfig: clonePunch(policy.punchInConfig || (cfg['punchInConfig'] as PunchConfig)),
    punchOutConfig: clonePunch(policy.punchOutConfig || (cfg['punchOutConfig'] as PunchConfig)),
    regularizationConfig: cloneRegularization(policy.regularizationConfig || (cfg['regularizationConfig'] as RegularizationConfig)),
    leaveConfig: { ...DEFAULT_LEAVE_CONFIG, ...(cfg as unknown as LeavePolicyConfig) },
    expenseConfig: { ...DEFAULT_EXPENSE_CONFIG, ...(cfg as unknown as ExpensePolicyConfig) },
    trackingConfig: { ...DEFAULT_TRACKING_CONFIG, ...(cfg as unknown as TrackingPolicyConfig) },
    visitConfig: { ...DEFAULT_VISIT_CONFIG, ...(cfg as unknown as VisitPolicyConfig) },
    inspectionConfig: { ...DEFAULT_INSPECTION_CONFIG, ...(cfg as unknown as InspectionPolicyConfig) },
  };
}

@Component({
  selector: 'app-attendance-policies',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroMetric,
    NetroToolbar,
    NetroBadge,
    NetroState,
    NetroAlert,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance-policies.component.html',
  styleUrl: './attendance-policies.component.css',
})
export class AttendancePoliciesComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly components = PUNCH_COMPONENTS;
  readonly statuses = STATUSES;
  readonly typeLabels = POLICY_TYPE_LABELS;

  readonly policyTypes: Array<{ type: PolicyType | 'ALL'; label: string; icon: string }> = [
    { type: 'ALL', label: 'All Policies', icon: 'layers' },
    { type: 'ATTENDANCE', label: 'Attendance', icon: 'clock' },
    { type: 'LEAVE', label: 'Leave', icon: 'calendar' },
    { type: 'EXPENSE', label: 'Expense', icon: 'dollar' },
    { type: 'TRACKING', label: 'GPS Tracking', icon: 'navigation' },
    { type: 'VISIT', label: 'Visits', icon: 'briefcase' },
    { type: 'INSPECTION', label: 'Inspections', icon: 'clipboard' },
  ];

  readonly selectedTypeFilter = signal<PolicyType | 'ALL'>('ALL');

  readonly policies = signal<Policy[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly defaultPolicyId = signal<string | null>(null);

  readonly viewing = signal<Policy | null>(null);
  readonly assignments = signal<PolicyAssignments | null>(null);
  readonly assignmentsLoading = signal(false);

  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly draft = signal<PolicyDraft>(emptyDraft());
  readonly saving = signal(false);
  readonly customDraft = signal({ label: '', type: 'TEXT' as 'TEXT' | 'NUMBER', status: 'OPTIONAL' as PunchComponentStatus });
  readonly customSide = signal<'in' | 'out'>('in');

  readonly assignOpen = signal(false);
  readonly assignTargetType = signal<TargetType>('COMPANY');
  readonly assignTargetId = signal('');
  readonly assignTargets = signal<NamedTarget[]>([]);
  readonly assigning = signal(false);

  readonly people = signal<Person[]>([]);

  readonly filteredPolicies = computed(() => {
    const list = this.policies();
    const type = this.selectedTypeFilter();
    if (type === 'ALL') return list;
    return list.filter(p => p.type === type);
  });

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.filteredPolicies();
    if (!q) return list;
    return list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.type ?? '').toLowerCase().includes(q)
    );
  });

  readonly activeCount = computed(() => this.filteredPolicies().filter(p => p.isActive).length);

  constructor() {
    this.load();
    this.loadCompanyDefault();
    this.loadPeople();
  }

  // ---- Data ---------------------------------------------------------------

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Policy[]>(API.policies).subscribe({
      next: res => {
        this.policies.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
        const open = this.viewing();
        if (open) {
          const fresh = (res.data ?? []).find(p => p.id === open.id);
          if (fresh) this.viewing.set(fresh);
        }
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load policies.'));
        this.loading.set(false);
      },
    });
  }

  setTypeFilter(type: PolicyType | 'ALL'): void {
    this.selectedTypeFilter.set(type);
  }

  private loadCompanyDefault(): void {
    const companyId = this.api.user()?.company?.id;
    if (!companyId) return;
    this.api.one<{ defaultAttendancePolicyId?: string }>(API.company(companyId)).subscribe(company => {
      this.defaultPolicyId.set(company?.defaultAttendancePolicyId ?? null);
    });
  }

  private loadPeople(): void {
    this.api.get<Person[]>(API.workforce, { page: 1, pageSize: 100, status: 'ACTIVE' }).subscribe({
      next: res => this.people.set(Array.isArray(res.data) ? res.data : []),
      error: () => this.people.set([]),
    });
  }

  applySearch(value: string): void {
    this.search.set(value);
  }

  // ---- Workspace ----------------------------------------------------------

  view(policy: Policy): void {
    this.viewing.set(policy);
    this.assignments.set(null);
    this.assignmentsLoading.set(true);
    this.api.get<PolicyAssignments>(API.policyAssignments(policy.id)).subscribe({
      next: res => {
        this.assignments.set(res.data ?? null);
        this.assignmentsLoading.set(false);
      },
      error: () => {
        this.assignments.set(null);
        this.assignmentsLoading.set(false);
      },
    });
  }

  closeView(): void {
    this.viewing.set(null);
  }

  isDefault(policy: Policy): boolean {
    return this.defaultPolicyId() === policy.id;
  }

  inReqs(policy: Policy) {
    return punchEnabled(policy.punchInConfig || (policy.config?.['punchInConfig'] as PunchConfig));
  }

  outReqs(policy: Policy) {
    return punchEnabled(policy.punchOutConfig || (policy.config?.['punchOutConfig'] as PunchConfig));
  }

  pillTone(status: PunchComponentStatus): Tone {
    return status === 'REQUIRED' ? 'risk' : 'info';
  }

  policySummary(policy: Policy): string {
    const type = policy.type || 'ATTENDANCE';
    const cfg = (policy.config || {}) as Record<string, unknown>;

    switch (type) {
      case 'ATTENDANCE':
        const rules = cloneRegularization(policy.regularizationConfig || (cfg['regularizationConfig'] as RegularizationConfig));
        if (!rules.allowRegularization) return 'Corrections disabled';
        return `Regularization: ${rules.maxRequestsPerMonth}/mo · ${rules.regularizationWindowDays}-day window`;

      case 'LEAVE':
        const leave = { ...DEFAULT_LEAVE_CONFIG, ...(cfg as unknown as LeavePolicyConfig) };
        return `Quotas: ${leave.annualLeaveQuota} AL · ${leave.sickLeaveQuota} SL · ${leave.casualLeaveQuota} CL`;

      case 'EXPENSE':
        const exp = { ...DEFAULT_EXPENSE_CONFIG, ...(cfg as unknown as ExpensePolicyConfig) };
        return `Daily ceiling: $${exp.maxDailyClaim} · Mileage: $${exp.mileageRatePerKm}/km`;

      case 'TRACKING':
        const trk = { ...DEFAULT_TRACKING_CONFIG, ...(cfg as unknown as TrackingPolicyConfig) };
        return `Sync interval: ${trk.trackingIntervalSeconds}s · Geofence: ${trk.geofenceRadiusMeters}m`;

      case 'VISIT':
        const vst = { ...DEFAULT_VISIT_CONFIG, ...(cfg as unknown as VisitPolicyConfig) };
        return `Proximity: ${vst.maxAllowedDistanceMeters}m · Min: ${vst.minVisitDurationMinutes} mins`;

      case 'INSPECTION':
        const insp = { ...DEFAULT_INSPECTION_CONFIG, ...(cfg as unknown as InspectionPolicyConfig) };
        return `Min photos: ${insp.minPhotosRequired} · Pass score: ${insp.passThresholdScore}%`;

      default:
        return 'Standard policy configuration';
    }
  }

  correctionSummary(policy: Policy): string {
    const cfg = (policy.config || {}) as Record<string, unknown>;
    const rules = cloneRegularization(policy.regularizationConfig || (cfg['regularizationConfig'] as RegularizationConfig));
    if (!rules.allowRegularization) return 'Corrections disabled';
    return `${rules.maxRequestsPerMonth}/month · ${rules.regularizationWindowDays}-day window`;
  }

  // ---- Editor -------------------------------------------------------------

  startCreate(type?: PolicyType): void {
    this.editingId.set(null);
    const filter = this.selectedTypeFilter();
    const targetType = type || (filter !== 'ALL' ? filter : 'ATTENDANCE');
    this.draft.set(emptyDraft(targetType));
    this.editorOpen.set(true);
    this.closeView();
  }

  startEdit(policy: Policy): void {
    this.editingId.set(policy.id);
    this.draft.set(draftFrom(policy));
    this.editorOpen.set(true);
    this.closeView();
  }

  async closeEditor(): Promise<void> {
    const discard = await this.confirm.ask({
      title: 'Discard this policy?',
      body: 'Unsaved changes to policy configuration rules will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    });
    if (!discard) return;
    this.editorOpen.set(false);
  }

  patchDraft(patch: Partial<Pick<PolicyDraft, 'name' | 'description' | 'isActive' | 'type'>>): void {
    this.draft.update(current => ({ ...current, ...patch }));
  }

  // Attendance helpers
  setPunch(side: 'in' | 'out', key: keyof PunchConfig, status: PunchComponentStatus): void {
    this.draft.update(current => {
      const config = clonePunch(side === 'in' ? current.punchInConfig : current.punchOutConfig);
      if (key === 'customFields') return current;
      config[key] = status as never;
      return side === 'in'
        ? { ...current, punchInConfig: config }
        : { ...current, punchOutConfig: config };
    });
  }

  setAttendanceRule<K extends keyof RegularizationConfig>(
    key: K,
    value: RegularizationConfig[K],
  ): void {
    this.draft.update(current => ({
      ...current,
      regularizationConfig: { ...current.regularizationConfig, [key]: value },
    }));
  }

  // Leave helpers
  setLeaveRule<K extends keyof LeavePolicyConfig>(key: K, value: LeavePolicyConfig[K]): void {
    this.draft.update(current => ({
      ...current,
      leaveConfig: { ...current.leaveConfig, [key]: value },
    }));
  }

  // Expense helpers
  setExpenseRule<K extends keyof ExpensePolicyConfig>(key: K, value: ExpensePolicyConfig[K]): void {
    this.draft.update(current => ({
      ...current,
      expenseConfig: { ...current.expenseConfig, [key]: value },
    }));
  }

  // Tracking helpers
  setTrackingRule<K extends keyof TrackingPolicyConfig>(key: K, value: TrackingPolicyConfig[K]): void {
    this.draft.update(current => ({
      ...current,
      trackingConfig: { ...current.trackingConfig, [key]: value },
    }));
  }

  // Visit helpers
  setVisitRule<K extends keyof VisitPolicyConfig>(key: K, value: VisitPolicyConfig[K]): void {
    this.draft.update(current => ({
      ...current,
      visitConfig: { ...current.visitConfig, [key]: value },
    }));
  }

  // Inspection helpers
  setInspectionRule<K extends keyof InspectionPolicyConfig>(key: K, value: InspectionPolicyConfig[K]): void {
    this.draft.update(current => ({
      ...current,
      inspectionConfig: { ...current.inspectionConfig, [key]: value },
    }));
  }

  patchCustom(patch: { label?: string; type?: string; status?: string }): void {
    this.customDraft.update(current => ({
      ...current,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.type === 'TEXT' || patch.type === 'NUMBER' ? { type: patch.type } : {}),
      ...(patch.status === 'OPTIONAL' || patch.status === 'REQUIRED' || patch.status === 'DISABLED'
        ? { status: patch.status as PunchComponentStatus }
        : {}),
    }));
  }

  addCustom(side: 'in' | 'out'): void {
    const row = this.customDraft();
    if (!row.label.trim()) return;
    const field: CustomFieldDefinition = {
      key: `custom_${row.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      label: row.label.trim(),
      type: row.type,
      status: row.status,
    };
    this.draft.update(current => {
      const config = clonePunch(side === 'in' ? current.punchInConfig : current.punchOutConfig);
      config.customFields = [...config.customFields, field];
      return side === 'in'
        ? { ...current, punchInConfig: config }
        : { ...current, punchOutConfig: config };
    });
    this.customDraft.set({ label: '', type: 'TEXT', status: 'OPTIONAL' });
  }

  removeCustom(side: 'in' | 'out', index: number): void {
    this.draft.update(current => {
      const config = clonePunch(side === 'in' ? current.punchInConfig : current.punchOutConfig);
      config.customFields = config.customFields.filter((_, i) => i !== index);
      return side === 'in'
        ? { ...current, punchInConfig: config }
        : { ...current, punchOutConfig: config };
    });
  }

  save(): void {
    const draft = this.draft();
    if (!draft.name.trim()) {
      this.toast.warning('Name is required', 'Give this policy a name the organisation will recognise.');
      return;
    }

    let configPayload: Record<string, unknown> = {};
    switch (draft.type) {
      case 'ATTENDANCE':
        configPayload = {
          punchInConfig: draft.punchInConfig,
          punchOutConfig: draft.punchOutConfig,
          regularizationConfig: draft.regularizationConfig,
        };
        break;
      case 'LEAVE':
        configPayload = draft.leaveConfig as unknown as Record<string, unknown>;
        break;
      case 'EXPENSE':
        configPayload = draft.expenseConfig as unknown as Record<string, unknown>;
        break;
      case 'TRACKING':
        configPayload = draft.trackingConfig as unknown as Record<string, unknown>;
        break;
      case 'VISIT':
        configPayload = draft.visitConfig as unknown as Record<string, unknown>;
        break;
      case 'INSPECTION':
        configPayload = draft.inspectionConfig as unknown as Record<string, unknown>;
        break;
    }

    const body = {
      type: draft.type,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      isActive: draft.isActive,
      config: configPayload,
      punchInConfig: draft.punchInConfig,
      punchOutConfig: draft.punchOutConfig,
      regularizationConfig: draft.regularizationConfig,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id
      ? this.api.put<Policy>(API.policy(id), body)
      : this.api.post<Policy>(API.policies, body);

    request.subscribe({
      next: res => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.toast.success(id ? 'Policy updated' : 'Policy published', `${draft.name} is now active.`);
        this.load();
        if (res.data) this.view(res.data);
      },
      error: err => {
        this.saving.set(false);
        this.toast.error('Could not save this policy', apiError(err));
      },
    });
  }

  // ---- Lifecycle ----------------------------------------------------------

  async duplicate(policy: Policy): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Duplicate ${policy.name}?`,
      body: 'A copy is created with the same rules. Assignments are not copied.',
      confirmLabel: 'Duplicate policy',
    });
    if (!ok) return;

    this.api.post<Policy>(API.policyDuplicate(policy.id)).subscribe({
      next: res => {
        this.toast.success('Policy copied', res.data ? `${res.data.name} is ready to edit.` : 'A copy has been created.');
        this.load();
        if (res.data) this.startEdit(res.data);
      },
      error: err => this.toast.error('Could not duplicate this policy', apiError(err)),
    });
  }

  async remove(policy: Policy): Promise<void> {
    if (this.isDefault(policy)) {
      this.toast.warning(
        'This is the company default',
        'Assign a different default first. The organisation always needs a fallback policy.',
      );
      return;
    }

    const ok = await this.confirm.askDelete(
      'policy',
      policy.name,
      'People currently assigned to it must be reassigned first.',
    );
    if (!ok) return;

    this.api.delete(API.policy(policy.id)).subscribe({
      next: () => {
        this.toast.success('Policy removed', `${policy.name} is no longer available.`);
        this.closeView();
        this.load();
      },
      error: err => this.toast.error('Could not delete this policy', apiError(err)),
    });
  }

  // ---- Assignment ---------------------------------------------------------

  openAssign(policy: Policy): void {
    this.viewing.set(policy);
    this.assignTargetType.set('COMPANY');
    this.assignTargetId.set(this.api.user()?.company?.id ?? '');
    this.assignTargets.set([]);
    this.assignOpen.set(true);
  }

  closeAssign(): void {
    this.assignOpen.set(false);
  }

  onTargetTypeChange(type: string): void {
    const next = type as TargetType;
    this.assignTargetType.set(next);
    this.assignTargetId.set(next === 'COMPANY' ? (this.api.user()?.company?.id ?? '') : '');
    this.assignTargets.set(this.targetsFor(next));
  }

  private targetsFor(type: TargetType): NamedTarget[] {
    if (type === 'DEPARTMENT') {
      const seen = new Map<string, string>();
      for (const person of this.people()) {
        const id = person.department?.id;
        const name = person.department?.name || person.departmentName;
        if (id && name) seen.set(id, name);
      }
      for (const d of this.assignments()?.details.departments ?? []) seen.set(d.id, d.name);
      return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }
    if (type === 'DESIGNATION') {
      const seen = new Map<string, string>();
      for (const person of this.people()) {
        const id = person.designation?.id;
        const name = person.designation?.name || person.designationName;
        if (id && name) seen.set(id, name);
      }
      for (const d of this.assignments()?.details.designations ?? []) seen.set(d.id, d.name);
      return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }
    if (type === 'USER') {
      return this.people()
        .map(p => ({ id: p.id, name: `${p.name}${p.employeeId ? ` · ${p.employeeId}` : ''}` }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }

  async makeDefault(policy: Policy): Promise<void> {
    const companyId = this.api.user()?.company?.id;
    if (!companyId) return;
    const ok = await this.confirm.ask({
      title: `Make ${policy.name} the company default?`,
      body: `Anyone without a personal, department or designation override will inherit this ${policy.type.toLowerCase()} policy.`,
      confirmLabel: 'Set as default',
    });
    if (!ok) return;
    this.assign(policy, 'COMPANY', companyId);
  }

  submitAssign(): void {
    const policy = this.viewing();
    if (!policy) return;
    const type = this.assignTargetType();
    const targetId = this.assignTargetId();
    if (!targetId) {
      this.toast.warning('Choose a target', 'Pick who this policy should apply to.');
      return;
    }
    this.assign(policy, type, targetId);
  }

  private assign(policy: Policy, targetType: TargetType, targetId: string): void {
    this.assigning.set(true);
    this.api
      .post(API.policyAssign, {
        policyId: policy.id,
        policyType: policy.type,
        targetType,
        targetId,
      })
      .subscribe({
        next: () => {
          this.assigning.set(false);
          this.assignOpen.set(false);
          if (targetType === 'COMPANY' && policy.type === 'ATTENDANCE') {
            this.defaultPolicyId.set(policy.id);
          }
          this.toast.success(
            'Policy assigned',
            targetType === 'COMPANY'
              ? `${policy.name} is now the company default.`
              : `${policy.name} now applies at the ${targetType.toLowerCase()} level.`,
          );
          this.view(policy);
          this.loadCompanyDefault();
        },
        error: err => {
          this.assigning.set(false);
          this.toast.error('Could not assign this policy', apiError(err));
        },
      });
  }

  statusOf(config: PunchConfig, key: keyof PunchConfig): PunchComponentStatus {
    if (key === 'customFields') return 'DISABLED';
    const value = config[key];
    return value === 'REQUIRED' || value === 'OPTIONAL' || value === 'DISABLED' ? value : 'DISABLED';
  }

  editorTitle(): string {
    return this.editingId() ? 'Edit policy' : 'New policy';
  }

  namesOf(list?: Array<{ name: string }> | null): string {
    return (list ?? []).map(item => item.name).join(', ');
  }
}
